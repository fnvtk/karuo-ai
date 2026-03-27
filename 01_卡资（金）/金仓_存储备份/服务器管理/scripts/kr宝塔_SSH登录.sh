#!/bin/bash
# kr宝塔 43.139.27.93 多种 SSH 登录方式
# 按顺序尝试，任一成功即执行后续命令

set -e
HOST="43.139.27.93"
CMD="${*:-echo OK}"

# 方式1：密钥登录（最稳定，推荐）
if [ -f "/Users/karuo/Documents/开发/4、小工具/服务器管理/Steam/id_ed25519" ]; then
  echo ">>> 尝试密钥登录 (port 22022)..."
  if ssh -p 22022 -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
     -i "/Users/karuo/Documents/开发/4、小工具/服务器管理/Steam/id_ed25519" \
     root@"$HOST" "bash -lc $(printf '%q' "$CMD")" 2>/dev/null; then
    exit 0
  fi
  echo ">>> 尝试密钥登录 (port 22)..."
  if ssh -p 22 -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
     -i "/Users/karuo/Documents/开发/4、小工具/服务器管理/Steam/id_ed25519" \
     root@"$HOST" "bash -lc $(printf '%q' "$CMD")" 2>/dev/null; then
    exit 0
  fi
fi

# 方式2：密码 root + Zhiqun1984（大写 Z）
echo ">>> 尝试密码登录 root@$HOST (port 22022)..."
if command -v sshpass >/dev/null 2>&1; then
  if sshpass -p 'Zhiqun1984' ssh -p 22022 -o StrictHostKeyChecking=no \
     -o PubkeyAuthentication=no -o PreferredAuthentications=password \
     root@"$HOST" "bash -lc $(printf '%q' "$CMD")" 2>/dev/null; then
    exit 0
  fi
  echo ">>> 尝试密码登录 (port 22)..."
  if sshpass -p 'Zhiqun1984' ssh -p 22 -o StrictHostKeyChecking=no \
     -o PubkeyAuthentication=no root@"$HOST" "bash -lc $(printf '%q' "$CMD")" 2>/dev/null; then
    exit 0
  fi
fi

# 全部失败
echo "❌ 所有 SSH 方式均失败。请用 宝塔面板 → 终端 执行。"
exit 1
