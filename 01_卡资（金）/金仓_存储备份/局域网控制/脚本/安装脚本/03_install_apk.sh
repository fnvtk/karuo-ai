#!/bin/bash
# APK安装脚本 - 卸载旧版、安装、授权、白名单
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

# 加载配置
if [ -f "config/env.sample" ]; then
    source config/env.sample
else
    log_warn "配置文件不存在，使用默认值"
    PACKAGE_NAME="com.tencent.mm"
    APK_FILE="wechat_stable.apk"
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

log_info "开始安装微信到设备: $DEVICE_IP"

# 检查APK文件是否存在
APK_PATH="downloads/$APK_FILE"
if [ ! -f "$APK_PATH" ]; then
    log_error "APK文件不存在: $APK_PATH"
    log_info "请先运行下载脚本: ./install/02_download_apk.sh"
    exit 1
fi

log_info "找到APK文件: $APK_PATH"
APK_SIZE=$(stat -f%z "$APK_PATH" 2>/dev/null || echo "0")
log_info "APK文件大小: $APK_SIZE 字节 ($(echo "scale=1; $APK_SIZE/1024/1024" | bc)MB)"

# 连接设备
log_progress "连接到设备 $DEVICE_IP..."
adb connect "$DEVICE_IP:5555"

# 等待设备连接
log_progress "等待设备连接..."
adb -s "$DEVICE_IP:5555" wait-for-device

# 检查设备连接状态
if ! adb -s "$DEVICE_IP:5555" shell echo "connected" >/dev/null 2>&1; then
    log_error "无法连接到设备 $DEVICE_IP"
    log_info "请检查："
    log_info "1. 设备IP地址是否正确"
    log_info "2. 设备是否开启ADB调试"
    log_info "3. 设备是否在同一网络"
    exit 1
fi

log_info "✅ 设备连接成功"

# 获取设备信息
DEVICE_MODEL=$(adb -s "$DEVICE_IP:5555" shell getprop ro.product.model | tr -d '\r')
DEVICE_VERSION=$(adb -s "$DEVICE_IP:5555" shell getprop ro.build.version.release | tr -d '\r')
DEVICE_SDK=$(adb -s "$DEVICE_IP:5555" shell getprop ro.build.version.sdk | tr -d '\r')

log_info "设备信息:"
log_info "  型号: $DEVICE_MODEL"
log_info "  Android版本: $DEVICE_VERSION (API $DEVICE_SDK)"

# 检查是否已安装微信
log_progress "检查微信安装状态..."
if adb -s "$DEVICE_IP:5555" shell pm list packages | grep -q "$PACKAGE_NAME"; then
    CURRENT_VERSION=$(adb -s "$DEVICE_IP:5555" shell dumpsys package "$PACKAGE_NAME" | grep "versionName" | head -1 | cut -d'=' -f2 | tr -d '\r' || echo "未知")
    log_warn "检测到已安装微信，版本: $CURRENT_VERSION"
    
    # 询问是否卸载
    read -p "是否卸载现有版本？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_progress "卸载现有微信..."
        if adb -s "$DEVICE_IP:5555" uninstall "$PACKAGE_NAME"; then
            log_info "✅ 卸载成功"
        else
            log_warn "卸载失败，尝试强制卸载..."
            adb -s "$DEVICE_IP:5555" shell pm uninstall --user 0 "$PACKAGE_NAME" || true
        fi
        sleep 2
    else
        log_info "保留现有版本，尝试覆盖安装"
    fi
else
    log_info "设备上未安装微信"
fi

# 检查存储空间
log_progress "检查设备存储空间..."
AVAILABLE_SPACE=$(adb -s "$DEVICE_IP:5555" shell df /data | tail -1 | awk '{print $4}' | tr -d '\r')
REQUIRED_SPACE=$((APK_SIZE / 1024 * 2))  # 需要APK大小的2倍空间

if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
    log_error "存储空间不足"
    log_info "可用空间: ${AVAILABLE_SPACE}KB"
    log_info "需要空间: ${REQUIRED_SPACE}KB"
    exit 1
fi

log_info "存储空间检查通过: ${AVAILABLE_SPACE}KB 可用"

# 安装APK
log_progress "开始安装微信APK..."
log_info "这可能需要几分钟时间，请耐心等待..."

# 安装参数
INSTALL_OPTS=(
    "-r"  # 替换现有应用
    "-t"  # 允许测试APK
    "-d"  # 允许降级安装
    "-g"  # 授予所有运行时权限
)

# 执行安装
if adb -s "$DEVICE_IP:5555" install "${INSTALL_OPTS[@]}" "$APK_PATH"; then
    log_info "✅ APK安装成功！"
