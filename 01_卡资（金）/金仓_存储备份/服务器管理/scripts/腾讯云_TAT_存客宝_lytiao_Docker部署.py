#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT 在存客宝上执行 www.lytiao.com Docker 化部署（免 SSH）
凭证：00_账号与API索引.md 或环境变量 TENCENTCLOUD_SECRET_ID / TENCENTCLOUD_SECRET_KEY
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

# 存客宝上执行的 Docker 部署脚本
CMD = """#!/bin/bash
set -e
REMOTE_DIR="/opt/lytiao_docker"
SRC_WEB="/www/wwwroot/www.lytiao.com"
mkdir -p "$REMOTE_DIR"
cat > "$REMOTE_DIR/Dockerfile" << 'DFEND'
FROM php:7.1-apache
RUN a2enmod rewrite
RUN apt-get update && apt-get install -y libpng-dev libjpeg-dev libzip-dev zip unzip \\
  && docker-php-ext-configure gd --with-png-dir=/usr --with-jpeg-dir=/usr \\
  && docker-php-ext-install -j$(nproc) gd mysqli pdo pdo_mysql zip \\
  && apt-get clean && rm -rf /var/lib/apt/lists/*
WORKDIR /var/www/html
EXPOSE 80
DFEND
cat > "$REMOTE_DIR/docker-compose.yml" << 'DCEND'
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
rm -rf "$REMOTE_DIR/www"
cp -a "$SRC_WEB" "$REMOTE_DIR/www"
cd "$REMOTE_DIR"
docker compose up -d --build
docker compose ps
echo "DONE"
"""

def main():
    secret_id = os.environ.get("TENCENTCLOUD_SECRET_ID")
    secret_key = os.environ.get("TENCENTCLOUD_SECRET_KEY")
    if not secret_id or not secret_key:
        sid, skey = _read_creds()
        secret_id = secret_id or sid
        secret_key = secret_key or skey
    if not secret_id or not secret_key:
        print("❌ 未配置腾讯云 SecretId/SecretKey，请检查 00_账号与API索引.md 或环境变量")
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
    req.Timeout = 600  # 10 分钟，Docker 构建可能较慢
    req.CommandName = "CKB_lytiao_DockerDeploy"
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print("✅ 存客宝 lytiao Docker 部署指令已下发 InvocationId:", inv_id)
    print("  构建约 3～8 分钟，完成后访问: http://42.194.245.239:8080")
    print("  或配置 Nginx 反向代理 80/443 -> 127.0.0.1:8080")
    return 0

if __name__ == "__main__":
    sys.exit(main())
