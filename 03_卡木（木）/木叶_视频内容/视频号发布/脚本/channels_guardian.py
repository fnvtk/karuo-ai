#!/usr/bin/env python3
"""
视频号红字守护进程

目标：
1. 周期性扫描 post_list 多页，定位目标目录里的视频是否出现“发表失败/上传失败”红字。
2. 命中失败态时，自动调用 publish-one 对该条做定时重发。
3. 通过本地 state 文件限制重试频率，避免无限刷同一条。
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
MULTI_SCRIPT_DIR = SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"
if str(MULTI_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(MULTI_SCRIPT_DIR))
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from video_metadata import VideoMeta
import channels_publish as channels


STATE_FILE = SCRIPT_DIR / "channels_guardian_state.json"


def _now_s() -> int:
    return int(time.time())


def _log(msg: str) -> None:
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    print(f"[guardian] {ts} | {msg}", flush=True)


def _load_state() -> dict:
    if not STATE_FILE.exists():
        return {"videos": {}}
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"videos": {}}


def _save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def _publish_dir_running() -> bool:
    try:
        out = subprocess.run(
            ["pgrep", "-f", "channels_web_cli.py publish-dir"],
            capture_output=True,
            text=True,
            check=False,
        )
        return out.returncode == 0 and bool((out.stdout or "").strip())
    except Exception:
        return False


def _video_key(vp: Path) -> str:
    return str(vp.resolve())


def _video_candidates(vp: Path) -> list[str]:
    title = VideoMeta.from_filename(str(vp)).title("视频号")
    return channels._title_keywords_for_list_check(title, str(vp))


def _should_retry(video_state: dict, fail_hint: str, cooldown_sec: int, max_retries: int) -> bool:
    retries = int(video_state.get("retries", 0))
    last_retry_ts = int(video_state.get("last_retry_ts", 0))
    last_fail_hint = video_state.get("last_fail_hint", "")
    now = _now_s()
    if retries >= max_retries:
        return False
    if last_fail_hint == fail_hint and (now - last_retry_ts) < cooldown_sec:
        return False
    return True


def _call_retry(vp: Path, schedule_in_min: int) -> int:
    cmd = [
        "python3",
        str(SCRIPT_DIR / "channels_web_cli.py"),
        "publish-one",
        "--video",
        str(vp),
        "--no-dedup",
        "--skip-list-verify",
        "--schedule-in-min",
        str(schedule_in_min),
    ]
    _log(f"触发自动重试: {vp.name} | {' '.join(cmd[2:])}")
    result = subprocess.run(cmd, cwd=str(SCRIPT_DIR), check=False)
    return int(result.returncode)


def run_once(args) -> int:
    ok, msg, code = channels.verify_session_cookie()
    if not ok:
        _log(f"跳过本轮：登录态不可用 | {msg}")
        return 2 if code else 1

    if _publish_dir_running():
        _log("检测到 publish-dir 正在运行，本轮跳过，避免与批量发布抢会话")
        return 0

    video_dir = Path(args.video_dir).expanduser().resolve()
    videos = sorted(video_dir.glob("*.mp4"))
    if not videos:
        _log(f"未找到视频目录: {video_dir}")
        return 1

    cookie_str = channels._cookie_str_from_file()
    items = channels._gather_post_list(cookie_str, args.max_pages)
    state = _load_state()
    videos_state = state.setdefault("videos", {})
    retried = 0
    failures = 0

    for vp in videos:
        key = _video_key(vp)
        info = videos_state.setdefault(key, {})
        cands = _video_candidates(vp)
        fail_hint = channels._find_publish_failure_row(
            items,
            cands,
            list(channels.REQUIRED_DESC_FRAGMENTS),
        )
        if not fail_hint:
            info["last_seen_ok_ts"] = _now_s()
            continue

        failures += 1
        info["last_fail_hint"] = fail_hint
        info["last_fail_ts"] = _now_s()
        _log(f"命中红字失败: {vp.name} | {fail_hint}")

        if not _should_retry(info, fail_hint, args.retry_cooldown_sec, args.max_retries_per_video):
            _log(f"跳过重试（冷却/上限）: {vp.name}")
            continue

        rc = _call_retry(vp, args.schedule_in_min)
        info["retries"] = int(info.get("retries", 0)) + 1
        info["last_retry_ts"] = _now_s()
        info["last_retry_rc"] = rc
        retried += 1
        _save_state(state)
        # 单轮命中多条失败时，顺序重试，留一点缓冲避免接口风控。
        time.sleep(args.after_retry_sleep_sec)

    state["last_scan_ts"] = _now_s()
    state["last_scan_video_dir"] = str(video_dir)
    _save_state(state)
    _log(f"扫描完成 | videos={len(videos)} failures={failures} retried={retried}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="视频号红字守护进程")
    p.add_argument("--video-dir", required=True, help="需要守护的成片目录")
    p.add_argument("--interval-sec", type=int, default=180, help="守护轮询间隔秒数")
    p.add_argument("--max-pages", type=int, default=8, help="每轮最多扫描多少页 post_list")
    p.add_argument("--schedule-in-min", type=int, default=25, help="自动重试时延后多少分钟定时发")
    p.add_argument("--max-retries-per-video", type=int, default=3, help="单条视频最大自动重试次数")
    p.add_argument("--retry-cooldown-sec", type=int, default=900, help="同一失败态重试冷却秒数")
    p.add_argument("--after-retry-sleep-sec", type=int, default=15, help="每次重试后等待秒数")
    p.add_argument("--once", action="store_true", help="只扫描一轮")
    return p


def main() -> int:
    args = build_parser().parse_args()
    if args.once:
        return run_once(args)

    _log(f"守护启动 | dir={args.video_dir} interval={args.interval_sec}s")
    while True:
        try:
            run_once(args)
        except KeyboardInterrupt:
            raise
        except Exception as e:
            _log(f"异常: {str(e)[:200]}")
        time.sleep(max(10, args.interval_sec))


if __name__ == "__main__":
    raise SystemExit(main())
