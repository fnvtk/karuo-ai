#!/bin/bash
# 磁盘快速诊断脚本
# 使用方法: chmod +x 快速诊断.sh && ./快速诊断.sh

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║           💾 磁盘诊断报告                             ║"
echo "║           $(date '+%Y-%m-%d %H:%M:%S')                          ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# 1. 磁盘总览
echo "📊 磁盘总览"
echo "=========================================="
df -h /System/Volumes/Data | awk 'NR==1{print "文件系统\t\t大小\t已用\t可用\t使用率"} NR==2{print $1"\t"$2"\t"$3"\t"$4"\t"$5}'
echo ""

# 2. 用户目录 TOP10
echo "📁 用户目录占用 TOP10"
echo "=========================================="
du -d 1 -h ~/ 2>/dev/null | sort -hr | head -10
echo ""

# 3. 回收站
echo "🗑️  回收站"
echo "=========================================="
TRASH_SIZE=$(du -sh ~/.Trash 2>/dev/null | cut -f1)
TRASH_COUNT=$(find ~/.Trash -type f 2>/dev/null | wc -l | tr -d ' ')
echo "大小: $TRASH_SIZE | 文件数: $TRASH_COUNT"
echo ""

# 4. 缓存目录
echo "💨 缓存目录大小"
echo "=========================================="
echo "系统缓存:    $(du -sh ~/Library/Caches 2>/dev/null | cut -f1)"
echo "通用缓存:    $(du -sh ~/.cache 2>/dev/null | cut -f1 || echo '0B')"
echo "npm缓存:     $(du -sh ~/.npm 2>/dev/null | cut -f1 || echo '0B')"
echo "pnpm缓存:    $(du -sh ~/.pnpm-store 2>/dev/null | cut -f1 || echo '0B')"
echo "Gradle缓存:  $(du -sh ~/.gradle/caches 2>/dev/null | cut -f1 || echo '0B')"
echo ""

# 5. 开发相关
echo "🛠️  开发目录"
echo "=========================================="
if [ -d ~/Library/Developer/Xcode ]; then
    echo "Xcode DerivedData: $(du -sh ~/Library/Developer/Xcode/DerivedData 2>/dev/null | cut -f1 || echo '0B')"
    echo "Xcode Archives:    $(du -sh ~/Library/Developer/Xcode/Archives 2>/dev/null | cut -f1 || echo '0B')"
fi
if command -v docker &> /dev/null; then
    DOCKER_SIZE=$(docker system df 2>/dev/null | awk 'NR>1{sum+=$4} END{print sum"GB"}' || echo "未知")
    echo "Docker:            $DOCKER_SIZE"
fi
echo ""

# 6. 大文件
echo "📦 大文件 TOP5 (>500MB)"
echo "=========================================="
find ~/ -xdev -type f -size +500M 2>/dev/null | head -5 | while read f; do
    SIZE=$(ls -lh "$f" 2>/dev/null | awk '{print $5}')
    echo "$SIZE  $f"
done
echo ""

# 7. 建议
echo "💡 清理建议"
echo "=========================================="
AVAIL=$(df /System/Volumes/Data | awk 'NR==2{print $4}' | tr -d 'Gi')
if [ "$AVAIL" -lt 50 ]; then
    echo "⚠️  可用空间较低，建议立即清理"
elif [ "$AVAIL" -lt 100 ]; then
    echo "⚡ 可用空间一般，建议定期清理"
else
    echo "✅ 可用空间充足"
fi

if [ -n "$TRASH_SIZE" ] && [ "$TRASH_SIZE" != "0B" ]; then
    echo "• 回收站有 $TRASH_SIZE 可清理"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║           ✅ 诊断完成                                 ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
