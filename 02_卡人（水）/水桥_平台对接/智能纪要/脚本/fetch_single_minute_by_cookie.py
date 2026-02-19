#!/usr/bin/env python3
"""
用 Cookie 从 cunkebao 拉取单条妙记详情/文字并保存为 TXT（不依赖开放平台妙记权限）。
需在脚本同目录 cookie_minutes.txt 中粘贴浏览器 Cookie（飞书妙记页 F12→网络→list 请求头）。
用法：
  python3 fetch_single_minute_by_cookie.py "https://cunkebao.feishu.cn/minutes/obcnxrkz6k459k669544228c" --output "/Users/karuo/Documents/聊天记录/soul"
"""
import json
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
MINUTE_TOKEN = "obcnxrkz6k459k669544228c"
BASE = "https://cunkebao.feishu.cn/minutes/api"


def _cookie_from_browser() -> str:
    """从本机默认/常用浏览器读取飞书 Cookie（cunkebao 或 .feishu.cn，多浏览器谁有就用谁）。"""
    try:
        import browser_cookie3
        # 先试子域，再试父域（.feishu.cn 可能带 session）
        for domain in ("cunkebao.feishu.cn", "feishu.cn", ".feishu.cn"):
            loaders = [
                browser_cookie3.safari,
                browser_cookie3.chrome,
                browser_cookie3.chromium,
                browser_cookie3.firefox,
                browser_cookie3.edge,
            ]
            for loader in loaders:
                try:
                    cj = loader(domain_name=domain)
                    parts = [f"{c.name}={c.value}" for c in cj]
                    s = "; ".join(parts)
                    if len(s) > 100:
                        return s
                except Exception:
                    continue
    except ImportError:
        pass
    return ""


def get_cookie():
    cookie = os.environ.get("FEISHU_MINUTES_COOKIE", "").strip()
    if cookie and "PASTE_YOUR" not in cookie:
        return cookie
    if COOKIE_FILE.exists():
        raw = COOKIE_FILE.read_text(encoding="utf-8", errors="ignore").strip().splitlines()
        for line in raw:
            line = line.strip()
            if line and not line.startswith("#") and "PASTE_YOUR" not in line:
                return line
    cookie = _cookie_from_browser()
    if cookie:
        return cookie
    return ""


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


def make_headers(cookie: str, use_github_referer: bool = True):
    """与 GitHub bingsanyu/feishu_minutes 一致：meetings 域用 referer minutes/me + bv-csrf-token。"""
    # GitHub 使用：referer https://meetings.feishu.cn/minutes/me
    referer = "https://meetings.feishu.cn/minutes/me" if use_github_referer else "https://cunkebao.feishu.cn/minutes/"
    h = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
        "cookie": cookie,
        "referer": referer,
        "content-type": "application/x-www-form-urlencoded",
    }
    csrf = get_csrf(cookie)
    if csrf:
        h["bv-csrf-token"] = csrf
    return h


def try_export_text(cookie: str, minute_token: str) -> tuple[str | None, str | None]:
    """
    调用妙记导出接口（与 GitHub bingsanyu/feishu_minutes 一致）：
    POST meetings.feishu.cn/minutes/api/export，params: object_token, format=2, add_speaker, add_timestamp。
    先试 meetings.feishu.cn（推荐），再试 cunkebao.feishu.cn。
    返回 (标题或 None, 正文文本)。
    """
    payload = {
        "object_token": minute_token,
        "format": 2,
        "add_speaker": "true",
        "add_timestamp": "false",
    }
    # 1) 优先 GitHub 同款：meetings.feishu.cn + referer minutes/me
    for domain, use_github in (
        ("https://meetings.feishu.cn/minutes/api/export", True),
        ("https://cunkebao.feishu.cn/minutes/api/export", False),
    ):
        try:
            headers = make_headers(cookie, use_github_referer=use_github)
            r = requests.post(domain, params=payload, headers=headers, timeout=20)
            r.encoding = "utf-8"
            if r.status_code != 200:
                continue
            text = (r.text or "").strip()
            if text.startswith("{") and ("transcript" in text or "content" in text or "text" in text):
                try:
                    j = r.json()
                    text = (j.get("data") or j).get("content") or (j.get("data") or j).get("text") or j.get("transcript") or text
                    if isinstance(text, str) and len(text) > 50:
                        return (None, text)
                except Exception:
                    pass
            if text and len(text) > 50 and "PASTE_YOUR" not in text and "<html" not in text.lower()[:200] and "Something went wrong" not in text:
                return (None, text)
        except Exception:
            continue
    return (None, None)


