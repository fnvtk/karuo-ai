#!/usr/bin/env python3
"""
视频号：严格两步——① 等微信扫码完成（Cookie 校验通过）② 再上传。

默认：弹出 Chromium 窗口扫码（与手机微信同一套实时码，易成功）；扫完并保存 Cookie 后自动进入上传。
无头：加 --silent-login（仅终端/对话看图，易与真实会话不一致）。

用法:
  cd 多平台分发/脚本
  python3 video_channels_resume.py --video-dir "/path/to/成片"
  python3 video_channels_resume.py --video-dir "/path/to/成片" --silent-login

铁律:
  - 未检测到有效 Cookie 前，绝不会启动 distribute_all。
  - Cookie 须「连续两次」间隔数秒检测通过，避免半写入就开传。
  - 仅第一步：--step1-only
"""
from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
BASE = SCRIPT_DIR.parent.parent
CHANNELS_LOGIN = BASE / "视频号发布" / "脚本" / "channels_login.py"
DISTRIBUTE = SCRIPT_DIR / "distribute_all.py"

QR_PATH = Path("/tmp/channels_qr.png")
LOGIN_LOG = Path("/tmp/channels_login_last.log")


def _cookie_ok() -> bool:
    sys.path.insert(0, str(SCRIPT_DIR))
    from cookie_manager import check_cookie_valid, sync_channels_cookie_files

    sync_channels_cookie_files()
    ok, _ = check_cookie_valid("视频号")
    return ok


def _step1_confirm_cookie() -> bool:
    if not _cookie_ok():
        return False
    time.sleep(4)
    return _cookie_ok()


def _run_visible_login() -> int:
    """阻塞运行 channels_login --playwright-only，弹窗 Chromium 扫码。"""
    env = os.environ.copy()
    env.pop("CHANNELS_SILENT_QR", None)
    env["PYTHONUNBUFFERED"] = "1"
    print(
        "\n[i] ▶ 即将弹出 Chromium 窗口：请用 **微信扫一扫** 扫窗口里的码，"
        "并在手机上确认登录。\n"
        "    登录成功并写入 Cookie 后，本脚本会自动进入下一步上传。\n",
        flush=True,
    )
    return subprocess.run(
        [sys.executable, str(CHANNELS_LOGIN), "--playwright-only"],
        cwd=str(CHANNELS_LOGIN.parent),
        env=env,
    ).returncode


def _run_silent_login_poll(*, poll_interval: int, poll_max: int) -> bool:
    """后台 headless 登录 + 轮询 Cookie。"""
    env = os.environ.copy()
    env["CHANNELS_SILENT_QR"] = "1"
    env["PYTHONUNBUFFERED"] = "1"
    LOGIN_LOG.parent.mkdir(parents=True, exist_ok=True)
    log_f = open(LOGIN_LOG, "w", encoding="utf-8")
    print(f"[i] 已启动静默登录（headless），日志：{LOGIN_LOG}", flush=True)
    proc = subprocess.Popen(
        [sys.executable, str(CHANNELS_LOGIN)],
        cwd=str(CHANNELS_LOGIN.parent),
        env=env,
        stdout=log_f,
        stderr=subprocess.STDOUT,
    )
    log_f.close()

    time.sleep(14)
    if QR_PATH.exists():
        desk = Path.home() / "Desktop" / "channels_login_qr.png"
        try:
            desk.write_bytes(QR_PATH.read_bytes())
        except Exception:
            desk = None
        print("\n========== SOUL_QR_IMAGE_FOR_CHAT ==========", flush=True)
        print(str(QR_PATH.resolve()), flush=True)
        if desk and desk.exists():
            print(f"file://{desk.resolve()}", flush=True)
        print("→ 请扫 **与 headless 会话对应** 的码（见上图路径）。", flush=True)
        print("========== END_SOUL_QR_MARKER ==========\n", flush=True)

    print(
        f"\n[i] STEP 1：轮询 Cookie（每 {poll_interval}s），最长约 "
        f"{poll_max * poll_interval // 60} 分钟…\n",
        flush=True,
    )
    ok_phase = False
    for i in range(poll_max):
        time.sleep(poll_interval)
        if _cookie_ok():
            time.sleep(4)
            if _cookie_ok():
                print(
                    f"\n[✓] STEP 1 完成：Cookie 已落盘（约 {(i + 1) * poll_interval}s）。\n",
                    flush=True,
                )
                ok_phase = True
                break
        if i % 5 == 4:
            print(
                f"  …仍等待扫码（{(i + 1) * poll_interval}s）",
                flush=True,
            )

    try:
        proc.terminate()
    except Exception:
        pass
    return ok_phase


