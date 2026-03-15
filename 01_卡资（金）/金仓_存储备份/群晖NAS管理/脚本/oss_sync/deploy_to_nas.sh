#!/usr/bin/env bash
# 一键部署 OSS 同步脚本到公司 NAS（Synology DS1825+）
# 使用方式：bash deploy_to_nas.sh
set -euo pipefail

NAS_IP="192.168.1.201"
NAS_USER="fnvtk"
NAS_PASS="zhiqun1984"
REMOTE_DIR="/volume1/backup/oss_kr-cypd"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "====== 部署 OSS→NAS 同步脚本 ======"

echo "[1/4] 创建远程目录..."
sshpass -p "${NAS_PASS}" ssh -o StrictHostKeyChecking=no "${NAS_USER}@${NAS_IP}" \
  "mkdir -p ${REMOTE_DIR}/_logs ${REMOTE_DIR}/_cost_reports ${REMOTE_DIR}/_snapshots"

echo "[2/4] 上传同步脚本..."
sshpass -p "${NAS_PASS}" scp -o StrictHostKeyChecking=no \
  "${SCRIPT_DIR}/oss_sync_to_nas.sh" \
  "${NAS_USER}@${NAS_IP}:${REMOTE_DIR}/oss_sync_to_nas.sh"

sshpass -p "${NAS_PASS}" ssh -o StrictHostKeyChecking=no "${NAS_USER}@${NAS_IP}" \
  "chmod +x ${REMOTE_DIR}/oss_sync_to_nas.sh"

echo "[3/4] 安装 ossutil（如未安装）..."
sshpass -p "${NAS_PASS}" ssh -o StrictHostKeyChecking=no "${NAS_USER}@${NAS_IP}" bash <<'REMOTE_INSTALL'
if ! command -v /usr/local/bin/ossutil &>/dev/null; then
  echo "正在下载 ossutil..."
  ARCH=$(uname -m)
  if [ "$ARCH" = "x86_64" ]; then
    URL="https://gosspublic.alicdn.com/ossutil/v2/2.0.3/ossutil-v2.0.3-linux-amd64.zip"
  else
    URL="https://gosspublic.alicdn.com/ossutil/v2/2.0.3/ossutil-v2.0.3-linux-arm64.zip"
  fi
  cd /tmp
  wget -q "${URL}" -O ossutil.zip
  unzip -o ossutil.zip -d ossutil_pkg
  cp ossutil_pkg/ossutil*/ossutil /usr/local/bin/ossutil
  chmod +x /usr/local/bin/ossutil
  rm -rf ossutil.zip ossutil_pkg
  echo "ossutil 安装完成: $(/usr/local/bin/ossutil version)"
else
  echo "ossutil 已安装: $(/usr/local/bin/ossutil version)"
fi
REMOTE_INSTALL

echo "[4/4] 配置 NAS 定时任务（每天凌晨 03:00）..."
CRON_LINE="0 3 * * * /bin/bash ${REMOTE_DIR}/oss_sync_to_nas.sh >> ${REMOTE_DIR}/_logs/cron.log 2>&1"
sshpass -p "${NAS_PASS}" ssh -o StrictHostKeyChecking=no "${NAS_USER}@${NAS_IP}" bash <<REMOTE_CRON
EXISTING=\$(crontab -l 2>/dev/null || true)
if echo "\${EXISTING}" | grep -q "oss_sync_to_nas"; then
  echo "定时任务已存在，跳过"
else
  (echo "\${EXISTING}"; echo "${CRON_LINE}") | crontab -
  echo "定时任务已添加: 每天 03:00"
fi
REMOTE_CRON

echo ""
echo "====== 部署完成 ======"
echo "同步脚本: ${NAS_USER}@${NAS_IP}:${REMOTE_DIR}/oss_sync_to_nas.sh"
echo "备份目录: ${REMOTE_DIR}/data/"
echo "每日快照: ${REMOTE_DIR}/_snapshots/YYYY-MM-DD/"
echo "费用报告: ${REMOTE_DIR}/_cost_reports/"
echo "同步日志: ${REMOTE_DIR}/_logs/"
echo "定时任务: 每天 03:00 自动执行"
