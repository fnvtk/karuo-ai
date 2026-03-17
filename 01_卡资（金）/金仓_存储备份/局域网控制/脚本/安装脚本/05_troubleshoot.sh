#!/bin/bash
# 故障处理脚本 - 日志抓取、WebView修复、降级处理
# 作者：卡若
# 日期：$(date +%Y-%m-%d)

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_debug() {
    echo -e "${PURPLE}[DEBUG]${NC} $1"
}

log_fix() {
    echo -e "${GREEN}[FIX]${NC} 🔧 $1"
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
    log_info "用法: $0 <设备IP> [选项]"
    log_info "选项:"
    log_info "  --logs-only    仅收集日志"
    log_info "  --fix-webview  修复WebView问题"
    log_info "  --reset-app    重置应用数据"
    log_info "  --downgrade    降级处理"
    exit 1
fi

# 选项处理
LOGS_ONLY=false
FIX_WEBVIEW=false
RESET_APP=false
DOWNGRADE=false

for arg in "$@"; do
    case $arg in
        --logs-only)
            LOGS_ONLY=true
            ;;
        --fix-webview)
            FIX_WEBVIEW=true
            ;;
        --reset-app)
            RESET_APP=true
            ;;
        --downgrade)
            DOWNGRADE=true
            ;;
    esac
done

log_info "开始故障诊断和修复 - 设备: $DEVICE_IP"

# 连接设备
log_progress "连接到设备..."
adb connect "$DEVICE_IP:5555" >/dev/null 2>&1
adb -s "$DEVICE_IP:5555" wait-for-device

if ! adb -s "$DEVICE_IP:5555" shell echo "connected" >/dev/null 2>&1; then
    log_error "无法连接到设备 $DEVICE_IP"
    exit 1
fi

log_info "设备连接成功"

# 创建故障日志目录
TROUBLE_LOG_DIR="logs/troubleshoot_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$TROUBLE_LOG_DIR"

log_info "故障日志目录: $TROUBLE_LOG_DIR"

# 获取设备基本信息
log_progress "收集设备信息..."
DEVICE_MODEL=$(adb -s "$DEVICE_IP:5555" shell getprop ro.product.model | tr -d '\r')
DEVICE_VERSION=$(adb -s "$DEVICE_IP:5555" shell getprop ro.build.version.release | tr -d '\r')
DEVICE_SDK=$(adb -s "$DEVICE_IP:5555" shell getprop ro.build.version.sdk | tr -d '\r')
DEVICE_BRAND=$(adb -s "$DEVICE_IP:5555" shell getprop ro.product.brand | tr -d '\r')
DEVICE_MANUFACTURER=$(adb -s "$DEVICE_IP:5555" shell getprop ro.product.manufacturer | tr -d '\r')

# 保存设备信息
cat > "$TROUBLE_LOG_DIR/device_info.txt" << EOF
设备信息收集时间: $(date)
设备IP: $DEVICE_IP
设备型号: $DEVICE_MODEL
设备品牌: $DEVICE_BRAND
制造商: $DEVICE_MANUFACTURER
Android版本: $DEVICE_VERSION
API级别: $DEVICE_SDK
EOF

log_info "设备信息: $DEVICE_BRAND $DEVICE_MODEL, Android $DEVICE_VERSION"

# 1. 收集应用日志
log_progress "收集应用相关日志..."

# 系统日志
log_debug "收集系统日志..."
adb -s "$DEVICE_IP:5555" logcat -d > "$TROUBLE_LOG_DIR/system_logcat.txt" 2>/dev/null || {
    log_warn "无法收集系统日志"
}

# 微信相关日志
log_debug "收集微信相关日志..."
adb -s "$DEVICE_IP:5555" logcat -d | grep -i "$PACKAGE_NAME" > "$TROUBLE_LOG_DIR/wechat_logcat.txt" 2>/dev/null || {
    log_warn "未找到微信相关日志"
}

# 崩溃日志
log_debug "收集崩溃日志..."
adb -s "$DEVICE_IP:5555" logcat -d | grep -i "crash\|exception\|error" > "$TROUBLE_LOG_DIR/crash_logs.txt" 2>/dev/null || {
    log_warn "未找到崩溃日志"
}

