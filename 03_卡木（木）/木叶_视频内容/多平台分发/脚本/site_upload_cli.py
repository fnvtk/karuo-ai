#!/usr/bin/env python3
"""
多平台站点上传 CLI（平台级）

目标：
1) 统一账号状态检测；
2) 各平台上传命令 CLI 化；
3) 失败时自动触发重登并重试，尽量收敛到成功。
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from cookie_manager import check_cookie_valid


SCRIPT_DIR = Path(__file__).resolve().parent
BASE_DIR = SCRIPT_DIR.parent.parent
DEFAULT_VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/第129场_20260320_output/成片")

LOGIN_COMMANDS = {
    "抖音": f'python3 "{BASE_DIR / "抖音发布" / "脚本" / "douyin_login.py"}"',
    "B站": f'python3 "{BASE_DIR / "B站发布" / "脚本" / "bilibili_login.py"}"',
    "视频号": f'python3 "{BASE_DIR / "视频号发布" / "脚本" / "channels_login.py"} --playwright-only"',
    "小红书": f'python3 "{BASE_DIR / "小红书发布" / "脚本" / "xiaohongshu_login.py"}"',
    "快手": f'python3 "{BASE_DIR / "快手发布" / "脚本" / "kuaishou_login.py"}"',
}


def _run_shell(cmd: str) -> int:
    print(f"[RUN] {cmd}", flush=True)
    return subprocess.call(cmd, shell=True)


def _check_platform(platform: str) -> tuple[bool, str]:
    ok, msg = check_cookie_valid(platform)
    icon = "✓" if ok else "✗"
    print(f"[{icon}] {platform}: {msg}", flush=True)
    return ok, msg


def cmd_check(args: argparse.Namespace) -> int:
    platforms = args.platforms
    all_ok = True
    for p in platforms:
        ok, _ = _check_platform(p)
        all_ok = all_ok and ok
    return 0 if all_ok else 1


def _ensure_login(platform: str) -> bool:
    ok, _ = _check_platform(platform)
    if ok:
        return True
    login_cmd = LOGIN_COMMANDS.get(platform)
    if not login_cmd:
        return False
    print(f"[i] {platform} 登录失效，自动触发重登...", flush=True)
    _run_shell(login_cmd)
    ok2, _ = _check_platform(platform)
    return ok2


def cmd_publish(args: argparse.Namespace) -> int:
    platforms = args.platforms
    video_dir = Path(args.video_dir).expanduser()
    if not video_dir.exists():
        print(f"[✗] 视频目录不存在: {video_dir}", flush=True)
        return 1

    # 先逐平台检测并尝试自动重登
    ready = []
    blocked = []
    for p in platforms:
        if _ensure_login(p):
            ready.append(p)
        else:
            blocked.append(p)

    if blocked:
        print(f"[!] 以下平台登录未恢复，将暂不执行: {', '.join(blocked)}", flush=True)
        for p in blocked:
            cmd = LOGIN_COMMANDS.get(p)
            if cmd:
                print(f"    重登命令: {cmd}", flush=True)

    if not ready:
        return 1

    # 用 distribute_all 做真正发布；直到成功模式交给 --until-success
    cmd_parts = [
        "python3",
        f'"{SCRIPT_DIR / "distribute_all.py"}"',
        "--platforms",
        *ready,
        "--video-dir",
        f'"{video_dir}"',
        "--legacy-schedule",
        "--min-gap",
        str(args.min_gap),
        "--max-gap",
        str(args.max_gap),
    ]
    if args.no_dedup:
        cmd_parts.append("--no-dedup")
    if args.until_success:
        cmd_parts.extend(
            [
                "--until-success",
                "--until-success-sleep",
                str(args.until_success_sleep),
                "--until-success-max-rounds",
                str(args.until_success_max_rounds),
            ]
        )
    return _run_shell(" ".join(cmd_parts))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="多平台站点上传 CLI")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_check = sub.add_parser("check", help="检查平台账号状态")
    p_check.add_argument(
        "--platforms",
        nargs="+",
        default=["抖音", "B站", "小红书", "快手", "视频号"],
        help="待检查平台列表",
    )
    p_check.set_defaults(func=cmd_check)

    p_pub = sub.add_parser("publish", help="按平台规则发布（支持自动重登+重试）")
    p_pub.add_argument("--platforms", nargs="+", required=True, help="待发布平台")
    p_pub.add_argument("--video-dir", default=str(DEFAULT_VIDEO_DIR), help="视频目录")
    p_pub.add_argument("--min-gap", type=int, default=10, help="相邻最小间隔（分钟）")
    p_pub.add_argument("--max-gap", type=int, default=120, help="相邻最大间隔（分钟）")
    p_pub.add_argument("--no-dedup", action="store_true", help="不去重")
    p_pub.add_argument("--until-success", action="store_true", help="失败自动轮询重试")
    p_pub.add_argument("--until-success-sleep", type=int, default=90, help="重试间隔（秒）")
    p_pub.add_argument("--until-success-max-rounds", type=int, default=3, help="最大重试轮数")
    p_pub.set_defaults(func=cmd_publish)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())

