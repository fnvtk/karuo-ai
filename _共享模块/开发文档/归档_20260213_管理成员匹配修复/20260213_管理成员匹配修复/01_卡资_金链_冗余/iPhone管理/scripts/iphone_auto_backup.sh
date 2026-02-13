#!/bin/bash
# iPhone 自动备份脚本
# 功能：检测 iPhone 连接后自动执行本地备份
# 作者：卡若AI

LOG_FILE="/tmp/iphone_backup.log"
BACKUP_DIR="$HOME/Library/Application Support/MobileSync/Backup"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 检查 iPhone 是否通过 USB 连接
check_iphone_connected() {
    system_profiler SPUSBDataType 2>/dev/null | grep -q "iPhone"
    return $?
}

# 获取 iPhone UDID
get_iphone_udid() {
    system_profiler SPUSBDataType 2>/dev/null | grep -A 20 "iPhone" | grep "Serial Number" | awk '{print $3}' | head -1
}

# 检查上次备份时间
check_last_backup() {
    local udid="$1"
    if [ -z "$udid" ]; then
        return 1
    fi
    
    # 查找备份目录
    local backup_path="$BACKUP_DIR/$udid"
    if [ -d "$backup_path" ]; then
        local last_modified=$(stat -f "%m" "$backup_path" 2>/dev/null)
        local now=$(date +%s)
        local diff=$((now - last_modified))
        local hours=$((diff / 3600))
        
        log "上次备份在 $hours 小时前"
        
        # 如果备份在 24 小时内，跳过
        if [ $hours -lt 24 ]; then
            return 0
        fi
    fi
    
    return 1
}

# 执行备份（使用 Finder/iTunes）
perform_backup() {
    log "开始执行 iPhone 备份..."
    
    # 使用 AppleScript 触发 Finder 备份
    # 注意：需要先在 Finder 中信任设备
    osascript <<EOF
tell application "Finder"
    try
        -- 获取 iPhone 设备
        set iPhoneDevice to first disk whose name contains "iPhone"
        -- 触发同步/备份
        -- 注意：Finder 不直接支持脚本备份，这里发送通知提醒用户
    on error
        return "iPhone not found in Finder"
    end try
end tell
EOF

    # 使用 idevicebackup2（如果安装了 libimobiledevice）
    if command -v idevicebackup2 &>/dev/null; then
        log "使用 idevicebackup2 执行备份..."
        idevicebackup2 backup --full "$BACKUP_DIR" 2>&1 | while read line; do
            log "$line"
        done
        
        if [ $? -eq 0 ]; then
            log "备份完成"
            osascript -e 'display notification "iPhone 备份已完成" with title "备份成功"' 2>/dev/null
            return 0
        fi
    else
        log "建议安装 libimobiledevice 以支持命令行备份: brew install libimobiledevice"
        # 发送通知让用户手动备份
        osascript -e 'display notification "请在 Finder 中手动备份 iPhone" with title "iPhone 已连接"' 2>/dev/null
    fi
    
    return 1
}

# 主逻辑
main() {
    log "=== iPhone 自动备份检查 ==="
    
    # 1. 检查 iPhone 是否连接
    if ! check_iphone_connected; then
        log "未检测到 iPhone 连接"
        exit 0
    fi
    
    log "检测到 iPhone 已连接"
    
    # 2. 获取 UDID
    local udid=$(get_iphone_udid)
    log "iPhone UDID: $udid"
    
    # 3. 检查是否需要备份
    if check_last_backup "$udid"; then
        log "最近已有备份，跳过本次备份"
        exit 0
    fi
    
    # 4. 执行备份
    perform_backup
}

# 执行
main "$@"
