#!/usr/bin/env python3
"""
卡若AI · 视频号网页 CLI

统一入口（面向后续长期使用）：
- publish-dir: 目录逐条发布（支持定时）
- check: Cookie/登录可用性检查

说明：
- 默认后台模式（headless）；可通过 --show 打开可视化调试。
- 定时失败会被安全拦截，不会误发立即发布。
"""
from __future__ import annotations

import argparse
import asyncio
import inspect
import sys
from datetime import datetime, timedelta
from pathlib import Path

BASE = Path(__file__).resolve().parents[2]
MULTI_SCRIPT_DIR = BASE / "多平台分发" / "脚本"
if str(MULTI_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(MULTI_SCRIPT_DIR))
if str(Path(__file__).parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent))

from publish_result import print_summary, save_results  # noqa: E402
from schedule_generator import generate_smart_schedule, generate_schedule  # noqa: E402
from video_metadata import VideoMeta  # noqa: E402
import channels_publish as channels  # noqa: E402


def _build_schedule(
    video_count: int,
    start_after_min: int,
    interval_min: int,
    *,
    use_legacy_schedule: bool = False,
    min_gap: int = 30,
    max_gap: int = 120,
) -> list[datetime]:
    if use_legacy_schedule:
        smart = generate_schedule(
            video_count,
            min_gap=min_gap,
            max_gap=max_gap,
            first_delay=start_after_min,
        )
    else:
        smart = generate_smart_schedule(video_count)
    min_dt = datetime.now() + timedelta(minutes=start_after_min)
    fixed = []
    for i, st in enumerate(smart):
        fixed.append(st if st > min_dt else min_dt + timedelta(minutes=interval_min * i))
    return fixed


async def cmd_publish_dir(args) -> int:
    video_dir = Path(args.video_dir).expanduser()
    videos = sorted(video_dir.glob("*.mp4"))
    if not videos:
        print(f"[✗] 未找到视频: {video_dir}")
        return 1

    schedules = _build_schedule(
        len(videos),
        args.start_after_min,
        args.interval_min,
        use_legacy_schedule=args.legacy_schedule,
        min_gap=args.min_gap,
        max_gap=args.max_gap,
    )

    print(f"共 {len(videos)} 条，逐条发布（安全定时模式）")
    for i, (v, dt) in enumerate(zip(videos, schedules), 1):
        print(f"  {i}. {v.name} -> {dt:%Y-%m-%d %H:%M}")

    results = []
    for i, vp in enumerate(videos, 1):
        title = VideoMeta.from_filename(str(vp)).title("视频号")
        r = None
        for attempt in range(1, args.max_attempts + 1):
            if attempt > 1:
                print(f"  [重试] 第 {i} 条第 {attempt}/{args.max_attempts} 次尝试")
            r = await channels.publish_one(
                str(vp),
                title,
                i,
                len(videos),
                skip_dedup=args.no_dedup,
                scheduled_time=schedules[i - 1],
            )
            retryable = (not r.success) and (
                (r.error_code in {"SCHEDULE_NOT_SET", "SCHEDULE_SET_ERROR"})
                or ("上传控件" in (r.message or ""))
                or ("set_input_files" in (r.message or ""))
            )
            if not retryable:
                break
            if attempt < args.max_attempts:
                await asyncio.sleep(args.retry_wait_sec)

        if r is None:
            continue
        results.append(r)
        if r.status != "skipped":
            save_results([r])
        if i < len(videos):
            await asyncio.sleep(args.gap_sec)

    actual = [r for r in results if r.status != "skipped"]
    print_summary(actual)
    ok = sum(1 for r in actual if r.success)
    return 0 if ok == len(actual) else 1


def cmd_check(_args) -> int:
    if channels.COOKIE_FILE.exists():
        print(f"[✓] Cookie 文件存在: {channels.COOKIE_FILE}")
        return 0
    print(f"[✗] Cookie 不存在: {channels.COOKIE_FILE}")
    return 1


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="卡若AI · 视频号网页 CLI")
    sub = p.add_subparsers(dest="cmd", required=True)

    p_check = sub.add_parser("check", help="检查视频号登录态文件")
    p_check.set_defaults(func=cmd_check)

    p_pub = sub.add_parser("publish-dir", help="目录逐条定时发布到视频号")
    p_pub.add_argument("--video-dir", required=True, help="视频目录（*.mp4）")
    p_pub.add_argument("--start-after-min", type=int, default=12, help="首条至少延后多少分钟")
    p_pub.add_argument("--interval-min", type=int, default=55, help="兜底条间隔（分钟）")
    p_pub.add_argument("--legacy-schedule", action="store_true", help="使用固定间隔区间排期")
    p_pub.add_argument("--min-gap", type=int, default=10, help="最小间隔（分钟）")
    p_pub.add_argument("--max-gap", type=int, default=120, help="最大间隔（分钟）")
    p_pub.add_argument("--gap-sec", type=int, default=10, help="两条任务之间等待秒数")
    p_pub.add_argument("--max-attempts", type=int, default=5, help="单条最大自动重试次数")
    p_pub.add_argument("--retry-wait-sec", type=int, default=8, help="重试等待秒数")
    p_pub.add_argument("--no-dedup", action="store_true", help="不做去重检查")
    p_pub.set_defaults(func=cmd_publish_dir)
    return p


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if inspect.iscoroutinefunction(args.func):
        return asyncio.run(args.func(args))
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
