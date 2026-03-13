#!/usr/bin/env python3
"""
视频号纯 API 发布 v8 — 零 Playwright，全 httpx
协议: helper_upload_params → DFS upload → post_clip_video → poll clip_result → post_create

v8 修复 (2026-03-13):
- 添加 post_clip_video 转码步骤（浏览器必需的中间步骤）
- URL 改写: wxapp.tc.qq.com → finder.video.qq.com（与浏览器一致）
- API 使用 /micro/content/ 前缀
- x-wechat-uin 使用 uin 数值
- post_create 使用服务端返回的 clipKey/draftId
- 去除 clientid（UUID4 格式触发设备验证 300001）
"""
import asyncio
import hashlib
import json
import math
import random
import subprocess
import sys
import time
import uuid
from pathlib import Path
from urllib.parse import quote

import httpx

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "channels_storage_state.json"
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul_派对_121场_20260311_output/成片")

sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
from publish_result import PublishResult, is_published, save_results, print_summary

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

try:
    from video_metadata import VideoMeta
except ImportError:
    VideoMeta = None

DESC_SUFFIX = " #小程序 卡若创业派对"
MINI_PROGRAM_LINK = "#小程序://卡若创业派对/gF4V8Vo4Ws4IiJa"
CHUNK_SIZE = 8 * 1024 * 1024

CDN_DOMAINS = [
    "finderassistancea", "finderassistanceb",
    "finderassistancec", "finderassistanced",
]
CDN_BASE = ".video.qq.com"

TITLES = {
    "AI最大的缺点是上下文太短，这样来解决.mp4":
        "AI的短板是记忆太短，上下文一长就废了，这个方法能解决 #AI工具 #效率提升",
    "AI每天剪1000个视频 M4电脑24T素材库全网分发.mp4":
        "M4芯片+24T素材库，AI每天剪1000条视频自动全网分发 #AI剪辑 #内容工厂",
    "Soul派对变现全链路 发视频就有钱，后端全解决.mp4":
        "Soul派对怎么赚钱？发视频就有收益，后端体系全部搞定 #Soul派对 #副业收入",
    "从0到切片发布 AI自动完成每天副业30条视频.mp4":
        "从零到切片发布，AI全自动完成，每天副业产出30条视频 #AI副业 #切片分发",
    "做副业的基本条件 苹果电脑和特殊访问工具.mp4":
        "做副业的两个基本条件：一台Mac和一个上网工具 #副业入门 #工具推荐",
    "切片分发全自动化 从视频到发布一键完成.mp4":
        "从录制到发布全自动化，一键切片分发五大平台 #自动化 #内容分发",
    "创业团队4人平分25有啥危险 先跑钱再谈股权.mp4":
        "创业团队4人平分25%股权有啥风险？先跑出收入再谈分配 #创业股权 #团队管理",
    "坚持到120场是什么感觉 方向越确定执行越坚决.mp4":
        "坚持到第120场派对是什么感觉？方向越清晰执行越坚决 #Soul派对 #坚持的力量",
    "帮人装AI一单300到1000块，传统行业也能做.mp4":
        "帮传统行业的人装AI工具，一单收300到1000块，简单好做 #AI服务 #传统行业",
    "深度AI模型对比 哪个才是真正的AI不是语言模型.mp4":
        "深度对比各大AI模型，哪个才是真正的智能而不只是语言模型 #AI对比 #深度思考",
    "疗愈师配AI助手能收多少钱 一个小团队5万到10万.mp4":
        "疗愈师+AI助手组合，一个小团队月收5万到10万 #AI赋能 #疗愈商业",
    "赚钱没那么复杂，自信心才是核心问题.mp4":
        "赚钱真没那么复杂，自信心才是卡住你的核心问题 #创业心态 #自信",
}


# ---------------------------------------------------------------------------
# Storage helpers
# ---------------------------------------------------------------------------

def load_state() -> dict | None:
    if not COOKIE_FILE.exists():
        return None
    return json.loads(COOKIE_FILE.read_text())


def get_cookie_str(state: dict) -> str:
    cookies = {c["name"]: c["value"] for c in state.get("cookies", [])}
    return "; ".join(f"{k}={v}" for k, v in cookies.items())


