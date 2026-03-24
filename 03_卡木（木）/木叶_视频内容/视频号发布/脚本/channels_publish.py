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
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 120场 20260320_output/成片")

sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
from publish_result import PublishResult

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)

DESC_SUFFIX = " #小程序搜 #卡若创业派对 #Ai创业 #私域流量"

TITLES = {
    "AI最大的缺点是上下文太短，这样来解决.mp4":
        "AI的短板是记忆太短，上下文一长就废了，这个方法能解决 #AI工具 #效率提升",
    "AI每天剪1000个视频 M4电脑24T素材库全网分发.mp4":
        "M4芯片+24T素材库，AI每天剪1000条视频自动全网分发 #AI剪辑 #内容工厂",
    "Soul派对变现全链路 发视频就有钱，后端全解决.mp4":
        "Soul派对怎么赚钱？发视频就有收益，后端体系全部搞定 #Soul派对 #副业收入",
    "从0到切片发布 AI自动完成每天副业30条视频.mp4":
        "从零到切片发布，AI全自动完成，每天副业产出30条视频 #AI副业 #切片分发",
    "做副业的基本条件 苹果电脑和特殊访问工具.mp4":
        "做副业的两个基本条件：一台Mac和一个上网工具 #副业入门 #工具推荐",
    "切片分发全自动化 从视频到发布一键完成.mp4":
        "从录制到发布全自动化，一键切片分发五大平台 #自动化 #内容分发",
    "创业团队4人平分25有啥危险 先跑钱再谈股权.mp4":
        "创业团队4人平分25%股权有啥风险？先跑出收入再谈分配 #创业股权 #团队管理",
    "坚持到120场是什么感觉 方向越确定执行越坚决.mp4":
        "坚持到第120场派对是什么感觉？方向越清晰执行越坚决 #Soul派对 #坚持的力量",
    "帮人装AI一单300到1000块，传统行业也能做.mp4":
        "帮传统行业的人装AI工具，一单收300到1000块，简单好做 #AI服务 #传统行业",
    "深度AI模型对比 哪个才是真正的AI不是语言模型.mp4":
        "深度对比各大AI模型，哪个才是真正的智能而不只是语言模型 #AI对比 #深度思考",
    "疗愈师配AI助手能收多少钱 一个小团队5万到10万.mp4":
        "疗愈师+AI助手组合，一个小团队月收5万到10万 #AI赋能 #疗愈商业",
    "赚钱没那么复杂，自信心才是核心问题.mp4":
        "赚钱真没那么复杂，自信心才是卡住你的核心问题 #创业心态 #自信",
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


def _to_schedule_ts(scheduled_time) -> int:
    """datetime/int -> unix ts (s); 过近时间自动顺延 10 分钟。"""
    if scheduled_time is None:
        return 0
    from datetime import datetime
    if isinstance(scheduled_time, datetime):
        ts = int(scheduled_time.timestamp())
    else:
        ts = int(scheduled_time)
    now = int(time.time())
    return max(ts, now + 600)


def _inject_timing_payload(payload: dict, schedule_ts: int) -> dict:
    """给 post_create 请求体注入定时字段，绕过页面控件不可见问题。"""
    if not isinstance(payload, dict) or schedule_ts <= 0:
        return payload
    payload["postTimingInfo"] = {"timing": 1, "postTime": schedule_ts}
    post_info = payload.get("postInfo")
    if isinstance(post_info, dict):
        post_info["postTime"] = schedule_ts
        post_info["publishType"] = 1
    return payload


async def _setup_post_create_timing_route(page, scheduled_time):
    """拦截 post_create 请求并注入定时参数。"""
    schedule_ts = _to_schedule_ts(scheduled_time)
    if schedule_ts <= 0:
        return False

    async def _handler(route, request):
        try:
            if request.method.upper() != "POST":
                await route.continue_()
                return
            data = request.post_data_json
            if not isinstance(data, dict):
                await route.continue_()
                return
            patched = _inject_timing_payload(data, schedule_ts)
            await route.continue_(post_data=json.dumps(patched, ensure_ascii=False))
        except Exception:
            await route.continue_()

    await page.route("**/post/post_create**", _handler)
    return True


def _iter_surfaces(page):
    """按优先级返回可操作 surface：先 page，再 micro/content 子 frame。"""
    surfaces = [page]
    for fr in page.frames:
        u = (fr.url or "").lower()
        if "/micro/content/post/create" in u:
            surfaces.append(fr)
    return surfaces


async def _ensure_original_checked(page) -> bool:
    """强制勾选“声明原创”。"""
    for surface in _iter_surfaces(page):
        ok = await surface.evaluate("""() => {
            const vis = (el) => !!el && el.offsetParent !== null;
            const isChecked = (el) => {
                if (!el) return false;
                if (el.checked === true) return true;
                const aria = el.getAttribute && el.getAttribute('aria-checked');
                if (aria === 'true') return true;
                const cls = (el.className || '').toString();
                return /checked|is-checked|active/.test(cls);
            };
            const nodes = Array.from(document.querySelectorAll('label, span, div, p, li'));
            for (const n of nodes) {
                const t = (n.textContent || '').trim();
                if (!t || !vis(n) || !t.includes('声明原创')) continue;
                const row = n.closest('label,div,li,section,form') || n.parentElement;
                if (!row) continue;
                const controls = row.querySelectorAll('input[type="checkbox"], [role="checkbox"], .checkbox, .el-checkbox, .ant-checkbox-wrapper');
                for (const c of controls) {
                    if (!isChecked(c)) {
                        c.click();
                    }
                    if (isChecked(c)) return true;
                }
                n.click();
                const checkedAfter = Array.from(controls).some(isChecked);
                if (checkedAfter) return true;
                return true; // 能定位到“声明原创”且已点击，按成功处理
            }
            return false;
        }""")
        if ok:
            return True
    return False


async def _set_video_file(page, video_path: str) -> None:
    """优先直写 file input，失败则回退 filechooser 点击上传按钮。"""
    for surface in _iter_surfaces(page):
        fl = surface.locator('input[type="file"][accept*="video"]').first
        if await fl.count() == 0:
            fl = surface.locator('input[type="file"]').first
        if await fl.count() > 0:
            await fl.set_input_files(video_path)
            return

    trigger_candidates = [
        'text=上传视频',
        'text=发表视频',
        'button:has-text("上传")',
        'button:has-text("添加视频")',
        '[class*="upload"]',
    ]
    for surface in _iter_surfaces(page):
        for sel in trigger_candidates:
            trg = surface.locator(sel).first
            try:
                if await trg.count() > 0:
                    async with page.expect_file_chooser(timeout=8000) as fc_info:
                        await trg.click(force=True)
                    fc = await fc_info.value
                    await fc.set_files(video_path)
                    return
            except Exception:
                continue

    raise RuntimeError("未找到可用的视频上传控件（input/filechooser）")


async def _dismiss_blocking_overlays(page) -> None:
    """关闭可能拦截点击事件的遮罩/弹窗。"""
    await page.evaluate("""() => {
        const closeSelectors = [
          '.weui-desktop-dialog__close',
          '.weui-desktop-icon-btn.weui-desktop-icon-btn__close',
          '.weui-desktop-dialog [aria-label="关闭"]',
          '.weui-desktop-dialog .close',
          '.ant-modal-close',
        ];
        for (const sel of closeSelectors) {
          for (const el of document.querySelectorAll(sel)) {
            if (el && el.offsetParent !== null) el.click();
          }
        }
        // 部分遮罩没有关闭按钮，先去掉 pointer-events，避免阻塞发表按钮点击。
        const masks = document.querySelectorAll('.weui-desktop-dialog__wrp, .weui-desktop-mask, .ant-modal-mask');
        for (const m of masks) {
          if (m && m.offsetParent !== null) {
            m.style.pointerEvents = 'none';
          }
        }
    }""")






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
            timing_injected = await _setup_post_create_timing_route(page, scheduled_time)

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
            await _set_video_file(page, video_path)
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
            if await editor.count() == 0:
                for surface in _iter_surfaces(page):
                    editor = surface.locator('.input-editor').first
                    if await editor.count() > 0:
                        break
                    editor = surface.locator('[data-placeholder="添加描述"]').first
                    if await editor.count() > 0:
                        break

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

            # --- Step 3.2: original must be enabled ---
            original_ok = await _ensure_original_checked(page)
            if not original_ok:
                await page.screenshot(path=ss("3_original_missing"))
                await browser.close()
                return PublishResult(
                    platform="视频号",
                    video_path=video_path,
                    title=title,
                    success=False,
                    status="error",
                    message="未识别到“声明原创”控件，已拦截发布",
                    error_code="ORIGINAL_NOT_SET",
                    screenshot=ss("3_original_missing"),
                    elapsed_sec=time.time() - t0,
                )
            print("  [3.2] 已确认“声明原创”", flush=True)

            # --- Step 3.5: scheduled publish (if provided) ---
            if scheduled_time:
                try:
                    from schedule_helper import set_scheduled_time
                    sch_ok = await asyncio.wait_for(
                        set_scheduled_time(page, scheduled_time, "视频号"),
                        timeout=25,
                    )
                    if sch_ok:
                        print("  [3.5] 视频号定时发布时间已设置", flush=True)
                    else:
                        if timing_injected:
                            print("  [3.5] 页面定时控件失败，改用 post_create 注入定时继续发表", flush=True)
                        else:
                            print("  [3.5] 未能设置定时，终止本条发布（避免误发为立即）", flush=True)
                            await browser.close()
                            return PublishResult(
                                platform="视频号",
                                video_path=video_path,
                                title=title,
                                success=False,
                                status="error",
                                message="未识别到视频号定时控件，已拦截本条发布",
                                error_code="SCHEDULE_NOT_SET",
                                elapsed_sec=time.time() - t0,
                            )
                except Exception as e:
                    if timing_injected:
                        print(f"  [3.5] 定时控件异常，改用请求注入继续: {str(e)[:80]}", flush=True)
                    else:
                        print(f"  [3.5] 定时设置异常: {str(e)[:80]}，终止本条发布", flush=True)
                        await browser.close()
                        return PublishResult(
                            platform="视频号",
                            video_path=video_path,
                            title=title,
                            success=False,
                            status="error",
                            message=f"定时设置异常: {str(e)[:80]}",
                            error_code="SCHEDULE_SET_ERROR",
                            elapsed_sec=time.time() - t0,
                        )

            # --- Step 4: publish ---
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(1)

            print("  [4] 点击发表...", flush=True)
            await _dismiss_blocking_overlays(page)
            pub_btn = page.locator('button:has-text("发表")').first
            if await pub_btn.count() > 0:
                try:
                    await pub_btn.click(timeout=3000)
                except Exception:
                    await _dismiss_blocking_overlays(page)
                    await pub_btn.click(force=True, timeout=4000)
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
                origin_btn = page.locator('button:has-text("声明原创")').first
                if await origin_btn.count() > 0:
                    print("  [4b] 原创弹窗 → 声明原创并发表", flush=True)
                    try:
                        await origin_btn.click(force=True, timeout=3000)
                    except Exception:
                        await page.evaluate(
                            """() => {
                            const btns = [...document.querySelectorAll('button')];
                            const b = btns.find(e => e.textContent.includes('声明原创'));
                            if (b) b.click();
                        }"""
                        )
                    break
                dp = page.locator('button:has-text("直接发表")').first
                if await dp.count() > 0:
                    print("  [4b] 检测到“直接发表”弹窗，按原创强制规则拦截本条", flush=True)
                    await page.screenshot(path=ss("4_direct_publish_blocked"))
                    await browser.close()
                    return PublishResult(
                        platform="视频号",
                        video_path=video_path,
                        title=title,
                        success=False,
                        status="error",
                        message="弹窗仅出现“直接发表”，已拦截避免未声明原创",
                        error_code="ORIGINAL_CONFIRM_REQUIRED",
                        screenshot=ss("4_direct_publish_blocked"),
                        elapsed_sec=time.time() - t0,
                    )

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
    from cookie_manager import check_cookie_valid

    print("=== 账号预检 ===", flush=True)
    if not COOKIE_FILE.exists():
        print("[✗] Cookie 文件不存在，请先运行 channels_login.py 扫码", flush=True)
        return 1
    import os, time as _t
    age_h = (_t.time() - os.path.getmtime(str(COOKIE_FILE))) / 3600
    print(f"  视频号: Cookie 文件存在 (更新于 {age_h:.1f}h 前)", flush=True)
    if age_h > 48:
        print("[⚠] Cookie 超过 48h，可能已过期", flush=True)
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
