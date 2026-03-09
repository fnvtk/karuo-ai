#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
抖音批量定时发布（Playwright 自动化）
1. 首次运行弹出浏览器让用户扫码登录，保存 cookie
2. 按每小时一条的节奏定时发布目录下所有 mp4
"""

import asyncio
import json
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path

# ── 万推 backend 路径 ───────────────────────────────────────
WANTUI_BACKEND = Path("/Users/karuo/Documents/开发/3、自营项目/万推/backend")
sys.path.insert(0, str(WANTUI_BACKEND))

from playwright.async_api import async_playwright
from utils.base_social_media import set_init_script

# ── 配置 ───────────────────────────────────────────────────
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片")
COOKIE_FILE = Path(__file__).parent / "douyin_storage_state.json"
CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
HOUR_INTERVAL = 1          # 每条间隔小时数
START_OFFSET_HOURS = 2     # 第一条从当前时间 +2h 开始（抖音要求 >=2h）

# ── 视频标题映射（文件名 → 标题+话题） ─────────────────────
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


def get_title(filename: str) -> str:
    if filename in TITLES:
        return TITLES[filename]
    stem = Path(filename).stem
    return f"{stem} #Soul派对 #创业日记 #卡若创业派对"


def parse_tags_from_title(title: str) -> list[str]:
    """从标题中提取 # 话题"""
    tags = []
    for part in title.split("#"):
        t = part.strip().split()[0] if part.strip() else ""
        if t and t != title.split("#")[0].strip():
            tags.append(t)
    return tags


# ── Cookie 管理 ──────────────────────────────────────────
async def ensure_cookie() -> bool:
    """检查 cookie 是否有效，无效则弹窗让用户登录"""
    if COOKIE_FILE.exists():
        valid = await check_cookie_valid()
        if valid:
            print("[✓] Cookie 有效，跳过登录")
            return True
        print("[!] Cookie 已失效，需要重新登录")

    print("\n" + "=" * 60)
    print("  即将弹出浏览器窗口，请在浏览器中扫码登录抖音")
    print("  登录成功后，在 Playwright Inspector 中点击绿色 ▶ 按钮")
    print("=" * 60 + "\n")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=False,
            executable_path=CHROME_PATH if os.path.exists(CHROME_PATH) else None,
        )
        context = await browser.new_context()
        context = await set_init_script(context)
        page = await context.new_page()
        await page.goto("https://creator.douyin.com/")
        await page.pause()  # 暂停等用户登录后点继续
        await context.storage_state(path=str(COOKIE_FILE))
        await context.close()
        await browser.close()

    print("[✓] Cookie 已保存")
    return True


async def check_cookie_valid() -> bool:
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(storage_state=str(COOKIE_FILE))
        context = await set_init_script(context)
        page = await context.new_page()
        try:
            await page.goto(
                "https://creator.douyin.com/creator-micro/content/upload",
                wait_until="domcontentloaded",
                timeout=30000,
            )
            await page.wait_for_url("**/creator.douyin.com/**/upload**", timeout=10000)
            await asyncio.sleep(3)
            if (
                await page.get_by_text("手机号登录").count()
                or await page.get_by_text("扫码登录").count()
            ):
                await context.close()
                await browser.close()
                return False
            await context.close()
            await browser.close()
            return True
        except Exception:
            await context.close()
            await browser.close()
            return False


# ── 辅助函数 ──────────────────────────────────────────────
async def dismiss_popups(page):
    """关闭抖音创作者中心可能出现的各种弹窗"""
    # "视频预览功能" 弹窗
    try:
        btn = page.get_by_text("我知道了", exact=True)
        if await btn.count() and await btn.first.is_visible():
            await btn.first.click()
            await asyncio.sleep(0.5)
            print("  [i] 关闭了视频预览功能弹窗")
    except Exception:
        pass

    # 话题下拉菜单 → Escape 关闭
    try:
        await page.keyboard.press("Escape")
        await asyncio.sleep(0.3)
    except Exception:
        pass

    # 日历弹窗 → 点击空白处
    try:
        await page.mouse.click(10, 10)
        await asyncio.sleep(0.3)
    except Exception:
        pass

    # "添加共创"提示弹窗 → 点击空白关闭
    try:
        tooltip = page.locator('[class*="tooltip"]').first
        if await tooltip.count() and await tooltip.is_visible():
            await page.mouse.click(10, 10)
            await asyncio.sleep(0.3)
    except Exception:
        pass

    # 任何 semi-modal 确认弹窗
    try:
        close_btn = page.locator('.semi-modal-close')
        if await close_btn.count() and await close_btn.first.is_visible():
            await close_btn.first.click()
            await asyncio.sleep(0.3)
    except Exception:
        pass


