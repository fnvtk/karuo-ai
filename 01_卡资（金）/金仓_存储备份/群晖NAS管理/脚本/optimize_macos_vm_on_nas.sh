#!/bin/bash
# ============================================================
# 在 CKB NAS 上直接执行（SSH 登录 NAS 后运行此脚本）
# 用途：macOS VM 流畅度优化（RAM 4G / CPU 2核）
# ============================================================

COMPOSE_DIR="/volume1/docker/macos-vm"
DOCKER="/volume1/@appstore/ContainerManager/usr/bin/docker"

echo "=== macOS VM 流畅度优化（NAS 本机执行）==="
echo ""

# 检查目录
if [ ! -d "$COMPOSE_DIR" ]; then
    echo "错误: 未找到 ${COMPOSE_DIR}，请确认 macos-vm 已部署"
    exit 1
fi

# 备份原配置
if [ -f "${COMPOSE_DIR}/docker-compose.yml" ]; then
    cp "${COMPOSE_DIR}/docker-compose.yml" "${COMPOSE_DIR}/docker-compose.yml.bak.$(date +%Y%m%d_%H%M%S)"
    echo "已备份原配置"
fi

# 写入优化后的配置
cat > "${COMPOSE_DIR}/docker-compose.yml" << 'YAML'
version: "3.8"
services:
  macos:
    image: dockurr/macos
    container_name: macos-vm
    environment:
      - VERSION=ventura
      - RAM_SIZE=4G
      - CPU_CORES=2
      - DISK_SIZE=64G
    ports:
      - "8007:8006"
      - "5901:5900"
    volumes:
      - /volume1/vm/macos:/storage
    devices:
      - /dev/kvm
    cap_add:
      - NET_ADMIN
    restart: "no"
    deploy:
      resources:
        limits:
          memory: 4500M
YAML

echo "已更新 docker-compose.yml"
echo ""
echo "正在重启 macOS VM..."

cd "$COMPOSE_DIR"
echo 'zhiqun1984' | sudo -S $DOCKER compose down 2>/dev/null || true
sleep 2
echo 'zhiqun1984' | sudo -S $DOCKER compose up -d

echo ""
echo "✅ 优化完成"
echo ""
echo "访问地址（流畅优化 URL）："
echo "  外网: http://open.quwanzhi.com:8007/?qualityLevel=3&compressionLevel=6&resize=scale"
echo "  内网: http://192.168.1.201:8007/?qualityLevel=3&compressionLevel=6&resize=scale"
echo ""
