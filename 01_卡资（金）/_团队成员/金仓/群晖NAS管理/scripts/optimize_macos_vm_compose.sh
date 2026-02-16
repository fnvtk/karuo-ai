#!/bin/bash
# macOS VM docker-compose 流畅度优化
# 将 RAM 3G→4G、CPU 1核→2核，并重启容器

set -e
NAS_IP="${1:-192.168.1.201}"
NAS_USER="${2:-fnvtk}"
SSH_OPTS="-o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc -o StrictHostKeyChecking=no"
COMPOSE_DIR="/volume1/docker/macos-vm"
DOCKER="/volume1/@appstore/ContainerManager/usr/bin/docker"

echo "=== macOS VM 流畅度优化 ==="
echo "目标 NAS: ${NAS_USER}@${NAS_IP}"
echo ""

# 备份原配置
ssh ${SSH_OPTS} ${NAS_USER}@${NAS_IP} "cp ${COMPOSE_DIR}/docker-compose.yml ${COMPOSE_DIR}/docker-compose.yml.bak.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true"

# 写入优化后的配置
ssh ${SSH_OPTS} ${NAS_USER}@${NAS_IP} "cat > ${COMPOSE_DIR}/docker-compose.yml << 'YAML'
version: \"3.8\"
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
      - \"8007:8006\"
      - \"5901:5900\"
    volumes:
      - /volume1/vm/macos:/storage
    devices:
      - /dev/kvm
    cap_add:
      - NET_ADMIN
    restart: \"no\"
    deploy:
      resources:
        limits:
          memory: 4500M
YAML"

echo "已更新 docker-compose.yml"
echo ""
echo "正在重启 macOS VM..."

ssh ${SSH_OPTS} ${NAS_USER}@${NAS_IP} "cd ${COMPOSE_DIR} && echo 'zhiqun1984' | sudo -S ${DOCKER} compose down 2>/dev/null; sleep 2; echo 'zhiqun1984' | sudo -S ${DOCKER} compose up -d"

echo ""
echo "✅ 优化完成"
echo ""
echo "访问地址（流畅优化）："
echo "  内网: http://${NAS_IP}:8007/?qualityLevel=3&compressionLevel=6&resize=scale"
echo "  外网: http://open.quwanzhi.com:8007/?qualityLevel=3&compressionLevel=6&resize=scale"
echo ""
echo "详细说明见: references/noVNC_macOS_VM流畅度优化.md"