async def set_cover(page):
    """尝试设置封面（点击"选择封面"→ 选第一个推荐封面 → 完成）"""
    try:
        # 点击"选择封面"
        cover_btn = page.get_by_text("选择封面", exact=False)
        if not await cover_btn.count():
            return
        await cover_btn.first.click()
        await asyncio.sleep(2)

        # 等待封面弹窗
        modal = page.locator("div.dy-creator-content-modal")
        if not await modal.count():
            # 尝试另一种选择器
            modal = page.locator('[class*="modal"]')

        # 选择推荐的第一个封面
        recommend = page.locator('[class^="recommendCover-"]').first
        if await recommend.count():
            await recommend.click()
            await asyncio.sleep(1)
            print("  [i] 已选择推荐封面")
        else:
            # 备选：选择第一个可用封面图
            covers = page.locator('[class*="cover-item"], [class*="coverItem"]').first
            if await covers.count():
                await covers.click()
                await asyncio.sleep(1)

        # 点击"完成"按钮
        finish_btn = page.get_by_role("button", name="完成")
        if await finish_btn.count() and await finish_btn.first.is_visible():
            await finish_btn.first.click()
            await asyncio.sleep(1)
            print("  [✓] 封面设置完成")
        else:
            # 备选：按 Escape 关闭
            await page.keyboard.press("Escape")
            await asyncio.sleep(0.5)
    except Exception as e:
        print(f"  [i] 封面设置跳过: {e}")
        try:
            await page.keyboard.press("Escape")
        except Exception:
            pass


