#!/bin/bash
# ============================================
# 时间机器 → ckbnas (192.168.1.201) NetBackup 目录
# 用法：先确保 DSM 已为 NetBackup 启用 Time Machine，再运行本脚本或按下方命令操作
# ============================================

CKB_IP="192.168.1.201"
SHARE="NetBackup"
SMB_URL="smb://fnvtk@${CKB_IP}/${SHARE}"

echo "=== 时间机器 → ckbnas NetBackup ==="
echo "目标: ${CKB_IP} / ${SHARE}"
echo ""

# 1. 网络检测
echo "[1] 网络"
if ping -c 1 -W 2 "$CKB_IP" >/dev/null 2>&1; then
    echo "    ✅ ${CKB_IP} 可达"
else
    echo "    ❌ ${CKB_IP} 不可达，请检查本机与 ckbnas 在同一网段"
    exit 1
fi

# 2. 挂载检测
echo ""
echo "[2] 挂载"
if [ -d "/Volumes/${SHARE}" ]; then
    echo "    ✅ /Volumes/${SHARE} 已挂载"
else
    echo "    未挂载。正在打开 SMB 连接（会弹窗输入 fnvtk 密码）…"
    open "$SMB_URL"
    echo "    请在弹出的窗口中输入 DSM 用户 fnvtk 的密码，连接成功后按回车继续。"
    read -r
    if [ ! -d "/Volumes/${SHARE}" ]; then
        echo "    ❌ 仍未检测到 /Volumes/${SHARE}，请手动在 Finder 连接服务器: $SMB_URL"
        exit 2
    fi
fi

# 3. 设置时间机器目标（需完全磁盘访问权限）
echo ""
echo "[3] 设置备份目标"
echo "    执行以下命令需「完全磁盘访问」权限（系统设置 → 隐私与安全性 → 完全磁盘访问 → 添加「终端」）："
echo ""
echo "    sudo tmutil setdestination /Volumes/${SHARE}"
echo ""
echo "    执行后可用以下命令验证并立即备份："
echo "    tmutil destinationinfo"
echo "    tmutil startbackup --block"
echo ""
