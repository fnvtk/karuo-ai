#!/usr/bin/env python3
"""
用妙记列表 API（需 Cookie）拉取全部妙记，按标题过滤「派对」「受」「soul」后写入 urls 文件。
Cookie 来源：浏览器打开飞书妙记列表页，F12 -> 网络 -> 找到 list?size= 请求 -> 复制请求头中的 Cookie。
可设环境变量 FEISHU_MINUTES_COOKIE 或把 Cookie 放到脚本同目录 cookie_minutes.txt（仅首行有效）。
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
URLS_FILE = SCRIPT_DIR / "urls_soul_party.txt"
BASE_URL = "https://cunkebao.feishu.cn/minutes/api/space/list"
KEYWORDS = ("派对", "受", "soul")  # 标题含任一即保留


def get_cookie():
    cookie = os.environ.get("FEISHU_MINUTES_COOKIE", "").strip()
    if cookie:
        return cookie
    if COOKIE_FILE.exists():
        raw = COOKIE_FILE.read_text(encoding="utf-8", errors="ignore").strip().splitlines()
        for line in raw:
            line = line.strip()
            if line and not line.startswith("#") and "PASTE_YOUR" not in line:
                return line
    return ""


def get_bv_csrf(cookie: str) -> str:
    if "bv_csrf_token=" in cookie or "minutes_csrf_token=" in cookie:
        for name in ("bv_csrf_token=", "minutes_csrf_token="):
            i = cookie.find(name)
            if i != -1:
                start = i + len(name)
                end = cookie.find(";", start)
                if end == -1:
                    end = len(cookie)
                return cookie[start:end].strip()
    return ""


def fetch_list(cookie: str, size: int = 100, space_name: int = 0, last_timestamp=None) -> list:
    url = f"{BASE_URL}?size={size}&space_name={space_name}"
    if last_timestamp:
        url += f"&timestamp={last_timestamp}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "cookie": cookie,
        "referer": "https://cunkebao.feishu.cn/minutes/",
        "content-type": "application/x-www-form-urlencoded",
    }
    csrf = get_bv_csrf(cookie)
    if csrf:
        headers["bv-csrf-token"] = csrf
    r = requests.get(url, headers=headers, timeout=30)
    data = r.json()
    if data.get("code") != 0 and "data" not in data:
        raise Exception(data.get("msg", "list api error") or r.text[:200])
    inner = data.get("data", {})
    lst = inner.get("list", [])
    if not lst:
        return []
    out = []
    for item in lst:
        topic = (item.get("topic") or "").strip()
        if any(k in topic for k in KEYWORDS):
            token = item.get("object_token") or item.get("minute_token")
            if token:
                out.append(f"https://cunkebao.feishu.cn/minutes/{token}")
    if inner.get("has_more") and lst:
        last = lst[-1]
        ts = last.get("share_time") or last.get("create_time")
        if ts:
            time.sleep(0.3)
            out.extend(fetch_list(cookie, size, space_name, ts))
    return out


def main():
    if not requests:
        print("需要安装 requests: pip install requests")
        return 1
    cookie = get_cookie()
    if not cookie:
        print("未设置 Cookie。请设置 FEISHU_MINUTES_COOKIE 或在脚本同目录创建 cookie_minutes.txt 写入 Cookie。")
        return 1
    print("正在拉取妙记列表并过滤「派对/受/soul」…")
    try:
        all_urls = fetch_list(cookie)
    except Exception as e:
        print("拉取失败:", e)
        return 1
    if not all_urls:
        print("未匹配到包含「派对/受/soul」的妙记。")
        return 0
    seen = set()
    unique = [u for u in all_urls if u not in seen and not seen.add(u)]
    URLS_FILE.write_text("\n".join(unique), encoding="utf-8")
    print(f"已写入 {len(unique)} 条链接到 {URLS_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
