#!/usr/bin/env python3
"""
抖音视频批量发布 - Playwright 方案 (基于万推架构)
流程: 打开创作者中心 → set_input_files 上传 → 填写标题/话题 → 定时发布 → 保存Cookie
"""
import asyncio
import os
import sys
import time
from datetime import datetime
from pathlib import Path

from playwright.async_api import async_playwright

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "douyin_storage_state.json"
STEALTH_JS = Path("/Users/karuo/Documents/开发/3、自营项目/万推/backend/utils/stealth.min.js")
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片")

CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
HEADLESS = False

TITLES = {
    "早起不是为了开派对，是不吵老婆睡觉.mp4":
        "早起不是为了开派对，是不吵老婆睡觉。#Soul派对 #创业日记 #晨间直播 #私域干货",
    "懒人的活法 动作简单有利可图正反馈.mp4":
        "懒有懒的活法：动作简单、有利可图、正反馈。#Soul派对 #副业 #私域 #切片变现",
    "初期团队先找两个IS，比钱好使 ENFJ链接人，ENTJ指挥.mp4":
        "初期团队先找两个IS，比钱好使。ENFJ链接人，ENTJ指挥。#MBTI #创业团队 #Soul派对",
    "ICU出来一年多 活着要在互联网上留下东西.mp4":
        "ICU出来一年多，活着要在互联网上留下东西。#人生感悟 #创业 #Soul派对 #记录生活",
    "MBTI疗愈SOUL 年轻人测MBTI，40到60岁走五行八卦.mp4":
        "年轻人测MBTI，40到60岁走五行八卦。#MBTI #Soul派对 #五行 #疗愈",
    "Soul业务模型 派对+切片+小程序全链路.mp4":
        "Soul业务模型：派对+切片+小程序全链路。#Soul派对 #商业模式 #私域运营 #小程序",
    "Soul切片30秒到8分钟 AI半小时能剪10到30个.mp4":
        "Soul切片30秒到8分钟，AI半小时能剪10到30个。#AI剪辑 #Soul派对 #切片变现",
    "刷牙听业务逻辑 Soul切片变现怎么跑.mp4":
        "刷牙听业务逻辑：Soul切片变现怎么跑。#Soul派对 #切片变现 #副业 #商业逻辑",
    "国学易经怎么学 两小时七七八八，召唤作者对话.mp4":
        "国学易经怎么学？两小时七七八八，召唤作者对话。#国学 #易经 #Soul派对",
    "广点通能投Soul了，1000曝光6到10块.mp4":
        "广点通能投Soul了，1000曝光6到10块。#Soul派对 #广点通 #流量投放 #私域获客",
    "建立信任不是求来的 卖外挂发邮件三个月拿下德国总代.mp4":
        "建立信任不是求来的。卖外挂发邮件三个月拿下德国总代。#销售 #信任 #Soul派对",
    "核心就两个字 筛选。能开派对坚持7天的人再谈.mp4":
        "核心就两个字：筛选。能开派对坚持7天的人再谈。#筛选 #Soul派对 #创业",
    "睡眠不好？每天放下一件事，做减法.mp4":
        "睡眠不好？每天放下一件事，做减法。#睡眠 #减法 #Soul派对 #生活方式",
    "这套体系花了170万，但前端几十块就能参与.mp4":
        "这套体系花了170万，但前端几十块就能参与。#商业体系 #Soul派对 #私域",
    "金融AI获客体系 后端30人沉淀12年，前端丢手机.mp4":
        "金融AI获客体系：后端30人沉淀12年，前端丢手机。#AI获客 #金融 #Soul派对",
}


def get_title(filename: str) -> str:
    return TITLES.get(filename, f"{Path(filename).stem} #Soul派对 #创业日记 #卡若创业派对")


