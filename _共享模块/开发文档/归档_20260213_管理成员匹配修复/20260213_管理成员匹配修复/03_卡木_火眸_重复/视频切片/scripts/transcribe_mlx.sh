#!/bin/bash
# =============================================================================
# MLX Whisper 转录脚本
# 功能：提取音频 → 自动检测/增强低音量 → MLX Whisper转录 → 输出SRT/TXT/JSON
# 用法：./transcribe_mlx.sh /path/to/video.mp4 [output_dir]
# =============================================================================

set -e

# 参数
VIDEO="$1"
OUTPUT_DIR="${2:-./output}"

if [ -z "$VIDEO" ]; then
    echo "用法: $0 <视频文件> [输出目录]"
    echo "示例: $0 /Users/karuo/Movies/video.mp4 ./output"
    exit 1
fi

if [ ! -f "$VIDEO" ]; then
    echo "❌ 文件不存在: $VIDEO"
    exit 1
fi

# 激活conda环境
eval "$(~/miniforge3/bin/conda shell.zsh hook)" 2>/dev/null || eval "$(~/miniforge3/bin/conda shell.bash hook)"
conda activate mlx-whisper

echo "=============================================="
echo "🎤 MLX Whisper 转录工具"
echo "=============================================="
echo "📹 输入: $VIDEO"
echo "📁 输出: $OUTPUT_DIR"
echo "⏱️ 开始: $(date '+%H:%M:%S')"
echo "=============================================="

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 获取视频时长
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO" 2>/dev/null)
DURATION_MIN=$(echo "$DURATION / 60" | bc)
echo "📊 视频时长: ${DURATION_MIN}分钟"

# 步骤1: 提取音频
echo ""
echo "📦 步骤1: 提取音频..."
AUDIO_PATH="$OUTPUT_DIR/audio.wav"

ffmpeg -y -i "$VIDEO" -vn -ar 16000 -ac 1 -c:a pcm_s16le "$AUDIO_PATH" 2>/dev/null
echo "   ✅ 音频提取完成"

# 步骤2: 检测音量
echo ""
echo "🔊 步骤2: 检测音量..."
VOLUME_INFO=$(ffmpeg -i "$AUDIO_PATH" -t 60 -af "volumedetect" -f null - 2>&1)
MEAN_VOLUME=$(echo "$VOLUME_INFO" | grep "mean_volume" | awk '{print $5}')
MAX_VOLUME=$(echo "$VOLUME_INFO" | grep "max_volume" | awk '{print $5}')
echo "   平均音量: ${MEAN_VOLUME} dB"
echo "   最大音量: ${MAX_VOLUME} dB"

# 如果音量太低（mean < -60dB），进行增强
MEAN_NUM=$(echo "$MEAN_VOLUME" | sed 's/[^0-9.-]//g')
if (( $(echo "$MEAN_NUM < -60" | bc -l) )); then
    echo ""
    echo "⚠️ 音量过低，自动增强..."
    AUDIO_BOOSTED="$OUTPUT_DIR/audio_boosted.wav"
    ffmpeg -y -i "$AUDIO_PATH" -af "volume=60dB,alimiter=limit=0.9" "$AUDIO_BOOSTED" 2>/dev/null
    AUDIO_PATH="$AUDIO_BOOSTED"
    
    # 检查增强后的音量
    VOLUME_INFO=$(ffmpeg -i "$AUDIO_PATH" -t 60 -af "volumedetect" -f null - 2>&1)
    MEAN_VOLUME=$(echo "$VOLUME_INFO" | grep "mean_volume" | awk '{print $5}')
    echo "   增强后平均音量: ${MEAN_VOLUME} dB"
fi

# 步骤3: MLX Whisper转录
echo ""
echo "🎤 步骤3: MLX Whisper转录..."
echo "   预计耗时: $((DURATION_MIN / 15 + 1))-$((DURATION_MIN / 10 + 1))分钟"

START_TIME=$(date +%s)

mlx_whisper "$AUDIO_PATH" \
    --model mlx-community/whisper-small-mlx \
    --language zh \
    --output-format all \
    --output-dir "$OUTPUT_DIR" \
    --output-name 'transcript'

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
ELAPSED_MIN=$((ELAPSED / 60))
ELAPSED_SEC=$((ELAPSED % 60))

echo ""
echo "=============================================="
echo "✅ 转录完成!"
echo "⏱️ 总耗时: ${ELAPSED_MIN}分${ELAPSED_SEC}秒"
echo "📁 输出文件:"
ls -lh "$OUTPUT_DIR"/transcript.* 2>/dev/null || echo "   (文件生成中...)"
echo "=============================================="

# 显示字幕预览
if [ -f "$OUTPUT_DIR/transcript.srt" ]; then
    echo ""
    echo "📝 字幕预览（前10条）:"
    head -40 "$OUTPUT_DIR/transcript.srt"
fi
