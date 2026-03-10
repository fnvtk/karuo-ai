#!/usr/bin/env python3
"""
抖音视频发布 v3 - 浏览器保活 + 实时Cookie刷新 + 纯API上传
核心改进：每条视频发布前，浏览器主动导航刷新 Cookie，解决短 TTL 过期问题。
用户只需扫码一次，全部视频自动发布。
"""
import asyncio
import base64
import datetime
import hashlib
import hmac
import json
import random
import string
import sys
import time
import zlib
from pathlib import Path
from urllib.parse import urlencode

import httpx
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from cryptography import x509
from playwright.async_api import async_playwright

# ─── 配置 ───
VIDEO_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    "/Users/karuo/Movies/7607519346462286491_纳瓦尔3小时访谈 "
    "纳瓦尔_拉维坎特_经典三小时访谈_output/clips_enhanced"
)
BASE = "https://creator.douyin.com"
VOD_HOST = "https://vod.bytedanceapi.com"
CHUNK_SIZE = 3 * 1024 * 1024
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)
MIN_TIMING_HOURS = 2.5  # 定时发布 ≥ 2小时（留 0.5h 余量）


# ─── 浏览器 Cookie 刷新 ───
async def refresh_cookies(page):
    """让浏览器导航到创作者中心首页，触发服务端 Set-Cookie 刷新"""
    try:
        await page.goto(
            "https://creator.douyin.com/creator-micro/home",
            wait_until="domcontentloaded", timeout=15000,
        )
        await asyncio.sleep(2)
    except Exception:
        pass


async def extract_keys(context):
    """从 Playwright BrowserContext 实时提取 Cookie + localStorage 安全密钥"""
    cookies_raw = await context.cookies()
    cookies = {}
    for c in cookies_raw:
        if "douyin.com" in c.get("domain", ""):
            cookies[c["name"]] = c["value"]
    cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
    csrf_token = cookies.get("passport_csrf_token", "")
    ms_token = cookies.get("msToken", "")

    page = context.pages[0] if context.pages else None
    ec_private_key = None
    server_public_key = None
    ticket = ""
    ts_sign_raw = ""

    if page:
        try:
            ls_data = await page.evaluate("""() => {
                const r = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k.includes('s_sdk_') || k === 'xmst') r[k] = localStorage.getItem(k);
                }
                return r;
            }""")
        except Exception:
            ls_data = {}

        for name, val in ls_data.items():
            try:
                if "s_sdk_crypt_sdk" in name:
                    d = json.loads(json.loads(val)["data"])
                    pem = d["ec_privateKey"].replace("\\r\\n", "\n")
                    ec_private_key = serialization.load_pem_private_key(pem.encode(), password=None)
                elif "s_sdk_server_cert_key" in name:
                    cert_pem = json.loads(val)["cert"]
                    cert = x509.load_pem_x509_certificate(cert_pem.encode())
                    server_public_key = cert.public_key()
                elif "s_sdk_sign_data_key" in name and "web_protect" in name:
                    d = json.loads(json.loads(val)["data"])
                    ticket = d["ticket"]
                    ts_sign_raw = d["ts_sign"]
            except Exception:
                pass
        if not ms_token:
            ms_token = ls_data.get("xmst", "")

    return {
        "cookies": cookies, "cookie_str": cookie_str,
        "ms_token": ms_token, "csrf_token": csrf_token,
        "ec_private_key": ec_private_key, "server_public_key": server_public_key,
        "ticket": ticket, "ts_sign_raw": ts_sign_raw,
    }


# ─── bd-ticket-guard 签名 ───
def compute_guard(keys, path):
    pk, spk = keys["ec_private_key"], keys["server_public_key"]
    if not pk or not spk:
        return {}
    eph = ec.generate_private_key(ec.SECP256R1())
    eph_pub = eph.public_key().public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    shared = eph.exchange(ec.ECDH(), spk)
    ts = int(time.time())
    ts_hex = keys["ts_sign_raw"].replace("ts.2.", "")
    tb = bytes.fromhex(ts_hex)
    new_first = bytes(a ^ b for a, b in zip(tb[:32], shared[:32]))
    new_ts = "ts.2." + (new_first + tb[32:]).hex()
    msg = f'{keys["ticket"]},{path},{ts}'
    sig = hmac.new(shared, msg.encode(), hashlib.sha256).digest()
    cd = {"ts_sign": new_ts, "req_content": "ticket,path,timestamp",
          "req_sign": base64.b64encode(sig).decode(), "timestamp": ts}
    return {
        "bd-ticket-guard-client-data": base64.b64encode(json.dumps(cd).encode()).decode(),
        "bd-ticket-guard-ree-public-key": base64.b64encode(eph_pub).decode(),
        "bd-ticket-guard-version": "2", "bd-ticket-guard-web-version": "2",
        "bd-ticket-guard-web-sign-type": "1",
    }


