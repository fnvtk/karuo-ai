#!/usr/bin/env python3
"""
B站视频发布 — 纯 API 优先 + Playwright 兜底
方案一：bilibili-api-python 纯 API（无需浏览器）
方案二：Playwright 可见浏览器（API 失败时自动降级）
"""
import asyncio
import json
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "bilibili_storage_state.json"
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片")

sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
from publish_result import PublishResult, is_published

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)

TITLES = {
    "早起不是为了开派对，是不吵老婆睡觉.mp4":
        "每天6点起床不是因为自律，是因为老婆还在睡 #Soul派对 #创业日记 #小程序 卡若创业派对",
    "懒人的活法 动作简单有利可图正反馈.mp4":
        "懒人也能赚钱？动作简单、有利可图、正反馈 #Soul派对 #副业思维 #小程序 卡若创业派对",
    "初期团队先找两个IS，比钱好使 ENFJ链接人，ENTJ指挥.mp4":
        "创业初期先找两个IS型人格，比融资好使十倍 #MBTI创业 #团队搭建 #小程序 卡若创业派对",
    "ICU出来一年多 活着要在互联网上留下东西.mp4":
        "ICU出来一年多，活着就要在互联网上留下东西 #人生感悟 #创业觉醒 #小程序 卡若创业派对",
    "MBTI疗愈SOUL 年轻人测MBTI，40到60岁走五行八卦.mp4":
        "20岁测MBTI，40岁该学五行八卦了 #MBTI #认知觉醒 #小程序 卡若创业派对",
    "Soul业务模型 派对+切片+小程序全链路.mp4":
        "派对获客→AI切片→小程序变现，全链路拆解 #商业模式 #一人公司 #小程序 卡若创业派对",
    "Soul切片30秒到8分钟 AI半小时能剪10到30个.mp4":
        "AI剪辑半小时出10到30条切片，内容工厂效率密码 #AI剪辑 #内容效率 #小程序 卡若创业派对",
    "刷牙听业务逻辑 Soul切片变现怎么跑.mp4":
        "刷牙3分钟听完一套变现逻辑 #碎片创业 #副业逻辑 #小程序 卡若创业派对",
    "国学易经怎么学 两小时七七八八，召唤作者对话.mp4":
        "易经两小时学个七七八八，关键是跟古人对话 #国学 #易经入门 #小程序 卡若创业派对",
    "广点通能投Soul了，1000曝光6到10块.mp4":
        "广点通能投Soul了！1000次曝光只要6到10块 #广点通 #低成本获客 #小程序 卡若创业派对",
    "建立信任不是求来的 卖外挂发邮件三个月拿下德国总代.mp4":
        "信任不是求来的，发三个月邮件拿下德国总代理 #销售思维 #信任建立 #小程序 卡若创业派对",
    "核心就两个字 筛选。能开派对坚持7天的人再谈.mp4":
        "核心就两个字：筛选。能坚持7天的人才值得深聊 #筛选思维 #创业认知 #小程序 卡若创业派对",
    "睡眠不好？每天放下一件事，做减法.mp4":
        "睡不好不是太累，是脑子装太多，每天做减法 #做减法 #心理健康 #小程序 卡若创业派对",
    "这套体系花了170万，但前端几十块就能参与.mp4":
        "后端花170万搭体系，前端几十块就能参与 #商业认知 #体系思维 #小程序 卡若创业派对",
    "金融AI获客体系 后端30人沉淀12年，前端丢手机.mp4":
        "后端30人沉淀12年，前端就丢个手机号 #AI获客 #系统思维 #小程序 卡若创业派对",
}


def _load_credential():
    """从 storage_state.json 提取 B站凭证"""
    from bilibili_api import Credential
    with open(COOKIE_FILE, "r") as f:
        data = json.load(f)
    cookies = {c["name"]: c["value"] for c in data.get("cookies", [])
               if ".bilibili.com" in c.get("domain", "")}
    return Credential(
        sessdata=cookies.get("SESSDATA", ""),
        bili_jct=cookies.get("bili_jct", ""),
        buvid3=cookies.get("buvid3", ""),
        dedeuserid=cookies.get("DedeUserID", ""),
    )


