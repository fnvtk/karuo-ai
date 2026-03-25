#!/usr/bin/env python3
"""
知乎视频发布（CLI + F12 SDK）
- 支持 Cookie 预检
- 支持定时（UI优先 + F12注入兜底）
- 支持发布结果写入统一 publish_log.json
"""

from __future__ import annotations

import asyncio
import json
import sys
import time
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "zhihu_storage_state.json"
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/第129场_20260320_output/成片")

sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
from publish_result import PublishResult
from video_metadata import VideoMeta
from web_f12_sdk import F12ApiCapture, WebF12Sdk

from zhihu_f12_profile import build_zhihu_profile
from browser_profile import get_browser_profile_dir

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)


def _cookie_str_from_file() -> str:
    if not COOKIE_FILE.exists():
        return ""
    state = json.loads(COOKIE_FILE.read_text(encoding="utf-8"))
    return "; ".join(f"{c['name']}={c['value']}" for c in state.get("cookies", []))


def verify_session_cookie() -> tuple[bool, str]:
    if not COOKIE_FILE.exists():
        return False, "Cookie 文件不存在"
    cookie = _cookie_str_from_file()
    if not cookie.strip():
        return False, "Cookie 文件为空"
    try:
        import httpx

        r = httpx.get(
            "https://www.zhihu.com/api/v4/me",
            headers={"Cookie": cookie, "User-Agent": UA},
            timeout=10,
        )
        if r.status_code == 200:
            data = r.json()
            name = data.get("name", "?")
            return True, f"登录有效: {name}"
        return False, f"状态码: {r.status_code}"
    except Exception as e:
        return False, f"预检异常: {str(e)[:120]}"


async def _set_scheduled_time_ui(page, scheduled_time: datetime) -> bool:
    """
    UI 定时尝试（不同版本知乎创作中心 UI 选择器不稳定，做多重兜底）。
    """
    dt_text = scheduled_time.strftime("%Y-%m-%d %H:%M")

    # 点击定时入口
    triggers = [
        'text=定时发布',
        'text=预约发布',
        'label:has-text("定时")',
        '[class*="schedule"]',
    ]
    for sel in triggers:
        loc = page.locator(sel).first
        try:
            if await loc.count() > 0 and await loc.is_visible():
                await loc.click(force=True)
                break
        except Exception:
            continue

    # 填写时间输入
    inputs = [
        'input[type="datetime-local"]',
        'input[placeholder*="时间"]',
        'input[placeholder*="发布"]',
        'input[placeholder*="日期"]',
    ]
    for sel in inputs:
        loc = page.locator(sel).first
        try:
            if await loc.count() == 0 or not await loc.is_visible():
                continue
            if sel == 'input[type="datetime-local"]':
                await loc.fill(scheduled_time.strftime("%Y-%m-%dT%H:%M"))
            else:
                await loc.click(force=True)
                await page.keyboard.press("Meta+A")
                await page.keyboard.type(dt_text, delay=15)
            await asyncio.sleep(0.4)
            return True
        except Exception:
            continue
    return False


async def _dismiss_home_popup(page) -> None:
    """关闭知乎创作中心首页活动弹窗/遮罩。"""
    try:
        await page.evaluate("""() => {
            const vis = (el) => !!el && el.offsetParent !== null;
            const closeBtns = [
              ...document.querySelectorAll('button,span,div')
            ].filter(vis).filter(el => {
              const t = (el.textContent || '').trim();
              const cls = (el.className || '').toString();
              return t === '×' || t === '✕' || t === '关闭' || cls.includes('close');
            });
            for (const b of closeBtns.slice(0, 8)) {
              try { b.click(); } catch (e) {}
            }
            const masks = document.querySelectorAll('[class*="mask"], [class*="modal"], [class*="dialog"]');
            for (const m of masks) {
              if (m && m.offsetParent !== null) m.style.pointerEvents = 'none';
            }
        }""")
    except Exception:
        pass


def _capture_upload_http_ok(sdk: WebF12Sdk) -> bool:
    """F12 已抓到上传相关接口的成功响应（无头模式下 DOM 文案常滞后）。"""
    for evt in reversed(sdk.capture.events[-240:]):
        if evt.event != "response" or evt.endpoint != "upload":
            continue
        if evt.status in (200, 201, 204, 206):
            return True
    return False


