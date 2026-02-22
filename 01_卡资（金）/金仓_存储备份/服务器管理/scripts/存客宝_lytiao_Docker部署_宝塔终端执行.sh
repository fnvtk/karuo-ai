#!/bin/bash
# www.lytiao.com 在存客宝上 Docker 化部署
# 在存客宝宝塔面板【终端】复制整段粘贴执行
# 使用前需将 Dockerfile、docker-compose.yml 放入 /opt/lytiao_docker/

set -e
REMOTE_DIR="/opt/lytiao_docker"
SRC_WEB="/www/wwwroot/www.lytiao.com"

echo "========== www.lytiao.com Docker 部署 =========="

# 若 /opt/lytiao_docker 无 Dockerfile，则创建
if [ ! -f "$REMOTE_DIR/Dockerfile" ]; then
  echo ">>> 创建 Docker 配置..."
  mkdir -p "$REMOTE_DIR"
  cat > "$REMOTE_DIR/Dockerfile" << 'DOCKERFILE'
FROM php:7.1-apache
RUN a2enmod rewrite
RUN apt-get update && apt-get install -y libpng-dev libjpeg-dev libzip-dev zip unzip \
  && docker-php-ext-configure gd --with-png-dir=/usr --with-jpeg-dir=/usr \
  && docker-php-ext-install -j$(nproc) gd mysqli pdo pdo_mysql zip \
  && apt-get clean && rm -rf /var/lib/apt/lists/*
WORKDIR /var/www/html
EXPOSE 80
DOCKERFILE
  cat > "$REMOTE_DIR/docker-compose.yml" << 'COMPOSE'
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
COMPOSE
fi

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