async def _api_publish(video_path: str, title: str, scheduled_time=None) -> PublishResult:
    """方案一：bilibili-api-python 纯 API（支持定时发布）"""
    from bilibili_api import video_uploader
    from video_utils import extract_cover

    t0 = time.time()
    credential = _load_credential()

    cover_path = extract_cover(video_path)
    print(f"  [API] 封面已提取: {cover_path}", flush=True)

    tags = "Soul派对,创业,认知觉醒,副业,商业思维"
    meta = {
        "copyright": 1,
        "source": "",
        "desc": title,
        "desc_format_id": 0,
        "dynamic": "",
        "interactive": 0,
        "open_elec": 0,
        "no_reprint": 1,
        "subtitles": {"lan": "", "open": 0},
        "tag": tags,
        "tid": 160,  # 生活 > 日常
        "title": title[:80],
        "up_close_danmaku": False,
        "up_close_reply": False,
    }

    if scheduled_time:
        dtime = int(scheduled_time.timestamp())
        meta["dtime"] = dtime
        print(f"  [API] 定时发布: {scheduled_time.strftime('%Y-%m-%d %H:%M')}", flush=True)

    page = video_uploader.VideoUploaderPage(
        path=video_path,
        title=title[:80],
        description=title,
    )

    uploader = video_uploader.VideoUploader(
        pages=[page],
        meta=meta,
        credential=credential,
        cover=cover_path if cover_path else None,
    )

    last_event = {}

    @uploader.on("__ALL__")
    async def _on_event(data):
        nonlocal last_event
        last_event = data
        ev = data.get("event", "")
        if ev == "PRE_PAGE":
            print("  [API] 开始上传...", flush=True)
        elif ev == "PREUPLOAD_DONE":
            print("  [API] 预上传完成", flush=True)
        elif ev == "PRE_COVER":
            print("  [API] 上传封面...", flush=True)
        elif ev == "SUBMIT_DONE":
            print("  [API] 投稿提交完成!", flush=True)

    await uploader.start()
    elapsed = time.time() - t0

    return PublishResult(
        platform="B站",
        video_path=video_path,
        title=title,
        success=True,
        status="reviewing",
        message=f"纯API投稿成功 ({elapsed:.1f}s)",
        elapsed_sec=elapsed,
    )


async def _playwright_publish(video_path: str, title: str) -> PublishResult:
    """方案二：Playwright 可见浏览器（兜底）"""
    from playwright.async_api import async_playwright

    t0 = time.time()

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        ctx = await browser.new_context(
            storage_state=str(COOKIE_FILE), user_agent=UA,
            viewport={"width": 1280, "height": 900}, locale="zh-CN",
        )
        await ctx.add_init_script(
            "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
        )
        page = await ctx.new_page()

        await page.goto(
            "https://member.bilibili.com/platform/upload/video/frame",
            timeout=30000, wait_until="domcontentloaded",
        )
        await asyncio.sleep(3)

        fl = page.locator('input[type="file"]').first
        if await fl.count() == 0:
            await browser.close()
            return PublishResult(
                platform="B站", video_path=video_path, title=title,
                success=False, status="failed",
                message="Playwright: 未找到上传控件",
                elapsed_sec=time.time() - t0,
            )

        await fl.set_input_files(video_path)

        for i in range(120):
            txt = await page.evaluate("document.body.innerText")
            if "重新上传" in txt or "上传完成" in txt:
                break
            await asyncio.sleep(2)

        await asyncio.sleep(2)

        title_input = page.locator('input[maxlength="80"]').first
        if await title_input.count() > 0:
            await title_input.click()
            await title_input.fill(title[:80])

        try:
            original = page.locator('label:has-text("自制"), span:has-text("自制")').first
            if await original.count() > 0:
                await original.click()
        except Exception:
            pass

        try:
            cat_dd = page.locator('text=请选择分区').first
            if await cat_dd.count() > 0:
                await cat_dd.click()
                await asyncio.sleep(1)
                life = page.locator('.drop-cascader-item:has-text("生活")').first
                if await life.count() > 0:
                    await life.click()
                    await asyncio.sleep(0.5)
                daily = page.locator('span:has-text("日常"), li:has-text("日常")').first
                if await daily.count() > 0:
                    await daily.click()
        except Exception:
            pass

        try:
            tag_input = page.locator('input[placeholder*="标签"]').first
            if await tag_input.count() > 0:
                for tag in ["Soul派对", "创业", "认知觉醒"]:
                    await tag_input.fill(tag)
                    await tag_input.press("Enter")
                    await asyncio.sleep(0.3)
        except Exception:
            pass

        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await asyncio.sleep(1)

        submit = page.locator('button:has-text("立即投稿")').first
        if await submit.count() > 0:
            await submit.click()
        else:
            await page.evaluate("""() => {
                const b = [...document.querySelectorAll('button')].find(e => e.textContent.includes('立即投稿'));
                if (b) b.click();
            }""")

        for i in range(30):
            await asyncio.sleep(2)
            txt = await page.evaluate("document.body.innerText")
            url = page.url
            if "投稿成功" in txt or "稿件投递" in txt or "list" in url:
                await ctx.storage_state(path=str(COOKIE_FILE))
                await browser.close()
                return PublishResult(
                    platform="B站", video_path=video_path, title=title,
                    success=True, status="reviewing",
                    message=f"Playwright投稿成功 ({time.time()-t0:.1f}s)",
                    elapsed_sec=time.time() - t0,
                )

        await page.screenshot(path="/tmp/bilibili_result.png")
        await ctx.storage_state(path=str(COOKIE_FILE))
        await browser.close()
        return PublishResult(
            platform="B站", video_path=video_path, title=title,
            success=False, status="failed",
            message="Playwright: 投稿超时",
            screenshot="/tmp/bilibili_result.png",
            elapsed_sec=time.time() - t0,
        )


