#!/bin/bash
# 在阿猫 Mac 本机执行：将已下载的 Soul 技能包 zip 解压并合并到 iCloud 卡若AI。
set -euo pipefail
ZIP="${1:-$HOME/Downloads/Soul运营全链路技能包_20260320.zip}"
EXT="${TMPDIR:-/tmp}/_soul_bundle_extract_$$"
# 阿猫机常见：CloudDocs/婼瑄/卡若AI；卡若本机常见：CloudDocs/Documents/婼瑄/卡若AI
KAI=""
for cand in \
  "$HOME/Library/Mobile Documents/com~apple~CloudDocs/Documents/婼瑄/卡若AI" \
  "$HOME/Library/Mobile Documents/com~apple~CloudDocs/婼瑄/卡若AI"; do
  if [[ -d "$cand" ]]; then
    KAI="$cand"
    break
  fi
done

if [[ ! -f "$ZIP" ]]; then
  echo "ERROR: 找不到 zip: $ZIP" >&2
  exit 1
fi
if [[ -z "$KAI" ]]; then
  echo "ERROR: 未找到 iCloud 下的卡若AI（已试 Documents/婼瑄 与 婼瑄 两种路径）" >&2
  echo "请传入第二参数指定卡若AI根目录，例如：" >&2
  echo "  bash $0 \"$ZIP\" \"/你的/卡若AI\"" >&2
  exit 1
fi

rm -rf "$EXT"
mkdir -p "$EXT"
unzip -q "$ZIP" -d "$EXT"
ROOT="$(ls "$EXT" | head -1)"
if [[ ! -d "$EXT/$ROOT/卡若AI" ]]; then
  echo "ERROR: 包内缺少 卡若AI/ 目录" >&2
  rm -rf "$EXT"
  exit 1
fi

# 可选：第二参数覆盖自动探测的卡若AI根目录
if [[ "${2:-}" != "" ]]; then
  KAI="$2"
  if [[ ! -d "$KAI" ]]; then
    echo "ERROR: 指定的卡若AI 不存在: $KAI" >&2
    rm -rf "$EXT"
    exit 1
  fi
fi

echo "合并到: $KAI"
rsync -a "$EXT/$ROOT/卡若AI/" "$KAI/"
mkdir -p "$KAI/.cursor/skills"
if [[ -d "$EXT/$ROOT/.cursor/skills" ]]; then
  rsync -a "$EXT/$ROOT/.cursor/skills/" "$KAI/.cursor/skills/"
fi
rm -rf "$EXT"
echo "OK 已安装。请用 Cursor 打开卡若AI 仓库验证 Agent Skills。"
