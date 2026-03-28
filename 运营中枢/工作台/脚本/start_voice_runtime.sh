#!/usr/bin/env bash
# 卡若 AI · 启动语音对话运行时（配置取自工作台「语音对话」目录）
set -euo pipefail

CONFIG_ROOT="$(cd "$(dirname "$0")/../语音对话" && pwd)"
ENV_FILE="${KARUO_VOICE_ENV:-$CONFIG_ROOT/.env}"
VOICE_RUNTIME_SRC="${VOICE_RUNTIME_SRC:-/Users/karuo/Documents/开发/7.项目调研/tryvoice-oss/AaronZ021_tryvoice-oss}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "缺少环境文件: $ENV_FILE"
  echo "请执行: cp \"$CONFIG_ROOT/env.example\" \"$CONFIG_ROOT/.env\" 并填写 OPENCLAW_GATEWAY_TOKEN"
  exit 1
fi

if [[ ! -d "$VOICE_RUNTIME_SRC" ]]; then
  echo "未找到语音运行时源码目录: $VOICE_RUNTIME_SRC"
  echo "可设置: export VOICE_RUNTIME_SRC=/正确路径"
  exit 1
fi

if [[ ! -f "$VOICE_RUNTIME_SRC/pyproject.toml" ]]; then
  echo "目录缺少 pyproject.toml（非预期根目录）: $VOICE_RUNTIME_SRC"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${OPENCLAW_GATEWAY_TOKEN:-}" ]]; then
  echo "WARN: OPENCLAW_GATEWAY_TOKEN 为空，网关鉴权可能失败。"
fi

cd "$VOICE_RUNTIME_SRC"
if [[ ! -d .venv ]]; then
  echo "未找到 $VOICE_RUNTIME_SRC/.venv — 首次请: cd \"$VOICE_RUNTIME_SRC\" && bash scripts/setup.sh"
  exit 1
fi

# shellcheck disable=SC1091
source .venv/bin/activate

if [[ "${1:-}" == "--" ]]; then
  shift
fi

exec tryvoice "$@"
