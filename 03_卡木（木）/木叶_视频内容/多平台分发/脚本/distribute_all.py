#!/usr/bin/env python3
"""
多平台一键分发 v3 — 全链路自动化 + 定时排期
- 定时排期（默认）：generate_smart_schedule — 按条数自适应间隔/总跨度，并尽量避开本地 0–7 点
- 旧排期：--legacy-schedule + --min-gap / --max-gap / --max-hours（原 30–120min 随机）
- 并行分发：5 平台同时上传（asyncio.gather）
- 去重：每条视频按其在目录中的序号对齐排期（不因前面跳过而错位）
- 失败重试：--retry；Cookie 预警；结果写入 publish_log.json
- 视频号：发稿走 channels_api_publish（与「视频号发布/SKILL.md · 〇」一致）；手动静默扫码：CHANNELS_SILENT_QR=1 channels_login.py --silent-qr。`--auto-channels-login` 调起的子进程会**清除** CHANNELS_SILENT_QR，强制弹出 Chromium 窗口扫码；NO_AUTO_CHANNELS_LOGIN=1 则不自动调起

默认行为:
  未写 --platforms 时自动排除「快手」（仍可显式: --platforms 快手 或与其它平台并列）

用法:
  python3 distribute_all.py                        # 智能错峰定时排期
  python3 distribute_all.py --now                  # 立即发布（不排期）
  python3 distribute_all.py --legacy-schedule      # 固定随机间隔（旧逻辑）
  python3 distribute_all.py --platforms B站 快手     # 只发指定平台
  python3 distribute_all.py --check                # 检查 Cookie
  python3 distribute_all.py --retry                # 重试失败任务
  python3 distribute_all.py --video /path/to.mp4   # 发单条视频
  python3 distribute_all.py --no-dedup             # 跳过去重检查
  python3 distribute_all.py --serial               # 串行模式（调试用）
  python3 distribute_all.py --min-gap 30 --max-gap 120  # 仅与 --legacy-schedule 联用
"""
import argparse
import asyncio
import importlib.util
import inspect
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from datetime import datetime, timedelta

SCRIPT_DIR = Path(__file__).parent
BASE_DIR = SCRIPT_DIR.parent.parent
DEFAULT_VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 120场 20260320_output/成片_大师版")

sys.path.insert(0, str(SCRIPT_DIR))
from cookie_manager import (
    check_cookie_valid,
    load_cookies,
    SUPPORTED_PLATFORMS,
    sync_channels_cookie_files,
    channels_publish_storage_ready,
)
from publish_result import (PublishResult, print_summary, save_results,
                            load_published_set, load_failed_tasks)
from title_generator import generate_title
from schedule_generator import (
    generate_schedule,
    generate_smart_schedule,
    format_schedule,
)
from video_metadata import VideoMeta
from browser_profile import get_browser_profile_dir, profile_root_str

CHANNELS_LOGIN_SCRIPT = BASE_DIR / "视频号发布" / "脚本" / "channels_login.py"
LOGIN_COMMANDS = {
    "抖音": f'python3 "{BASE_DIR / "抖音发布" / "脚本" / "douyin_login.py"}"',
    "B站": f'python3 "{BASE_DIR / "B站发布" / "脚本" / "bilibili_login.py"}"',
    "视频号": f'CHANNELS_SILENT_QR=1 python3 "{CHANNELS_LOGIN_SCRIPT}" --silent-qr',
    "小红书": f'python3 "{BASE_DIR / "小红书发布" / "脚本" / "xiaohongshu_login.py"}"',
    "快手": f'python3 "{BASE_DIR / "快手发布" / "脚本" / "kuaishou_login.py"}"',
}
BAN_KEYWORDS = ("封禁", "封号", "禁止", "冻结", "suspend", "banned", "risk", "风控", "限制")
FEISHU_GROUP_SEND_DISABLED = os.environ.get("FEISHU_GROUP_SEND_DISABLED", "1").strip().lower() in {
    "1", "true", "yes", "on"
}

# 未指定 --platforms 时默认不参与分发的平台（显式写上平台名仍可发）
DEFAULT_DISTRIBUTE_SKIP_PLATFORMS = frozenset({"快手"})


def _apply_default_platform_skip(
    targets: list[str], *, user_specified_platforms: bool
) -> list[str]:
    if user_specified_platforms:
        return targets
    return [t for t in targets if t not in DEFAULT_DISTRIBUTE_SKIP_PLATFORMS]


