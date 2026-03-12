#!/usr/bin/env python3
"""
视频号纯 API 发布 v5 — 零 Playwright，全 httpx
协议: helper_upload_params → applyuploaddfs → uploadpartdfs → completepartuploaddfs → post_create

关键发现 (2026-03-10):
- BlockPartLength 必须是累计偏移量 [8MB, fileSize]，不是各分块大小
- post_create 需要 finger-print-device-id 和 x-wechat-uin 自定义 headers
- videoClipTaskId/urlCdnTaskId 需复用浏览器会话生成的值
- post_create URL 需带 /micro/content/ 前缀和 _aid/_rid/_pageUrl 查询参数
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
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 120场 20260320_output/成片_大师版")

sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
from publish_result import PublishResult, is_published, save_results, print_summary

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
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
    if "wxapp.tc.qq.com" in url:
        return url.replace("http://wxapp.tc.qq.com", "https://finder.video.qq.com")
    return url


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


async def create_post(
    cookie_str: str,
    desc: str,
    video_url: str,
    thumb_url: str,
    video_info: dict,
    file_size: int,
    finder_id: str,
    wechat_uin: str,
    finger_print: str,
    aid: str,
    task_id: str,
    upload_cost: int,
) -> dict:
    payload = {
        "objectType": 0,
        "longitude": 0, "latitude": 0, "feedLongitude": 0, "feedLatitude": 0,
        "originalFlag": 0,
        "topics": [],
        "isFullPost": 1,
        "handleFlag": 2,
        "videoClipTaskId": task_id,
        "traceInfo": {
            "traceKey": f"FPT_{int(time.time())}_{random.randint(10**8, 10**10 - 1)}",
            "uploadCdnStart": int(time.time()) - max(1, upload_cost // 1000),
            "uploadCdnEnd": int(time.time()),
        },
        "objectDesc": {
            "mpTitle": "",
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
                "videoPlayLen": video_info["duration"],
                "width": video_info["width"],
                "height": video_info["height"],
                "md5sum": str(uuid.uuid4()),
                "coverUrl": thumb_url,
                "fullCoverUrl": thumb_url,
                "urlCdnTaskId": task_id,
            }],
            "member": {},
        },
        "report": {
            "clipKey": task_id,
            "draftId": task_id,
            "height": video_info["height"],
            "width": video_info["width"],
            "duration": video_info["duration"],
            "fileSize": file_size,
            "uploadCost": upload_cost,
        },
        "postFlag": 0,
        "mode": 1,
        "clientid": str(uuid.uuid4()),
        "timestamp": str(int(time.time() * 1000)),
        "_log_finder_uin": "",
        "_log_finder_id": finder_id,
        "rawKeyBuff": None,
        "pluginSessionId": None,
        "scene": 7,
        "reqScene": 7,
    }

    headers = {
        "Cookie": cookie_str,
        "User-Agent": UA,
        "Content-Type": "application/json",
        "Referer": "https://channels.weixin.qq.com/micro/content/post/create",
        "Origin": "https://channels.weixin.qq.com",
        "Accept-Language": "zh-CN",
        "finger-print-device-id": finger_print,
        "x-wechat-uin": wechat_uin,
    }

    rid = f"{uuid.uuid4().hex[:8]}-{uuid.uuid4().hex[:8]}"
    url = (
        f"https://channels.weixin.qq.com/micro/content/cgi-bin/"
        f"mmfinderassistant-bin/post/post_create"
        f"?_aid={aid}&_rid={rid}"
        f"&_pageUrl=https%3A%2F%2Fchannels.weixin.qq.com%2Fmicro%2Fcontent%2Fpost%2Fcreate"
    )

    r = httpx.post(url, json=payload, headers=headers, timeout=30)
    return r.json()


# ---------------------------------------------------------------------------
# Publish one video
# ---------------------------------------------------------------------------

async def publish_one(
    cookie_str: str,
    finder_id: str,
    wechat_uin: str,
    finger_print: str,
    aid: str,
    task_id: str,
    up_params: dict,
    video_path: str,
    title: str,
    idx: int,
    total: int,
) -> PublishResult:
    fname = Path(video_path).name
    fsize = Path(video_path).stat().st_size
    t0 = time.time()

    print(f"\n[{idx}/{total}] {fname} ({fsize / 1024 / 1024:.1f}MB)", flush=True)
    print(f"  标题: {title[:60]}", flush=True)

    if is_published("视频号", video_path):
        print("  [跳过] 已发布", flush=True)
        return PublishResult(
            platform="视频号", video_path=video_path, title=title,
            success=True, status="skipped", message="去重跳过",
        )

    try:
        vinfo = get_video_info(video_path)
        thumb_path = extract_thumbnail(video_path)

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
            up_params["authKey"], Path(video_path).read_bytes(), up_params,
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

        if VideoMeta:
            vmeta = VideoMeta.from_filename(video_path)
            desc_full = vmeta.description("视频号") + "\n" + MINI_PROGRAM_LINK
        else:
            desc_full = title + DESC_SUFFIX + "\n" + MINI_PROGRAM_LINK
        print(f"  发表...", flush=True)
        post_resp = await create_post(
            cookie_str, desc_full, video_url, thumb_url, vinfo, fsize,
            finder_id, wechat_uin, finger_print, aid, task_id, upload_cost,
        )
        elapsed = time.time() - t0

        err = post_resp.get("errCode", -1)
        if err == 0:
            result = PublishResult(
                platform="视频号", video_path=video_path, title=title,
                success=True, status="published",
                message=f"纯 API 发布成功 ({elapsed:.1f}s)",
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
    finger_print = ls.get("_finger_print_device_id", "")
    aid = ls.get("__ml::aid", "").strip('"')
    if not finger_print or not aid:
        raise RuntimeError("localStorage 缺少 finger_print_device_id 或 __ml::aid")

    auth = await auth_check(cookie_str)
    if not auth:
        raise RuntimeError("Cookie 无效，请重新运行 channels_login.py")

    fu = auth.get("finderUser", {})
    finder_id = fu["finderUsername"]

    up_params = await get_upload_params(cookie_str, finder_id)
    if not up_params:
        raise RuntimeError("获取 upload_params 失败")

    task_id_file = SCRIPT_DIR / "channels_task_id.txt"
    task_id = task_id_file.read_text().strip() if task_id_file.exists() else str(random.randint(10**19, 2**63))
    if not task_id_file.exists():
        task_id_file.write_text(task_id)

    _ctx.update({
        "ready": True,
        "cookie_str": cookie_str,
        "finder_id": finder_id,
        "wechat_uin": str(up_params["uin"]),
        "finger_print": finger_print,
        "aid": aid,
        "task_id": task_id,
        "up_params": up_params,
    })
    return _ctx


async def publish_one_compat(
    video_path: str, title: str, idx: int, total: int,
    scheduled_time=None,
) -> PublishResult:
    """distribute_all.py 调用的简化接口"""
    ctx = await _ensure_ctx()
    result = await publish_one(
        ctx["cookie_str"], ctx["finder_id"], ctx["wechat_uin"],
        ctx["finger_print"], ctx["aid"], ctx["task_id"],
        ctx["up_params"], video_path, title, idx, total,
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
    r = subprocess.run([sys.executable, str(login_script)], cwd=str(SCRIPT_DIR), timeout=300)
    return r.returncode == 0


async def main():
    print("=== 视频号纯 API 发布 (v5 — DFS + post_create) ===\n", flush=True)

    state = load_state()
    if not state:
        if _run_login_then_retry():
            state = load_state()
        if not state:
            print("[!] Cookie 文件不存在且登录未完成", flush=True)
            return 1

    cookie_str = get_cookie_str(state)
    ls = get_local_storage(state)

    finger_print = ls.get("_finger_print_device_id", "")
    aid = ls.get("__ml::aid", "").strip('"')
    if not finger_print or not aid:
        if _run_login_then_retry():
            state = load_state()
            cookie_str = get_cookie_str(state)
            ls = get_local_storage(state)
            finger_print = ls.get("_finger_print_device_id", "")
            aid = ls.get("__ml::aid", "").strip('"')
        if not finger_print or not aid:
            print("[!] localStorage 缺少 finger_print_device_id 或 __ml::aid", flush=True)
            return 1

    auth = await auth_check(cookie_str)
    if not auth:
        if _run_login_then_retry():
            state = load_state()
            cookie_str = get_cookie_str(state)
            ls = get_local_storage(state)
            finger_print = ls.get("_finger_print_device_id", "")
            aid = ls.get("__ml::aid", "").strip('"')
            auth = await auth_check(cookie_str)
        if not auth:
            print("[!] Cookie 仍无效，请稍后重试发布", flush=True)
            return 1

    fu = auth.get("finderUser", {})
    finder_id = fu["finderUsername"]
    print(f"  账号: {fu.get('nickname', '?')} | 粉丝: {fu.get('fansCount', 0)} | 作品: {fu.get('feedsCount', 0)}", flush=True)
    print(f"  finger_print: {finger_print[:16]}...", flush=True)
    print(f"  aid: {aid[:16]}...", flush=True)

    up_params = await get_upload_params(cookie_str, finder_id)
    if not up_params:
        return 1
    wechat_uin = str(up_params["uin"])
    print(f"  wechat_uin: {wechat_uin}", flush=True)

    task_id_file = SCRIPT_DIR / "channels_task_id.txt"
    if task_id_file.exists():
        task_id = task_id_file.read_text().strip()
    else:
        task_id = str(random.randint(10**19, 2**63))
        task_id_file.write_text(task_id)
        print(f"  [!] 生成新 videoClipTaskId: {task_id}", flush=True)
        print(f"      如果发布失败，请用 Playwright 访问一次发布页获取有效 ID", flush=True)
    print(f"  taskId: {task_id}\n", flush=True)

    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print("[!] 未找到视频", flush=True)
        return 1

    need_pub = [v for v in videos if not is_published("视频号", str(v))]
    print(f"共 {len(videos)} 条视频，{len(need_pub)} 条待发布\n", flush=True)
    if not need_pub:
        print("[OK] 全部已发布", flush=True)
        return 0

    results = []
    consecutive_fail = 0

    for i, vp in enumerate(need_pub):
        t = TITLES.get(vp.name, f"{vp.stem} #Soul派对 #创业日记")
        r = await publish_one(
            cookie_str, finder_id, wechat_uin, finger_print, aid, task_id,
            up_params, str(vp), t, i + 1, len(need_pub),
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
            await asyncio.sleep(8)

    actual = [r for r in results if r.status != "skipped"]
    print_summary(actual)
    ok = sum(1 for r in actual if r.success)
    return 0 if ok == len(actual) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