def get_local_storage(state: dict) -> dict:
    ls = {}
    for origin in state.get("origins", []):
        for item in origin.get("localStorage", []):
            ls[item["name"]] = item.get("value", "")
    return ls


# ---------------------------------------------------------------------------
# Video helpers
# ---------------------------------------------------------------------------

def get_video_info(video_path: str) -> dict:
    proc = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json",
         "-show_format", "-show_streams", video_path],
        capture_output=True, text=True, timeout=15,
    )
    info = json.loads(proc.stdout)
    vs = next(s for s in info["streams"] if s["codec_type"] == "video")
    return {
        "duration": float(info["format"]["duration"]),
        "width": int(vs["width"]),
        "height": int(vs["height"]),
    }


def extract_thumbnail(video_path: str) -> Path:
    thumb_path = Path(f"/tmp/ch_thumb_{Path(video_path).stem[:20]}.jpg")
    subprocess.run(
        ["ffmpeg", "-y", "-i", video_path, "-ss", "1", "-vframes", "1",
         "-vf", "scale=720:-2", "-q:v", "5", str(thumb_path)],
        capture_output=True, timeout=15,
    )
    return thumb_path


def rewrite_cdn_url(url: str) -> str:
    """DFS 返回 http://wxapp.tc.qq.com, 浏览器实际使用 https://finder.video.qq.com"""
    return url.replace("http://wxapp.tc.qq.com", "https://finder.video.qq.com")


# ---------------------------------------------------------------------------
# API calls
# ---------------------------------------------------------------------------

async def auth_check(cookie_str: str) -> dict | None:
    r = httpx.post(
        "https://channels.weixin.qq.com/cgi-bin/mmfinderassistant-bin/auth/auth_data",
        json={},
        headers={"Cookie": cookie_str, "User-Agent": UA, "Content-Type": "application/json"},
        timeout=15,
    )
    data = r.json()
    if data.get("errCode") == 0:
        return data.get("data", {})
    return None


async def get_upload_params(cookie_str: str, finder_id: str) -> dict | None:
    r = httpx.post(
        "https://channels.weixin.qq.com/cgi-bin/mmfinderassistant-bin/helper/helper_upload_params",
        json={
            "timestamp": str(int(time.time() * 1000)),
            "_log_finder_id": finder_id,
            "scene": 7,
            "reqScene": 7,
        },
        headers={"Cookie": cookie_str, "User-Agent": UA, "Content-Type": "application/json"},
        timeout=15,
    )
    data = r.json()
    if data.get("errCode") == 0:
        return data.get("data", {})
    print(f"  [!] upload_params: {data}", flush=True)
    return None


async def dfs_upload_file(
    auth_key: str, file_data: bytes, up_params: dict,
    file_type: int, file_key: str, label: str = "",
) -> str | None:
    file_size = len(file_data)
    num_chunks = max(1, math.ceil(file_size / CHUNK_SIZE))

    cumulative = [min((i + 1) * CHUNK_SIZE, file_size) for i in range(num_chunks)]
    cumulative[-1] = file_size

    x_args = (
        f"apptype={up_params['appType']}"
        f"&filetype={file_type}"
        f"&weixinnum={up_params['uin']}"
        f"&filekey={quote(file_key)}"
        f"&filesize={file_size}"
        f"&taskid={uuid.uuid4()}"
        f"&scene={up_params.get('scene', 2)}"
    )
    base_h = {
        "Authorization": auth_key,
        "User-Agent": UA,
        "Referer": "https://channels.weixin.qq.com/",
        "Accept": "application/json, text/plain, */*",
        "Content-MD5": "null",
        "X-Arguments": x_args,
    }
    base_url = f"https://{CDN_DOMAINS[0]}{CDN_BASE}"

    async with httpx.AsyncClient(timeout=300) as c:
        ar = await c.put(
            f"{base_url}/applyuploaddfs",
            json={"BlockSum": num_chunks, "BlockPartLength": cumulative},
            headers={**base_h, "Content-Type": "application/json"},
        )
        aj = ar.json()
        if "UploadID" not in aj:
            print(f"  [!] {label} applyuploaddfs: {json.dumps(aj)[:100]}", flush=True)
            return None
        uid = aj["UploadID"]

        etags = []
        prev = 0
        for i in range(num_chunks):
            chunk = file_data[prev:cumulative[i]]
            prev = cumulative[i]
            host = CDN_DOMAINS[(i + 1) % len(CDN_DOMAINS)]

            for retry in range(3):
                try:
                    ur = await c.put(
                        f"https://{host}{CDN_BASE}/uploadpartdfs?PartNumber={i+1}&UploadID={uid}",
                        content=chunk,
                        headers={**base_h, "Content-Type": "application/octet-stream"},
                    )
                    rj = ur.json()
                    if rj.get("X-Errno", 0) != 0:
                        print(f"  [!] {label} part {i+1}: {rj}", flush=True)
                        return None
                    etags.append({
                        "PartNumber": i + 1,
                        "ETag": rj.get("ETag", f'"{hashlib.sha1(chunk).hexdigest()}"'),
                    })
                    break
                except Exception as e:
                    if retry == 2:
                        print(f"  [!] {label} part {i+1} failed: {e}", flush=True)
                        return None
                    await asyncio.sleep(2)

        cr = await c.post(
            f"{base_url}/completepartuploaddfs?UploadID={uid}",
            json={"TransFlag": "0_0", "PartInfo": etags},
            headers={**base_h, "Content-Type": "application/json"},
        )
        cj = cr.json()
        if "DownloadURL" not in cj:
            print(f"  [!] {label} complete: {json.dumps(cj)[:100]}", flush=True)
            return None
        return rewrite_cdn_url(cj["DownloadURL"])


