#!/usr/bin/env python3
"""
视频号发布 v3 — headless Playwright + 描述写入修复 + 统一 Cookie
- API 响应拦截 + 列表验证双重确认
- 描述通过 clipboard/insertText 写入（不依赖 contenteditable.fill）
- 所有描述追加 #小程序 卡若创业派对
"""
import asyncio
import json
import sys
import time
from dataclasses import dataclass, field
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

DESC_SUFFIX = " #小程序 卡若创业派对"

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


# ---------------------------------------------------------------------------
# API Capture
# ---------------------------------------------------------------------------
@dataclass
class ApiCapture:
    publish_responses: list = field(default_factory=list)
    all_calls: list = field(default_factory=list)

    async def handle(self, response):
        url = response.url
        if "cgi-bin" not in url and "finder-assistant" not in url:
            return
        record = {"url": url, "status": response.status}
        try:
            body = await response.json()
            record["body"] = body
        except Exception:
            pass
        self.all_calls.append(record)
        lower = url.lower()
        if any(k in lower for k in ("publish", "post_create", "post_publish", "create_post")):
            self.publish_responses.append(record)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _extract_token(page) -> str | None:
    url = page.url
    if "token=" in url:
        return url.split("token=")[1].split("&")[0]
    try:
        return await page.evaluate(
            "window.__wxConfig && window.__wxConfig.token || ''"
        ) or None
    except Exception:
        return None


async def _verify_on_list(page, title_keyword: str) -> tuple[bool, str]:
    """Navigate to content-list page and look for the video."""
    try:
        token = await _extract_token(page)
        list_url = "https://channels.weixin.qq.com/platform/post/list"
        if token:
            list_url += f"?token={token}"
        await page.goto(list_url, timeout=20000, wait_until="domcontentloaded")
        await asyncio.sleep(6)

        body_text = await page.evaluate("document.body.innerText")
        kw = title_keyword[:20]
        if kw in body_text:
            return True, f"标题匹配 ({kw})"

        found = await page.evaluate("""(kw) => {
            const items = document.querySelectorAll('[class*="post-feed"] [class*="desc"], [class*="post-item"] [class*="desc"]');
            for (const el of items) {
                if (el.textContent.includes(kw)) return true;
            }
            return false;
        }""", kw)
        if found:
            return True, f"DOM匹配 ({kw})"

        return False, "未在列表前20条中找到"
    except Exception as e:
        return False, f"验证异常: {str(e)[:60]}"






