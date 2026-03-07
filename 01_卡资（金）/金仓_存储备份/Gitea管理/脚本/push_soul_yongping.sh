#!/bin/bash
# ============================================
# soul-yongping → Gitea 推送（大仓库，需直连+无超时）
# 用法：bash 本脚本 或 在终端直接运行（避免 Cursor 120s 超时）
# ============================================

REPO="/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验-永平"
REMOTE="gitea"
BRANCH="main"
# Token 需 write:user；来源：00_账号与API索引 或 Gitea 设置→应用→生成
TOKEN='07f82fbd81a64fb714d9a6c47b11cc5b98f2fa2e'

cd "$REPO" || { echo "错误：目录不存在 $REPO"; exit 1; }

git remote set-url gitea "http://fnvtk:${TOKEN}@open.quwanzhi.com:3000/fnvtk/soul-yongping.git" 2>/dev/null
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY
GIT_HTTP_VERSION=HTTP/1.1 git push --progress -u gitea main
