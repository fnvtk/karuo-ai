#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
机群监控 - 批量SSH连接所有已部署节点，查看状态
============================================

功能：
  1. 连接所有已知设备，查看PCDN/矿机运行状态
  2. 显示CPU/内存/磁盘/Docker容器状态
  3. 汇总输出运行中/异常节点

用法：
  python3 fleet_monitor.py --all          # 检查所有已知设备
  python3 fleet_monitor.py --host 42.194.232.22  # 检查单个
  python3 fleet_monitor.py --quick        # 快速检查（只看容器状态）

卡若账号：15880802661
作者：金仓（卡资组）
日期：2026-02-06
"""

import subprocess
import sys
import json
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# 颜色
RED = "\033[91m"; GREEN = "\033[92m"; YELLOW = "\033[93m"
BLUE = "\033[94m"; CYAN = "\033[96m"; NC = "\033[0m"

# 已知设备列表
KNOWN_DEVICES = [
    {"name": "小型宝塔", "ip": "42.194.232.22", "port": 22, "user": "root", "password": "Zhiqun1984"},
    {"name": "存客宝", "ip": "42.194.245.239", "port": 22, "user": "root", "password": "Zhiqun1984"},
    {"name": "kr宝塔", "ip": "43.139.27.93", "port": 22, "user": "root", "password": "Zhiqun1984"},
    {"name": "公司NAS(CKB)", "ip": "192.168.1.201", "port": 22, "user": "fnvtk", "password": ""},
    {"name": "家里NAS", "ip": "192.168.110.29", "port": 22, "user": "admin", "password": ""},
]


def ssh_exec(host, port, user, password, command, timeout=15):
    """SSH执行远程命令"""
    try:
        import paramiko
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        connect_kwargs = {"hostname": host, "port": port, "username": user, "timeout": timeout,
                          "allow_agent": True, "look_for_keys": True}
        if password:
            connect_kwargs["password"] = password
        client.connect(**connect_kwargs)
        _, stdout, stderr = client.exec_command(command, timeout=timeout)
        output = stdout.read().decode("utf-8", errors="ignore")
        exit_code = stdout.channel.recv_exit_status()
        client.close()
        return {"output": output, "exit_code": exit_code}
    except Exception as e:
        return {"output": "", "exit_code": -1, "error": str(e)}


def check_device(device, quick=False):
    """检查单个设备状态"""
    name = device["name"]
    ip = device["ip"]
    port = device["port"]
    user = device["user"]
    pwd = device["password"]
    
    result = {"name": name, "ip": ip, "online": False, "containers": [], "cpu": "N/A", "ram": "N/A", "disk": "N/A"}
    
    # 测试连接
    r = ssh_exec(ip, port, user, pwd, "echo OK")
    if r["exit_code"] != 0:
        result["error"] = r.get("error", "连接失败")
        return result
    
    result["online"] = True
    
    # 检查Docker容器
    docker_cmd = "docker"
    # 群晖NAS特殊路径
    r_syn = ssh_exec(ip, port, user, pwd, "ls /var/packages/ContainerManager/target/usr/bin/docker 2>/dev/null")
    if r_syn["exit_code"] == 0 and r_syn["output"].strip():
        docker_cmd = f"sudo {r_syn['output'].strip()}"
    
    r = ssh_exec(ip, port, user, pwd, 
                 f"{docker_cmd} ps --format '{{{{.Names}}}}|{{{{.Status}}}}|{{{{.Image}}}}' 2>/dev/null")
    if r["exit_code"] == 0 and r["output"].strip():
        for line in r["output"].strip().split("\n"):
            parts = line.split("|")
            if len(parts) >= 2:
                result["containers"].append({
                    "name": parts[0],
                    "status": parts[1],
                    "image": parts[2] if len(parts) > 2 else "",
                })
    
    if not quick:
        # CPU使用率
        r = ssh_exec(ip, port, user, pwd, "top -bn1 2>/dev/null | grep 'Cpu' | awk '{printf \"%.0f%%\", $2}'")
        if r["exit_code"] == 0 and r["output"].strip():
            result["cpu"] = r["output"].strip()
        
        # 内存
        r = ssh_exec(ip, port, user, pwd, "free -m 2>/dev/null | grep Mem | awk '{printf \"%dMB/%dMB\", $3, $2}'")
        if r["exit_code"] == 0 and r["output"].strip():
            result["ram"] = r["output"].strip()
        
        # 磁盘
        r = ssh_exec(ip, port, user, pwd, "df -h / 2>/dev/null | tail -1 | awk '{printf \"%s used (%s free)\", $5, $4}'")
        if r["exit_code"] == 0 and r["output"].strip():
            result["disk"] = r["output"].strip()
    
    return result


def monitor_all(quick=False):
    """监控所有设备"""
    print(f"{CYAN}")
    print("╔══════════════════════════════════════════════════════════╗")
    print("║     分布式算力管控 - 机群监控                           ║")
    print(f"║     {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                               ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print(f"{NC}")
    
    results = []
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(check_device, dev, quick): dev for dev in KNOWN_DEVICES}
        for future in as_completed(futures):
            r = future.result()
            results.append(r)
    
    # 按名称排序
    results.sort(key=lambda x: x["name"])
    
    online_count = 0
    pcdn_running = 0
    
    for r in results:
        status = f"{GREEN}在线{NC}" if r["online"] else f"{RED}离线{NC}"
        print(f"\n{BLUE}── {r['name']} ({r['ip']}) ── {status}{NC}")
        
        if not r["online"]:
            print(f"  {RED}错误: {r.get('error', '未知')}{NC}")
            continue
        
        online_count += 1
        
        if not quick:
            print(f"  CPU: {r['cpu']}  |  RAM: {r['ram']}  |  磁盘: {r['disk']}")
        
        if r["containers"]:
            print(f"  Docker容器:")
            for c in r["containers"]:
                icon = "🟢" if "Up" in c["status"] else "🔴"
                print(f"    {icon} {c['name']:15s} | {c['status']:30s} | {c['image']}")
                if "wxedge" in c["name"].lower() or "ttnode" in c["name"].lower():
                    pcdn_running += 1
        else:
            print(f"  {YELLOW}无Docker容器运行{NC}")
    
    # 汇总
    print(f"\n{CYAN}{'='*60}{NC}")
    print(f"{GREEN}汇总: 在线 {online_count}/{len(KNOWN_DEVICES)} | PCDN运行: {pcdn_running}{NC}")
    print(f"{CYAN}{'='*60}{NC}")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="机群监控")
    parser.add_argument("--all", action="store_true", help="检查所有设备")
    parser.add_argument("--quick", action="store_true", help="快速模式（只查容器）")
    parser.add_argument("--host", help="检查指定IP")
    args = parser.parse_args()
    
    if args.host:
        dev = {"name": args.host, "ip": args.host, "port": 22, "user": "root", "password": "Zhiqun1984"}
        r = check_device(dev, quick=args.quick)
        print(json.dumps(r, indent=2, ensure_ascii=False, default=str))
    else:
        monitor_all(quick=args.quick)


if __name__ == "__main__":
    main()
