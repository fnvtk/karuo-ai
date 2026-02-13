#!/bin/bash
# 飞书视频下载和切片辅助脚本

echo "=========================================="
echo "🎬 飞书视频智能切片工具"
echo "=========================================="
echo ""
echo "由于API权限限制，需要手动下载视频"
echo ""
echo "📋 操作步骤："
echo "1. 打开飞书链接："
echo "   https://cunkebao.feishu.cn/minutes/obcnjnsx2mz7vj5q843172p8"
echo ""
echo "2. 在飞书中找到视频，点击下载"
echo ""
echo "3. 将下载的视频保存到："
echo "   ~/Downloads/feishu_clips/video_obcnjnsx2mz7vj5q843172p8.mp4"
echo ""
echo "4. 下载完成后，按Enter继续..."
read

# 检查视频文件是否存在
VIDEO_PATH="$HOME/Downloads/feishu_clips/video_obcnjnsx2mz7vj5q843172p8.mp4"

if [ ! -f "$VIDEO_PATH" ]; then
    echo "❌ 视频文件不存在: $VIDEO_PATH"
    echo ""
    echo "请检查："
    echo "1. 视频是否已下载"
    echo "2. 文件名是否正确"
    echo ""
    echo "或者提供视频文件路径："
    read -p "视频文件路径: " CUSTOM_VIDEO
    
    if [ -f "$CUSTOM_VIDEO" ]; then
        VIDEO_PATH="$CUSTOM_VIDEO"
        echo "✅ 使用视频: $VIDEO_PATH"
    else
        echo "❌ 文件不存在，退出"
        exit 1
    fi
else
    echo "✅ 找到视频文件: $VIDEO_PATH"
fi

# 运行切片脚本
echo ""
echo "🚀 开始处理视频..."
echo ""

python3 "$(dirname "$0")/feishu_video_clip.py" \
  --video "$VIDEO_PATH" \
  --webhook "https://open.feishu.cn/open-apis/bot/v2/hook/14a7e0d3-864d-4709-ad40-0def6edba566" \
  --clips 5 \
  --output ~/Downloads/feishu_clips

echo ""
echo "✅ 处理完成！"
