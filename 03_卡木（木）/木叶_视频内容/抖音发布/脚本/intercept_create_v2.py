#!/usr/bin/env python3
"""
精准拦截 create_v2 请求 — 捕获所有 POST 请求以找到真正的发布 API。
使用 page.route() 拦截（更可靠）+ page.on('request') 双保险。
"""
import asyncio
import json
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright, Request, Route

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "douyin_storage_state.json"
STEALTH_JS = Path("/Users/karuo/Documents/开发/3、自营项目/万推/backend/utils/stealth.min.js")
VIDEO = "/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片/广点通能投Soul了，1000曝光6到10块.mp4"
LOG_FILE = SCRIPT_DIR / "create_v2_captured.json"
ALL_POSTS_FILE = SCRIPT_DIR / "all_post_requests.json"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

captured_creates = []
all_post_after_click = []
publishing_started = False


def on_request(request: Request):
    global publishing_started
    url = request.url
    if request.method != "POST":
        return
    if not publishing_started:
        return
    if any(skip in url for skip in ["monitor_browser", "mcs.snssdk", "mon.zijie", "mssdk", ".css", ".js", ".png", "ttwid/check", "goofy_worker", "passport/user_info"]):
        return

    entry = {
        "url": url[:600],
        "method": request.method,
        "content_type": request.headers.get("content-type", ""),
    }
    try:
        body = request.post_data
        if body:
            entry["body"] = body[:5000]
            entry["body_length"] = len(body)
    except Exception:
        entry["body"] = None

    all_post_after_click.append(entry)
    short_url = url.split("?")[0]
    print(f"  [POST] {short_url}")

    if any(kw in url for kw in ["create_v2", "aweme/create", "aweme/post"]):
        entry["headers"] = dict(request.headers)
        try:
            body = request.post_data
            entry["full_body"] = body[:10000] if body else None
        except Exception:
            pass

        captured_creates.append(entry)
        print(f"\n{'#'*60}")
        print(f"  ★★★ 捕获到 create 请求！ ★★★")
        print(f"  URL: {url}")
        print(f"  Content-Type: {entry['content_type']}")
        if entry.get("full_body"):
            print(f"  Body ({len(entry['full_body'])} chars):")
            print(f"  {entry['full_body'][:3000]}")
        print(f"{'#'*60}\n")

        with open(LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(captured_creates, f, ensure_ascii=False, indent=2)


async def main():
    global publishing_started

    if not COOKIE_FILE.exists():
        print("[!] Cookie 不存在")
        return 1

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

        print("[1] 打开上传页...")
        await page.goto("https://creator.douyin.com/creator-micro/content/upload",
                        wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_url("**/upload**", timeout=60000)
        await page.wait_for_load_state("load", timeout=20000)

        if await page.get_by_text("手机号登录").count() or await page.get_by_text("扫码登录").count():
            print("[!] Cookie 失效")
            await browser.close()
            return 1
        print("[1] OK")
        await asyncio.sleep(3)

        print("[2] 上传视频...")
        loc = page.locator("input[type='file']").first
        await loc.wait_for(state="attached", timeout=10000)
        await loc.set_input_files(VIDEO, timeout=60000)
        print("[2] OK")

        print("[3] 等待发布页...")
        for _ in range(120):
            if "publish" in page.url or "post/video" in page.url:
                break
            await asyncio.sleep(1)
        print(f"[3] URL: {page.url}")
        await asyncio.sleep(5)

        print("[4] 填标题...")
        try:
            nl = page.locator(".notranslate").first
            await nl.click(timeout=5000)
            await page.keyboard.press("Meta+KeyA")
            await page.keyboard.press("Delete")
            await page.keyboard.type("广点通能投Soul了 测试发布", delay=20)
            print("[4] OK")
        except Exception as e:
            print(f"[4] 异常: {e}")

        print("[5] 等待视频上传+转码完成...")
        for i in range(240):
            try:
                c1 = await page.locator('div:has-text("重新上传")').count()
                c2 = await page.locator('text="上传完成"').count()
                c3 = await page.locator('[class*="success"]').count()
                if c1 > 0 or c2 > 0:
                    break
            except Exception:
                pass
            if i % 15 == 0 and i > 0:
                print(f"  ...{i}s")
            await asyncio.sleep(1)

        # 额外等待转码
        print("[5] 上传完成，等待转码...")
        await asyncio.sleep(15)

        # 检查视频是否可发布
        try:
            enabled = await page.locator('text="视频解析中"').count()
            if enabled > 0:
                print("[5] 仍在解析，继续等...")
                for i in range(60):
                    c = await page.locator('text="视频解析中"').count()
                    if c == 0:
                        break
                    await asyncio.sleep(2)
        except Exception:
            pass
        print("[5] OK")

        # 开始监控
        publishing_started = True
        print("\n" + "="*60)
        print("  ★ 开始监控所有 POST 请求 — 即将点击发布 ★")
        print("="*60 + "\n")

        # 多次尝试发布
        for attempt in range(10):
            print(f"\n--- 发布尝试 #{attempt+1} ---")
            try:
                pub = page.get_by_role("button", name="发布", exact=True)
                if await pub.count():
                    await pub.click()
                    print(f"[6] 已点击发布")
                else:
                    pub2 = page.locator("button:has-text('发布')").first
                    if await pub2.count():
                        await pub2.click()
                        print(f"[6] 已点击发布(fallback)")
            except Exception as e:
                print(f"[6] 点击异常: {e}")

            # 等待
            await asyncio.sleep(5)

            # 检查是否跳转
            if "manage" in page.url:
                print("[✓] 页面已跳转到管理页 — 发布成功！")
                break

            # 处理封面弹窗
            try:
                if await page.get_by_text("请设置封面后再发布").first.is_visible():
                    print("[6] 需要封面，选择推荐封面...")
                    covers = page.locator('[class*="recommendCover"], [class*="cover-select"] img, [class*="coverCard"]')
                    if await covers.count() > 0:
                        await covers.first.click()
                        await asyncio.sleep(2)
                    confirm = page.get_by_role("button", name="确定")
                    if await confirm.count():
                        await confirm.click()
                        await asyncio.sleep(3)
                    print("[6] 封面已选，继续...")
                    continue
            except Exception:
                pass

            # 处理验证弹窗
            try:
                if await page.locator('text="安全验证"').count() > 0:
                    print("[!] 触发安全验证，无法自动处理")
                    break
            except Exception:
                pass

            await asyncio.sleep(5)

            if captured_creates:
                print("[✓] 已捕获 create 请求！")
                break

        # 最终等待
        print("\n[7] 最终等待...")
        await asyncio.sleep(10)

        print(f"\n{'='*60}")
        print(f"  最终结果")
        print(f"  URL: {page.url}")
        print(f"  捕获 create 请求: {len(captured_creates)}")
        print(f"  捕获所有 POST: {len(all_post_after_click)}")
        print(f"{'='*60}")

        # 保存所有 POST 请求
        with open(ALL_POSTS_FILE, "w", encoding="utf-8") as f:
            json.dump(all_post_after_click, f, ensure_ascii=False, indent=2)
        print(f"[i] 所有 POST 请求已保存: {ALL_POSTS_FILE}")

        if captured_creates:
            with open(LOG_FILE, "w", encoding="utf-8") as f:
                json.dump(captured_creates, f, ensure_ascii=False, indent=2)
            print(f"[i] create 请求已保存: {LOG_FILE}")

        # 打印所有 POST 摘要
        print("\n--- 所有 POST 请求摘要 ---")
        for i, req in enumerate(all_post_after_click):
            url_short = req["url"].split("?")[0]
            ct = req.get("content_type", "")
            bl = req.get("body_length", 0)
            print(f"  {i+1}. {url_short} [{ct}] body={bl}b")

        await context.storage_state(path=str(COOKIE_FILE))
        await context.close()
        await browser.close()

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
