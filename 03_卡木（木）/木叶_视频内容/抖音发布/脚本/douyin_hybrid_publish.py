#!/usr/bin/env python3
"""
抖音视频批量发布 — 混合方案 v2
- Playwright 加载页面 + set_input_files 上传视频
- JS hook 从 transend/enable URL 捕获 video_id
- page.evaluate(fetch) 调用 create_v2 发布
- 回退方案：浏览器点击发布
- 命令行全自动
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
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片")

TITLES = {
    "早起不是为了开派对，是不吵老婆睡觉.mp4":
        "早起不是为了开派对，是不吵老婆睡觉。初衷就这一个。#Soul派对 #创业日记 #晨间直播 #私域干货",
    "懒人的活法 动作简单有利可图正反馈.mp4":
        "懒有懒的活法：动作简单、有利可图、正反馈，就能坐得住。#Soul派对 #副业 #私域 #切片变现",
    "初期团队先找两个IS，比钱好使 ENFJ链接人，ENTJ指挥.mp4":
        "初期团队先找两个IS，比钱好使。ENFJ链接人，ENTJ指挥。#MBTI #创业团队 #Soul派对",
    "ICU出来一年多 活着要在互联网上留下东西.mp4":
        "ICU出来一年多，活着要在互联网上留下东西。#人生感悟 #创业 #Soul派对 #记录生活",
    "MBTI疗愈SOUL 年轻人测MBTI，40到60岁走五行八卦.mp4":
        "年轻人测MBTI，40到60岁走五行八卦。#MBTI #Soul派对 #五行 #疗愈",
    "Soul业务模型 派对+切片+小程序全链路.mp4":
        "Soul业务模型：派对+切片+小程序全链路。#Soul派对 #商业模式 #私域运营 #小程序",
    "Soul切片30秒到8分钟 AI半小时能剪10到30个.mp4":
        "Soul切片30秒到8分钟，AI半小时能剪10到30个。#AI剪辑 #Soul派对 #切片变现 #效率工具",
    "刷牙听业务逻辑 Soul切片变现怎么跑.mp4":
        "刷牙听业务逻辑：Soul切片变现怎么跑。#Soul派对 #切片变现 #副业 #商业逻辑",
    "国学易经怎么学 两小时七七八八，召唤作者对话.mp4":
        "国学易经怎么学？两小时七七八八，召唤作者对话。#国学 #易经 #Soul派对 #学习方法",
    "广点通能投Soul了，1000曝光6到10块.mp4":
        "广点通能投Soul了，1000曝光6到10块。#Soul派对 #广点通 #流量投放 #私域获客",
    "建立信任不是求来的 卖外挂发邮件三个月拿下德国总代.mp4":
        "建立信任不是求来的。卖外挂发邮件三个月拿下德国总代。#销售 #信任 #Soul派对 #商业故事",
    "核心就两个字 筛选。能开派对坚持7天的人再谈.mp4":
        "核心就两个字：筛选。能开派对坚持7天的人再谈。#筛选 #Soul派对 #创业 #坚持",
    "睡眠不好？每天放下一件事，做减法.mp4":
        "睡眠不好？每天放下一件事，做减法。#睡眠 #减法 #Soul派对 #生活方式",
    "这套体系花了170万，但前端几十块就能参与.mp4":
        "这套体系花了170万，但前端几十块就能参与。#商业体系 #Soul派对 #私域 #低成本创业",
    "金融AI获客体系 后端30人沉淀12年，前端丢手机.mp4":
        "金融AI获客体系：后端30人沉淀12年，前端丢手机。#AI获客 #金融 #Soul派对 #商业模式",
}

HOOK_JS = r"""
(function() {
    if (window.__dy_hook_installed) return;
    window.__dy_hook_installed = true;
    window.__dy_video_ids = [];
    window.__dy_responses = [];

    const _origFetch = window.fetch;
    window.fetch = async function(...args) {
        const resp = await _origFetch.apply(this, args);
        try {
            const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
            const urlVidMatch = url.match(/video_id=(v0[a-zA-Z0-9]+)/);
            if (urlVidMatch && !window.__dy_video_ids.includes(urlVidMatch[1])) {
                window.__dy_video_ids.push(urlVidMatch[1]);
                console.log('[HOOK] video_id: ' + urlVidMatch[1]);
            }
            if (url.includes('vod.bytedance') || url.includes('video/enable') ||
                url.includes('video/transend') || url.includes('ApplyUpload') ||
                url.includes('CommitUpload')) {
                const clone = resp.clone();
                const text = await clone.text();
                window.__dy_responses.push({ url: url.substring(0, 500), body: text.substring(0, 2000) });
                const vidMatch = text.match(/"(?:video_id|VideoId)":\s*"(v0[a-zA-Z0-9]+)"/);
                if (vidMatch && !window.__dy_video_ids.includes(vidMatch[1])) {
                    window.__dy_video_ids.push(vidMatch[1]);
                }
            }
        } catch(e) {}
        return resp;
    };
})();
"""


def get_title(filename: str) -> str:
    return TITLES.get(filename, f"{Path(filename).stem} #Soul派对 #创业日记 #卡若创业派对")


def random_creation_id() -> str:
    chars = string.ascii_lowercase + string.digits
    return "".join(random.choices(chars, k=8)) + str(int(time.time() * 1000))


async def publish_one(context, video_path: str, title: str, timing_ts: int, idx: int, total: int) -> bool:
    page = await context.new_page()
    timing_str = datetime.fromtimestamp(timing_ts).strftime("%Y-%m-%d %H:%M") if timing_ts > 0 else "立即"
    filename = Path(video_path).name

    print(f"\n{'='*60}")
    print(f"  [{idx}/{total}] {filename}")
    print(f"  标题: {title[:60]}")
    print(f"  定时: {timing_str}")
    print(f"{'='*60}")

    try:
        # 1. 打开上传页
        print(f"  [1] 打开上传页...")
        await page.goto("https://creator.douyin.com/creator-micro/content/upload",
                        wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_url("**/upload**", timeout=60000)
        await page.wait_for_load_state("load", timeout=20000)

        if await page.get_by_text("手机号登录").count() or await page.get_by_text("扫码登录").count():
            print(f"  [!] Cookie 失效")
            return False
        await asyncio.sleep(3)

        # 2. 上传
        print(f"  [2] 上传视频...")
        loc = page.locator("input[type='file']").first
        await loc.wait_for(state="attached", timeout=10000)
        await loc.set_input_files(video_path, timeout=60000)
        print(f"  [2] OK")

        # 3. 等待发布页
        for _ in range(120):
            if "publish" in page.url or "post/video" in page.url:
                break
            await asyncio.sleep(1)
        print(f"  [3] 发布页就绪")

        await asyncio.sleep(5)

        # 4. 等待 video_id（hook 已通过 add_init_script 注入）
        print(f"  [4] 等待 video_id + 转码...")
        video_id = None
        for i in range(180):
            vids = await page.evaluate("window.__dy_video_ids || []")
            if vids:
                video_id = vids[-1]
                print(f"  [4] ✓ video_id: {video_id}")
                break
            if i % 20 == 0 and i > 0:
                print(f"      ...{i}s")
            await asyncio.sleep(1)

        if not video_id:
            # 从捕获的响应 URL 中提取
            resps = await page.evaluate("window.__dy_responses || []")
            for r in resps:
                import re
                m = re.search(r'video_id=(v0[a-zA-Z0-9]+)', r.get('url', ''))
                if m:
                    video_id = m.group(1)
                    print(f"  [4] ✓ video_id (from response URL): {video_id}")
                    break

        # 等待转码完成（再等一会）
        if video_id:
            await asyncio.sleep(10)

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

        # 6. 发布
        if video_id:
            print(f"  [5] 通过 fetch 调用 create_v2...")
            creation_id = random_creation_id()
            body = {
                "item": {
                    "common": {
                        "text": title,
                        "caption": title,
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
                        "timing": timing_ts if timing_ts > 0 else 0,
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

            resp_body = result.get("body", "")
            if resp_body:
                try:
                    parsed = json.loads(resp_body)
                    if parsed.get("status_code") == 0:
                        print(f"  [✓] API 发布成功！")
                        return True
                    else:
                        print(f"  [!] API 返回: {parsed.get('status_msg', resp_body[:100])}")
                except Exception:
                    pass

            print(f"  [!] API 发布失败，回退到浏览器...")

        # 回退：浏览器直接发布
        return await _browser_publish(page, title, timing_ts)

    except Exception as e:
        print(f"  [!] 异常: {e}")
        try:
            return await _browser_publish(page, title, timing_ts)
        except Exception as e2:
            print(f"  [!] 回退也失败: {e2}")
            return False
    finally:
        await page.close()


async def _browser_publish(page, title: str, timing_ts: int) -> bool:
    try:
        # 填标题
        nl = page.locator(".notranslate").first
        await nl.click(timeout=5000)
        await page.keyboard.press("Meta+KeyA")
        await page.keyboard.press("Delete")
        await page.keyboard.type(title[:50], delay=20)
        await asyncio.sleep(2)

        for attempt in range(8):
            try:
                pub = page.get_by_role("button", name="发布", exact=True)
                if await pub.count():
                    await pub.click()
                    print(f"  点击发布 (attempt {attempt+1})")

                await page.wait_for_url("**/content/manage**", timeout=12000)
                print(f"  [✓] 浏览器发布成功！")
                return True
            except Exception:
                try:
                    if await page.get_by_text("请设置封面后再发布").first.is_visible():
                        covers = page.locator('[class*="recommendCover"], [class*="cover-select"]')
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
                await asyncio.sleep(3)
        return False
    except Exception as e:
        print(f"  [!] 浏览器发布异常: {e}")
        return False


async def main():
    if not COOKIE_FILE.exists():
        print("[!] Cookie 不存在，请先运行 douyin_login.py")
        return 1

    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print("[!] 未找到视频")
        return 1
    print(f"[i] 共 {len(videos)} 条视频")

    now_ts = int(time.time())
    base_ts = ((now_ts + 3600) // 3600 + 1) * 3600

    schedule = []
    for i, vp in enumerate(videos):
        ts = base_ts + i * 3600
        title = get_title(vp.name)
        schedule.append((vp, title, ts))
        dt_str = datetime.fromtimestamp(ts).strftime("%m-%d %H:%M")
        print(f"  {i+1:2d}. {dt_str} | {vp.name[:50]}")

    print(f"\n[i] 启动浏览器...")
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=False,
            executable_path=CHROME if os.path.exists(CHROME) else None,
        )
        context = await browser.new_context(storage_state=str(COOKIE_FILE))
        if STEALTH_JS.exists():
            await context.add_init_script(path=str(STEALTH_JS))
        await context.add_init_script(script=HOOK_JS)

        # 验证 Cookie
        check = await context.new_page()
        await check.goto("https://creator.douyin.com/creator-micro/home",
                         wait_until="domcontentloaded", timeout=30000)
        if await check.get_by_text("手机号登录").count() or await check.get_by_text("扫码登录").count():
            print("[!] Cookie 失效")
            await browser.close()
            return 1
        await check.close()
        print("[✓] Cookie 有效\n")

        results = []
        for i, (vp, title, ts) in enumerate(schedule):
            ok = await publish_one(context, str(vp), title, ts, i + 1, len(schedule))
            results.append((vp.name, ok, ts))
            await context.storage_state(path=str(COOKIE_FILE))

            if i < len(schedule) - 1 and ok:
                print(f"  等待 10s...")
                await asyncio.sleep(10)

        await context.close()
        await browser.close()

    print(f"\n{'='*60}")
    print("  发布汇总")
    print(f"{'='*60}")
    for name, ok, ts in results:
        s = "✓" if ok else "✗"
        t = datetime.fromtimestamp(ts).strftime("%m-%d %H:%M")
        print(f"  [{s}] {t} | {name}")
    success = sum(1 for _, ok, _ in results if ok)
    print(f"\n  成功: {success}/{len(results)}")
    return 0 if success == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