def _print_unified_browser_profiles() -> None:
    print(f"\n  统一浏览器根目录: {profile_root_str()}")
    for p in PLATFORM_CONFIG:
        print(f"    - {p}: {get_browser_profile_dir(p)}")


def _classify_platform_status(
    platform: str,
    platform_results: list[PublishResult],
) -> tuple[str, str]:
    if not platform_results:
        ok, msg = check_cookie_valid(platform)
        if ok:
            return "空闲/未执行", "本轮未执行该平台发布"
        return "需重登", f"Cookie 无效：{msg}"

    successes = [r for r in platform_results if r.success]
    failures = [r for r in platform_results if not r.success]
    failure_msgs = " | ".join((r.message or "").lower() for r in failures)

    if any(k in failure_msgs for k in BAN_KEYWORDS):
        return "疑似封禁/风控", "失败信息包含封禁/风控关键词"
    if successes and not failures:
        return "正常", f"成功 {len(successes)}/{len(platform_results)}"
    if failures and not successes:
        ok, msg = check_cookie_valid(platform)
        if not ok:
            return "需重登", f"Cookie 无效：{msg}"
        return "持续失败", f"失败 {len(failures)} 条，需人工排查平台侧限制"
    if failures:
        return "部分失败", f"成功 {len(successes)} / 失败 {len(failures)}"
    return "正常", f"成功 {len(successes)}/{len(platform_results)}"


def print_platform_account_status(all_results: list[PublishResult], targets: list[str]) -> None:
    print(f"\n{'=' * 60}")
    print("  平台账号状态复盘")
    print(f"{'=' * 60}")
    regroup: dict[str, list[PublishResult]] = {p: [] for p in targets}
    for r in all_results:
        if r.platform in regroup and r.status != "skipped":
            regroup[r.platform].append(r)

    for p in targets:
        status, detail = _classify_platform_status(p, regroup[p])
        print(f"  [{p}] {status} | {detail}")
        if status in ("需重登", "持续失败", "疑似封禁/风控"):
            cmd = LOGIN_COMMANDS.get(p, "")
            if cmd:
                print(f"    重登命令: {cmd}")
    print(f"{'=' * 60}\n")


def auto_reauth_for_failed_platforms(all_results: list[PublishResult], targets: list[str]) -> None:
    """
    自动重登触发：
    - 某平台本轮结果全部失败，且错误信息包含“cookie 已过期/无效”
    - 自动执行该平台重登命令（如可用）
    """
    grouped: dict[str, list[PublishResult]] = {p: [] for p in targets}
    for r in all_results:
        if r.platform in grouped and r.status != "skipped":
            grouped[r.platform].append(r)

    for platform in targets:
        results = grouped.get(platform) or []
        if not results:
            continue
        if any(r.success for r in results):
            continue
        merged = " | ".join((r.message or "").lower() for r in results)
        if "cookie 已过期" not in merged and "cookie 无效" not in merged:
            continue
        cmd = LOGIN_COMMANDS.get(platform, "")
        if not cmd:
            continue
        print(f"  [自动重登] 检测到 {platform} Cookie 过期，执行: {cmd}", flush=True)
        try:
            subprocess.run(cmd, shell=True, check=False)
        except Exception as e:
            print(f"  [自动重登失败] {platform}: {str(e)[:120]}", flush=True)


def _enforce_channels_schedule_slots(
    schedule_times: list | None,
    total_videos: int,
    *,
    min_delay_minutes: int = 10,
) -> list:
    """
    视频号强制定时：
    - 若无排期，补一套排期；
    - 任一发布时间若过近（<= min_delay_minutes），自动顺延。
    """
    now = datetime.now()
    min_dt = now + timedelta(minutes=min_delay_minutes)
    if not schedule_times:
        schedule_times = [min_dt + timedelta(minutes=55 * i) for i in range(total_videos)]
        return schedule_times

    fixed = []
    for i, st in enumerate(schedule_times):
        if st <= min_dt:
            fixed.append(min_dt + timedelta(minutes=55 * i))
        else:
            fixed.append(st)
    return fixed


