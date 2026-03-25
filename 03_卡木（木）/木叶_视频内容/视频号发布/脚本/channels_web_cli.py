#!/usr/bin/env python3
"""
卡若AI · 视频号网页 CLI

统一入口（面向后续长期使用）：
- publish-dir: 目录逐条发布（支持定时）；可用 --limit 1 --offset N --gap-sec 分步续跑
- publish-one: 单条发布（逐步上传、修 Cookie/脚本后再跑下一条）
- check: Cookie 文件 + post_list API 检查
- session: 仅 post_list API 探测
- publish_auto.sh: 先 check 再 publish-dir（参数透传）

说明：
- 默认无窗口（headless）；--show 或环境 CHANNELS_HEADED=1 可有头调试。
- 环境 CHANNELS_FORCE_HEADLESS=1 时始终无头（即使传 --show）。
- 描述与话题与多平台 video_metadata 一致（视频号含固定话题标签）。
- 定时失败会被安全拦截，不会误发立即发布。
"""
from __future__ import annotations

import argparse
import asyncio
import inspect
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

BASE = Path(__file__).resolve().parents[2]
MULTI_SCRIPT_DIR = BASE / "多平台分发" / "脚本"
if str(MULTI_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(MULTI_SCRIPT_DIR))
if str(Path(__file__).parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent))

from publish_result import PublishResult, print_summary, save_results  # noqa: E402
from schedule_generator import generate_smart_schedule, generate_schedule  # noqa: E402
from video_metadata import VideoMeta  # noqa: E402
import channels_publish as channels  # noqa: E402
from channels_f12_profile import build_channels_profile, to_schedule_ts  # noqa: E402


def _cli_headless(show_flag: bool) -> bool:
    """
    默认无窗口（headless=True）。
    - --show：有头调试
    - 环境 CHANNELS_HEADED=1：强制有头（等同长期调试）
    - 环境 CHANNELS_FORCE_HEADLESS=1：强制无头（即使传了 --show，防误开窗口）
    """
    if os.environ.get("CHANNELS_FORCE_HEADLESS", "").strip().lower() in ("1", "true", "yes"):
        if show_flag:
            print("[i] 已设 CHANNELS_FORCE_HEADLESS，仍使用无头模式", flush=True)
        return True
    if os.environ.get("CHANNELS_HEADED", "").strip().lower() in ("1", "true", "yes"):
        if show_flag:
            print("[i] CHANNELS_HEADED=1 与 --show 同时存在时以有头为准", flush=True)
        return False
    return not show_flag


def _print_publish_outcome(r: PublishResult, *, label: str = "发布结果") -> None:
    """终端明确写出一条发布结果，便于复制复盘。"""
    ok = "成功" if r.success else "失败"
    print(f"\n=== {label} ===", flush=True)
    print(f"  判定: {ok}", flush=True)
    print(f"  状态: {r.status}", flush=True)
    print(f"  平台: {r.platform}", flush=True)
    print(f"  标题: {r.title}", flush=True)
    print(f"  说明: {r.message or '（无）'}", flush=True)
    if getattr(r, "error_code", None):
        print(f"  错误码: {r.error_code}", flush=True)
    if getattr(r, "elapsed_sec", None) is not None:
        print(f"  耗时: {r.elapsed_sec:.1f}s", flush=True)
    print(f"  日志行: {r.log_line()}", flush=True)


def _session_check_or_exit() -> int | None:
    """发布前 API 预检；失败返回非 0 退出码。CHANNELS_SKIP_SESSION_CHECK=1 可跳过。"""
    if os.environ.get("CHANNELS_SKIP_SESSION_CHECK", "").strip() in ("1", "true", "yes"):
        print("[i] 已跳过会话预检（CHANNELS_SKIP_SESSION_CHECK）", flush=True)
        return None
    ok, msg, code = channels.verify_session_cookie()
    if ok:
        print(f"[✓] {msg}", flush=True)
        return None
    print(f"[✗] 视频号登录态不可用: {msg}", flush=True)
    print(
        "  请先登录：cd 脚本目录后执行\n"
        "    python3 channels_login.py\n"
        "  或静默二维码：CHANNELS_SILENT_QR=1 python3 channels_login.py\n"
        "  扫 /tmp/channels_qr.png 后再跑本命令。",
        flush=True,
    )
    if code == 300334:
        print("  （300334 一般为登录过期，需重新扫码）", flush=True)
    return 2