async def _dom_video_editor_ready(page) -> bool:
    """页面是否已进入「可填标题/封面」的视频编辑态（比单一关键词稳）。"""
    return await page.evaluate("""() => {
      const t = (document.body.innerText || '');
      const textOk = ['上传完成','已上传','转码完成','添加封面','设置封面','视频封面',
        '重新上传','上传进度','100%','选择封面','编辑封面'].some(s => t.includes(s));
      if (textOk) return true;
      const v = document.querySelector('video');
      if (v && (v.readyState >= 2 || (v.videoWidth || 0) > 0)) return true;
      return false;
    }""")


async def _handle_risk_challenge(page, *, allow_manual: bool, headless: bool) -> bool:
    """
    检测知乎风控页：
    - allow_manual=True 时给用户手工过验证机会，再继续流程
    - 返回 True 表示可继续；False 表示仍被拦截
    """
    txt = await page.evaluate("document.body.innerText")
    is_risk = ("网络环境存在异常" in txt) or ("/account/unhuman" in page.url)
    if not is_risk:
        return True
    await page.screenshot(path="/tmp/zhihu_risk_block.png")
    if not allow_manual:
        return False
    print("  [知乎风控] 检测到 unhuman 验证页，请在当前已打开的浏览器里完成验证（约 60 秒内）。", flush=True)
    # 不依赖 Playwright Inspector（很多环境没有绿色「继续」按钮）
    await asyncio.sleep(60 if not headless else 15)
    txt2 = await page.evaluate("document.body.innerText")
    return not (("网络环境存在异常" in txt2) or ("/account/unhuman" in page.url))


async def _set_video_file(page, video_path: str) -> bool:
    """知乎上传兜底：先 input[type=file]，再 filechooser。"""
    inp = page.locator('input[type="file"]').first
    if await inp.count() > 0:
        try:
            await inp.set_input_files(video_path)
            return True
        except Exception:
            pass

    # filechooser 兜底（很多站点上传按钮不暴露 input）
    for trigger in ['text=发视频', 'text=上传视频', 'button:has-text("发视频")', 'button:has-text("上传")']:
        loc = page.locator(trigger).first
        try:
            if await loc.count() == 0 or not await loc.is_visible():
                continue
            async with page.expect_file_chooser(timeout=2500) as fc_info:
                await loc.click(force=True)
            chooser = await fc_info.value
            await chooser.set_files(video_path)
            return True
        except Exception:
            continue
    return False


async def _wait_manual_enter_video_publish(page, *, headless: bool) -> bool:
    """
    人工接管一次：当自动入口失败时，允许用户手动点到“发视频页”，
    然后脚本继续自动上传与发布。
    """
    print("  [手动接管] 请在当前浏览器手动进入知乎“发视频”页面（约 45 秒内）。", flush=True)
    await asyncio.sleep(45 if not headless else 20)
    # 只要出现上传相关文本或 file input，就认为进入成功
    try:
        txt = await page.evaluate("document.body.innerText")
        if ("上传" in txt) or ("视频" in txt):
            return True
    except Exception:
        pass
    try:
        return await page.locator('input[type="file"]').count() > 0
    except Exception:
        return False