def _ensure_channels_cookie_or_login(*, auto_login: bool) -> None:
    """发视频号前对齐双路径 Cookie + finder_raw（发表必需）。默认静默；仅 auto_login 且未设 NO_AUTO_CHANNELS_LOGIN 时才调起扫码。"""
    sync_channels_cookie_files()
    pub_ok, pub_detail = channels_publish_storage_ready()
    if pub_ok:
        return
    print(f"\n[*] 视频号全链路预检: {pub_detail}", flush=True)
    if os.environ.get("NO_AUTO_CHANNELS_LOGIN", "").strip().lower() in ("1", "true", "yes"):
        print(
            "    （已设 NO_AUTO_CHANNELS_LOGIN：不自动弹窗，请先手动 channels_login 至 rawKeyBuff 就绪）\n",
            flush=True,
        )
        return
    if not auto_login:
        print(
            "    （未加 --auto-channels-login：请手动登录或重跑时加上该参数）\n",
            flush=True,
        )
        return
    if not CHANNELS_LOGIN_SCRIPT.exists():
        return
    print(
        "\n[*] 视频号需补全登录态 → 将弹出 Chromium 窗口扫码"
        "（须保持窗口直至终端提示 rawKeyBuff / Cookie 完成）\n",
        flush=True,
    )
    try:
        # 子进程去掉静默：即使用户 shell 里 export 了 CHANNELS_SILENT_QR=1，此处也强制有头窗口
        _login_env = {**os.environ}
        _login_env.pop("CHANNELS_SILENT_QR", None)
        subprocess.run(
            [sys.executable, str(CHANNELS_LOGIN_SCRIPT), "--playwright-only"],
            cwd=str(CHANNELS_LOGIN_SCRIPT.parent),
            timeout=1200,
            env=_login_env,
        )
    except subprocess.TimeoutExpired:
        print("[!] 登录流程超时（1200s）", flush=True)
    sync_channels_cookie_files()


PLATFORM_CONFIG = {
    "抖音": {
        "script": BASE_DIR / "抖音发布" / "脚本" / "douyin_pure_api.py",
        "cookie": BASE_DIR / "抖音发布" / "脚本" / "douyin_storage_state.json",
        "domain": "douyin.com",
        "module": "douyin_pure_api",
    },
    "B站": {
        "script": BASE_DIR / "B站发布" / "脚本" / "bilibili_publish.py",
        "cookie": BASE_DIR / "B站发布" / "脚本" / "bilibili_storage_state.json",
        "domain": "bilibili.com",
        "module": "bilibili_publish",
    },
    "视频号": {
        "script": BASE_DIR / "视频号发布" / "脚本" / "channels_api_publish.py",
        "cookie": BASE_DIR / "视频号发布" / "脚本" / "channels_storage_state.json",
        "domain": "weixin.qq.com",
        "module": "channels_api_publish",
    },
    "小红书": {
        "script": BASE_DIR / "小红书发布" / "脚本" / "xiaohongshu_publish.py",
        "cookie": BASE_DIR / "小红书发布" / "脚本" / "xiaohongshu_storage_state.json",
        "domain": "xiaohongshu.com",
        "module": "xiaohongshu_publish",
    },
    "快手": {
        "script": BASE_DIR / "快手发布" / "脚本" / "kuaishou_publish.py",
        "cookie": BASE_DIR / "快手发布" / "脚本" / "kuaishou_storage_state.json",
        "domain": "kuaishou.com",
        "module": "kuaishou_publish",
    },
}

_module_cache = {}


def check_cookies_with_alert() -> tuple[list[str], list[str]]:
    """检查 Cookie 并返回 (可用平台, 告警消息)"""
    print("=" * 60)
    print("  多平台 Cookie 状态")
    print("=" * 60)
    available = []
    alerts = []
    for platform in PLATFORM_CONFIG:
        is_valid, msg = check_cookie_valid(platform)
        icon = "✓" if is_valid else "✗"
        print(f"  [{icon}] {platform}: {msg}")
        if is_valid:
            available.append(platform)
        else:
            cookies = load_cookies(platform)
            if cookies is None:
                alerts.append(f"○ {platform} 未登录")
            else:
                alerts.append(f"✗ {platform} Cookie 已过期: {msg}")
    print(f"\n  可用平台: {', '.join(available) if available else '无'}")
    if alerts:
        print(f"\n  ⚠ Cookie 预警:")
        for a in alerts:
            print(f"    {a}")
    return available, alerts


