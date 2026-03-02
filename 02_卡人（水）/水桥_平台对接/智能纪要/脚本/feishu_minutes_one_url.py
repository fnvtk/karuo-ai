#!/usr/bin/env python3
"""
单条妙记下载：先试飞书开放平台 API（仅取元数据/标题），再 Cookie 导出正文，最后 Playwright 页面内导出。
说明：开放平台 GET /minutes/v1/minutes/{token} 只返回 title/duration/url 等，不包含转写正文。
用法:
  python3 feishu_minutes_one_url.py "https://cunkebao.feishu.cn/minutes/obcn39v4qf533r7fr55un7qv"
  python3 feishu_minutes_one_url.py --token obcn39v4qf533r7fr55un7qv -o /path/to/out
  # Playwright 弹窗内需登录时加大等待: --playwright-wait 90
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
COOKIE_FILE = SCRIPT_DIR / "cookie_minutes.txt"
OUT_DIR = Path("/Users/karuo/Documents/聊天记录/soul")
EXPORT_URL = "https://cunkebao.feishu.cn/minutes/api/export"
OPEN_API_BASE = "https://open.feishu.cn/open-apis"


def extract_token(url: str) -> str | None:
    m = re.search(r"/minutes/([a-zA-Z0-9]+)", url)
    return m.group(1) if m else None


def get_minute_meta_open_api(object_token: str) -> dict | None:
    """飞书开放平台 获取妙记信息（仅元数据：title/duration/url，无转写正文）。"""
    try:
        import requests
        import os
        app_id = os.environ.get("FEISHU_APP_ID") or "cli_a48818290ef8100d"
        app_secret = os.environ.get("FEISHU_APP_SECRET") or "dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4"
        r = requests.post(
            f"{OPEN_API_BASE}/auth/v3/tenant_access_token/internal",
            json={"app_id": app_id, "app_secret": app_secret},
            timeout=10,
        )
        j = r.json()
        if j.get("code") != 0:
            return None
        token = j.get("tenant_access_token")
        r2 = requests.get(
            f"{OPEN_API_BASE}/minutes/v1/minutes/{object_token}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        d = r2.json()
        if d.get("code") == 0 and d.get("data", {}).get("minute"):
            return d["data"]["minute"]
    except Exception:
        pass
    return None


def export_via_cookie(object_token: str) -> str | None:
    """使用 cookie_minutes.txt 或 feishu_minutes_export_github 逻辑导出。"""
    sys.path.insert(0, str(SCRIPT_DIR))
    try:
        from feishu_minutes_export_github import get_cookie_from_args_or_file, export_transcript
    except ImportError:
        return None
    cookie = get_cookie_from_args_or_file(None)
    if not cookie:
        return None
    return export_transcript(cookie, object_token)


def export_via_playwright_page(object_token: str, title: str = "", wait_sec: int = 30) -> str | None:
    """Playwright 打开妙记页，在页面内 fetch 导出接口（带 credentials），无感拿正文。"""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return None
    import tempfile
    ud = tempfile.mkdtemp(prefix="feishu_one_")
    result = [None]
    try:
        with sync_playwright() as p:
            ctx = p.chromium.launch_persistent_context(ud, headless=False, timeout=15000)
            pg = ctx.pages[0] if ctx.pages else ctx.new_page()
            pg.goto(f"https://cunkebao.feishu.cn/minutes/{object_token}", wait_until="domcontentloaded", timeout=25000)
            print(f"   页面已打开，等待 {wait_sec} 秒（若未登录请先登录）…")
            time.sleep(wait_sec)
            js = f"""
            async () => {{
                const r = await fetch('{EXPORT_URL}', {{
                    method: 'POST',
                    credentials: 'include',
                    headers: {{ 'Content-Type': 'application/x-www-form-urlencoded' }},
                    body: 'object_token={object_token}&add_speaker=true&add_timestamp=false&format=2'
                }});
                return await r.text();
            }}
            """
            print("   正在页面内请求导出接口，请勿关闭窗口…")
            raw = pg.evaluate(js)
            text = (raw or "").strip()
            if not text or "please log in" in text.lower():
                pass
            elif text.startswith("{"):
                try:
                    j = json.loads(text)
                    data = j.get("data")
                    if isinstance(data, str) and len(data) > 100:
                        result[0] = data
                    elif isinstance(data, dict):
                        result[0] = (data.get("content") or data.get("text") or data.get("transcript") or "")
                except Exception:
                    if len(text) > 400:
                        result[0] = text
            elif len(text) > 400:
                result[0] = text
    except Exception as e:
        print(f"   Playwright 失败: {e}", file=sys.stderr)
    finally:
        import shutil
        shutil.rmtree(ud, ignore_errors=True)
    return result[0]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("url_or_token", nargs="?", help="妙记链接或 object_token")
    ap.add_argument("--token", "-t", help="object_token")
    ap.add_argument("-o", "--output-dir", default=str(OUT_DIR), help="输出目录")
    ap.add_argument("--title", help="保存文件名中的标题")
    ap.add_argument("--playwright-wait", type=int, default=30, help="Playwright 打开页后等待秒数")
    ap.add_argument("--cookie-only", "--no-browser", action="store_true", dest="cookie_only", help="仅用 Cookie/命令行，不弹浏览器；失败时提示配置 cookie_minutes.txt")
    args = ap.parse_args()
    token = args.token or (extract_token(args.url_or_token or "") or args.url_or_token)
    if not token or len(token) < 20:
        print("用法: python3 feishu_minutes_one_url.py <妙记URL或object_token>", file=sys.stderr)
        return 1
    out_dir = Path(args.output_dir)
    title = (args.title or "").strip()
    if not title:
        meta = get_minute_meta_open_api(token)
        if meta and meta.get("title"):
            title = meta["title"]
        else:
            title = f"妙记_{token[:12]}"

    print(f"📌 object_token: {token}  title: {title[:50]}…")
    print("   1) 尝试 Cookie 导出（cookie_minutes.txt 或本机浏览器已存 Cookie）…")
    text = export_via_cookie(token)
    if text:
        out_dir.mkdir(parents=True, exist_ok=True)
        safe = re.sub(r'[\\/*?:"<>|]', "_", title)
        path = out_dir / f"{safe}.txt"
        path.write_text(f"标题: {title}\nobject_token: {token}\n\n文字记录:\n\n{text}", encoding="utf-8")
        print(f"   ✅ Cookie 导出成功 -> {path}")
        return 0
    if args.cookie_only:
        print("   ❌ Cookie 导出失败。请将妙记 list 请求的 Cookie 写入脚本同目录 cookie_minutes.txt 第一行后重试。", file=sys.stderr)
        return 1
    print("   2) Cookie 失败，改用 Playwright 页面内导出…")
    text = export_via_playwright_page(token, title=title, wait_sec=args.playwright_wait)
    if text:
        out_dir.mkdir(parents=True, exist_ok=True)
        safe = re.sub(r'[\\/*?:"<>|]', "_", title)
        path = out_dir / f"{safe}.txt"
        path.write_text(f"标题: {title}\nobject_token: {token}\n\n文字记录:\n\n{text}", encoding="utf-8")
        print(f"   ✅ Playwright 导出成功 -> {path}")
        return 0
    print("   ❌ 两种方式均失败", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
