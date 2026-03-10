#!/usr/bin/env python3
"""
视频号发布 - Headless Playwright
上传 → 填描述 → 发表。视频号无公开API，Playwright为唯一方案。
"""
import asyncio
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "channels_storage_state.json"
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片")

sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
from publish_result import PublishResult

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)

TITLES = {
    "早起不是为了开派对，是不吵老婆睡觉.mp4":
        "每天6点起床不是因为自律，是因为老婆还在睡 #Soul派对 #创业日记",
    "懒人的活法 动作简单有利可图正反馈.mp4":
        "懒人也能赚钱？动作简单、有利可图、正反馈 #Soul派对 #副业思维",
    "初期团队先找两个IS，比钱好使 ENFJ链接人，ENTJ指挥.mp4":
        "创业初期先找两个IS型人格，比融资好使十倍 #MBTI创业 #团队搭建",
    "ICU出来一年多 活着要在互联网上留下东西.mp4":
        "ICU出来一年多，活着就要在互联网上留下东西 #人生感悟 #创业觉醒",
    "MBTI疗愈SOUL 年轻人测MBTI，40到60岁走五行八卦.mp4":
        "20岁测MBTI，40岁该学五行八卦了 #MBTI #认知觉醒",
    "Soul业务模型 派对+切片+小程序全链路.mp4":
        "派对获客→AI切片→小程序变现，全链路拆解 #商业模式 #一人公司",
    "Soul切片30秒到8分钟 AI半小时能剪10到30个.mp4":
        "AI剪辑半小时出10到30条切片，内容工厂效率密码 #AI剪辑 #内容效率",
    "刷牙听业务逻辑 Soul切片变现怎么跑.mp4":
        "刷牙3分钟听完一套变现逻辑 #碎片创业 #副业逻辑",
    "国学易经怎么学 两小时七七八八，召唤作者对话.mp4":
        "易经两小时学个七七八八，关键是跟古人对话 #国学 #易经入门",
    "广点通能投Soul了，1000曝光6到10块.mp4":
        "广点通能投Soul了！1000次曝光只要6到10块 #广点通 #低成本获客",
    "建立信任不是求来的 卖外挂发邮件三个月拿下德国总代.mp4":
        "信任不是求来的，发三个月邮件拿下德国总代理 #销售思维 #信任建立",
    "核心就两个字 筛选。能开派对坚持7天的人再谈.mp4":
        "核心就两个字：筛选。能坚持7天的人才值得深聊 #筛选思维 #创业认知",
    "睡眠不好？每天放下一件事，做减法.mp4":
        "睡不好不是太累，是脑子装太多，每天做减法 #做减法 #心理健康",
    "这套体系花了170万，但前端几十块就能参与.mp4":
        "后端花170万搭体系，前端几十块就能参与 #商业认知 #体系思维",
    "金融AI获客体系 后端30人沉淀12年，前端丢手机.mp4":
        "后端30人沉淀12年，前端就丢个手机号 #AI获客 #系统思维",
}


