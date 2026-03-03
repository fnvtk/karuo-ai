#!/bin/bash
# ============================================
# 家里 DiskStation 约 1TB 备份盘 - Mac 挂载成像真实硬盘
# 内网优先（192.168.110.29），外网用 opennas2:4452
# 挂载后可用于：时间机器、Finder 侧栏当硬盘用、拷贝看速率
# ============================================

NAS_USER="admin"
NAS_PASS="zhiqun1984"
# 共享名：DSM 里新建的备份盘可用 MacBackup，已有共享可用 共享
SHARE_RAW="${MACBACKUP_SHARE:-共享}"
MOUNT_POINT="$HOME/DiskStation-1TB"

# 中文共享名需 URL 编码，否则 mount_smbfs 会报 URL parsing failed
SHARE=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$SHARE_RAW'))" 2>/dev/null || echo "$SHARE_RAW")

# 已挂载则先卸载
if mount | grep -q "DiskStation-1TB"; then
  echo "正在卸载旧挂载..."
  umount "$MOUNT_POINT" 2>/dev/null
  sleep 1
fi

mkdir -p "$MOUNT_POINT"

# 内网优先：能 ping 通 192.168.110.29 则用内网（SMB 默认 445）
if ping -c 1 -W 2 192.168.110.29 >/dev/null 2>&1; then
  echo "使用内网 192.168.110.29 挂载..."
  SMB_URL="//${NAS_USER}:${NAS_PASS}@192.168.110.29/${SHARE}"
else
  echo "使用外网 opennas2.quwanzhi.com:4452 挂载..."
  SMB_URL="//${NAS_USER}:${NAS_PASS}@opennas2.quwanzhi.com:4452/${SHARE}"
fi

mount_smbfs "$SMB_URL" "$MOUNT_POINT" 2>&1

if mount | grep -q "DiskStation-1TB"; then
  echo "挂载成功: $MOUNT_POINT"
  echo "→ 时间机器：系统设置 → 时间机器 → 选择该磁盘"
  echo "→ 侧栏固定：在 Finder 中把「DiskStation-1TB」拖到「位置」"
  open "$MOUNT_POINT"
else
  echo "挂载失败。请确认："
  echo "  1) NAS 上已建共享文件夹（如 ${SHARE_RAW}），SMB 已开"
  echo "  2) 外网时 frpc 已添加 SMB 4452"
  echo "  3) 密码正确（可改本脚本 NAS_PASS）"
  exit 1
fi
