#!/bin/bash
# 远程在阿猫 Mac 上执行卡若AI测试（通过SSH）
# 用法：在卡若 Mac 上执行：bash remote_test_amiao.sh

SSH_HOST="kr@macbook.quwanzhi.com"
SSH_PORT="22203"
REMOTE_SCRIPT='bash -s <<'\''REMOTE_EOF'\''
set -euo pipefail
echo "=========================================="
echo "卡若AI 远程测试（阿猫 Mac）"
echo "=========================================="
echo "测试时间: $(date '\''+%Y-%m-%d %H:%M:%S'\'')"
echo ""

# 检测卡若AI路径
KAI_PATHS=(
  "$HOME/Library/Mobile Documents/com~apple~CloudDocs/Documents/婼瑄/卡若AI"
  "$HOME/Library/Mobile Documents/com~apple~CloudDocs/婼瑄/卡若AI"
  "$HOME/Documents/个人/卡若AI"
)

KAI=""
for p in "${KAI_PATHS[@]}"; do
  if [[ -d "$p" ]]; then
    KAI="$p"
    break
  fi
done

if [[ -z "$KAI" ]]; then
  echo "❌ 未找到卡若AI目录"
  exit 1
fi

echo "✅ 卡若AI路径: $KAI"
cd "$KAI"

# 检查核心文件
echo ""
echo "【核心文件检查】"
for f in "BOOTSTRAP.md" "SKILL_REGISTRY.md" ".cursor/rules/karuo-ai.mdc"; do
  [[ -f "$f" ]] && echo "  ✅ $f" || echo "  ❌ $f"
done

# 检查 Skills
echo ""
echo "【Agent Skills】"
if [[ -d ".cursor/skills" ]]; then
  COUNT=$(find .cursor/skills -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
  echo "  ✅ 找到 $COUNT 个 Skills"
  find .cursor/skills -name "SKILL.md" 2>/dev/null | while read f; do
    echo "    - $(dirname "$f" | sed "s|.cursor/skills/||")"
  done
else
  echo "  ❌ .cursor/skills 不存在"
fi

# 检查飞书功能
echo ""
echo "【飞书功能】"
FEISHU_SKILLS=(
  "02_卡人（水）/水桥_平台对接/飞书管理/SKILL.md"
  "02_卡人（水）/水桥_平台对接/飞书管理/运营报表_SKILL.md"
)
for f in "${FEISHU_SKILLS[@]}"; do
  [[ -f "$f" ]] && echo "  ✅ $(basename "$f")" || echo "  ⚠️  $f"
done

# Python环境
echo ""
echo "【Python环境】"
if command -v python3 &>/dev/null; then
  echo "  ✅ $(python3 --version 2>&1)"
  for mod in "requests" "openpyxl"; do
    python3 -c "import $mod" 2>/dev/null && echo "    ✅ $mod" || echo "    ⚠️  $mod"
  done
else
  echo "  ❌ Python3 未安装"
fi

# Cursor
echo ""
echo "【Cursor IDE】"
if [[ -d "/Applications/Cursor.app" ]] || command -v cursor &>/dev/null; then
  echo "  ✅ Cursor 已安装"
else
  echo "  ⚠️  Cursor 未检测到"
fi

# 模型检测
echo ""
echo "【Cursor 模型配置】"
CONFIG="$HOME/.cursor/User/settings.json"
if [[ -f "$CONFIG" ]]; then
  if grep -q "cursor.general.model" "$CONFIG" 2>/dev/null; then
    MODEL=$(grep "cursor.general.model" "$CONFIG" | head -1 | sed '\''s/.*"cursor.general.model"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/'\'' || echo "默认")
    echo "  模型: $MODEL"
  else
    echo "  模型: Cursor 默认（Claude Sonnet 或 GPT-4）"
  fi
else
  echo "  模型: 使用 Cursor 默认设置"
fi

# 测试文件写入
echo ""
echo "【自主对话测试】"
TEST_FILE="$KAI/_test_remote_$(date +%Y%m%d_%H%M%S).txt"
echo "测试消息" > "$TEST_FILE" 2>/dev/null && echo "  ✅ 文件写入正常" && rm -f "$TEST_FILE" || echo "  ⚠️  文件写入可能受限"

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
REMOTE_EOF'

echo "正在通过 SSH 在阿猫 Mac 上执行测试..."
ssh -o ConnectTimeout=25 -o ServerAliveInterval=10 -p "$SSH_PORT" "$SSH_HOST" "$REMOTE_SCRIPT" 2>&1 || {
  echo ""
  echo "❌ SSH 连接失败，请使用本地测试脚本："
  echo "   在阿猫 Mac 上执行："
  echo "   bash '$HOME/Library/Mobile Documents/com~apple~CloudDocs/Documents/婼瑄/卡若AI/_Soul运营技能包导出/test_karuo_ai_on_amiao.sh'"
  echo "   或通过 iCloud 同步后运行"
}
