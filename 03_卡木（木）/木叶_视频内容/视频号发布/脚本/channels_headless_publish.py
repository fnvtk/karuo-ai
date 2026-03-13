#!/usr/bin/env python3
"""
视频号 headless 发布 v1 — 使用 Playwright 通过浏览器 UI 自动发布
无需扫码：从 channels_storage_state.json 恢复会话。
全程 headless（不弹窗）。
"""
import asyncio
import json
import sys
import time
import random
from dataclasses import dataclass
from pathlib import Path

from playwright.async_api import async_playwright

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "channels_storage_state.json"
CREATE_URL = "https://channels.weixin.qq.com/platform/post/create"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)

DESC_SUFFIX = "\n#Soul派对 #创业日记 #卡若 #创业"
MINI_PROGRAM_LINK = "#小程序://卡若创业派对/gF4V4Vo4Ws4IiJa"


@dataclass
class PublishResult:
    platform: str = "视频号"
    video_path: str = ""
    title: str = ""
    success: bool = False
    status: str = ""
    message: str = ""
    elapsed_sec: float = 0


sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
try:
    from publish_result import is_published, log_publish
except ImportError:
    def is_published(*a): return False
    def log_publish(*a): pass

try:
    from video_metadata import VideoMeta
except ImportError:
    VideoMeta = None


async def publish_one_headless(
    context, video_path: str, title: str, idx: int, total: int,
    scheduled_ts: int = 0,
) -> PublishResult:
    fname = Path(video_path).name
    fsize = Path(video_path).stat().st_size
    t0 = time.time()

    print(f"\n[{idx}/{total}] {fname} ({fsize / 1024 / 1024:.1f}MB)", flush=True)
    print(f"  标题: {title[:60]}", flush=True)

    if is_published("视频号", video_path):
        print("  [跳过] 已发布", flush=True)
        return PublishResult(video_path=video_path, title=title,
                             success=True, status="skipped", message="去重跳过")

    page = await context.new_page()
    try:
        await page.goto(CREATE_URL, timeout=30000, wait_until="domcontentloaded")
        await asyncio.sleep(3)

        if "login" in page.url:
            print("  [!] Cookie 过期，需要重新登录", flush=True)
            await page.close()
            return PublishResult(video_path=video_path, title=title,
                                 success=False, status="error", message="Cookie 过期")

        print("  等待上传区域...", flush=True)
        upload_input = page.locator('input[type="file"][accept*="video"]')
        await upload_input.wait_for(state="attached", timeout=15000)

        print("  选择视频文件...", flush=True)
        await upload_input.set_input_files(video_path)

        print("  等待视频处理...", flush=True)
        await asyncio.sleep(5)

        for wait_round in range(60):
            progress_el = page.locator('[class*="progress"], [class*="upload-progress"]')
            if await progress_el.count() == 0:
                break
            await asyncio.sleep(3)
            if wait_round % 10 == 9:
                print(f"  处理中... ({wait_round * 3}s)", flush=True)

        await asyncio.sleep(3)

        desc_full = title + DESC_SUFFIX + "\n" + MINI_PROGRAM_LINK
        if VideoMeta:
            try:
                vmeta = VideoMeta.from_filename(video_path)
                desc_full = vmeta.description("视频号") + "\n" + MINI_PROGRAM_LINK
            except Exception:
                pass

        desc_input = page.locator('[class*="desc"] [contenteditable="true"], textarea[class*="desc"]').first
        try:
            await desc_input.wait_for(state="visible", timeout=8000)
            await desc_input.click()
            await asyncio.sleep(0.5)
            await desc_input.fill("")
            await desc_input.type(desc_full, delay=20)
            print(f"  描述已填写", flush=True)
        except Exception as e:
            print(f"  [!] 描述填写异常: {e}", flush=True)

        short_title_input = page.locator('[class*="short-title"] input, [class*="shortTitle"] input').first
        try:
            await short_title_input.wait_for(state="visible", timeout=5000)
            short = title.split("#")[0].strip()[:16]
            await short_title_input.fill(short)
            print(f"  短标题: {short}", flush=True)
        except Exception:
            pass

        original_checkbox = page.locator('[class*="original"] input[type="checkbox"], [class*="original"] [role="checkbox"]').first
        try:
            await original_checkbox.wait_for(state="visible", timeout=3000)
            if not await original_checkbox.is_checked():
                await original_checkbox.click()
                print("  声明原创: ✓", flush=True)
        except Exception:
            pass

        print("  准备发表...", flush=True)
        await asyncio.sleep(2)

        if scheduled_ts > 0:
            import datetime
            dt = datetime.datetime.fromtimestamp(scheduled_ts)
            print(f"  定时发布: {dt.strftime('%Y-%m-%d %H:%M')}", flush=True)

        publish_btn = page.locator('button:has-text("发表"), button:has-text("发布"), [class*="publish-btn"]').first
        await publish_btn.wait_for(state="visible", timeout=10000)

        post_created = asyncio.Event()
        post_response = {}

        async def on_response(response):
            if "post_create" in response.url:
                try:
                    body = await response.json()
                    post_response.update(body)
                    post_created.set()
                except Exception:
                    pass

        page.on("response", on_response)

        await publish_btn.click()
        print("  已点击发表按钮...", flush=True)

        try:
            await asyncio.wait_for(post_created.wait(), timeout=120)
        except asyncio.TimeoutError:
            pass

        elapsed = time.time() - t0

        if post_response:
            err = post_response.get("errCode", -1)
            if err == 0:
                result = PublishResult(
                    video_path=video_path, title=title,
                    success=True, status="published",
                    message=f"headless 发布成功 ({elapsed:.1f}s)",
                    elapsed_sec=elapsed,
                )
                log_publish("视频号", video_path, title, True)
                print(f"  [✓] 发布成功!", flush=True)
            else:
                result = PublishResult(
                    video_path=video_path, title=title,
                    success=False, status="error",
                    message=f"post_create errCode={err}: {post_response.get('errMsg','')}",
                    elapsed_sec=elapsed,
                )
                print(f"  [✗] errCode={err}", flush=True)
        else:
            await asyncio.sleep(5)
            current_url = page.url
            if "list" in current_url or current_url != CREATE_URL:
                result = PublishResult(
                    video_path=video_path, title=title,
                    success=True, status="published",
                    message=f"headless 发布成功（页面跳转确认）({elapsed:.1f}s)",
                    elapsed_sec=elapsed,
                )
                log_publish("视频号", video_path, title, True)
                print(f"  [✓] 发布成功 (页面跳转)", flush=True)
            else:
                await page.screenshot(path=f"/tmp/ch_publish_fail_{idx}.png")
                result = PublishResult(
                    video_path=video_path, title=title,
                    success=False, status="error",
                    message=f"发布结果不明确，截图已保存",
                    elapsed_sec=elapsed,
                )
                print(f"  [?] 结果不明确，截图保存到 /tmp/ch_publish_fail_{idx}.png", flush=True)

        return result

    except Exception as e:
        elapsed = time.time() - t0
        print(f"  [!] 异常: {e}", flush=True)
        try:
            await page.screenshot(path=f"/tmp/ch_error_{idx}.png")
        except Exception:
            pass
        return PublishResult(
            video_path=video_path, title=title,
            success=False, status="error",
            message=str(e)[:200], elapsed_sec=elapsed,
        )
    finally:
        await page.close()


