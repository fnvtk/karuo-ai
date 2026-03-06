#!/bin/bash
# ============================================
# 公司 NAS 千问小模型一键部署
# 功能：在 NAS Docker 中安装 Ollama + qwen2.5:1.5b，并暴露外网端口 11401
# 使用：bash deploy_ollama_nas.sh
# ============================================

set -e
NAS_USER="${NAS_USER:-fnvtk}"
NAS_PASS="${NAS_PASS:-zhiqun1984}"
# NAS 上 sudo 密码（可能与 SSH 不同，如大写 Z）
SUDO_PASS="${SUDO_PASS:-Zhiqun1984}"
NAS_HOST="${NAS_HOST:-open.quwanzhi.com}"
NAS_SSH_PORT="${NAS_SSH_PORT:-22201}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_DIR="/volume1/docker/ollama"
FRPC_TOML="/volume1/docker/frpc/frpc.toml"

echo ">>> 1. 创建目录并上传 docker-compose.yml"
sshpass -p "$NAS_PASS" ssh -o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes128-cbc -o StrictHostKeyChecking=no -p "$NAS_SSH_PORT" "$NAS_USER@$NAS_HOST" \
  "mkdir -p $COMPOSE_DIR"
# 使用 SSH 管道写入（避免 scp subsystem 不可用）
sshpass -p "$NAS_PASS" ssh -o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes128-cbc -o StrictHostKeyChecking=no -p "$NAS_SSH_PORT" "$NAS_USER@$NAS_HOST" \
  "cat > $COMPOSE_DIR/docker-compose.yml" < "$SCRIPT_DIR/docker-compose.yml"

echo ">>> 2. 启动 Ollama 容器"
sshpass -p "$NAS_PASS" ssh -o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes128-cbc -o StrictHostKeyChecking=no -p "$NAS_SSH_PORT" "$NAS_USER@$NAS_HOST" \
  "bash -c 'echo $SUDO_PASS | sudo -S /usr/local/bin/docker compose -f $COMPOSE_DIR/docker-compose.yml up -d'"

echo ">>> 3. 等待容器就绪后拉取千问小模型 qwen2.5:1.5b（约 1GB）"
sleep 5
sshpass -p "$NAS_PASS" ssh -o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes128-cbc -o StrictHostKeyChecking=no -p "$NAS_SSH_PORT" "$NAS_USER@$NAS_HOST" \
  "bash -c 'echo $SUDO_PASS | sudo -S /usr/local/bin/docker exec ollama-nas ollama pull qwen2.5:1.5b'"

echo ">>> 4. 配置 frp 外网端口 11401 → NAS 11434"
# 若已存在 ollama 代理则跳过
if sshpass -p "$NAS_PASS" ssh -o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes128-cbc -o StrictHostKeyChecking=no -p "$NAS_SSH_PORT" "$NAS_USER@$NAS_HOST" "grep -q 'nas-ollama' $FRPC_TOML 2>/dev/null"; then
  echo "    frp 中已存在 nas-ollama，跳过"
else
  sshpass -p "$NAS_PASS" ssh -o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes128-cbc -o StrictHostKeyChecking=no -p "$NAS_SSH_PORT" "$NAS_USER@$NAS_HOST" \
    "echo '
# Ollama 千问小模型 API（外网端口 11401 → NAS 11434）
[[proxies]]
name = \"nas-ollama\"
type = \"tcp\"
localIP = \"127.0.0.1\"
localPort = 11434
remotePort = 11401
' >> $FRPC_TOML"
  echo ">>> 5. 重启 frpc 使配置生效"
  sshpass -p "$NAS_PASS" ssh -o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes128-cbc -o StrictHostKeyChecking=no -p "$NAS_SSH_PORT" "$NAS_USER@$NAS_HOST" \
    "bash -c 'echo $SUDO_PASS | sudo -S /usr/local/bin/docker restart nas-frpc'"
fi

echo ""
echo "=============================================="
echo "部署完成。千问小模型 API 接口："
echo "  内网: http://192.168.1.201:11434"
echo "  外网: http://open.quwanzhi.com:11401"
echo "  模型: qwen2.5:1.5b"
echo "  说明: 见 参考资料/NAS千问小模型API配置.md"
echo "=============================================="