def print_resume_report(
    targets: list[str],
    videos: list[Path],
    published_set: set,
    *,
    detail: bool = False,
) -> None:
    """
    断点续传说明：publish_log.json 里 success=true 的 (平台, 文件名) 会跳过，其余重传。
    """
    print(f"\n{'─' * 60}")
    print("  断点续传 / 待传清单（已成功条目自动跳过）")
    print(f"{'─' * 60}")
    total_pending = 0
    for p in targets:
        pending = [v for v in videos if (p, v.name) not in published_set]
        done = len(videos) - len(pending)
        total_pending += len(pending)
        print(f"  [{p}] 已成功 {done}/{len(videos)}  |  待上传 {len(pending)}")
        if detail and pending:
            for v in pending[:50]:
                print(f"      · {v.name}")
            if len(pending) > 50:
                print(f"      … 另有 {len(pending) - 50} 条")
    print(f"  合计待传任务: {total_pending} 条（多平台分别计数）")
    print(f"{'─' * 60}\n")


def send_feishu_alert(alerts: list[str]):
    """通过飞书 Webhook 发送 Cookie 过期预警"""
    if FEISHU_GROUP_SEND_DISABLED:
        print("  [i] 飞书群禁发已开启，跳过 Cookie 预警推送")
        return
    import os
    webhook = os.environ.get("FEISHU_WEBHOOK_URL", "")
    if not webhook or not alerts:
        return
    try:
        import requests
        body = {
            "msg_type": "text",
            "content": {
                "text": "【多平台分发 Cookie 预警】\n" + "\n".join(alerts)
            }
        }
        requests.post(webhook, json=body, timeout=10)
        print("  [i] 飞书预警已发送")
    except Exception as e:
        print(f"  [⚠] 飞书通知失败: {e}")


def load_platform_module(name: str, config: dict):
    if name in _module_cache:
        return _module_cache[name]
    script_path = config["script"]
    if not script_path.exists():
        return None
    spec = importlib.util.spec_from_file_location(config["module"], str(script_path))
    module = importlib.util.module_from_spec(spec)
    sys.path.insert(0, str(script_path.parent))
    spec.loader.exec_module(module)
    _module_cache[name] = module
    return module


async def distribute_to_platform(
    platform: str, config: dict, videos: list[Path],
    published_set: set, skip_dedup: bool = False,
    schedule_times: list = None,
) -> list[PublishResult]:
    """分发到单个平台（含去重 + 定时排期）"""
    print(f"\n{'#'*60}")
    print(f"  [{platform}] 开始分发")
    print(f"{'#'*60}")

    is_valid, msg = check_cookie_valid(platform)
    if not is_valid:
        print(f"  [{platform}] ✗ {msg}，跳过")
        return [PublishResult(platform=platform, video_path=str(v), title="",
                             success=False, status="error",
                             message=msg, error_code="COOKIE_INVALID") for v in videos]

    module = load_platform_module(platform, config)
    if not module:
        return [PublishResult(platform=platform, video_path=str(v), title="",
                             success=False, status="error", message="脚本不存在") for v in videos]

    titles_dict = getattr(module, "TITLES", {})
    to_publish = []
    skipped = []

    for vp in videos:
        key = (platform, vp.name)
        if not skip_dedup and key in published_set:
            skipped.append(vp)
        else:
            to_publish.append(vp)

    if skipped:
        print(f"  [{platform}] 跳过 {len(skipped)} 条已发布视频（去重）")

    results = []
    for s in skipped:
        results.append(PublishResult(
            platform=platform, video_path=str(s),
            title=generate_title(s.name, titles_dict),
            success=True, status="skipped", message="去重跳过（已发布）",
        ))

    idx_by_vp = {vp: j for j, vp in enumerate(videos)}
    schedule_ok = bool(schedule_times) and len(schedule_times) == len(videos)

    total = len(to_publish)
    pub_fn = getattr(module, "publish_one_compat", None) or module.publish_one
    pub_fn_params = set(inspect.signature(pub_fn).parameters.keys())
    for i, vp in enumerate(to_publish):
        vmeta = VideoMeta.from_filename(str(vp))
        title = vmeta.title(platform)
        stime = (
            schedule_times[idx_by_vp[vp]]
            if schedule_ok
            else None
        )
        try:
            kwargs = {"scheduled_time": stime}
            # 某些平台函数支持 skip_dedup，确保 --no-dedup 真正下传到平台实现。
            if "skip_dedup" in pub_fn_params:
                kwargs["skip_dedup"] = bool(skip_dedup)
            r = await pub_fn(str(vp), title, i + 1, total, **kwargs)
            if isinstance(r, PublishResult):
                results.append(r)
            else:
                results.append(PublishResult(
                    platform=platform, video_path=str(vp), title=title,
                    success=bool(r), status="reviewing" if r else "failed",
                    message="旧接口兼容",
                ))
        except Exception as e:
            results.append(PublishResult(
                platform=platform, video_path=str(vp), title=title,
                success=False, status="error", message=str(e)[:80],
            ))
        if i < total - 1:
            await asyncio.sleep(3)

    return results


