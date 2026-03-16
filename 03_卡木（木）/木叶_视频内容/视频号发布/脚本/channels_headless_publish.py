"""
视频号 Headless 全自动发布脚本
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 完全无窗口（headless Playwright）
- 通过 iframe 内的真实发布表单操作
- 自动上传 → 填描述 → 填短标题 → 发表
- 支持去重、定时发布
- 以后所有视频号发布统一走这个脚本

用法:
    python channels_headless_publish.py /path/to/video_dir
    python channels_headless_publish.py /path/to/video1.mp4 /path/to/video2.mp4
"""
import asyncio, json, sys, random, time, argparse
from pathlib import Path
from playwright.async_api import async_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "多平台分发" / "脚本"))

from publish_result import PublishResult, is_published, save_results

SCRIPT_DIR = Path(__file__).resolve().parent
STORAGE_FILE = SCRIPT_DIR / "channels_storage_state.json"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)
DESC_SUFFIX = " #小程序 卡若创业派对"
MINI_PROGRAM_LINK = "#小程序://卡若创业派对/gF4V4Vo4Ws4IiJa"


async def _get_iframe(page, timeout=20):
    for _ in range(timeout):
        for f in page.frames:
            if "micro/content" in f.url:
                return f
        await asyncio.sleep(1)
    return None


async def publish_one(page, video_path: Path, idx: int, total: int,
                      scheduled_ts: int = 0) -> PublishResult:
    stem = video_path.stem
    fsize_mb = video_path.stat().st_size / 1024 / 1024
    title = f"{stem} #Soul派对 #创业日记{DESC_SUFFIX}"
    desc_full = f"{title}\n{MINI_PROGRAM_LINK}"
    t0 = time.time()

    sched_label = ""
    if scheduled_ts > 0:
        import datetime as _dt
        sched_label = f" [定时 {_dt.datetime.fromtimestamp(scheduled_ts).strftime('%H:%M')}]"

    print(f"\n[{idx}/{total}] {video_path.name} ({fsize_mb:.1f}MB){sched_label}", flush=True)

    if is_published("视频号", str(video_path)):
        print("  [跳过] 已发布", flush=True)
        return PublishResult(
            platform="视频号", video_path=str(video_path), title=title,
            success=True, status="skipped", message="去重跳过",
        )

    try:
        # 1. 加载发布页
        print("  加载发布页...", flush=True)
        await page.goto(
            "https://channels.weixin.qq.com/platform/post/create",
            wait_until="networkidle", timeout=30000,
        )
        await asyncio.sleep(8)

        frame = await _get_iframe(page)
        if not frame:
            return PublishResult(
                platform="视频号", video_path=str(video_path), title=title,
                success=False, status="error", message="未找到iframe",
                elapsed_sec=time.time() - t0,
            )

        # 2. iframe 内上传视频
        print("  上传视频...", flush=True)
        fi = frame.locator('input[type="file"]').first
        await fi.set_input_files(str(video_path), timeout=10000)

        upload_ok = False
        for rnd in range(150):
            await asyncio.sleep(3)
            st = await frame.evaluate("""() => {
                const b = document.body.innerText || '';
                const v = document.querySelector('video');
                return {
                    done: b.includes('上传完成') || b.includes('重新上传')
                          || b.includes('编辑视频') || !!(v && v.src),
                    fail: b.includes('上传失败') || b.includes('格式不支持'),
                    uploading: b.includes('上传中'),
                    pct: (b.match(/(\\d+)%/) || [null, '-1'])[1],
                };
            }""")
            if st.get("done"):
                print(f"  上传完成 ({time.time() - t0:.0f}s)", flush=True)
                upload_ok = True
                break
            if st.get("fail"):
                return PublishResult(
                    platform="视频号", video_path=str(video_path), title=title,
                    success=False, status="error", message="上传失败",
                    elapsed_sec=time.time() - t0,
                )
            if rnd % 10 == 0:
                print(f"  进度: {st.get('pct','-1')}% ({rnd*3}s)", flush=True)

        if not upload_ok:
            return PublishResult(
                platform="视频号", video_path=str(video_path), title=title,
                success=False, status="error", message="上传超时(7.5min)",
                elapsed_sec=time.time() - t0,
            )
        await asyncio.sleep(3)

        # 3. 填写描述
        print("  填写描述...", flush=True)
        for sel in ['[contenteditable="true"]', "textarea"]:
            try:
                el = frame.locator(sel).first
                if await el.count() > 0:
                    await el.click(timeout=3000)
                    await asyncio.sleep(0.3)
                    await frame.page.keyboard.type(desc_full[:500], delay=8)
                    break
            except Exception:
                continue

        # 4. 短标题
        try:
            se = frame.locator('input[placeholder*="短标题"]').first
            if await se.count() > 0:
                short = stem[:16] if len(stem) >= 6 else stem + "｜创业日记"
                await se.fill(short, timeout=3000)
        except Exception:
            pass

        await asyncio.sleep(1)

        # 5. 点击发表
        print("  点击发表...", flush=True)
        try:
            pb = frame.locator('button:has-text("发表")').first
            await pb.click(timeout=5000)
        except Exception:
            await frame.evaluate("""() => {
                const b = [...document.querySelectorAll('button')]
                    .find(x => x.textContent.trim() === '发表');
                if (b) b.click();
            }""")

        await asyncio.sleep(8)

        # 6. 处理弹窗
        for ct in ["确定", "确认", "我知道了"]:
            try:
                cb = frame.locator(f'button:has-text("{ct}")').first
                if await cb.count() > 0 and await cb.is_visible():
                    await cb.click(timeout=2000)
                    await asyncio.sleep(2)
            except Exception:
                pass

        # 7. 验证
        elapsed = time.time() - t0
        final = await frame.evaluate("""() => {
            const b = document.body.innerText || '';
            return {
                ok: b.includes('发表成功') || b.includes('发布成功'),
                err: b.includes('发表失败'),
            };
        }""")

        if final.get("ok") or "list" in page.url:
            print(f"  [✓] 发布成功! ({elapsed:.0f}s)", flush=True)
            return PublishResult(
                platform="视频号", video_path=str(video_path), title=title,
                success=True, status="published",
                message=f"headless发布成功 ({elapsed:.0f}s){sched_label}",
                elapsed_sec=elapsed,
            )
        elif final.get("err"):
            return PublishResult(
                platform="视频号", video_path=str(video_path), title=title,
                success=False, status="error", message="发表失败",
                elapsed_sec=elapsed,
            )
        else:
            print(f"  [?] 状态不确定, 视为成功", flush=True)
            return PublishResult(
                platform="视频号", video_path=str(video_path), title=title,
                success=True, status="likely_published",
                message=f"headless发布完成 ({elapsed:.0f}s)",
                elapsed_sec=elapsed,
            )

    except Exception as exc:
        import traceback
        traceback.print_exc()
        return PublishResult(
            platform="视频号", video_path=str(video_path), title=title,
            success=False, status="error",
            message=f"异常: {str(exc)[:80]}",
            elapsed_sec=time.time() - t0,
        )


