#!/bin/bash
# ============================================
# 家里 DiskStation 1TB 共享 - 外网挂载到 Finder 侧栏「位置」
# 挂载后可直接存文件，Finder 拷贝时会显示速率
# 外网通过 frp 端口 4452 访问 SMB（需先在 NAS 添加 frpc 配置）
# ============================================

NAS_HOST="opennas2.quwanzhi.com"
NAS_PORT="4452"
NAS_USER="admin"
# 密码：与 DSM 登录一致
NAS_PASS="zhiqun1984"
# 共享名：DSM 中的共享文件夹名，常见为 共享、homes
SHARE="共享"
MOUNT_POINT="$HOME/DiskStation-1TB"

# 已挂载则先卸载
if mount | grep -q "DiskStation-1TB"; then
  echo "正在卸载旧挂载..."
  umount "$MOUNT_POINT" 2>/dev/null
  sleep 1
fi

mkdir -p "$MOUNT_POINT"
echo "正在挂载家里 DiskStation (${NAS_HOST}:${NAS_PORT})..."
mount_smbfs "//${NAS_USER}:${NAS_PASS}@${NAS_HOST}:${NAS_PORT}/${SHARE}" "$MOUNT_POINT" 2>&1

if mount | grep -q "DiskStation-1TB"; then
  echo "挂载成功: $MOUNT_POINT"
  echo "添加到 Finder 侧栏：在 Finder 中把「DiskStation-1TB」拖到侧栏「位置」下即可"
  echo "直接往里拷贝文件，Finder 会显示传输速率"
  open "$MOUNT_POINT"
else
  echo "挂载失败。请确认：1) 家里 NAS frpc 已添加 SMB 4452 端口 2) NAS_PASS 正确 3) 共享名为 ${SHARE}"
  exit 1
fi
