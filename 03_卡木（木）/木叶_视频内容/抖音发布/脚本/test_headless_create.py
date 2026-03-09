#!/usr/bin/env python3
"""
测试：headless Playwright page.evaluate(fetch) 调用 create_v2
验证浏览器 JS 环境是否自动添加 a_bogus/msToken + bd-ticket-guard
"""
import asyncio
import json
import os
import random
import string
import time
from pathlib import Path

from playwright.async_api import async_playwright

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "douyin_storage_state.json"
STEALTH_JS = Path("/Users/karuo/Documents/开发/3、自营项目/万推/backend/utils/stealth.min.js")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

TEST_VIDEO_ID = "v0200fg10000d6nbfknog65sq49b99gg"
TEST_POSTER = "tos-cn-i-jm8ajry58r/72772c27a4b648b4a5d3e3e074d81d55"


def random_creation_id() -> str:
    chars = string.ascii_lowercase + string.digits
    prefix = "".join(random.choices(chars, k=8))
    ts = str(int(time.time() * 1000))
    return prefix + ts


async def main():
    if not COOKIE_FILE.exists():
        print("[!] Cookie 不存在")
        return 1

    print("[i] 启动浏览器...")
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=False,
            executable_path=CHROME if os.path.exists(CHROME) else None,
        )
        context = await browser.new_context(storage_state=str(COOKIE_FILE))
        if STEALTH_JS.exists():
            await context.add_init_script(path=str(STEALTH_JS))

        page = await context.new_page()

        def on_request(request):
            if "create_v2" in request.url:
                print(f"\n[NET] create_v2 请求:")
                print(f"  URL 前200: {request.url[:200]}")
                print(f"  a_bogus: {'✓' if 'a_bogus' in request.url else '✗'}")
                print(f"  msToken: {'✓' if 'msToken' in request.url else '✗'}")
                hdrs = dict(request.headers)
                for key in ["x-secsdk-csrf-token", "bd-ticket-guard-client-data", "bd-ticket-guard-web-version", "x-tt-session-dtrait"]:
                    print(f"  {key}: {'✓' if key in hdrs else '✗'}")

        def on_response(response):
            if "create_v2" in response.url:
                print(f"[NET] create_v2 响应: HTTP {response.status}")

        page.on("request", on_request)
        page.on("response", on_response)

        # 打开发布页（让 JS 安全 SDK 完全加载）
        print("[1] 打开发布页...")
        await page.goto("https://creator.douyin.com/creator-micro/content/upload",
                        wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_load_state("networkidle", timeout=30000)

        if await page.get_by_text("手机号登录").count() or await page.get_by_text("扫码登录").count():
            print("[!] Cookie 失效")
            await browser.close()
            return 1
        print("[1] OK")
        await asyncio.sleep(5)

        creation_id = random_creation_id()
        body = {
            "item": {
                "common": {
                    "text": "headless API 测试发布 v2",
                    "caption": "headless API 测试发布 v2",
                    "item_title": "",
                    "activity": "[]",
                    "text_extra": "[]",
                    "challenges": "[]",
                    "mentions": "[]",
                    "hashtag_source": "",
                    "hot_sentence": "",
                    "interaction_stickers": "[]",
                    "visibility_type": 0,
                    "download": 1,
                    "timing": 0,
                    "creation_id": creation_id,
                    "media_type": 4,
                    "video_id": TEST_VIDEO_ID,
                    "music_source": 0,
                    "music_id": None,
                },
                "cover": {
                    "custom_cover_image_height": 0,
                    "custom_cover_image_width": 0,
                    "poster": TEST_POSTER,
                    "poster_delay": 0,
                },
            }
        }
        body_json = json.dumps(body, ensure_ascii=False)

        # 方案 A: 使用 XHR (可能有不同的拦截器)
        print("\n[测试A] 使用 XMLHttpRequest...")
        js_xhr = f"""
        () => new Promise((resolve) => {{
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/web/api/media/aweme/create_v2/');
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('Accept', 'application/json, text/plain, */*');
            xhr.withCredentials = true;
            xhr.onload = function() {{
                resolve({{
                    status: xhr.status,
                    url: xhr.responseURL,
                    body: xhr.responseText.substring(0, 2000),
                    headers: xhr.getAllResponseHeaders(),
                }});
            }};
            xhr.onerror = function() {{ resolve({{ error: 'network error' }}); }};
            xhr.send(JSON.stringify({body_json}));
        }})
        """
        result_a = await page.evaluate(js_xhr)
        print(f"  结果A: {json.dumps(result_a, ensure_ascii=False, indent=2)}")

        await asyncio.sleep(2)

        # 方案 B: 找页面内部的 axios/request 实例
        print("\n[测试B] 搜索页面内部 request 方法...")
        js_find = """
        () => {
            const found = [];
            // 检查常见的 request 实例
            if (window.axios) found.push('window.axios');
            if (window.__axios) found.push('window.__axios');
            if (window._request) found.push('window._request');
            if (window.__request) found.push('window.__request');
            if (window.request) found.push('window.request');
            if (window.__NUXT__) found.push('window.__NUXT__');
            if (window.__NEXT_DATA__) found.push('window.__NEXT_DATA__');
            if (window.__APP_DATA__) found.push('window.__APP_DATA__');

            // 检查 ByteDance SDK
            if (window.byted_acrawler) found.push('window.byted_acrawler');
            if (window.bdms) found.push('window.bdms');
            if (window.__bd_ticket_guard_client) found.push('window.__bd_ticket_guard_client');
            if (window._bytedGuard) found.push('window._bytedGuard');
            if (window.SSR_HYDRATED_DATA) found.push('window.SSR_HYDRATED_DATA');
            if (window.__LOADABLE_LOADED_CHUNKS__) found.push('window.__LOADABLE_LOADED_CHUNKS__');

            // 检查 React 内部
            try {
                const keys = Object.keys(window).filter(k => !k.startsWith('_') || k.startsWith('__'));
                const interesting = keys.filter(k => {
                    try { return typeof window[k] === 'function' || (typeof window[k] === 'object' && window[k] !== null); } catch(e) { return false; }
                });
                found.push('total_window_keys: ' + keys.length);
            } catch(e) {}

            return found;
        }
        """
        found = await page.evaluate(js_find)
        print(f"  找到: {found}")

        # 方案 C: fetch + credentials: include + 手动构造安全头
        print("\n[测试C] fetch + credentials include...")
        js_fetch_c = f"""
        async () => {{
            try {{
                // 尝试从页面获取 csrf token
                const cookies = document.cookie;
                let csrfToken = '';
                const match = cookies.match(/passport_csrf_token=([^;]+)/);
                if (match) csrfToken = match[1];

                // 尝试获取 x-secsdk-csrf-token
                let secCsrf = '';
                try {{
                    const metaTag = document.querySelector('meta[name="csrf-token"]');
                    if (metaTag) secCsrf = metaTag.content;
                }} catch(e) {{}}

                const resp = await fetch('/web/api/media/aweme/create_v2/', {{
                    method: 'POST',
                    credentials: 'include',
                    headers: {{
                        'Content-Type': 'application/json',
                        'Accept': 'application/json, text/plain, */*',
                    }},
                    body: JSON.stringify({body_json}),
                }});
                const text = await resp.text();
                return {{
                    status: resp.status,
                    url: resp.url,
                    body: text.substring(0, 2000),
                    csrfToken: csrfToken,
                    secCsrf: secCsrf,
                }};
            }} catch(e) {{
                return {{ error: e.message }};
            }}
        }}
        """
        result_c = await page.evaluate(js_fetch_c)
        print(f"  结果C: {json.dumps(result_c, ensure_ascii=False, indent=2)}")

        await asyncio.sleep(2)
        await context.storage_state(path=str(COOKIE_FILE))
        await context.close()
        await browser.close()

    return 0


if __name__ == "__main__":
    asyncio.run(main())
