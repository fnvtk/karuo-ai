#!/bin/bash
# ============================================
# Gitea 智能推送：局域网用 LAN IP 直连，外网用域名+代理
# 用法：在仓库根目录执行，或传入 REPO_DIR
# 依赖：同目录下 gitea_push.conf（可选 GITEA_LAN_IP、GITEA_HTTP_PROXY）
# ============================================

REPO_DIR="${1:-/Users/karuo/Documents/个人/卡若AI}"
REMOTE="${2:-gitea}"
BRANCH="${3:-main}"
CONF_DIR="$(dirname "$0")"
CONF="$CONF_DIR/gitea_push.conf"

cd "$REPO_DIR" || exit 1

# 读取配置（去掉注释和空行）
GITEA_LAN_IP=""
GITEA_HTTP_PROXY="http://127.0.0.1:7897"
if [ -f "$CONF" ]; then
    while IFS= read -r line; do
        [[ "$line" =~ ^#.*$ ]] && continue
        [[ -z "${line// /}" ]] && continue
        if [[ "$line" =~ ^GITEA_LAN_IP=(.*)$ ]]; then
            GITEA_LAN_IP="${BASH_REMATCH[1]}"
            GITEA_LAN_IP="${GITEA_LAN_IP%%#*}"
            GITEA_LAN_IP="${GITEA_LAN_IP// /}"
        elif [[ "$line" =~ ^GITEA_HTTP_PROXY=(.*)$ ]]; then
            GITEA_HTTP_PROXY="${BASH_REMATCH[1]}"
            GITEA_HTTP_PROXY="${GITEA_HTTP_PROXY%%#*}"
            GITEA_HTTP_PROXY="${GITEA_HTTP_PROXY// /}"
        fi
    done < "$CONF"
fi

ORIG_URL=$(git remote get-url "$REMOTE" 2>/dev/null)
[ -z "$ORIG_URL" ] && { echo "[gitea_push_smart] 错误：remote $REMOTE 不存在"; exit 1; }

# 从 URL 提取：http://user:token@host:端口/fnvtk/karuo-ai.git（端口随 frp，当前 13000）
AUTH_PREFIX="${ORIG_URL%%@*}@"
PATH_PART="${ORIG_URL#*@}"
HOST_AND_PORT="${PATH_PART%%/*}"
REPO_PATH="${PATH_PART#*/}"
GITEA_HOST="${HOST_AND_PORT%:*}"
GITEA_PORT="${HOST_AND_PORT##*:}"
if ! [[ "$GITEA_PORT" =~ ^[0-9]+$ ]]; then
    GITEA_PORT="13000"
    REPO_PATH="${PATH_PART#*/}"
fi
[ -z "$REPO_PATH" ] && REPO_PATH="fnvtk/karuo-ai.git"

do_push() {
    if [ -n "$1" ]; then
        export HTTP_PROXY="$1" HTTPS_PROXY="$1" ALL_PROXY="$1"
        echo "[gitea_push_smart] 使用代理推送（外网）..."
    else
        unset HTTP_PROXY HTTPS_PROXY ALL_PROXY
        echo "[gitea_push_smart] 直连推送（局域网）..."
    fi
    git push "$REMOTE" "$BRANCH" 2>&1
    return $?
}

MAX_TRY=3
# 1) 若配置了 LAN IP 且能连通 3000，则用 LAN 推送
if [ -n "$GITEA_LAN_IP" ]; then
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "http://${GITEA_LAN_IP}:${GITEA_PORT}/" 2>/dev/null)
    if [ "$CODE" = "200" ]; then
        LAN_URL="http://${AUTH_PREFIX}${GITEA_LAN_IP}:${GITEA_PORT}/${REPO_PATH}"
        git remote set-url "$REMOTE" "$LAN_URL"
        for i in $(seq 1 $MAX_TRY); do
            echo "[gitea_push_smart] 第 $i/$MAX_TRY 次尝试（局域网 $GITEA_LAN_IP:${GITEA_PORT}）..."
            if do_push ""; then
                git remote set-url "$REMOTE" "$ORIG_URL"
                echo "[gitea_push_smart] 推送成功（局域网）"
                exit 0
            fi
            [ $i -lt $MAX_TRY ] && sleep 5
        done
        git remote set-url "$REMOTE" "$ORIG_URL"
    fi
fi

# 2) 使用域名 + 代理推送（外网）
for i in $(seq 1 $MAX_TRY); do
    echo "[gitea_push_smart] 第 $i/$MAX_TRY 次尝试（外网域名 + 代理）..."
    if [ -n "$GITEA_HTTP_PROXY" ]; then
        if do_push "$GITEA_HTTP_PROXY"; then
            echo "[gitea_push_smart] 推送成功（外网）"
            exit 0
        fi
    else
        if do_push ""; then
            echo "[gitea_push_smart] 推送成功"
            exit 0
        fi
    fi
    [ $i -lt $MAX_TRY ] && echo "[gitea_push_smart] 5 秒后重试..." && sleep 5
done

echo "[gitea_push_smart] 错误：$MAX_TRY 次尝试均失败"
exit 1
