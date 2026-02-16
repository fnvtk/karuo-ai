#!/bin/bash
# iPhone 管理配置文件
# 修改此文件来自定义你的 iPhone 热点名称

# iPhone 个人热点名称列表（按优先级排序）
# 添加你的 iPhone 热点名称到这个数组
IPHONE_HOTSPOT_NAMES=(
    "卡苹"
    "iPhone"
    "卡若"
    "爱赛车🏎️的小苹果🍎"
)

# 网络检查间隔（秒）
# 默认 60 秒检查一次，可根据需要调整
CHECK_INTERVAL=60

# 备份间隔（小时）
# 24 小时内已备份则跳过
BACKUP_INTERVAL_HOURS=24

# 日志保留天数
LOG_RETENTION_DAYS=7
