#!/bin/bash
# 手动推送直到成功 - 网络不稳定时使用
# 用法: bash 手动推送直到成功.sh

REPO_DIR="/Users/karuo/Documents/个人/卡若AI"
cd "$REPO_DIR" || exit 1

for i in 1 2 3 4 5 6 7 8 9 10; do
  echo "[$(date '+%H:%M:%S')] 第 $i 次尝试..."
  if git push gitea main 2>&1; then
    echo "✅ 推送成功"
    exit 0
  fi
  echo "⏳ 5 秒后重试..."
  sleep 5
done
echo "❌ 10 次尝试后仍未成功，请检查网络后重试"
exit 1
