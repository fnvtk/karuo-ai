#!/bin/bash
# ============================================================
# 手机与网页流量自动操作 - 环境检查脚本
# 用法：bash check_env.sh [--auto-start]
# 功能：检查 ADB、设备、Python、虚拟环境、Docker 等
# 参数：--auto-start  如果无设备但有模拟器配置，自动启动模拟器
# ============================================================

# 不使用 set -e，避免检查失败时中断
# set -e

AUTO_START=false
if [ "$1" = "--auto-start" ]; then
    AUTO_START=true
fi

echo "============================================================"
echo "🔍 手机与网页流量自动操作 - 环境检查"
echo "============================================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
WARN=0

check_pass() {
    echo -e "  ${GREEN}✅ $1${NC}"
    ((PASSED++))
}

check_fail() {
    echo -e "  ${RED}❌ $1${NC}"
    ((FAILED++))
}

check_warn() {
    echo -e "  ${YELLOW}⚠️  $1${NC}"
    ((WARN++))
}

# -----------------------------------------------------------
echo "📦 1. 基础工具检查"
echo "-----------------------------------------------------------"

# ADB
if command -v adb &> /dev/null; then
    ADB_VERSION=$(adb version 2>/dev/null | head -1)
    check_pass "ADB 已安装：$ADB_VERSION"
else
    check_fail "ADB 未安装 → brew install android-platform-tools"
fi

# Python
if command -v python3 &> /dev/null; then
    PY_VERSION=$(python3 --version 2>&1)
    check_pass "Python 已安装：$PY_VERSION"
else
    check_fail "Python3 未安装"
fi

# Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version 2>/dev/null)
    check_pass "Docker 已安装：$DOCKER_VERSION"
else
    check_warn "Docker 未安装（可选，用于隔离环境）"
fi

echo ""

# -----------------------------------------------------------
echo "📱 2. 设备/模拟器检查"
echo "-----------------------------------------------------------"

if command -v adb &> /dev/null; then
    DEVICES=$(adb devices 2>/dev/null | grep -v "List of devices" | grep -v "^$" | wc -l | tr -d ' ')
    if [ "$DEVICES" -gt 0 ]; then
        check_pass "已连接 $DEVICES 个设备："
        adb devices | grep -v "List of devices" | grep -v "^$" | while read line; do
            echo "       $line"
        done
    else
        check_warn "无已连接设备"
        
        # 检查是否有本地模拟器配置
        EMULATOR_PATH="/usr/local/share/android-commandlinetools/emulator/emulator"
        if [ -f "$EMULATOR_PATH" ]; then
            AVDS=$("$EMULATOR_PATH" -list-avds 2>/dev/null)
            if [ -n "$AVDS" ]; then
                check_pass "发现本地模拟器配置："
                echo "$AVDS" | while read avd; do
                    echo "       - $avd"
                done
                
                if [ "$AUTO_START" = true ]; then
                    FIRST_AVD=$(echo "$AVDS" | head -1)
                    echo ""
                    echo "🚀 自动启动模拟器：$FIRST_AVD"
                    "$EMULATOR_PATH" -avd "$FIRST_AVD" -no-snapshot-load &
                    echo "   等待模拟器启动（约15秒）..."
                    sleep 15
                    NEW_DEVICES=$(adb devices 2>/dev/null | grep -v "List of devices" | grep "device" | wc -l | tr -d ' ')
                    if [ "$NEW_DEVICES" -gt 0 ]; then
                        check_pass "模拟器已启动并连接"
                    else
                        check_warn "模拟器启动中，请稍后重试 adb devices"
                    fi
                else
                    echo ""
                    echo "   💡 提示：使用 --auto-start 参数可自动启动模拟器"
                    echo "      bash check_env.sh --auto-start"
                fi
            fi
        else
            echo "   → 连接手机或安装 Android 模拟器"
        fi
    fi
else
    check_fail "ADB 不可用，无法检测设备"
fi

echo ""

# -----------------------------------------------------------
echo "🐍 3. Open-AutoGLM 虚拟环境检查"
echo "-----------------------------------------------------------"

AUTOGLM_PATH="/Users/karuo/Documents/开发/4、小工具/手机自动操作AUTOGLM/Open-AutoGLM"

if [ -d "$AUTOGLM_PATH/.venv" ]; then
    check_pass "虚拟环境存在：$AUTOGLM_PATH/.venv"
    
    # 检查 phone_agent 是否安装
    if "$AUTOGLM_PATH/.venv/bin/python" -c "import phone_agent" 2>/dev/null; then
        check_pass "phone_agent 模块已安装"
    else
        check_warn "phone_agent 未安装 → cd $AUTOGLM_PATH && source .venv/bin/activate && pip install -e ."
    fi
else
    check_warn "虚拟环境不存在 → 创建命令："
    echo "       cd $AUTOGLM_PATH"
    echo "       python3 -m venv .venv"
    echo "       source .venv/bin/activate"
    echo "       pip install -r requirements.txt && pip install -e ."
fi

echo ""

# -----------------------------------------------------------
echo "🌐 4. 模型服务检查（可选）"
echo "-----------------------------------------------------------"

MODEL_URL="${MODEL_URL:-http://localhost:8000/v1}"
if curl -s --connect-timeout 3 "$MODEL_URL/models" > /dev/null 2>&1; then
    check_pass "模型服务可访问：$MODEL_URL"
else
    check_warn "模型服务不可访问：$MODEL_URL（如需使用手机自动操作，需启动 vLLM）"
fi

echo ""

# -----------------------------------------------------------
echo "============================================================"
echo "📊 检查结果汇总"
echo "============================================================"
echo -e "  ${GREEN}✅ 通过：$PASSED${NC}"
echo -e "  ${YELLOW}⚠️  警告：$WARN${NC}"
echo -e "  ${RED}❌ 失败：$FAILED${NC}"
echo ""

if [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}请先修复失败项再执行 Skill${NC}"
    exit 1
elif [ "$WARN" -gt 0 ]; then
    echo -e "${YELLOW}部分功能可能受限，建议处理警告项${NC}"
    exit 0
else
    echo -e "${GREEN}环境检查全部通过！可以执行 Skill${NC}"
    exit 0
fi