# ─── AWS4 签名 ───
def _hm(key, msg):
    return hmac.new(key, msg.encode(), hashlib.sha256).digest()

def _rand(n=11):
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=n))

def aws4(ak, sk, token, qs, method="GET", body=b""):
    now = datetime.datetime.now(datetime.timezone.utc)
    ad = now.strftime("%Y%m%dT%H%M%SZ")
    ds = now.strftime("%Y%m%d")
    rg, sv = "cn-north-1", "vod"
    bh = hashlib.sha256(body).hexdigest()
    if method == "POST":
        sh = "content-type;x-amz-date;x-amz-security-token"
        hs = f"content-type:text/plain;charset=UTF-8\nx-amz-date:{ad}\nx-amz-security-token:{token}\n"
    else:
        sh = "x-amz-date;x-amz-security-token"
        hs = f"x-amz-date:{ad}\nx-amz-security-token:{token}\n"
    can = f"{method}\n/\n{qs}\n{hs}\n{sh}\n{bh}"
    scope = f"{ds}/{rg}/{sv}/aws4_request"
    sts = f"AWS4-HMAC-SHA256\n{ad}\n{scope}\n{hashlib.sha256(can.encode()).hexdigest()}"
    k = _hm(f"AWS4{sk}".encode(), ds)
    k = _hm(k, rg); k = _hm(k, sv); k = _hm(k, "aws4_request")
    sig = hmac.new(k, sts.encode(), hashlib.sha256).hexdigest()
    return f"AWS4-HMAC-SHA256 Credential={ak}/{scope}, SignedHeaders={sh}, Signature={sig}", ad, token


# ─── 标题生成 ───
def make_title(highlights, idx, filename):
    if idx < len(highlights):
        h = highlights[idx]
        excerpt = h.get("transcript_excerpt", "").strip()
        if len(excerpt) > 80:
            excerpt = excerpt[:77] + "..."
        return f"纳瓦尔·拉维坎特：{excerpt} #纳瓦尔 #人生智慧 #认知升级 #财富自由"
    stem = Path(filename).stem.replace("_enhanced", "")
    return f"纳瓦尔3小时访谈精华｜{stem} #纳瓦尔 #认知升级 #人生智慧"


