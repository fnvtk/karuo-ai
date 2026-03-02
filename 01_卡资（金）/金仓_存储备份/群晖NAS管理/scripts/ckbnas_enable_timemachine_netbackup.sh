#!/bin/bash
# ============================================
# 在 ckbnas 上为 NetBackup 共享启用 Time Machine（SMB fruit）
# 需 NAS 上 fnvtk 具备 sudo 权限；密码通过环境变量 CKB_NAS_SUDO_PASS 传入（不写死）
# 用法：export CKB_NAS_SUDO_PASS='你的DSM密码' && bash ckbnas_enable_timemachine_netbackup.sh
# ============================================

set -e
CKB_IP="${CKB_IP:-192.168.1.201}"
SHARE="NetBackup"

echo "=== ckbnas 启用 Time Machine (NetBackup) ==="
echo "目标: ${CKB_IP} / ${SHARE}"
echo ""

if [ -z "$CKB_NAS_SUDO_PASS" ]; then
  echo "未设置 CKB_NAS_SUDO_PASS，无法在 NAS 上执行 sudo。"
  echo "请执行: export CKB_NAS_SUDO_PASS='你的DSM登录密码'"
  echo "然后重新运行本脚本。"
  exit 1
fi

# 远程脚本：从环境变量 SUDO_PASS 读密码
REMOTE_SCRIPT=$(cat << 'REMOTEEOF'
CONF=/etc/samba/smb.share.conf
BAK=/etc/samba/smb.share.conf.bak.timemachine
if grep -q "fruit:time machine" "$CONF" 2>/dev/null; then
  echo "ALREADY: fruit:time machine 已存在，无需修改"
  exit 0
fi
echo "$SUDO_PASS" | sudo -S cp -a "$CONF" "$BAK" 2>/dev/null || { echo "ERR: 无法备份或无权写"; exit 2; }
awk '/^\[NetBackup\]/ { inblock=1; print; next }
inblock && /^\[/ { print "\tfruit:time machine = yes"; inblock=0 }
inblock && /path=\/volume1\/NetBackup/ { print; print "\tfruit:time machine = yes"; next }
{ print }' "$CONF" > /tmp/smb.share.conf.new
echo "$SUDO_PASS" | sudo -S mv /tmp/smb.share.conf.new "$CONF" 2>/dev/null || { echo "ERR: 无法写配置"; exit 3; }
if grep -q "fruit:time machine" "$CONF"; then
  echo "OK: 已添加 fruit:time machine 到 NetBackup"
  echo "$SUDO_PASS" | sudo -S systemctl restart pkg-synosamba-smbd.service 2>/dev/null || true
  echo "OK: 已尝试重启 SMB"
else
  echo "ERR: 修改未生效"
  exit 1
fi
REMOTEEOF
)

# 传入 SUDO_PASS 并执行（密码仅通过环境变量传递）
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 fnvtk@${CKB_IP} "export SUDO_PASS='${CKB_NAS_SUDO_PASS//\'/\'\\\'\'}'; $REMOTE_SCRIPT" 2>&1

echo ""
echo "配置完成。请在 Mac 上重新选择备份磁盘或执行: sudo tmutil setdestination /Volumes/NetBackup"
