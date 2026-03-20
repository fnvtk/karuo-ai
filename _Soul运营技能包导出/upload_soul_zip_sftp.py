#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""单 SSH 会话（SFTP）连续上传 Soul 技能包分片，避免频繁握手被远端断开；支持重连续传。

用法：
  python3 upload_soul_zip_sftp.py              # 上传分片 + 合并 + unzip -t
  python3 upload_soul_zip_sftp.py --install    # 在上一步基础上再执行合并到 iCloud 卡若AI
  python3 upload_soul_zip_sftp.py --install-only  # 仅安装（假定远端 zip 已完整）
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

import paramiko

ZIP = Path.home() / "Downloads" / "Soul运营全链路技能包_20260320.zip"
CHUNK_DIR = Path(__file__).resolve().parent / "_upload_chunks_1m_sftp"
STATE = CHUNK_DIR / "sftp_upload_state.json"
HOST = "macbook.quwanzhi.com"
PORT = 22203
USER = "kr"
REMOTE_DIR = f"/Users/{USER}/Downloads/soul_zip_chunks_20260320"
REMOTE_ZIP = f"/Users/{USER}/Downloads/Soul运营全链路技能包_20260320.zip"
CHUNK_BYTES = 1024 * 1024


def ensure_chunks() -> list[Path]:
    CHUNK_DIR.mkdir(parents=True, exist_ok=True)
    marker = CHUNK_DIR / ".split_ok"
    parts = sorted(CHUNK_DIR.glob("soulch*"))
    if marker.is_file() and parts:
        if sum(p.stat().st_size for p in parts) == ZIP.stat().st_size:
            return parts
    for p in CHUNK_DIR.glob("soulch*"):
        p.unlink(missing_ok=True)
    marker.unlink(missing_ok=True)
    if not ZIP.is_file():
        print(f"ERROR: 找不到 {ZIP}", file=sys.stderr)
        sys.exit(1)
    subprocess.run(
        ["split", "-b", str(CHUNK_BYTES), str(ZIP), str(CHUNK_DIR / "soulch")],
        check=True,
    )
    marker.write_text(str(ZIP.stat().st_size), encoding="utf-8")
    return sorted(CHUNK_DIR.glob("soulch*"))


def connect() -> tuple[paramiko.SSHClient, paramiko.SFTPClient]:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(
        HOST,
        port=PORT,
        username=USER,
        allow_agent=True,
        look_for_keys=True,
        timeout=30,
        banner_timeout=30,
        auth_timeout=30,
    )
    sftp = c.open_sftp()
    try:
        sftp.chdir(REMOTE_DIR)
    except OSError:
        parts = REMOTE_DIR.strip("/").split("/")
        path = "/"
        for p in parts:
            if not p:
                continue
            path = f"{path.rstrip('/')}/{p}"
            try:
                sftp.mkdir(path)
            except OSError:
                pass
        sftp.chdir(REMOTE_DIR)
    return c, sftp


def remote_size(sftp: paramiko.SFTPClient, name: str) -> int:
    try:
        return sftp.stat(name).st_size
    except OSError:
        return -1


def load_done() -> set[str]:
    if STATE.is_file():
        return set(json.loads(STATE.read_text(encoding="utf-8")).get("done", []))
    return set()


def save_done(done: set[str]) -> None:
    STATE.write_text(
        json.dumps({"done": sorted(done)}, ensure_ascii=False, indent=0),
        encoding="utf-8",
    )


def merge_zip(client: paramiko.SSHClient) -> None:
    # 合并到固定路径；分片名 soulchaa, soulchab … 按 sort 拼接
    cmd = (
        f"cd {REMOTE_DIR} && "
        f'cat $(ls soulch* 2>/dev/null | sort) > "{REMOTE_ZIP}" && '
        f'stat -f%z "{REMOTE_ZIP}"'
    )
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    rc = stdout.channel.recv_exit_status()
    if rc != 0:
        raise RuntimeError(f"merge failed rc={rc} err={err}")
    if not out:
        raise RuntimeError("merge: stat 无输出")
    got = int(out.split()[0])
    exp = ZIP.stat().st_size
    if got != exp:
        raise RuntimeError(f"merge size {got} != local {exp}")


def test_zip(client: paramiko.SSHClient) -> None:
    stdin, stdout, stderr = client.exec_command(f'unzip -tqq "{REMOTE_ZIP}"')
    err = stderr.read().decode()
    rc = stdout.channel.recv_exit_status()
    if rc != 0:
        raise RuntimeError(f"unzip -t failed: {err}")


def install_on_remote(client: paramiko.SSHClient) -> None:
    here = Path(__file__).resolve().parent / "install_soul_bundle_on_amiao.sh"
    body = here.read_text(encoding="utf-8")
    remote_sh = "/tmp/karuo_install_soul_bundle.sh"
    sftp = client.open_sftp()
    try:
        with sftp.open(remote_sh, "w") as rf:
            rf.write(body.encode("utf-8"))
    finally:
        sftp.close()
    stdin, stdout, stderr = client.exec_command(
        f"chmod +x {remote_sh} && bash {remote_sh} '{REMOTE_ZIP}'"
    )
    out = stdout.read().decode()
    err = stderr.read().decode()
    rc = stdout.channel.recv_exit_status()
    if rc != 0:
        raise RuntimeError(f"install failed rc={rc} err={err or out}\n{out}")


def main() -> int:
    install_only = "--install-only" in sys.argv
    do_install = "--install" in sys.argv or install_only

    if install_only:
        print("仅执行远端安装…")
        client, sftp = connect()
        sftp.close()
        try:
            test_zip(client)
            install_on_remote(client)
        finally:
            client.close()
        print("OK 阿猫机 iCloud 卡若AI 已合并技能包内容")
        return 0

    parts = ensure_chunks()
    done = load_done()
    local_exp = {p.name: p.stat().st_size for p in parts}

    idx = 0
    while idx < len(parts):
        p = parts[idx]
        if p.name in done:
            idx += 1
            continue
        try:
            client, sftp = connect()
        except Exception as e:
            print(f"连接失败: {e}, 10s 后重试", file=sys.stderr)
            time.sleep(10)
            continue
        try:
            while idx < len(parts):
                p = parts[idx]
                if p.name in done:
                    idx += 1
                    continue
                rs = remote_size(sftp, p.name)
                loc = local_exp[p.name]
                if rs == loc:
                    done.add(p.name)
                    save_done(done)
                    idx += 1
                    print(f"skip (已存在) {p.name}")
                    continue
                if rs >= 0 and rs != loc:
                    try:
                        sftp.remove(p.name)
                    except OSError:
                        pass
                print(f"put [{idx + 1}/{len(parts)}] {p.name} ({loc} B)")
                sftp.put(str(p), p.name)
                done.add(p.name)
                save_done(done)
                idx += 1
        except Exception as e:
            print(f"传输中断: {e}, 将重连续传", file=sys.stderr)
            try:
                sftp.close()
                client.close()
            except Exception:
                pass
            time.sleep(5)
            continue
        finally:
            try:
                sftp.close()
                client.close()
            except Exception:
                pass

    print("合并分片…")
    client, sftp_m = connect()
    sftp_m.close()
    try:
        merge_zip(client)
        print("unzip -t 校验…")
        test_zip(client)
        if do_install:
            print("合并到 iCloud 卡若AI…")
            install_on_remote(client)
    finally:
        client.close()

    print("OK 阿猫 Downloads 上 zip 已就绪:", REMOTE_ZIP)
    if do_install:
        print("OK 已完成安装到 iCloud 婼瑄/卡若AI")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
