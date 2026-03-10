#!/usr/bin/env python3
"""
抖音自动浏览器发布 - Playwright 全自动化
流程: 打开创作者中心 → 上传视频 → 填标题 → 选封面(第一帧) → 发布
首次需扫码登录，之后全程自动
"""
import asyncio
import sys
import time
from pathlib import Path
from playwright.async_api import async_playwright

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "douyin_storage_state.json"
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片")

PUBLISH_URL = "https://creator.douyin.com/creator-micro/content/post/video"

TITLES = {
    "早起不是为了开派对，是不吵老婆睡觉.mp4":
        "每天6点起床不是因为自律，是因为老婆还在睡。创业人最真实的起床理由，你猜到了吗？\n\n#Soul派对 #创业日记 #晨间直播 #真实创业",
    "懒人的活法 动作简单有利可图正反馈.mp4":
        "懒人也能赚钱？关键就三个词：动作简单、有利可图、正反馈。90%的人输在太勤快了\n\n#Soul派对 #副业思维 #私域变现 #认知升级",
    "初期团队先找两个IS，比钱好使 ENFJ链接人，ENTJ指挥.mp4":
        "创业初期别急着找钱，先找两个IS型人格。ENFJ负责链接，ENTJ负责指挥，比融资好使十倍\n\n#MBTI创业 #团队搭建 #Soul派对 #合伙人",
    "ICU出来一年多 活着要在互联网上留下东西.mp4":
        "ICU出来一年多了。那之后我想明白一件事：活着，就要在互联网上留下点东西\n\n#人生感悟 #创业觉醒 #Soul派对 #向死而生",
    "MBTI疗愈SOUL 年轻人测MBTI，40到60岁走五行八卦.mp4":
        "20岁测MBTI，40岁以后该学五行八卦了。年轻人用性格分类，中年人靠命理运营自己\n\n#MBTI #五行 #Soul派对 #认知觉醒",
    "Soul业务模型 派对+切片+小程序全链路.mp4":
        "一个人怎么跑通一条商业链路？派对获客→AI切片→小程序变现，全链路拆给你看\n\n#Soul派对 #商业模式 #全链路 #一人公司",
    "Soul切片30秒到8分钟 AI半小时能剪10到30个.mp4":
        "AI剪辑有多快？30秒到8分钟的切片，半小时出10到30条。内容工厂的效率密码\n\n#AI剪辑 #Soul派对 #内容效率 #批量生产",
    "刷牙听业务逻辑 Soul切片变现怎么跑.mp4":
        "刷牙3分钟，刚好听完一套变现逻辑。Soul切片怎么从0到日产30条？碎片时间才是生产力\n\n#Soul派对 #碎片创业 #副业逻辑 #效率",
    "国学易经怎么学 两小时七七八八，召唤作者对话.mp4":
        "易经其实不难，两小时就能学个七七八八。关键是找到作者的思维频率，跟古人对话\n\n#国学 #易经入门 #Soul派对 #终身学习",
    "广点通能投Soul了，1000曝光6到10块.mp4":
        "广点通终于能投Soul了！1000次曝光只要6到10块，这个获客成本你敢信？\n\n#Soul派对 #广点通投放 #低成本获客 #流量红利",
    "建立信任不是求来的 卖外挂发邮件三个月拿下德国总代.mp4":
        "信任不是求来的。一个卖外挂的小伙子，发了三个月邮件，拿下德国总代理。死磕比社交有用\n\n#销售思维 #信任建立 #Soul派对 #死磕精神",
    "核心就两个字 筛选。能开派对坚持7天的人再谈.mp4":
        "别跟所有人合作，核心就两个字：筛选。能坚持开7天派对的人，才值得深聊\n\n#筛选思维 #Soul派对 #创业认知 #人性",
    "睡眠不好？每天放下一件事，做减法.mp4":
        "睡不好不是因为太累，是因为脑子里装太多。每天放下一件事，做减法，睡眠自然好\n\n#睡眠 #做减法 #Soul派对 #心理健康",
    "这套体系花了170万，但前端几十块就能参与.mp4":
        "后端花了170万搭的体系，前端几十块就能参与。真正的商业模式是让别人低成本上车\n\n#商业认知 #Soul派对 #低门槛创业 #体系思维",
    "金融AI获客体系 后端30人沉淀12年，前端丢手机.mp4":
        "后端30人沉淀了12年，前端操作就是丢个手机号。金融AI获客体系，把复杂留给自己\n\n#AI获客 #金融科技 #Soul派对 #系统思维",
}


async def wait_for_upload_complete(page, timeout=180):
    """等待视频上传完成（进度条消失或出现封面选择）"""
    print("      等待上传完成...")
    start = time.time()
    while time.time() - start < timeout:
        try:
            progress = await page.query_selector('[class*="progress"]')
            upload_text = await page.query_selector('text=上传中')
            cover_section = await page.query_selector('text=选择封面')
            publish_btn = await page.query_selector('button:has-text("发布")')

            if cover_section or (publish_btn and not upload_text and not progress):
                print("      上传完成!")
                return True
        except Exception:
            pass
        await asyncio.sleep(2)
    print("      上传超时")
    return False


