#!/usr/bin/env python3
"""
视频号纯 API 发布 — 无浏览器
流程: 读 Cookie → 上传视频(分片) → 发布 → 验证
"""
import asyncio
import hashlib
import json
import math
import sys
import time
from pathlib import Path

import httpx

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "channels_storage_state.json"
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片")

sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
from publish_result import PublishResult, is_published, save_results, print_summary

BASE = "https://channels.weixin.qq.com"
UPLOAD_BASE = "https://finder-assistant.mp.video.tencent-cloud.com"
CHUNK_SIZE = 8 * 1024 * 1024  # 8MB

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)

TITLES = {
    "早起不是为了开派对，是不吵老婆睡觉.mp4":
        "每天6点起床不是因为自律，是因为老婆还在睡 #Soul派对 #创业日记",
    "懒人的活法 动作简单有利可图正反馈.mp4":
        "懒人也能赚钱？动作简单、有利可图、正反馈 #Soul派对 #副业思维",
    "初期团队先找两个IS，比钱好使 ENFJ链接人，ENTJ指挥.mp4":
        "创业初期先找两个IS型人格，比融资好使十倍 #MBTI创业 #团队搭建",
    "ICU出来一年多 活着要在互联网上留下东西.mp4":
        "ICU出来一年多，活着就要在互联网上留下东西 #人生感悟 #创业觉醒",
    "MBTI疗愈SOUL 年轻人测MBTI，40到60岁走五行八卦.mp4":
        "20岁测MBTI，40岁该学五行八卦了 #MBTI #认知觉醒",
    "Soul业务模型 派对+切片+小程序全链路.mp4":
        "派对获客→AI切片→小程序变现，全链路拆解 #商业模式 #一人公司",
    "Soul切片30秒到8分钟 AI半小时能剪10到30个.mp4":
        "AI剪辑半小时出10到30条切片，内容工厂效率密码 #AI剪辑 #内容效率",
    "刷牙听业务逻辑 Soul切片变现怎么跑.mp4":
        "刷牙3分钟听完一套变现逻辑 #碎片创业 #副业逻辑",
    "国学易经怎么学 两小时七七八八，召唤作者对话.mp4":
        "易经两小时学个七七八八，关键是跟古人对话 #国学 #易经入门",
    "广点通能投Soul了，1000曝光6到10块.mp4":
        "广点通能投Soul了！1000次曝光只要6到10块 #广点通 #低成本获客",
    "建立信任不是求来的 卖外挂发邮件三个月拿下德国总代.mp4":
        "信任不是求来的，发三个月邮件拿下德国总代理 #销售思维 #信任建立",
    "核心就两个字 筛选。能开派对坚持7天的人再谈.mp4":
        "核心就两个字：筛选。能坚持7天的人才值得深聊 #筛选思维 #创业认知",
    "睡眠不好？每天放下一件事，做减法.mp4":
        "睡不好不是太累，是脑子装太多，每天做减法 #做减法 #心理健康",
    "这套体系花了170万，但前端几十块就能参与.mp4":
        "后端花170万搭体系，前端几十块就能参与 #商业认知 #体系思维",
    "金融AI获客体系 后端30人沉淀12年，前端丢手机.mp4":
        "后端30人沉淀12年，前端就丢个手机号 #AI获客 #系统思维",
}


def load_cookies() -> dict:
    if not COOKIE_FILE.exists():
        return {}
    state = json.loads(COOKIE_FILE.read_text())
    return {c["name"]: c["value"] for c in state.get("cookies", [])}


def _build_client(cookies: dict) -> httpx.Client:
    return httpx.Client(
        cookies=cookies,
        headers={
            "User-Agent": UA,
            "Origin": BASE,
            "Referer": f"{BASE}/platform/post/create",
        },
        follow_redirects=True,
        timeout=120,
    )


def _api_post(client: httpx.Client, path: str, payload: dict | None = None) -> dict:
    url = f"{BASE}/cgi-bin/mmfinderassistant-bin/{path}"
    r = client.post(url, json=payload or {})
    return r.json()


