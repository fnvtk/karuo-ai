#!/usr/bin/env python3
"""
小红书 SMS 登录 — headless Playwright（无弹窗）
用法：
  python3 xhs_sms_login.py <手机号> <验证码>
  python3 xhs_sms_login.py <手机号>           # 仅发送验证码
"""
import asyncio
import sys
import time
from pathlib import Path
from playwright.async_api import async_playwright

COOKIE_FILE = Path(__file__).parent / "xiaohongshu_storage_state.json"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)


async def login(phone: str, code: str = ""):
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        ctx = await browser.new_context(
            user_agent=UA,
            viewport={"width": 1280, "height": 900},
            locale="zh-CN",
        )
        await ctx.add_init_script(
            'Object.defineProperty(navigator,"webdriver",{get:()=>undefined})'
        )
        page = await ctx.new_page()

        print("[1] 打开登录页...")
        await page.goto(
            "https://creator.xiaohongshu.com/login", timeout=30000
        )
        await asyncio.sleep(5)

        print(f"[2] 填写手机号: {phone[:3]}****{phone[-4:]}")
        phone_input = page.locator('input[placeholder*="手机号"]').first
        if await phone_input.count() == 0:
            phone_input = page.locator('input').nth(1)
        await phone_input.click()
        await phone_input.fill(phone)
        await asyncio.sleep(1)

        if not code:
            print("[3] 发送验证码...")
            send_btn = page.locator("text=发送验证码").first
            await send_btn.click()
            await asyncio.sleep(2)
            txt = await page.evaluate("document.body.innerText")
            if "秒" in txt:
                print("[✓] 验证码已发送！请查看手机短信后重新运行脚本并带上验证码")
            await page.screenshot(path="/tmp/xhs_sms_sent.png")
            await browser.close()
            return False

        print(f"[3] 填写验证码: {code}")
        code_input = page.locator('input[placeholder*="验证码"]').first
        if await code_input.count() == 0:
            code_input = page.locator("input").nth(2)
        await code_input.click()
        await code_input.fill(code)
        await asyncio.sleep(1)

        print("[4] 点击登录...")
        login_btn = page.locator('button:has-text("登"), button:has-text("登 录")').first
        await login_btn.click()
        await asyncio.sleep(6)

        url = page.url
        await page.screenshot(path="/tmp/xhs_login_result.png")

        if "login" not in url:
            print(f"[✓] 登录成功！URL: {url}")
            await ctx.storage_state(path=str(COOKIE_FILE))
            cookies = await ctx.cookies()
            print(f"[✓] 保存了 {len(cookies)} 个 Cookie → {COOKIE_FILE}")
            await browser.close()
            return True

        txt = await page.evaluate("document.body.innerText")
        print(f"[⚠] 登录未成功，URL: {url}")
        print(f"    页面: {txt[:150]}")
        await browser.close()
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python3 xhs_sms_login.py <手机号> [验证码]")
        sys.exit(1)
    phone = sys.argv[1]
    code = sys.argv[2] if len(sys.argv) > 2 else ""
    ok = asyncio.run(login(phone, code))
    sys.exit(0 if ok else 1)
