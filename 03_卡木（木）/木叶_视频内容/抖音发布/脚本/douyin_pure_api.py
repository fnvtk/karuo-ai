#!/usr/bin/env python3
"""
抖音纯 API 视频发布（无浏览器）
基于 CobWeb 思路：Cookie + ec_privateKey + ts_sign → bd-ticket-guard → create_v2

流程:
  1. 从 storage_state.json 加载 cookies + localStorage 密钥
  2. GET  /web/api/media/upload/auth/v5/     → VOD 凭证
  3. GET  vod.bytedanceapi.com ApplyUploadInner → 上传地址
  4. POST 分片上传视频
  5. POST vod.bytedanceapi.com CommitUploadInner → video_id
  6. POST /web/api/media/aweme/create_v2/   → 发布（bd-ticket-guard 签名）
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
from urllib.parse import urlencode, quote

import httpx
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from cryptography import x509

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "douyin_storage_state.json"
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片")

BASE = "https://creator.douyin.com"
AUTH_URL = f"{BASE}/web/api/media/upload/auth/v5/"
VOD_HOST = "https://vod.bytedanceapi.com"
CREATE_V2_URL = f"{BASE}/web/api/media/aweme/create_v2/"
USER_INFO_URL = f"{BASE}/web/api/media/user/info/"
CHUNK_SIZE = 3 * 1024 * 1024

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)

TITLES = {
    "早起不是为了开派对，是不吵老婆睡觉.mp4":
        "每天6点起床不是因为自律，是因为老婆还在睡。创业人最真实的起床理由，你猜到了吗？#Soul派对 #创业日记 #晨间直播 #真实创业 #小程序 卡若创业派对",
    "懒人的活法 动作简单有利可图正反馈.mp4":
        "懒人也能有收益？关键就三个词：动作简单、有利可图、正反馈。90%的人输在太勤快了 #Soul派对 #副业思维 #商业转化 #认知升级 #小程序 卡若创业派对",
    "初期团队先找两个IS，比钱好使 ENFJ链接人，ENTJ指挥.mp4":
        "创业初期别急着找钱，先找两个IS型人格。ENFJ负责链接，ENTJ负责指挥，比融资好使十倍 #MBTI创业 #团队搭建 #Soul派对 #合伙人 #小程序 卡若创业派对",
    "ICU出来一年多 活着要在互联网上留下东西.mp4":
        "重症监护出来一年多了。那之后我想明白一件事：活着，就要在互联网上留下点东西 #人生感悟 #创业觉醒 #Soul派对 #向死而生 #小程序 卡若创业派对",
    "MBTI疗愈SOUL 年轻人测MBTI，40到60岁走五行八卦.mp4":
        "20岁测MBTI，40岁以后该学五行八卦了。年轻人用性格分类，中年人靠命理运营自己 #MBTI #五行 #Soul派对 #认知觉醒 #小程序 卡若创业派对",
    "Soul业务模型 派对+切片+小程序全链路.mp4":
        "一个人怎么跑通一条商业链路？派对获客→AI切片→小程序转化，全链路拆给你看 #Soul派对 #商业模式 #全链路 #一人公司 #小程序 卡若创业派对",
    "Soul切片30秒到8分钟 AI半小时能剪10到30个.mp4":
        "AI剪辑有多快？30秒到8分钟的切片，半小时出10到30条。内容工厂的效率密码 #AI剪辑 #Soul派对 #内容效率 #批量生产 #小程序 卡若创业派对",
    "刷牙听业务逻辑 Soul切片变现怎么跑.mp4":
        "刷牙3分钟，刚好听完一套转化逻辑。Soul切片怎么从0到日产30条？碎片时间才是生产力 #Soul派对 #碎片创业 #副业逻辑 #效率 #小程序 卡若创业派对",
    "国学易经怎么学 两小时七七八八，召唤作者对话.mp4":
        "易经其实不难，两小时就能学个七七八八。关键是找到作者的思维频率，跟古人对话 #国学 #易经入门 #Soul派对 #终身学习 #小程序 卡若创业派对",
    "广点通能投Soul了，1000曝光6到10块.mp4":
        "广点通终于能投Soul了！1000次曝光只要6到10块，这个获客成本你敢信？#Soul派对 #广点通投放 #低成本获客 #流量红利 #小程序 卡若创业派对",
    "建立信任不是求来的 卖外挂发邮件三个月拿下德国总代.mp4":
        "信任不是求来的。一个卖辅助工具的小伙子，发了三个月邮件，拿下德国总代理。死磕比社交有用 #销售思维 #信任建立 #Soul派对 #死磕精神 #小程序 卡若创业派对",
    "核心就两个字 筛选。能开派对坚持7天的人再谈.mp4":
        "别跟所有人合作，核心就两个字：筛选。能坚持开7天派对的人，才值得深聊 #筛选思维 #Soul派对 #创业认知 #人性 #小程序 卡若创业派对",
    "睡眠不好？每天放下一件事，做减法.mp4":
        "睡不好不是因为太累，是因为脑子里装太多。每天放下一件事，做减法，睡眠自然好 #睡眠 #做减法 #Soul派对 #心理健康 #小程序 卡若创业派对",
    "这套体系花了170万，但前端几十块就能参与.mp4":
        "后端花了170万搭的体系，前端几十块就能参与。真正的商业模式是让别人低成本上车 #商业认知 #Soul派对 #低门槛创业 #体系思维 #小程序 卡若创业派对",
    "金融AI获客体系 后端30人沉淀12年，前端丢手机.mp4":
        "后端30人沉淀了12年，前端操作就是丢个手机号。金融AI获客体系，把复杂留给自己 #AI获客 #金融科技 #Soul派对 #系统思维 #小程序 卡若创业派对",
}


# ═══════════════════════════════════════════════════════════
# Storage State 加载
# ═══════════════════════════════════════════════════════════
class SecurityKeys:
    def __init__(self, state_path: Path):
        with open(state_path, "r", encoding="utf-8") as f:
            state = json.load(f)

        self.cookies = self._extract_cookies(state)
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
                    self.ec_private_key = serialization.load_pem_private_key(
                        pem.encode(), password=None
                    )
                    pub = self.ec_private_key.public_key()
                    self.ec_public_key_bytes = pub.public_bytes(
                        serialization.Encoding.X962,
                        serialization.PublicFormat.UncompressedPoint,
                    )
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

    @staticmethod
    def _extract_cookies(state: dict) -> dict:
        result = {}
        for c in state.get("cookies", []):
            if "douyin.com" in c.get("domain", ""):
                result[c["name"]] = c["value"]
        return result

    def compute_ticket_guard(self, path: str) -> dict:
        """计算 bd-ticket-guard 头 (ECDH + HMAC)"""
        if not self.ec_private_key or not self.server_public_key:
            return {}

        eph_priv = ec.generate_private_key(ec.SECP256R1())
        eph_pub = eph_priv.public_key()
        eph_pub_bytes = eph_pub.public_bytes(
            serialization.Encoding.X962,
            serialization.PublicFormat.UncompressedPoint,
        )
        shared_secret = eph_priv.exchange(ec.ECDH(), self.server_public_key)

        ts = int(time.time())

        ts_hex = self.ts_sign_raw.replace("ts.2.", "")
        ts_bytes = bytes.fromhex(ts_hex)
        ts_first = ts_bytes[:32]
        ts_last = ts_bytes[32:]
        new_first = bytes(a ^ b for a, b in zip(ts_first, shared_secret[:32]))
        new_ts_sign = "ts.2." + (new_first + ts_last).hex()

        msg = f"{self.ticket},{path},{ts}"
        req_sign = hmac.new(shared_secret, msg.encode(), hashlib.sha256).digest()

        client_data = {
            "ts_sign": new_ts_sign,
            "req_content": "ticket,path,timestamp",
            "req_sign": base64.b64encode(req_sign).decode(),
            "timestamp": ts,
        }

        return {
            "bd-ticket-guard-client-data": base64.b64encode(
                json.dumps(client_data).encode()
            ).decode(),
            "bd-ticket-guard-ree-public-key": base64.b64encode(eph_pub_bytes).decode(),
            "bd-ticket-guard-version": "2",
            "bd-ticket-guard-web-version": "2",
            "bd-ticket-guard-web-sign-type": "1",
        }


# ═══════════════════════════════════════════════════════════
# AWS4-HMAC-SHA256 签名
# ═══════════════════════════════════════════════════════════
def _hmac_sha256(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode(), hashlib.sha256).digest()


USER_ID = ""  # 自动从 user_info 接口获取


def aws4_sign(ak: str, sk: str, token: str, qs: str,
              method: str = "GET", body: bytes = b"") -> tuple:
    now = datetime.datetime.now(datetime.timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    ds = now.strftime("%Y%m%d")
    region, service = "cn-north-1", "vod"
    body_hash = hashlib.sha256(body).hexdigest()

    if method == "POST":
        signed_headers = "content-type;x-amz-date;x-amz-security-token"
        header_str = (
            f"content-type:text/plain;charset=UTF-8\n"
            f"x-amz-date:{amz_date}\n"
            f"x-amz-security-token:{token}\n"
        )
    else:
        signed_headers = "x-amz-date;x-amz-security-token"
        header_str = (
            f"x-amz-date:{amz_date}\n"
            f"x-amz-security-token:{token}\n"
        )

    canonical = f"{method}\n/\n{qs}\n{header_str}\n{signed_headers}\n{body_hash}"
    scope = f"{ds}/{region}/{service}/aws4_request"
    sts = f"AWS4-HMAC-SHA256\n{amz_date}\n{scope}\n{hashlib.sha256(canonical.encode()).hexdigest()}"

    k = _hmac_sha256(f"AWS4{sk}".encode(), ds)
    k = _hmac_sha256(k, region)
    k = _hmac_sha256(k, service)
    k = _hmac_sha256(k, "aws4_request")
    sig = hmac.new(k, sts.encode(), hashlib.sha256).hexdigest()

    auth = f"AWS4-HMAC-SHA256 Credential={ak}/{scope}, SignedHeaders={signed_headers}, Signature={sig}"
    return auth, amz_date, token


def _rand(n=11):
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=n))


# ═══════════════════════════════════════════════════════════
# Step 1: 获取上传凭证
# ═══════════════════════════════════════════════════════════
async def get_upload_auth(client: httpx.AsyncClient, keys: SecurityKeys) -> dict:
    print("  [1] 获取上传凭证...")
    resp = await client.get(
        AUTH_URL, headers={"Cookie": keys.cookie_str, "User-Agent": UA}
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("status_code") != 0:
        raise RuntimeError(f"auth 失败: {data}")
    auth = json.loads(data["auth"])
    print(f"      AK={auth['AccessKeyID'][:15]}...")
    return {
        "ak": data["ak"],
        "access_key_id": auth["AccessKeyID"],
        "secret": auth["SecretAccessKey"],
        "token": auth["SessionToken"],
    }


# ═══════════════════════════════════════════════════════════
# Step 2: 获取上传地址
# ═══════════════════════════════════════════════════════════
async def apply_upload(client: httpx.AsyncClient, auth: dict, file_size: int) -> dict:
    print("  [2] 获取上传地址...")
    params = {
        "Action": "ApplyUploadInner",
        "FileSize": str(file_size),
        "FileType": "video",
        "IsInner": "1",
        "SpaceName": "aweme",
        "Version": "2020-11-19",
        "app_id": "2906",
        "s": _rand(),
    }
    qs = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
    authorization, amz_date, token = aws4_sign(
        auth["access_key_id"], auth["secret"], auth["token"], qs
    )
    url = f"{VOD_HOST}/?{qs}"
    resp = await client.get(
        url,
        headers={
            "authorization": authorization,
            "x-amz-date": amz_date,
            "x-amz-security-token": token,
            "User-Agent": UA,
        },
    )
    resp.raise_for_status()
    data = resp.json()
    result = data.get("Result") or {}

    inner = result.get("InnerUploadAddress") or {}
    nodes = inner.get("UploadNodes") or []
    if not nodes:
        raise RuntimeError(f"ApplyUploadInner 无 UploadNodes: {data}")

    node = nodes[0]
    host = node["UploadHost"]
    store = node["StoreInfos"][0]
    session_key = node["SessionKey"]
    vid = node["Vid"]

    print(f"      vid={vid}, host={host}")
    return {
        "session_key": session_key,
        "host": host,
        "store_uri": store["StoreUri"],
        "auth_token": store["Auth"],
        "upload_id": store["UploadID"],
        "vid": vid,
    }


# ═══════════════════════════════════════════════════════════
# Step 3: 分片上传
# ═══════════════════════════════════════════════════════════
async def upload_chunks(
    client: httpx.AsyncClient, info: dict, file_path: str
) -> bool:
    print("  [3] 上传视频...")
    raw = Path(file_path).read_bytes()
    total = len(raw)
    n_chunks = (total + CHUNK_SIZE - 1) // CHUNK_SIZE
    base_url = f"https://{info['host']}/upload/v1/{info['store_uri']}"
    upload_id = info["upload_id"]
    auth_h = {"Authorization": info["auth_token"], "User-Agent": UA}

    crc_parts = []
    for i in range(n_chunks):
        start = i * CHUNK_SIZE
        end = min(start + CHUNK_SIZE, total)
        chunk = raw[start:end]
        crc32_hex = "%08x" % (zlib.crc32(chunk) & 0xFFFFFFFF)

        resp = await client.post(
            f"{base_url}?uploadid={upload_id}&part_number={i+1}&phase=transfer",
            content=chunk,
            headers={**auth_h, "Content-CRC32": crc32_hex,
                     "Content-Type": "application/octet-stream"},
            timeout=120.0,
        )
        resp_data = resp.json() if resp.status_code == 200 else {}
        if resp_data.get("code") != 2000:
            print(f"      chunk {i+1}/{n_chunks} 失败: {resp.text[:200]}")
            return False
        sv_crc = resp_data.get("data", {}).get("crc32", crc32_hex)
        crc_parts.append(f"{i+1}:{sv_crc}")
        print(f"      chunk {i+1}/{n_chunks} ok (crc32={sv_crc})")

    finish_body = ",".join(crc_parts).encode()
    finish_resp = await client.post(
        f"{base_url}?uploadid={upload_id}&phase=finish",
        content=finish_body,
        headers={**auth_h, "Content-Type": "text/plain"},
        timeout=60.0,
    )
    fd = finish_resp.json() if finish_resp.status_code == 200 else {}
    if fd.get("code") == 2000:
        print(f"      finish ok")
        return True
    print(f"      finish: {fd}")
    return False


# ═══════════════════════════════════════════════════════════
# Step 4: CommitUploadInner → video_id
# ═══════════════════════════════════════════════════════════
async def commit_upload(
    client: httpx.AsyncClient, auth: dict, session_key: str
) -> str:
    print("  [4] CommitUploadInner (POST)...")
    qs_params = {
        "Action": "CommitUploadInner",
        "SpaceName": "aweme",
        "Version": "2020-11-19",
        "app_id": "2906",
        "user_id": USER_ID,
    }
    qs = "&".join(f"{k}={v}" for k, v in sorted(qs_params.items()))

    body = json.dumps({
        "SessionKey": session_key,
        "Functions": [{"Name": "GetMeta"}],
    }).encode("utf-8")

    authorization, amz_date, token = aws4_sign(
        auth["access_key_id"], auth["secret"], auth["token"], qs,
        method="POST", body=body,
    )
    url = f"{VOD_HOST}/?{qs}"
    resp = await client.post(
        url,
        content=body,
        headers={
            "authorization": authorization,
            "x-amz-date": amz_date,
            "x-amz-security-token": token,
            "content-type": "text/plain;charset=UTF-8",
            "User-Agent": UA,
        },
        timeout=30.0,
    )
    resp.raise_for_status()
    data = resp.json()
    err = data.get("ResponseMetadata", {}).get("Error", {})
    if err.get("CodeN", 0):
        print(f"      CommitUpload 失败: {err}")
        return ""
    results = data.get("Result", {}).get("Results", [])
    if results:
        vid = results[0].get("Vid", "")
        if vid:
            print(f"      video_id={vid}")
            return vid
    print(f"      CommitUpload 响应: {json.dumps(data, ensure_ascii=False)[:300]}")
    return ""


# ═══════════════════════════════════════════════════════════
# Step 5: 等待视频就绪 (轮询 transend)
# ═══════════════════════════════════════════════════════════
async def wait_video_ready(
    client: httpx.AsyncClient, keys: SecurityKeys, video_id: str,
    max_wait: int = 15,
) -> bool:
    print("  [5] 等待转码...")
    url = f"{BASE}/web/api/media/video/transend/"
    for i in range(max_wait):
        try:
            resp = await client.get(
                url,
                params={"video_id": video_id, "cookie_enabled": "true", "aid": "2906"},
                headers={"Cookie": keys.cookie_str, "User-Agent": UA,
                         "Referer": "https://creator.douyin.com/creator-micro/content/post/video"},
                timeout=10.0,
            )
            data = resp.json()
            if data.get("encode") == 1:
                print(f"      转码完成 ({data.get('duration', 0):.1f}s)")
                return True
        except Exception:
            pass
        await asyncio.sleep(2)
    print("      转码未完成，继续发布（服务端会后台处理）")
    return True


# ═══════════════════════════════════════════════════════════
# Step 6: 发布 create_v2
# ═══════════════════════════════════════════════════════════
async def create_v2(
    client: httpx.AsyncClient,
    keys: SecurityKeys,
    video_id: str,
    title: str,
    timing_ts: int = 0,
) -> dict:
    print("  [6] 发布 create_v2...")
    path = "/web/api/media/aweme/create_v2/"
    creation_id = f"{_rand(8)}{int(time.time() * 1000)}"

    body = {
        "item": {
            "common": {
                "text": title,
                "caption": title,
                "item_title": "",
                "activity": "[]",
                "text_extra": "[]",
                "challenges": "[]",
                "mentions": "[]",
                "hashtag_source": "",
                "hot_sentence": "",
                "interaction_stickers": "[]",
                "visibility_type": 0,
                "download": 1,
                "timing": timing_ts if timing_ts > 0 else 0,
                "creation_id": creation_id,
                "media_type": 4,
                "video_id": video_id,
                "music_source": 0,
                "music_id": None,
            },
            "cover": {
                "custom_cover_image_height": 0,
                "custom_cover_image_width": 0,
                "poster": "",
                "poster_delay": 0,
            },
        }
    }

    guard_headers = keys.compute_ticket_guard(path)

    query_params = {
        "read_aid": "2906",
        "cookie_enabled": "true",
        "screen_width": "1280",
        "screen_height": "720",
        "browser_language": "zh-CN",
        "browser_platform": "MacIntel",
        "browser_name": "Mozilla",
        "browser_version": UA.split("Chrome/")[1].split(" ")[0] if "Chrome/" in UA else "143.0.0.0",
        "browser_online": "true",
        "timezone_name": "Asia/Shanghai",
        "aid": "1128",
        "support_h265": "1",
    }
    if keys.ms_token:
        query_params["msToken"] = keys.ms_token

    headers = {
        "Cookie": keys.cookie_str,
        "User-Agent": UA,
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://creator.douyin.com/creator-micro/content/post/video?enter_from=publish_page",
        "Origin": "https://creator.douyin.com",
    }
    if keys.csrf_token:
        headers["x-secsdk-csrf-token"] = f"000100000001{keys.csrf_token[:32]}"
    headers.update(guard_headers)

    url = CREATE_V2_URL + "?" + urlencode(query_params)

    resp = await client.post(
        url, headers=headers, json=body, timeout=30.0,
    )

    print(f"      HTTP {resp.status_code}")
    print(f"      Headers: {dict(resp.headers)}")

    raw = resp.text
    if not raw:
        print("      空响应（签名被拒绝或安全限制）")
        return {"status_code": -1, "error": "empty_response"}

    print(f"      响应: {raw[:500]}")
    try:
        return resp.json()
    except Exception:
        return {"status_code": -1, "error": raw[:200]}


# ═══════════════════════════════════════════════════════════
# 单视频发布
# ═══════════════════════════════════════════════════════════
async def publish_one(
    video_path: str,
    title: str,
    idx: int = 1,
    total: int = 1,
    skip_dedup: bool = False,
    scheduled_time=None,
) -> "PublishResult":
    global USER_ID
    sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
    from publish_result import PublishResult, is_published

    fname = Path(video_path).name
    fsize = Path(video_path).stat().st_size
    timing_ts = int(scheduled_time.timestamp()) if scheduled_time else 0
    timing_str = scheduled_time.strftime("%m-%d %H:%M") if scheduled_time else "立即"
    t0 = time.time()

    print(f"\n{'='*60}")
    print(f"  [{idx}/{total}] {fname}")
    print(f"  大小: {fsize/1024/1024:.1f}MB | 定时: {timing_str}")
    print(f"  标题: {title[:60]}")
    print(f"{'='*60}")

    if not skip_dedup and is_published("抖音", video_path):
        print(f"  [跳过] 该视频已发布到抖音", flush=True)
        return PublishResult(platform="抖音", video_path=video_path, title=title,
                           success=True, status="skipped", message="去重跳过（已发布）")

    try:
        keys = SecurityKeys(COOKIE_FILE)
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            resp = await client.get(
                USER_INFO_URL, headers={"Cookie": keys.cookie_str, "User-Agent": UA}
            )
            uid_data = resp.json()
            if uid_data.get("status_code") != 0:
                return PublishResult(platform="抖音", video_path=video_path, title=title,
                                   success=False, status="error", message="Cookie 已过期",
                                   elapsed_sec=time.time()-t0)
            user = uid_data.get("user") or uid_data.get("user_info") or {}
            USER_ID = str(user.get("uid", "") or user.get("user_id", ""))

            auth = await get_upload_auth(client, keys)
            info = await apply_upload(client, auth, fsize)
            if not await upload_chunks(client, info, video_path):
                return PublishResult(platform="抖音", video_path=video_path, title=title,
                                   success=False, status="failed", message="上传失败",
                                   elapsed_sec=time.time()-t0)
            video_id = await commit_upload(client, auth, info["session_key"])
            if not video_id:
                return PublishResult(platform="抖音", video_path=video_path, title=title,
                                   success=False, status="failed", message="未获取到 video_id",
                                   elapsed_sec=time.time()-t0)
            result = await create_v2(client, keys, video_id, title, timing_ts)

            elapsed = time.time() - t0
            if result.get("status_code") == 0:
                item_id = result.get("item_id", "")
                msg = f"发布成功 item_id={item_id}"
                if timing_ts > 0:
                    msg += f" (定时 {timing_str})"
                print(f"  [✓] {msg}")
                return PublishResult(platform="抖音", video_path=video_path, title=title,
                                   success=True, status="reviewing", message=msg,
                                   elapsed_sec=elapsed)
            else:
                msg = f"发布失败: {str(result)[:80]}"
                print(f"  [✗] {msg}")
                return PublishResult(platform="抖音", video_path=video_path, title=title,
                                   success=False, status="failed", message=msg,
                                   elapsed_sec=elapsed)
    except Exception as e:
        return PublishResult(platform="抖音", video_path=video_path, title=title,
                           success=False, status="error", message=f"异常: {str(e)[:80]}",
                           elapsed_sec=time.time()-t0)


# ═══════════════════════════════════════════════════════════
# 主流程
# ═══════════════════════════════════════════════════════════
async def main():
    if not COOKIE_FILE.exists():
        print("[✗] Cookie 不存在，请先运行 douyin_login.py")
        return 1

    keys = SecurityKeys(COOKIE_FILE)
    print(f"[✓] Cookie 加载 ({len(keys.cookies)} items)")
    for k in ("ms_token", "ec_private_key", "server_public_key", "ticket", "ts_sign_raw", "csrf_token"):
        v = getattr(keys, k, None)
        print(f"    {k}: {'✓' if v else '✗'}")

    global USER_ID
    async with httpx.AsyncClient(timeout=15.0) as c:
        resp = await c.get(
            USER_INFO_URL, headers={"Cookie": keys.cookie_str, "User-Agent": UA}
        )
        data = resp.json()
        if data.get("status_code") != 0:
            print(f"[✗] Cookie 无效: {data}")
            return 1
        user = data.get("user") or data.get("user_info") or {}
        nickname = user.get("nickname", "unknown")
        USER_ID = str(user.get("uid", "") or user.get("user_id", ""))
        print(f"[✓] 用户: {nickname} (uid={USER_ID})\n")

    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print("[✗] 未找到视频")
        return 1
    print(f"[i] 共 {len(videos)} 条视频")

    sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
    from publish_result import print_summary, save_results
    from schedule_generator import generate_schedule, format_schedule

    schedule_times = generate_schedule(len(videos))
    print(f"\n排期：")
    print(format_schedule([v.name for v in videos], schedule_times))

    results = []
    for i, (vp, stime) in enumerate(zip(videos, schedule_times)):
        title = TITLES.get(vp.name, f"{vp.stem} #Soul派对 #创业日记")
        r = await publish_one(str(vp), title, i + 1, len(videos), scheduled_time=stime)
        results.append(r)
        if i < len(videos) - 1:
            await asyncio.sleep(3)

    actual = [r for r in results if r.status != "skipped"]
    print_summary(actual)
    save_results(actual)
    ok = sum(1 for r in actual if r.success)
    return 0 if ok == len(actual) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
