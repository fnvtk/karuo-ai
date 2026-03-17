#!/bin/bash
# APK下载脚本 - 多源下载微信稳定版
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
fi

# 微信稳定版下载源（按优先级排序）
declare -a APK_URLS=(
    # 微信官方稳定版 8.0.50 (推荐)
    "https://dldir1.qq.com/weixin/android/weixin8050android2340.apk"
    # 微信稳定版 8.0.47
    "https://dldir1.qq.com/weixin/android/weixin8047android2220.apk"
    # 微信稳定版 8.0.44
    "https://dldir1.qq.com/weixin/android/weixin8044android2160.apk"
    # APKPure备用源
    "https://d.apkpure.com/b/APK/com.tencent.mm?version=latest"
    # APKMirror备用源
    "https://www.apkmirror.com/apk/tencent/wechat/wechat-8-0-50-release/"
)

# 对应的文件大小（用于校验，单位：字节）
declare -a EXPECTED_SIZES=(
    "300000000"  # 约300MB
    "295000000"  # 约295MB
    "290000000"  # 约290MB
    "0"          # 备用源大小未知
    "0"          # 备用源大小未知
)

# 对应的版本信息
declare -a VERSION_INFO=(
    "微信 8.0.50 (官方稳定版)"
    "微信 8.0.47 (官方稳定版)"
    "微信 8.0.44 (官方稳定版)"
    "微信最新版 (APKPure)"
    "微信最新版 (APKMirror)"
)

log_info "开始下载微信稳定版APK..."

# 创建下载目录
mkdir -p downloads
cd downloads

# 下载函数
download_apk() {
    local url="$1"
    local expected_size="$2"
    local version_info="$3"
    local filename="$APK_FILE"
    
    log_info "尝试下载: $version_info"
    log_info "下载地址: $url"
    
    # 如果文件已存在，检查大小
    if [ -f "$filename" ]; then
        local current_size=$(stat -f%z "$filename" 2>/dev/null || echo "0")
        if [ "$expected_size" -gt 0 ] && [ "$current_size" -eq "$expected_size" ]; then
            log_info "文件已存在且大小正确，跳过下载"
            return 0
        elif [ "$current_size" -gt 50000000 ]; then
            log_info "检测到部分下载文件，尝试断点续传..."
        else
            log_warn "删除损坏的文件"
            rm -f "$filename"
        fi
    fi
    
    # 下载参数
    local curl_opts=(
        "-L"                    # 跟随重定向
        "--retry" "3"           # 重试3次
        "--retry-delay" "2"     # 重试间隔2秒
        "--connect-timeout" "30" # 连接超时30秒
        "--max-time" "1800"     # 最大下载时间30分钟
        "-C" "-"                # 断点续传
        "--progress-bar"        # 显示进度条
        "-o" "$filename"        # 输出文件名
        "--user-agent" "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36"
    )
    
    # 执行下载
    if curl "${curl_opts[@]}" "$url"; then
        # 检查文件是否下载成功
        if [ -f "$filename" ]; then
            local downloaded_size=$(stat -f%z "$filename" 2>/dev/null || echo "0")
            log_info "下载完成，文件大小: $downloaded_size 字节"
            
            # 大小校验（如果有预期大小）
            if [ "$expected_size" -gt 0 ]; then
                local size_diff=$((downloaded_size - expected_size))
                local size_diff_abs=${size_diff#-}  # 绝对值
                local tolerance=$((expected_size / 20))  # 5%容差
                
                if [ "$size_diff_abs" -le "$tolerance" ]; then
                    log_info "文件大小校验通过"
                else
                    log_warn "文件大小与预期不符，但在容差范围内"
                fi
            fi
            
            # 基本文件格式检查
            if file "$filename" | grep -q "Android"; then
                log_info "文件格式校验通过：Android APK"
                return 0
            else
                log_warn "文件格式可能不正确，但继续尝试"
                return 0
            fi
        else
            log_error "下载失败：文件不存在"
            return 1
        fi
    else
        log_error "下载失败：curl命令执行失败"
        return 1
    fi
}

# 清理函数
cleanup_failed_download() {
    if [ -f "$APK_FILE" ]; then
        local file_size=$(stat -f%z "$APK_FILE" 2>/dev/null || echo "0")
        if [ "$file_size" -lt 10000000 ]; then  # 小于10MB认为是失败的下载
            log_warn "删除失败的下载文件"
            rm -f "$APK_FILE"
        fi
    fi
}

# 主下载逻辑
DOWNLOAD_SUCCESS=false

for i in "${!APK_URLS[@]}"; do
    url="${APK_URLS[$i]}"
    expected_size="${EXPECTED_SIZES[$i]}"
    version_info="${VERSION_INFO[$i]}"
    
    log_progress "尝试下载源 $((i+1))/${#APK_URLS[@]}: $version_info"
    
    if download_apk "$url" "$expected_size" "$version_info"; then
        DOWNLOAD_SUCCESS=true
        log_info "✅ 下载成功: $version_info"
        break
    else
        log_error "❌ 下载失败: $version_info"
        cleanup_failed_download
        
        # 如果不是最后一个源，等待一下再试下一个
        if [ $i -lt $((${#APK_URLS[@]} - 1)) ]; then
            log_info "等待3秒后尝试下一个下载源..."
            sleep 3
        fi
    fi
done

# 检查最终结果
if [ "$DOWNLOAD_SUCCESS" = true ]; then
    FINAL_SIZE=$(stat -f%z "$APK_FILE" 2>/dev/null || echo "0")
    log_info "🎉 APK下载完成！"
    log_info "文件路径: $(pwd)/$APK_FILE"
    log_info "文件大小: $FINAL_SIZE 字节 ($(echo "scale=1; $FINAL_SIZE/1024/1024" | bc)MB)"
    
    # 记录下载日志
    DOWNLOAD_LOG="../logs/download_$(date +%Y%m%d_%H%M%S).log"
    cat > "$DOWNLOAD_LOG" << EOF
微信APK下载记录
下载时间: $(date)
文件名: $APK_FILE
文件大小: $FINAL_SIZE 字节
下载源: 成功的下载源信息
MD5: $(md5 -q "$APK_FILE" 2>/dev/null || echo "计算失败")
EOF
    
    log_info "下载日志已保存: $DOWNLOAD_LOG"
    
    # 返回上级目录
    cd ..
    exit 0
else
    log_error "❌ 所有下载源都失败了！"
    log_info "建议检查："
    log_info "1. 网络连接是否正常"
    log_info "2. 是否需要代理访问"
    log_info "3. 防火墙设置"
    log_info "4. 手动下载APK文件到 downloads/$APK_FILE"
    
    # 返回上级目录
    cd ..
    exit 1
fi