def _build_schedule(
    video_count: int,
    start_after_min: int,
    interval_min: int,
    *,
    use_legacy_schedule: bool = False,
    min_gap: int = 10,
    max_gap: int = 25,
) -> list[datetime]:
    # 始终使用 generate_schedule 并传入 min_gap/max_gap，确保间隔参数生效
    smart = generate_schedule(
        video_count,
        min_gap=min_gap,
        max_gap=max_gap,
        first_delay=start_after_min,
    )
    min_dt = datetime.now() + timedelta(minutes=start_after_min)
    fixed = []
    for i, st in enumerate(smart):
        fixed.append(st if st > min_dt else min_dt + timedelta(minutes=interval_min * i))

    # 强制校验：相邻间隔必须 >= min_gap 分钟
    for i in range(1, len(fixed)):
        gap_min = (fixed[i] - fixed[i - 1]).total_seconds() / 60
        if gap_min < min_gap:
            fixed[i] = fixed[i - 1] + timedelta(minutes=min_gap)

    return fixed


async def cmd_publish_dir(args) -> int:
    if (e := _session_check_or_exit()) is not None:
        return e
    # 轻量模式默认开启；若需F12全量抓包，传 CHANNELS_FORCE_F12=1 覆盖
    if os.environ.get("CHANNELS_FORCE_F12", "").strip() not in ("1", "true", "yes"):
        os.environ["CHANNELS_LIGHT_MODE"] = "1"
    else:
        os.environ["CHANNELS_LIGHT_MODE"] = "0"
    video_dir = Path(args.video_dir).expanduser()
    videos = sorted(video_dir.glob("*.mp4"))
    if args.offset:
        videos = videos[args.offset :]
    if args.limit > 0:
        videos = videos[: args.limit]
    if not videos:
        print(f"[✗] 未找到视频（或 offset/limit 后为空）: {video_dir}")
        return 1

    schedules = _build_schedule(
        len(videos),
        args.start_after_min,
        args.interval_min,
        use_legacy_schedule=args.legacy_schedule,
        min_gap=args.min_gap,
        max_gap=args.max_gap,
    )

    print(
        f"共 {len(videos)} 条，逐条发布（安全定时模式）"
        + (
            f" [offset={args.offset}, limit={args.limit}]"
            if (args.offset or (args.limit and args.limit > 0))
            else ""
        )
    )
    for i, (v, dt) in enumerate(zip(videos, schedules), 1):
        print(f"  {i}. {v.name} -> {dt:%Y-%m-%d %H:%M}")

    results = []
    for i, vp in enumerate(videos, 1):
        title = VideoMeta.from_filename(str(vp)).title("视频号")

        # 快速提交模式：不在本机长时间等待，直接设置平台定时并提交
        if i > 1:
            print(f"  [快速模式] 第{i}条直接提交，平台定时={schedules[i-1]:%H:%M}", flush=True)

        r = None
        for attempt in range(1, args.max_attempts + 1):
            if not vp.is_file():
                print(f"  [✗] 源文件不存在，跳过重试: {vp.name}", flush=True)
                r = PublishResult(
                    platform="视频号",
                    video_path=str(vp),
                    title=title,
                    success=False,
                    status="error",
                    message="源文件不存在（成片勿与 soul_enhance 同时写同一目录）",
                    error_code="FILE_NOT_FOUND",
                )
                break
            if attempt > 1:
                print(f"  [重试] 第 {i} 条第 {attempt}/{args.max_attempts} 次尝试")
            hl = _cli_headless(bool(args.show))
            r = await channels.publish_one(
                str(vp),
                title,
                i,
                len(videos),
                skip_dedup=args.no_dedup,
                scheduled_time=schedules[i - 1],
                skip_list_verify=args.skip_list_verify,
                headless=hl,
            )
            retryable = (not r.success) and (
                (
                    r.error_code
                    in {
                        "SCHEDULE_NOT_SET",
                        "SCHEDULE_SET_ERROR",
                        "SCHEDULE_INJECT_MISS",
                        "ORIGINAL_NOT_SET",
                        "ORIGINAL_CONFIRM_REQUIRED",
                    }
                )
                or ("上传控件" in (r.message or ""))
                or ("set_input_files" in (r.message or ""))
                or ("列表API" in (r.message or ""))
                or ("红字" in (r.message or ""))
                or ("发表失败" in (r.message or ""))
                or ("上传失败" in (r.message or ""))
            )
            if not retryable:
                if (r.message or "") and "Cookie" in r.message and "过期" in r.message:
                    print(
                        "  [!] Cookie 过期：请 `python3 channels_login.py` 扫码后再跑（勿空转重试）。",
                        flush=True,
                    )
                break
            if attempt < args.max_attempts:
                await asyncio.sleep(args.retry_wait_sec)

        if r is None:
            continue
        results.append(r)
        if r.status != "skipped":
            save_results([r])

    actual = [r for r in results if r.status != "skipped"]
    print_summary(actual)
    ok = sum(1 for r in actual if r.success)
    if actual:
        exit_hint = "0（全部成功）" if ok == len(actual) else "1（存在失败）"
        print(
            f"\n[批次发布结果] 共 {len(actual)} 条，成功 {ok}，失败 {len(actual) - ok}，"
            f"建议进程退出 {exit_hint}",
            flush=True,
        )
    else:
        print(
            "\n[批次发布结果] 无未跳过的条目（可能全部为 skipped 或未产出结果）",
            flush=True,
        )
    return 0 if ok == len(actual) else 1


