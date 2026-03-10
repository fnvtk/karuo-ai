#!/usr/bin/env python3
"""
小红书视频发布 v2 — Headless Playwright + 账号预检 + 真实成功验证
上传 → 填标题/描述 → 发布 → 笔记管理页验证。
"""
import asyncio
import json
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "xiaohongshu_storage_state.json"
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片")

sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
from publish_result import PublishResult

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)


async def pre_check_account() -> tuple[bool, str]:
    """发布前账号预检：Cookie 有效性 + 发布权限"""
    if not COOKIE_FILE.exists():
        return False, "Cookie 文件不存在"
    try:
        with open(COOKIE_FILE) as f:
            state = json.load(f)
        cookies = {c["name"]: c["value"] for c in state.get("cookies", [])}
        cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
        import httpx
        resp = httpx.get(
            "https://creator.xiaohongshu.com/api/galaxy/user/info",
            headers={"Cookie": cookie_str, "User-Agent": UA,
                     "Referer": "https://creator.xiaohongshu.com/"},
            timeout=10,
        )
        data = resp.json()
        if data.get("code") == 0:
            nick = data.get("data", {}).get("nick_name", "?")
            return True, f"账号正常: {nick}"
        return False, f"Cookie 已过期: {data.get('msg', '')}"
    except Exception as e:
        return False, f"预检异常: {e}"