# ANR日志
log_debug "收集ANR日志..."
adb -s "$DEVICE_IP:5555" shell ls /data/anr/ 2>/dev/null | while read anr_file; do
    if [ -n "$anr_file" ]; then
        adb -s "$DEVICE_IP:5555" shell cat "/data/anr/$anr_file" > "$TROUBLE_LOG_DIR/anr_$anr_file" 2>/dev/null || true
    fi
done

# 2. 应用状态诊断
log_progress "诊断应用状态..."

# 检查应用是否安装
if adb -s "$DEVICE_IP:5555" shell pm list packages | grep -q "$PACKAGE_NAME"; then
    log_info "✅ 应用已安装"
    
    # 获取应用详细信息
    APP_VERSION=$(adb -s "$DEVICE_IP:5555" shell dumpsys package "$PACKAGE_NAME" | grep "versionName" | head -1 | cut -d'=' -f2 | tr -d '\r' || echo "未知")
    APP_VERSION_CODE=$(adb -s "$DEVICE_IP:5555" shell dumpsys package "$PACKAGE_NAME" | grep "versionCode" | head -1 | cut -d'=' -f2 | awk '{print $1}' | tr -d '\r' || echo "未知")
    
    log_info "应用版本: $APP_VERSION ($APP_VERSION_CODE)"
    
    # 保存应用信息
    adb -s "$DEVICE_IP:5555" shell dumpsys package "$PACKAGE_NAME" > "$TROUBLE_LOG_DIR/app_package_info.txt" 2>/dev/null
else
    log_error "❌ 应用未安装"
    echo "应用未安装" > "$TROUBLE_LOG_DIR/app_status.txt"
fi

# 检查应用进程
if adb -s "$DEVICE_IP:5555" shell pidof "$PACKAGE_NAME" >/dev/null 2>&1; then
    APP_PID=$(adb -s "$DEVICE_IP:5555" shell pidof "$PACKAGE_NAME" | tr -d '\r')
    log_info "应用进程ID: $APP_PID"
    
    # 获取进程内存信息
    adb -s "$DEVICE_IP:5555" shell dumpsys meminfo "$PACKAGE_NAME" > "$TROUBLE_LOG_DIR/app_meminfo.txt" 2>/dev/null
else
    log_warn "应用进程未运行"
fi

# 3. WebView诊断
log_progress "诊断WebView状态..."

# 查找WebView包
WEBVIEW_PACKAGES=$(adb -s "$DEVICE_IP:5555" shell pm list packages | grep webview | cut -d':' -f2)
if [ -n "$WEBVIEW_PACKAGES" ]; then
    echo "WebView包列表:" > "$TROUBLE_LOG_DIR/webview_info.txt"
    for pkg in $WEBVIEW_PACKAGES; do
        WEBVIEW_VERSION=$(adb -s "$DEVICE_IP:5555" shell dumpsys package "$pkg" | grep "versionName" | head -1 | cut -d'=' -f2 | tr -d '\r' || echo "未知")
        log_info "WebView包: $pkg (版本: $WEBVIEW_VERSION)"
        echo "$pkg: $WEBVIEW_VERSION" >> "$TROUBLE_LOG_DIR/webview_info.txt"
    done
else
    log_warn "未找到WebView包"
    echo "未找到WebView包" > "$TROUBLE_LOG_DIR/webview_info.txt"
fi

# 4. 权限诊断
log_progress "诊断权限状态..."
if adb -s "$DEVICE_IP:5555" shell pm list packages | grep -q "$PACKAGE_NAME"; then
    # 获取权限信息
    adb -s "$DEVICE_IP:5555" shell dumpsys package "$PACKAGE_NAME" | grep -A 1000 "requested permissions:" | grep -B 1000 "install permissions:" > "$TROUBLE_LOG_DIR/app_permissions.txt" 2>/dev/null
    
    # 统计权限
    GRANTED_COUNT=$(grep "granted=true" "$TROUBLE_LOG_DIR/app_permissions.txt" | wc -l | tr -d ' ')
    DENIED_COUNT=$(grep "granted=false" "$TROUBLE_LOG_DIR/app_permissions.txt" | wc -l | tr -d ' ')
    
    log_info "权限统计: 已授权 $GRANTED_COUNT, 被拒绝 $DENIED_COUNT"