# ─── 单条视频发布 ───
async def publish_one(context, client, video_path, title, timing_ts, idx, total):
    fname = Path(video_path).name
    fsize = Path(video_path).stat().st_size
    dt_str = datetime.datetime.fromtimestamp(timing_ts).strftime("%m-%d %H:%M") if timing_ts > 0 else "立即"

    print(f"\n{'='*60}")
    print(f"  [{idx}/{total}] {fname}")
    print(f"  {fsize/1024/1024:.1f}MB | 定时: {dt_str}")
    print(f"  {title[:70]}")
    print(f"{'='*60}")

    # ★ 每条视频前刷新 Cookie
    page = context.pages[0] if context.pages else None
    if page:
        await refresh_cookies(page)

    keys = await extract_keys(context)
    if not keys["cookie_str"]:
        return False, "无Cookie"

    h = {"Cookie": keys["cookie_str"], "User-Agent": UA}

    # 验证 Cookie
    resp = await client.get(f"{BASE}/web/api/media/user/info/", headers=h)
    data = resp.json()
    if data.get("status_code") != 0:
        return False, f"Cookie无效: {data.get('status_msg','')}"
    user = data.get("user") or data.get("user_info") or {}
    user_id = str(user.get("uid", "") or user.get("user_id", ""))

    # 1) Auth
    resp = await client.get(f"{BASE}/web/api/media/upload/auth/v5/", headers=h)
    ad = resp.json()
    if ad.get("status_code") != 0:
        return False, f"auth: {ad.get('status_msg','')}"
    auth = json.loads(ad["auth"])
    print(f"  [1] Auth ✓")

    # 2) Apply
    params = {"Action": "ApplyUploadInner", "FileSize": str(fsize), "FileType": "video",
              "IsInner": "1", "SpaceName": "aweme", "Version": "2020-11-19",
              "app_id": "2906", "s": _rand()}
    qs = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
    az, ad2, tk = aws4(auth["AccessKeyID"], auth["SecretAccessKey"], auth["SessionToken"], qs)
    resp = await client.get(f"{VOD_HOST}/?{qs}",
        headers={"authorization": az, "x-amz-date": ad2, "x-amz-security-token": tk, "User-Agent": UA})
    result = resp.json().get("Result", {})
    nodes = (result.get("InnerUploadAddress") or {}).get("UploadNodes", [])
    if not nodes:
        return False, "无UploadNodes"
    node = nodes[0]
    store = node["StoreInfos"][0]
    host, uid2 = node["UploadHost"], store["UploadID"]
    base_url = f"https://{host}/upload/v1/{store['StoreUri']}"
    ah = {"Authorization": store["Auth"], "User-Agent": UA}
    print(f"  [2] Apply ✓ vid={node['Vid'][:25]}...")

    # 3) Upload chunks
    raw = Path(video_path).read_bytes()
    nc = (len(raw) + CHUNK_SIZE - 1) // CHUNK_SIZE
    crc_parts = []
    for i in range(nc):
        chunk = raw[i*CHUNK_SIZE:(i+1)*CHUNK_SIZE]
        crc = "%08x" % (zlib.crc32(chunk) & 0xFFFFFFFF)
        r = await client.post(
            f"{base_url}?uploadid={uid2}&part_number={i+1}&phase=transfer",
            content=chunk, headers={**ah, "Content-CRC32": crc,
                                    "Content-Type": "application/octet-stream"}, timeout=120.0)
        rd = r.json() if r.status_code == 200 else {}
        if rd.get("code") != 2000:
            return False, f"chunk{i+1}: {rd}"
        sv_crc = rd.get("data", {}).get("crc32", crc)
        crc_parts.append(f"{i+1}:{sv_crc}")
    fr = await client.post(f"{base_url}?uploadid={uid2}&phase=finish",
        content=",".join(crc_parts).encode(),
        headers={**ah, "Content-Type": "text/plain"}, timeout=60.0)
    fd = fr.json() if fr.status_code == 200 else {}
    if fd.get("code") != 2000:
        return False, f"finish: {fd.get('message','')}"
    print(f"  [3] Upload ✓ ({nc} chunks)")

    # 4) Commit
    qs2 = "&".join(f"{k}={v}" for k, v in sorted({
        "Action": "CommitUploadInner", "SpaceName": "aweme",
        "Version": "2020-11-19", "app_id": "2906", "user_id": user_id}.items()))
    body = json.dumps({"SessionKey": node["SessionKey"],
                        "Functions": [{"Name": "GetMeta"}]}).encode("utf-8")
    a2, d2, t2 = aws4(auth["AccessKeyID"], auth["SecretAccessKey"],
                       auth["SessionToken"], qs2, method="POST", body=body)
    cr = await client.post(f"{VOD_HOST}/?{qs2}", content=body,
        headers={"authorization": a2, "x-amz-date": d2, "x-amz-security-token": t2,
                 "content-type": "text/plain;charset=UTF-8", "User-Agent": UA}, timeout=30.0)
    cd = cr.json()
    results = cd.get("Result", {}).get("Results", [])
    video_id = results[0].get("Vid", "") if results else ""
    if not video_id:
        return False, f"commit: {cd}"
    print(f"  [4] Commit ✓ video_id={video_id[:25]}...")

    # 5) create_v2 - 再次刷新 Cookie（发布是最关键的一步）
    if page:
        await refresh_cookies(page)
    keys2 = await extract_keys(context)

    path = "/web/api/media/aweme/create_v2/"
    cid = f"{_rand(8)}{int(time.time()*1000)}"
    bj = {"item": {"common": {
        "text": title, "caption": title, "visibility_type": 0, "download": 1,
        "timing": timing_ts if timing_ts > 0 else 0, "creation_id": cid,
        "media_type": 4, "video_id": video_id, "music_source": 0, "music_id": None,
    }, "cover": {"poster": "", "poster_delay": 0}}}
    guard = compute_guard(keys2, path)
    qp = {"read_aid": "2906", "cookie_enabled": "true", "aid": "1128"}
    if keys2["ms_token"]:
        qp["msToken"] = keys2["ms_token"]
    headers = {
        "Cookie": keys2["cookie_str"], "User-Agent": UA,
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://creator.douyin.com/creator-micro/content/post/video",
        "Origin": "https://creator.douyin.com",
    }
    if keys2["csrf_token"]:
        headers["x-secsdk-csrf-token"] = f"000100000001{keys2['csrf_token'][:32]}"
    headers.update(guard)
    resp = await client.post(f"{BASE}{path}?" + urlencode(qp),
                             headers=headers, json=bj, timeout=30.0)
    if not resp.text:
        return False, f"create_v2 空响应(HTTP {resp.status_code})"
    r = resp.json()
    if r.get("status_code") == 0:
        return True, r.get("item_id", "")
    return False, f"status={r.get('status_code')}: {r.get('status_msg','')}"


