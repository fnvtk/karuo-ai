#!/bin/bash
# 本机 Docker 宝塔面板启动脚本（与腾讯云一致的官方镜像 btpanel/baota:lnmp）
# 数据目录：~/baota_docker_data/

set -e
CONTAINER_NAME="baota"
# 优先使用 lnmp（与腾讯云一致）；若未拉取则用 latest
IMAGE="btpanel/baota:lnmp"
if ! docker image inspect "$IMAGE" &>/dev/null; then
  IMAGE="btpanel/baota:latest"
fi
WEBROOT="/Users/karuo/baota_docker_data/website_data"
MYSQL_DATA="/Users/karuo/baota_docker_data/mysql_data"
VHOST="/Users/karuo/baota_docker_data/vhost"

# 若容器已存在则先检查状态
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "容器 ${CONTAINER_NAME} 已在运行。"
    echo "面板地址: http://127.0.0.1:8888/btpanel"
    exit 0
  fi
  echo "启动已有容器..."
  docker start "$CONTAINER_NAME"
else
  echo "首次创建并启动容器（需已拉取镜像: docker pull ${IMAGE}）..."
  docker run -d --restart unless-stopped --name "$CONTAINER_NAME" \
    -p 8888:8888 -p 80:80 -p 443:443 -p 888:888 \
    -v "$WEBROOT:/www/wwwroot" \
    -v "$MYSQL_DATA:/www/server/data" \
    -v "$VHOST:/www/server/panel/vhost" \
    "$IMAGE"
fi

echo ""
echo "本机 Docker 宝塔已启动。"
echo "面板地址: http://127.0.0.1:8888/btpanel"
echo "首次登录默认: 用户 btpanel / 密码 btpaneldocker（登录后请在面板中改为 ckb / Zhiqun1984）"
