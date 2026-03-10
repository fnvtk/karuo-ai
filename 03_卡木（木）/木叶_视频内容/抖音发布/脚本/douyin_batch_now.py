#!/usr/bin/env python3
"""
抖音批量发布 - 登录+发布一体化
Cookie 过期时自动弹窗重新扫码，登录后立刻发布。
"""
import asyncio
import base64
import datetime
import hashlib
import hmac
import json
import os
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

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "douyin_storage_state.json"
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片")
BASE = "https://creator.douyin.com"
VOD_HOST = "https://vod.bytedanceapi.com"
CHUNK_SIZE = 3 * 1024 * 1024
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)
USER_ID = ""

TITLES = {
    "早起不是为了开派对，是不吵老婆睡觉.mp4":
        "每天6点起床不是因为自律，是因为老婆还在睡。创业人最真实的起床理由，你猜到了吗？#Soul派对 #创业日记 #晨间直播 #真实创业",
    "懒人的活法 动作简单有利可图正反馈.mp4":
        "懒人也能赚钱？关键就三个词：动作简单、有利可图、正反馈。90%的人输在太勤快了 #Soul派对 #副业思维 #私域变现 #认知升级",
    "初期团队先找两个IS，比钱好使 ENFJ链接人，ENTJ指挥.mp4":
        "创业初期别急着找钱，先找两个IS型人格。ENFJ负责链接，ENTJ负责指挥，比融资好使十倍 #MBTI创业 #团队搭建 #Soul派对 #合伙人",
    "ICU出来一年多 活着要在互联网上留下东西.mp4":
        "ICU出来一年多了。那之后我想明白一件事：活着，就要在互联网上留下点东西 #人生感悟 #创业觉醒 #Soul派对 #向死而生",
    "MBTI疗愈SOUL 年轻人测MBTI，40到60岁走五行八卦.mp4":
        "20岁测MBTI，40岁以后该学五行八卦了。年轻人用性格分类，中年人靠命理运营自己 #MBTI #五行 #Soul派对 #认知觉醒",
    "Soul业务模型 派对+切片+小程序全链路.mp4":
        "一个人怎么跑通一条商业链路？派对获客→AI切片→小程序变现，全链路拆给你看 #Soul派对 #商业模式 #全链路 #一人公司",
    "Soul切片30秒到8分钟 AI半小时能剪10到30个.mp4":
        "AI剪辑有多快？30秒到8分钟的切片，半小时出10到30条。内容工厂的效率密码 #AI剪辑 #Soul派对 #内容效率 #批量生产",
    "刷牙听业务逻辑 Soul切片变现怎么跑.mp4":
        "刷牙3分钟，刚好听完一套变现逻辑。Soul切片怎么从0到日产30条？碎片时间才是生产力 #Soul派对 #碎片创业 #副业逻辑 #效率",
    "国学易经怎么学 两小时七七八八，召唤作者对话.mp4":
        "易经其实不难，两小时就能学个七七八八。关键是找到作者的思维频率，跟古人对话 #国学 #易经入门 #Soul派对 #终身学习",
    "广点通能投Soul了，1000曝光6到10块.mp4":
        "广点通终于能投Soul了！1000次曝光只要6到10块，这个获客成本你敢信？#Soul派对 #广点通投放 #低成本获客 #流量红利",
    "建立信任不是求来的 卖外挂发邮件三个月拿下德国总代.mp4":
        "信任不是求来的。一个卖外挂的小伙子，发了三个月邮件，拿下德国总代理。死磕比社交有用 #销售思维 #信任建立 #Soul派对 #死磕精神",
    "核心就两个字 筛选。能开派对坚持7天的人再谈.mp4":
        "别跟所有人合作，核心就两个字：筛选。能坚持开7天派对的人，才值得深聊 #筛选思维 #Soul派对 #创业认知 #人性",
    "睡眠不好？每天放下一件事，做减法.mp4":
        "睡不好不是因为太累，是因为脑子里装太多。每天放下一件事，做减法，睡眠自然好 #睡眠 #做减法 #Soul派对 #心理健康",
    "这套体系花了170万，但前端几十块就能参与.mp4":
        "后端花了170万搭的体系，前端几十块就能参与。真正的商业模式是让别人低成本上车 #商业认知 #Soul派对 #低门槛创业 #体系思维",
    "金融AI获客体系 后端30人沉淀12年，前端丢手机.mp4":
        "后端30人沉淀了12年，前端操作就是丢个手机号。金融AI获客体系，把复杂留给自己 #AI获客 #金融科技 #Soul派对 #系统思维",
}


