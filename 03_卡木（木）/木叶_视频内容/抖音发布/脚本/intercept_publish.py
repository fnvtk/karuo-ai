#!/usr/bin/env python3
"""
拦截抖音创作者中心视频发布的网络请求。
用 Playwright 走一次完整的上传→发布流程，记录所有 API 调用。
"""
import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from playwright.async_api import async_playwright, Request

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "douyin_storage_state.json"
STEALTH_JS = Path("/Users/karuo/Documents/开发/3、自营项目/万推/backend/utils/stealth.min.js")
VIDEO = "/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片/广点通能投Soul了，1000曝光6到10块.mp4"
LOG_FILE = SCRIPT_DIR / "intercepted_requests.json"

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

captured = []


def on_request(request: Request):
    url = request.url
    if "creator.douyin.com" not in url and "bytedanceapi" not in url and "snssdk" not in url and "bytedancevod" not in url:
        return
    if any(skip in url for skip in ["monitor_browser", "mcs.snssdk", "mon.zijie", "mssdk.bytedance", ".css", ".js", ".png", ".jpg", ".woff"]):
        return

    entry = {
        "timestamp": datetime.now().isoformat(),
        "method": request.method,
        "url": url[:500],
        "headers": dict(request.headers),
        "post_data": None,
    }
    try:
        pd = request.post_data
        if pd:
            entry["post_data"] = pd[:2000] if len(pd) > 2000 else pd
    except Exception:
        pass

    captured.append(entry)
    short = url.split("?")[0]
    print(f"  [NET] {request.method} {short}")


async def main():
    if not COOKIE_FILE.exists():
        print("[!] Cookie 不存在，请先运行 douyin_login.py")
        return 1

    print("[i] 启动浏览器，拦截网络请求...")
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=False,
            executable_path=CHROME if os.path.exists(CHROME) else None,
        )
        context = await browser.new_context(storage_state=str(COOKIE_FILE))
        if STEALTH_JS.exists():
            await context.add_init_script(path=str(STEALTH_JS))

        page = await context.new_page()
        page.on("request", on_request)

        # 1. 打开上传页
        print("[1] 打开上传页...")
        await page.goto("https://creator.douyin.com/creator-micro/content/upload", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_url("**/upload**", timeout=60000)
        await page.wait_for_load_state("load", timeout=20000)

        if await page.get_by_text("手机号登录").count() or await page.get_by_text("扫码登录").count():
            print("[!] Cookie 失效")
            await browser.close()
            return 1
        print("[1] 上传页就绪")

        try:
            await page.get_by_text("上传视频", exact=False).first.wait_for(state="visible", timeout=15000)
        except Exception:
            pass
        await asyncio.sleep(3)

        # 2. 上传文件
        print("[2] 上传视频...")
        for sel in ["input[type='file']", "[class^='upload-btn-input']"]:
            try:
                loc = page.locator(sel).first
                await loc.wait_for(state="attached", timeout=5000)
                await loc.set_input_files(VIDEO, timeout=60000)
                print(f"[2] 上传成功: {sel}")
                break
            except Exception:
                continue

        # 3. 等待发布页
        print("[3] 等待发布页...")
        for _ in range(120):
            try:
                await page.wait_for_url("**/publish*", timeout=2000)
                break
            except Exception:
                try:
                    await page.wait_for_url("**/post/video*", timeout=2000)
                    break
                except Exception:
                    pass
        print(f"[3] 当前URL: {page.url}")
        await asyncio.sleep(3)

        # 4. 填标题
        print("[4] 填标题...")
        try:
            tc = page.get_by_text("作品标题").locator("..").locator("xpath=following-sibling::div[1]").locator("input")
            if await tc.count():
                await tc.fill("广点通能投Soul了 #Soul派对 #测试")
            else:
                nl = page.locator(".notranslate").first
                await nl.click(timeout=5000)
                await page.keyboard.press("Meta+KeyA")
                await page.keyboard.press("Delete")
                await page.keyboard.type("广点通能投Soul了 #Soul派对 #测试", delay=20)
                await page.keyboard.press("Enter")
        except Exception as e:
            print(f"[4] 标题异常: {e}")
        print("[4] 标题已填")

        # 5. 等待上传完成
        print("[5] 等待上传完成...")
        for _ in range(120):
            try:
                n = await page.locator('[class^="long-card"] div:has-text("重新上传")').count()
                if n > 0:
                    break
            except Exception:
                pass
            await asyncio.sleep(2)
        print("[5] 上传完毕")
        await asyncio.sleep(2)

        # 清空之前的记录，只保留发布相关
        print("\n" + "="*60)
        print("  即将点击发布，开始重点监控网络请求")
        print("="*60 + "\n")
        captured.clear()

        # 6. 点击发布
        print("[6] 点击发布...")
        for attempt in range(20):
            try:
                pub = page.get_by_role("button", name="发布", exact=True)
                if await pub.count():
                    await pub.click()
                    print(f"[6] 已点击发布 (attempt {attempt+1})")

                await page.wait_for_url("**/content/manage**", timeout=8000)
                print("[6] 发布成功！页面已跳转到管理页")
                break
            except Exception:
                # 处理封面
                try:
                    if await page.get_by_text("请设置封面后再发布").first.is_visible():
                        print("[6] 需要封面...")
                        cover = page.locator('[class^="recommendCover-"]').first
                        if await cover.count():
                            await cover.click()
                            await asyncio.sleep(1)
                            if await page.get_by_text("是否确认应用此封面？").first.is_visible():
                                await page.get_by_role("button", name="确定").click()
                                await asyncio.sleep(1)
                except Exception:
                    pass
                await asyncio.sleep(3)

        await asyncio.sleep(3)

        # 保存 Cookie
        await context.storage_state(path=str(COOKIE_FILE))

        # 保存拦截到的请求
        print(f"\n[i] 共捕获 {len(captured)} 个相关请求")
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(captured, f, ensure_ascii=False, indent=2)
        print(f"[i] 已保存到: {LOG_FILE}")

        # 打印关键请求
        print("\n" + "="*60)
        print("  关键 POST 请求（发布相关）")
        print("="*60)
        for req in captured:
            if req["method"] == "POST":
                url_short = req["url"].split("?")[0]
                print(f"\n  POST {url_short}")
                if req.get("post_data"):
                    print(f"  Body: {req['post_data'][:300]}")
                ct = req["headers"].get("content-type", "")
                print(f"  Content-Type: {ct}")

        await context.close()
        await browser.close()

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
