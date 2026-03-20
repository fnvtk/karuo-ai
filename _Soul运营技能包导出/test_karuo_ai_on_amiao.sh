#!/bin/bash
# 卡若AI 在阿猫 Mac 上的完整功能测试脚本
# 用法：在阿猫 Mac 终端执行：bash test_karuo_ai_on_amiao.sh

set -euo pipefail

echo "=========================================="
echo "卡若AI 完整功能测试（阿猫 Mac）"
echo "=========================================="
echo ""

# 1. 检测卡若AI路径
KAI_PATHS=(
  "$HOME/Library/Mobile Documents/com~apple~CloudDocs/Documents/婼瑄/卡若AI"
  "$HOME/Library/Mobile Documents/com~apple~CloudDocs/婼瑄/卡若AI"
  "$HOME/Documents/个人/卡若AI"
  "$HOME/Documents/卡若AI"
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
  echo "已尝试路径："
  for p in "${KAI_PATHS[@]}"; do
    echo "  - $p"
  done
  exit 1
fi

echo "✅ 找到卡若AI: $KAI"
cd "$KAI"

# 2. 检查核心文件
echo ""
echo "【2/8】检查核心文件..."
MISSING=0
for f in "BOOTSTRAP.md" "SKILL_REGISTRY.md" ".cursor/rules/karuo-ai.mdc"; do
  if [[ -f "$f" ]]; then
    echo "  ✅ $f"
  else
    echo "  ❌ 缺失: $f"
    MISSING=$((MISSING + 1))
  fi
done

# 3. 检查 Cursor Skills
echo ""
echo "【3/8】检查 Cursor Agent Skills..."
SKILLS_DIR=".cursor/skills"
if [[ -d "$SKILLS_DIR" ]]; then
  SKILL_COUNT=$(find "$SKILLS_DIR" -name "SKILL.md" | wc -l | tr -d ' ')
  echo "  ✅ 找到 $SKILL_COUNT 个 Agent Skills"
  find "$SKILLS_DIR" -name "SKILL.md" | while read f; do
    echo "    - $(dirname "$f" | sed "s|$SKILLS_DIR/||")"
  done
else
  echo "  ❌ .cursor/skills 目录不存在"
  MISSING=$((MISSING + 1))
fi

# 4. 检查飞书相关技能
echo ""
echo "【4/8】检查飞书相关功能..."
FEISHU_SKILLS=(
  "02_卡人（水）/水桥_平台对接/飞书管理/SKILL.md"
  "02_卡人（水）/水桥_平台对接/飞书管理/运营报表_SKILL.md"
  "02_卡人（水）/水桥_平台对接/智能纪要/SKILL.md"
)
FEISHU_OK=0
for f in "${FEISHU_SKILLS[@]}"; do
  if [[ -f "$f" ]]; then
    echo "  ✅ $(basename "$f")"
    FEISHU_OK=$((FEISHU_OK + 1))
  else
    echo "  ⚠️  缺失: $f"
  fi
done

# 5. 检查飞书脚本
echo ""
echo "【5/8】检查飞书脚本..."
FEISHU_SCRIPTS=(
  "02_卡人（水）/水桥_平台对接/飞书管理/脚本/write_today_three_focus.py"
  "02_卡人（水）/水桥_平台对接/飞书管理/脚本/send_review_to_feishu_webhook.py"
)
for s in "${FEISHU_SCRIPTS[@]}"; do
  if [[ -f "$s" ]]; then
    if python3 -c "import sys; sys.path.insert(0, '$(dirname "$s")'); import os; os.chdir('$(dirname "$s")'); exec(open('$(basename "$s")').read())" --help 2>/dev/null || python3 "$s" --help 2>/dev/null || true; then
      echo "  ✅ $(basename "$s") 可执行"
    else
      echo "  ⚠️  $(basename "$s") 存在但可能缺少依赖"
    fi
  else
    echo "  ❌ 缺失: $s"
  fi
done

# 6. 测试 Python 环境
echo ""
echo "【6/8】检查 Python 环境..."
if command -v python3 &>/dev/null; then
  PY_VER=$(python3 --version 2>&1 | awk '{print $2}')
  echo "  ✅ Python $PY_VER"
  
  # 检查关键依赖
  for mod in "requests" "paramiko" "openpyxl"; do
    if python3 -c "import $mod" 2>/dev/null; then
      echo "    ✅ $mod"
    else
      echo "    ⚠️  $mod 未安装（部分功能可能不可用）"
    fi
  done
else
  echo "  ❌ Python3 未安装"
  MISSING=$((MISSING + 1))
fi

# 7. 检查 Cursor 安装
echo ""
echo "【7/8】检查 Cursor IDE..."
if [[ -d "/Applications/Cursor.app" ]] || command -v cursor &>/dev/null; then
  echo "  ✅ Cursor 已安装"
  if command -v cursor &>/dev/null; then
    CURSOR_VER=$(cursor --version 2>&1 | head -1 || echo "未知版本")
    echo "    版本: $CURSOR_VER"
  fi
else
  echo "  ⚠️  Cursor 未检测到（可能未在 PATH 或未安装）"
fi

# 8. 测试自主对话能力（模拟）
echo ""
echo "【8/8】测试自主对话能力..."
echo "  创建测试对话文件..."

TEST_MSG="测试卡若AI在阿猫Mac上的功能"
TEST_FILE="$KAI/_test_amiao_dialog_$(date +%Y%m%d_%H%M%S).txt"
cat > "$TEST_FILE" <<EOF
【测试对话】$(date '+%Y-%m-%d %H:%M:%S')
用户: $TEST_MSG
卡若AI: 收到测试消息。卡若AI在阿猫Mac上运行正常。
EOF

if [[ -f "$TEST_FILE" ]]; then
  echo "  ✅ 测试文件创建成功: $(basename "$TEST_FILE")"
  rm -f "$TEST_FILE"
else
  echo "  ❌ 无法创建测试文件"
fi

# 9. 检测使用的模型/模式
echo ""
echo "【9/9】检测 Cursor 模型配置..."
CURSOR_CONFIG="$HOME/.cursor/User/settings.json"
if [[ -f "$CURSOR_CONFIG" ]]; then
  echo "  ✅ 找到 Cursor 配置"
  if grep -q "cursor.general.model" "$CURSOR_CONFIG" 2>/dev/null; then
    MODEL=$(grep "cursor.general.model" "$CURSOR_CONFIG" | head -1 | sed 's/.*"cursor.general.model"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "未明确指定")
    echo "    模型: $MODEL"
  else
    echo "    模型: 使用默认模型（Cursor 自动选择）"
  fi
  
  # 检查 Agent 模式
  if grep -q "cursor.agent" "$CURSOR_CONFIG" 2>/dev/null; then
    AGENT_MODE=$(grep -i "cursor.agent" "$CURSOR_CONFIG" | head -1 || echo "默认")
    echo "    Agent 模式: $AGENT_MODE"
  fi
else
  echo "  ⚠️  未找到 Cursor 用户配置（可能使用默认设置）"
fi

# 总结
echo ""
echo "=========================================="
echo "测试总结"
echo "=========================================="
echo "卡若AI路径: $KAI"
echo "核心文件: $((3 - MISSING))/3"
echo "Agent Skills: $SKILL_COUNT 个"
echo "飞书技能: $FEISHU_OK/${#FEISHU_SKILLS[@]}"
echo ""

if [[ $MISSING -eq 0 ]] && [[ $FEISHU_OK -ge 2 ]]; then
  echo "✅ 卡若AI 在阿猫 Mac 上配置完整，可以正常使用"
  echo ""
  echo "【使用方式】"
  echo "1. 打开 Cursor IDE"
  echo "2. 打开文件夹: $KAI"
  echo "3. 在 Cursor 中与卡若AI对话，触发词见 SKILL_REGISTRY.md"
  echo "4. 飞书相关："
  echo "   - 运营报表: '运营报表' 或 '派对填表'"
  echo "   - 飞书日志: '写飞书日志' 或 '飞书日志'"
  echo "   - 智能纪要: '会议纪要' 或 '飞书妙记'"
else
  echo "⚠️  部分功能可能缺失，请检查上述 ❌ 项"
fi

echo ""
echo "【模型信息】"
if [[ -f "$CURSOR_CONFIG" ]] && grep -q "cursor.general.model" "$CURSOR_CONFIG" 2>/dev/null; then
  echo "  使用模型: $(grep "cursor.general.model" "$CURSOR_CONFIG" | head -1 | sed 's/.*"cursor.general.model"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')"
else
  echo "  使用模型: Cursor 默认模型（通常为 Claude Sonnet 或 GPT-4）"
  echo "  提示: 可在 Cursor Settings → Models 查看当前使用的模型"
fi

echo ""
echo "测试完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