TITLES = {
    "早起不是为了开派对，是不吵老婆睡觉.mp4":
        "每天6点起床不是因为自律，是因为老婆还在睡 #Soul派对 #创业日记 #小程序 卡若创业派对",
    "懒人的活法 动作简单有利可图正反馈.mp4":
        "懒人也能有收益？动作简单、有利可图、正反馈 #Soul派对 #副业思维 #小程序 卡若创业派对",
    "初期团队先找两个IS，比钱好使 ENFJ链接人，ENTJ指挥.mp4":
        "创业初期先找两个IS型人格，比融资好使十倍 #MBTI创业 #团队搭建 #小程序 卡若创业派对",
    "ICU出来一年多 活着要在互联网上留下东西.mp4":
        "重症监护出来一年多，活着就要在互联网上留下东西 #人生感悟 #创业觉醒 #小程序 卡若创业派对",
    "MBTI疗愈SOUL 年轻人测MBTI，40到60岁走五行八卦.mp4":
        "20岁测MBTI，40岁该学五行八卦了 #MBTI #认知觉醒 #小程序 卡若创业派对",
    "Soul业务模型 派对+切片+小程序全链路.mp4":
        "派对获客→AI切片→小程序转化，全链路拆解 #商业模式 #一人公司 #小程序 卡若创业派对",
    "Soul切片30秒到8分钟 AI半小时能剪10到30个.mp4":
        "AI剪辑半小时出10到30条切片，内容工厂效率密码 #AI剪辑 #内容效率 #小程序 卡若创业派对",
    "刷牙听业务逻辑 Soul切片变现怎么跑.mp4":
        "刷牙3分钟听完一套转化逻辑 #碎片创业 #副业逻辑 #小程序 卡若创业派对",
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


async def publish_one(video_path: str, title: str, idx: int = 1, total: int = 1, skip_dedup: bool = False, scheduled_time=None) -> PublishResult:
    from playwright.async_api import async_playwright
    from publish_result import is_published

    fname = Path(video_path).name
    fsize = Path(video_path).stat().st_size
    t0 = time.time()
    time_hint = f" → 定时 {scheduled_time.strftime('%H:%M')}" if scheduled_time else ""
    print(f"\n[{idx}/{total}] {fname} ({fsize/1024/1024:.1f}MB){time_hint}", flush=True)
    print(f"  标题: {title[:60]}", flush=True)

    if not skip_dedup and is_published("小红书", video_path):
        print(f"  [跳过] 该视频已发布到小红书", flush=True)
        return PublishResult(platform="小红书", video_path=video_path, title=title,
                           success=True, status="skipped", message="去重跳过（已发布）")

    if not COOKIE_FILE.exists():
        return PublishResult(platform="小红书", video_path=video_path, title=title,
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
                "https://creator.xiaohongshu.com/publish/publish?source=official",
                timeout=30000, wait_until="domcontentloaded",
            )
            await asyncio.sleep(5)

            txt = await page.evaluate("document.body.innerText")
            if "登录" in (await page.title()) and "上传" not in txt:
                await browser.close()
                return PublishResult(platform="小红书", video_path=video_path, title=title,
                                   success=False, status="error",
                                   message="未登录，请重新运行 xiaohongshu_login.py",
                                   error_code="NOT_LOGGED_IN", elapsed_sec=time.time()-t0)

            print("  [2] 上传视频...", flush=True)
            fl = page.locator('input[type="file"]').first
            if await fl.count() > 0:
                await fl.set_input_files(video_path)
                print("  [2] 文件已选择", flush=True)
            else:
                await page.screenshot(path="/tmp/xhs_no_input.png")
                await browser.close()
                return PublishResult(platform="小红书", video_path=video_path, title=title,
                                   success=False, status="error",
                                   message="未找到上传控件",
                                   screenshot="/tmp/xhs_no_input.png",
                                   elapsed_sec=time.time()-t0)

            # 等待上传完成（封面生成完毕）
            for i in range(90):
                txt = await page.evaluate("document.body.innerText")
                if "重新上传" in txt or "设置封面" in txt or "封面" in txt:
                    print(f"  [2] 上传完成 ({i*2}s)", flush=True)
                    break
                await asyncio.sleep(2)

            await asyncio.sleep(2)

            print("  [3] 填写标题和描述...", flush=True)
            # 小红书标题：placeholder="填写标题会有更多赞哦"
            title_input = page.locator('input[placeholder*="标题"]').first
            if await title_input.count() > 0:
                await title_input.click(force=True)
                await title_input.fill(title[:20])
                print(f"  [3] 标题已填: {title[:20]}", flush=True)

            # 正文描述：contenteditable div
            desc_area = page.locator('[contenteditable="true"]:visible').first
            if await desc_area.count() > 0:
                await desc_area.click(force=True)
                await asyncio.sleep(0.3)
                await page.keyboard.type(title, delay=10)
                print("  [3] 描述已填", flush=True)
            else:
                await page.evaluate("""(t) => {
                    const ce = [...document.querySelectorAll('[contenteditable="true"]')]
                        .find(e => e.offsetParent !== null);
                    if (ce) { ce.focus(); ce.textContent = t; ce.dispatchEvent(new Event('input',{bubbles:true})); }
                }""", title)

            await asyncio.sleep(1)

            # 定时发布
            if scheduled_time:
                from schedule_helper import set_scheduled_time
                scheduled_ok = await set_scheduled_time(page, scheduled_time, "小红书")
                if scheduled_ok:
                    print(f"  [定时] 小红书定时发布已设置", flush=True)

            await asyncio.sleep(2)
            print("  [4] 等待发布按钮启用...", flush=True)

            pub_selector = 'button.css-k4lp0z, button.publishBtn, button.el-button--danger'
            pub = page.locator('button:has-text("发布"):not(:has-text("暂存"))').last
            for wait in range(30):
                is_disabled = await pub.get_attribute("disabled")
                if not is_disabled:
                    break
                await asyncio.sleep(1)
            else:
                print("  [⚠] 发布按钮一直禁用", flush=True)

            await asyncio.sleep(2)
            print("  [4] 点击发布...", flush=True)

            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(1)

            pre_url = page.url
            clicked = False

            # 方法1: JS 精准点击红色发布按钮
            clicked = await page.evaluate("""() => {
                const btns = [...document.querySelectorAll('button')];
                const b = btns.filter(e => {
                    const t = e.textContent.trim();
                    const s = getComputedStyle(e);
                    return t === '发布' && !e.disabled &&
                           (s.backgroundColor.includes('255') || s.backgroundColor.includes('rgb(255') ||
                            e.className.includes('red') || e.className.includes('danger') ||
                            e.className.includes('primary'));
                }).pop();
                if (b) { b.click(); return true; }
                const fallback = btns.filter(e => e.textContent.trim() === '发布' && !e.disabled).pop();
                if (fallback) { fallback.click(); return true; }
                return false;
            }""")
            print(f"  [4] JS点击发布: {'成功' if clicked else '失败'}", flush=True)

            if not clicked:
                try:
                    await pub.click(force=True, timeout=5000)
                    clicked = True
                    print("  [4] Playwright force-click 成功", flush=True)
                except Exception:
                    pass

            await asyncio.sleep(3)

            # 处理二次确认弹窗
            for _ in range(3):
                confirm = page.locator('button:has-text("确认"), button:has-text("确定"), button:has-text("发布")').last
                if await confirm.count() > 0 and await confirm.is_visible():
                    txt_btn = (await confirm.text_content() or "").strip()
                    if txt_btn in ("确认", "确定", "发布"):
                        await confirm.click(force=True)
                        print(f"  [4] 确认弹窗: 点击了 [{txt_btn}]", flush=True)
                        await asyncio.sleep(2)
                break

            # 等待页面变化（发布跳转或重置）
            for _ in range(10):
                cur_url = page.url
                cur_txt = await page.evaluate("document.body.innerText")
                if cur_url != pre_url:
                    break
                if "发布成功" in cur_txt or "已发布" in cur_txt:
                    break
                if "拖拽视频到此" in cur_txt and "设置封面" not in cur_txt:
                    break
                await asyncio.sleep(2)

            await asyncio.sleep(5)
            await page.screenshot(path="/tmp/xhs_result.png")
            txt = await page.evaluate("document.body.innerText")
            url = page.url
            elapsed = time.time() - t0

            if "发布成功" in txt or "已发布" in txt:
                status, msg = "published", "发布成功"
            elif "笔记" in url or "manage" in url:
                status, msg = "published", "已跳转到笔记管理（发布成功）"
            elif "拖拽视频到此" in txt or ("上传视频" in txt and "封面" not in txt):
                status, msg = "published", "页面已重置（发布成功）"
            elif "审核" in txt:
                status, msg = "reviewing", "已提交审核"
            else:
                print("  [⚠] 未检测到明确成功信号，进行二次验证...", flush=True)
                await asyncio.sleep(3)
                try:
                    await page.goto("https://creator.xiaohongshu.com/new/note-manager",
                                   timeout=15000, wait_until="domcontentloaded")
                    await asyncio.sleep(5)
                    mgr_txt = await page.evaluate("document.body.innerText")
                    short_title = title[:15]
                    if short_title in mgr_txt:
                        status, msg = "published", f"笔记管理页已确认: {short_title}"
                    else:
                        status, msg = "failed", "笔记管理页未找到该笔记"
                except Exception:
                    status, msg = "unknown", "无法验证，状态不明"

            success = status in ("published", "reviewing")
            result = PublishResult(
                platform="小红书", video_path=video_path, title=title,
                success=success, status=status, message=msg,
                screenshot="/tmp/xhs_result.png", elapsed_sec=elapsed,
            )
            print(f"  {result.log_line()}", flush=True)
            await ctx.storage_state(path=str(COOKIE_FILE))
            await browser.close()
            return result

    except Exception as e:
        return PublishResult(platform="小红书", video_path=video_path, title=title,
                           success=False, status="error",
                           message=f"异常: {str(e)[:80]}", elapsed_sec=time.time()-t0)


async def main():
    from publish_result import print_summary, save_results

    # 账号预检
    print("=== 账号预检 ===", flush=True)
    ok, info = await pre_check_account()
    print(f"  {info}", flush=True)
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
    consecutive_fail = 0
    for i, vp in enumerate(videos):
        t = TITLES.get(vp.name, f"{vp.stem} #Soul派对 #创业日记")
        r = await publish_one(str(vp), t, i + 1, len(videos))
        results.append(r)

        if r.status == "skipped":
            consecutive_fail = 0
        elif r.success:
            consecutive_fail = 0
        else:
            consecutive_fail += 1
            if consecutive_fail >= 3:
                print("\n[!] 连续 3 次失败，终止以防封号", flush=True)
                break

        if i < len(videos) - 1 and r.status != "skipped":
            wait = 15
            print(f"  等待 {wait}s 再发下一条...", flush=True)
            await asyncio.sleep(wait)

    actual = [r for r in results if r.status != "skipped"]
    print_summary(actual)
    save_results(actual)
    ok_count = sum(1 for r in actual if r.success)
    return 0 if ok_count == len(actual) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
