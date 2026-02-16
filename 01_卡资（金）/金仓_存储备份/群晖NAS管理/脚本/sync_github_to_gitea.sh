#!/usr/bin/env bash
# GitHub → 存客宝 NAS Gitea 直接接通：从 GitHub 拉取新内容并推送到 NAS Gitea，无需指定 Gitea（固定为存客宝）。
# 固定目标：存客宝 NAS Gitea = http://open.quwanzhi.com:3000，用户 fnvtk。
# 在 NAS 上全自动：从同目录 sync_tokens.env 读 Token。用法：bash sync_github_to_gitea.sh [--repo 仓库名]
# 依赖：curl, git。维护：金仓

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="${SYNC_WORK_DIR:-/tmp/github_gitea_sync}"
GITHUB_USER="${GITHUB_USER:-fnvtk}"
# 固定存客宝 NAS Gitea，不开放覆盖
GITEA_BASE="http://open.quwanzhi.com:3000"
GITEA_USER="fnvtk"

# 自动加载 Token：先读同目录 sync_tokens.env，再读环境变量
if [ -f "${SCRIPT_DIR}/sync_tokens.env" ]; then
  set -a
  # shellcheck source=/dev/null
  . "${SCRIPT_DIR}/sync_tokens.env"
  set +a
fi
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
GITEA_TOKEN="${GITEA_TOKEN:-}"

usage() {
  echo "用法: $0 [--repo REPO_NAME]"
  echo "  无参数：同步 GitHub 上 ${GITHUB_USER} 的所有仓库到 Gitea"
  echo "  --repo REPO_NAME：只同步指定仓库"
  echo "Token 来源: 同目录 sync_tokens.env，或环境变量 GITHUB_TOKEN / GITEA_TOKEN"
  exit 1
}

SINGLE_REPO=""
while [ $# -gt 0 ]; do
  case "$1" in
    --repo) SINGLE_REPO="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "未知参数: $1"; usage ;;
  esac
done

if [ -z "$GITEA_TOKEN" ]; then
  echo "错误: 未设置 GITEA_TOKEN。请在 ${SCRIPT_DIR}/sync_tokens.env 或环境变量中配置（可用 Gitea 登录密码）"
  exit 1
fi

# 全局锁：避免与 cron、Web 钩子同时触发时并发写同一仓库（二选一：flock 或 mkdir 原子锁）
LOCK_DIR="${WORK_DIR}.lock"
LOCK_WAIT="${SYNC_LOCK_WAIT:-300}"
acquire_lock() {
  local waited=0
  while ! mkdir "$LOCK_DIR" 2>/dev/null; do
    [ $waited -ge "$LOCK_WAIT" ] && { echo "获取锁超时，跳过本次"; exit 0; }
    sleep 5; waited=$((waited+5))
  done
  trap 'rmdir "$LOCK_DIR" 2>/dev/null' EXIT
}
acquire_lock

# 列出要同步的仓库名（不依赖 jq，兼容群晖）
get_repos() {
  if [ -n "$SINGLE_REPO" ]; then
    echo "$SINGLE_REPO"
    return
  fi
  if [ -z "$GITHUB_TOKEN" ]; then
    echo "错误: 全量同步需要 GITHUB_TOKEN，请在 sync_tokens.env 或环境变量中配置"
    exit 1
  fi
  local json
  json=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/users/${GITHUB_USER}/repos?per_page=200")
  echo "$json" | grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/'
}

# 在 Gitea 创建仓库（若不存在）。GITEA_TOKEN 可为登录密码（Basic Auth）
gitea_create_repo() {
  local repo_name="$1"
  local exists
  exists=$(curl -s -o /dev/null -w "%{http_code}" -u "${GITEA_USER}:${GITEA_TOKEN}" \
    "${GITEA_BASE}/api/v1/repos/${GITEA_USER}/${repo_name}" 2>/dev/null) || true
  if [ "$exists" = "200" ]; then
    return 0
  fi
  echo "  在 Gitea 创建仓库: ${repo_name}"
  curl -s -X POST -u "${GITEA_USER}:${GITEA_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${repo_name}\",\"private\":false}" \
    "${GITEA_BASE}/api/v1/user/repos" >/dev/null || true
}

# 单个仓库：从 GitHub mirror 拉取，推送到 Gitea
sync_one() {
  local repo_name="$1"
  local gh_url="https://github.com/${GITHUB_USER}/${repo_name}.git"
  if [ -n "$GITHUB_TOKEN" ]; then
    gh_url="https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${repo_name}.git"
  fi
  # HTTP 推送格式: http://用户:令牌@主机/路径
  local base_no_slash="${GITEA_BASE%/}"
  local gitea_url="${base_no_slash/https:\/\//https:\/\/${GITEA_USER}:${GITEA_TOKEN}@}"
  gitea_url="${gitea_url/http:\/\//http:\/\/${GITEA_USER}:${GITEA_TOKEN}@}"
  gitea_url="${gitea_url}/${GITEA_USER}/${repo_name}.git"

  echo "同步: ${repo_name}"
  gitea_create_repo "$repo_name"

  mkdir -p "$WORK_DIR"
  cd "$WORK_DIR"
  if [ -d "${repo_name}.git" ]; then
    cd "${repo_name}.git"
    git fetch --all --prune
    git fetch --tags --prune
  else
    git clone --mirror "$gh_url" "${repo_name}.git"
    cd "${repo_name}.git"
  fi
  git push --mirror "$gitea_url" || { echo "  警告: ${repo_name} 推送失败"; return 1; }
  echo "  完成: ${repo_name}"
}

mkdir -p "$WORK_DIR"
while read -r repo_name; do
  [ -z "$repo_name" ] && continue
  sync_one "$repo_name" || true
done < <(get_repos)

echo "全部同步完成。Gitea: ${GITEA_BASE}/${GITEA_USER}"
