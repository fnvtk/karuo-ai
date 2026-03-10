#!/usr/bin/env python3
"""快手 Cookie 获取 - Playwright 扫码登录 → 保存 storage_state"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

COOKIE_FILE = Path(__file__).parent / "kuaishou_storage_state.json"
LOGIN_URL = "https://cp.kuaishou.com/article/publish/video"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)


async def main():
    print("即将弹出浏览器，请用快手 APP 扫码登录创作者服务平台。")
    print("登录成功后（看到创作中心页面），按 Enter 或在 Inspector 点绿色 ▶。\n")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=False)
        context = await browser.new_context(user_agent=UA, viewport={"width": 1280, "height": 720})
        await context.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")
        page = await context.new_page()
        await page.goto(LOGIN_URL, timeout=60000)

        print("等待扫码登录...\n")
        # 等待从登录页跳转到创作中心（URL 变化 + 页面内容变化）
        for i in range(300):
            try:
                url = page.url
                cookies = await context.cookies()
                cp_cookies = [c for c in cookies if "cp.kuaishou.com" in c.get("domain", "")]
                page_text = await page.evaluate("document.body.innerText")
                if cp_cookies or ("发布" in page_text and "立即登录" not in page_text and "平台优势" not in page_text):
                    print(f"检测到已登录！(cookies: {len(cp_cookies)}, url: {url[:60]})")
                    await asyncio.sleep(5)
                    break
            except Exception:
                # 页面正在导航（好兆头：说明用户在操作）
                await asyncio.sleep(2)
                continue
            if i > 0 and i % 30 == 0:
                print(f"  等待中... ({i}s)")
            await asyncio.sleep(1)
        else:
            print("超时，请确认已登录后按 Enter...")
            input()

        await context.storage_state(path=str(COOKIE_FILE))
        await context.close()
        await browser.close()

    print(f"\n[✓] 快手 Cookie 已保存: {COOKIE_FILE}")
    print(f"    文件大小: {COOKIE_FILE.stat().st_size} bytes")
    print("现在可运行 kuaishou_publish.py 批量发布。")


if __name__ == "__main__":
    asyncio.run(main())
