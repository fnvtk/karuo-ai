#!/usr/bin/env python3
"""用 Doubao profile 副本启动浏览器，访问 list 页取 Cookie（含 bv_csrf_token），再请求导出 104 场并保存。"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

PROFILE_SRC = Path.home() / "Library/Application Support/Doubao/Profile 2"
PROFILE_COPY = Path("/tmp/feishu_doubao_profile_playwright")
OUT_FILE = Path("/Users/karuo/Documents/聊天记录/soul/soul 派对 104场 20260219.txt")
URL_LIST = "https://cunkebao.feishu.cn/minutes/home"
OBJECT_TOKEN = "obcnyg5nj2l8q281v32de6qz"
EXPORT_URL = "https://cunkebao.feishu.cn/minutes/api/export"


def main():
    # 1) 复制 profile（排除易锁/大目录）
    if PROFILE_COPY.exists():
        shutil.rmtree(PROFILE_COPY, ignore_errors=True)
    PROFILE_COPY.mkdir(parents=True, exist_ok=True)
    exclude = {"Cache", "Code Cache", "GPUCache", "Session Storage", "Service Worker", "blob_storage", "LOCK"}
    for f in PROFILE_SRC.iterdir():
        if f.name in exclude or not f.exists():
            continue
        try:
            dst = PROFILE_COPY / f.name
            if f.is_dir():
                shutil.copytree(f, dst, ignore=shutil.ignore_patterns("Cache", "Code Cache"), dirs_exist_ok=True)
            else:
                shutil.copy2(f, dst)
        except Exception:
            pass
    (PROFILE_COPY / "LOCK").unlink(missing_ok=True)

    # 2) Playwright 用该 profile 打开 list 页并取 Cookie
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("NO_PLAYWRIGHT", file=sys.stderr)
        return 2
    import requests

    with sync_playwright() as p:
        try:
            context = p.chromium.launch_persistent_context(
                user_data_dir=str(PROFILE_COPY),
                headless=True,
                channel="chromium",
                timeout=30000,
                args=["--no-sandbox", "--disable-setuid-sandbox"],
            )
        except Exception as e:
            print("LAUNCH_FAIL", str(e), file=sys.stderr)
            return 3
        page = context.pages[0] if context.pages else context.new_page()
        # 等待 list 接口返回后再取 Cookie（服务端会在 list 请求时设置 bv_csrf_token）
        with page.expect_response(lambda r: "space/list" in r.url or "list" in r.url and r.request.method == "GET") as resp_info:
            page.goto(URL_LIST, wait_until="networkidle", timeout=30000)
        try:
            resp_info.value
        except Exception:
            pass
        page.wait_for_timeout(3000)
        cookies = context.cookies()
        context.close()

    cookie_str = "; ".join([f"{c['name']}={c['value']}" for c in cookies])
    bv = next((c["value"] for c in cookies if c.get("name") == "bv_csrf_token" and len(c.get("value", "")) == 36), None)
    if not cookie_str or len(cookie_str) < 100:
        print("NO_COOKIE", file=sys.stderr)
        return 4

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
        return 5
    text = (r.text or "").strip()
    if not text or len(text) < 100 or "Something went wrong" in text or (text.startswith("{") and "error" in text.lower()):
        print("EXPORT_BODY", text[:200], file=sys.stderr)
        return 6
    if text.startswith("{"):
        try:
            j = r.json()
            text = (j.get("data") or j.get("content") or "")
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