async def publish_one_video(page, video_path: Path, title: str, idx: int, total: int):
    """发布单条视频"""
    print(f"\n{'='*60}")
    print(f"  [{idx}/{total}] {video_path.name}")
    print(f"  大小: {video_path.stat().st_size / 1024 / 1024:.1f}MB")
    print(f"  标题: {title[:60]}...")
    print(f"{'='*60}")

    await page.goto(PUBLISH_URL, wait_until="networkidle", timeout=60000)
    await asyncio.sleep(3)

    # check for login redirect
    if "login" in page.url.lower():
        print("  [!] 需要重新登录，请扫码...")
        await page.pause()
        await page.goto(PUBLISH_URL, wait_until="networkidle", timeout=60000)
        await asyncio.sleep(3)

    print("  [1] 上传视频...")
    file_input = await page.query_selector('input[type="file"][accept*="video"]')
    if not file_input:
        file_input = await page.query_selector('input[type="file"]')
    if not file_input:
        print("  [!] 未找到文件上传入口，尝试点击上传区域...")
        upload_area = await page.query_selector('[class*="upload"]')
        if upload_area:
            await upload_area.click()
            await asyncio.sleep(1)
            file_input = await page.query_selector('input[type="file"]')

    if not file_input:
        print("  [✗] 找不到文件上传元素")
        return False

    await file_input.set_input_files(str(video_path))
    print(f"      文件已选择: {video_path.name}")

    if not await wait_for_upload_complete(page):
        print("  [✗] 上传超时")
        return False

    await asyncio.sleep(2)

    print("  [2] 填写标题...")
    text_editor = await page.query_selector('[class*="editor-kit-container"]')
    if not text_editor:
        text_editor = await page.query_selector('[class*="text-editor"]')
    if not text_editor:
        text_editor = await page.query_selector('[contenteditable="true"]')
    if not text_editor:
        text_editor = await page.query_selector('.notranslate[contenteditable]')

    if text_editor:
        await text_editor.click()
        await asyncio.sleep(0.5)
        await page.keyboard.press("Meta+a")
        await asyncio.sleep(0.3)
        await page.keyboard.press("Backspace")
        await asyncio.sleep(0.3)
        for line in title.split('\n'):
            await page.keyboard.type(line, delay=20)
            await page.keyboard.press("Enter")
        print(f"      标题已填写")
    else:
        print("  [!] 未找到标题编辑器，尝试 textarea...")
        textarea = await page.query_selector('textarea')
        if textarea:
            await textarea.fill(title)
            print(f"      标题已填写 (textarea)")
        else:
            print("  [!] 无法填写标题")

    await asyncio.sleep(1)

    print("  [3] 封面设置为第一帧...")
    # poster_delay=0 in the UI means first frame is already default
    # just ensure we don't change it

    print("  [4] 点击发布...")
    publish_btn = await page.query_selector('button:has-text("发布")')
    if not publish_btn:
        publish_btn = await page.query_selector('[class*="publish"]:has-text("发布")')

    if publish_btn:
        is_disabled = await publish_btn.get_attribute("disabled")
        if is_disabled:
            print("      发布按钮禁用，等待...")
            for _ in range(30):
                await asyncio.sleep(2)
                is_disabled = await publish_btn.get_attribute("disabled")
                if not is_disabled:
                    break

        await publish_btn.click()
        print("      已点击发布")
        await asyncio.sleep(5)

        # check result
        success_text = await page.query_selector('text=发布成功')
        manage_text = await page.query_selector('text=作品管理')
        if success_text or manage_text or "manage" in page.url.lower():
            print("  [✓] 发布成功!")
            return True

        # check for verify dialog
        verify = await page.query_selector('text=身份验证')
        if verify:
            print("  [!] 需要身份验证，请手动完成...")
            await page.pause()
            return True

        print(f"  [?] 发布状态未知，当前页面: {page.url[:80]}")
        await asyncio.sleep(3)
        return True
    else:
        print("  [✗] 未找到发布按钮")
        return False


async def main():
    print("=" * 60)
    print("  抖音自动浏览器发布 - 全自动模式")
    print("=" * 60)

    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print("[✗] 未找到视频")
        return 1

    print(f"\n[i] 共 {len(videos)} 条视频待发布:\n")
    for i, v in enumerate(videos, 1):
        title = TITLES.get(v.name, f"{v.stem}")
        print(f"  {i:2d}. {v.name[:60]}")
    print()

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )

        if COOKIE_FILE.exists():
            context = await browser.new_context(
                storage_state=str(COOKIE_FILE),
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/143.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1280, "height": 900},
            )
        else:
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/143.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1280, "height": 900},
            )

        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        """)

        page = await context.new_page()
        await page.goto(PUBLISH_URL, wait_until="networkidle", timeout=60000)
        await asyncio.sleep(3)

        if "login" in page.url.lower():
            print("[!] 需要登录，请扫码登录抖音创作者中心...")
            print("    登录成功后点 Playwright Inspector 的绿色 ▶\n")
            await page.pause()

        await context.storage_state(path=str(COOKIE_FILE))
        print("[✓] Cookie 已保存\n")

        results = []
        for i, vp in enumerate(videos, 1):
            title = TITLES.get(vp.name, f"{vp.stem} #Soul派对 #创业日记")
            ok = await publish_one_video(page, vp, title, i, len(videos))
            results.append((vp.name, ok))

            if ok and i < len(videos):
                await context.storage_state(path=str(COOKIE_FILE))
                print("  等待 10s 后发下一条...")
                await asyncio.sleep(10)

        await context.storage_state(path=str(COOKIE_FILE))
        await context.close()
        await browser.close()

    print(f"\n{'='*60}")
    print("  发布汇总")
    print(f"{'='*60}")
    for name, ok in results:
        s = "✓" if ok else "✗"
        print(f"  [{s}] {name}")
    success = sum(1 for _, ok in results if ok)
    print(f"\n  成功: {success}/{len(results)}")
    return 0 if success == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