fi

# 5. 存储空间诊断
log_progress "检查存储空间..."
AVAILABLE_SPACE=$(adb -s "$DEVICE_IP:5555" shell df /data | tail -1 | awk '{print $4}' | tr -d '\r')
USED_SPACE=$(adb -s "$DEVICE_IP:5555" shell df /data | tail -1 | awk '{print $3}' | tr -d '\r')
TOTAL_SPACE=$(adb -s "$DEVICE_IP:5555" shell df /data | tail -1 | awk '{print $2}' | tr -d '\r')

log_info "存储空间: 总计 ${TOTAL_SPACE}KB, 已用 ${USED_SPACE}KB, 可用 ${AVAILABLE_SPACE}KB"

cat > "$TROUBLE_LOG_DIR/storage_info.txt" << EOF
存储空间信息:
总空间: ${TOTAL_SPACE}KB
已用空间: ${USED_SPACE}KB
可用空间: ${AVAILABLE_SPACE}KB
EOF

# 如果只收集日志，到此结束
if [ "$LOGS_ONLY" = true ]; then
    log_info "✅ 日志收集完成: $TROUBLE_LOG_DIR"
    exit 0
fi

# 6. 自动修复尝试
log_progress "开始自动修复..."

# 修复1: 清理应用缓存
log_fix "清理应用缓存..."
if adb -s "$DEVICE_IP:5555" shell pm list packages | grep -q "$PACKAGE_NAME"; then
    adb -s "$DEVICE_IP:5555" shell pm clear "$PACKAGE_NAME" 2>/dev/null && {
        log_info "✅ 应用缓存清理成功"
    } || {
        log_warn "应用缓存清理失败"
    }
fi

# 修复2: WebView修复
if [ "$FIX_WEBVIEW" = true ] || [ -z "$WEBVIEW_PACKAGES" ]; then
    log_fix "修复WebView问题..."
    
    # 尝试更新WebView
    CHROME_PACKAGE="com.android.chrome"
    if adb -s "$DEVICE_IP:5555" shell pm list packages | grep -q "$CHROME_PACKAGE"; then
        log_info "尝试更新Chrome WebView..."
        # 这里可以添加WebView更新逻辑
        adb -s "$DEVICE_IP:5555" shell am start -a android.intent.action.VIEW -d "https://play.google.com/store/apps/details?id=com.google.android.webview" 2>/dev/null || true
    fi
    
    # 清理WebView数据
    for pkg in $WEBVIEW_PACKAGES; do
        log_info "清理WebView数据: $pkg"
        adb -s "$DEVICE_IP:5555" shell pm clear "$pkg" 2>/dev/null || true
    done
fi

# 修复3: 重置应用数据
if [ "$RESET_APP" = true ]; then
    log_fix "重置应用数据..."
    
    # 停止应用
    adb -s "$DEVICE_IP:5555" shell am force-stop "$PACKAGE_NAME" 2>/dev/null || true
    
    # 清理应用数据
    adb -s "$DEVICE_IP:5555" shell pm clear "$PACKAGE_NAME" 2>/dev/null && {
        log_info "✅ 应用数据重置成功"
    } || {
        log_warn "应用数据重置失败"
    }
    
    # 重新授权权限
    log_info "重新授权权限..."
    PERMISSIONS=(
        "android.permission.CAMERA"
        "android.permission.RECORD_AUDIO"
        "android.permission.ACCESS_FINE_LOCATION"
        "android.permission.ACCESS_COARSE_LOCATION"
        "android.permission.READ_EXTERNAL_STORAGE"
        "android.permission.WRITE_EXTERNAL_STORAGE"
        "android.permission.READ_CONTACTS"
        "android.permission.WRITE_CONTACTS"
    )
    
    for permission in "${PERMISSIONS[@]}"; do
        adb -s "$DEVICE_IP:5555" shell pm grant "$PACKAGE_NAME" "$permission" 2>/dev/null || true
    done
fi

