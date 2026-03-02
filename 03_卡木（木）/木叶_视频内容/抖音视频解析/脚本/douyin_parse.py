#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
抖音视频解析：链接 → 解析ID → 提取文案 → 下载视频
输入：抖音短链 (v.douyin.com) 或完整链接 (www.douyin.com/video/xxx)
输出：aweme_id, video_id, file_id, 文案(标题/正文/话题), 视频文件
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

import requests

# 默认输出目录：卡若Ai的文件夹/视频
DEFAULT_OUTPUT = Path.home() / "Documents" / "卡若Ai的文件夹" / "视频"
DEFAULT_OUTPUT.mkdir(parents=True, exist_ok=True)

# 移动端 UA，减少被拦截
MOBILE_UA = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1"
)


def parse_url_to_aweme_id(url: str) -> str | None:
    """从抖音链接提取 aweme_id"""
    url = url.strip()
    # 完整链接可直接提取
    m = re.search(r"/video/(\d+)", url)
    if m:
        return m.group(1)
    return None


def fetch_and_parse(url: str) -> tuple[dict, str | None]:
    """
    请求视频页面，解析 ID、文案、视频 URL。
    支持短链 v.douyin.com 或完整链接。
    返回 (info_dict, video_url)
    """
    url = url.strip()
    # 短链需先 resolve 到完整链接
    if "v.douyin.com" in url:
        try:
            r = requests.get(url, allow_redirects=True, timeout=15, headers={"User-Agent": MOBILE_UA})
            url = r.url
            html = r.text
        except Exception as e:
            return {"error": str(e), "aweme_id": None}, None
    else:
        session = requests.Session()
        session.headers.update({"User-Agent": MOBILE_UA})
        try:
            session.get("https://www.douyin.com/", timeout=10)
            r = session.get(url, headers={"Referer": "https://www.douyin.com/"}, timeout=15)
            r.raise_for_status()
            html = r.text
        except Exception as e:
            return {"error": str(e), "aweme_id": None}, None

    aweme_id = parse_url_to_aweme_id(url)
    info = {
        "aweme_id": aweme_id or "unknown",
        "video_id": None,
        "file_id": None,
        "title": "",
        "desc": "",
        "hashtags": [],
        "author": "",
    }
    video_url = None

    # 1. 解析 __vid, video_id, file_id
    for pattern, key in [
        (r'["\']?__vid["\']?\s*[:=]\s*["\']?(\d+)["\']?', "aweme_id"),
        (r'video_id["\']?\s*[:=]\s*["\']?([a-zA-Z0-9_]+)["\']?', "video_id"),
        (r'file_id["\']?\s*[:=]\s*["\']?([a-f0-9]{32})["\']?', "file_id"),
    ]:
        m = re.search(pattern, html)
        if m:
            info[key] = m.group(1)

    # 2. 从 ROUTER_DATA 提取视频 URL（优先，避免拿到封面图）
    router = re.search(r"window\._ROUTER_DATA\s*=\s*(\{.*?\});?\s*</script>", html, re.DOTALL)
    if router:
        try:
            data = json.loads(router.group(1).strip())
            # 深度查找 play_addr / url_list
            def find_play_addr(obj):
                if isinstance(obj, dict):
                    if "play_addr" in obj and "url_list" in obj.get("play_addr", {}):
                        return obj["play_addr"]["url_list"][0]
                    for v in obj.values():
                        u = find_play_addr(v)
                        if u:
                            return u
                elif isinstance(obj, list):
                    for item in obj:
                        u = find_play_addr(item)
                        if u:
                            return u
                return None

            u = find_play_addr(data)
            if u:
                video_url = u.replace("playwm", "play")  # 无水印；优先 play_addr

            # 文案
            def find_desc(obj, key="desc"):
                if isinstance(obj, dict):
                    if key in obj and obj[key]:
                        return str(obj[key])
                    for v in obj.values():
                        r = find_desc(v, key)
                        if r:
                            return r
                elif isinstance(obj, list):
                    for item in obj:
                        r = find_desc(item, key)
                        if r:
                            return r
                return ""

            info["desc"] = find_desc(data) or info["desc"]
        except json.JSONDecodeError:
            pass

    # 3. 备选：从 <source src="..."> 提取 douyinvod CDN 链接
    if not video_url:
        for m in re.finditer(r'<source[^>]+src=["\']([^"\']+douyinvod[^"\']*)["\']', html, re.I):
            u = m.group(1).replace("&amp;", "&")
            if "tos-cn-v" in u or "video" in u:  # 视频 CDN 路径特征
                video_url = u
                break
        if not video_url:
            m = re.search(r'<source[^>]+src=["\']([^"\']+douyinvod[^"\']*)["\']', html, re.I)
            if m:
                video_url = m.group(1).replace("&amp;", "&")

    # 4. 从 <title> 提取标题（含文案）
    title_match = re.search(r"<title>([^<]+)</title>", html)
    if title_match:
        raw = title_match.group(1).strip()
        if " - 抖音" in raw:
            raw = raw.replace(" - 抖音", "")
        parts = raw.split(None, 1)
        info["title"] = parts[0] if parts else raw
        if len(parts) > 1 and not info["desc"]:
            info["desc"] = parts[1]

    # 5. 话题标签
    tag_matches = re.findall(r"#([^#\s]+)", info.get("desc", "") + " " + info.get("title", ""))
    info["hashtags"] = list(dict.fromkeys(tag_matches))  # 去重保序

    # 6. 若 title 为空，用 desc 首行
    if not info["title"] and info["desc"]:
        info["title"] = info["desc"].split("\n")[0].strip()[:80]

    # 无水印处理
    if video_url and "playwm" in video_url:
        video_url = video_url.replace("playwm", "play")

    return info, video_url