async def run_parallel(targets: list[str], videos: list[Path],
                       published_set: set, skip_dedup: bool,
                       schedule_times: list = None) -> list[PublishResult]:
    """多平台并行分发（共享排期）"""
    tasks = []
    for platform in targets:
        config = PLATFORM_CONFIG[platform]
        task = distribute_to_platform(platform, config, videos, published_set, skip_dedup, schedule_times)
        tasks.append(task)

    platform_results = await asyncio.gather(*tasks, return_exceptions=True)

    all_results = []
    for i, res in enumerate(platform_results):
        if isinstance(res, Exception):
            for v in videos:
                all_results.append(PublishResult(
                    platform=targets[i], video_path=str(v), title="",
                    success=False, status="error", message=str(res)[:80],
                ))
        else:
            all_results.extend(res)
    return all_results


async def run_serial(targets: list[str], videos: list[Path],
                     published_set: set, skip_dedup: bool,
                     schedule_times: list = None) -> list[PublishResult]:
    """多平台串行分发（调试用）"""
    all_results = []
    for platform in targets:
        config = PLATFORM_CONFIG[platform]
        results = await distribute_to_platform(platform, config, videos, published_set, skip_dedup, schedule_times)
        all_results.extend(results)
    return all_results


async def retry_failed() -> list[PublishResult]:
    """重试历史失败任务"""
    failed = load_failed_tasks()
    if not failed:
        print("[i] 无失败任务需要重试")
        return []

    print(f"\n{'='*60}")
    print(f"  失败任务重试")
    print(f"{'='*60}")
    print(f"  待重试: {len(failed)} 条")

    results = []
    for task in failed:
        platform = task.get("platform", "")
        video_path = task.get("video_path", "")
        title = task.get("title", "")

        if platform not in PLATFORM_CONFIG:
            continue
        if not Path(video_path).exists():
            print(f"  [✗] 视频不存在: {video_path}")
            continue

        config = PLATFORM_CONFIG[platform]
        module = load_platform_module(platform, config)
        if not module:
            continue

        print(f"\n  [{platform}] 重试: {Path(video_path).name}")
        pub_fn = getattr(module, "publish_one_compat", None) or module.publish_one
        try:
            r = await pub_fn(video_path, title, 1, 1)
            if isinstance(r, PublishResult):
                results.append(r)
            else:
                results.append(PublishResult(
                    platform=platform, video_path=video_path, title=title,
                    success=bool(r), status="reviewing" if r else "failed",
                ))
        except Exception as e:
            results.append(PublishResult(
                platform=platform, video_path=video_path, title=title,
                success=False, status="error", message=str(e)[:80],
            ))
        await asyncio.sleep(3)

    return results


