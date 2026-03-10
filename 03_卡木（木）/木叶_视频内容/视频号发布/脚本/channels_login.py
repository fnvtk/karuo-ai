#!/usr/bin/env python3
"""视频号 Cookie 获取 - Playwright 扫码登录 → 保存 storage_state"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

COOKIE_FILE = Path(__file__).parent / "channels_storage_state.json"
LOGIN_URL = "https://channels.weixin.qq.com/login"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)


async def main():
    print("即将弹出浏览器，请用微信扫码登录视频号助手。")
    print("登录成功后（看到视频号助手主页），按 Enter 或在 Inspector 点绿色 ▶。\n")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=False)
        context = await browser.new_context(user_agent=UA, viewport={"width": 1280, "height": 720})
        await context.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")
        page = await context.new_page()
        await page.goto(LOGIN_URL, timeout=60000)

        print("等待微信扫码登录...")
        try:
            await page.wait_for_url("**/platform**", timeout=180000)
            await asyncio.sleep(3)
        except Exception:
            print("未自动检测到跳转，请手动确认已登录后按 Enter")
            await page.pause()

        await context.storage_state(path=str(COOKIE_FILE))
        await context.close()
        await browser.close()

    print(f"\n[✓] 视频号 Cookie 已保存: {COOKIE_FILE}")
    print(f"    文件大小: {COOKIE_FILE.stat().st_size} bytes")
    print("现在可运行 channels_publish.py 批量发布。")


if __name__ == "__main__":
    asyncio.run(main())