def _file_md5(path: str) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def check_auth(client: httpx.Client) -> dict | None:
    """验证 Cookie 有效性，返回用户信息"""
    d = _api_post(client, "auth/auth_data")
    if d.get("errCode") == 0:
        return d.get("data", {}).get("finderUser", {})
    return None


def upload_video(client: httpx.Client, video_path: str) -> dict | None:
    """上传视频到腾讯云，返回 media 信息"""
    fpath = Path(video_path)
    fsize = fpath.stat().st_size
    fname = fpath.name
    fmd5 = _file_md5(video_path)
    n_parts = math.ceil(fsize / CHUNK_SIZE)

    print(f"  [上传] {fname} ({fsize / 1024 / 1024:.1f}MB, {n_parts} 分片)", flush=True)

    # Step 1: Apply for upload
    apply_payload = {
        "mediaName": fname,
        "mediaSize": fsize,
        "mediaMd5": fmd5,
        "mediaType": "video/mp4",
        "chunkSize": CHUNK_SIZE,
    }
    r = client.post(f"{UPLOAD_BASE}/applyuploaddfs", json=apply_payload)
    try:
        d = r.json()
    except Exception:
        print(f"  [上传] applyuploaddfs 失败: status={r.status_code} body={r.text[:200]}", flush=True)
        return None

    if "data" not in d:
        print(f"  [上传] applyuploaddfs 无 data: {json.dumps(d, ensure_ascii=False)[:200]}", flush=True)
        return None

    upload_id = d["data"].get("uploadId") or d["data"].get("UploadId")
    if not upload_id:
        print(f"  [上传] 未获取到 uploadId: {json.dumps(d['data'], ensure_ascii=False)[:200]}", flush=True)
        return None

    print(f"  [上传] uploadId = {upload_id[:30]}...", flush=True)

    # Step 2: Upload parts
    parts = []
    with open(video_path, "rb") as f:
        for i in range(n_parts):
            chunk = f.read(CHUNK_SIZE)
            part_num = i + 1
            print(f"  [上传] 分片 {part_num}/{n_parts} ({len(chunk) / 1024:.0f}KB)...", flush=True)

            r2 = client.post(
                f"{UPLOAD_BASE}/uploadpartdfs",
                data={"uploadId": upload_id, "partNumber": str(part_num)},
                files={"file": (fname, chunk, "application/octet-stream")},
                timeout=120,
            )
            try:
                d2 = r2.json()
                etag = d2.get("data", {}).get("ETag") or d2.get("data", {}).get("etag")
                if etag:
                    parts.append({"PartNumber": part_num, "ETag": etag})
                    print(f"  [上传] 分片 {part_num} 完成 (ETag={etag[:20]}...)", flush=True)
                else:
                    print(f"  [上传] 分片 {part_num} 无 ETag: {json.dumps(d2, ensure_ascii=False)[:150]}", flush=True)
            except Exception:
                print(f"  [上传] 分片 {part_num} 失败: status={r2.status_code}", flush=True)

    if len(parts) != n_parts:
        print(f"  [上传] 分片不完整: {len(parts)}/{n_parts}", flush=True)
        return None

    # Step 3: Complete upload
    complete_payload = {
        "uploadId": upload_id,
        "partInfo": parts,
    }
    r3 = client.post(f"{UPLOAD_BASE}/completepartuploaddfs", json=complete_payload)
    try:
        d3 = r3.json()
        media_url = d3.get("data", {}).get("httpsUrl") or d3.get("data", {}).get("DownloadURL")
        if media_url:
            print(f"  [上传] 完成! URL = {media_url[:60]}...", flush=True)
            return {
                "url": media_url,
                "uploadId": upload_id,
                "md5": fmd5,
                "size": fsize,
                "parts": parts,
                "completeResp": d3.get("data", {}),
            }
        else:
            print(f"  [上传] complete 无 URL: {json.dumps(d3, ensure_ascii=False)[:200]}", flush=True)
    except Exception:
        print(f"  [上传] complete 失败: status={r3.status_code}", flush=True)

    return None


def publish_video(client: httpx.Client, media_info: dict, description: str) -> dict:
    """调用发布 API"""
    payload = {
        "description": description,
        "mediaInfo": media_info,
    }
    return _api_post(client, "helper/helper_video_publish", payload)


