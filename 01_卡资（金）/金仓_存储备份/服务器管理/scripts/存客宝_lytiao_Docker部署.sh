#!/bin/bash
# www.lytiao.com 在存客宝上 Docker 化部署
# 本机执行：bash scripts/存客宝_lytiao_Docker部署.sh
# 需：sshpass、本机可 SSH 至 42.194.245.239

set -e
CKB_IP="42.194.245.239"
CKB_PORT="22022"
CKB_USER="root"
CKB_PASS="Zhiqun1984"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LYTIAO_DOCKER="$SCRIPT_DIR/../lytiao_docker"
REMOTE_DIR="/opt/lytiao_docker"
SRC_WEB="/www/wwwroot/www.lytiao.com"

echo "========== www.lytiao.com Docker 部署（存客宝） =========="
echo "  目标: $CKB_IP"
echo "  网站源: $SRC_WEB"
echo "  远程目录: $REMOTE_DIR"
echo ""

# 1. 上传 Dockerfile、docker-compose.yml
echo ">>> 1. 上传 Docker 配置..."
sshpass -p "$CKB_PASS" ssh -p "$CKB_PORT" -o StrictHostKeyChecking=no \
  "$CKB_USER@$CKB_IP" "mkdir -p /tmp/lytiao_docker"
sshpass -p "$CKB_PASS" scp -P "$CKB_PORT" -o StrictHostKeyChecking=no \
  "$LYTIAO_DOCKER/Dockerfile" \
  "$LYTIAO_DOCKER/docker-compose.yml" \
  "$CKB_USER@$CKB_IP:/tmp/lytiao_docker/"

# 2. 在服务器上执行部署
echo ">>> 2. 在服务器上执行部署..."
sshpass -p "$CKB_PASS" ssh -p "$CKB_PORT" -o StrictHostKeyChecking=no \
  "$CKB_USER@$CKB_IP" bash -s << 'REMOTE'
set -e
REMOTE_DIR="/opt/lytiao_docker"
SRC_WEB="/www/wwwroot/www.lytiao.com"

mkdir -p "$REMOTE_DIR"
mv /tmp/lytiao_docker/Dockerfile /tmp/lytiao_docker/docker-compose.yml "$REMOTE_DIR/" 2>/dev/null || true

echo ">>> 复制网站文件 $SRC_WEB -> $REMOTE_DIR/www"
rm -rf "$REMOTE_DIR/www"
cp -a "$SRC_WEB" "$REMOTE_DIR/www"

echo ">>> 构建并启动容器..."
cd "$REMOTE_DIR"
docker compose up -d --build

echo ">>> 容器状态:"
docker compose ps

echo ""
echo "✅ 部署完成。访问: http://42.194.245.239:8080"
echo "   或配置 Nginx 反向代理 80/443 -> 127.0.0.1:8080"
REMOTE

echo ""
echo "========== 完成 =========="
