#!/usr/bin/env bash
# 在 CKB NAS 上部署 Gitea（类 GitHub 的 HTTP 访问）
# 需能 ssh nas 或 ssh fnvtk@192.168.1.201。执行一次即可。
# 详见 references/CKB_NAS_Gitea_类GitHub访问.md

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAS_USER="${NAS_USER:-fnvtk}"
NAS_HOST="${NAS_HOST:-192.168.1.201}"
NAS="${NAS_USER}@${NAS_HOST}"
SSH_OPTS="-o ConnectTimeout=10 -o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc -o StrictHostKeyChecking=no"

echo "→ 在 NAS 上创建目录 /volume1/docker/gitea ..."
ssh $SSH_OPTS "$NAS" "mkdir -p /volume1/docker/gitea/data"

echo "→ 上传 docker-compose.yml 并启动 ..."
ssh $SSH_OPTS "$NAS" "cat > /volume1/docker/gitea/docker-compose.yml" < "$SCRIPT_DIR/gitea/docker-compose.yml"

# 若下面一行因 sudo 密码失败，请 SSH 到 NAS 后手动执行：
#   cd /volume1/docker/gitea && sudo /volume1/@appstore/ContainerManager/usr/bin/docker compose up -d
ssh $SSH_OPTS "$NAS" "cd /volume1/docker/gitea && echo 'zhiqun1984' | sudo -S /volume1/@appstore/ContainerManager/usr/bin/docker compose up -d"

echo "→ 检查状态..."
ssh $SSH_OPTS "$NAS" "/volume1/@appstore/ContainerManager/usr/bin/docker ps | grep gitea" || true

echo ""
echo "✅ 部署完成。请在浏览器打开："
echo "   内网: http://192.168.1.201:3000"
echo "   外网: http://open.quwanzhi.com:3000（需 frp 映射 3000 端口）"
echo "   首次打开按向导创建管理员并新建仓库 karuo-ai。详见 references/CKB_NAS_Gitea_类GitHub访问.md"
