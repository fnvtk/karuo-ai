#!/usr/bin/env python3
"""
快手视频发布 - Headless Playwright
上传 → 填标题/描述 → 发布
"""
import asyncio
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "kuaishou_storage_state.json"
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 120场 20260320_output/成片")

sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
from publish_result import PublishResult

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)

TITLES = {
    "AI最大的缺点是上下文太短，这样来解决.mp4":
        "AI的短板是记忆太短，上下文一长就废了，这个方法能解决 #AI工具 #效率提升 #小程序 卡若创业派对",
    "AI每天剪1000个视频 M4电脑24T素材库全网分发.mp4":
        "M4芯片+24T素材库，AI每天剪1000条视频自动全网分发 #AI剪辑 #内容工厂 #小程序 卡若创业派对",
    "Soul派对变现全链路 发视频就有钱，后端全解决.mp4":
        "Soul派对怎么赚钱？发视频就有收益，后端体系全部搞定 #Soul派对 #副业收入 #小程序 卡若创业派对",
    "从0到切片发布 AI自动完成每天副业30条视频.mp4":
        "从零到切片发布，AI全自动完成，每天副业产出30条视频 #AI副业 #切片分发 #小程序 卡若创业派对",
    "做副业的基本条件 苹果电脑和特殊访问工具.mp4":
        "做副业的两个基本条件：一台Mac和一个上网工具 #副业入门 #工具推荐 #小程序 卡若创业派对",
    "切片分发全自动化 从视频到发布一键完成.mp4":
        "从录制到发布全自动化，一键切片分发五大平台 #自动化 #内容分发 #小程序 卡若创业派对",
    "创业团队4人平分25有啥危险 先跑钱再谈股权.mp4":
        "创业团队4人平分25%股权有啥风险？先跑出收入再谈分配 #创业股权 #团队管理 #小程序 卡若创业派对",
    "坚持到120场是什么感觉 方向越确定执行越坚决.mp4":
        "坚持到第120场派对是什么感觉？方向越清晰执行越坚决 #Soul派对 #坚持的力量 #小程序 卡若创业派对",
    "帮人装AI一单300到1000块，传统行业也能做.mp4":
        "帮传统行业的人装AI工具，一单收300到1000块，简单好做 #AI服务 #传统行业 #小程序 卡若创业派对",
    "深度AI模型对比 哪个才是真正的AI不是语言模型.mp4":
        "深度对比各大AI模型，哪个才是真正的智能而不只是语言模型 #AI对比 #深度思考 #小程序 卡若创业派对",
    "疗愈师配AI助手能收多少钱 一个小团队5万到10万.mp4":
        "疗愈师+AI助手组合，一个小团队月收5万到10万 #AI赋能 #疗愈商业 #小程序 卡若创业派对",
    "赚钱没那么复杂，自信心才是核心问题.mp4":
        "赚钱真没那么复杂，自信心才是卡住你的核心问题 #创业心态 #自信 #小程序 卡若创业派对",
}


