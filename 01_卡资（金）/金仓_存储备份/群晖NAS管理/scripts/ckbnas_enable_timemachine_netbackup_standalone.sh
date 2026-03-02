#!/bin/bash
# ============================================
# 在 ckbnas 上以 root 运行：为 NetBackup 启用 Time Machine（SMB fruit）
# 用法：将本脚本复制到 NAS（如 /volume1/scripts/），SSH 登录后 sudo bash 本脚本，或 DSM 计划任务以 root 运行
# 例：scp 本脚本 fnvtk@192.168.1.201:/volume1/NetBackup/ 然后 ssh fnvtk@192.168.1.201 'sudo bash /volume1/NetBackup/ckbnas_enable_timemachine_netbackup_standalone.sh'
# ============================================

CONF=/etc/samba/smb.share.conf
BAK=/etc/samba/smb.share.conf.bak.timemachine

if [ "$(id -u)" -ne 0 ]; then
  echo "请以 root 运行（sudo bash $0）"
  exit 1
fi

if grep -q "fruit:time machine" "$CONF" 2>/dev/null; then
  echo "ALREADY: fruit:time machine 已存在，无需修改"
  exit 0
fi

cp -a "$CONF" "$BAK" || { echo "ERR: 无法备份"; exit 2; }

awk '/^\[NetBackup\]/ { inblock=1; print; next }
inblock && /^\[/ { print "\tfruit:time machine = yes"; inblock=0 }
inblock && /path=\/volume1\/NetBackup/ { print; print "\tfruit:time machine = yes"; next }
{ print }' "$CONF" > /tmp/smb.share.conf.new
mv /tmp/smb.share.conf.new "$CONF" || { echo "ERR: 无法写配置"; exit 3; }

if grep -q "fruit:time machine" "$CONF"; then
  echo "OK: 已添加 fruit:time machine 到 NetBackup"
  systemctl restart pkg-synosamba-smbd.service 2>/dev/null || true
  echo "OK: 已尝试重启 SMB"
else
  echo "ERR: 修改未生效，已保留备份 $BAK"
  exit 1
fi
echo "完成。Mac 端可执行: sudo tmutil setdestination /Volumes/NetBackup"
