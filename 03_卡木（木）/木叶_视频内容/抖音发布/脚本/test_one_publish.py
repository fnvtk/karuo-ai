#!/usr/bin/env python3
"""
测试单条发布 — 通过 JS hook 在页面内捕获 video_id
"""
import asyncio
import json
import os
import random
import string
import sys
import time
from datetime import datetime
from pathlib import Path

from playwright.async_api import async_playwright

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "douyin_storage_state.json"
STEALTH_JS = Path("/Users/karuo/Documents/开发/3、自营项目/万推/backend/utils/stealth.min.js")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

VIDEO = "/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片/广点通能投Soul了，1000曝光6到10块.mp4"
TITLE = "广点通能投Soul了，1000曝光6到10块。#Soul派对 #广点通 #流量投放"

# JS 注入：hook fetch/XHR 捕获 video_id 和所有关键响应
HOOK_JS = r"""
window.__dy_video_ids = [];
window.__dy_responses = [];

const _origFetch = window.fetch;
window.fetch = async function(...args) {
    const resp = await _origFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
    
    if (url.includes('vod.bytedance') || url.includes('video/enable') || 
        url.includes('video/transend') || url.includes('video/sts') ||
        url.includes('ApplyUpload') || url.includes('CommitUpload')) {
        try {
            const clone = resp.clone();
            const text = await clone.text();
            window.__dy_responses.push({ url: url.substring(0, 200), body: text.substring(0, 2000) });
            
            // 搜索 video_id
            const vidMatch = text.match(/"(?:video_id|VideoId|vid)":\s*"(v0[a-zA-Z0-9]+)"/);
            if (vidMatch) {
                window.__dy_video_ids.push(vidMatch[1]);
                console.log('[HOOK] video_id found: ' + vidMatch[1]);
            }
        } catch(e) {}
    }
    return resp;
};

// Also hook XHR
const _xhrOpen = XMLHttpRequest.prototype.open;
const _xhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this.__hookUrl = url;
    return _xhrOpen.apply(this, [method, url, ...rest]);
};
XMLHttpRequest.prototype.send = function(body) {
    const self = this;
    const origHandler = self.onreadystatechange;
    self.onreadystatechange = function() {
        if (self.readyState === 4 && self.__hookUrl) {
            const url = self.__hookUrl;
            if (url.includes('vod.bytedance') || url.includes('video/enable') || 
                url.includes('video/transend') || url.includes('video/sts') ||
                url.includes('ApplyUpload') || url.includes('CommitUpload')) {
                try {
                    const text = self.responseText;
                    window.__dy_responses.push({ url: url.substring(0, 200), body: text.substring(0, 2000), type: 'xhr' });
                    const vidMatch = text.match(/"(?:video_id|VideoId|vid)":\s*"(v0[a-zA-Z0-9]+)"/);
                    if (vidMatch) {
                        window.__dy_video_ids.push(vidMatch[1]);
                        console.log('[HOOK-XHR] video_id found: ' + vidMatch[1]);
                    }
                } catch(e) {}
            }
        }
        if (origHandler) origHandler.apply(self, arguments);
    };
    return _xhrSend.apply(this, [body]);
};

console.log('[HOOK] fetch/XHR hook installed for video_id capture');
"""


def random_creation_id() -> str:
    chars = string.ascii_lowercase + string.digits
    return "".join(random.choices(chars, k=8)) + str(int(time.time() * 1000))