# ── 单条视频上传 ─────────────────────────────────────────
async def upload_one(
    video_path: str,
    title: str,
    tags: list[str],
    publish_date: datetime | None,
    idx: int,
    total: int,
) -> bool:
    print(f"\n{'─' * 60}")
    print(f"  [{idx}/{total}] {Path(video_path).name}")
    print(f"  标题: {title[:50]}...")
    if publish_date:
        print(f"  定时: {publish_date.strftime('%Y-%m-%d %H:%M')}")
    print(f"{'─' * 60}")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=False,
            executable_path=CHROME_PATH if os.path.exists(CHROME_PATH) else None,
        )
        context = await browser.new_context(storage_state=str(COOKIE_FILE))
        context = await set_init_script(context)
        page = await context.new_page()

        try:
            # 1. 打开上传页
            await page.goto(
                "https://creator.douyin.com/creator-micro/content/upload",
                wait_until="domcontentloaded",
                timeout=60000,
            )
            await page.wait_for_url("**/creator.douyin.com/**/upload**", timeout=60000)
            await page.wait_for_load_state("load", timeout=20000)
            try:
                await page.get_by_text("上传视频", exact=False).first.wait_for(
                    state="visible", timeout=15000
                )
            except Exception:
                pass
            await asyncio.sleep(3)

            # 2. 上传文件
            upload_selectors = [
                "input[type='file']",
                "div[class^='container'] input",
                "[class*='upload'] input[type='file']",
                "div[class*='upload'] input",
                "[class^='upload-btn-input']",
                "div.progress-div input",
            ]
            uploaded = False
            for selector in upload_selectors:
                try:
                    loc = page.locator(selector).first
                    await loc.wait_for(state="attached", timeout=5000)
                    await loc.set_input_files(video_path, timeout=120000)
                    print(f"  [✓] 文件已选择 (via {selector})")
                    uploaded = True
                    break
                except Exception:
                    continue
            if not uploaded:
                print("  [✗] 未找到上传输入框")
                return False

            # 3. 等待跳转到发布页
            for _ in range(120):
                try:
                    await page.wait_for_url(
                        "https://creator.douyin.com/creator-micro/content/publish?enter_from=publish_page",
                        timeout=2000,
                    )
                    print("  [✓] 进入发布页 v1")
                    break
                except Exception:
                    try:
                        await page.wait_for_url(
                            "https://creator.douyin.com/creator-micro/content/post/video?enter_from=publish_page",
                            timeout=2000,
                        )
                        print("  [✓] 进入发布页 v2")
                        break
                    except Exception:
                        await asyncio.sleep(1)
            else:
                print("  [✗] 等待发布页超时")
                return False

            await asyncio.sleep(5)

            # 4. 关闭可能的弹窗（多次尝试）
            for _ in range(3):
                await dismiss_popups(page)
                await asyncio.sleep(1)

            # 5. 填写标题（使用 placeholder 选择器，更稳定）
            title_filled = False
            title_sel = 'input[placeholder*="标题"]'
            try:
                title_el = page.locator(title_sel).first
                if await title_el.count() and await title_el.is_visible():
                    await title_el.click()
                    await title_el.fill(title[:30])
                    title_filled = True
            except Exception:
                pass
            if not title_filled:
                try:
                    title_el = page.locator("input.semi-input").first
                    await title_el.click()
                    await title_el.fill(title[:30])
                    title_filled = True
                except Exception as e:
                    print(f"  [!] 标题填写失败: {e}")
            if title_filled:
                print("  [✓] 标题已填写")

            # 6. 填写描述和话题（在 .zone-container / .notranslate 区域）
            desc_zone = page.locator(".zone-container")
            try:
                await desc_zone.click()
                await asyncio.sleep(0.3)
                # 先清空
                await page.keyboard.press("Meta+KeyA")
                await page.keyboard.press("Delete")
                await asyncio.sleep(0.2)
                # 写入标题全文（含话题标签）作为描述
                await page.keyboard.type(title, delay=20)
                await asyncio.sleep(0.5)
            except Exception as e:
                print(f"  [!] 描述填写异常: {e}")
            # 关闭话题下拉
            await page.keyboard.press("Escape")
            await asyncio.sleep(0.3)
            await page.mouse.click(10, 10)
            await asyncio.sleep(0.5)
            print("  [✓] 描述和话题已填写")

            # 7. 等待视频上传完毕
            for _ in range(180):
                try:
                    n = await page.locator(
                        '[class^="long-card"] div:has-text("重新上传")'
                    ).count()
                    if n > 0:
                        print("  [✓] 视频上传完毕")
                        break
                    if await page.locator(
                        'div.progress-div > div:has-text("上传失败")'
                    ).count():
                        print("  [!] 上传失败，重试")
                        await page.locator(
                            'div.progress-div [class^="upload-btn-input"]'
                        ).set_input_files(video_path)
                except Exception:
                    pass
                await asyncio.sleep(2)
            else:
                print("  [✗] 视频上传超时（6分钟）")

            # 8. 设置封面（选择智能推荐的第一个）
            await set_cover(page)

            # 9. 再次关闭弹窗
            await dismiss_popups(page)

            # 10. 定时发布
            if publish_date:
                try:
                    label = page.locator("[class^='radio']:has-text('定时发布')")
                    await label.click()
                    await asyncio.sleep(1)
                    date_str = publish_date.strftime("%Y-%m-%d %H:%M")
                    date_input = page.locator('.semi-input[placeholder="日期和时间"]')
                    await date_input.click()
                    await asyncio.sleep(0.5)
                    # 使用 Meta+A（macOS 全选）清空
                    await page.keyboard.press("Meta+KeyA")
                    await page.keyboard.type(date_str)
                    await page.keyboard.press("Enter")
                    await asyncio.sleep(1)
                    # 点击空白处关闭日历
                    await page.mouse.click(10, 10)
                    await asyncio.sleep(0.5)
                    print(f"  [✓] 定时发布设置: {date_str}")
                except Exception as e:
                    print(f"  [!] 定时设置失败: {e}，将立即发布")

            # 11. 同步到今日头条/西瓜
            try:
                third = '[class^="info"] > [class^="first-part"] div div.semi-switch'
                if await page.locator(third).count():
                    cls = await page.eval_on_selector(third, "div => div.className")
                    if "semi-switch-checked" not in cls:
                        await page.locator(third).locator(
                            "input.semi-switch-native-control"
                        ).click()
            except Exception:
                pass

            # 12. 最终关闭所有弹窗再发布
            await dismiss_popups(page)
            await asyncio.sleep(1)

            # 13. 点击发布
            published = False
            for attempt in range(20):
                try:
                    if attempt < 2:
                        ss_path = Path(__file__).parent / f"pre_publish_{idx}_a{attempt}.png"
                        await page.screenshot(path=str(ss_path), full_page=True)
                        print(f"  [i] 截图: {ss_path.name}")

                    btn = page.get_by_role("button", name="发布", exact=True)
                    btn_count = await btn.count()
                    if btn_count:
                        await btn.scroll_into_view_if_needed()
                        await asyncio.sleep(0.3)
                        await btn.click()
                        print(f"  [i] 已点击发布 (attempt {attempt+1})")
                    try:
                        await page.wait_for_url(
                            "https://creator.douyin.com/creator-micro/content/manage**",
                            timeout=8000,
                        )
                        print("  [✓] 视频发布成功！")
                        published = True
                        break
                    except Exception:
                        cur = page.url
                        print(f"  [i] 未跳转，URL: {cur}")
                        sms_count = await page.get_by_text("验证码").count()
                        if sms_count:
                            print("  [!] 需要短信验证，截图保存")
                            ss = Path(__file__).parent / f"sms_{idx}.png"
                            await page.screenshot(path=str(ss), full_page=True)
                except Exception as e:
                    print(f"  [!] 异常: {e}")

                # 处理封面弹窗
                try:
                    if await page.get_by_text("请设置封面后再发布").first.is_visible():
                        print("  [i] 需要封面，自动选择")
                        await set_cover(page)
                except Exception:
                    pass
                # 关闭其他弹窗
                await dismiss_popups(page)
                await asyncio.sleep(3)

            if not published:
                print("  [!] 发布超时")
                ss_path = Path(__file__).parent / f"timeout_{idx}.png"
                await page.screenshot(path=str(ss_path), full_page=True)
                print(f"  截图: {ss_path}")

            # 保存更新后的 cookie
            await context.storage_state(path=str(COOKIE_FILE))

        except Exception as e:
            print(f"  [✗] 异常: {e}")
            ss_path = Path(__file__).parent / f"error_{idx}.png"
            try:
                await page.screenshot(path=str(ss_path), full_page=True)
            except Exception:
                pass
            return False
        finally:
            await context.close()
            await browser.close()

    return True


