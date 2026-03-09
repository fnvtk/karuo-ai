#!/usr/bin/env python3
"""探测抖音发布页面结构 - 找到正确的选择器"""
import asyncio
import sys
from pathlib import Path

WANTUI_BACKEND = Path("/Users/karuo/Documents/开发/3、自营项目/万推/backend")
sys.path.insert(0, str(WANTUI_BACKEND))

from playwright.async_api import async_playwright
from utils.base_social_media import set_init_script

COOKIE_FILE = Path(__file__).parent / "douyin_storage_state.json"
VIDEO = "/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片/睡眠不好？每天放下一件事，做减法.mp4"

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=False)
        context = await browser.new_context(storage_state=str(COOKIE_FILE))
        context = await set_init_script(context)
        page = await context.new_page()

        await page.goto("https://creator.douyin.com/creator-micro/content/upload",
                        wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_url("**/creator.douyin.com/**/upload**", timeout=60000)
        await page.wait_for_load_state("load", timeout=20000)
        await asyncio.sleep(3)

        # 上传文件
        loc = page.locator("input[type='file']").first
        await loc.wait_for(state="attached", timeout=10000)
        await loc.set_input_files(VIDEO, timeout=120000)
        print("文件已上传")

        # 等待进入发布页
        for _ in range(60):
            try:
                await page.wait_for_url("**/content/publish**", timeout=2000)
                break
            except:
                try:
                    await page.wait_for_url("**/content/post/video**", timeout=2000)
                    break
                except:
                    await asyncio.sleep(1)
        print(f"当前URL: {page.url}")
        await asyncio.sleep(3)

        # 关闭弹窗
        try:
            iknow = page.get_by_text("我知道了", exact=True)
            if await iknow.count() and await iknow.first.is_visible():
                await iknow.first.click()
                print("关闭了视频预览弹窗")
                await asyncio.sleep(1)
        except:
            pass

        # 探测输入框
        print("\n=== 探测页面输入元素 ===")
        selectors = [
            'input[placeholder*="标题"]',
            'input[placeholder*="填写"]',
            '.notranslate',
            '[contenteditable="true"]',
            'textarea',
            '.zone-container',
            '[class*="title"] input',
            '[class*="title"] [contenteditable]',
            'input.semi-input',
            '.semi-input',
        ]
        for sel in selectors:
            try:
                count = await page.locator(sel).count()
                if count > 0:
                    first = page.locator(sel).first
                    vis = await first.is_visible()
                    tag = await first.evaluate("el => el.tagName")
                    ph = await first.evaluate("el => el.placeholder || el.getAttribute('data-placeholder') || ''")
                    text = await first.evaluate("el => el.textContent?.substring(0, 50) || ''")
                    print(f"  ✓ {sel} → count={count}, visible={vis}, tag={tag}, placeholder='{ph}', text='{text[:30]}'")
            except Exception as e:
                print(f"  ✗ {sel} → {e}")

        # 截图
        ss = Path(__file__).parent / "probe_result.png"
        await page.screenshot(path=str(ss), full_page=True)
        print(f"\n截图: {ss}")

        # 获取页面 HTML 片段
        html = await page.evaluate("""() => {
            const inputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
            return Array.from(inputs).map(el => ({
                tag: el.tagName,
                type: el.type || '',
                placeholder: el.placeholder || el.getAttribute('data-placeholder') || '',
                className: el.className?.substring(0, 80) || '',
                visible: el.offsetHeight > 0,
            }));
        }""")
        print("\n=== 所有输入元素 ===")
        for item in html:
            print(f"  {item}")

        await page.pause()
        await context.storage_state(path=str(COOKIE_FILE))
        await context.close()
        await browser.close()

asyncio.run(main())