async def main():
    if not COOKIE_FILE.exists():
        print("[!] Cookie 不存在")
        return 1

    timing_ts = int(time.time()) + 2 * 3600
    timing_ts = (timing_ts // 3600) * 3600
    print(f"视频: {Path(VIDEO).name}")
    print(f"标题: {TITLE}")
    print(f"定时: {datetime.fromtimestamp(timing_ts).strftime('%Y-%m-%d %H:%M')}")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=False,
            executable_path=CHROME if os.path.exists(CHROME) else None,
        )
        context = await browser.new_context(storage_state=str(COOKIE_FILE))
        if STEALTH_JS.exists():
            await context.add_init_script(path=str(STEALTH_JS))
        # 注入 hook 到所有新页面
        await context.add_init_script(script=HOOK_JS)

        page = await context.new_page()
        page.on("console", lambda msg: print(f"  [console] {msg.text}") if "HOOK" in msg.text else None)

        # 1. 打开上传页
        print("\n[1] 打开上传页...")
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

        # 2. 上传
        print("[2] 上传视频...")
        loc = page.locator("input[type='file']").first
        await loc.wait_for(state="attached", timeout=10000)
        await loc.set_input_files(VIDEO, timeout=60000)
        print("[2] OK")

        # 3. 等待发布页
        for _ in range(120):
            if "publish" in page.url or "post/video" in page.url:
                break
            await asyncio.sleep(1)
        print(f"[3] 发布页就绪")

        # 再次注入 hook（页面导航可能清空了）
        await page.evaluate(HOOK_JS)
        await asyncio.sleep(5)

        # 4. 等待 video_id 出现
        print("[4] 等待 video_id...")
        video_id = None
        for i in range(180):
            vids = await page.evaluate("window.__dy_video_ids || []")
            if vids:
                video_id = vids[-1]
                print(f"[4] ✓ video_id: {video_id}")
                break

            # 每 15 秒检查一次所有响应
            if i % 15 == 0 and i > 0:
                resps = await page.evaluate("window.__dy_responses || []")
                print(f"    ...{i}s, 捕获响应: {len(resps)}, video_ids: {len(vids)}")
                if resps:
                    for r in resps[-3:]:
                        print(f"    {r.get('url', '')[:80]}")

            await asyncio.sleep(1)

        # 如果 hook 没捕获到，尝试从页面提取
        if not video_id:
            print("[4] hook 未捕获，尝试其他方式...")

            # 方式A: 从页面中所有 img/video 元素查找
            video_id = await page.evaluate(r"""
            () => {
                // 搜索整个 DOM 的文本内容
                const html = document.documentElement.outerHTML;
                const match = html.match(/video_id['":\s]*(v0[a-zA-Z0-9]{20,})/);
                if (match) return match[1];
                
                // 搜索 video/source 元素
                const videos = document.querySelectorAll('video source, video');
                for (const v of videos) {
                    const src = v.src || v.currentSrc || '';
                    const m = src.match(/(v0[a-zA-Z0-9]{20,})/);
                    if (m) return m[1];
                }
                return null;
            }
            """)
            if video_id:
                print(f"[4] DOM 搜索找到: {video_id}")

        if not video_id:
            # 查看捕获的所有响应
            all_resps = await page.evaluate("window.__dy_responses || []")
            print(f"[4] 所有捕获的响应 ({len(all_resps)}):")
            for r in all_resps:
                print(f"    {r.get('url', '')[:100]}")
                body = r.get('body', '')
                if body:
                    print(f"    body: {body[:200]}")

        # 5. 获取 poster
        poster = await page.evaluate(r"""
        () => {
            const imgs = document.querySelectorAll('img[src*="tos-cn-i-"]');
            for (const img of imgs) {
                const match = img.src.match(/(tos-cn-i-[a-zA-Z0-9]+\/[a-f0-9]+)/);
                if (match) return match[1];
            }
            return '';
        }
        """)
        print(f"[5] poster: {poster[:50] if poster else 'N/A'}")

        if video_id:
            # 6. 用 fetch 发布
            print(f"\n[6] 通过 fetch 调用 create_v2...")
            creation_id = random_creation_id()
            body = {
                "item": {
                    "common": {
                        "text": TITLE,
                        "caption": TITLE,
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
                        "timing": timing_ts,
                        "creation_id": creation_id,
                        "media_type": 4,
                        "video_id": video_id,
                        "music_source": 0,
                        "music_id": None,
                    },
                    "cover": {
                        "custom_cover_image_height": 0,
                        "custom_cover_image_width": 0,
                        "poster": poster or "",
                        "poster_delay": 0,
                    },
                }
            }
            body_json = json.dumps(body, ensure_ascii=False)

            result = await page.evaluate(f"""
            async () => {{
                try {{
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
                    return {{ status: resp.status, body: text.substring(0, 3000) }};
                }} catch(e) {{
                    return {{ error: e.message }};
                }}
            }}
            """)
            print(f"[6] HTTP {result.get('status', '?')}")
            resp_body = result.get("body", "")
            print(f"[6] 响应: {resp_body[:500]}")

            if resp_body:
                try:
                    parsed = json.loads(resp_body)
                    if parsed.get("status_code") == 0:
                        print("\n[✓] 发布成功！")
                        await context.storage_state(path=str(COOKIE_FILE))
                        await context.close()
                        await browser.close()
                        return 0
                except Exception:
                    pass

        # 回退到浏览器点击发布
        print("\n[回退] 使用浏览器点击发布...")
        try:
            nl = page.locator(".notranslate").first
            await nl.click(timeout=5000)
            await page.keyboard.press("Meta+KeyA")
            await page.keyboard.press("Delete")
            await page.keyboard.type(TITLE[:50], delay=20)
            await asyncio.sleep(2)
        except Exception as e:
            print(f"  标题填写异常: {e}")

        for attempt in range(8):
            try:
                pub = page.get_by_role("button", name="发布", exact=True)
                if await pub.count():
                    await pub.click()
                    print(f"  点击发布 (attempt {attempt+1})")

                await page.wait_for_url("**/content/manage**", timeout=10000)
                print("[✓] 浏览器发布成功！")
                await context.storage_state(path=str(COOKIE_FILE))
                await context.close()
                await browser.close()
                return 0
            except Exception:
                # 处理封面
                try:
                    if await page.get_by_text("请设置封面后再发布").first.is_visible():
                        print(f"  需要封面...")
                        covers = page.locator('[class*="recommendCover"], [class*="cover-select-item"]')
                        if await covers.count() > 0:
                            await covers.first.click()
                            await asyncio.sleep(2)
                        confirm = page.get_by_role("button", name="确定")
                        if await confirm.count():
                            await confirm.click()
                            await asyncio.sleep(2)
                        continue
                except Exception:
                    pass

                # 处理安全验证
                try:
                    if await page.locator('text="安全验证"').count() > 0 or await page.locator('text="身份验证"').count() > 0:
                        print(f"  [!] 触发安全验证，等待用户手动处理...")
                        await asyncio.sleep(30)
                except Exception:
                    pass

                await asyncio.sleep(3)

        print("\n结果: 失败")
        await context.storage_state(path=str(COOKIE_FILE))
        await context.close()
        await browser.close()
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