# ─── 主流程 ───
async def main():
    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print(f"[✗] 未找到 mp4: {VIDEO_DIR}")
        return 1
    print(f"[i] 目录: {VIDEO_DIR}")
    print(f"[i] 共 {len(videos)} 条视频\n")

    highlights_file = VIDEO_DIR.parent / "highlights.json"
    highlights = []
    if highlights_file.exists():
        highlights = json.loads(highlights_file.read_text())
        print(f"[i] highlights.json: {len(highlights)} 条\n")

    print("=" * 60)
    print("  请用【未封禁】的抖音号扫码登录")
    print("  如果之前的账号被封禁，请换一个号")
    print("  登录后点 Playwright Inspector 绿色 ▶")
    print("=" * 60 + "\n")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=False)
        context = await browser.new_context(
            user_agent=UA, viewport={"width": 1280, "height": 720})
        await context.add_init_script(
            "Object.defineProperty(navigator,'webdriver',{get:()=>undefined});")
        page = await context.new_page()
        await page.goto("https://creator.douyin.com/", timeout=60000)
        await page.pause()

        # 验证登录 + 检查发布权限
        keys = await extract_keys(context)
        async with httpx.AsyncClient(timeout=10.0) as c:
            resp = await c.get(f"{BASE}/web/api/media/user/info/",
                               headers={"Cookie": keys["cookie_str"], "User-Agent": UA})
            data = resp.json()
            if data.get("status_code") != 0:
                print("[✗] 登录失败")
                await browser.close()
                return 1
            user = data.get("user") or data.get("user_info") or {}
            nickname = user.get("nickname", "?")
            uid = user.get("uid", "")
            print(f"\n[✓] 账号: {nickname} (uid={uid})")

        # 快速试发一条（不定时），检测账号是否被封
        print("[i] 检查发布权限...")
        keys_test = await extract_keys(context)
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as tc:
            tr = await tc.get(f"{BASE}/web/api/media/upload/auth/v5/",
                              headers={"Cookie": keys_test["cookie_str"], "User-Agent": UA})
            td = tr.json()
            if td.get("status_code") != 0:
                print(f"[✗] 权限检查失败: {td.get('status_msg','')}")
                await browser.close()
                return 1

        # 计算定时：从现在起 ≥ 2.5 小时，每小时一条
        now_ts = int(time.time())
        base_ts = now_ts + int(MIN_TIMING_HOURS * 3600)
        base_ts = ((base_ts + 3599) // 3600) * 3600  # 对齐到整点

        print(f"[i] 定时发布从 {datetime.datetime.fromtimestamp(base_ts).strftime('%m-%d %H:%M')} 开始")
        print(f"[i] 浏览器保持运行，每条发布前自动刷新 Cookie\n")

        results = []
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            for i, vp in enumerate(videos):
                ts = base_ts + i * 3600
                title = make_title(highlights, i, vp.name)
                try:
                    ok, msg = await publish_one(
                        context, client, str(vp), title, ts, i+1, len(videos))
                    if ok:
                        print(f"  [✓] 发布成功! item_id={msg}")
                    else:
                        print(f"  [✗] {msg}")
                        if "封禁" in str(msg) or "未登录" in str(msg):
                            print(f"\n  !! 严重错误，停止发布")
                            results.append((vp.name, False, ts, msg))
                            break
                    results.append((vp.name, ok, ts, msg if not ok else ""))
                except Exception as e:
                    print(f"  [✗] 异常: {e}")
                    results.append((vp.name, False, ts, str(e)))

                if i < len(videos) - 1:
                    await asyncio.sleep(2)

        # 汇总
        print(f"\n{'='*60}")
        print("  发布汇总")
        print(f"{'='*60}")
        for name, ok, ts, msg in results:
            s = "✓" if ok else "✗"
            t = datetime.datetime.fromtimestamp(ts).strftime("%m-%d %H:%M")
            extra = f" | {msg[:35]}" if msg else ""
            print(f"  [{s}] {t} | {name[:40]}{extra}")
        success = sum(1 for _, ok, _, _ in results if ok)
        print(f"\n  成功: {success}/{len(results)}")

        await browser.close()
        return 0 if success == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
