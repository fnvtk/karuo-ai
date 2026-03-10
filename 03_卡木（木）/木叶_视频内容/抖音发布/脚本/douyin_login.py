#!/usr/bin/env python3
"""获取抖音 Cookie - 弹窗浏览器 → 扫码登录 → 保存 storage_state"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

COOKIE_FILE = Path(__file__).parent / "douyin_storage_state.json"


async def main():
    print("即将弹出浏览器，请用新抖音号扫码登录。")
    print("登录成功后，在 Playwright Inspector 窗口中点击绿色 ▶ 按钮。\n")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=False)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/143.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 720},
        )
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        """)
        page = await context.new_page()
        await page.goto("https://creator.douyin.com/", timeout=60000)
        await page.pause()
        await context.storage_state(path=str(COOKIE_FILE))
        await context.close()
        await browser.close()

    print(f"\n[✓] Cookie 已保存到: {COOKIE_FILE}")
    print(f"    文件大小: {COOKIE_FILE.stat().st_size} bytes")
    print("现在可以运行 douyin_pure_api.py 批量发布了。")


if __name__ == "__main__":
    asyncio.run(main())