async def publish_one(
    video_path: str,
    title: str,
    idx: int = 1,
    total: int = 1,
    skip_dedup: bool = False,
    scheduled_time: datetime | None = None,
    *,
    headless: bool = False,
    allow_manual_risk: bool = True,
    allow_manual_entry: bool = True,
) -> PublishResult:
    from playwright.async_api import async_playwright
    from publish_result import is_published

    t0 = time.time()
    vp = Path(video_path)
    if not vp.exists():
        return PublishResult(
            platform="知乎",
            video_path=video_path,
            title=title,
            success=False,
            status="error",
            message="视频文件不存在",
            error_code="FILE_NOT_FOUND",
        )

    if not skip_dedup and is_published("知乎", video_path):
        return PublishResult(
            platform="知乎",
            video_path=video_path,
            title=title,
            success=True,
            status="skipped",
            message="去重跳过（已发布）",
        )

    if not COOKIE_FILE.exists():
        return PublishResult(
            platform="知乎",
            video_path=video_path,
            title=title,
            success=False,
            status="error",
            message="Cookie 不存在，请先运行 zhihu_login.py",
            error_code="NO_COOKIE",
        )

    endpoint_rules, inject_rules = build_zhihu_profile(scheduled_time)
    capture = F12ApiCapture(
        output_file=str(Path("/tmp/zhihu_netlogs") / f"{vp.stem}_{datetime.now():%Y%m%d_%H%M%S}.jsonl")
    )
    sdk = WebF12Sdk(endpoint_rules=endpoint_rules, inject_rules=inject_rules, capture=capture)

    try:
        async with async_playwright() as pw:
            profile_dir = get_browser_profile_dir("知乎")
            ctx = await pw.chromium.launch_persistent_context(
                str(profile_dir),
                headless=headless,
                user_agent=UA,
                viewport={"width": 1366, "height": 900},
            )
            await ctx.add_init_script(
                "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
            )
            page = await ctx.new_page()

            await sdk.attach_capture(page)
            await sdk.attach_injector(page)

            # 1) 进入知乎创作中心并打开“发视频”入口（不同版本 URL 兼容）
            candidate_urls = [
                "https://www.zhihu.com/creator/content/video/new",
                "https://www.zhihu.com/creator/content/publish",
                "https://www.zhihu.com/creator",
            ]
            for u in candidate_urls:
                try:
                    await page.goto(u, wait_until="domcontentloaded", timeout=40000)
                    await asyncio.sleep(2)
                    await _dismiss_home_popup(page)
                    body_try = await page.evaluate("document.body.innerText")
                    if "404" not in body_try:
                        break
                except Exception:
                    continue

            # 若还没进入发布页，尝试通过“+ / 发视频 / 发布视频”按钮进入
            open_publish_selectors = [
                'button:has-text("发视频")',
                'button:has-text("发布视频")',
                'text=发视频',
                'text=发布视频',
                'button:has-text("+")',
                '[aria-label*="发布"]',
            ]
            for sel in open_publish_selectors:
                loc = page.locator(sel).first
                try:
                    if await loc.count() > 0 and await loc.is_visible():
                        await loc.click(force=True)
                        await asyncio.sleep(1.2)
                        await _dismiss_home_popup(page)
                        break
                except Exception:
                    continue

            # 兜底：从左侧“发布内容”进入，再点击“发视频”
            left_publish = page.locator('text=发布内容').first
            try:
                if await left_publish.count() > 0 and await left_publish.is_visible():
                    await left_publish.click(force=True)
                    await asyncio.sleep(1.0)
                    await _dismiss_home_popup(page)
            except Exception:
                pass
            for sel in ['text=发视频', 'text=发布视频', 'button:has-text("发视频")']:
                loc = page.locator(sel).first
                try:
                    if await loc.count() > 0 and await loc.is_visible():
                        await loc.click(force=True)
                        await asyncio.sleep(1.0)
                        await _dismiss_home_popup(page)
                        break
                except Exception:
                    continue

            # 知乎首页常见链路：先点“发布”按钮，再点下拉里的“发视频”
            try:
                pub_menu_btn = page.locator('button:has-text("发布")').first
                if await pub_menu_btn.count() > 0 and await pub_menu_btn.is_visible():
                    await pub_menu_btn.click(force=True)
                    await asyncio.sleep(0.6)
                video_item = page.locator('text=发视频').first
                if await video_item.count() > 0 and await video_item.is_visible():
                    await video_item.click(force=True)
                    await asyncio.sleep(1.0)
                    await _dismiss_home_popup(page)
            except Exception:
                pass

            # 新版知乎：右上角“创作(+)”按钮，点开后选“发视频”
            try:
                create_btn = page.locator('button[aria-label="创作"]').first
                if await create_btn.count() > 0 and await create_btn.is_visible():
                    await create_btn.click(force=True)
                    await asyncio.sleep(0.6)
                for sel in ['text=发视频', 'text=发布视频', '[role="menuitem"]:has-text("发视频")']:
                    it = page.locator(sel).first
                    if await it.count() > 0 and await it.is_visible():
                        await it.click(force=True)
                        await asyncio.sleep(1.0)
                        await _dismiss_home_popup(page)
                        break
            except Exception:
                pass

            txt = await page.evaluate("document.body.innerText")
            ok_risk = await _handle_risk_challenge(
                page, allow_manual=allow_manual_risk, headless=headless
            )
            if not ok_risk:
                await page.screenshot(path="/tmp/zhihu_risk_block.png")
                await ctx.storage_state(path=str(COOKIE_FILE))
                await ctx.close()
                return PublishResult(
                    platform="知乎",
                    video_path=video_path,
                    title=title,
                    success=False,
                    status="error",
                    message="知乎风控拦截（unhuman），验证未通过",
                    error_code="ZHIHU_RISK_BLOCK",
                    screenshot="/tmp/zhihu_risk_block.png",
                    elapsed_sec=time.time() - t0,
                )
            if "登录" in txt and "创作" not in txt:
                await ctx.close()
                return PublishResult(
                    platform="知乎",
                    video_path=video_path,
                    title=title,
                    success=False,
                    status="error",
                    message="未登录知乎创作中心",
                    error_code="NOT_LOGGED_IN",
                    elapsed_sec=time.time() - t0,
                )

            # 2) 上传视频
            if not await _set_video_file(page, video_path):
                if allow_manual_entry:
                    entered = await _wait_manual_enter_video_publish(page, headless=headless)
                    if entered and await _set_video_file(page, video_path):
                        pass
                    else:
                        await page.screenshot(path="/tmp/zhihu_no_upload_input.png")
                        await ctx.close()
                        return PublishResult(
                            platform="知乎",
                            video_path=video_path,
                            title=title,
                            success=False,
                            status="error",
                            message="未进入发视频页或未找到上传控件（手动接管后仍失败）",
                            error_code="NO_UPLOAD_INPUT",
                            screenshot="/tmp/zhihu_no_upload_input.png",
                            elapsed_sec=time.time() - t0,
                        )
                else:
                    await page.screenshot(path="/tmp/zhihu_no_upload_input.png")
                    await ctx.close()
                    return PublishResult(
                        platform="知乎",
                        video_path=video_path,
                        title=title,
                        success=False,
                        status="error",
                        message="未找到上传控件",
                        error_code="NO_UPLOAD_INPUT",
                        screenshot="/tmp/zhihu_no_upload_input.png",
                        elapsed_sec=time.time() - t0,
                    )
            # 3) 等上传完成
            # 知乎大文件/高峰期转码较慢，默认等待上限提高到 15 分钟；
            # 同时只要检测到“上传中/处理中”就继续等待，降低误判超时。
            uploaded = False
            net_ok_rounds = 0
            for _ in range(450):
                if await _dom_video_editor_ready(page):
                    uploaded = True
                    break
                if _capture_upload_http_ok(sdk):
                    net_ok_rounds += 1
                    # 抓到成功分片/直传响应后，再给前端 6～10s 渲染标题区
                    if net_ok_rounds >= 3 or await _dom_video_editor_ready(page):
                        await asyncio.sleep(6)
                        uploaded = await _dom_video_editor_ready(page) or net_ok_rounds >= 5
                        if uploaded:
                            break
                else:
                    net_ok_rounds = 0
                body = await page.evaluate("document.body.innerText")
                # 不能只看“发布”字样（创作首页也有发布按钮），必须命中上传完成/封面等视频页信号
                if ("上传完成" in body) or ("封面" in body) or ("重新上传" in body) or ("上传进度" in body):
                    uploaded = True
                    break
                if ("上传中" in body) or ("处理中" in body) or ("正在上传" in body) or ("转码中" in body):
                    await asyncio.sleep(2)
                    continue
                await asyncio.sleep(2)
            if not uploaded:
                await page.screenshot(path="/tmp/zhihu_upload_timeout.png")
                await ctx.close()
                return PublishResult(
                    platform="知乎",
                    video_path=video_path,
                    title=title,
                    success=False,
                    status="error",
                    message="上传超时",
                    error_code="UPLOAD_TIMEOUT",
                    screenshot="/tmp/zhihu_upload_timeout.png",
                    elapsed_sec=time.time() - t0,
                )

            # 4) 标题/简介
            short_title = title[:30]
            title_input = page.locator('input[placeholder*="标题"], textarea[placeholder*="标题"]').first
            if await title_input.count() > 0:
                try:
                    if await title_input.is_visible():
                        await title_input.fill(short_title, timeout=3000)
                except Exception:
                    pass
            desc = VideoMeta.from_filename(vp.name).description("B站")[:200]
            desc_input = page.locator('textarea[placeholder*="简介"], textarea[placeholder*="描述"], [contenteditable="true"]').first
            if await desc_input.count() > 0:
                try:
                    if await desc_input.is_visible():
                        await desc_input.fill(desc, timeout=3000)
                except Exception:
                    try:
                        await desc_input.click(force=True, timeout=1500)
                        await page.keyboard.type(desc, delay=10)
                    except Exception:
                        pass

            # 5) 定时（UI优先 + F12注入兜底）
            if scheduled_time:
                await _set_scheduled_time_ui(page, scheduled_time)

            # 6) 点击发布
            btn = page.locator('button:has-text("发布"), button:has-text("确认发布"), button:has-text("提交")').first
            if await btn.count() == 0:
                await page.screenshot(path="/tmp/zhihu_no_publish_btn.png")
                await ctx.close()
                return PublishResult(
                    platform="知乎",
                    video_path=video_path,
                    title=title,
                    success=False,
                    status="error",
                    message="未找到发布按钮",
                    error_code="NO_PUBLISH_BUTTON",
                    screenshot="/tmp/zhihu_no_publish_btn.png",
                    elapsed_sec=time.time() - t0,
                )
            clicked = False
            try:
                if await btn.is_visible():
                    await btn.click(force=True, timeout=2500)
                    clicked = True
            except Exception:
                pass
            if not clicked:
                try:
                    clicked = await page.evaluate("""() => {
                        const vis = (el) => !!el && el.offsetParent !== null;
                        const btns = [...document.querySelectorAll('button')].filter(vis);
                        const b = btns.find(x => {
                            const t = (x.textContent || '').trim();
                            return t.includes('发布') || t.includes('确认发布') || t.includes('提交');
                        });
                        if (b) { b.click(); return true; }
                        return false;
                    }""")
                except Exception:
                    clicked = False
            if not clicked:
                await page.screenshot(path="/tmp/zhihu_publish_click_failed.png")
                await ctx.close()
                return PublishResult(
                    platform="知乎",
                    video_path=video_path,
                    title=title,
                    success=False,
                    status="error",
                    message="发布按钮不可点击",
                    error_code="PUBLISH_CLICK_FAILED",
                    screenshot="/tmp/zhihu_publish_click_failed.png",
                    elapsed_sec=time.time() - t0,
                )
            await asyncio.sleep(6)

            body_now = await page.evaluate("document.body.innerText")
            url_now = page.url
            ok_tip = any(x in body_now for x in ("发布成功", "提交成功", "审核中", "已发布", "已提交"))
            ok_redirect = ("creator/content" in url_now and "video/new" not in url_now)

            await ctx.storage_state(path=str(COOKIE_FILE))
            await ctx.close()

            success = bool(ok_tip or ok_redirect or sdk.patch_hits.get("video_publish", 0) > 0)
            status = "reviewing" if success else "error"
            msg = (
                f"发布完成，F12摘要={capture.summary()} patch_hits={sdk.patch_hits}"
                if success
                else f"发布结果未确认，F12摘要={capture.summary()} patch_hits={sdk.patch_hits}"
            )
            return PublishResult(
                platform="知乎",
                video_path=video_path,
                title=title,
                success=success,
                status=status,
                message=msg,
                elapsed_sec=time.time() - t0,
            )
    except Exception as e:
        return PublishResult(
            platform="知乎",
            video_path=video_path,
            title=title,
            success=False,
            status="error",
            message=f"异常: {str(e)[:120]}",
            elapsed_sec=time.time() - t0,
        )


async def main() -> int:
    from publish_result import print_summary, save_results

    ok, msg = verify_session_cookie()
    if not ok:
        print(f"[✗] {msg}")
        return 1
    print(f"[✓] {msg}")

    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print("[✗] 未找到视频")
        return 1

    results = []
    for i, vp in enumerate(videos, 1):
        title = VideoMeta.from_filename(vp.name).title("B站")
        r = await publish_one(str(vp), title, i, len(videos))
        results.append(r)
        if r.status != "skipped":
            save_results([r])
        if i < len(videos):
            await asyncio.sleep(3)

    actual = [r for r in results if r.status != "skipped"]
    print_summary(actual)
    success_count = sum(1 for r in actual if r.success)
    return 0 if success_count == len(actual) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