async def main():
    parser = argparse.ArgumentParser(description="多平台一键视频分发 v3（定时排期）")
    parser.add_argument("--platforms", nargs="+", help="指定平台")
    parser.add_argument("--check", action="store_true", help="只检查 Cookie")
    parser.add_argument("--retry", action="store_true", help="重试失败任务")
    parser.add_argument("--video", help="分发单条视频")
    parser.add_argument("--video-dir", help="自定义视频目录")
    parser.add_argument("--no-dedup", action="store_true", help="跳过去重")
    parser.add_argument("--serial", action="store_true", help="串行模式")
    parser.add_argument("--now", action="store_true", help="立即发布（不排期）")
    parser.add_argument("--min-gap", type=int, default=10, help="最小间隔(分钟)，仅 --legacy-schedule 生效")
    parser.add_argument("--max-gap", type=int, default=120, help="最大间隔(分钟)，仅 --legacy-schedule 生效")
    parser.add_argument("--max-hours", type=float, default=24.0, help="最大排期跨度(小时)，仅 --legacy-schedule 生效")
    parser.add_argument(
        "--legacy-schedule",
        action="store_true",
        help="使用固定随机间隔（--min-gap/--max-gap/--max-hours）；默认智能错峰排期",
    )
    parser.add_argument(
        "--auto-channels-login",
        action="store_true",
        help="视频号 Cookie 失效时自动调起扫码登录（默认静默，不弹窗）",
    )
    parser.add_argument(
        "--no-auto-channels-login",
        action="store_true",
        help=argparse.SUPPRESS,
    )
    parser.add_argument(
        "--allow-ui-browser",
        action="store_true",
        help="B站 Playwright 兜底使用有头浏览器（默认无窗口 headless）",
    )
    parser.add_argument(
        "--until-success",
        action="store_true",
        help="失败时每轮间隔后整表重试，直到全部成功或达 --until-success-max-rounds",
    )
    parser.add_argument(
        "--until-success-sleep",
        type=int,
        default=90,
        help="--until-success 每轮间隔秒数（默认 90）",
    )
    parser.add_argument(
        "--until-success-max-rounds",
        type=int,
        default=0,
        help="--until-success 最大轮数，0 表示不限制",
    )
    parser.add_argument(
        "--resume-report",
        action="store_true",
        help="仅打印各平台已成功/待传条数与清单，不执行上传",
    )
    parser.add_argument(
        "--resume-report-detail",
        action="store_true",
        help="与 --resume-report 合用，列出待传文件名",
    )
    args = parser.parse_args()

    _print_unified_browser_profiles()

    if not args.allow_ui_browser:
        os.environ.setdefault("PUBLISH_PLAYWRIGHT_HEADLESS", "1")

    will_touch_channels = (
        not args.check
        and not args.retry
        and (not args.platforms or "视频号" in args.platforms)
    )
    if will_touch_channels:
        _ensure_channels_cookie_or_login(
            auto_login=bool(args.auto_channels_login) and not args.no_auto_channels_login,
        )

    if args.check:
        available, alerts = check_cookies_with_alert()
        if alerts:
            send_feishu_alert(alerts)
        return 0

    if args.resume_report:
        available, alerts = check_cookies_with_alert()
        if alerts:
            send_feishu_alert(alerts)
        targets = args.platforms if args.platforms else available
        targets = [t for t in targets if t in available]
        targets = _apply_default_platform_skip(
            targets, user_specified_platforms=bool(args.platforms)
        )
        video_dir = Path(args.video_dir) if args.video_dir else DEFAULT_VIDEO_DIR
        if args.video:
            videos = [Path(args.video)]
        else:
            videos = sorted(video_dir.glob("*.mp4"))
        if not videos:
            print(f"\n[✗] 未找到视频: {video_dir}")
            return 1
        published_set = set() if args.no_dedup else load_published_set()
        if not targets:
            print("\n[✗] 无可用平台，无法生成续传报告")
            return 1
        print_resume_report(
            targets, videos, published_set, detail=args.resume_report_detail
        )
        return 0

    if args.retry:
        results = await retry_failed()
        if results:
            print_summary(results)
            save_results(results)
        return 0

    round_num = 0
    while True:
        round_num += 1
        if args.until_success and round_num > 1:
            print(
                f"\n{'#' * 20} until-success 第 {round_num} 轮 "
                f"（{args.until_success_sleep}s 后开始）{'#' * 20}\n",
                flush=True,
            )
            await asyncio.sleep(args.until_success_sleep)

        exit_code, failed_count = await _publish_one_round(args)

        if not args.until_success:
            return exit_code
        # 无可发平台 / 无视频等致命错误，勿无限重试
        if failed_count >= 9990:
            return exit_code
        if failed_count == 0:
            print("\n[✓] until-success：本轮无失败条目，结束。", flush=True)
            return 0
        if args.until_success_max_rounds and round_num >= args.until_success_max_rounds:
            print(
                f"\n[✗] until-success：已达最大轮数 {args.until_success_max_rounds}，"
                f"仍有约 {failed_count} 条失败。",
                flush=True,
            )
            return 1
        print(
            f"\n[i] until-success：仍有失败，约 {failed_count} 条；"
            f"{args.until_success_sleep}s 后重试（已成功写入日志会去重跳过）…",
            flush=True,
        )