class SecurityKeys:
    def __init__(self, state_path: Path):
        with open(state_path, "r", encoding="utf-8") as f:
            state = json.load(f)
        self.cookies = {c["name"]: c["value"] for c in state.get("cookies", [])
                        if "douyin.com" in c.get("domain", "")}
        self.cookie_str = "; ".join(f"{k}={v}" for k, v in self.cookies.items())
        self.ms_token = ""
        self.ec_private_key = None
        self.ec_public_key_bytes = b""
        self.server_public_key = None
        self.ticket = ""
        self.ts_sign_raw = ""
        self.csrf_token = self.cookies.get("passport_csrf_token", "")
        for origin in state.get("origins", []):
            if "creator.douyin.com" not in origin.get("origin", ""):
                continue
            for item in origin.get("localStorage", []):
                name, val = item["name"], item["value"]
                if "s_sdk_crypt_sdk" in name:
                    d = json.loads(json.loads(val)["data"])
                    pem = d["ec_privateKey"].replace("\\r\\n", "\n")
                    self.ec_private_key = serialization.load_pem_private_key(pem.encode(), password=None)
                    self.ec_public_key_bytes = self.ec_private_key.public_key().public_bytes(
                        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
                elif "s_sdk_server_cert_key" in name:
                    cert_pem = json.loads(val)["cert"]
                    cert = x509.load_pem_x509_certificate(cert_pem.encode())
                    self.server_public_key = cert.public_key()
                elif "s_sdk_sign_data_key" in name and "web_protect" in name:
                    d = json.loads(json.loads(val)["data"])
                    self.ticket = d["ticket"]
                    self.ts_sign_raw = d["ts_sign"]
                elif name == "xmst":
                    self.ms_token = val

    def compute_ticket_guard(self, path: str) -> dict:
        if not self.ec_private_key or not self.server_public_key:
            return {}
        eph_priv = ec.generate_private_key(ec.SECP256R1())
        eph_pub_bytes = eph_priv.public_key().public_bytes(
            serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
        shared_secret = eph_priv.exchange(ec.ECDH(), self.server_public_key)
        ts = int(time.time())
        ts_hex = self.ts_sign_raw.replace("ts.2.", "")
        ts_bytes = bytes.fromhex(ts_hex)
        new_first = bytes(a ^ b for a, b in zip(ts_bytes[:32], shared_secret[:32]))
        new_ts_sign = "ts.2." + (new_first + ts_bytes[32:]).hex()
        msg = f"{self.ticket},{path},{ts}"
        req_sign = hmac.new(shared_secret, msg.encode(), hashlib.sha256).digest()
        client_data = {"ts_sign": new_ts_sign, "req_content": "ticket,path,timestamp",
                       "req_sign": base64.b64encode(req_sign).decode(), "timestamp": ts}
        return {
            "bd-ticket-guard-client-data": base64.b64encode(json.dumps(client_data).encode()).decode(),
            "bd-ticket-guard-ree-public-key": base64.b64encode(eph_pub_bytes).decode(),
            "bd-ticket-guard-version": "2",
            "bd-ticket-guard-web-version": "2",
            "bd-ticket-guard-web-sign-type": "1",
        }


def _hmac_sha256(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode(), hashlib.sha256).digest()

def _rand(n=11):
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=n))

def aws4_sign(ak, sk, token, qs, method="GET", body=b""):
    now = datetime.datetime.now(datetime.timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    ds = now.strftime("%Y%m%d")
    region, service = "cn-north-1", "vod"
    body_hash = hashlib.sha256(body).hexdigest()
    if method == "POST":
        signed_headers = "content-type;x-amz-date;x-amz-security-token"
        header_str = f"content-type:text/plain;charset=UTF-8\nx-amz-date:{amz_date}\nx-amz-security-token:{token}\n"
    else:
        signed_headers = "x-amz-date;x-amz-security-token"
        header_str = f"x-amz-date:{amz_date}\nx-amz-security-token:{token}\n"
    canonical = f"{method}\n/\n{qs}\n{header_str}\n{signed_headers}\n{body_hash}"
    scope = f"{ds}/{region}/{service}/aws4_request"
    sts = f"AWS4-HMAC-SHA256\n{amz_date}\n{scope}\n{hashlib.sha256(canonical.encode()).hexdigest()}"
    k = _hmac_sha256(f"AWS4{sk}".encode(), ds)
    k = _hmac_sha256(k, region); k = _hmac_sha256(k, service); k = _hmac_sha256(k, "aws4_request")
    sig = hmac.new(k, sts.encode(), hashlib.sha256).hexdigest()
    return f"AWS4-HMAC-SHA256 Credential={ak}/{scope}, SignedHeaders={signed_headers}, Signature={sig}", amz_date, token


async def do_login():
    """弹窗扫码登录，返回刷新后的 SecurityKeys"""
    print("\n  >>> 需要扫码登录，浏览器即将弹出 <<<")
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=False)
        ctx = await browser.new_context(
            user_agent=UA, viewport={"width": 1280, "height": 720})
        await ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined});")
        page = await ctx.new_page()
        await page.goto("https://creator.douyin.com/", timeout=60000)
        await page.pause()
        await ctx.storage_state(path=str(COOKIE_FILE))
        await ctx.close()
        await browser.close()
    print("  >>> Cookie 已刷新 <<<\n")
    return SecurityKeys(COOKIE_FILE)