# ---------------------------------------------------------------------------
# Core publish
# ---------------------------------------------------------------------------
async def publish_one(
    video_path: str,
    title: str,
    idx: int = 1,
    total: int = 1,
    skip_dedup: bool = False,
    scheduled_time=None,
) -> PublishResult:
    from playwright.async_api import async_playwright
    from publish_result import is_published

    fname = Path(video_path).name
    fsize = Path(video_path).stat().st_size
    t0 = time.time()
    time_hint = f" → 定时 {scheduled_time.strftime('%H:%M')}" if scheduled_time else ""
    print(f"\n[{idx}/{total}] {fname} ({fsize / 1024 / 1024:.1f}MB){time_hint}", flush=True)
    print(f"  标题: {title[:60]}", flush=True)

    if not skip_dedup and is_published("视频号", video_path):
        print("  [跳过] 该视频已发布到视频号", flush=True)
        return PublishResult(
            platform="视频号", video_path=video_path, title=title,
            success=True, status="skipped", message="去重跳过（已发布）",
        )

    if not COOKIE_FILE.exists():
        return PublishResult(
            platform="视频号", video_path=video_path, title=title,
            success=False, status="error", message="Cookie 不存在",
        )

    capture = ApiCapture()
    ss_dir = Path("/tmp/channels_ss")
    ss_dir.mkdir(exist_ok=True)
    ss = lambda n: str(ss_dir / f"{Path(video_path).stem}_{n}.png")

    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled"],
            )
            ctx = await browser.new_context(
                storage_state=str(COOKIE_FILE),
                user_agent=UA,
                viewport={"width": 1280, "height": 900},
                locale="zh-CN",
            )
            await ctx.add_init_script(
                "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
            )
            page = await ctx.new_page()
            page.on("response", capture.handle)

            # --- Step 1: open publish page ---
            print("  [1] 打开发表页...", flush=True)
            await page.goto(
                "https://channels.weixin.qq.com/platform/post/create",
                timeout=30000,
                wait_until="domcontentloaded",
            )
            await asyncio.sleep(5)

            body_text = await page.evaluate("document.body.innerText")
            if "扫码" in body_text or "login" in page.url.lower():
                await page.screenshot(path=ss("login"))
                await browser.close()
                r = PublishResult(
                    platform="视频号", video_path=video_path, title=title,
                    success=False, status="error",
                    message="Cookie 已过期（需重新扫码登录）",
                    screenshot=ss("login"),
                    elapsed_sec=time.time() - t0,
                )
                print(f"  {r.log_line()}", flush=True)
                return r

            await page.screenshot(path=ss("1_page"))

            # --- Step 2: upload video ---
            print("  [2] 上传视频...", flush=True)
            fl = page.locator('input[type="file"][accept*="video"]').first
            if await fl.count() == 0:
                fl = page.locator('input[type="file"]').first
            await fl.set_input_files(video_path)
            print("  [2] 文件已选择", flush=True)

            upload_ok = False
            for i in range(90):
                has_cover = await page.locator("text=封面预览").count() > 0
                has_delete = await page.locator("text=删除").count() > 0
                if has_cover or has_delete:
                    print(f"  [2] 上传完成 ({i * 2}s)", flush=True)
                    upload_ok = True
                    break
                await asyncio.sleep(2)

            if not upload_ok:
                await page.screenshot(path=ss("upload_timeout"))
                await browser.close()
                r = PublishResult(
                    platform="视频号", video_path=video_path, title=title,
                    success=False, status="error",
                    message="视频上传超时 (3 min)",
                    screenshot=ss("upload_timeout"),
                    elapsed_sec=time.time() - t0,
                )
                print(f"  {r.log_line()}", flush=True)
                return r

            await asyncio.sleep(3)
            await page.screenshot(path=ss("2_uploaded"))

            # --- Step 3: fill description ---
            full_desc = title + DESC_SUFFIX
            print(f"  [3] 填写描述: {full_desc[:60]}...", flush=True)

            editor = page.locator('.input-editor').first
            if await editor.count() == 0:
                editor = page.locator('[data-placeholder="添加描述"]').first

            if await editor.count() > 0:
                await editor.fill(full_desc)
                await asyncio.sleep(0.5)
                written = await editor.inner_text()
                if full_desc[:15] in written:
                    print(f"  [3] 描述已确认: {written[:50]}...", flush=True)
                else:
                    print(f"  [3] fill() 后验证失败, 尝试 click+type...", flush=True)
                    await editor.click()
                    await asyncio.sleep(0.3)
                    await page.keyboard.press("Meta+A")
                    await page.keyboard.press("Backspace")
                    await page.keyboard.type(full_desc, delay=8)
                    await asyncio.sleep(0.5)
            else:
                print("  [3] ⚠ 未找到描述编辑器 (.input-editor)", flush=True)

            await asyncio.sleep(1)
            await page.screenshot(path=ss("3_desc"))

            # --- Step 4: publish ---
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(1)

            print("  [4] 点击发表...", flush=True)
            pub_btn = page.locator('button:has-text("发表")').first
            if await pub_btn.count() > 0:
                await pub_btn.click()
            else:
                await page.evaluate(
                    """() => {
                    const b = [...document.querySelectorAll('button')];
                    const p = b.find(e => e.textContent.includes('发表'));
                    if (p) p.click();
                }"""
                )

            # Wait for possible dialog
            for _ in range(10):
                await asyncio.sleep(1)
                dp = page.locator('button:has-text("直接发表")').first
                if await dp.count() > 0:
                    print("  [4b] 原创弹窗 → 直接发表", flush=True)
                    try:
                        await dp.click(force=True, timeout=3000)
                    except Exception:
                        await page.evaluate(
                            """() => {
                            const btns = [...document.querySelectorAll('button')];
                            const b = btns.find(e => e.textContent.includes('直接发表'));
                            if (b) b.click();
                        }"""
                        )
                    break

            # Wait for publish to process
            await asyncio.sleep(8)
            await page.screenshot(path=ss("4_after_publish"))

            # --- Step 5: analyse API responses ---
            print(f"  [API] 捕获 {len(capture.all_calls)} 个调用", flush=True)
            api_ok: bool | None = None
            api_msg = ""
            for call in capture.publish_responses:
                body = call.get("body", {})
                code = body.get("errCode", body.get("errcode", body.get("ret", -999)))
                print(f"    PUBLISH → status={call['status']} errCode={code}", flush=True)
                if code == 0 or (isinstance(code, int) and code == 200):
                    api_ok = True
                else:
                    api_ok = False
                    api_msg = json.dumps(body, ensure_ascii=False)[:120]

            if api_ok is None:
                url_now = page.url
                text_now = await page.evaluate("document.body.innerText")
                if "/post/list" in url_now or "内容管理" in text_now:
                    api_ok = True
                    api_msg = "页面已跳转到内容管理"
                else:
                    api_msg = f"未捕获publish响应 (url={url_now[:60]})"

            # --- Step 6: verify on content list ---
            print("  [5] 列表验证...", flush=True)
            kw_for_check = title.split("#")[0].strip()[:20]
            verified, verify_msg = await _verify_on_list(page, kw_for_check)
            await page.screenshot(path=ss("5_verify"))

            elapsed = time.time() - t0

            if api_ok and verified:
                success, status, msg = True, "published", f"✓ API+列表双重确认 ({verify_msg})"
            elif api_ok:
                success, status, msg = True, "reviewing", f"API确认，列表未匹配 ({verify_msg})"
            elif verified:
                success, status, msg = True, "reviewing", f"列表匹配 ({verify_msg})"
            else:
                success, status = False, "error"
                msg = f"发布失败 — API: {api_msg}; 列表: {verify_msg}"

            result = PublishResult(
                platform="视频号",
                video_path=video_path,
                title=title,
                success=success,
                status=status,
                message=msg,
                screenshot=ss("5_verify"),
                elapsed_sec=elapsed,
            )
            print(f"  {result.log_line()}", flush=True)
            await ctx.storage_state(path=str(COOKIE_FILE))
            await browser.close()
            return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        return PublishResult(
            platform="视频号",
            video_path=video_path,
            title=title,
            success=False,
            status="error",
            message=f"异常: {str(e)[:80]}",
            elapsed_sec=time.time() - t0,
        )


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
async def main():
    from publish_result import print_summary, save_results

    if not COOKIE_FILE.exists():
        print("[✗] Cookie 不存在，请先运行 channels_login.py 扫码")
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
        # 即时保存（防止中途崩溃丢失记录）
        if r.status != "skipped":
            save_results([r])
        if i < len(videos) - 1:
            await asyncio.sleep(8)

    actual = [r for r in results if r.status != "skipped"]
    print_summary(actual)
    ok = sum(1 for r in actual if r.success)
    return 0 if ok == len(actual) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