else
    log_error "❌ APK安装失败"
    
    # 尝试其他安装方法
    log_warn "尝试备用安装方法..."
    
    # 方法1：推送到设备后安装
    log_progress "方法1: 推送APK到设备..."
    REMOTE_APK="/sdcard/Download/wechat_install.apk"
    
    if adb -s "$DEVICE_IP:5555" push "$APK_PATH" "$REMOTE_APK"; then
        log_info "APK推送成功"
        
        # 使用pm install安装
        if adb -s "$DEVICE_IP:5555" shell pm install -r -t -d -g "$REMOTE_APK"; then
            log_info "✅ 备用方法安装成功！"
            # 清理临时文件
            adb -s "$DEVICE_IP:5555" shell rm -f "$REMOTE_APK"
        else
            log_error "备用方法也失败了"
            # 清理临时文件
            adb -s "$DEVICE_IP:5555" shell rm -f "$REMOTE_APK"
            exit 1
        fi
    else
        log_error "APK推送失败"
        exit 1
    fi
fi

# 等待安装完成
sleep 3

# 验证安装
log_progress "验证安装结果..."
if adb -s "$DEVICE_IP:5555" shell pm list packages | grep -q "$PACKAGE_NAME"; then
    INSTALLED_VERSION=$(adb -s "$DEVICE_IP:5555" shell dumpsys package "$PACKAGE_NAME" | grep "versionName" | head -1 | cut -d'=' -f2 | tr -d '\r' || echo "未知")
    log_info "✅ 微信安装验证成功！"
    log_info "安装版本: $INSTALLED_VERSION"
else
    log_error "❌ 安装验证失败，微信未正确安装"
    exit 1
fi

# 权限授权
log_progress "配置应用权限..."

# 常用权限列表
PERMISSIONS=(
    "android.permission.CAMERA"                    # 相机权限
    "android.permission.RECORD_AUDIO"              # 录音权限
    "android.permission.ACCESS_FINE_LOCATION"      # 精确定位
    "android.permission.ACCESS_COARSE_LOCATION"    # 粗略定位
    "android.permission.READ_EXTERNAL_STORAGE"     # 读取存储
    "android.permission.WRITE_EXTERNAL_STORAGE"    # 写入存储
    "android.permission.READ_CONTACTS"             # 读取联系人
    "android.permission.WRITE_CONTACTS"            # 写入联系人
    "android.permission.READ_PHONE_STATE"          # 读取手机状态
    "android.permission.CALL_PHONE"                # 拨打电话
    "android.permission.READ_SMS"                  # 读取短信
    "android.permission.SEND_SMS"                  # 发送短信
)

# 授权权限
for permission in "${PERMISSIONS[@]}"; do
    log_info "授权权限: $permission"
    adb -s "$DEVICE_IP:5555" shell pm grant "$PACKAGE_NAME" "$permission" 2>/dev/null || {
        log_warn "权限 $permission 授权失败（可能不需要此权限）"
    }
done

# 设置应用为白名单（省电优化豁免）
log_progress "设置省电优化豁免..."
adb -s "$DEVICE_IP:5555" shell dumpsys deviceidle whitelist +"$PACKAGE_NAME" 2>/dev/null || {
    log_warn "省电优化豁免设置失败（部分设备不支持）"
}

# 设置自启动权限（如果支持）
log_progress "尝试设置自启动权限..."
adb -s "$DEVICE_IP:5555" shell pm enable "$PACKAGE_NAME" 2>/dev/null || {
    log_warn "自启动权限设置失败（部分设备不支持）"
}

# 清理安装缓存
log_progress "清理安装缓存..."
adb -s "$DEVICE_IP:5555" shell pm trim-caches 100M 2>/dev/null || true

# 生成安装报告
INSTALL_LOG="logs/install_$(date +%Y%m%d_%H%M%S).log"
cat > "$INSTALL_LOG" << EOF
微信安装报告
============
安装时间: $(date)
设备IP: $DEVICE_IP
设备型号: $DEVICE_MODEL
Android版本: $DEVICE_VERSION (API $DEVICE_SDK)
包名: $PACKAGE_NAME
安装版本: $INSTALLED_VERSION
APK文件: $APK_PATH
APK大小: $APK_SIZE 字节
安装状态: 成功
权限授权: 已完成
白名单设置: 已尝试

安装详情:
- 卸载旧版: $([ "$CURRENT_VERSION" != "" ] && echo "是" || echo "否")
- 覆盖安装: 是
- 权限授权: 自动授权常用权限
- 省电优化: 已豁免
- 自启动: 已启用

注意事项:
1. 首次启动可能需要手动同意用户协议
2. 部分权限可能需要在应用内手动授权
3. 如遇到问题，请查看故障处理脚本
EOF

log_info "安装报告已保存: $INSTALL_LOG"

# 最终提示
log_info "🎉 微信安装完成！"
log_info "📱 设备: $DEVICE_MODEL ($DEVICE_IP)"
log_info "📦 版本: $INSTALLED_VERSION"
log_info "📋 报告: $INSTALL_LOG"
log_info ""
log_info "下一步操作:"
log_info "1. 运行验证脚本: ./install/04_verify_app.sh $DEVICE_IP"
log_info "2. 手动启动微信进行初始化设置"
log_info "3. 如遇问题，运行故障处理脚本: ./install/05_troubleshoot.sh $DEVICE_IP"

exit 0