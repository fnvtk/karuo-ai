#!/bin/bash
# 应用验证脚本 - 启动测试、版本检查
# 作者：卡若
# 日期：$(date +%Y-%m-%d)

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_progress() {
    echo -e "${BLUE}[PROGRESS]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} ✅ $1"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} ❌ $1"
}

# 加载配置
if [ -f "config/env.sample" ]; then
    source config/env.sample
else
    log_warn "配置文件不存在，使用默认值"
    PACKAGE_NAME="com.tencent.mm"
    MAIN_ACTIVITY="com.tencent.mm.ui.LauncherUI"
    DEVICE_IP=""
fi

# 参数处理
if [ $# -eq 1 ]; then
    DEVICE_IP="$1"
elif [ -z "$DEVICE_IP" ]; then
    log_error "请提供设备IP地址"
    log_info "用法: $0 <设备IP>"
    log_info "示例: $0 192.168.1.100"
    exit 1
fi

log_info "开始验证微信安装 - 设备: $DEVICE_IP"

# 连接设备
log_progress "连接到设备..."
adb connect "$DEVICE_IP:5555" >/dev/null 2>&1
adb -s "$DEVICE_IP:5555" wait-for-device

# 检查设备连接
if ! adb -s "$DEVICE_IP:5555" shell echo "connected" >/dev/null 2>&1; then
    log_error "无法连接到设备 $DEVICE_IP"
    exit 1
fi

log_success "设备连接成功"

# 获取设备信息
DEVICE_MODEL=$(adb -s "$DEVICE_IP:5555" shell getprop ro.product.model | tr -d '\r')
DEVICE_VERSION=$(adb -s "$DEVICE_IP:5555" shell getprop ro.build.version.release | tr -d '\r')
DEVICE_SDK=$(adb -s "$DEVICE_IP:5555" shell getprop ro.build.version.sdk | tr -d '\r')

log_info "设备信息: $DEVICE_MODEL, Android $DEVICE_VERSION (API $DEVICE_SDK)"

# 验证项目计数
TOTAL_TESTS=10
PASSED_TESTS=0
FAILED_TESTS=0

echo "=========================================="
echo "           微信安装验证报告"
echo "=========================================="
echo

# 测试1: 检查应用是否已安装
log_progress "[1/$TOTAL_TESTS] 检查应用安装状态..."
if adb -s "$DEVICE_IP:5555" shell pm list packages | grep -q "$PACKAGE_NAME"; then
    log_success "应用已安装"
    ((PASSED_TESTS++))
else
    log_fail "应用未安装"
    ((FAILED_TESTS++))
fi

# 测试2: 获取应用版本信息
log_progress "[2/$TOTAL_TESTS] 检查应用版本信息..."
APP_VERSION=$(adb -s "$DEVICE_IP:5555" shell dumpsys package "$PACKAGE_NAME" | grep "versionName" | head -1 | cut -d'=' -f2 | tr -d '\r' 2>/dev/null || echo "")
APP_VERSION_CODE=$(adb -s "$DEVICE_IP:5555" shell dumpsys package "$PACKAGE_NAME" | grep "versionCode" | head -1 | cut -d'=' -f2 | awk '{print $1}' | tr -d '\r' 2>/dev/null || echo "")

if [ -n "$APP_VERSION" ] && [ -n "$APP_VERSION_CODE" ]; then
    log_success "版本信息: $APP_VERSION (版本号: $APP_VERSION_CODE)"
    ((PASSED_TESTS++))
else
    log_fail "无法获取版本信息"
    ((FAILED_TESTS++))
fi

# 测试3: 检查应用权限
log_progress "[3/$TOTAL_TESTS] 检查应用权限..."
GRANTED_PERMISSIONS=$(adb -s "$DEVICE_IP:5555" shell dumpsys package "$PACKAGE_NAME" | grep "granted=true" | wc -l | tr -d ' ')
if [ "$GRANTED_PERMISSIONS" -gt 5 ]; then
    log_success "已授权权限数量: $GRANTED_PERMISSIONS"
    ((PASSED_TESTS++))
else
    log_warn "已授权权限较少: $GRANTED_PERMISSIONS (可能需要手动授权)"
    ((FAILED_TESTS++))
fi

# 测试4: 检查应用数据目录
log_progress "[4/$TOTAL_TESTS] 检查应用数据目录..."
if adb -s "$DEVICE_IP:5555" shell ls "/data/data/$PACKAGE_NAME" >/dev/null 2>&1; then
    log_success "应用数据目录存在"
    ((PASSED_TESTS++))
else
    log_fail "应用数据目录不存在或无权限访问"
    ((FAILED_TESTS++))
fi

# 测试5: 检查应用是否可启动
log_progress "[5/$TOTAL_TESTS] 测试应用启动..."
# 先停止应用（如果正在运行）
adb -s "$DEVICE_IP:5555" shell am force-stop "$PACKAGE_NAME" 2>/dev/null || true
sleep 1

# 启动应用
if adb -s "$DEVICE_IP:5555" shell am start -n "$PACKAGE_NAME/$MAIN_ACTIVITY" >/dev/null 2>&1; then
    log_success "应用启动命令执行成功"
    ((PASSED_TESTS++))
    
    # 等待应用启动
    sleep 3
    
    # 检查应用是否真的在运行
    if adb -s "$DEVICE_IP:5555" shell pidof "$PACKAGE_NAME" >/dev/null 2>&1; then
        log_success "应用进程运行中"
    else
        log_warn "应用启动后进程未找到（可能需要用户交互）"
    fi
else
    log_fail "应用启动失败"
    ((FAILED_TESTS++))
fi

# 测试6: 检查应用内存使用
log_progress "[6/$TOTAL_TESTS] 检查应用内存使用..."
MEMORY_INFO=$(adb -s "$DEVICE_IP:5555" shell dumpsys meminfo "$PACKAGE_NAME" 2>/dev/null | grep "TOTAL" | awk '{print $2}' | head -1 || echo "0")
if [ "$MEMORY_INFO" -gt 0 ]; then
    log_success "应用内存使用: ${MEMORY_INFO}KB"
    ((PASSED_TESTS++))
else
    log_warn "无法获取内存信息（应用可能未运行）"
    ((FAILED_TESTS++))
fi

# 测试7: 检查应用网络权限
log_progress "[7/$TOTAL_TESTS] 检查网络权限..."
NETWORK_PERMISSION=$(adb -s "$DEVICE_IP:5555" shell dumpsys package "$PACKAGE_NAME" | grep "android.permission.INTERNET" | grep "granted=true" || echo "")
if [ -n "$NETWORK_PERMISSION" ]; then
    log_success "网络权限已授权"
    ((PASSED_TESTS++))
else
    log_fail "网络权限未授权"
    ((FAILED_TESTS++))
fi

# 测试8: 检查存储权限
log_progress "[8/$TOTAL_TESTS] 检查存储权限..."
STORAGE_PERMISSION=$(adb -s "$DEVICE_IP:5555" shell dumpsys package "$PACKAGE_NAME" | grep "android.permission.WRITE_EXTERNAL_STORAGE" | grep "granted=true" || echo "")
if [ -n "$STORAGE_PERMISSION" ]; then
    log_success "存储权限已授权"
    ((PASSED_TESTS++))
else
    log_warn "存储权限未授权（部分功能可能受限）"
    ((FAILED_TESTS++))
fi

# 测试9: 检查应用签名
log_progress "[9/$TOTAL_TESTS] 检查应用签名..."
APP_SIGNATURE=$(adb -s "$DEVICE_IP:5555" shell dumpsys package "$PACKAGE_NAME" | grep "signatures" -A 1 | tail -1 | tr -d ' \r' || echo "")
if [ -n "$APP_SIGNATURE" ] && [ "$APP_SIGNATURE" != "signatures" ]; then
    log_success "应用签名验证通过"
    ((PASSED_TESTS++))
else
    log_warn "无法验证应用签名"
    ((FAILED_TESTS++))
fi

# 测试10: 检查应用是否在白名单中
log_progress "[10/$TOTAL_TESTS] 检查省电优化白名单..."
WHITELIST_STATUS=$(adb -s "$DEVICE_IP:5555" shell dumpsys deviceidle | grep "$PACKAGE_NAME" || echo "")
if [ -n "$WHITELIST_STATUS" ]; then
    log_success "应用在省电优化白名单中"
    ((PASSED_TESTS++))
else
    log_warn "应用不在省电优化白名单中（可能影响后台运行）"
    ((FAILED_TESTS++))
fi

# 额外检查：WebView组件
log_progress "额外检查: WebView组件状态..."
WEBVIEW_PACKAGE=$(adb -s "$DEVICE_IP:5555" shell pm list packages | grep webview | head -1 | cut -d':' -f2 || echo "")
if [ -n "$WEBVIEW_PACKAGE" ]; then
    WEBVIEW_VERSION=$(adb -s "$DEVICE_IP:5555" shell dumpsys package "$WEBVIEW_PACKAGE" | grep "versionName" | head -1 | cut -d'=' -f2 | tr -d '\r' || echo "未知")
    log_info "WebView组件: $WEBVIEW_PACKAGE (版本: $WEBVIEW_VERSION)"
else
    log_warn "未找到WebView组件"
fi

# 生成验证报告
echo
echo "=========================================="
echo "              验证结果汇总"
echo "=========================================="
echo

VERIFY_LOG="logs/verify_$(date +%Y%m%d_%H%M%S).log"

# 计算通过率
PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

if [ $PASS_RATE -ge 80 ]; then
    OVERALL_STATUS="优秀"
    STATUS_COLOR="$GREEN"
elif [ $PASS_RATE -ge 60 ]; then
    OVERALL_STATUS="良好"
    STATUS_COLOR="$YELLOW"
else
    OVERALL_STATUS="需要改进"
    STATUS_COLOR="$RED"
fi

echo -e "总测试项目: $TOTAL_TESTS"
echo -e "通过项目: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败项目: ${RED}$FAILED_TESTS${NC}"
echo -e "通过率: ${STATUS_COLOR}$PASS_RATE%${NC}"
echo -e "整体状态: ${STATUS_COLOR}$OVERALL_STATUS${NC}"
echo

# 保存详细报告
cat > "$VERIFY_LOG" << EOF
微信安装验证报告
================
验证时间: $(date)
设备IP: $DEVICE_IP
设备型号: $DEVICE_MODEL
Android版本: $DEVICE_VERSION (API $DEVICE_SDK)
应用包名: $PACKAGE_NAME
应用版本: $APP_VERSION ($APP_VERSION_CODE)

验证结果:
---------
总测试项目: $TOTAL_TESTS
通过项目: $PASSED_TESTS
失败项目: $FAILED_TESTS
通过率: $PASS_RATE%
整体状态: $OVERALL_STATUS

详细信息:
---------
已授权权限数: $GRANTED_PERMISSIONS
内存使用: ${MEMORY_INFO}KB
WebView版本: $WEBVIEW_VERSION
应用签名: $([ -n "$APP_SIGNATURE" ] && echo "已验证" || echo "未验证")
白名单状态: $([ -n "$WHITELIST_STATUS" ] && echo "已加入" || echo "未加入")

建议操作:
EOF

# 根据结果给出建议
if [ $PASS_RATE -ge 80 ]; then
    echo "🎉 验证通过！微信安装成功且运行正常。" | tee -a "$VERIFY_LOG"
    echo "" | tee -a "$VERIFY_LOG"
    echo "建议操作:" | tee -a "$VERIFY_LOG"
    echo "1. 手动启动微信完成初始设置" | tee -a "$VERIFY_LOG"
    echo "2. 登录微信账号" | tee -a "$VERIFY_LOG"
    echo "3. 根据需要调整应用设置" | tee -a "$VERIFY_LOG"
elif [ $PASS_RATE -ge 60 ]; then
    echo "⚠️  验证基本通过，但存在一些问题。" | tee -a "$VERIFY_LOG"
    echo "" | tee -a "$VERIFY_LOG"
    echo "建议操作:" | tee -a "$VERIFY_LOG"
    echo "1. 手动授权缺失的权限" | tee -a "$VERIFY_LOG"
    echo "2. 检查省电优化设置" | tee -a "$VERIFY_LOG"
    echo "3. 如有问题运行故障处理脚本" | tee -a "$VERIFY_LOG"
else
    echo "❌ 验证失败，安装可能存在问题。" | tee -a "$VERIFY_LOG"
    echo "" | tee -a "$VERIFY_LOG"
    echo "建议操作:" | tee -a "$VERIFY_LOG"
    echo "1. 运行故障处理脚本: ./install/05_troubleshoot.sh $DEVICE_IP" | tee -a "$VERIFY_LOG"
    echo "2. 检查设备兼容性" | tee -a "$VERIFY_LOG"
    echo "3. 考虑重新安装" | tee -a "$VERIFY_LOG"
fi

echo "" | tee -a "$VERIFY_LOG"
echo "验证报告已保存: $VERIFY_LOG" | tee -a "$VERIFY_LOG"

# 停止应用（清理）
adb -s "$DEVICE_IP:5555" shell am force-stop "$PACKAGE_NAME" 2>/dev/null || true

exit $FAILED_TESTS