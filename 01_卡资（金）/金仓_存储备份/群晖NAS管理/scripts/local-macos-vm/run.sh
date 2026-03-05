#!/bin/bash
# 挂载 NAS 上的 docker/macos-vm（SMB），并用本机 Docker 运行 macos-vm，不复制数据
# 数据源: smb://CKBNAS._smb._tcp.local/docker/macos-vm

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 固定挂载点，便于 Docker 使用同一路径
MOUNT_POINT="${HOME}/nas-mounts/ckbnas-docker"
STORAGE_PATH="${MOUNT_POINT}/macos-vm"
export MACOS_VM_STORAGE="$STORAGE_PATH"

# 若已用 Finder 挂载了 docker 共享，可直接用 /Volumes/docker/macos-vm
if [[ -d "/Volumes/docker/macos-vm" ]]; then
  export MACOS_VM_STORAGE="/Volumes/docker/macos-vm"
  echo "使用 Finder 已挂载路径: $MACOS_VM_STORAGE"
else
  mkdir -p "$MOUNT_POINT"
  if ! mount | grep -q "$MOUNT_POINT"; then
    echo "挂载 SMB: //CKBNAS._smb._tcp.local/docker -> $MOUNT_POINT"
    echo "（若提示密码，请输入 NAS 登录密码）"
    mount_smbfs "//fnvtk@CKBNAS._smb._tcp.local/docker" "$MOUNT_POINT"
  fi
  if [[ ! -d "$STORAGE_PATH" ]]; then
    echo "错误: 挂载后未找到 $STORAGE_PATH，请确认 NAS 上存在 docker/macos-vm 目录"
    exit 1
  fi
  echo "使用挂载路径: $MACOS_VM_STORAGE"
fi

echo "启动本地 macos-vm 容器（数据来自 NAS，不复制）..."
docker compose up -d
echo "完成。noVNC: http://localhost:8007  VNC: localhost:5901"
echo "停止: cd $SCRIPT_DIR && docker compose down"