async def check_cookie(keys):
    """检查 Cookie 是否有效，返回 (valid, user_id, nickname)"""
    async with httpx.AsyncClient(timeout=10.0) as c:
        resp = await c.get(f"{BASE}/web/api/media/user/info/",
                           headers={"Cookie": keys.cookie_str, "User-Agent": UA})
        data = resp.json()
        if data.get("status_code") != 0:
            return False, "", ""
        user = data.get("user") or data.get("user_info") or {}
        uid = str(user.get("uid", "") or user.get("user_id", ""))
        return True, uid, user.get("nickname", "unknown")


async def publish_one_video(keys, client, video_path, title, timing_ts):
    """上传+提交+发布 单条视频（全在一个 client 内快速完成）"""
    global USER_ID
    fsize = Path(video_path).stat().st_size

    # 1) Auth
    resp = await client.get(f"{BASE}/web/api/media/upload/auth/v5/",
        headers={"Cookie": keys.cookie_str, "User-Agent": UA})
    data = resp.json()
    if data.get("status_code") != 0:
        return False, "auth失败"
    auth = json.loads(data["auth"])

    # 2) Apply
    params = {"Action": "ApplyUploadInner", "FileSize": str(fsize), "FileType": "video",
              "IsInner": "1", "SpaceName": "aweme", "Version": "2020-11-19", "app_id": "2906", "s": _rand()}
    qs = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
    authorization, amz_date, token = aws4_sign(auth["AccessKeyID"], auth["SecretAccessKey"], auth["SessionToken"], qs)
    resp = await client.get(f"{VOD_HOST}/?{qs}",
        headers={"authorization": authorization, "x-amz-date": amz_date,
                 "x-amz-security-token": token, "User-Agent": UA})
    result = resp.json().get("Result", {})
    nodes = (result.get("InnerUploadAddress") or {}).get("UploadNodes", [])
    if not nodes:
        return False, "无UploadNodes"
    node = nodes[0]
    store = node["StoreInfos"][0]
    host, upload_id = node["UploadHost"], store["UploadID"]
    base_url = f"https://{host}/upload/v1/{store['StoreUri']}"
    auth_h = {"Authorization": store["Auth"], "User-Agent": UA}

    # 3) Upload
    raw = Path(video_path).read_bytes()
    n_chunks = (len(raw) + CHUNK_SIZE - 1) // CHUNK_SIZE
    crc_parts = []
    for i in range(n_chunks):
        chunk = raw[i*CHUNK_SIZE : (i+1)*CHUNK_SIZE]
        crc = "%08x" % (zlib.crc32(chunk) & 0xFFFFFFFF)
        resp = await client.post(f"{base_url}?uploadid={upload_id}&part_number={i+1}&phase=transfer",
            content=chunk, headers={**auth_h, "Content-CRC32": crc, "Content-Type": "application/octet-stream"}, timeout=120.0)
        rd = resp.json() if resp.status_code == 200 else {}
        if rd.get("code") != 2000:
            return False, f"chunk {i+1} 失败"
        sv_crc = rd.get("data", {}).get("crc32", crc)
        crc_parts.append(f"{i+1}:{sv_crc}")
        print(f"      chunk {i+1}/{n_chunks} ✓")
    finish_resp = await client.post(f"{base_url}?uploadid={upload_id}&phase=finish",
        content=",".join(crc_parts).encode(), headers={**auth_h, "Content-Type": "text/plain"}, timeout=60.0)
    fd = finish_resp.json() if finish_resp.status_code == 200 else {}
    if fd.get("code") != 2000:
        return False, f"finish: {fd.get('message','')}"

    # 4) Commit
    qs2_params = {"Action": "CommitUploadInner", "SpaceName": "aweme",
                  "Version": "2020-11-19", "app_id": "2906", "user_id": USER_ID}
    qs2 = "&".join(f"{k}={v}" for k, v in sorted(qs2_params.items()))
    body = json.dumps({"SessionKey": node["SessionKey"], "Functions": [{"Name": "GetMeta"}]}).encode("utf-8")
    auth2, amz2, tok2 = aws4_sign(auth["AccessKeyID"], auth["SecretAccessKey"], auth["SessionToken"], qs2, method="POST", body=body)
    resp = await client.post(f"{VOD_HOST}/?{qs2}", content=body,
        headers={"authorization": auth2, "x-amz-date": amz2, "x-amz-security-token": tok2,
                 "content-type": "text/plain;charset=UTF-8", "User-Agent": UA}, timeout=30.0)
    cd = resp.json()
    results = cd.get("Result", {}).get("Results", [])
    video_id = results[0].get("Vid", "") if results else ""
    if not video_id:
        return False, f"commit失败: {cd.get('ResponseMetadata',{}).get('Error',{})}"
    print(f"      video_id={video_id}")

    # 5) create_v2
    path = "/web/api/media/aweme/create_v2/"
    creation_id = f"{_rand(8)}{int(time.time()*1000)}"
    body_json = {"item": {"common": {
        "text": title, "caption": title, "visibility_type": 0, "download": 1,
        "timing": timing_ts if timing_ts > 0 else 0, "creation_id": creation_id,
        "media_type": 4, "video_id": video_id, "music_source": 0, "music_id": None,
    }, "cover": {"poster": "", "poster_delay": 0}}}
    guard = keys.compute_ticket_guard(path)
    qp = {"read_aid": "2906", "cookie_enabled": "true", "aid": "1128"}
    if keys.ms_token:
        qp["msToken"] = keys.ms_token
    headers = {"Cookie": keys.cookie_str, "User-Agent": UA, "Content-Type": "application/json",
               "Accept": "application/json, text/plain, */*",
               "Referer": "https://creator.douyin.com/creator-micro/content/post/video",
               "Origin": "https://creator.douyin.com"}
    if keys.csrf_token:
        headers["x-secsdk-csrf-token"] = f"000100000001{keys.csrf_token[:32]}"
    headers.update(guard)
    resp = await client.post(f"{BASE}{path}?" + urlencode(qp), headers=headers, json=body_json, timeout=30.0)
    if not resp.text:
        return False, "create_v2 空响应(403)"
    r = resp.json()
    if r.get("status_code") == 0:
        return True, r.get("item_id", "")
    return False, f"status={r.get('status_code')}: {r.get('status_msg','')}"