# ── 主流程 ──────────────────────────────────────────────
async def main():
    # 1. 确保 Cookie
    ok = await ensure_cookie()
    if not ok:
        print("[✗] 无法获取有效 Cookie，退出")
        return 1

    # 2. 收集视频列表
    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print("[✗] 未找到任何 mp4 文件")
        return 1
    print(f"\n[i] 共发现 {len(videos)} 条视频，准备批量发布\n")

    # 3. 计算定时发布时间
    now = datetime.now()
    base_time = now + timedelta(hours=START_OFFSET_HOURS)
    # 对齐到整点
    base_time = base_time.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)

    results = []
    for i, vp in enumerate(videos, 1):
        title = get_title(vp.name)
        tags = parse_tags_from_title(title)
        pub_time = base_time + timedelta(hours=(i - 1) * HOUR_INTERVAL)

        ok = await upload_one(
            video_path=str(vp),
            title=title,
            tags=tags,
            publish_date=pub_time,
            idx=i,
            total=len(videos),
        )
        results.append((vp.name, ok, pub_time))

        if i < len(videos):
            print("  ⏳ 等待 10 秒后处理下一条...")
            await asyncio.sleep(10)

    # 4. 汇总
    print("\n" + "=" * 60)
    print("  发布汇总")
    print("=" * 60)
    for name, ok, t in results:
        status = "✓" if ok else "✗"
        print(f"  [{status}] {t.strftime('%m-%d %H:%M')} | {name}")
    success = sum(1 for _, ok, _ in results if ok)
    print(f"\n  成功: {success}/{len(results)}")
    print("=" * 60)

    return 0 if success == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
