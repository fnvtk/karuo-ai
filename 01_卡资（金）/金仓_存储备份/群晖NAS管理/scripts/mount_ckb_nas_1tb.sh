#!/bin/bash
# ============================================
# 存客宝 CKB NAS 共享盘 - 外网挂载到 Finder 侧栏「位置」
# 挂载后可直接存文件，Finder 拷贝时会显示速率
# 外网通过 frp 端口 4450 访问 SMB
# ============================================

NAS_HOST="open.quwanzhi.com"
NAS_PORT="4450"
NAS_USER="fnvtk"
# 密码：与 DSM 登录一致，若非 zhiqun1984 请修改
NAS_PASS="zhiqun1984"
SHARE="homes"
MOUNT_POINT="$HOME/CKB-NAS-1TB"

# 已挂载则先卸载
if mount | grep -q "CKB-NAS-1TB"; then
  echo "正在卸载旧挂载..."
  umount "$MOUNT_POINT" 2>/dev/null
  sleep 1
fi

mkdir -p "$MOUNT_POINT"
echo "正在挂载存客宝 NAS (${NAS_HOST}:${NAS_PORT})..."
mount_smbfs "//${NAS_USER}:${NAS_PASS}@${NAS_HOST}:${NAS_PORT}/${SHARE}" "$MOUNT_POINT" 2>&1

if mount | grep -q "CKB-NAS-1TB"; then
  echo "挂载成功: $MOUNT_POINT"
  echo "添加到 Finder 侧栏：在 Finder 中把「CKB-NAS-1TB」拖到侧栏「位置」下即可"
  echo "直接往里拷贝文件，Finder 会显示传输速率"
  open "$MOUNT_POINT"
else
  echo "挂载失败。若提示 Authentication error，请修改本脚本中的 NAS_PASS 为 DSM 登录密码"
  exit 1
fi