def generate_schedule_times(count: int, first_delay: int = 0) -> list[int]:
    """生成定时发布时间列表：第一条立即/延迟后发，后续30-120分钟间隔"""
    times = []
    base = int(time.time()) + first_delay
    times.append(0 if first_delay == 0 else base)
    for i in range(1, count):
        gap = random.randint(30, 120) * 60
        base += gap
        times.append(base)
    return times


async def main(video_dir: str = None, videos: list[str] = None):
    if not COOKIE_FILE.exists():
        print("[!] Cookie 文件不存在，需要先运行 channels_login.py", flush=True)
        return

    if video_dir:
        vd = Path(video_dir)
        video_files = sorted(vd.glob("*.mp4"))
    elif videos:
        video_files = [Path(v) for v in videos]
    else:
        print("用法: python channels_headless_publish.py <视频目录>", flush=True)
        return

    video_files = [v for v in video_files if v.exists() and v.stat().st_size > 100000]
    if not video_files:
        print("[!] 没有找到有效的视频文件", flush=True)
        return

    total = len(video_files)
    print(f"准备发布 {total} 个视频到视频号 (headless 模式)", flush=True)

    schedules = generate_schedule_times(total)
    results = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            storage_state=str(COOKIE_FILE),
            user_agent=UA,
            viewport={"width": 1280, "height": 900},
        )
        await context.add_init_script(
            "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
        )

        for i, vf in enumerate(video_files):
            title = vf.stem
            if VideoMeta:
                try:
                    vmeta = VideoMeta.from_filename(str(vf))
                    title = vmeta.title
                except Exception:
                    pass

            result = await publish_one_headless(
                context, str(vf), title, i + 1, total,
                scheduled_ts=schedules[i],
            )
            results.append(result)

            if not result.success and result.status == "error" and "Cookie 过期" in result.message:
                print("\n[!] Cookie 过期，终止发布", flush=True)
                break

            if i < total - 1 and result.success:
                wait = random.randint(5, 15)
                print(f"  等待 {wait}s 后继续...", flush=True)
                await asyncio.sleep(wait)

        await browser.close()

    success = sum(1 for r in results if r.success)
    fail = sum(1 for r in results if not r.success)
    skip = sum(1 for r in results if r.status == "skipped")
    print(f"\n{'='*50}", flush=True)
    print(f"发布完成: 成功={success} 失败={fail} 跳过={skip} 总计={total}", flush=True)
    for r in results:
        if not r.success:
            print(f"  [✗] {Path(r.video_path).name}: {r.message}", flush=True)

    return results


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python channels_headless_publish.py <视频目录或文件>")
        sys.exit(1)

    arg = sys.argv[1]
    if Path(arg).is_dir():
        asyncio.run(main(video_dir=arg))
    elif Path(arg).is_file():
        asyncio.run(main(videos=[arg]))
    else:
        print(f"[!] 路径不存在: {arg}")
        sys.exit(1)
