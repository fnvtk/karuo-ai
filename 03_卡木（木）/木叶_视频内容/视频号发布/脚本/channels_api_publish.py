#!/usr/bin/env python3
"""
视频号纯 API 发布 v3 — 零 Playwright，全 httpx
协议: helper_upload_params → snsuploadbig 分片上传 → post_create

需要 channels_login.py 先获取一次 Cookie（只在过期时用）
"""
import asyncio
import hashlib
import json
import math
import random
import sys
import time
import uuid
from pathlib import Path

import httpx

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "channels_storage_state.json"
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 120场 20260320_output/成片")

sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
from publish_result import PublishResult, is_published, save_results, print_summary

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

DESC_SUFFIX = " #小程序 卡若创业派对"
CHUNK_SIZE = 1 * 1024 * 1024  # 1MB per chunk
CDN_HOST = "finder.video.qq.com"
CDN_REPLACE_HOST = f"https://{CDN_HOST}"

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


def load_cookies() -> str | None:
    if not COOKIE_FILE.exists():
        print("[✗] Cookie 文件不存在，请先运行 channels_login.py", flush=True)
        return None
    with open(COOKIE_FILE) as f:
        state = json.load(f)
    cookies = {c["name"]: c["value"] for c in state.get("cookies", [])}
    if "sessionid" not in cookies:
        print("[✗] Cookie 中无 sessionid", flush=True)
        return None
    return "; ".join(f"{k}={v}" for k, v in cookies.items())


def base_headers(cookie_str: str) -> dict:
    return {
        "Cookie": cookie_str,
        "User-Agent": UA,
        "Content-Type": "application/json",
        "Referer": "https://channels.weixin.qq.com/platform/post/create",
        "Origin": "https://channels.weixin.qq.com",
    }


async def auth_check(client: httpx.AsyncClient) -> dict | None:
    r = await client.post(
        "https://channels.weixin.qq.com/cgi-bin/mmfinderassistant-bin/auth/auth_data",
        json={},
    )
    data = r.json()
    if data.get("errCode") == 0:
        return data.get("data", {})
    return None


async def get_upload_params(client: httpx.AsyncClient) -> dict | None:
    r = await client.post(
        "https://channels.weixin.qq.com/cgi-bin/mmfinderassistant-bin/helper/helper_upload_params",
        json={"scene": 7, "force_login": False},
    )
    data = r.json()
    if data.get("errCode") == 0:
        return data.get("data", {})
    print(f"  [✗] upload_params: {data}", flush=True)
    return None


async def cdn_upload_video(cookie_str: str, up: dict, video_path: str) -> dict | None:
    """分片上传视频到 CDN，返回 {fileurl, thumburl, ...}"""
    fpath = Path(video_path)
    fsize = fpath.stat().st_size
    fname = fpath.name
    file_uuid = str(uuid.uuid4()).replace("-", "")

    cdn_url = f"https://{CDN_HOST}/snsuploadbig"
    total_chunks = math.ceil(fsize / CHUNK_SIZE)

    print(f"  [CDN] 上传 {fsize/1024/1024:.1f}MB，{total_chunks} 个分片", flush=True)

    with open(fpath, "rb") as f:
        video_data = f.read()

    last_response = None
    async with httpx.AsyncClient(timeout=60) as cdn_client:
        for chunk_idx in range(total_chunks):
            start = chunk_idx * CHUNK_SIZE
            end = min(start + CHUNK_SIZE, fsize)
            chunk = video_data[start:end]
            chunk_md5 = hashlib.md5(chunk).hexdigest()

            form_data = {
                "ver": "1",
                "seq": str(random.random() + time.time()),
                "weixinnum": str(up["uin"]),
                "apptype": str(up["appType"]),
                "filetype": str(up["videoFileType"]),
                "authkey": up["authKey"],
                "hasthumb": "0",
                "filekey": fname,
                "totalsize": str(fsize),
                "fileuuid": file_uuid,
                "rangestart": str(start),
                "rangeend": str(end),
                "blockmd5": chunk_md5,
                "forcetranscode": "0",
            }

            files = {"filedata": (fname, chunk, "application/octet-stream")}

            retry = 0
            while retry < 3:
                try:
                    r = await cdn_client.post(
                        cdn_url,
                        data=form_data,
                        files=files,
                        headers={
                            "User-Agent": UA,
                            "Cookie": cookie_str,
                        },
                    )
                    resp = r.json()
                    last_response = resp

                    if resp.get("retcode") and resp["retcode"] != 0:
                        print(f"  [CDN] 分片 {chunk_idx+1} 失败: retcode={resp['retcode']}", flush=True)
                        retry += 1
                        await asyncio.sleep(2)
                        continue

                    if chunk_idx % 5 == 0 or chunk_idx == total_chunks - 1:
                        finish = "✓" if resp.get("uploadfinish") else f"{chunk_idx+1}/{total_chunks}"
                        print(f"  [CDN] {finish}", flush=True)

                    if resp.get("uploadfinish"):
                        fileurl = resp.get("fileurl", "")
                        if "wxapp.tc.qq.com" in fileurl:
                            fileurl = fileurl.replace("http://wxapp.tc.qq.com", CDN_REPLACE_HOST)
                        resp["httpsUrl"] = fileurl
                        return resp

                    break
                except Exception as e:
                    retry += 1
                    print(f"  [CDN] 分片 {chunk_idx+1} 异常: {e}", flush=True)
                    if retry >= 3:
                        return None
                    await asyncio.sleep(2)

    return last_response