async def publish_one(video_path: str, title: str, idx: int = 1, total: int = 1, skip_dedup: bool = False) -> PublishResult:
    from playwright.async_api import async_playwright
    from publish_result import is_published

    fname = Path(video_path).name
    fsize = Path(video_path).stat().st_size
    t0 = time.time()
    print(f"\n[{idx}/{total}] {fname} ({fsize/1024/1024:.1f}MB)", flush=True)
    print(f"  标题: {title[:60]}", flush=True)

    if not skip_dedup and is_published("视频号", video_path):
        print(f"  [跳过] 该视频已发布到视频号", flush=True)
        return PublishResult(platform="视频号", video_path=video_path, title=title,
                           success=True, status="skipped", message="去重跳过（已发布）")

    if not COOKIE_FILE.exists():
        return PublishResult(platform="视频号", video_path=video_path, title=title,
                           success=False, status="error", message="Cookie 不存在")

    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True,
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

            print("  [1] 打开发表页...", flush=True)
            await page.goto(
                "https://channels.weixin.qq.com/platform/post/create",
                timeout=30000, wait_until="domcontentloaded",
            )
            await asyncio.sleep(5)

            print("  [2] 上传视频...", flush=True)
            fl = page.locator('input[type="file"][accept*="video"]').first
            await fl.set_input_files(video_path)
            print("  [2] 文件已选择", flush=True)

            # 等视频处理完（封面预览出现）
            for i in range(60):
                has_cover = await page.locator('text=封面预览').count() > 0
                has_delete = await page.locator('text=删除').count() > 0
                if has_cover or has_delete:
                    print(f"  [2] 上传完成 ({i*2}s)", flush=True)
                    break
                await asyncio.sleep(2)

            await asyncio.sleep(2)

            print("  [3] 填写描述...", flush=True)
            desc_filled = False
            # 尝试点击"添加描述"占位符区域
            add_desc = page.locator('text=添加描述').first
            if await add_desc.count() > 0:
                await add_desc.click()
                await asyncio.sleep(0.5)
                active = page.locator('[contenteditable="true"]:visible').first
                if await active.count() > 0:
                    await active.fill(title)
                    desc_filled = True
                else:
                    await page.keyboard.type(title, delay=20)
                    desc_filled = True
            if not desc_filled:
                # JS 兜底
                await page.evaluate("""(title) => {
                    const els = document.querySelectorAll('[contenteditable="true"]');
                    for (const el of els) {
                        if (el.offsetParent !== null && el.closest('[class*="desc"]')) {
                            el.focus();
                            el.textContent = title;
                            el.dispatchEvent(new Event('input', {bubbles:true}));
                            return;
                        }
                    }
                    // fallback: 可见的 textarea
                    const ta = [...document.querySelectorAll('textarea')].find(
                        t => t.offsetParent !== null && t.placeholder.includes('描述')
                    );
                    if (ta) { ta.value = title; ta.dispatchEvent(new Event('input', {bubbles:true})); }
                }""", title)
            await asyncio.sleep(0.5)

            # 滚动到底部找发表按钮
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(1)

            print("  [4] 发表...", flush=True)
            pub = page.locator('button:has-text("发表")').first
            if await pub.count() > 0:
                await pub.click()
            else:
                await page.evaluate("""() => {
                    const b = [...document.querySelectorAll('button')];
                    const p = b.find(e => e.textContent.includes('发表'));
                    if (p) p.click();
                }""")

            await asyncio.sleep(3)

            # 处理"声明原创"弹窗 → 选"直接发表"
            direct_pub = page.locator('button:has-text("直接发表")').first
            if await direct_pub.count() > 0:
                print("  [4b] 原创弹窗 → 直接发表", flush=True)
                try:
                    await direct_pub.click(force=True, timeout=5000)
                except Exception:
                    await page.evaluate("""() => {
                        const btns = [...document.querySelectorAll('button')];
                        const b = btns.find(e => e.textContent.includes('直接发表'));
                        if (b) b.click();
                    }""")
                await asyncio.sleep(5)

            await page.screenshot(path="/tmp/channels_result.png")
            txt = await page.evaluate("document.body.innerText")
            url = page.url
            elapsed = time.time() - t0

            if "发表成功" in txt or "已发表" in txt or "成功" in txt:
                status, msg = "published", "发表成功"
            elif "/platform/post/list" in url or ("内容管理" in txt and "视频" in txt):
                status, msg = "reviewing", "已跳转到内容管理（发表成功）"
            else:
                status, msg = "reviewing", "已提交，请确认截图"

            result = PublishResult(
                platform="视频号", video_path=video_path, title=title,
                success=True, status=status, message=msg,
                screenshot="/tmp/channels_result.png", elapsed_sec=elapsed,
            )
            print(f"  {result.log_line()}", flush=True)
            await ctx.storage_state(path=str(COOKIE_FILE))
            await browser.close()
            return result

    except Exception as e:
        return PublishResult(platform="视频号", video_path=video_path, title=title,
                           success=False, status="error",
                           message=f"异常: {str(e)[:80]}", elapsed_sec=time.time()-t0)


async def main():
    from publish_result import print_summary, save_results

    if not COOKIE_FILE.exists():
        print("[✗] Cookie 不存在")
        return 1

    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print("[✗] 未找到视频")
        return 1
    print(f"共 {len(videos)} 条视频\n")

    results = []
    for i, vp in enumerate(videos):
        t = TITLES.get(vp.name, f"{vp.stem} #Soul派对 #创业日记")
        r = await publish_one(str(vp), t, i + 1, len(videos))
        results.append(r)
        if i < len(videos) - 1:
            await asyncio.sleep(5)

    actual = [r for r in results if r.status != "skipped"]
    print_summary(actual)
    save_results(actual)
    ok = sum(1 for r in actual if r.success)
    return 0 if ok == len(actual) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
