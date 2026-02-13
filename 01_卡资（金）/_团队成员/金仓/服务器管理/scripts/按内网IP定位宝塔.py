#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
按内网 IP 定位宝塔服务器（无腾讯云 API 时备用）
===============================================
用途：对已知宝塔服务器列表逐台 SSH 查询内网 IP，匹配告警中的 10.1.8.13，
      定位后输出公网 IP，便于执行清理恶意文件脚本。

使用：
  export BT_SSH_PASSWORD='你的root密码'   # 可选
  python3 按内网IP定位宝塔.py
  python3 按内网IP定位宝塔.py --target-private-ip 10.1.8.13
"""

import argparse
import os
import re
import subprocess
import sys

# 与 快速检查服务器.py 一致；从面板地址解析公网 IP
服务器列表 = {
    "小型宝塔": "42.194.232.22",
    "存客宝": "42.194.245.239",
    "kr宝塔": "43.139.27.93",
}
DEFAULT_SSH_PASSWORD = os.environ.get("BT_SSH_PASSWORD", "Zhiqun1984")


def get_private_ips(host: str, user: str, password: str) -> list[str]:
    """SSH 到 host，执行 hostname -I 或 ip addr，解析内网 IP 列表。"""
    env = os.environ.copy()
    env["SSHPASS"] = password
    cmd = [
        "sshpass", "-e", "ssh",
        "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=8",
        f"{user}@{host}",
        "hostname -I 2>/dev/null || ( ip -4 addr show 2>/dev/null | grep -oE 'inet [0-9.]+' | awk '{print $2}' ) || true",
    ]
    try:
        r = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=15)
        out = (r.stdout or "").strip()
        ips = [x.strip() for x in re.split(r"\s+", out) if x.strip() and re.match(r"^\d+\.\d+\.\d+\.\d+$", x.strip())]
        return ips
    except Exception as e:
        return []


def main():
    ap = argparse.ArgumentParser(description="按内网 IP 定位宝塔服务器")
    ap.add_argument("--target-private-ip", default="10.1.8.13", help="要匹配的内网 IP（告警中的机器）")
    ap.add_argument("--user", default="root")
    ap.add_argument("--password", default=DEFAULT_SSH_PASSWORD)
    args = ap.parse_args()

    if subprocess.run(["which", "sshpass"], capture_output=True).returncode != 0:
        print("请安装 sshpass：brew install sshpass")
        sys.exit(1)

    print("正在逐台查询宝塔服务器内网 IP……")
    print("-" * 50)
    for name, ip in 服务器列表.items():
        priv = get_private_ips(ip, args.user, args.password)
        print(f"  {name} ({ip}) 内网: {', '.join(priv) or '(无法获取)'}")
        if args.target_private_ip in priv:
            print()
            print("✅ 已定位告警目标：")
            print(f"   名称: {name}")
            print(f"   公网IP: {ip}")
            print(f"   内网IP: {args.target_private_ip}")
            print()
            print("清理恶意文件：")
            print(f"   python3 清理恶意文件_宝塔.py --ip {ip}")
            sys.exit(0)

    print()
    print(f"未找到内网 IP 为 {args.target_private_ip} 的宝塔服务器。")
    print("若告警机器不在上述列表中，请通过腾讯云 API 查询（腾讯云CVM查询宝塔服务器.py）。")
    sys.exit(1)


if __name__ == "__main__":
    main()