def cmd_check(_args) -> int:
    if not channels.COOKIE_FILE.exists():
        print(f"[✗] Cookie 不存在: {channels.COOKIE_FILE}")
        return 1
    print(f"[✓] Cookie 文件存在: {channels.COOKIE_FILE}")
    ok, msg, code = channels.verify_session_cookie()
    if ok:
        print(f"[✓] API: {msg}")
        return 0
    print(f"[✗] API: {msg}")
    print("  请运行: python3 channels_login.py（或 CHANNELS_SILENT_QR=1）")
    return 1


def cmd_session(_args) -> int:
    ok, msg, _code = channels.verify_session_cookie()
    print(msg, flush=True)
    return 0 if ok else 1


def cmd_f12_profile(args) -> int:
    """输出视频号 F12 接口抽象配置（给新网站复用参考）。"""
    scheduled = None
    if args.schedule_at:
        scheduled = datetime.fromisoformat(args.schedule_at.strip().replace("Z", "+00:00"))
    endpoint_rules, inject_rules = build_channels_profile(scheduled_time=scheduled)

    print("=== 视频号 F12 抽象配置 ===")
    print("关键接口：")
    for r in endpoint_rules:
        print(f"  - {r.name}: contains_any={r.contains_any}, methods={r.methods}")
    print(f"注入规则数: {len(inject_rules)}")
    if inject_rules:
        ts = to_schedule_ts(scheduled)
        print(f"  - post_create 注入定时 Unix: {ts}")
        print("  - 注入字段: effectiveTime, postTimingInfo.postTime, postInfo.postTime, postInfo.publishType")
    print("模板文件:")
    print("  - 多平台分发/脚本/web_f12_sdk.py")
    print("  - 多平台分发/脚本/web_f12_platform_template.py")
    return 0