async def publish_one(video_path: str, title: str, idx: int = 1, total: int = 1, skip_dedup: bool = False, scheduled_time=None) -> PublishResult:
    from playwright.async_api import async_playwright
    from publish_result import is_published

    fname = Path(video_path).name
    fsize = Path(video_path).stat().st_size
    t0 = time.time()
    time_hint = f" → 定时 {scheduled_time.strftime('%H:%M')}" if scheduled_time else ""
    print(f"\n[{idx}/{total}] {fname} ({fsize/1024/1024:.1f}MB){time_hint}", flush=True)
    print(f"  标题: {title[:60]}", flush=True)

    if not skip_dedup and is_published("快手", video_path):
        print(f"  [跳过] 该视频已发布到快手", flush=True)
        return PublishResult(platform="快手", video_path=video_path, title=title,
                           success=True, status="skipped", message="去重跳过（已发布）")

    if not COOKIE_FILE.exists():
        return PublishResult(platform="快手", video_path=video_path, title=title,
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

            print("  [1] 打开创作者中心...", flush=True)
            await page.goto(
                "https://cp.kuaishou.com/article/publish/video",
                timeout=30000, wait_until="domcontentloaded",
            )
            await asyncio.sleep(5)

            txt = await page.evaluate("document.body.innerText")
            if "立即登录" in txt and "发布作品" not in txt:
                await browser.close()
                return PublishResult(platform="快手", video_path=video_path, title=title,
                                   success=False, status="error",
                                   message="未登录，请重新运行 kuaishou_login.py",
                                   error_code="NOT_LOGGED_IN", elapsed_sec=time.time()-t0)

            # 处理"上次未发布的视频"草稿提示
            discard = page.locator('text=放弃').first
            if await discard.count() > 0:
                await discard.click(force=True)
                print("  [1b] 已放弃上次草稿", flush=True)
                await asyncio.sleep(2)

            print("  [2] 上传视频...", flush=True)
            fl = page.locator('input[type="file"]').first
            if await fl.count() > 0:
                await fl.set_input_files(video_path)
                print("  [2] 文件已选择", flush=True)
            else:
                await browser.close()
                return PublishResult(platform="快手", video_path=video_path, title=title,
                                   success=False, status="error",
                                   message="未找到上传控件", error_code="NO_UPLOAD_INPUT",
                                   elapsed_sec=time.time()-t0)

            # 等待上传完成
            for i in range(90):
                txt = await page.evaluate("document.body.innerText")
                if "重新上传" in txt or "封面" in txt or "替换" in txt:
                    print(f"  [2] 上传完成 ({i*2}s)", flush=True)
                    break
                await asyncio.sleep(2)

            await asyncio.sleep(2)

            print("  [3] 填写描述...", flush=True)
            # 快手作品描述是 contenteditable div（class 含 _description_）
            desc = page.locator('[contenteditable="true"]:visible').first
            if await desc.count() > 0:
                await desc.click(force=True)
                await asyncio.sleep(0.3)
                await page.keyboard.type(title, delay=10)
                print("  [3] 描述已填", flush=True)
            else:
                filled = await page.evaluate("""(t) => {
                    const ce = document.querySelector('[contenteditable="true"]');
                    if (ce) {
                        ce.focus();
                        ce.textContent = t;
                        ce.dispatchEvent(new Event('input', {bubbles:true}));
                        return true;
                    }
                    return false;
                }""", title)
                print(f"  [3] 描述{'已填(JS)' if filled else '未找到'}", flush=True)
            await asyncio.sleep(1)

            # 清除可能的 tooltip
            await page.evaluate("""document.querySelectorAll('[data-tippy-root],[class*="tooltip"],[class*="popover"]').forEach(e => e.remove())""")

            # 定时发布
            if scheduled_time:
                from schedule_helper import set_scheduled_time
                scheduled_ok = await set_scheduled_time(page, scheduled_time, "快手")
                if scheduled_ok:
                    print(f"  [定时] 快手定时发布已设置", flush=True)

            print("  [4] 发布...", flush=True)
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(1)

            pub = page.locator('div[class*="button-primary"]:has-text("发布")').first
            if await pub.count() == 0:
                pub = page.locator('div[class*="edit-section-btns"] >> text=发布').first
            if await pub.count() == 0:
                pub = page.locator('button:has-text("发布")').first

            if await pub.count() > 0:
                await pub.scroll_into_view_if_needed()
                await asyncio.sleep(0.5)
                await pub.click(force=True)
            else:
                await page.evaluate("""() => {
                    const all = document.querySelectorAll('div');
                    for (const d of all) {
                        if (d.textContent.trim() === '发布' && d.className.includes('button')) {
                            d.click(); return;
                        }
                    }
                }""")

            await asyncio.sleep(5)
            await page.screenshot(path="/tmp/kuaishou_result.png")
            txt = await page.evaluate("document.body.innerText")
            url = page.url
            elapsed = time.time() - t0

            if "发布成功" in txt or "已发布" in txt:
                status, msg = "published", "发布成功"
            elif "审核" in txt:
                status, msg = "reviewing", "已提交审核"
            elif "manage" in url or "list" in url or "作品管理" in txt:
                status, msg = "reviewing", "已跳转到作品管理（发布成功）"
            else:
                status, msg = "reviewing", "已提交，请确认截图"

            result = PublishResult(
                platform="快手", video_path=video_path, title=title,
                success=True, status=status, message=msg,
                screenshot="/tmp/kuaishou_result.png", elapsed_sec=elapsed,
            )
            print(f"  {result.log_line()}", flush=True)
            await ctx.storage_state(path=str(COOKIE_FILE))
            await browser.close()
            return result

    except Exception as e:
        return PublishResult(platform="快手", video_path=video_path, title=title,
                           success=False, status="error",
                           message=f"异常: {str(e)[:80]}", elapsed_sec=time.time()-t0)


async def main():
    from publish_result import print_summary, save_results
    from cookie_manager import check_cookie_valid

    print("=== 账号预检 ===", flush=True)
    ok, info = check_cookie_valid("快手")
    print(f"  快手: {info}", flush=True)
    if not ok:
        print("[✗] 账号预检不通过，终止发布", flush=True)
        return 1
    print()

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
