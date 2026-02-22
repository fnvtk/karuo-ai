#!/bin/bash
# www.lytiao.com Docker 部署 - 存客宝宝塔终端完整版
# 在 https://42.194.245.239:9988 → 终端 复制整段粘贴执行
# 8080 被 frps 占用，使用 8090；拉取失败时先配置镜像加速

set -e
DIR="/opt/lytiao_docker"
SRC="/www/wwwroot/www.lytiao.com"

echo "========== www.lytiao.com Docker 部署 =========="

# 1. Docker 镜像加速（避免拉取超时）
echo ">>> 1. 配置 Docker 镜像加速..."
mkdir -p /etc/docker
if [ ! -s /etc/docker/daemon.json ] || ! grep -q registry-mirrors /etc/docker/daemon.json 2>/dev/null; then
  echo '{"registry-mirrors":["https://docker.m.daocloud.io","https://docker.1ms.run"]}' > /etc/docker/daemon.json
  systemctl restart docker 2>/dev/null || true
  sleep 5
fi

# 2. 创建配置（php:7.4 更易拉取，与 7.1 兼容）
echo ">>> 2. 创建 Docker 配置..."
mkdir -p "$DIR"
cat > "$DIR/Dockerfile" << 'DF'
FROM php:7.4-apache
RUN a2enmod rewrite
WORKDIR /var/www/html
EXPOSE 80
DF
cat > "$DIR/docker-compose.yml" << 'DC'
services:
  lytiao-web:
    build: .
    container_name: lytiao-www
    ports:
      - "8090:80"
    volumes:
      - ./www:/var/www/html
    restart: unless-stopped
DC

# 3. 复制网站
echo ">>> 3. 复制网站文件..."
rm -rf "$DIR/www"
cp -a "$SRC" "$DIR/www"

# 4. 预拉取镜像（失败不退出，compose 会再次尝试）
echo ">>> 4. 拉取 PHP 镜像..."
for i in 1 2 3; do
  if docker pull php:7.4-apache 2>/dev/null; then break; fi
  echo "  第 $i 次拉取失败，15s 后重试..."
  sleep 15
done

# 5. 构建并启动
echo ">>> 5. 构建并启动..."
cd "$DIR"
docker compose down 2>/dev/null || true
docker compose up -d --build

# 6. 验证
echo ">>> 6. 验证..."
docker ps -a --filter name=lytiao
curl -sI -o /dev/null -w "本机 8090: HTTP %{http_code}\n" http://127.0.0.1:8090/ 2>/dev/null || echo "curl 待重试"

echo ""
echo "✅ 完成。访问: http://42.194.245.239:8090"
echo "   宝塔 Docker → 刷新容器列表 可见 lytiao-www"