async def _publish_one_round(args: argparse.Namespace) -> tuple[int, int]:
    """执行一轮分发。返回 (exit_code, 非跳过且失败的条数)。"""
    available, alerts = check_cookies_with_alert()
    if alerts:
        send_feishu_alert(alerts)

    if not available:
        print("\n[✗] 没有可用平台，请先登录:")
        for p in PLATFORM_CONFIG:
            print(f"    {p}: {LOGIN_COMMANDS.get(p, '(未配置)')}")
        return 1, 9999

    targets = args.platforms if args.platforms else available
    targets = [t for t in targets if t in available]
    targets = _apply_default_platform_skip(
        targets, user_specified_platforms=bool(args.platforms)
    )
    if not args.platforms and DEFAULT_DISTRIBUTE_SKIP_PLATFORMS:
        skipped = [p for p in DEFAULT_DISTRIBUTE_SKIP_PLATFORMS if p in available]
        if skipped:
            print(
                f"\n  [i] 默认已排除平台: {', '.join(skipped)}"
                f"（若要发送请显式: --platforms {' '.join(skipped)}）",
                flush=True,
            )
    if not targets:
        print("\n[✗] 指定的平台均不可用")
        return 1, 9999

    video_dir = Path(args.video_dir) if args.video_dir else DEFAULT_VIDEO_DIR
    if args.video:
        videos = [Path(args.video)]
    else:
        videos = sorted(video_dir.glob("*.mp4"))
    if not videos:
        print(f"\n[✗] 未找到视频: {video_dir}")
        return 1, 9999

    published_set = set() if args.no_dedup else load_published_set()

    if not args.no_dedup:
        print_resume_report(targets, videos, published_set, detail=False)

    mode = "串行" if args.serial else "并行"
    total_new = 0
    for p in targets:
        for v in videos:
            if (p, v.name) not in published_set:
                total_new += 1

    force_channels_timed = "视频号" in targets
    effective_now = bool(args.now) and not force_channels_timed
    if args.now and force_channels_timed:
        print("  [i] 检测到视频号任务：已忽略 --now，改为按时间节点定时发布。")
    schedule_times = None
    if (not effective_now and total_new > 1) or force_channels_timed:
        if args.legacy_schedule:
            schedule_times = generate_schedule(
                len(videos),
                min_gap=args.min_gap,
                max_gap=args.max_gap,
                max_hours=args.max_hours,
            )
        else:
            schedule_times = generate_smart_schedule(len(videos))
    if force_channels_timed:
        schedule_times = _enforce_channels_schedule_slots(schedule_times, len(videos))

    print(f"\n{'='*60}")
    print(f"  分发计划 ({mode})")
    print(f"{'='*60}")
    print(f"  视频数: {len(videos)}")
    print(f"  目标平台: {', '.join(targets)}")
    print(f"  新任务: {total_new} 条")
    sched_label = "立即发布"
    if schedule_times:
        sched_label = "定时排期（智能错峰）" if not args.legacy_schedule else "定时排期（legacy 随机间隔）"
    print(f"  发布方式: {sched_label if not effective_now else '立即发布'}")
    if not args.no_dedup:
        skipped = len(videos) * len(targets) - total_new
        if skipped > 0:
            print(f"  去重跳过: {skipped} 条")

    if schedule_times:
        print(f"\n  排期表：")
        print(format_schedule([v.name for v in videos], schedule_times))
    print()

    if total_new == 0:
        print("[i] 所有视频已发布到所有平台，无新任务")
        return 0, 0

    t0 = time.time()
    if args.serial:
        all_results = await run_serial(targets, videos, published_set, args.no_dedup, schedule_times)
    else:
        all_results = await run_parallel(targets, videos, published_set, args.no_dedup, schedule_times)

    actual_results = [r for r in all_results if r.status != "skipped"]
    print_summary(actual_results)
    save_results(actual_results)

    ok = sum(1 for r in actual_results if r.success)
    total = len(actual_results)
    elapsed = time.time() - t0
    print(f"  总耗时: {elapsed:.1f}s  |  日志: {SCRIPT_DIR / 'publish_log.json'}")

    failed_count = total - ok
    if failed_count > 0:
        print(f"\n  有 {failed_count} 条失败，可执行: python3 distribute_all.py --retry")

    failed_non_success = sum(1 for r in actual_results if not r.success)
    print_platform_account_status(actual_results, targets)
    auto_reauth_for_failed_platforms(actual_results, targets)
    return (0 if ok == total else 1), failed_non_success


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