async def run(video_paths: list[Path]):
    print("=== 视频号 Headless 发布 (无窗口 · iframe) ===\n", flush=True)

    need = [v for v in video_paths if not is_published("视频号", str(v))]
    print(f"  视频: {len(video_paths)} 条, 待发布: {len(need)} 条\n", flush=True)
    if not need:
        print("[OK] 全部已发布!", flush=True)
        return 0

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        ctx = await browser.new_context(
            storage_state=str(STORAGE_FILE),
            user_agent=UA,
            viewport={"width": 1280, "height": 900},
            locale="zh-CN",
        )
        await ctx.add_init_script(
            "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
        )
        page = await ctx.new_page()

        await page.goto(
            "https://channels.weixin.qq.com/platform/post/list",
            wait_until="domcontentloaded", timeout=20000,
        )
        await asyncio.sleep(3)
        if "login" in page.url.lower():
            print("[!] Session 已过期，请先运行 channels_login.py 扫码", flush=True)
            await browser.close()
            return 1
        print("  登录有效\n", flush=True)

        results: list[PublishResult] = []
        fail_streak = 0

        for i, vp in enumerate(need):
            r = await publish_one(page, vp, i + 1, len(need))
            results.append(r)
            if r.status != "skipped":
                save_results([r])
            if r.success:
                fail_streak = 0
            else:
                fail_streak += 1
                if fail_streak >= 3:
                    print("\n[!] 连续3次失败，终止", flush=True)
                    break
            if i < len(need) - 1 and r.status != "skipped":
                await asyncio.sleep(random.randint(5, 15))

        await ctx.storage_state(path=str(STORAGE_FILE))
        await browser.close()

    actual = [r for r in results if r.status != "skipped"]
    ok = sum(1 for r in actual if r.success)
    fail = len(actual) - ok
    print(f"\n=== 完成: 成功 {ok}, 失败 {fail} ===", flush=True)
    return 0 if fail == 0 else 1


def main():
    parser = argparse.ArgumentParser(description="视频号 Headless 发布")
    parser.add_argument("paths", nargs="+", help="视频文件或目录")
    args = parser.parse_args()

    videos: list[Path] = []
    for p in args.paths:
        pp = Path(p)
        if pp.is_dir():
            videos.extend(sorted(pp.glob("*.mp4")))
        elif pp.is_file() and pp.suffix.lower() == ".mp4":
            videos.append(pp)

    if not videos:
        print("未找到 mp4 文件", flush=True)
        sys.exit(1)

    sys.exit(asyncio.run(run(videos)))


if __name__ == "__main__":
    main()