def download_video(url: str, out_path: Path) -> tuple[bool, str]:
    """
    下载视频到本地。需要 Referer 等头，否则 CDN 返回 403 或封面图。
    返回 (成功?, 错误信息)
    """
    headers = {
        "User-Agent": MOBILE_UA,
        "Referer": "https://www.douyin.com/",
        "Accept": "*/*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Origin": "https://www.douyin.com",
    }
    try:
        r = requests.get(url, headers=headers, stream=True, timeout=120)
        r.raise_for_status()
        # 检查 Content-Type，避免下载到图片
        ct = r.headers.get("Content-Type", "").lower()
        if "image" in ct or "jpeg" in ct or "png" in ct:
            return False, f"URL 返回的是图片而非视频 (Content-Type: {ct})"
        with open(out_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=65536):
                if chunk:
                    f.write(chunk)
        # 校验：至少 100KB，且非 JPEG 魔数
        size = out_path.stat().st_size
        if size < 100_000:
            out_path.unlink(missing_ok=True)
            return False, f"下载文件过小 ({size} bytes)，疑似非视频"
        with open(out_path, "rb") as f:
            magic = f.read(12)
        if magic[:2] == b"\xff\xd8":
            out_path.unlink(missing_ok=True)
            return False, "下载到的是 JPEG 图片而非视频"
        return True, ""
    except requests.RequestException as e:
        return False, str(e)


def main():
    parser = argparse.ArgumentParser(description="抖音视频解析：链接 → ID + 文案 + 下载")
    parser.add_argument("url", help="抖音视频链接（短链或完整）")
    parser.add_argument("-o", "--output", type=Path, default=DEFAULT_OUTPUT, help="输出目录")
    parser.add_argument("--no-download", action="store_true", help="仅解析，不下载视频")
    args = parser.parse_args()

    url = args.url.strip()
    if not url:
        print("请提供抖音视频链接", file=sys.stderr)
        sys.exit(1)

    # 1. 请求并解析页面
    info, video_url = fetch_and_parse(url)
    aweme_id = info.get("aweme_id")
    if not aweme_id or aweme_id == "unknown":
        print("无法解析视频，请检查链接格式或网络", file=sys.stderr)
        sys.exit(1)
    if info.get("error"):
        print(f"解析失败: {info['error']}", file=sys.stderr)
        sys.exit(1)

    # 3. 输出文案 JSON 与 纯文本 .txt（便于命令行一键提取）
    args.output.mkdir(parents=True, exist_ok=True)
    caption_path = args.output / f"{aweme_id}_文案.json"
    with open(caption_path, "w", encoding="utf-8") as f:
        json.dump(info, f, ensure_ascii=False, indent=2)
    print(f"✅ 文案已保存: {caption_path}")

    txt_path = args.output / f"{aweme_id}_文案.txt"
    txt_lines = [
        (info.get("title") or "").strip(),
        "",
        (info.get("desc") or "").strip(),
        "",
        "话题: " + " ".join(f"#{t}" for t in (info.get("hashtags") or [])),
        "",
        f"aweme_id: {aweme_id}",
        f"链接: https://www.douyin.com/video/{aweme_id}",
    ]
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(txt_lines))
    print(f"✅ 文案文本: {txt_path}")

    # 4. 下载视频
    if not args.no_download:
        safe_title = re.sub(r'[^\w\s\u4e00-\u9fff]+', '_', (info.get("title") or aweme_id))[:50].strip("_")
        out_file = args.output / f"{aweme_id}_{safe_title or 'video'}.mp4"
        ok = False
        if video_url:
            ok, err = download_video(video_url, out_file)
            if not ok:
                print(f"⚠️ 直链下载失败: {err}", file=sys.stderr)
        else:
            print("⚠️ 未解析到视频 URL", file=sys.stderr)
        # yt-dlp 兜底（需 cookie 时可能仍失败）
        if not ok:
            print("尝试 yt-dlp 兜底下载...", file=sys.stderr)
            try:
                subprocess.run(
                    [
                        "yt-dlp",
                        "-f", "best",
                        "-o", str(out_file),
                        "--no-warnings",
                        f"https://www.douyin.com/video/{aweme_id}",
                    ],
                    check=True,
                    capture_output=True,
                    timeout=180,
                )
                if out_file.exists() and out_file.stat().st_size > 100_000:
                    ok = True
            except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired) as e:
                print(f"yt-dlp 失败: {e}", file=sys.stderr)
        if ok:
            print(f"✅ 视频已下载: {out_file} ({out_file.stat().st_size / 1024 / 1024:.1f} MB)")
    elif args.no_download:
        print("已跳过下载 (--no-download)")
    else:
        print("⚠️ 未解析到视频 URL，可尝试 MCP 浏览器访问页面", file=sys.stderr)

    # 5. 打印摘要
    print("\n--- 解析结果 ---")
    print(json.dumps(info, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