def verify_published(client: httpx.Client, title_keyword: str) -> bool:
    """通过 post_list API 检查视频是否发布"""
    d = _api_post(client, "post/post_list", {"currentPage": 1, "pageSize": 20})
    if d.get("errCode") != 0:
        return False
    posts = d.get("data", {}).get("list", [])
    kw = title_keyword[:15]
    for p in posts:
        desc = p.get("desc", p.get("description", ""))
        if kw in desc:
            return True
    return False


def publish_one(
    video_path: str,
    title: str,
    idx: int = 1,
    total: int = 1,
    skip_dedup: bool = False,
) -> PublishResult:
    fname = Path(video_path).name
    fsize = Path(video_path).stat().st_size
    t0 = time.time()
    print(f"\n[{idx}/{total}] {fname} ({fsize / 1024 / 1024:.1f}MB)", flush=True)
    print(f"  标题: {title[:60]}", flush=True)

    if not skip_dedup and is_published("视频号", video_path):
        print("  [跳过] 已发布", flush=True)
        return PublishResult(
            platform="视频号", video_path=video_path, title=title,
            success=True, status="skipped", message="去重跳过",
        )

    cookies = load_cookies()
    if not cookies:
        r = PublishResult(
            platform="视频号", video_path=video_path, title=title,
            success=False, status="error", message="Cookie 不存在，请先运行 channels_api_login.py",
        )
        print(f"  {r.log_line()}", flush=True)
        return r

    client = _build_client(cookies)

    # 验证登录
    user = check_auth(client)
    if not user:
        r = PublishResult(
            platform="视频号", video_path=video_path, title=title,
            success=False, status="error", message="Cookie 已过期",
            elapsed_sec=time.time() - t0,
        )
        print(f"  {r.log_line()}", flush=True)
        return r

    # 上传
    media = upload_video(client, video_path)
    if not media:
        r = PublishResult(
            platform="视频号", video_path=video_path, title=title,
            success=False, status="error", message="视频上传失败",
            elapsed_sec=time.time() - t0,
        )
        print(f"  {r.log_line()}", flush=True)
        return r

    # 发布
    print("  [发布] 调用 helper_video_publish...", flush=True)
    pub_result = publish_video(client, media, title)
    pub_code = pub_result.get("errCode", -1)
    print(f"  [发布] errCode={pub_code}", flush=True)

    elapsed = time.time() - t0

    if pub_code == 0:
        r = PublishResult(
            platform="视频号", video_path=video_path, title=title,
            success=True, status="reviewing",
            message=f"API 发布成功 (errCode=0)",
            elapsed_sec=elapsed,
        )
    else:
        r = PublishResult(
            platform="视频号", video_path=video_path, title=title,
            success=False, status="error",
            message=f"发布失败: {json.dumps(pub_result, ensure_ascii=False)[:120]}",
            elapsed_sec=elapsed,
        )

    print(f"  {r.log_line()}", flush=True)
    return r


def main():
    cookies = load_cookies()
    if not cookies:
        print("[✗] Cookie 不存在，请先运行: python3 channels_api_login.py", flush=True)
        return 1

    client = _build_client(cookies)
    user = check_auth(client)
    if not user:
        print("[✗] Cookie 已过期，请重新运行: python3 channels_api_login.py", flush=True)
        return 1

    print(f"[✓] 已登录: {user.get('nickname', '?')} (作品数: {user.get('feedsCount', '?')})", flush=True)

    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print("[✗] 未找到视频", flush=True)
        return 1
    print(f"共 {len(videos)} 条视频\n", flush=True)

    results = []
    for i, vp in enumerate(videos):
        t = TITLES.get(vp.name, f"{vp.stem} #Soul派对 #创业日记")
        r = publish_one(str(vp), t, i + 1, len(videos))
        results.append(r)
        if r.status != "skipped":
            save_results([r])
        if i < len(videos) - 1:
            time.sleep(5)

    actual = [r for r in results if r.status != "skipped"]
    print_summary(actual)
    ok = sum(1 for r in actual if r.success)
    return 0 if ok == len(actual) else 1


if __name__ == "__main__":
    sys.exit(main())
