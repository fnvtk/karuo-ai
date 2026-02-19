#!/usr/bin/env python3
"""
飞书妙记单条导出（核心逻辑来自 GitHub bingsanyu/feishu_minutes）

- Cookie 必须从「飞书妙记」列表请求中获取，且包含 bv_csrf_token（36 位）。
- 获取方式：打开 https://meetings.feishu.cn/minutes/home → F12 → 网络 → 找到 list?size=20&space_name= 请求 → 复制请求头中的 Cookie。
- 若使用 cunkebao 等子域，请打开对应空间的妙记主页，从 list 请求复制 Cookie。

用法:
  python3 feishu_minutes_export_github.py --cookie "..." --object-token obcnxrkz6k459k669544228c -o /path/to/soul
  或：cookie 放在脚本同目录 cookie_minutes.txt 第一行
  python3 feishu_minutes_export_github.py --object-token obcnxrkz6k459k669544228c -o /path/to/soul
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from datetime import datetime

try:
    import requests
except ImportError:
    requests = None

SCRIPT_DIR = Path(__file__).resolve().parent
COOKIE_FILE = SCRIPT_DIR / "cookie_minutes.txt"

# 与 bingsanyu/feishu_minutes 一致
EXPORT_URL = "https://meetings.feishu.cn/minutes/api/export"
REFERER = "https://meetings.feishu.cn/minutes/me"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36"


def get_cookie_from_args_or_file(cookie_arg: str | None) -> str:
    if cookie_arg and cookie_arg.strip() and "PASTE_YOUR" not in cookie_arg:
        return cookie_arg.strip()
    if COOKIE_FILE.exists():
        raw = COOKIE_FILE.read_text(encoding="utf-8", errors="ignore").strip().splitlines()
        for line in raw:
            line = line.strip()
            if line and not line.startswith("#") and "PASTE_YOUR" not in line:
                return line
    return ""


def get_bv_csrf_token(cookie: str) -> str:
    """从 cookie 字符串中解析 bv_csrf_token（需 36 字符，与 GitHub 一致）。"""
    key = "bv_csrf_token="
    i = cookie.find(key)
    if i == -1:
        return ""
    start = i + len(key)
    end = cookie.find(";", start)
    if end == -1:
        end = len(cookie)
    return cookie[start:end].strip()


def build_headers(cookie: str):
    """与 feishu_downloader.py 完全一致的请求头。"""
    bv = get_bv_csrf_token(cookie)
    if len(bv) != 36:
        raise ValueError(
            "Cookie 中未包含有效的 bv_csrf_token（需 36 位）。"
            "请从 飞书妙记主页 → F12 → 网络 → list?size=20& 请求 中复制完整 Cookie。"
        )
    return {
        "User-Agent": USER_AGENT,
        "cookie": cookie,
        "bv-csrf-token": bv,
        "referer": REFERER,
        "content-type": "application/x-www-form-urlencoded",
    }


def export_transcript(cookie: str, object_token: str, format_txt: bool = True, add_speaker: bool = True, add_timestamp: bool = False) -> str | None:
    """
    调用妙记导出接口，与 GitHub feishu_downloader.get_minutes_url 一致：
    POST export，params: object_token, add_speaker, add_timestamp, format (2=txt, 3=srt)。
    返回导出的文本，失败返回 None。
    """
    if not requests:
        return None
    # format: 2=txt, 3=srt（与 config.ini 一致）
    params = {
        "object_token": object_token,
        "add_speaker": "true" if add_speaker else "false",
        "add_timestamp": "true" if add_timestamp else "false",
        "format": 2 if format_txt else 3,
    }
    headers = build_headers(cookie)
    try:
        r = requests.post(EXPORT_URL, params=params, headers=headers, timeout=20)
        r.encoding = "utf-8"
        if r.status_code != 200:
            return None
        text = (r.text or "").strip()
        if not text or len(text) < 20:
            return None
        # 可能是 JSON 包装
        if text.startswith("{"):
            try:
                j = r.json()
                data = j.get("data")
                if isinstance(data, str):
                    return data
                if isinstance(data, dict):
                    return data.get("content") or data.get("text") or data.get("transcript")
            except Exception:
                pass
            return None
        if "<html" in text.lower()[:100] or "Something went wrong" in text:
            return None
        return text
    except Exception:
        return None


def extract_token_from_url(url_or_token: str) -> str:
    m = re.search(r"/minutes/([a-zA-Z0-9]+)", url_or_token)
    if m:
        return m.group(1)
    return url_or_token.strip()


def save_txt(output_dir: Path, title: str, body: str, date_str: str | None = None) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    date_str = date_str or datetime.now().strftime("%Y%m%d")
    safe_title = re.sub(r'[\\/*?:"<>|]', "_", (title or "妙记"))
    filename = f"{safe_title}_{date_str}.txt"
    path = output_dir / filename
    header = f"日期: {date_str}\n标题: {title}\n\n文字记录:\n\n" if title else f"日期: {date_str}\n\n文字记录:\n\n"
    path.write_text(header + body, encoding="utf-8")
    return path


def main() -> int:
    if not requests:
        print("请安装 requests: pip install requests", file=sys.stderr)
        return 1

    parser = argparse.ArgumentParser(description="飞书妙记单条导出（GitHub bingsanyu/feishu_minutes 逻辑）")
    parser.add_argument("url_or_token", nargs="?", default="", help="妙记链接或 object_token")
    parser.add_argument("--cookie", "-c", default="", help="完整 Cookie（或从 cookie_minutes.txt 读取）")
    parser.add_argument("--object-token", "-t", default="", help="妙记 object_token")
    parser.add_argument("--output", "-o", default="/Users/karuo/Documents/聊天记录/soul", help="输出目录")
    parser.add_argument("--title", default="", help="可选标题（否则用默认文件名）")
    parser.add_argument("--no-speaker", action="store_true", help="字幕不包含说话人")
    parser.add_argument("--timestamp", action="store_true", help="字幕包含时间戳")
    args = parser.parse_args()

    cookie = get_cookie_from_args_or_file(args.cookie)
    if not cookie:
        print("未配置 Cookie。请：", file=sys.stderr)
        print("  1. 打开 https://meetings.feishu.cn/minutes/home（或你空间的妙记主页）", file=sys.stderr)
        print("  2. F12 → 网络 → 找到 list?size=20&space_name= 请求 → 复制请求头中的 Cookie", file=sys.stderr)
        print("  3. 粘贴到脚本同目录 cookie_minutes.txt 第一行，或使用 --cookie \"...\"", file=sys.stderr)
        return 1

    object_token = args.object_token or extract_token_from_url(args.url_or_token)
    if not object_token:
        object_token = "obcnxrkz6k459k669544228c"  # 104 场默认

    try:
        build_headers(cookie)
    except ValueError as e:
        print(str(e), file=sys.stderr)
        return 1

    print(f"📝 object_token: {object_token}")
    print("📡 使用 meetings.feishu.cn 导出接口（GitHub 同款）…")
    text = export_transcript(cookie, object_token, format_txt=True, add_speaker=not args.no_speaker, add_timestamp=args.timestamp)
    if not text:
        print("❌ 导出失败。请确认：", file=sys.stderr)
        print("  1. Cookie 来自「妙记列表 list 请求」且包含 bv_csrf_token（36 位）", file=sys.stderr)
        print("  2. 该妙记在当前登录空间内可访问", file=sys.stderr)
        return 1

    out_dir = Path(args.output).resolve()
    title = args.title or f"妙记_{object_token}"
    path = save_txt(out_dir, title, text)
    print(f"✅ 已保存: {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