async def publish_one(video_path: str, title: str, idx: int = 1, total: int = 1, skip_dedup: bool = False, scheduled_time=None) -> PublishResult:
    """API 优先 → Playwright 兜底（支持定时发布）"""
    fname = Path(video_path).name
    fsize = Path(video_path).stat().st_size
    time_hint = f" → 定时 {scheduled_time.strftime('%H:%M')}" if scheduled_time else ""
    print(f"\n[{idx}/{total}] {fname} ({fsize/1024/1024:.1f}MB){time_hint}", flush=True)
    print(f"  标题: {title[:60]}", flush=True)

    if not skip_dedup and is_published("B站", video_path):
        print(f"  [跳过] 该视频已发布到B站", flush=True)
        return PublishResult(platform="B站", video_path=video_path, title=title,
                           success=True, status="skipped", message="去重跳过（已发布）")

    if not COOKIE_FILE.exists():
        return PublishResult(
            platform="B站", video_path=video_path, title=title,
            success=False, status="error", message="Cookie 不存在",
        )

    # 方案一：纯 API
    print("  [方案一] bilibili-api-python 纯 API...", flush=True)
    try:
        result = await _api_publish(video_path, title, scheduled_time)
        print(f"  {result.log_line()}", flush=True)
        return result
    except Exception as e:
        err_msg = str(e)[:100]
        print(f"  [方案一失败] {err_msg}", flush=True)

    # 方案二：Playwright 兜底
    print("  [方案二] 降级到 Playwright 可见浏览器...", flush=True)
    try:
        result = await _playwright_publish(video_path, title)
        print(f"  {result.log_line()}", flush=True)
        return result
    except Exception as e:
        return PublishResult(
            platform="B站", video_path=video_path, title=title,
            success=False, status="error",
            message=f"双方案均失败: {str(e)[:80]}",
        )


async def main():
    from cookie_manager import check_cookie_valid

    print("=== 账号预检 ===", flush=True)
    ok, info = check_cookie_valid("B站")
    print(f"  B站: {info}", flush=True)
    if not ok:
        print("[✗] 账号预检不通过，终止发布", flush=True)
        return 1
    print()

    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print("[✗] 未找到视频")
        return 1
    print(f"共 {len(videos)} 条视频\n")

    from publish_result import print_summary, save_results
    results = []
    for i, vp in enumerate(videos):
        t = TITLES.get(vp.name, f"{vp.stem} #Soul派对 #创业日记")
        r = await publish_one(str(vp), t, i + 1, len(videos))
        results.append(r)
        if i < len(videos) - 1:
            await asyncio.sleep(8)

    print_summary(results)
    save_results(results)
    ok = sum(1 for r in results if r.success)
    return 0 if ok == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
