#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""将 Soul 技能包 zip 按小块 SCP 到阿猫 Mac，支持断点续传；远端合并后校验。"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ZIP = Path.home() / "Downloads" / "Soul运营全链路技能包_20260320.zip"
CHUNK_DIR = Path(__file__).resolve().parent / "_upload_chunks_512k"
STATE = CHUNK_DIR / "upload_state.json"
SSH_HOST = "kr@macbook.quwanzhi.com"
SSH_PORT = "22203"
REMOTE_DIR = "~/Downloads/soul_zip_chunks_20260320"
REMOTE_ZIP = "~/Downloads/Soul运营全链路技能包_20260320.zip"
CHUNK_BYTES = 512 * 1024
SCP_RETRIES = 12
SCP_RETRY_SLEEP = 3


def sh(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(args, capture_output=True, text=True, check=check)


def remote_cmd(cmd: str, check: bool = True) -> str:
    r = subprocess.run(
        [
            "ssh",
            "-o",
            "BatchMode=yes",
            "-o",
            "ConnectTimeout=25",
            "-p",
            SSH_PORT,
            SSH_HOST,
            cmd,
        ],
        capture_output=True,
        text=True,
    )
    if check and r.returncode != 0:
        print(r.stderr or r.stdout, file=sys.stderr)
        r.check_returncode()
    return (r.stdout or "").strip()


def ensure_chunks() -> list[Path]:
    CHUNK_DIR.mkdir(parents=True, exist_ok=True)
    marker = CHUNK_DIR / ".split_ok"
    parts = sorted(CHUNK_DIR.glob("soulch*"))
    if marker.is_file() and parts:
        exp = ZIP.stat().st_size
        got = sum(p.stat().st_size for p in parts)
        if got == exp:
            return parts
    for p in CHUNK_DIR.glob("soulch*"):
        p.unlink(missing_ok=True)
    marker.unlink(missing_ok=True)
    if not ZIP.is_file():
        print(f"ERROR: 找不到 {ZIP}", file=sys.stderr)
        sys.exit(1)
    # BSD split: prefix without separator -> soulchaa soulchab ...
    subprocess.run(
        ["split", "-b", str(CHUNK_BYTES), str(ZIP), str(CHUNK_DIR / "soulch")],
        check=True,
    )
    marker.write_text(str(ZIP.stat().st_size), encoding="utf-8")
    return sorted(CHUNK_DIR.glob("soulch*"))


def load_state() -> dict:
    if STATE.is_file():
        return json.loads(STATE.read_text(encoding="utf-8"))
    return {"done": [], "expected_zip_size": ZIP.stat().st_size}


def save_state(st: dict) -> None:
    STATE.write_text(json.dumps(st, ensure_ascii=False, indent=0), encoding="utf-8")


def scp_one(local: Path, remote_name: str) -> bool:
    dest = f"{SSH_HOST}:{REMOTE_DIR}/{remote_name}"
    for attempt in range(1, SCP_RETRIES + 1):
        r = subprocess.run(
            [
                "scp",
                "-o",
                "BatchMode=yes",
                "-o",
                "ConnectTimeout=25",
                "-o",
                "ServerAliveInterval=10",
                "-o",
                "ServerAliveCountMax=6",
                "-P",
                SSH_PORT,
                str(local),
                dest,
            ],
            capture_output=True,
            text=True,
        )
        if r.returncode == 0:
            return True
        err = (r.stderr or r.stdout or "").strip()
        print(f"  scp fail {local.name} try {attempt}/{SCP_RETRIES}: {err[:120]}", file=sys.stderr)
        time.sleep(SCP_RETRY_SLEEP)
    return False


def main() -> int:
    parts = ensure_chunks()
    st = load_state()
    done_set = set(st.get("done", []))
    remote_cmd(f"mkdir -p {REMOTE_DIR}")
    remote_cmd(f"rm -f {REMOTE_ZIP}", check=False)

    total = len(parts)
    for i, p in enumerate(parts, 1):
        name = p.name
        if name in done_set:
            continue
        print(f"[{i}/{total}] {name} ({p.stat().st_size} B)")
        if not scp_one(p, name):
            print(f"ABORT 连续失败: {name}", file=sys.stderr)
            return 1
        done_set.add(name)
        st["done"] = sorted(done_set)
        save_state(st)

    print("合并远端分片...")
    # zsh 在 macOS 上为默认 login shell；用 sort 保证顺序
    merge = (
        f"cd {REMOTE_DIR} && "
        f"cat $(ls soulch* 2>/dev/null | sort) > {REMOTE_ZIP} && "
        f"ls -la {REMOTE_ZIP}"
    )
    out = remote_cmd(merge)
    print(out)

    local_size = ZIP.stat().st_size
    rsize = remote_cmd(f"stat -f%z {REMOTE_ZIP}")
    rs = int(rsize.strip() or 0)
    if rs != local_size:
        print(f"ERROR: 远端大小 {rs} != 本地 {local_size}", file=sys.stderr)
        return 1

    print("远端 unzip -t 校验...")
    remote_cmd(f"unzip -tqq {REMOTE_ZIP}", check=True)
    print("OK 传输与 zip 校验通过")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