MICRO_PREFIX = "https://channels.weixin.qq.com/micro/content/cgi-bin/mmfinderassistant-bin"
CGI_PREFIX = "https://channels.weixin.qq.com/cgi-bin/mmfinderassistant-bin"


def _gen_task_id() -> str:
    ts_ms = int(time.time() * 1000)
    rand = random.randint(10**6, 10**7 - 1)
    return str(ts_ms * 10**7 + rand)


def _micro_headers(cookie_str: str, uin: str, finger_print: str = "") -> dict:
    h = {
        "Cookie": cookie_str,
        "User-Agent": UA,
        "Content-Type": "application/json",
        "Referer": "https://channels.weixin.qq.com/micro/content/post/create",
        "Origin": "https://channels.weixin.qq.com",
        "Accept": "application/json, text/plain, */*",
        "x-wechat-uin": str(uin),
    }
    if finger_print:
        h["finger-print-device-id"] = finger_print
    return h


async def clip_video(
    cookie_str: str, finder_id: str, uin: str, finger_print: str, aid: str,
    video_url: str, video_info: dict, file_size: int, upload_cost: int,
) -> dict | None:
    """提交视频转码，返回 {clipKey, draftId} 或 None"""
    now_ts = int(time.time())
    payload = {
        "url": video_url,
        "timeStart": 0,
        "cropDuration": 0,
        "height": video_info["height"],
        "width": video_info["width"],
        "x": 0, "y": 0,
        "clipOriginVideoInfo": {
            "width": video_info["width"],
            "height": video_info["height"],
            "duration": video_info["duration"],
            "fileSize": file_size,
        },
        "traceInfo": {
            "traceKey": f"FPT_{now_ts}_{random.randint(10**8, 10**10 - 1)}",
            "uploadCdnStart": now_ts - max(1, upload_cost // 1000),
            "uploadCdnEnd": now_ts,
        },
        "targetWidth": video_info["width"],
        "targetHeight": video_info["height"],
        "type": 4,
        "useAstraThumbCover": 1,
        "timestamp": str(int(time.time() * 1000)),
        "_log_finder_uin": "",
        "_log_finder_id": finder_id,
        "rawKeyBuff": None,
        "pluginSessionId": None,
        "scene": 7, "reqScene": 7,
    }

    rid = f"{uuid.uuid4().hex[:8]}-{uuid.uuid4().hex[:8]}"
    url = (
        f"{MICRO_PREFIX}/post/post_clip_video"
        f"?_aid={aid}&_rid={rid}"
        f"&_pageUrl=https%3A%2F%2Fchannels.weixin.qq.com%2Fmicro%2Fcontent%2Fpost%2Fcreate"
    )
    headers = _micro_headers(cookie_str, uin, finger_print)

    r = httpx.post(url, json=payload, headers=headers, timeout=30)
    resp = r.json()
    print(f"  clip_video resp: errCode={resp.get('errCode')} keys={list(resp.get('data',{}).keys())[:10]}", flush=True)
    if resp.get("errCode") == 0:
        data = resp.get("data", {})
        print(f"  clip_video OK: clipKey={data.get('clipKey')} draftId={data.get('draftId')}", flush=True)
        return data
    print(f"  [!] clip_video: errCode={resp.get('errCode')} resp={json.dumps(resp, ensure_ascii=False)[:500]}", flush=True)
    return None


async def poll_clip_result(
    cookie_str: str, finder_id: str, uin: str, finger_print: str, aid: str,
    clip_key: str, max_wait: int = 600,
) -> dict | None:
    """轮询转码结果，返回含 media 信息的 data 或 None"""
    headers = _micro_headers(cookie_str, uin, finger_print)
    start = time.time()

    while time.time() - start < max_wait:
        rid = f"{uuid.uuid4().hex[:8]}-{uuid.uuid4().hex[:8]}"
        url = (
            f"{MICRO_PREFIX}/post/post_clip_video_result"
            f"?_aid={aid}&_rid={rid}"
            f"&_pageUrl=https%3A%2F%2Fchannels.weixin.qq.com%2Fmicro%2Fcontent%2Fpost%2Fcreate"
        )
        payload = {
            "clipKey": clip_key,
            "draftId": clip_key,
            "timestamp": str(int(time.time() * 1000)),
            "_log_finder_uin": "",
            "_log_finder_id": finder_id,
            "rawKeyBuff": None,
            "pluginSessionId": None,
            "scene": 7, "reqScene": 7,
        }
        r = httpx.post(url, json=payload, headers=headers, timeout=15)
        resp = r.json()
        err_code = resp.get("errCode", -999)
        data = resp.get("data", {})
        status = data.get("status", -1)
        elapsed = int(time.time() - start)
        data_preview = json.dumps(data, ensure_ascii=False)[:300] if elapsed < 30 else f"status={status} keys={list(data.keys())[:8]}"
        print(f"  poll [{elapsed}s] errCode={err_code} {data_preview}", flush=True)

        if err_code != 0:
            print(f"  [!] poll errCode≠0: {json.dumps(resp, ensure_ascii=False)[:500]}", flush=True)
            return None

        if status == 1:
            return data
        if status < -1:
            print(f"  [!] clip_result 失败: status={status}", flush=True)
            return None

        await asyncio.sleep(5)

    print(f"  [!] clip_result 超时 ({max_wait}s)", flush=True)
    return None


async def create_post(
    cookie_str: str,
    desc: str,
    short_title: str,
    video_url: str,
    thumb_url: str,
    video_info: dict,
    file_size: int,
    finder_id: str,
    uin: str,
    finger_print: str,
    aid: str,
    clip_key: str,
    draft_id: str,
    upload_cost: int,
    scheduled_ts: int = 0,
    original: bool = True,
) -> dict:
    now_ts = int(time.time())

    payload = {
        "objectType": 0,
        "longitude": 0, "latitude": 0, "feedLongitude": 0, "feedLatitude": 0,
        "originalFlag": 1 if original else 0,
        "topics": [],
        "isFullPost": 1,
        "handleFlag": 2,
        "videoClipTaskId": clip_key,
        "traceInfo": {
            "traceKey": f"FPT_{now_ts}_{random.randint(10**8, 10**10 - 1)}",
            "uploadCdnStart": now_ts - max(1, upload_cost // 1000),
            "uploadCdnEnd": now_ts,
        },
        "objectDesc": {
            "mpTitle": short_title,
            "description": desc,
            "extReading": {},
            "mediaType": 4,
            "location": {"latitude": 0, "longitude": 0, "city": "", "poiClassifyId": ""},
            "topic": {"finderTopicInfo": ""},
            "event": {},
            "mentionedUser": [],
            "media": [{
                "url": video_url,
                "fileSize": file_size,
                "thumbUrl": thumb_url,
                "fullThumbUrl": thumb_url,
                "mediaType": 4,
                "videoPlayLen": int(video_info["duration"]),
                "width": video_info["width"],
                "height": video_info["height"],
                "md5sum": hashlib.md5(str(file_size).encode()).hexdigest(),
                "coverUrl": thumb_url,
                "fullCoverUrl": thumb_url,
                "urlCdnTaskId": clip_key,
            }],
            "member": {},
        },
        "report": {
            "clipKey": clip_key,
            "draftId": draft_id,
            "height": video_info["height"],
            "width": video_info["width"],
            "duration": int(video_info["duration"]),
            "fileSize": file_size,
            "uploadCost": upload_cost,
        },
        "postFlag": 0,
        "mode": 1,
        "timestamp": str(int(time.time() * 1000)),
        "_log_finder_uin": "",
        "_log_finder_id": finder_id,
        "rawKeyBuff": None,
        "pluginSessionId": None,
        "scene": 7,
        "reqScene": 7,
    }

    if scheduled_ts > 0:
        payload["postTimingInfo"] = {"timing": 1, "postTime": scheduled_ts}

    headers = _micro_headers(cookie_str, uin, finger_print)
    rid = f"{uuid.uuid4().hex[:8]}-{uuid.uuid4().hex[:8]}"
    url = (
        f"{MICRO_PREFIX}/post/post_create"
        f"?_aid={aid}&_rid={rid}"
        f"&_pageUrl=https%3A%2F%2Fchannels.weixin.qq.com%2Fmicro%2Fcontent%2Fpost%2Fcreate"
    )

    r = httpx.post(url, json=payload, headers=headers, timeout=30)
    resp = r.json()
    print(f"  [DEBUG] post_create response: {json.dumps(resp, ensure_ascii=False)[:300]}", flush=True)
    return resp


# ---------------------------------------------------------------------------
# Publish one video
# ---------------------------------------------------------------------------

def _make_short_title(title: str) -> str:
    """6-16 字的短标题"""
    clean = title.split("#")[0].strip()
    if len(clean) <= 16:
        return clean if len(clean) >= 6 else clean + "｜创业日记"
    return clean[:16]


async def publish_one(
    cookie_str: str,
    finder_id: str,
    uin: str,
    finger_print: str,
    aid: str,
    up_params: dict,
    video_path: str,
    title: str,
    idx: int,
    total: int,
    scheduled_ts: int = 0,
) -> PublishResult:
    fname = Path(video_path).name
    real_path = Path(video_path).resolve()
    fsize = real_path.stat().st_size
    t0 = time.time()

    sched_label = ""
    if scheduled_ts > 0:
        import datetime
        dt = datetime.datetime.fromtimestamp(scheduled_ts)
        sched_label = f" [定时 {dt.strftime('%H:%M')}]"

    print(f"\n[{idx}/{total}] {fname} ({fsize / 1024 / 1024:.1f}MB){sched_label}", flush=True)
    print(f"  标题: {title[:60]}", flush=True)

    if is_published("视频号", video_path):
        print("  [跳过] 已发布", flush=True)
        return PublishResult(
            platform="视频号", video_path=video_path, title=title,
            success=True, status="skipped", message="去重跳过",
        )

    try:
        vinfo = get_video_info(str(real_path))
        thumb_path = extract_thumbnail(str(real_path))

        print("  上传缩略图...", flush=True)
        thumb_url = await dfs_upload_file(
            up_params["authKey"], thumb_path.read_bytes(), up_params,
            up_params["pictureFileType"],
            f"thumb_{uuid.uuid4().hex[:8]}.jpg", "thumb",
        )
        if not thumb_url:
            return PublishResult(
                platform="视频号", video_path=video_path, title=title,
                success=False, status="error", message="缩略图上传失败",
                elapsed_sec=time.time() - t0,
            )

        print(f"  上传视频 ({fsize / 1024 / 1024:.1f}MB)...", flush=True)
        v_start = time.time()
        video_url = await dfs_upload_file(
            up_params["authKey"], real_path.read_bytes(), up_params,
            up_params["videoFileType"],
            f"video_{uuid.uuid4().hex[:8]}.mp4", "video",
        )
        upload_cost = int((time.time() - v_start) * 1000)
        if not video_url:
            return PublishResult(
                platform="视频号", video_path=video_path, title=title,
                success=False, status="error", message="视频上传失败",
                elapsed_sec=time.time() - t0,
            )

        print("  提交转码...", flush=True)
        clip_data = await clip_video(
            cookie_str, finder_id, uin, finger_print, aid,
            video_url, vinfo, fsize, upload_cost,
        )
        if not clip_data:
            return PublishResult(
                platform="视频号", video_path=video_path, title=title,
                success=False, status="error", message="clip_video 失败",
                elapsed_sec=time.time() - t0,
            )

        clip_key = clip_data["clipKey"]
        draft_id = clip_data["draftId"]
        print(f"  转码中... clipKey={clip_key}", flush=True)

        clip_result = await poll_clip_result(
            cookie_str, finder_id, uin, finger_print, aid, clip_key,
        )
        if not clip_result:
            return PublishResult(
                platform="视频号", video_path=video_path, title=title,
                success=False, status="error", message="转码超时",
                elapsed_sec=time.time() - t0,
            )
        print(f"  转码完成 ({time.time() - t0:.0f}s)", flush=True)

        if VideoMeta:
            vmeta = VideoMeta.from_filename(video_path)
            desc_full = vmeta.description("视频号") + "\n" + MINI_PROGRAM_LINK
        else:
            desc_full = title + DESC_SUFFIX + "\n" + MINI_PROGRAM_LINK

        short_title = _make_short_title(title)
        print(f"  发表... (shortTitle={short_title})", flush=True)
        post_resp = await create_post(
            cookie_str, desc_full, short_title, video_url, thumb_url,
            vinfo, fsize, finder_id, uin, finger_print, aid,
            clip_key, draft_id, upload_cost,
            scheduled_ts=scheduled_ts, original=True,
        )
        elapsed = time.time() - t0

        err = post_resp.get("errCode", -1)
        if err == 0:
            msg = f"API 发布成功 ({elapsed:.1f}s)"
            if scheduled_ts > 0:
                msg += f" 定时{sched_label}"
            result = PublishResult(
                platform="视频号", video_path=video_path, title=title,
                success=True, status="published", message=msg,
                elapsed_sec=elapsed,
            )
        else:
            result = PublishResult(
                platform="视频号", video_path=video_path, title=title,
                success=False, status="error",
                message=f"post_create errCode={err} {post_resp.get('errMsg', '')}",
                elapsed_sec=elapsed,
            )

        print(f"  {result.log_line()}", flush=True)
        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        return PublishResult(
            platform="视频号", video_path=video_path, title=title,
            success=False, status="error",
            message=f"异常: {str(e)[:80]}",
            elapsed_sec=time.time() - t0,
        )


# ---------------------------------------------------------------------------
# distribute_all.py 兼容层
# ---------------------------------------------------------------------------

_ctx: dict = {}


async def _ensure_ctx() -> dict:
    """延迟初始化认证上下文（首次调用或 Cookie 失效时）"""
    if _ctx.get("ready"):
        return _ctx

    state = load_state()
    if not state:
        raise RuntimeError("Cookie 文件不存在，请先运行 channels_login.py")

    cookie_str = get_cookie_str(state)
    ls = get_local_storage(state)
    aid = ls.get("__ml::aid", "").strip('"')
    finger_print = ls.get("_finger_print_device_id", "")
    if not aid:
        raise RuntimeError("localStorage 缺少 __ml::aid")

    auth = await auth_check(cookie_str)
    if not auth:
        raise RuntimeError("Cookie 无效，请重新运行 channels_login.py")

    fu = auth.get("finderUser", {})
    finder_id = fu["finderUsername"]

    up_params = await get_upload_params(cookie_str, finder_id)
    if not up_params:
        raise RuntimeError("获取 upload_params 失败")

    _ctx.update({
        "ready": True,
        "cookie_str": cookie_str,
        "finder_id": finder_id,
        "uin": str(up_params["uin"]),
        "finger_print": finger_print,
        "aid": aid,
        "up_params": up_params,
    })
    return _ctx


async def publish_one_compat(
    video_path: str, title: str, idx: int, total: int,
    scheduled_time=None,
) -> PublishResult:
    """distribute_all.py 调用的简化接口"""
    ctx = await _ensure_ctx()
    sched_ts = int(scheduled_time) if scheduled_time else 0
    result = await publish_one(
        ctx["cookie_str"], ctx["finder_id"],
        ctx["uin"], ctx["finger_print"], ctx["aid"],
        ctx["up_params"], video_path, title, idx, total,
        scheduled_ts=sched_ts,
    )
    if result.success:
        new_p = await get_upload_params(ctx["cookie_str"], ctx["finder_id"])
        if new_p:
            ctx["up_params"] = new_p
    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def _run_login_then_retry():
    """Cookie 无效时自动调起登录，写回 storage 后由调用方重试。"""
    login_script = SCRIPT_DIR / "channels_login.py"
    if not login_script.exists():
        return False
    print("[*] Cookie 无效，正在自动调起登录（浏览器将打开，请扫码）...", flush=True)
    subprocess.run([sys.executable, str(login_script)], cwd=str(SCRIPT_DIR), timeout=300)
    # rawKeyBuff 非必需，只要 Cookie 文件已更新即可认为登录成功
    return COOKIE_FILE.exists() and COOKIE_FILE.stat().st_size > 100


def _gen_schedule(count: int) -> list[int]:
    """生成定时发布时间戳列表：第一条立即(0)，后续30-120分钟递增"""
    if count <= 0:
        return []
    result = [0]
    base = int(time.time())
    accumulated = 0
    for _ in range(1, count):
        gap = random.randint(30, 120) * 60
        accumulated += gap
        result.append(base + accumulated)
    return result


async def main():
    print("=== 视频号纯 API 发布 v8 (DFS + clip_video + post_create) ===\n", flush=True)

    state = load_state()
    if not state:
        if _run_login_then_retry():
            state = load_state()
        if not state:
            print("[!] Cookie 文件不存在且登录未完成", flush=True)
            return 1

    cookie_str = get_cookie_str(state)
    ls = get_local_storage(state)

    aid = ls.get("__ml::aid", "").strip('"')
    finger_print = ls.get("_finger_print_device_id", "")
    if not aid:
        if _run_login_then_retry():
            state = load_state()
            cookie_str = get_cookie_str(state)
            ls = get_local_storage(state)
            aid = ls.get("__ml::aid", "").strip('"')
            finger_print = ls.get("_finger_print_device_id", "")
        if not aid:
            print("[!] localStorage 缺少 __ml::aid", flush=True)
            return 1

    auth = await auth_check(cookie_str)
    if not auth:
        if _run_login_then_retry():
            state = load_state()
            cookie_str = get_cookie_str(state)
            ls = get_local_storage(state)
            aid = ls.get("__ml::aid", "").strip('"')
            finger_print = ls.get("_finger_print_device_id", "")
            auth = await auth_check(cookie_str)
        if not auth:
            print("[!] Cookie 仍无效，请稍后重试发布", flush=True)
            return 1

    fu = auth.get("finderUser", {})
    finder_id = fu["finderUsername"]
    print(f"  账号: {fu.get('nickname', '?')} | 粉丝: {fu.get('fansCount', 0)} | 作品: {fu.get('feedsCount', 0)}", flush=True)
    print(f"  aid: {aid[:16]}...", flush=True)

    up_params = await get_upload_params(cookie_str, finder_id)
    if not up_params:
        return 1
    uin = str(up_params["uin"])
    print(f"  uin: {uin}", flush=True)

    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print("[!] 未找到视频", flush=True)
        return 1

    need_pub = [v for v in videos if not is_published("视频号", str(v))]
    print(f"\n共 {len(videos)} 条视频，{len(need_pub)} 条待发布\n", flush=True)
    if not need_pub:
        print("[OK] 全部已发布", flush=True)
        return 0

    schedule = _gen_schedule(len(need_pub))

    results = []
    consecutive_fail = 0

    for i, vp in enumerate(need_pub):
        t = TITLES.get(vp.name, f"{vp.stem} #Soul派对 #创业日记")
        r = await publish_one(
            cookie_str, finder_id, uin, finger_print, aid,
            up_params, str(vp), t, i + 1, len(need_pub),
            scheduled_ts=schedule[i],
        )
        results.append(r)
        if r.status != "skipped":
            save_results([r])

        if r.success:
            consecutive_fail = 0
            if i < len(need_pub) - 1:
                new_p = await get_upload_params(cookie_str, finder_id)
                if new_p:
                    up_params = new_p
        else:
            consecutive_fail += 1
            if consecutive_fail >= 3:
                print("\n[!] 连续 3 次失败，终止", flush=True)
                break

        if i < len(need_pub) - 1 and r.status != "skipped":
            await asyncio.sleep(5)

    actual = [r for r in results if r.status != "skipped"]
    print_summary(actual)
    ok = sum(1 for r in actual if r.success)
    return 0 if ok == len(actual) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