async def create_post(client: httpx.AsyncClient, desc: str, cdn_resp: dict, video_path: str) -> dict:
    """调用 post_create 发表"""
    fileurl = cdn_resp.get("httpsUrl") or cdn_resp.get("fileurl", "")
    thumburl = cdn_resp.get("thumburl", "")

    fpath = Path(video_path)

    media_item = {
        "mediaType": 4,
        "url": fileurl,
        "thumbUrl": thumburl if thumburl else "",
        "fileSize": str(fpath.stat().st_size),
    }

    payload = {
        "objectDesc": {
            "description": desc,
            "mediaList": [media_item],
        },
        "postType": 9,
        "scene": 7,
    }

    r = await client.post(
        "https://channels.weixin.qq.com/cgi-bin/mmfinderassistant-bin/post/post_create",
        json=payload,
    )
    return r.json()


async def publish_one(
    client: httpx.AsyncClient,
    cookie_str: str,
    up_params: dict,
    video_path: str,
    title: str,
    idx: int,
    total: int,
) -> PublishResult:
    fname = Path(video_path).name
    fsize = Path(video_path).stat().st_size
    t0 = time.time()

    print(f"\n[{idx}/{total}] {fname} ({fsize/1024/1024:.1f}MB)", flush=True)
    print(f"  标题: {title[:60]}", flush=True)

    if is_published("视频号", video_path):
        print("  [跳过] 已发布", flush=True)
        return PublishResult(
            platform="视频号", video_path=video_path, title=title,
            success=True, status="skipped", message="去重跳过",
        )

    # Step 1: CDN 上传
    cdn_resp = await cdn_upload_video(cookie_str, up_params, video_path)
    if not cdn_resp or not cdn_resp.get("uploadfinish"):
        return PublishResult(
            platform="视频号", video_path=video_path, title=title,
            success=False, status="error",
            message=f"CDN 上传失败: {json.dumps(cdn_resp or {}, ensure_ascii=False)[:100]}",
            elapsed_sec=time.time() - t0,
        )

    fileurl = cdn_resp.get("httpsUrl") or cdn_resp.get("fileurl", "")
    print(f"  [✓] CDN 上传完成: {fileurl[:80]}...", flush=True)

    # Step 2: 发表
    desc_full = title + DESC_SUFFIX
    post_resp = await create_post(client, desc_full, cdn_resp, video_path)
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
        msg = post_resp.get("errMsg", "")
        result = PublishResult(
            platform="视频号", video_path=video_path, title=title,
            success=False, status="error",
            message=f"post_create 失败: errCode={err} {msg} | resp={json.dumps(post_resp, ensure_ascii=False)[:150]}",
            elapsed_sec=elapsed,
        )

    print(f"  {result.log_line()}", flush=True)
    return result


async def main():
    print("=== 视频号纯 API 发布 ===\n", flush=True)

    cookie_str = load_cookies()
    if not cookie_str:
        return 1

    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print("[✗] 未找到视频", flush=True)
        return 1

    need_pub = [v for v in videos if not is_published("视频号", str(v))]
    print(f"共 {len(videos)} 条视频，{len(need_pub)} 条待发布\n", flush=True)
    if not need_pub:
        print("[✓] 全部已发布", flush=True)
        return 0

    headers = base_headers(cookie_str)

    async with httpx.AsyncClient(headers=headers, timeout=30) as client:
        # 1. 验证身份
        auth = await auth_check(client)
        if not auth:
            print("[✗] Cookie 无效，请重新运行 channels_login.py", flush=True)
            return 1
        fu = auth.get("finderUser", {})
        print(f"  账号: {fu.get('nickname', '?')} | 粉丝: {fu.get('fansCount', 0)} | 作品: {fu.get('feedsCount', 0)}", flush=True)

        # 2. 获取上传参数
        up_params = await get_upload_params(client)
        if not up_params:
            return 1
        print(f"  上传参数: authKey={up_params['authKey'][:20]}... uin={up_params['uin']} appType={up_params['appType']}\n", flush=True)

        # 3. 逐条发布
        results = []
        consecutive_fail = 0

        for i, vp in enumerate(videos):
            t = TITLES.get(vp.name, f"{vp.stem} #Soul派对 #创业日记")
            r = await publish_one(client, cookie_str, up_params, str(vp), t, i + 1, len(videos))
            results.append(r)
            if r.status != "skipped":
                save_results([r])

            if r.status == "skipped":
                consecutive_fail = 0
            elif r.success:
                consecutive_fail = 0
            else:
                consecutive_fail += 1
                if consecutive_fail >= 2:
                    print("\n[!] 连续 2 次失败，终止", flush=True)
                    break

            if i < len(videos) - 1 and r.status != "skipped":
                await asyncio.sleep(8)

    actual = [r for r in results if r.status != "skipped"]
    print_summary(actual)
    ok = sum(1 for r in actual if r.success)
    return 0 if ok == len(actual) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
