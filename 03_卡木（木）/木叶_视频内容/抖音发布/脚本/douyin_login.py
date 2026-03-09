#!/usr/bin/env python3
"""获取抖音 Cookie - 弹窗浏览器 → 扫码登录 → 保存 storage_state"""
import asyncio
import sys
from pathlib import Path

WANTUI = Path("/Users/karuo/Documents/开发/3、自营项目/万推/backend")
sys.path.insert(0, str(WANTUI))

from playwright.async_api import async_playwright
from utils.base_social_media import set_init_script

COOKIE_FILE = Path(__file__).parent / "douyin_storage_state.json"


async def main():
    print("即将弹出浏览器，请扫码登录抖音创作者中心。")
    print("登录成功后，在 Playwright Inspector 窗口中点击绿色 ▶ 按钮。\n")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=False)
        context = await browser.new_context()
        context = await set_init_script(context)
        page = await context.new_page()
        await page.goto("https://creator.douyin.com/", timeout=60000)
        await page.pause()
        await context.storage_state(path=str(COOKIE_FILE))
        await context.close()
        await browser.close()

    print(f"\n[✓] Cookie 已保存到: {COOKIE_FILE}")
    print(f"    文件大小: {COOKIE_FILE.stat().st_size} bytes")
    print("现在可以运行 douyin_batch_publish.py 批量发布了。")


if __name__ == "__main__":
    asyncio.run(main())
