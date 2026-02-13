#!/bin/bash
# 视频切片Skill安装脚本

echo "🎬 视频切片Skill - 环境安装"
echo "================================"

# 检查 Homebrew
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew 未安装，请先安装 Homebrew"
    echo "   运行: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi
echo "✅ Homebrew 已安装"

# 安装 FFmpeg
echo ""
echo "📦 检查 FFmpeg..."
if ! command -v ffmpeg &> /dev/null; then
    echo "   安装 FFmpeg..."
    brew install ffmpeg
else
    echo "✅ FFmpeg 已安装"
fi

# 检查 Python
echo ""
echo "📦 检查 Python..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装"
    exit 1
fi
echo "✅ Python3 已安装: $(python3 --version)"

# 安装 Python 依赖
echo ""
echo "📦 安装 Python 依赖..."

# Whisper
echo "   安装 openai-whisper..."
pip3 install openai-whisper -q

# yt-dlp
echo "   安装 yt-dlp..."
pip3 install yt-dlp -q

echo ""
echo "================================"
echo "✅ 安装完成！"
echo ""
echo "使用方法："
echo "  python3 scripts/main.py --input \"视频路径或URL\" --clips 5"
echo ""
echo "示例："
echo "  # 处理本地视频"
echo "  python3 scripts/main.py -i /path/to/video.mp4"
echo ""
echo "  # 处理YouTube视频"
echo "  python3 scripts/main.py -i \"https://www.youtube.com/watch?v=xxxxx\""
echo ""
