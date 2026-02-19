#!/usr/bin/env python3
"""通过 CDP 连接已开启远程调试的浏览器，访问 list 页取 Cookie 后导出 104 场并保存。"""
import sys
from pathlib import Path

OUT_FILE = Path("/Users/karuo/Documents/聊天记录/soul/soul 派对 104场 20260219.txt")
URL_LIST = "https://cunkebao.feishu.cn/minutes/home"
OBJECT_TOKEN = "obcnyg5nj2l8q281v32de6qz"
EXPORT_URL = "https://cunkebao.feishu.cn/minutes/api/export"
CDP_URL = "http://localhost:9222"


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("NO_PLAYWRIGHT", file=sys.stderr)
        return 2
    import requests

    with sync_playwright() as p:
        try:
            browser = p.chromium.connect_over_cdp(CDP_URL, timeout=8000)
        except Exception as e:
            print("CDP_CONNECT_FAIL", str(e), file=sys.stderr)
            return 3
        default_context = browser.contexts[0] if browser.contexts else None
        if not default_context:
            print("NO_CONTEXT", file=sys.stderr)
            browser.close()
            return 4
        # 优先用已打开的 104 页，否则新开 list 页
        pages = default_context.pages
        page = None
        for p in pages:
            if "obcnyg5nj2l8q281v32de6qz" in (p.url or ""):
                page = p
                break
        if not page and pages:
            page = pages[0]
        if not page:
            page = default_context.new_page()
        # 若当前不是 list 页则打开 list 以拿到 bv_csrf_token
        if "space/list" not in (page.url or "") and "minutes/home" not in (page.url or ""):
            page.goto(URL_LIST, wait_until="domcontentloaded", timeout=20000)
            page.wait_for_timeout(4000)
        cookies = default_context.cookies()
        browser.close()

    cookie_str = "; ".join([f"{c['name']}={c['value']}" for c in cookies])
    bv = next((c["value"] for c in cookies if c.get("name") == "bv_csrf_token" and len(c.get("value", "")) == 36), None)
    if len(cookie_str) < 100:
        print("NO_COOKIE", file=sys.stderr)
        return 5
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cookie": cookie_str,
        "Referer": "https://cunkebao.feishu.cn/minutes/",
    }
    if bv:
        headers["bv-csrf-token"] = bv
    r = requests.post(
        EXPORT_URL,
        params={"object_token": OBJECT_TOKEN, "format": 2, "add_speaker": "true", "add_timestamp": "false"},
        headers=headers,
        timeout=20,
    )
    r.encoding = "utf-8"
    if r.status_code != 200:
        print("EXPORT_HTTP", r.status_code, len(r.text), file=sys.stderr)
        return 6
    text = (r.text or "").strip()
    if not text or len(text) < 100 or "Something went wrong" in text:
        print("EXPORT_BODY", text[:300], file=sys.stderr)
        return 7
    if text.startswith("{"):
        try:
            j = r.json()
            text = j.get("data") or j.get("content") or ""
            if isinstance(text, dict):
                text = text.get("content") or text.get("text") or ""
        except Exception:
            pass
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text("日期: 20260219\n标题: soul 派对 104场 20260219\n\n文字记录:\n\n" + text, encoding="utf-8")
    print("OK", str(OUT_FILE))
    return 0


if __name__ == "__main__":
    sys.exit(main())