def main() -> int:
    import argparse

    p = argparse.ArgumentParser(
        description="视频号：先扫码登录，再仅发视频号（断点 + until-success）",
    )
    p.add_argument("--video-dir", required=True, help="成片目录（含 mp4）")
    p.add_argument("--poll-interval", type=int, default=12, help="静默模式轮询秒数")
    p.add_argument("--poll-max", type=int, default=150, help="静默模式最多轮询次数")
    p.add_argument("--until-success-sleep", type=int, default=90, help="until-success 轮间隔")
    p.add_argument(
        "--silent-login",
        action="store_true",
        help="无头登录（不弹窗）；默认弹 Chromium 窗口扫码",
    )
    p.add_argument(
        "--step1-only",
        action="store_true",
        help="只做第一步：Cookie 有效即退出，不上传",
    )
    args = p.parse_args()

    vd = Path(args.video_dir)
    if not vd.is_dir():
        print(f"[✗] 目录不存在: {vd}", flush=True)
        return 1

    print("\n" + "=" * 60, flush=True)
    print("  【STEP 1 / 2】微信扫码登录视频号助手", flush=True)
    if args.silent_login:
        print("  模式：静默（headless）", flush=True)
    else:
        print("  模式：弹窗 Chromium（推荐）", flush=True)
    print("  未完成本步之前，不会开始上传。", flush=True)
    print("=" * 60 + "\n", flush=True)

    if _step1_confirm_cookie():
        print(
            "[✓] STEP 1：Cookie 已连续两次校验通过，跳过登录。\n",
            flush=True,
        )
    else:
        if not CHANNELS_LOGIN.exists():
            print(f"[✗] 未找到 {CHANNELS_LOGIN}", flush=True)
            return 1

        if args.silent_login:
            if not _run_silent_login_poll(
                poll_interval=args.poll_interval,
                poll_max=args.poll_max,
            ):
                print("[✗] STEP 1 超时：仍未获得有效 Cookie。", flush=True)
                return 1
        else:
            rc = _run_visible_login()
            if rc != 0:
                print(f"[✗] 登录进程退出码 {rc}，未保存 Cookie。", flush=True)
                return 1
            time.sleep(2)
            if not _step1_confirm_cookie():
                print(
                    "[✗] 弹窗登录结束但 Cookie 仍未通过连续校验，请重试或改用 --silent-login。",
                    flush=True,
                )
                return 1
            print("[✓] STEP 1 完成：弹窗扫码已落盘。\n", flush=True)

    if args.step1_only:
        print("[i] --step1-only：不上传，结束。", flush=True)
        return 0

    print("\n" + "=" * 60, flush=True)
    print("  【STEP 2 / 2】扫码已完成 → 开始仅视频号上传", flush=True)
    print("=" * 60 + "\n", flush=True)
    time.sleep(2)

    r = subprocess.run(
        [
            sys.executable,
            str(DISTRIBUTE),
            "--platforms",
            "视频号",
            "--video-dir",
            str(vd),
            "--until-success",
            "--until-success-sleep",
            str(args.until_success_sleep),
        ],
        cwd=str(SCRIPT_DIR),
    )
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
