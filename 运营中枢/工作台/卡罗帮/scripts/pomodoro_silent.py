#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
静默番茄钟：不打开 WebPomodoro 界面，纯命令行计时 + 可选到时通知。
供卡若AI / 自动化流程调用，实现「开始专注 N 分钟」的静默操作。
归属：卡罗帮 · WebPomodoro 静默控制。
"""
import argparse
import subprocess
import sys
import time
from pathlib import Path

DEFAULT_MINUTES = 25
SCRIPT_DIR = Path(__file__).resolve().parent
LOG_DIR = SCRIPT_DIR.parent / "logs"


def notify_macos(title: str, body: str) -> None:
    """发送 macOS 原生通知（不打开任何 APP 窗口）。"""
    try:
        subprocess.run(
            [
                "osascript",
                "-e",
                f'display notification "{body}" with title "{title}" sound name "default"',
            ],
            check=True,
            capture_output=True,
        )
    except Exception as e:
        print(f"[静默番茄钟] 通知发送失败: {e}", file=sys.stderr)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="静默番茄钟：不打开 WebPomodoro，命令行计时 + 可选到时通知"
    )
    parser.add_argument(
        "--minutes", "-m",
        type=int,
        default=DEFAULT_MINUTES,
        help=f"专注时长（分钟），默认 {DEFAULT_MINUTES}",
    )
    parser.add_argument(
        "--notify",
        action="store_true",
        default=True,
        help="结束时发送 macOS 通知（默认开启）",
    )
    parser.add_argument(
        "--no-notify",
        action="store_true",
        help="不发送通知，仅打印日志",
    )
    parser.add_argument(
        "--rest-short",
        action="store_true",
        help="短休息（5 分钟）",
    )
    parser.add_argument(
        "--rest-long",
        action="store_true",
        help="长休息（15 分钟）",
    )
    parser.add_argument(
        "--label", "-l",
        type=str,
        default="",
        help="本次专注标签（会显示在通知中）",
    )
    args = parser.parse_args()

    do_notify = args.notify and not args.no_notify
    minutes = args.minutes

    if args.rest_short:
        minutes = 5
        label = "短休息"
    elif args.rest_long:
        minutes = 15
        label = "长休息"
    else:
        label = args.label or "专注"

    seconds = minutes * 60
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOG_DIR / "pomodoro_silent.log"

    with open(log_file, "a", encoding="utf-8") as f:
        f.write(f"[开始] {label} {minutes} 分钟\n")

    print(f"[静默番茄钟] 开始 {label}，{minutes} 分钟，不打开任何界面。", flush=True)
    if do_notify:
        print("[静默番茄钟] 结束后将发送系统通知。", flush=True)

    time.sleep(seconds)

    msg = f"{label} {minutes} 分钟已结束。"
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(f"[结束] {msg}\n")

    if do_notify:
        notify_macos("静默番茄钟", msg)

    print(f"[静默番茄钟] {msg}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
