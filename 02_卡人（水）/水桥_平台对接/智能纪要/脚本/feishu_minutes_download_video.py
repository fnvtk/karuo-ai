#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
飞书妙记 · 命令行全自动下载视频（不打开浏览器）

通过 status API 获取视频下载链接，用 requests 直接下载。
依赖：cookie_minutes.txt（同 fetch_single_minute_by_cookie）。
逻辑参考：bingsanyu/feishu_minutes feishu_downloader.py

用法：
  python3 feishu_minutes_download_video.py "https://cunkebao.feishu.cn/minutes/obcnzs51k1j754643vx138sx" -o ~/Downloads/
  python3 feishu_minutes_download_video.py obcnzs51k1j754643vx138sx --output /path/to/dir
  # status 接口未带 topic 时，可强制与妙记列表标题一致：
  python3 feishu_minutes_download_video.py <URL> --title "soul 派对 98场 20260212"
"""

import os
import re
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

SCRIPT_DIR = Path(__file__).resolve().parent
COOKIE_FILE = SCRIPT_DIR / "cookie_minutes.txt"

# status API（meetings 与 cunkebao 均需尝试）
STATUS_URLS = [
    "https://meetings.feishu.cn/minutes/api/status",
    "https://cunkebao.feishu.cn/minutes/api/status",
]
REFERERS = [
    "https://meetings.feishu.cn/minutes/me",
    "https://cunkebao.feishu.cn/minutes/",
]
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


def _cookie_from_browser() -> str:
    """从本机浏览器读取飞书 Cookie：browser_cookie3 → Cursor 浏览器 SQLite"""
    for domain in ("cunkebao.feishu.cn", "feishu.cn", ".feishu.cn"):
        try:
            import browser_cookie3
            for loader in (browser_cookie3.safari, browser_cookie3.chrome, browser_cookie3.edge, browser_cookie3.firefox):
                try:
                    cj = loader(domain_name=domain)
                    s = "; ".join([f"{c.name}={c.value}" for c in cj])
                    if len(s) > 100:
                        return s
                except Exception:
                    continue
        except ImportError:
            break
    return _cookie_from_cursor_browser()


def _cookie_from_cursor_browser() -> str:
    """从 Cursor 内置浏览器 SQLite 数据库提取飞书 Cookie（明文，无需解密）"""
    try:
        import sqlite3, shutil, tempfile
        cookie_path = Path.home() / "Library/Application Support/Cursor/Partitions/cursor-browser/Cookies"
        if not cookie_path.exists():
            return ""
        tmp = tempfile.mktemp(suffix=".db")
        shutil.copy2(cookie_path, tmp)
        conn = sqlite3.connect(tmp)
        cur = conn.cursor()
        cur.execute("SELECT name, value FROM cookies WHERE (host_key LIKE '%feishu%' OR host_key LIKE '%cunkebao%') AND value != ''")
        rows = cur.fetchall()
        conn.close()
        Path(tmp).unlink(missing_ok=True)
        if rows:
            s = "; ".join([f"{name}={value}" for name, value in rows])
            if len(s) > 100:
                return s
    except Exception:
        pass
    return ""


def get_cookie() -> str:
    """环境变量 → cookie_minutes.txt → 本机浏览器"""
    cookie = os.environ.get("FEISHU_MINUTES_COOKIE", "").strip()
    if cookie and len(cookie) > 100 and "PASTE_YOUR" not in cookie:
        return cookie
    if COOKIE_FILE.exists():
        raw = COOKIE_FILE.read_text(encoding="utf-8", errors="ignore").strip().splitlines()
        for line in raw:
            line = line.strip()
            if line and not line.startswith("#") and "PASTE_YOUR" not in line:
                return line
    return _cookie_from_browser()


def get_csrf(cookie: str) -> str:
    for name in ("bv_csrf_token=", "minutes_csrf_token="):
        i = cookie.find(name)
        if i != -1:
            start = i + len(name)
            end = cookie.find(";", start)
            if end == -1:
                end = len(cookie)
            return cookie[start:end].strip()
    return ""


def make_headers(cookie: str, referer: str) -> dict:
    h = {
        "User-Agent": USER_AGENT,
        "Cookie": cookie,
        "Referer": referer,
    }
    csrf = get_csrf(cookie)
    if csrf:
        h["bv-csrf-token"] = csrf
    return h


def _to_simplified(text: str) -> str:
    """转为简体中文"""
    try:
        from opencc import OpenCC
        return OpenCC("t2s").convert(text)
    except ImportError:
        trad_simp = {
            "這": "这", "個": "个", "們": "们", "來": "来", "說": "说",
            "會": "会", "裡": "里", "麼": "么", "還": "还", "點": "点",
        }
        for t, s in trad_simp.items():
            text = text.replace(t, s)
        return text


def get_video_url(cookie: str, object_token: str) -> tuple[str | None, str | None]:
    """
    获取视频下载链接与标题。
    返回 (video_download_url, title) 或 (None, None)
    """
    for url_base, referer in zip(STATUS_URLS, REFERERS):
        try:
            url = f"{url_base}?object_token={object_token}&language=zh_cn&_t={int(time.time() * 1000)}"
            headers = make_headers(cookie, referer)
            r = requests.get(url, headers=headers, timeout=20)
            if r.status_code != 200:
                continue
            data = r.json()
            if data.get("code") != 0:
                continue
            inner = data.get("data") or {}
            video_info = inner.get("video_info") or {}
            video_url = video_info.get("video_download_url")
            if not video_url or not isinstance(video_url, str):
                continue
            title = (inner.get("topic") or inner.get("title") or object_token)
            if isinstance(title, str):
                title = _to_simplified(title)
            return (video_url.strip(), title)
        except Exception:
            continue
    return (None, None)


def download_video(video_url: str, output_path: Path, headers: dict) -> bool:
    """流式下载视频到 output_path"""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(video_url, headers=headers, stream=True, timeout=60) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        with open(output_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)
    return output_path.exists() and output_path.stat().st_size > 1000


def main() -> int:
    if not requests:
        print("❌ 需要安装 requests: pip install requests", file=sys.stderr)
        return 1

    cookie = get_cookie()
    if not cookie or "PASTE_YOUR" in cookie:
        print("❌ 未配置有效 Cookie。请：", file=sys.stderr)
        print("  1. 打开 https://cunkebao.feishu.cn/minutes/home 并登录", file=sys.stderr)
        print("  2. F12 → 网络 → 找到 list?size=20& 请求 → 复制请求头 Cookie", file=sys.stderr)
        print("  3. 粘贴到", str(COOKIE_FILE), "第一行", file=sys.stderr)
        return 1

    url_or_token = None
    output_dir = Path("/Users/karuo/Movies/soul视频/原视频")
    title_override = ""
    i = 1
    while i < len(sys.argv):
        if sys.argv[i] in ("-o", "--output") and i + 1 < len(sys.argv):
            output_dir = Path(sys.argv[i + 1]).resolve()
            i += 2
            continue
        if sys.argv[i] in ("--title", "-T") and i + 1 < len(sys.argv):
            title_override = sys.argv[i + 1].strip()
            i += 2
            continue
        if not sys.argv[i].startswith("-"):
            url_or_token = sys.argv[i]
        i += 1

    if not url_or_token:
        print("用法: python3 feishu_minutes_download_video.py <妙记URL或object_token> [-o 输出目录] [--title 妙记标题]", file=sys.stderr)
        return 1

    match = re.search(r"/minutes/([a-zA-Z0-9]+)", str(url_or_token))
    object_token = match.group(1) if match else url_or_token

    print(f"📥 获取视频链接 object_token={object_token}")
    video_url, api_title = get_video_url(cookie, object_token)
    if not video_url:
        print("❌ 无法获取视频下载链接（Cookie 可能失效或该妙记无视频）", file=sys.stderr)
        return 1

    title = title_override or api_title or object_token
    safe_title = re.sub(r'[\\/*?:"<>|]', "_", title)[:80]
    output_path = output_dir / f"{safe_title}.mp4"

    headers = make_headers(cookie, REFERERS[1])
    headers["User-Agent"] = USER_AGENT
    print(f"📹 下载中: {output_path.name}")
    if download_video(video_url, output_path, headers):
        size_mb = output_path.stat().st_size / (1024 * 1024)
        print(f"✅ 已保存: {output_path} ({size_mb:.1f} MB)")
        print(str(output_path))  # 供调用方解析
        return 0
    print("❌ 下载失败", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
