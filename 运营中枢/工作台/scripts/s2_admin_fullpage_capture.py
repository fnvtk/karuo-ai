#!/usr/bin/env python3
"""
S2 私域管理后台：按路由批量全页截图（Playwright）

用法（需已登录态，任选其一）：
  1) 先在本机 Chrome 登录后台，再用「用户数据目录」启动浏览器：
     python3 s2_admin_fullpage_capture.py --user-data-dir "$HOME/Library/Application Support/Google/Chrome" --channel chromium --headless
     （无 Google Chrome.app 时用 channel chromium；有则用 --channel chrome。建议先关 Chrome 避免配置锁。）

  2) 或使用已导出的 storage_state.json：
     playwright install chromium
     python3 s2_admin_fullpage_capture.py --storage-state /path/to/state.json

默认输出：卡若Ai 报告目录下 screenshots/fullpage_playwright/
"""
from __future__ import annotations

import argparse
import asyncio
import re
from pathlib import Path

import httpx

BASE = "https://s2.siyuguanli.com/admin/static/js/app.6dd8bb884b28919ef0f9.js"
ADMIN = "https://s2.siyuguanli.com/admin/#"

DEST_DEFAULT = Path(
    "/Users/karuo/Documents/卡若Ai的文件夹/报告/S2私域管理后台_功能与接口调研/screenshots/fullpage_playwright"
)


def parse_routes_from_app_js(text: str) -> list[str]:
    paths = re.findall(r'path:"([^"]+)"', text)
    stack: list[str] = []
    out: list[str] = []
    for p in paths:
        if p in ("*", "/401", "/404", "/login", "/authredirect", "/"):
            continue
        if p.startswith("/"):
            stack = [p.rstrip("/")]
            continue
        if not stack:
            stack = [""]
        segs = [s for s in stack if s]
        full = "/" + "/".join(segs + [p])
        full = re.sub(r"/+", "/", full)
        out.append(full)
    seen: set[str] = set()
    uniq: list[str] = []
    for x in out:
        if x not in seen:
            seen.add(x)
            uniq.append(x)
    uniq = ["/home" if x == "/home/home" else x for x in uniq]
    if "/home" not in uniq:
        uniq.insert(0, "/home")
    # 线上大屏常见 hash 为 #/datav/overview，与 bundle 内 /dataReport/datav/overview 并存
    if "/datav/overview" not in uniq:
        uniq.append("/datav/overview")
    return uniq


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dest", type=Path, default=DEST_DEFAULT)
    ap.add_argument("--storage-state", type=Path, default=None)
    ap.add_argument("--user-data-dir", type=Path, default=None)
    ap.add_argument("--channel", default="chrome", help="与 user-data-dir 联用：chrome | chromium")
    ap.add_argument("--wait-ms", type=int, default=2500)
    ap.add_argument("--max", type=int, default=0, help="仅截取前 N 条路由，0 表示全量")
    ap.add_argument(
        "--headless",
        action="store_true",
        help="与 --user-data-dir 联用：无界面跑持久化上下文（需本机已登录该 Profile）",
    )
    ap.add_argument(
        "--no-escape",
        action="store_true",
        help="不在每页加载后按 Escape（默认按一次以尝试关闭 v-modal 遮罩）",
    )
    args = ap.parse_args()

    from playwright.async_api import async_playwright

    async with httpx.AsyncClient(verify=False, timeout=60) as client:
        js = (await client.get(BASE)).text
    routes = parse_routes_from_app_js(js)
    if args.max and args.max > 0:
        routes = routes[: args.max]

    args.dest.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        if args.user_data_dir:
            browser = await p.chromium.launch_persistent_context(
                user_data_dir=str(args.user_data_dir),
                channel=args.channel if args.channel in ("chrome", "msedge") else None,
                headless=args.headless,
                viewport={"width": 1440, "height": 900},
            )
            page = browser.pages[0] if browser.pages else await browser.new_page()
        else:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                viewport={"width": 1440, "height": 900},
                storage_state=str(args.storage_state) if args.storage_state else None,
            )
            page = await context.new_page()

        for i, route in enumerate(routes, 1):
            url = f"{ADMIN}{route}"
            name = route.strip("/").replace("/", "__") or "home"
            fp = args.dest / f"{i:03d}_{name}.png"
            try:
                await page.goto(url, wait_until="networkidle", timeout=120000)
            except Exception:
                await page.goto(url, wait_until="domcontentloaded", timeout=120000)
            await page.wait_for_timeout(args.wait_ms)
            if not args.no_escape:
                await page.keyboard.press("Escape")
                await page.wait_for_timeout(300)
            await page.screenshot(path=str(fp), full_page=True)
            print(f"OK {i}/{len(routes)} {fp.name}")

        if args.user_data_dir:
            await browser.close()
        else:
            await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
