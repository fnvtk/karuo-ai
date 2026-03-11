#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
剪辑结束后自动关掉 ffmpeg

用法：
  1) 监视剪映（VideoFusion）：先启动本脚本，再打开剪映；剪映退出后自动杀 ffmpeg
     python3 kill_ffmpeg_when_clip_done.py --app VideoFusion

  2) 监视指定 PID（如某个 Python 剪辑脚本）
     python3 kill_ffmpeg_when_clip_done.py --pid 12345

  3) 立即杀掉当前所有 ffmpeg（不监视）
     python3 kill_ffmpeg_when_clip_done.py --kill-now
"""
import argparse
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional

SCRIPT_DIR = Path(__file__).resolve().parent


def _find_pid_by_app(app_name: str) -> Optional[int]:
    """通过进程名/应用名查 PID。macOS 下用 pgrep 匹配命令行或可执行路径。"""
    try:
        # 匹配进程命令行中含 app_name 的（如 VideoFusion、剪映、soul_enhance）
        r = subprocess.run(
            ["pgrep", "-f", app_name],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if r.returncode == 0 and r.stdout.strip():
            pids = r.stdout.strip().split()
            # 取第一个（主进程）
            return int(pids[0]) if pids else None
    except Exception:
        pass
    return None


def _is_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except (OSError, ProcessLookupError):
        return False


def _kill_all_ffmpeg():
    """结束当前用户下的所有 ffmpeg 进程。"""
    try:
        subprocess.run(
            ["pkill", "-f", "ffmpeg"],
            capture_output=True,
            timeout=5,
        )
        print("  已发送结束信号给所有 ffmpeg 进程。", flush=True)
    except Exception as e:
        print(f"  结束 ffmpeg 时出错: {e}", file=sys.stderr, flush=True)


def main():
    parser = argparse.ArgumentParser(
        description="剪辑一结束就关掉相关 ffmpeg（可监视剪映或指定 PID）"
    )
    parser.add_argument(
        "--app",
        "-a",
        default="",
        help="要监视的应用名，进程命令行匹配即算（如 VideoFusion、剪映、soul_enhance）",
    )
    parser.add_argument(
        "--pid",
        "-p",
        type=int,
        default=0,
        help="要监视的进程 PID，该进程退出后执行杀 ffmpeg",
    )
    parser.add_argument(
        "--kill-now",
        action="store_true",
        help="不监视，立即杀掉当前所有 ffmpeg 后退出",
    )
    parser.add_argument(
        "--interval",
        "-i",
        type=float,
        default=3.0,
        help="轮询间隔（秒），默认 3",
    )
    args = parser.parse_args()

    if args.kill_now:
        _kill_all_ffmpeg()
        return

    watch_pid = None
    if args.pid:
        watch_pid = args.pid
        if not _is_alive(watch_pid):
            print(f"  进程 PID={watch_pid} 已不存在。", flush=True)
            _kill_all_ffmpeg()
            return
        print(f"  监视 PID={watch_pid}，退出后将结束 ffmpeg。", flush=True)
    elif args.app:
        watch_pid = _find_pid_by_app(args.app)
        if not watch_pid:
            print(f"  未找到匹配「{args.app}」的进程，请先启动剪辑应用再运行本脚本。", flush=True)
            sys.exit(1)
        print(f"  监视应用「{args.app}」(PID={watch_pid})，退出后将结束 ffmpeg。", flush=True)
    else:
        print("  请指定 --app 应用名 或 --pid PID，或使用 --kill-now 仅杀 ffmpeg。", file=sys.stderr)
        sys.exit(1)

    while _is_alive(watch_pid):
        time.sleep(args.interval)

    print("  剪辑进程已结束，正在结束 ffmpeg…", flush=True)
    _kill_all_ffmpeg()


if __name__ == "__main__":
    main()
