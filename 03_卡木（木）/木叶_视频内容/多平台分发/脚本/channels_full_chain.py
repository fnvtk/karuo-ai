#!/usr/bin/env python3
"""
视频号发布全链路守护：
循环「全量预检（auth + finder_raw）→ 不合格则 playwright 登录 → distribute_all --until-success」，
直到本批次全部成功或进程被手动停止。

用法:
  python3 channels_full_chain.py --video-dir /tmp/soul_channels_127_128_bundle
  python3 channels_full_chain.py --video-dir ... --serial --until-success-sleep 180
额外参数会原样传给 distribute_all.py（例如 --no-dedup）。
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
CHANNELS_LOGIN = SCRIPT_DIR.parent.parent / "视频号发布" / "脚本" / "channels_login.py"
DISTRIBUTE = SCRIPT_DIR / "distribute_all.py"

sys.path.insert(0, str(SCRIPT_DIR))
from cookie_manager import channels_publish_storage_ready, sync_channels_cookie_files  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="视频号全链路守护（预检+登录+until-success）")
    parser.add_argument("--video-dir", required=True)
    parser.add_argument(
        "--sleep-between-mega-rounds",
        type=int,
        default=90,
        help="整轮分发仍失败时，休眠秒数后重新预检并进入下一轮",
    )
    parser.add_argument("--until-success-sleep", type=int, default=120)
    parser.add_argument("--serial", action="store_true", help="传给 distribute_all：串行发视频号")
    args, passthrough = parser.parse_known_args()

    vid = str(Path(args.video_dir).expanduser().resolve())
    cmd = [
        sys.executable,
        str(DISTRIBUTE),
        "--platforms",
        "视频号",
        "--video-dir",
        vid,
        "--auto-channels-login",
        "--until-success",
        "--until-success-sleep",
        str(args.until_success_sleep),
    ]
    if args.serial:
        cmd.append("--serial")
    cmd.extend(passthrough)

    mega = 0
    while True:
        mega += 1
        print(f"\n{'#' * 20} 全链路第 {mega} 轮（预检 → 分发）{'#' * 20}\n", flush=True)
        sync_channels_cookie_files()
        ok, msg = channels_publish_storage_ready()
        print(f"  [预检] {'✓' if ok else '✗'} {msg}", flush=True)
        if not ok and CHANNELS_LOGIN.exists():
            print("  [预检] 触发 channels_login --playwright-only 补全会话…", flush=True)
            subprocess.run(
                [sys.executable, str(CHANNELS_LOGIN), "--playwright-only"],
                cwd=str(CHANNELS_LOGIN.parent),
                timeout=700,
                check=False,
            )
            sync_channels_cookie_files()
            ok2, msg2 = channels_publish_storage_ready()
            print(f"  [预检·登录后] {'✓' if ok2 else '✗'} {msg2}", flush=True)

        print(f"  [分发] 启动: {' '.join(cmd)}\n", flush=True)
        r = subprocess.run(cmd, cwd=str(SCRIPT_DIR))
        if r.returncode == 0:
            print("\n[✓] 全链路结束：本批次视频号已全部成功。", flush=True)
            return 0
        print(
            f"\n[i] mega 轮未全部成功，{args.sleep_between_mega_rounds}s 后重新预检并入下一轮…\n",
            flush=True,
        )
        time.sleep(args.sleep_between_mega_rounds)


if __name__ == "__main__":
    raise SystemExit(main())
