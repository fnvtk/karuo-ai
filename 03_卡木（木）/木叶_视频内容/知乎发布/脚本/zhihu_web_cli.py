#!/usr/bin/env python3
"""知乎网页 CLI：check / login / publish-one / publish-dir / f12-profile。"""

from __future__ import annotations

import argparse
import asyncio
import inspect
import sys
from datetime import datetime, timedelta
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))
sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))

from publish_result import print_summary, save_results
from video_metadata import VideoMeta
from schedule_generator import generate_schedule

import zhihu_publish as zhihu
from zhihu_f12_profile import build_zhihu_profile, to_schedule_ts


def cmd_check(_args) -> int:
    ok, msg = zhihu.verify_session_cookie()
    print(msg, flush=True)
    return 0 if ok else 1


def cmd_f12_profile(args) -> int:
    scheduled = None
    if args.schedule_at:
        scheduled = datetime.fromisoformat(args.schedule_at.strip().replace("Z", "+00:00"))
    endpoint_rules, inject_rules = build_zhihu_profile(scheduled)
    print("=== 知乎 F12 抽象配置 ===")
    for r in endpoint_rules:
        print(f"- {r.name}: contains_any={r.contains_any}, methods={r.methods}")
    print(f"注入规则数: {len(inject_rules)}")
    if inject_rules:
        print(f"定时注入 Unix: {to_schedule_ts(scheduled)}")
    return 0


async def cmd_login(_args) -> int:
    import zhihu_login

    await zhihu_login.main()
    return 0


async def cmd_publish_one(args) -> int:
    ok, msg = zhihu.verify_session_cookie()
    if not ok:
        print(f"[✗] {msg}")
        return 1
    vp = Path(args.video).expanduser().resolve()
    if not vp.is_file():
        print(f"[✗] 文件不存在: {vp}")
        return 1
    title = VideoMeta.from_filename(vp.name).title("B站")

    if args.immediate:
        scheduled = None
    elif args.schedule_at:
        scheduled = datetime.fromisoformat(args.schedule_at.strip().replace("Z", "+00:00"))
    else:
        scheduled = datetime.now() + timedelta(minutes=args.schedule_in_min)

    r = await zhihu.publish_one(
        str(vp),
        title,
        idx=1,
        total=1,
        skip_dedup=args.no_dedup,
        scheduled_time=scheduled,
        headless=bool(getattr(args, "headless", False)),
        allow_manual_risk=True,
        allow_manual_entry=True,
    )
    if r.status != "skipped":
        save_results([r])
    print(r.log_line(), flush=True)
    return 0 if r.success else 1


async def cmd_publish_dir(args) -> int:
    ok, msg = zhihu.verify_session_cookie()
    if not ok:
        print(f"[✗] {msg}")
        return 1
    video_dir = Path(args.video_dir).expanduser()
    videos = sorted(video_dir.glob("*.mp4"))
    if args.offset:
        videos = videos[args.offset:]
    if args.limit > 0:
        videos = videos[: args.limit]
    if not videos:
        print(f"[✗] 未找到视频: {video_dir}")
        return 1

    schedules = generate_schedule(
        len(videos),
        min_gap=args.min_gap,
        max_gap=args.max_gap,
        first_delay=args.start_after_min,
    )

    results = []
    for i, (vp, sch) in enumerate(zip(videos, schedules), 1):
        title = VideoMeta.from_filename(vp.name).title("B站")
        scheduled = None if args.immediate else sch
        r = await zhihu.publish_one(
            str(vp),
            title,
            idx=i,
            total=len(videos),
            skip_dedup=args.no_dedup,
            scheduled_time=scheduled,
            headless=bool(getattr(args, "headless", False)),
            allow_manual_risk=True,
            allow_manual_entry=True,
        )
        results.append(r)
        if r.status != "skipped":
            save_results([r])
        if i < len(videos):
            await asyncio.sleep(args.gap_sec)

    actual = [r for r in results if r.status != "skipped"]
    print_summary(actual)
    success_count = sum(1 for r in actual if r.success)
    return 0 if success_count == len(actual) else 1


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="知乎网页发布 CLI")
    sub = p.add_subparsers(dest="cmd", required=True)

    p_check = sub.add_parser("check", help="检查知乎 Cookie/API 登录态")
    p_check.set_defaults(func=cmd_check)

    p_login = sub.add_parser("login", help="打开浏览器手工登录知乎并保存 Cookie")
    p_login.set_defaults(func=cmd_login)

    p_f12 = sub.add_parser("f12-profile", help="输出知乎 F12 接口抽象配置")
    p_f12.add_argument("--schedule-at", default="", help="ISO 时间，演示定时注入值")
    p_f12.set_defaults(func=cmd_f12_profile)

    p_one = sub.add_parser("publish-one", help="发布单条视频（支持定时）")
    p_one.add_argument("--video", required=True)
    p_one.add_argument("--schedule-in-min", type=int, default=15)
    p_one.add_argument("--schedule-at", default="")
    p_one.add_argument("--immediate", action="store_true")
    p_one.add_argument(
        "--headless",
        action="store_true",
        help="无界面模式（知乎上传在无头下易被限流或不上传，默认建议可视）",
    )
    p_one.add_argument("--no-dedup", action="store_true")
    p_one.set_defaults(func=cmd_publish_one)

    p_dir = sub.add_parser("publish-dir", help="批量发布目录内 mp4")
    p_dir.add_argument("--video-dir", required=True)
    p_dir.add_argument("--offset", type=int, default=0)
    p_dir.add_argument("--limit", type=int, default=0)
    p_dir.add_argument("--start-after-min", type=int, default=15)
    p_dir.add_argument("--min-gap", type=int, default=10)
    p_dir.add_argument("--max-gap", type=int, default=25)
    p_dir.add_argument("--gap-sec", type=int, default=3)
    p_dir.add_argument("--immediate", action="store_true")
    p_dir.add_argument(
        "--headless",
        action="store_true",
        help="无界面批量发布（默认可视，更利于知乎上传）",
    )
    p_dir.add_argument("--no-dedup", action="store_true")
    p_dir.set_defaults(func=cmd_publish_dir)

    return p


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if inspect.iscoroutinefunction(args.func):
        return asyncio.run(args.func(args))
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
