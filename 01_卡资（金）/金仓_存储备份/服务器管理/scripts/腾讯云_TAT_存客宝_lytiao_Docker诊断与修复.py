#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT：存客宝 lytiao Docker 诊断与修复（容器未在面板显示时执行）
"""
import base64
import os
import re
import sys

CKB_INSTANCE_ID = "ins-ciyv2mxa"
REGION = "ap-guangzhou"

def _find_karuo_ai_root():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        if os.path.basename(d) == "卡若AI" or (
            os.path.isdir(os.path.join(d, "运营中枢")) and os.path.isdir(os.path.join(d, "01_卡资（金）"))
        ):
            return d
        d = os.path.dirname(d)
    return None

def _read_creds():
    root = _find_karuo_ai_root()
    if not root:
        return None, None
    path = os.path.join(root, "运营中枢", "工作台", "00_账号与API索引.md")
    if not os.path.isfile(path):
        return None, None
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    secret_id = secret_key = None
    in_tencent = False
    for line in text.splitlines():
        if "### 腾讯云" in line:
            in_tencent = True
            continue
        if in_tencent and line.strip().startswith("###"):
            break
        if not in_tencent:
            continue
        m = re.search(r"\|\s*[^|]*(?:SecretId|密钥)[^|]*\|\s*`([^`]+)`", line, re.I)
        if m:
            val = m.group(1).strip()
            if val.startswith("AKID"):
                secret_id = val
        m = re.search(r"\|\s*SecretKey\s*\|\s*`([^`]+)`", line, re.I)
        if m:
            secret_key = m.group(1).strip()
    return secret_id or None, secret_key or None

# 诊断 + 修复：检查 lytiao 容器，不存在则重新部署
CMD = """echo "=== 1. 所有容器（含已停止） ==="
docker ps -a
echo ""
echo "=== 2. lytiao 相关容器 ==="
docker ps -a --filter "name=lytiao" 2>/dev/null || true
echo ""
echo "=== 3. /opt/lytiao_docker 是否存在 ==="
ls -la /opt/lytiao_docker 2>/dev/null || echo "目录不存在"
echo ""
echo "=== 4. 修复：启动或重新部署 lytiao ==="
if [ -d /opt/lytiao_docker ] && [ -f /opt/lytiao_docker/docker-compose.yml ]; then
  cd /opt/lytiao_docker
  docker compose up -d
  echo ""
  echo "=== 5. 修复后容器列表 ==="
  docker ps -a
else
  echo "目录或 compose 文件缺失，需要重新部署。执行部署脚本..."
  mkdir -p /opt/lytiao_docker
  SRC="/www/wwwroot/www.lytiao.com"
  if [ ! -d "$SRC" ]; then
    echo "错误: 网站源 $SRC 不存在"
    exit 1
  fi
  cat > /opt/lytiao_docker/Dockerfile << 'DFEND'
FROM php:7.1-apache
RUN a2enmod rewrite
RUN apt-get update && apt-get install -y libpng-dev libjpeg-dev libzip-dev zip unzip \\
  && docker-php-ext-configure gd --with-png-dir=/usr --with-jpeg-dir=/usr \\
  && docker-php-ext-install -j$(nproc) gd mysqli pdo pdo_mysql zip \\
  && apt-get clean && rm -rf /var/lib/apt/lists/*
WORKDIR /var/www/html
EXPOSE 80
DFEND
  cat > /opt/lytiao_docker/docker-compose.yml << 'DCEND'
version: "3.8"
services:
  lytiao-web:
    build: .
    container_name: lytiao-www
    ports:
      - "8080:80"
    volumes:
      - ./www:/var/www/html:ro
    restart: unless-stopped
    environment:
      - TZ=Asia/Shanghai
DCEND
  rm -rf /opt/lytiao_docker/www
  cp -a "$SRC" /opt/lytiao_docker/www
  cd /opt/lytiao_docker
  docker compose up -d --build
  echo ""
  echo "=== 部署完成，容器列表 ==="
  docker ps -a
fi
echo ""
echo "=== DONE ==="
"""

def main():
    secret_id = os.environ.get("TENCENTCLOUD_SECRET_ID")
    secret_key = os.environ.get("TENCENTCLOUD_SECRET_KEY")
    if not secret_id or not secret_key:
        sid, skey = _read_creds()
        secret_id = secret_id or sid
        secret_key = secret_key or skey
    if not secret_id or not secret_key:
        print("❌ 未配置腾讯云 SecretId/SecretKey")
        return 1
    try:
        from tencentcloud.common import credential
        from tencentcloud.tat.v20201028 import tat_client, models
    except ImportError:
        print("请安装: pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-tat")
        return 1

    cred = credential.Credential(secret_id, secret_key)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(CMD.encode()).decode()
    req.InstanceIds = [CKB_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 120
    req.CommandName = "CKB_lytiao_DockerDiagnose"
    resp = client.RunCommand(req)
    print("✅ 诊断与修复指令已下发 InvocationId:", resp.InvocationId)
    print("  约 1～2 分钟后到 宝塔 → Docker → 总览 点击「刷新容器列表」即可看到 lytiao-www")
    return 0

if __name__ == "__main__":
    sys.exit(main())
