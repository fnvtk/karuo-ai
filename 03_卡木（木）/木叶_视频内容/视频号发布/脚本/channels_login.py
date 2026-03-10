#!/usr/bin/env python3
"""视频号 Cookie 获取 - Playwright 扫码登录 → 保存 storage_state
v3: 登录后多次导航确保 Cookie 写入 + 验证 Cookie 存在
"""
import asyncio
import json
import sys
from pathlib import Path

from playwright.async_api import async_playwright

COOKIE_FILE = Path(__file__).parent / "channels_storage_state.json"
LOGIN_URL = "https://channels.weixin.qq.com/login"
PLATFORM_URL = "https://channels.weixin.qq.com/platform"
QR_SCREENSHOT = Path("/tmp/channels_qr.png")

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)


async def main():
    print("即将弹出浏览器，请用微信扫码登录视频号助手。", flush=True)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=False)
        context = await browser.new_context(
            user_agent=UA, viewport={"width": 1280, "height": 720}
        )
        await context.add_init_script(
            "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
        )
        page = await context.new_page()
        await page.goto(LOGIN_URL, timeout=60000)
        await asyncio.sleep(3)

        await page.screenshot(path=str(QR_SCREENSHOT))
        print(f"[QR] 二维码截图已保存: {QR_SCREENSHOT}", flush=True)
        print("请用微信扫描浏览器中的二维码...\n", flush=True)

        logged_in = False
        for i in range(60):
            await asyncio.sleep(5)
            url = page.url
            if "platform" in url and "login" not in url:
                logged_in = True
                print(f"[✓] 检测到登录跳转: {url[:80]}", flush=True)
                break
            cookies = await context.cookies()
            has_session = any(c["name"] == "sessionid" for c in cookies)
            if has_session:
                logged_in = True
                print("[✓] 检测到 sessionid Cookie！", flush=True)
                break
            if i % 6 == 0:
                print(f"  等待扫码中... ({i * 5}s)", flush=True)

        if not logged_in:
            print("[✗] 5 分钟超时。请重新运行此脚本再试。", flush=True)
            await browser.close()
            return 1

        # 确保 Cookie 完全写入：多导航几次
        print("[...] 等待 Cookie 完全写入...", flush=True)
        await asyncio.sleep(5)

        try:
            await page.goto(
                "https://channels.weixin.qq.com/platform/post/list",
                timeout=15000,
                wait_until="domcontentloaded",
            )
            await asyncio.sleep(3)
        except Exception:
            pass

        cookies = await context.cookies()
        print(f"[Cookie] 共获取 {len(cookies)} 个 Cookie:", flush=True)
        for c in cookies:
            print(f"  {c['name']} (domain={c['domain']}, expires={c.get('expires', 'N/A')})", flush=True)

        if not any(c["name"] == "sessionid" for c in cookies):
            print("[⚠] 未找到 sessionid Cookie，可能登录不完整！", flush=True)
            print("    尝试手动刷新页面后等待...", flush=True)
            await page.reload()
            await asyncio.sleep(5)
            cookies = await context.cookies()
            print(f"[Cookie] 刷新后共 {len(cookies)} 个 Cookie", flush=True)

        await context.storage_state(path=str(COOKIE_FILE))

        # 验证保存结果
        saved = json.loads(COOKIE_FILE.read_text())
        saved_cookies = saved.get("cookies", [])
        if not saved_cookies:
            print("[✗] 警告：保存的 Cookie 为空！登录可能失败。", flush=True)
            await browser.close()
            return 1

        await context.close()
        await browser.close()

    print(f"\n[✓] 视频号 Cookie 已保存: {COOKIE_FILE}", flush=True)
    print(f"    Cookie 数量: {len(saved_cookies)}", flush=True)
    print(f"    文件大小: {COOKIE_FILE.stat().st_size} bytes", flush=True)
    session = [c for c in saved_cookies if c["name"] == "sessionid"]
    if session:
        import datetime
        exp = datetime.datetime.fromtimestamp(session[0].get("expires", 0))
        print(f"    sessionid 过期: {exp}", flush=True)
    print("现在可运行 channels_publish.py 批量发布。", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
