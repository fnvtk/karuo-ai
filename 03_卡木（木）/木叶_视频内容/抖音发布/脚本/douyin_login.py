#!/usr/bin/env python3
"""
抖音创作者平台登录 — 弹窗浏览器扫码 → 自动检测登录 → 保存 storage_state
扫码后无需手动操作，脚本自动检测登录状态并保存。
"""
import asyncio
import sys
from pathlib import Path
from playwright.async_api import async_playwright

COOKIE_FILE = Path(__file__).parent / "douyin_storage_state.json"
PROFILE_PLATFORM = "抖音"

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "多平台分发" / "脚本"))
from browser_profile import get_browser_profile_dir


async def main():
    profile_dir = get_browser_profile_dir(PROFILE_PLATFORM)
    print("即将弹出浏览器，请用抖音 APP 扫码登录。")
    print(f"固定浏览器目录: {profile_dir}")
    print("登录成功后脚本会自动保存 Cookie，无需手动操作。\n")

    async with async_playwright() as pw:
        context = await pw.chromium.launch_persistent_context(
            str(profile_dir),
            headless=False,
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
        page = context.pages[0] if context.pages else await context.new_page()
        await page.goto("https://creator.douyin.com/", timeout=60000)

        print("[i] 等待扫码登录... (最长等待 120 秒)")
        try:
            await page.wait_for_url(
                "**/creator-micro/home**",
                timeout=120000,
            )
            print("[✓] 检测到登录成功！正在保存 Cookie...")
        except Exception:
            print("[i] 未检测到自动跳转，尝试检测 Cookie...")
            for _ in range(30):
                cookies = await context.cookies()
                has_session = any(
                    c["name"] in ("sessionid", "sessionid_ss", "passport_csrf_token")
                    for c in cookies
                    if "douyin.com" in c.get("domain", "")
                )
                if has_session:
                    print("[✓] 检测到登录 Cookie！")
                    break
                await asyncio.sleep(2)
            else:
                print("[⚠] 超时，尝试保存当前状态...")

        await asyncio.sleep(2)
        await context.storage_state(path=str(COOKIE_FILE))
        await context.close()

    print(f"\n[✓] Cookie 已保存到: {COOKIE_FILE}")
    print(f"    文件大小: {COOKIE_FILE.stat().st_size} bytes")
    print("现在可以运行 douyin_pure_api.py 批量发布了。")


if __name__ == "__main__":
    asyncio.run(main())
