#!/usr/bin/env python3
"""小红书 Cookie 获取 - Playwright 登录 → 保存 storage_state"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

COOKIE_FILE = Path(__file__).parent / "xiaohongshu_storage_state.json"
LOGIN_URL = "https://creator.xiaohongshu.com/login"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)


async def main():
    print("即将弹出浏览器，请登录小红书创作者中心。")
    print("支持扫码或手机号+验证码登录。")
    print("登录成功后（看到创作者中心主页），按 Enter 或在 Inspector 点绿色 ▶。\n")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=False)
        context = await browser.new_context(user_agent=UA, viewport={"width": 1280, "height": 720})
        await context.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")
        page = await context.new_page()
        await page.goto(LOGIN_URL, timeout=60000)

        print("等待登录完成...")
        try:
            await page.wait_for_url("**/home**", timeout=180000)
            await asyncio.sleep(3)
        except Exception:
            print("未自动检测到跳转，请手动确认已登录后按 Enter")
            await page.pause()

        await context.storage_state(path=str(COOKIE_FILE))
        await context.close()
        await browser.close()

    print(f"\n[✓] 小红书 Cookie 已保存: {COOKIE_FILE}")
    print(f"    文件大小: {COOKIE_FILE.stat().st_size} bytes")
    print("现在可运行 xiaohongshu_publish.py 批量发布。")


if __name__ == "__main__":
    asyncio.run(main())