async def cmd_publish_one(args) -> int:
    """单条上传：适合逐步执行、修问题后再跑下一条。"""
    if (e := _session_check_or_exit()) is not None:
        return e
    vp = Path(args.video).expanduser().resolve()
    if not vp.is_file():
        print(f"[✗] 文件不存在: {vp}")
        return 1
    title = VideoMeta.from_filename(str(vp)).title("视频号")
    scheduled = None
    if args.immediate:
        scheduled = None
    elif args.schedule_at:
        s = args.schedule_at.strip().replace("Z", "+00:00")
        scheduled = datetime.fromisoformat(s)
    else:
        scheduled = datetime.now() + timedelta(minutes=args.schedule_in_min)

    when = "立即" if scheduled is None else scheduled.strftime("%Y-%m-%d %H:%M")
    print(f"[publish-one] {vp.name} | 定时: {when}", flush=True)

    hl = _cli_headless(bool(args.show))
    r = await channels.publish_one(
        str(vp),
        title,
        1,
        1,
        skip_dedup=args.no_dedup,
        scheduled_time=scheduled,
        skip_list_verify=args.skip_list_verify,
        headless=hl,
    )
    if r.status != "skipped":
        save_results([r])
    _print_publish_outcome(r, label="单条发布结果")
    return 0 if r.success else 1


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="卡若AI · 视频号网页 CLI")
    sub = p.add_subparsers(dest="cmd", required=True)

    p_check = sub.add_parser("check", help="检查 Cookie 文件 + post_list API 是否可用")
    p_check.set_defaults(func=cmd_check)

    p_sess = sub.add_parser("session", help="仅探测 post_list API（与 check 中 API 部分相同）")
    p_sess.set_defaults(func=cmd_session)

    p_f12 = sub.add_parser("f12-profile", help="输出视频号 F12 接口抽象（供 CLI/新网站复用）")
    p_f12.add_argument(
        "--schedule-at",
        default="",
        help="可选，ISO 时间；用于演示 post_create 定时字段注入值",
    )
    p_f12.set_defaults(func=cmd_f12_profile)

    p_pub = sub.add_parser("publish-dir", help="目录逐条定时发布到视频号")
    p_pub.add_argument("--video-dir", required=True, help="视频目录（*.mp4）")
    p_pub.add_argument(
        "--limit",
        type=int,
        default=0,
        help="只处理前 N 条（0=不限制，适合逐步跑）",
    )
    p_pub.add_argument(
        "--offset",
        type=int,
        default=0,
        help="跳过前 N 个 mp4（与 sort 后顺序一致，用于续跑）",
    )
    p_pub.add_argument("--start-after-min", type=int, default=12, help="首条至少延后多少分钟")
    p_pub.add_argument("--interval-min", type=int, default=55, help="兜底条间隔（分钟）")
    p_pub.add_argument("--legacy-schedule", action="store_true", help="使用固定间隔区间排期")
    p_pub.add_argument("--min-gap", type=int, default=10, help="最小间隔（分钟）")
    p_pub.add_argument("--max-gap", type=int, default=25, help="最大间隔（分钟）")
    p_pub.add_argument("--gap-sec", type=int, default=10, help="两条任务之间等待秒数")
    p_pub.add_argument("--max-attempts", type=int, default=5, help="单条最大自动重试次数")
    p_pub.add_argument("--retry-wait-sec", type=int, default=8, help="重试等待秒数")
    p_pub.add_argument("--no-dedup", action="store_true", help="不做去重检查")
    p_pub.add_argument(
        "--skip-list-verify",
        action="store_true",
        help="PUBLISH 接口返回成功后不再拉 post_list 核验（避免后台描述与标签字段不一致导致误判失败）",
    )
    p_pub.add_argument(
        "--show",
        action="store_true",
        help="有头模式（弹出 Chromium）。默认无头；也可设 CHANNELS_HEADED=1",
    )
    p_pub.set_defaults(func=cmd_publish_dir)

    p_one = sub.add_parser("publish-one", help="单条发布（逐步上传/排错）")
    p_one.add_argument("--video", required=True, help="单个 mp4 路径")
    p_one.add_argument(
        "--schedule-in-min",
        type=int,
        default=12,
        help="无 --schedule-at 且非 --immediate 时：从现在起延后多少分钟定时发（默认 12）",
    )
    p_one.add_argument(
        "--schedule-at",
        default="",
        help="绝对定时 ISO，如 2026-03-25T14:30:00（覆盖 schedule-in-min）",
    )
    p_one.add_argument(
        "--immediate",
        action="store_true",
        help="不定时，立即发表（慎用）",
    )
    p_one.add_argument("--no-dedup", action="store_true", help="不做去重检查")
    p_one.add_argument("--skip-list-verify", action="store_true", help="同 publish-dir")
    p_one.add_argument(
        "--show",
        action="store_true",
        help="有头调试（默认无头）",
    )
    p_one.set_defaults(func=cmd_publish_one)

    return p


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if inspect.iscoroutinefunction(args.func):
        return asyncio.run(args.func(args))
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