async def publish_one(video_path: str, title: str, publish_date: datetime | None, idx: int, total: int) -> bool:
    """上传并发布单条视频"""
    print(f"\n{'='*60}")
    print(f"  [{idx+1}/{total}] {Path(video_path).name}")
    print(f"  标题: {title[:50]}")
    if publish_date:
        print(f"  定时: {publish_date.strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*60}")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=HEADLESS,
            executable_path=CHROME_PATH if os.path.exists(CHROME_PATH) else None,
        )
        context = await browser.new_context(storage_state=str(COOKIE_FILE))
        if STEALTH_JS.exists():
            await context.add_init_script(path=str(STEALTH_JS))

        page = await context.new_page()

        try:
            # 1. 打开上传页
            print("  [1] 打开上传页...")
            await page.goto(
                "https://creator.douyin.com/creator-micro/content/upload",
                wait_until="domcontentloaded", timeout=60000,
            )
            await page.wait_for_url("**/creator.douyin.com/**/upload**", timeout=60000)
            await page.wait_for_load_state("load", timeout=20000)

            # 检查登录状态
            if await page.get_by_text("手机号登录").count() or await page.get_by_text("扫码登录").count():
                print("  [!] Cookie 失效，需重新登录")
                return False

            try:
                await page.get_by_text("上传视频", exact=False).first.wait_for(state="visible", timeout=15000)
            except Exception:
                pass
            await asyncio.sleep(3)

            # 2. 上传文件
            print("  [2] 上传视频文件...")
            upload_selectors = [
                "input[type='file']",
                "div[class^='container'] input",
                "[class*='upload'] input[type='file']",
                "[class^='upload-btn-input']",
            ]
            uploaded = False
            for sel in upload_selectors:
                try:
                    loc = page.locator(sel).first
                    await loc.wait_for(state="attached", timeout=5000)
                    await loc.set_input_files(video_path, timeout=60000)
                    print(f"    上传成功 (选择器: {sel})")
                    uploaded = True
                    break
                except Exception:
                    continue
            if not uploaded:
                print("  [!] 未找到上传 input")
                return False

            # 3. 等待页面跳转到发布页
            print("  [3] 等待进入发布页...")
            for _ in range(120):
                try:
                    await page.wait_for_url(
                        "https://creator.douyin.com/creator-micro/content/publish*",
                        timeout=2000,
                    )
                    print("    进入发布页 (v1)")
                    break
                except Exception:
                    try:
                        await page.wait_for_url(
                            "https://creator.douyin.com/creator-micro/content/post/video*",
                            timeout=2000,
                        )
                        print("    进入发布页 (v2)")
                        break
                    except Exception:
                        pass
            else:
                print("  [!] 等待发布页超时")
                ss = SCRIPT_DIR / f"timeout_nav_{idx}.png"
                await page.screenshot(path=str(ss), full_page=True)
                return False

            await asyncio.sleep(3)

            # 4. 填写标题
            print("  [4] 填写标题...")
            title_text = title[:30]
            title_filled = False

            # 方式A: 万推的方式 - 通过"作品标题"文本定位
            try:
                tc = page.get_by_text("作品标题").locator("..").locator("xpath=following-sibling::div[1]").locator("input")
                if await tc.count():
                    await tc.fill(title_text)
                    title_filled = True
                    print("    标题填写成功 (方式A)")
            except Exception:
                pass

            # 方式B: .notranslate 区域
            if not title_filled:
                try:
                    tc = page.locator(".notranslate").first
                    await tc.click(timeout=5000)
                    await page.keyboard.press("Meta+KeyA")
                    await page.keyboard.press("Delete")
                    await page.keyboard.type(title_text, delay=20)
                    await page.keyboard.press("Enter")
                    title_filled = True
                    print("    标题填写成功 (方式B)")
                except Exception:
                    pass

            # 方式C: 直接 JS 注入
            if not title_filled:
                try:
                    await page.evaluate(f'''() => {{
                        const inp = document.querySelector('input[placeholder*="标题"]') || document.querySelector('input.semi-input');
                        if (inp) {{ inp.value = {repr(title_text)}; inp.dispatchEvent(new Event('input', {{bubbles:true}})); }}
                    }}''')
                    title_filled = True
                    print("    标题填写成功 (方式C: JS注入)")
                except Exception as e:
                    print(f"    [!] 标题填写全部失败: {e}")

            # 5. 填写话题
            print("  [5] 填写话题...")
            tags = [t.strip() for t in title.split("#") if t.strip() and len(t.strip()) < 20]
            if tags:
                tags = tags[1:]  # 第一个通常是标题文本
            try:
                zone = page.locator(".zone-container")
                for tag in tags[:5]:
                    await zone.type(f"#{tag} ", delay=30)
                    await asyncio.sleep(0.3)
                # 关闭话题下拉
                await page.keyboard.press("Escape")
                await asyncio.sleep(0.3)
                await page.mouse.click(10, 10)
                print(f"    已添加 {min(len(tags), 5)} 个话题")
            except Exception as e:
                print(f"    话题填写跳过: {e}")

            # 6. 等待视频上传完成
            print("  [6] 等待视频上传完成...")
            for _ in range(120):
                try:
                    n = await page.locator('[class^="long-card"] div:has-text("重新上传")').count()
                    if n > 0:
                        print("    视频上传完毕")
                        break
                except Exception:
                    pass
                await asyncio.sleep(2)
            else:
                print("    [!] 视频上传等待超时，继续尝试发布...")

            # 7. 定时发布
            if publish_date:
                print(f"  [7] 设置定时发布: {publish_date.strftime('%Y-%m-%d %H:%M')}...")
                try:
                    label = page.locator("[class^='radio']:has-text('定时发布')")
                    await label.click(timeout=5000)
                    await asyncio.sleep(1)
                    date_str = publish_date.strftime("%Y-%m-%d %H:%M")
                    date_input = page.locator('.semi-input[placeholder="日期和时间"]')
                    await date_input.click(timeout=5000)
                    await page.keyboard.press("Meta+KeyA")
                    await page.keyboard.type(date_str)
                    await page.keyboard.press("Enter")
                    await asyncio.sleep(1)
                    print(f"    定时已设置")
                except Exception as e:
                    print(f"    [!] 定时设置失败: {e}")

            # 8. 点击发布
            print("  [8] 点击发布...")
            published = False
            for attempt in range(30):
                try:
                    pub_btn = page.get_by_role("button", name="发布", exact=True)
                    if await pub_btn.count():
                        await pub_btn.click()
                    await page.wait_for_url(
                        "https://creator.douyin.com/creator-micro/content/manage**",
                        timeout=5000,
                    )
                    print("  [OK] 视频发布成功！")
                    published = True
                    break
                except Exception:
                    # 处理封面弹窗
                    try:
                        if await page.get_by_text("请设置封面后再发布").first.is_visible():
                            print("    需要封面，自动选择...")
                            cover = page.locator('[class^="recommendCover-"]').first
                            if await cover.count():
                                await cover.click()
                                await asyncio.sleep(1)
                                if await page.get_by_text("是否确认应用此封面？").first.is_visible():
                                    await page.get_by_role("button", name="确定").click()
                                    await asyncio.sleep(1)
                    except Exception:
                        pass
                    await asyncio.sleep(2)

            if not published:
                print("  [!] 发布超时")
                ss = SCRIPT_DIR / f"timeout_publish_{idx}.png"
                await page.screenshot(path=str(ss), full_page=True)

            # 9. 保存 Cookie
            await context.storage_state(path=str(COOKIE_FILE))
            print("  Cookie 已更新")

            return published

        except Exception as e:
            print(f"  [!] 异常: {e}")
            ss = SCRIPT_DIR / f"error_{idx}.png"
            try:
                await page.screenshot(path=str(ss), full_page=True)
            except Exception:
                pass
            return False
        finally:
            await context.close()
            await browser.close()