async def main():
    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print("[✗] 未找到视频")
        return 1

    print(f"[i] 共 {len(videos)} 条视频待发布\n")

    keys = None
    if COOKIE_FILE.exists():
        keys = SecurityKeys(COOKIE_FILE)
        valid, uid, name = await check_cookie(keys)
        if valid:
            global USER_ID
            USER_ID = uid
            print(f"[✓] 已有有效 Cookie: {name} (uid={uid})")
        else:
            keys = None

    if not keys:
        keys = await do_login()
        valid, uid, name = await check_cookie(keys)
        if not valid:
            print("[✗] 登录失败")
            return 1
        USER_ID = uid
        print(f"[✓] 登录成功: {name} (uid={uid})")

    now_ts = int(time.time())
    base_ts = ((now_ts + 3600) // 3600 + 1) * 3600

    results = []
    for i, vp in enumerate(videos):
        ts = base_ts + i * 3600
        title = TITLES.get(vp.name, f"{vp.stem} #Soul派对 #创业日记")
        fname = vp.name
        fsize = vp.stat().st_size
        dt_str = datetime.datetime.fromtimestamp(ts).strftime("%m-%d %H:%M")

        print(f"\n{'='*60}")
        print(f"  [{i+1}/{len(videos)}] {fname}")
        print(f"  大小: {fsize/1024/1024:.1f}MB | 定时: {dt_str}")
        print(f"  标题: {title[:60]}")
        print(f"{'='*60}")

        valid, _, _ = await check_cookie(keys)
        if not valid:
            print("  Cookie 过期，重新登录...")
            keys = await do_login()
            valid, uid, _ = await check_cookie(keys)
            if not valid:
                print("  [✗] 登录失败，跳过")
                results.append((fname, False, ts))
                continue
            USER_ID = uid

        try:
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                ok, msg = await publish_one_video(keys, client, str(vp), title, ts)
            if ok:
                print(f"  [✓] 发布成功! item_id={msg}")
            else:
                print(f"  [✗] 失败: {msg}")
            results.append((fname, ok, ts))
        except Exception as e:
            print(f"  [✗] 异常: {e}")
            results.append((fname, False, ts))

        if i < len(videos) - 1:
            await asyncio.sleep(2)

    print(f"\n{'='*60}")
    print("  发布汇总")
    print(f"{'='*60}")
    for name, ok, ts in results:
        s = "✓" if ok else "✗"
        t = datetime.datetime.fromtimestamp(ts).strftime("%m-%d %H:%M")
        print(f"  [{s}] {t} | {name}")
    success = sum(1 for _, ok, _ in results if ok)
    print(f"\n  成功: {success}/{len(results)}")
    return 0 if success == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