def try_get_minute_detail(cookie: str, minute_token: str) -> dict | None:
    """尝试多种 cunkebao 可能的详情接口（获取标题等）"""
    headers = make_headers(cookie)
    urls_to_try = [
        f"{BASE}/minute/detail?object_token={minute_token}",
        f"{BASE}/space/minute_detail?object_token={minute_token}",
        f"{BASE}/space/list?size=1&space_name=0",
    ]
    for url in urls_to_try:
        try:
            r = requests.get(url, headers=headers, timeout=15)
            if r.status_code != 200:
                continue
            data = r.json() if r.text.strip().startswith("{") else {}
            if data.get("code") == 0 and data.get("data"):
                inner = data.get("data")
                if isinstance(inner, list) and inner:
                    for item in inner:
                        if (item.get("object_token") or item.get("minute_token")) == minute_token:
                            return item
                return inner
            if isinstance(data, dict) and ("topic" in data or "minute" in data):
                return data.get("minute") or data
        except Exception:
            continue
    return None


def save_txt(output_dir: Path, title: str, body: str, date_str: str = None) -> Path:
    date_str = date_str or datetime.now().strftime("%Y%m%d")
    safe_title = re.sub(r'[\\/*?:"<>|]', "_", (title or "妙记"))
    filename = f"{safe_title}_{date_str}.txt"
    path = output_dir / filename
    header = f"日期: {date_str}\n标题: {title}\n\n文字记录:\n\n" if title else f"日期: {date_str}\n\n文字记录:\n\n"
    path.write_text(header + body, encoding="utf-8")
    return path


def main():
    if not requests:
        print("需要安装 requests: pip install requests")
        return 1
    cookie = get_cookie()
    if not cookie or "PASTE_YOUR" in cookie:
        print("未配置有效 Cookie。请：")
        print("  1. 打开 https://meetings.feishu.cn/minutes/home（或 cunkebao.feishu.cn/minutes/home）并登录")
        print("  2. F12 → 网络 → 找到 list?size=20&space_name= 请求 → 复制请求头中的 Cookie（需含 bv_csrf_token）")
        print("  3. 粘贴到脚本同目录 cookie_minutes.txt 第一行")
        print("或使用 GitHub 同款脚本: python3 feishu_minutes_export_github.py <链接> -o <输出目录>")
        return 1

    url_or_token = (sys.argv[1] if len(sys.argv) > 1 else None) or f"https://cunkebao.feishu.cn/minutes/{MINUTE_TOKEN}"
    match = re.search(r"/minutes/([a-zA-Z0-9]+)", url_or_token)
    minute_token = match.group(1) if match else MINUTE_TOKEN

    output_dir = Path(os.environ.get("FEISHU_MINUTES_OUTPUT", "/Users/karuo/Documents/聊天记录/soul"))
    for i, arg in enumerate(sys.argv):
        if arg in ("-o", "--output") and i + 1 < len(sys.argv):
            output_dir = Path(sys.argv[i + 1]).resolve()
            break
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"📝 妙记 token: {minute_token}")
    print("📡 使用 Cookie 请求妙记导出接口（export）…")
    title_from_export, body = try_export_text(cookie, minute_token)
    if body:
        # 优先用列表接口拿标题和日期
        data = try_get_minute_detail(cookie, minute_token)
        title = (data.get("topic") or data.get("title") or title_from_export or "妙记").strip()
        create_time = data.get("create_time") or data.get("share_time")
        if create_time:
            try:
                ts = int(create_time)
                if ts > 1e10:
                    ts = ts // 1000
                date_str = datetime.fromtimestamp(ts).strftime("%Y%m%d")
            except Exception:
                date_str = datetime.now().strftime("%Y%m%d")
        else:
            date_str = datetime.now().strftime("%Y%m%d")
        path = save_txt(output_dir, title, body, date_str)
        print(f"✅ 已保存: {path}")
        return 0
    print("❌ 导出接口未返回文字（Cookie 可能失效或非该妙记所属空间）。请：")
    print("  1. 打开 https://cunkebao.feishu.cn/minutes/home 并搜索该场妙记，确认能打开")
    print("  2. F12 → 网络 → 找到 list 或 export 请求 → 复制请求头 Cookie 到 cookie_minutes.txt")
    print("  或到妙记页「…」→ 导出文字记录，将文件保存到输出目录。")
    return 1


if __name__ == "__main__":
    sys.exit(main())
