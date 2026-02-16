#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
清理宝塔服务器恶意文件（腾讯云主机安全告警）
============================================
用途：SSH 登录告警目标服务器，删除挖矿程序 xmrig、恶意文件 syssls，
      并终止相关进程，检查 crontab 等持久化。

告警恶意文件：
- /home/www/moneroocean/xmrig（门罗币挖矿）
- /tmp/syssls（中危）

使用：
  export BT_SSH_PASSWORD='你的root密码'   # 可选，见下方默认
  python3 清理恶意文件_宝塔.py --ip 42.x.x.x
  python3 清理恶意文件_宝塔.py --ip 42.x.x.x --user root --dry-run

注意：删除前会列出将执行的操作；--dry-run 仅打印不执行。
"""

import argparse
import os
import subprocess
import sys

# 默认 SSH 密码（与服务器管理 SKILL 一致）；优先用环境变量 BT_SSH_PASSWORD
DEFAULT_SSH_PASSWORD = os.environ.get("BT_SSH_PASSWORD", "Zhiqun1984")

# 要清理的路径与进程名
MALICIOUS_PATHS = [
    "/home/www/moneroocean",  # 整个目录（含 xmrig）
    "/tmp/syssls",
]
PROCESS_NAMES = ["xmrig", "syssls"]


def run_ssh(ip: str, user: str, password: str, cmd: str, dry_run: bool) -> tuple[int, str, str]:
    """通过 sshpass + ssh 执行远程命令。返回 (returncode, stdout, stderr)。"""
    if dry_run:
        print(f"  [dry-run] ssh {user}@{ip} {cmd}")
        return 0, "", ""

    env = os.environ.copy()
    env["SSHPASS"] = password
    proc = subprocess.run(
        ["sshpass", "-e", "ssh", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=10", f"{user}@{ip}", cmd],
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )
    return proc.returncode, proc.stdout or "", proc.stderr or ""


def main():
    ap = argparse.ArgumentParser(description="清理宝塔服务器恶意文件（xmrig / syssls）")
    ap.add_argument("--ip", required=True, help="服务器公网 IP")
    ap.add_argument("--user", default="root", help="SSH 用户")
    ap.add_argument("--password", default=DEFAULT_SSH_PASSWORD, help="SSH 密码（或设 BT_SSH_PASSWORD）")
    ap.add_argument("--dry-run", action="store_true", help="仅打印将要执行的命令，不实际执行")
    args = ap.parse_args()

    if not args.password:
        print("请设置 SSH 密码：--password 或环境变量 BT_SSH_PASSWORD")
        sys.exit(1)

    # 检查 sshpass
    if not args.dry_run:
        r = subprocess.run(["which", "sshpass"], capture_output=True)
        if r.returncode != 0:
            print("未找到 sshpass。请安装：brew install sshpass")
            sys.exit(1)

    print("=" * 60)
    print("  清理恶意文件（腾讯云主机安全告警）")
    print("=" * 60)
    print(f"  目标: {args.user}@{args.ip}")
    print(f"  模式: {'dry-run（仅预览）' if args.dry_run else '执行'}")
    print()

    # 1. 杀进程
    for name in PROCESS_NAMES:
        cmd = f"pkill -9 -f {name} 2>/dev/null; pgrep -af {name} || true"
        code, out, err = run_ssh(args.ip, args.user, args.password, cmd, args.dry_run)
        if not args.dry_run and (out or err):
            print(f"  进程 {name}: {out or err}".strip())

    # 2. 删除恶意路径
    for path in MALICIOUS_PATHS:
        cmd = f"rm -rf {path} 2>/dev/null; ls -la {path} 2>&1 || true"
        code, out, err = run_ssh(args.ip, args.user, args.password, cmd, args.dry_run)
        if not args.dry_run:
            if "No such file" in (out + err):
                print(f"  已删除或不存在: {path}")
            else:
                print(f"  删除 {path}: returncode={code}")

    # 3. 检查 crontab 是否还有相关项
    cmd = "crontab -l 2>/dev/null | grep -E 'xmrig|syssls|moneroocean' || true"
    code, out, err = run_ssh(args.ip, args.user, args.password, cmd, args.dry_run)
    if not args.dry_run and (out or err):
        print("  ⚠️ crontab 中仍有可疑项，请手动检查：")
        print("     ", (out or err).strip())
    elif args.dry_run:
        print("  [dry-run] 检查 crontab 中的 xmrig/syssls/moneroocean")

    # 4. 验证清理结果（pgrep -x 按进程名精确匹配，避免误匹配 bash -c）
    check_cmd = "ls -d /home/www/moneroocean /tmp/syssls 2>&1; pgrep -x xmrig || true; pgrep -x syssls || true"
    code, out, err = run_ssh(args.ip, args.user, args.password, check_cmd, args.dry_run)
    if not args.dry_run:
        raw = (out + err).strip()
        files_gone = "No such file" in raw
        # pgrep 无输出时表示无残留进程；有数字行则表示仍有进程
        pids = [ln for ln in raw.splitlines() if ln.strip().isdigit()]
        if files_gone and not pids:
            print("  ✅ 恶意文件已清理，相关进程已结束。")
        else:
            print("  验证输出：")
            print(raw or "(无)")

    print()
    print("=" * 60)

if __name__ == "__main__":
    main()
