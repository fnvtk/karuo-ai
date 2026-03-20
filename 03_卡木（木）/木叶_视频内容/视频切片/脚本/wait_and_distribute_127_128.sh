#!/bin/bash
# 等待127和128场切片完成，然后自动分发

DIST_SCRIPT="/Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/多平台分发/脚本"
VIDEO_DIR_127="/Users/karuo/Movies/soul视频/原视频/第127场_20260318_output"
VIDEO_DIR_128="/Users/karuo/Movies/soul视频/原视频/第128场_20260319_output"

echo "等待127和128场切片完成..."

# 检查成片目录是否存在且有mp4文件
check_complete() {
    local dir=$1
    local session=$2
    
    if [ -d "$dir/成片" ] || [ -d "$dir/clips_enhanced" ]; then
        local clips_dir="$dir/成片"
        [ ! -d "$clips_dir" ] && clips_dir="$dir/clips_enhanced"
        
        if [ -f "$clips_dir/目录索引.md" ] && [ $(find "$clips_dir" -name "*.mp4" | wc -l) -gt 0 ]; then
            echo "✅ $session 场切片完成"
            return 0
        fi
    fi
    return 1
}

# 轮询检查
while true; do
    complete_127=false
    complete_128=false
    
    check_complete "$VIDEO_DIR_127" "127" && complete_127=true
    check_complete "$VIDEO_DIR_128" "128" && complete_128=true
    
    if [ "$complete_127" = true ] && [ "$complete_128" = true ]; then
        echo ""
        echo "=========================================="
        echo "127和128场切片全部完成，开始分发..."
        echo "=========================================="
        
        # 分发127场
        if [ -d "$VIDEO_DIR_127/成片" ]; then
            echo "分发127场..."
            cd "$DIST_SCRIPT"
            python3 distribute_all.py --video-dir "$VIDEO_DIR_127/成片" --platforms 抖音 B站 小红书 --now
        elif [ -d "$VIDEO_DIR_127/clips_enhanced" ]; then
            echo "分发127场..."
            cd "$DIST_SCRIPT"
            python3 distribute_all.py --video-dir "$VIDEO_DIR_127/clips_enhanced" --platforms 抖音 B站 小红书 --now
        fi
        
        # 分发128场
        if [ -d "$VIDEO_DIR_128/成片" ]; then
            echo "分发128场..."
            cd "$DIST_SCRIPT"
            python3 distribute_all.py --video-dir "$VIDEO_DIR_128/成片" --platforms 抖音 B站 小红书 --now
        elif [ -d "$VIDEO_DIR_128/clips_enhanced" ]; then
            echo "分发128场..."
            cd "$DIST_SCRIPT"
            python3 distribute_all.py --video-dir "$VIDEO_DIR_128/clips_enhanced" --platforms 抖音 B站 小红书 --now
        fi
        
        echo ""
        echo "✅ 127和128场分发完成"
        break
    else
        echo -n "."
        sleep 30
    fi
done
