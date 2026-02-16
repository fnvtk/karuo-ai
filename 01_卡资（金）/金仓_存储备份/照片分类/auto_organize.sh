#!/bin/bash
# 照片自动整理脚本 - 卡若AI·卡资（金）
# 使用方法: ./auto_organize.sh

echo "🚀 卡若照片整理助手"
echo "=================================="

# 1. 先打开照片应用
echo "📱 正在打开照片应用..."
open -a "Photos"
sleep 3

# 2. 创建相册结构
echo "📁 正在创建相册结构..."

# 定义要创建的相册
albums=(
    "📱 手机拍摄"
    "🤳 自拍美颜"
    "📸 屏幕截图"
    "🎬 手机视频"
    "🎬 剪辑导出"
    "🎬 屏幕录制"
    "🎬 抖音视频"
    "🌐 网络图片"
    "📅 2018年及以前"
    "📅 2019年回顾"
    "📅 2020年回顾"
    "📅 2021年回顾"
    "📅 2022年回顾"
    "📅 2023年回顾"
    "📅 2024年照片"
    "📅 2025年照片"
)

for album in "${albums[@]}"; do
    echo "  创建: $album"
    osascript <<EOF
tell application "Photos"
    try
        set albumExists to false
        repeat with a in albums
            if name of a is "$album" then
                set albumExists to true
                exit repeat
            end if
        end repeat
        
        if not albumExists then
            make new album named "$album"
        end if
    end try
end tell
EOF
    sleep 0.5
done

echo ""
echo "✅ 相册结构创建完成！"
echo ""
echo "=================================="
echo "📋 接下来请在照片App中："
echo ""
echo "1. 创建智能相册自动分类："
echo "   文件 → 新建智能相册"
echo ""
echo "   推荐的智能相册规则："
echo "   ┌─────────────────────────────────────────┐"
echo "   │ 📸 截图      │ 媒体类型 = 屏幕快照     │"
echo "   │ 🎬 视频      │ 媒体类型 = 视频         │"
echo "   │ ⭐ 收藏      │ 收藏 = 是               │"
echo "   │ 🤳 自拍      │ 相机型号 = 前置摄像头    │"
echo "   │ 📍 厦门      │ 地点 包含 厦门          │"
echo "   └─────────────────────────────────────────┘"
echo ""
echo "2. 使用 Command+A 全选某类照片，拖到对应相册"
echo ""
echo "3. 使用搜索功能快速筛选："
echo "   - 搜索 '截图' 或 'Screenshot'"
echo "   - 搜索 '视频'"
echo "   - 搜索具体年份如 '2024'"
echo ""
echo "=================================="
