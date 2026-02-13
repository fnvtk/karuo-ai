#!/usr/bin/env python3
"""
MongoDB连接信息获取脚本
从群晖NAS的Docker容器中提取MongoDB配置
"""

import subprocess
import json

# NAS配置
NAS_IP = "192.168.1.201"
NAS_USER = "fnvtk"
NAS_PASSWORD = "zhiqun1984"
DOCKER_CMD = "/volume1/@appstore/ContainerManager/usr/bin/docker"

# SSH选项
SSH_OPTIONS = [
    "-o", "StrictHostKeyChecking=no",
    "-o", "ConnectTimeout=10",
    "-o", "KexAlgorithms=+diffie-hellman-group1-sha1",
    "-o", "Ciphers=+aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc"
]

def run_ssh(command):
    """通过SSH执行命令"""
    ssh_cmd = ["sshpass", "-p", NAS_PASSWORD, "ssh"] + SSH_OPTIONS + [f"{NAS_USER}@{NAS_IP}", command]
    try:
        result = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=30)
        return result.stdout, result.stderr, result.returncode
    except Exception as e:
        return "", str(e), -1

def main():
    print("=" * 60)
    print("MongoDB连接信息获取")
    print("=" * 60)
    print(f"NAS: {NAS_IP}")
    print()
    
    # 查找MongoDB容器
    print("【查找MongoDB容器】")
    # 尝试使用sudo执行docker命令
    stdout, stderr, code = run_ssh(f"echo '{NAS_PASSWORD}' | sudo -S {DOCKER_CMD} ps -a --format '{{{{.Names}}}}|{{{{.Image}}}}|{{{{.Status}}}}'")
    
    if code != 0 or not stdout:
        # 如果sudo失败，尝试不用sudo
        stdout, stderr, code = run_ssh(f"{DOCKER_CMD} ps -a --format '{{{{.Names}}}}|{{{{.Image}}}}|{{{{.Status}}}}'")
    
    if code != 0 or not stdout:
        print(f"❌ 无法获取容器列表")
        print(f"   提示: {stderr}")
        print(f"\n可能的原因:")
        print(f"   1. Docker服务未启动")
        print(f"   2. 用户权限不足（需要加入docker组或使用sudo）")
        print(f"   3. Container Manager未安装")
        return
    
    containers = [c for c in stdout.strip().split('\n') if c and 'mongo' in c.lower()]
    
    if not containers:
        print("❌ 未找到MongoDB容器")
        return
    
    for container in containers:
        name, image, status = container.split('|')
        print(f"✓ 找到: {name} ({image})")
        
        # 获取容器详情（使用sudo）
        stdout, _, code = run_ssh(f"echo '{NAS_PASSWORD}' | sudo -S {DOCKER_CMD} inspect {name}")
        if code != 0:
            stdout, _, code = run_ssh(f"{DOCKER_CMD} inspect {name}")
        if code != 0:
            print(f"  ⚠️  无法获取容器 {name} 的详细信息")
            continue
            
        info = json.loads(stdout)[0]
        
        # 提取环境变量
        env = {e.split('=')[0]: e.split('=', 1)[1] for e in info.get('Config', {}).get('Env', []) if '=' in e}
        username = env.get('MONGO_INITDB_ROOT_USERNAME', 'admin')
        password = env.get('MONGO_INITDB_ROOT_PASSWORD', 'admin123')
        
        # 提取端口
        ports = info.get('NetworkSettings', {}).get('Ports', {})
        port = '27017'
        for k, v in ports.items():
            if '27017' in k and v:
                port = v[0].get('HostPort', '27017')
        
        print()
        print("=" * 60)
        print("📌 MongoDB连接信息")
        print("=" * 60)
        print(f"主机: {NAS_IP}")
        print(f"端口: {port}")
        print(f"用户: {username}")
        print(f"密码: {password}")
        print()
        print("连接字符串:")
        print(f"  mongodb://{username}:{password}@{NAS_IP}:{port}/")
        print()
        print("Python连接:")
        print(f'''  from pymongo import MongoClient
  client = MongoClient("mongodb://{username}:{password}@{NAS_IP}:{port}/")
  db = client["your_database"]''')
        print()

if __name__ == "__main__":
    main()
