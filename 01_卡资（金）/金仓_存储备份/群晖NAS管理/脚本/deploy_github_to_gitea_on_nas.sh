#!/usr/bin/env bash
# 一键部署：GitHub ↔ 存客宝 NAS Gitea 直接接通。从账号索引读 Token，把同步脚本和定时任务部署到 NAS。
# 在 卡若AI 根目录执行：bash "01_卡资（金）/_团队成员/金仓/群晖NAS管理/scripts/deploy_github_to_gitea_on_nas.sh"
# 或传入账号索引路径：bash deploy_github_to_gitea_on_nas.sh /path/to/00_账号与API索引.md

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 卡若AI 根目录（脚本在 01_卡资/.../scripts/ 下）
ROOT="${ROOT:-$(cd "$SCRIPT_DIR/../../../../.." && pwd)}"
INDEX="${1:-$ROOT/_共享模块/工作台/00_账号与API索引.md}"
NAS_USER="${NAS_USER:-fnvtk}"
NAS_HOST="${NAS_HOST:-192.168.1.201}"
NAS_DIR="/volume1/docker/gitea"
SSH_OPTS="-o ConnectTimeout=10 -o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc -o StrictHostKeyChecking=no"
NAS="${NAS_USER}@${NAS_HOST}"

echo "→ 从账号索引读取 Token: $INDEX"
[ ! -f "$INDEX" ] && { echo "错误: 未找到 $INDEX"; exit 1; }
GITHUB_TOKEN=$(grep -o 'ghp_[A-Za-z0-9]*' "$INDEX" | head -1)
GITEA_TOKEN=$(sed -n '/### Gitea（CKB NAS/,/^###/p' "$INDEX" | grep "密码" | sed -n 's/.*`\([^`]*\)`.*/\1/p' | head -1)
[ -z "$GITHUB_TOKEN" ] && { echo "错误: 未在索引中找到 GitHub Token (ghp_...)"; exit 1; }
[ -z "$GITEA_TOKEN" ] && GITEA_TOKEN="Zhiqun1984"
echo "  已读取 GITHUB_TOKEN / GITEA_TOKEN"

echo "→ 在 NAS 上创建 $NAS_DIR 并写入 sync_tokens.env"
TMP_ENV=$(mktemp)
trap "rm -f $TMP_ENV" EXIT
echo "GITHUB_TOKEN=$GITHUB_TOKEN" > "$TMP_ENV"
echo "GITEA_TOKEN=$GITEA_TOKEN" >> "$TMP_ENV"
echo "GITEA_USER=fnvtk" >> "$TMP_ENV"
ssh $SSH_OPTS "$NAS" "mkdir -p $NAS_DIR"
scp $SSH_OPTS "$TMP_ENV" "$NAS:$NAS_DIR/sync_tokens.env"

echo "→ 上传同步脚本 sync_github_to_gitea.sh"
scp $SSH_OPTS "$SCRIPT_DIR/sync_github_to_gitea.sh" "$NAS:$NAS_DIR/sync_github_to_gitea.sh"
ssh $SSH_OPTS "$NAS" "chmod +x $NAS_DIR/sync_github_to_gitea.sh"

echo "→ 添加定时任务（每 30 分钟拉取 GitHub 并推送到存客宝 Gitea，保持界面与结构同步）"
CRON_LINE="*/30 * * * * /bin/bash $NAS_DIR/sync_github_to_gitea.sh >> $NAS_DIR/sync.log 2>&1"
ssh $SSH_OPTS "$NAS" "(crontab -l 2>/dev/null | grep -v sync_github_to_gitea; echo \"$CRON_LINE\") | crontab -" || true

echo "→ 立即执行一次同步"
ssh $SSH_OPTS "$NAS" "/bin/bash $NAS_DIR/sync_github_to_gitea.sh" || true

echo ""
echo "✅ 已接通：GitHub 有更新会自动拉取并推送到存客宝 NAS Gitea（$NAS_DIR），无需再指定。"
echo "   日志: ssh $NAS tail -f $NAS_DIR/sync.log"
echo "   手动执行: ssh $NAS $NAS_DIR/sync_github_to_gitea.sh"
