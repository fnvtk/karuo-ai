#!/usr/bin/env python3
"""知乎 Cookie 获取：Playwright 登录后保存 storage_state。"""

import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright

COOKIE_FILE = Path(__file__).parent / "zhihu_storage_state.json"
LOGIN_URL = "https://www.zhihu.com/signin"
PROFILE_PLATFORM = "知乎"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "多平台分发" / "脚本"))
from browser_profile import get_browser_profile_dir


async def main():
    profile_dir = get_browser_profile_dir(PROFILE_PLATFORM)
    print("即将弹出浏览器，请登录知乎（支持扫码/密码/验证码）。")
    print(f"固定浏览器目录: {profile_dir}")
    print("登录成功进入创作中心后，在 Inspector 点绿色 ▶ 继续。\n")

    async with async_playwright() as pw:
        context = await pw.chromium.launch_persistent_context(
            str(profile_dir),
            headless=False,
            user_agent=UA,
            viewport={"width": 1366, "height": 900},
        )
        await context.add_init_script(
            "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
        )
        page = context.pages[0] if context.pages else await context.new_page()
        await page.goto(LOGIN_URL, timeout=60000)

        print("等待你完成登录...")
        await page.pause()

        await context.storage_state(path=str(COOKIE_FILE))
        await context.close()

    print(f"\n[✓] 知乎 Cookie 已保存: {COOKIE_FILE}")
    if COOKIE_FILE.exists():
        print(f"    文件大小: {COOKIE_FILE.stat().st_size} bytes")


if __name__ == "__main__":
    asyncio.run(main())