async def main():
    if not COOKIE_FILE.exists():
        print("[!] Cookie 不存在，请先运行 douyin_login.py")
        return 1

    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print("[!] 未找到视频")
        return 1
    print(f"[i] 共 {len(videos)} 条视频待发布\n")

    # 定时规划: 从当前+2h开始，每小时一条
    now_ts = int(time.time())
    base_ts = ((now_ts + 2 * 3600) // 3600 + 1) * 3600

    results = []
    for i, vp in enumerate(videos):
        title = get_title(vp.name)
        schedule_time = datetime.fromtimestamp(base_ts + i * 3600)

        ok = await publish_one(
            video_path=str(vp),
            title=title,
            publish_date=schedule_time,
            idx=i,
            total=len(videos),
        )
        results.append((vp.name, ok, schedule_time))

        if i < len(videos) - 1:
            wait = 10 if ok else 5
            print(f"  等待 {wait} 秒后继续...")
            await asyncio.sleep(wait)

    # 汇总
    print(f"\n{'='*60}")
    print("  发布汇总")
    print(f"{'='*60}")
    for name, ok, t in results:
        s = "OK" if ok else "FAIL"
        print(f"  [{s:4s}] {t.strftime('%m-%d %H:%M')} | {name}")
    success = sum(1 for _, ok, _ in results if ok)
    print(f"\n  成功: {success}/{len(results)}")
    return 0 if success == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
