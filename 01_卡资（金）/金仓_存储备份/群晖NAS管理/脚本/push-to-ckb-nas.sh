#!/usr/bin/env bash
# 将卡若AI 推送到 CKB NAS Git（当前 origin 已指向 NAS，只传本地不传 GitHub）
# 用法：在卡若AI 根目录执行 bash 本脚本

set -e
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || true
if [ -z "$REPO_ROOT" ]; then
  echo "错误：当前不在 Git 仓库内，请到卡若AI 根目录执行。"
  exit 1
fi
cd "$REPO_ROOT"

ORIGIN_URL="$(git remote get-url origin 2>/dev/null)" || true
if [ -z "$ORIGIN_URL" ]; then
  echo "未配置 origin。请按 references/卡若AI同步到CKB_NAS_Git.md 配置。"
  exit 1
fi

echo "→ 推送到 CKB NAS (origin) ..."
git push origin main
echo "→ 完成。Git 地址： ssh://fnvtk@open.quwanzhi.com:22201/volume1/git/github/fnvtk/karuo-ai.git"