# 修复4: 降级处理
if [ "$DOWNGRADE" = true ]; then
    log_fix "执行降级处理..."
    
    # 检查是否有备用APK
    BACKUP_APK="downloads/wechat_backup.apk"
    if [ -f "$BACKUP_APK" ]; then
        log_info "找到备用APK，尝试降级安装..."
        
        # 卸载当前版本
        adb -s "$DEVICE_IP:5555" uninstall "$PACKAGE_NAME" 2>/dev/null || true
        
        # 安装备用版本
        if adb -s "$DEVICE_IP:5555" install -r -t -d -g "$BACKUP_APK"; then
            log_info "✅ 降级安装成功"
        else
            log_error "降级安装失败"
        fi
    else
        log_warn "未找到备用APK文件"
    fi
fi

# 修复5: 系统级修复
log_fix "执行系统级修复..."

# 清理系统缓存
log_info "清理系统缓存..."
adb -s "$DEVICE_IP:5555" shell pm trim-caches 500M 2>/dev/null || true

# 重启ADB服务
log_info "重启ADB服务..."
adb kill-server
sleep 2
adb start-server
adb connect "$DEVICE_IP:5555" >/dev/null 2>&1

# 7. 生成修复报告
log_progress "生成修复报告..."

FIX_REPORT="$TROUBLE_LOG_DIR/fix_report.txt"
cat > "$FIX_REPORT" << EOF
微信故障修复报告
================
修复时间: $(date)
设备IP: $DEVICE_IP
设备信息: $DEVICE_BRAND $DEVICE_MODEL, Android $DEVICE_VERSION
应用版本: $APP_VERSION ($APP_VERSION_CODE)

执行的修复操作:
EOF

if [ "$LOGS_ONLY" != true ]; then
    echo "- 清理应用缓存" >> "$FIX_REPORT"
fi

if [ "$FIX_WEBVIEW" = true ]; then
    echo "- WebView修复" >> "$FIX_REPORT"
fi

if [ "$RESET_APP" = true ]; then
    echo "- 重置应用数据" >> "$FIX_REPORT"
fi

if [ "$DOWNGRADE" = true ]; then
    echo "- 降级处理" >> "$FIX_REPORT"
fi

echo "- 系统级修复" >> "$FIX_REPORT"

cat >> "$FIX_REPORT" << EOF

收集的日志文件:
- device_info.txt: 设备信息
- system_logcat.txt: 系统日志
- wechat_logcat.txt: 微信相关日志
- crash_logs.txt: 崩溃日志
- app_package_info.txt: 应用包信息
- app_meminfo.txt: 应用内存信息
- webview_info.txt: WebView信息
- app_permissions.txt: 应用权限
- storage_info.txt: 存储空间信息

建议后续操作:
1. 重新运行验证脚本检查修复效果
2. 如问题仍存在，请查看具体日志文件
3. 考虑联系技术支持并提供此报告
EOF

# 8. 最终验证
log_progress "执行最终验证..."

# 尝试启动应用
if adb -s "$DEVICE_IP:5555" shell pm list packages | grep -q "$PACKAGE_NAME"; then
    log_info "尝试启动应用..."
    if adb -s "$DEVICE_IP:5555" shell am start -n "$PACKAGE_NAME/$MAIN_ACTIVITY" >/dev/null 2>&1; then
        sleep 3
        if adb -s "$DEVICE_IP:5555" shell pidof "$PACKAGE_NAME" >/dev/null 2>&1; then
            log_info "✅ 应用启动成功"
            echo "最终验证: 应用启动成功" >> "$FIX_REPORT"
        else
            log_warn "应用启动后进程未找到"
            echo "最终验证: 应用启动异常" >> "$FIX_REPORT"
        fi
    else
        log_warn "应用启动失败"
        echo "最终验证: 应用启动失败" >> "$FIX_REPORT"
    fi
else
    log_error "应用未安装，无法验证"
    echo "最终验证: 应用未安装" >> "$FIX_REPORT"
fi

# 完成
echo
log_info "🎉 故障诊断和修复完成！"
log_info "📁 详细报告目录: $TROUBLE_LOG_DIR"
log_info "📋 修复报告: $FIX_REPORT"
echo
log_info "建议操作:"
log_info "1. 查看修复报告了解详细情况"
log_info "2. 运行验证脚本: ./install/04_verify_app.sh $DEVICE_IP"
log_info "3. 如问题仍存在，请查看日志文件或联系技术支持"

exit 0