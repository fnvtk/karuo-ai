#!/bin/bash
# ============================================
# macOS Docker 安装包：从全网（Docker Hub）拉取并保存到本机「下载」文件夹
# 唯一方案：最小、最快、最便捷，不依赖存客宝 NAS 导出
# ============================================

set -e
OUT_DIR="${HOME}/Downloads"
IMAGE="dockurr/macos:latest"
TAR_NAME="dockurr-macos-image.tar"
OUTFILE="${OUT_DIR}/${TAR_NAME}"

echo "============================================"
echo "  macOS Docker 安装包（全网源）"
echo "============================================"
echo "  源: Docker Hub (dockurr/macos)"
echo "  目标: ${OUTFILE}"
echo "============================================"
echo ""

echo "[1/2] 拉取镜像（实时进度）..."
docker pull "$IMAGE" 2>&1
echo ""

echo "[2/2] 导出为离线安装包..."
docker save "$IMAGE" -o "$OUTFILE"
SIZE=$(ls -lh "$OUTFILE" | awk '{print $5}')
echo "      已保存: ${OUTFILE} (${SIZE})"
echo ""

echo "全部完成。可在 Mac 上使用："
echo "  docker load -i ${OUTFILE}"
echo "  详见 下载 文件夹内「macos_Docker安装包_复盘与说明.md」"
