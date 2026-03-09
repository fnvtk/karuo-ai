#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
抖音创作者中心 - 纯 API 视频发布
逆向 creator.douyin.com 内部接口，不依赖浏览器自动化

流程:
  1. GET  /web/api/media/upload/auth/v5/       → 获取上传凭证 (ak, auth)
  2. GET  imagex.bytedanceapi.com?Action=ApplyUploadInner  → 获取上传地址
  3. POST {UploadHosts}/upload/v1/{storeUri}    → 分片上传视频
  4. POST /web/api/media/aweme/create/          → 发布作品
"""

import asyncio
import datetime
import hashlib
import hmac
import json
import random
import string
import sys
import uuid
import zlib
from pathlib import Path
from urllib.parse import urlencode, quote

import httpx

# ── 配置 ───────────────────────────────────────────────────
COOKIE_FILE = Path(__file__).parent / "douyin_storage_state.json"
CHUNK_SIZE = 3 * 1024 * 1024  # 3MB per chunk

BASE = "https://creator.douyin.com"
AUTH_URL = f"{BASE}/web/api/media/upload/auth/v5/"
CREATE_URL = f"{BASE}/web/api/media/aweme/create/"
IMAGEX_HOST = "https://imagex.bytedanceapi.com/"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"


# ── Cookie 工具 ────────────────────────────────────────────
def load_cookies_from_storage_state(path: Path) -> str:
    """从 Playwright storage_state.json 提取 Cookie 字符串"""
    with open(path, "r", encoding="utf-8") as f:
        state = json.load(f)
    cookies = state.get("cookies", [])
    # 只取 creator.douyin.com 和 .douyin.com 的 cookie
    parts = []
    for c in cookies:
        domain = c.get("domain", "")
        if "douyin.com" in domain:
            parts.append(f"{c['name']}={c['value']}")
    return "; ".join(parts)


# ── AWS4-HMAC-SHA256 签名 ──────────────────────────────────
def _hmac_sha256(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def get_signing_key(secret: str, date_stamp: str, region: str, service: str) -> bytes:
    k_date = _hmac_sha256(("AWS4" + secret).encode("utf-8"), date_stamp)
    k_region = _hmac_sha256(k_date, region)
    k_service = _hmac_sha256(k_region, service)
    k_signing = _hmac_sha256(k_service, "aws4_request")
    return k_signing


def build_authorization(
    access_key_id: str,
    secret_access_key: str,
    session_token: str,
    region: str,
    service: str,
    canonical_querystring: str,
    method: str = "GET",
) -> tuple[str, str, str]:
    """生成 AWS4-HMAC-SHA256 Authorization header，返回 (authorization, amz_date, session_token)"""
    now = datetime.datetime.now(datetime.timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")

    canonical_headers = (
        f"x-amz-date:{amz_date}\nx-amz-security-token:{session_token}\n"
    )
    signed_headers = "x-amz-date;x-amz-security-token"
    payload_hash = hashlib.sha256(b"").hexdigest()

    canonical_request = (
        f"{method}\n/\n{canonical_querystring}\n{canonical_headers}\n"
        f"{signed_headers}\n{payload_hash}"
    )

    credential_scope = f"{date_stamp}/{region}/{service}/aws4_request"
    string_to_sign = (
        f"AWS4-HMAC-SHA256\n{amz_date}\n{credential_scope}\n"
        + hashlib.sha256(canonical_request.encode("utf-8")).hexdigest()
    )

    signing_key = get_signing_key(secret_access_key, date_stamp, region, service)
    signature = hmac.new(
        signing_key, string_to_sign.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    authorization = (
        f"AWS4-HMAC-SHA256 Credential={access_key_id}/{date_stamp}/{region}/{service}/aws4_request, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )
    return authorization, amz_date, session_token


def random_s(length: int = 11) -> str:
    chars = string.ascii_lowercase + string.digits
    return "".join(random.choice(chars) for _ in range(length))


# ── Step 1: 获取上传授权 ──────────────────────────────────
async def get_upload_auth(client: httpx.AsyncClient, cookie: str) -> dict:
    print("  [1/4] 获取上传凭证...")
    resp = await client.get(
        AUTH_URL,
        headers={"Cookie": cookie, "User-Agent": UA},
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("status_code") != 0:
        raise RuntimeError(f"auth 失败: {data}")
    ak = data["ak"]
    auth_raw = json.loads(data["auth"])
    print(f"    ak={ak[:20]}... auth.AccessKeyID={auth_raw['AccessKeyID'][:20]}...")
    return {
        "ak": ak,
        "access_key_id": auth_raw["AccessKeyID"],
        "secret_access_key": auth_raw["SecretAccessKey"],
        "session_token": auth_raw["SessionToken"],
    }


# ── Step 2: 获取视频上传分配 ──────────────────────────────
async def apply_upload(
    client: httpx.AsyncClient, auth: dict, file_size: int
) -> dict:
    print("  [2/4] 获取上传分配地址...")
    region = "cn-north-1"
    service = "vod"

    params = {
        "Action": "ApplyUploadInner",
        "FileSize": str(file_size),
        "FileType": "video",
        "IsInner": "1",
        "SpaceName": "aweme",
        "Version": "2020-11-19",
        "app_id": "2906",
        "s": random_s(),
        "user_id": "",
    }
    canonical_qs = "&".join(f"{k}={v}" for k, v in sorted(params.items()))

    authorization, amz_date, session_token = build_authorization(
        auth["access_key_id"],
        auth["secret_access_key"],
        auth["session_token"],
        region,
        service,
        canonical_qs,
    )

    resp = await client.get(
        IMAGEX_HOST,
        params=params,
        headers={
            "authorization": authorization,
            "x-amz-date": amz_date,
            "x-amz-security-token": session_token,
            "User-Agent": UA,
        },
    )
    resp.raise_for_status()
    data = resp.json()

    if "Result" not in data:
        raise RuntimeError(f"ApplyUpload 失败: {data}")

    result = data["Result"]
    upload_address = result.get("InnerUploadAddress", result)
    session_key = upload_address.get("SessionKey", "")
    upload_hosts = upload_address.get("UploadNodes", [{}])[0].get("UploadHost", "")
    store_uri = upload_address.get("UploadNodes", [{}])[0].get("StoreInfos", [{}])[0].get("StoreUri", "")
    store_auth = upload_address.get("UploadNodes", [{}])[0].get("StoreInfos", [{}])[0].get("Auth", "")

    if not upload_hosts or not store_uri:
        # 备用路径
        upload_hosts = result.get("UploadAddress", {}).get("UploadHosts", [""])[0]
        store_uri = result.get("UploadAddress", {}).get("StoreInfos", [{}])[0].get("StoreUri", "")
        store_auth = result.get("UploadAddress", {}).get("StoreInfos", [{}])[0].get("Auth", "")
        session_key = result.get("UploadAddress", {}).get("SessionKey", "")

    print(f"    host={upload_hosts}")
    print(f"    storeUri={store_uri[:40]}...")
    print(f"    sessionKey={session_key[:30]}...")
    return {
        "session_key": session_key,
        "upload_host": upload_hosts,
        "store_uri": store_uri,
        "auth": store_auth,
    }


# ── Step 3: 分片上传视频 ──────────────────────────────────
async def upload_video_chunks(
    client: httpx.AsyncClient, upload_info: dict, file_path: str
) -> bool:
    print("  [3/4] 分片上传视频...")
    data = Path(file_path).read_bytes()
    total_size = len(data)
    total_chunks = (total_size + CHUNK_SIZE - 1) // CHUNK_SIZE
    upload_id = str(uuid.uuid4())

    base_url = f"https://{upload_info['upload_host']}/upload/v1/{upload_info['store_uri']}"

    for i in range(total_chunks):
        start = i * CHUNK_SIZE
        end = min((i + 1) * CHUNK_SIZE, total_size)
        chunk = data[start:end]

        crc32 = hex(zlib.crc32(chunk) & 0xFFFFFFFF)[2:]

        params = {
            "uploadid": upload_id,
            "part_number": str(i + 1),
            "part_offset": str(start),
            "phase": "transfer",
        }

        resp = await client.post(
            base_url,
            params=params,
            content=chunk,
            headers={
                "Authorization": upload_info["auth"],
                "Content-CRC32": crc32,
                "Content-Type": "application/octet-stream",
                "User-Agent": UA,
            },
            timeout=120.0,
        )

        if resp.status_code == 200:
            resp_data = resp.json()
            if resp_data.get("code") == 2000:
                print(f"    chunk {i+1}/{total_chunks} 上传成功 (crc32={crc32})")
            else:
                print(f"    chunk {i+1}/{total_chunks} 返回异常: {resp_data}")
                return False
        else:
            print(f"    chunk {i+1}/{total_chunks} HTTP {resp.status_code}: {resp.text[:200]}")
            return False

    # 分片上传完成后，发送 finish 请求
    finish_params = {
        "uploadid": upload_id,
        "phase": "finish",
    }
    finish_resp = await client.post(
        base_url,
        params=finish_params,
        headers={
            "Authorization": upload_info["auth"],
            "User-Agent": UA,
        },
        timeout=60.0,
    )
    print(f"    finish 响应: HTTP {finish_resp.status_code}")
    try:
        finish_data = finish_resp.json()
        print(f"    finish 数据: {json.dumps(finish_data, ensure_ascii=False)[:200]}")
    except Exception:
        print(f"    finish 原始: {finish_resp.text[:200]}")

    print(f"    视频上传完成: {total_chunks} 个分片, {total_size/1024/1024:.1f}MB")
    return True


# ── Step 4: 发布作品 ──────────────────────────────────────
def extract_csrf_token(cookie_str: str) -> str:
    """从 cookie 字符串中提取 passport_csrf_token"""
    for part in cookie_str.split(";"):
        kv = part.strip().split("=", 1)
        if len(kv) == 2 and kv[0].strip() == "passport_csrf_token":
            return kv[1].strip()
    return ""


async def create_aweme(
    client: httpx.AsyncClient,
    cookie: str,
    store_uri: str,
    title: str,
    timing: int = -1,
    session_key: str = "",
) -> dict:
    print("  [4/4] 发布视频作品...")
    creation_id = f"{random_s(8)}{int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)}"

    # 构建 form-encoded body
    parts = [
        f"text={title}",
        "text_extra=[]",
        "activity=[]",
        "challenges=[]",
        'hashtag_source=""',
        "mentions=[]",
        "ifLongTitle=true",
        "hot_sentence=",
        "visibility_type=0",
        "download=1",
        f"poster={store_uri}",
        f"timing={timing}",
        f'video={{"uri":"{store_uri}"}}',
        f"creation_id={creation_id}",
    ]
    if session_key:
        parts.append(f"session_key={session_key}")
    body = "&".join(parts)

    csrf = extract_csrf_token(cookie)

    headers = {
        "Cookie": cookie,
        "User-Agent": UA,
        "Content-Type": "text/plain",
        "Referer": "https://creator.douyin.com/creator-micro/content/publish",
        "Origin": "https://creator.douyin.com",
        "Accept": "application/json, text/plain, */*",
    }
    if csrf:
        headers["X-CSRFToken"] = csrf

    resp = await client.post(CREATE_URL, headers=headers, content=body)

    print(f"    HTTP {resp.status_code}, Content-Type: {resp.headers.get('content-type', 'unknown')}")
    raw = resp.text
    print(f"    原始响应 (前500字): {raw[:500]}")

    if resp.status_code != 200:
        return {"status_code": resp.status_code, "error": raw[:200]}

    try:
        data = resp.json()
    except Exception:
        return {"status_code": -1, "error": f"非JSON响应: {raw[:200]}"}

    return data


# ── 单条发布主流程 ────────────────────────────────────────
async def publish_one(
    video_path: str,
    title: str,
    cookie: str,
    timing: int = -1,
) -> bool:
    file_size = Path(video_path).stat().st_size
    print(f"\n{'='*60}")
    print(f"  视频: {Path(video_path).name}")
    print(f"  大小: {file_size/1024/1024:.1f}MB")
    print(f"  标题: {title[:50]}")
    if timing > 0:
        from datetime import datetime as dt
        print(f"  定时: {dt.fromtimestamp(timing).strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*60}")

    async with httpx.AsyncClient(timeout=60.0) as client:
        # Step 1
        auth = await get_upload_auth(client, cookie)

        # Step 2
        upload_info = await apply_upload(client, auth, file_size)

        # Step 3
        ok = await upload_video_chunks(client, upload_info, video_path)
        if not ok:
            print("  [✗] 视频上传失败")
            return False

        # Step 4
        result = await create_aweme(
            client, cookie, upload_info["store_uri"], title, timing,
            session_key=upload_info.get("session_key", ""),
        )

        status = result.get("status_code", -1)
        if status == 0:
            print("  [✓] 视频发布成功！")
            return True
        else:
            print(f"  [!] 发布接口返回: status_code={status}")
            print(f"      完整响应: {json.dumps(result, ensure_ascii=False)}")
            return False


# ── 批量发布 ──────────────────────────────────────────────
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片")

TITLES = {
    "早起不是为了开派对，是不吵老婆睡觉.mp4":
        "早起不是为了开派对，是不吵老婆睡觉。初衷就这一个。#Soul派对 #创业日记 #晨间直播 #私域干货",
    "懒人的活法 动作简单有利可图正反馈.mp4":
        "懒有懒的活法：动作简单、有利可图、正反馈，就能坐得住。#Soul派对 #副业 #私域 #切片变现",
    "初期团队先找两个IS，比钱好使 ENFJ链接人，ENTJ指挥.mp4":
        "初期团队先找两个IS，比钱好使。ENFJ链接人，ENTJ指挥。#MBTI #创业团队 #Soul派对",
    "ICU出来一年多 活着要在互联网上留下东西.mp4":
        "ICU出来一年多，活着要在互联网上留下东西。#人生感悟 #创业 #Soul派对 #记录生活",
    "MBTI疗愈SOUL 年轻人测MBTI，40到60岁走五行八卦.mp4":
        "年轻人测MBTI，40到60岁走五行八卦。#MBTI #Soul派对 #五行 #疗愈",
    "Soul业务模型 派对+切片+小程序全链路.mp4":
        "Soul业务模型：派对+切片+小程序全链路。#Soul派对 #商业模式 #私域运营 #小程序",
    "Soul切片30秒到8分钟 AI半小时能剪10到30个.mp4":
        "Soul切片30秒到8分钟，AI半小时能剪10到30个。#AI剪辑 #Soul派对 #切片变现 #效率工具",
    "刷牙听业务逻辑 Soul切片变现怎么跑.mp4":
        "刷牙听业务逻辑：Soul切片变现怎么跑。#Soul派对 #切片变现 #副业 #商业逻辑",
    "国学易经怎么学 两小时七七八八，召唤作者对话.mp4":
        "国学易经怎么学？两小时七七八八，召唤作者对话。#国学 #易经 #Soul派对 #学习方法",
    "广点通能投Soul了，1000曝光6到10块.mp4":
        "广点通能投Soul了，1000曝光6到10块。#Soul派对 #广点通 #流量投放 #私域获客",
    "建立信任不是求来的 卖外挂发邮件三个月拿下德国总代.mp4":
        "建立信任不是求来的。卖外挂发邮件三个月拿下德国总代。#销售 #信任 #Soul派对 #商业故事",
    "核心就两个字 筛选。能开派对坚持7天的人再谈.mp4":
        "核心就两个字：筛选。能开派对坚持7天的人再谈。#筛选 #Soul派对 #创业 #坚持",
    "睡眠不好？每天放下一件事，做减法.mp4":
        "睡眠不好？每天放下一件事，做减法。#睡眠 #减法 #Soul派对 #生活方式",
    "这套体系花了170万，但前端几十块就能参与.mp4":
        "这套体系花了170万，但前端几十块就能参与。#商业体系 #Soul派对 #私域 #低成本创业",
    "金融AI获客体系 后端30人沉淀12年，前端丢手机.mp4":
        "金融AI获客体系：后端30人沉淀12年，前端丢手机。#AI获客 #金融 #Soul派对 #商业模式",
}


def get_title(filename: str) -> str:
    if filename in TITLES:
        return TITLES[filename]
    return f"{Path(filename).stem} #Soul派对 #创业日记 #卡若创业派对"


async def main():
    if not COOKIE_FILE.exists():
        print("[✗] Cookie 文件不存在，请先运行 douyin_login.py 获取")
        return 1

    cookie = load_cookies_from_storage_state(COOKIE_FILE)
    if not cookie:
        print("[✗] Cookie 为空")
        return 1
    print(f"[✓] Cookie 已加载 ({len(cookie)} chars)")

    # 先测试 Cookie 有效性
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{BASE}/web/api/media/user/info/",
            headers={"Cookie": cookie, "User-Agent": UA},
        )
        data = resp.json()
        if data.get("status_code") != 0:
            print(f"[✗] Cookie 无效: {data}")
            return 1
        user = data.get("user_info", {})
        print(f"[✓] 登录用户: {user.get('nickname', 'unknown')}")

    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print("[✗] 未找到视频")
        return 1
    print(f"[i] 共 {len(videos)} 条视频\n")

    # 计算定时时间（每小时一条，从当前+2h开始）
    import time
    now_ts = int(time.time())
    base_ts = now_ts + 2 * 3600
    # 对齐到下一个整点
    base_ts = (base_ts // 3600 + 1) * 3600

    results = []
    for i, vp in enumerate(videos):
        title = get_title(vp.name)
        schedule_ts = base_ts + i * 3600  # 每小时一条

        try:
            ok = await publish_one(
                video_path=str(vp),
                title=title,
                cookie=cookie,
                timing=schedule_ts,
            )
        except Exception as e:
            print(f"  [✗] 异常: {e}")
            ok = False
        results.append((vp.name, ok, schedule_ts))

        if i < len(videos) - 1 and ok:
            print("  等待 5 秒...")
            await asyncio.sleep(5)

    # 汇总
    print(f"\n{'='*60}")
    print("  发布汇总")
    print(f"{'='*60}")
    from datetime import datetime as dt
    for name, ok, ts in results:
        status = "✓" if ok else "✗"
        t = dt.fromtimestamp(ts).strftime("%m-%d %H:%M")
        print(f"  [{status}] {t} | {name}")
    success = sum(1 for _, ok, _ in results if ok)
    print(f"\n  成功: {success}/{len(results)}")
    return 0 if success == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
