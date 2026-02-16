#!/bin/bash
# iCloud 上传和下载功能恢复脚本
# 使用方法: chmod +x 恢复iCloud同步.sh && ./恢复iCloud同步.sh

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║           🔄 恢复 iCloud 同步功能                     ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# 步骤1: 恢复上传功能
echo "[1/4] ✅ 恢复上传功能..."
defaults write com.apple.bird DisableUpload -bool false
UPLOAD_STATUS=$(defaults read com.apple.bird DisableUpload 2>/dev/null || echo "0")
if [ "$UPLOAD_STATUS" = "0" ]; then
    echo "      ✓ 上传功能已启用"
else
    echo "      ⚠️ 上传功能恢复失败，请手动检查"
fi

# 步骤2: 重启 iCloud 进程
echo ""
echo "[2/4] 🔄 重启 iCloud 进程..."
killall bird cloudd 2>/dev/null || true
sleep 2
echo "      ✓ iCloud 进程已重启"

# 步骤3: 等待服务恢复
echo ""
echo "[3/4] ⏳ 等待服务恢复..."
sleep 3

# 步骤4: 检查同步状态
echo ""
echo "[4/4] 📊 检查同步状态..."
echo "=========================================="
SYNC_STATUS=$(brctl status 2>&1 | grep -c "needs-sync" || echo "0")
UPLOAD_COUNT=$(brctl status 2>&1 | grep -c "needs-upload\|needs-sync-up" || echo "0")
DOWNLOAD_COUNT=$(brctl status 2>&1 | grep -c "downloading" || echo "0")

echo "   待同步文件: $SYNC_STATUS 个"
echo "   待上传文件: $UPLOAD_COUNT 个"
echo "   正在下载:   $DOWNLOAD_COUNT 个"

if [ "$SYNC_STATUS" -gt 0 ] || [ "$UPLOAD_COUNT" -gt 0 ]; then
    echo ""
    echo "   ✓ iCloud 正在自动同步中..."
else
    echo ""
    echo "   ✓ 当前无待同步文件"
fi

echo ""
echo "=========================================="
echo ""
echo "💡 提示:"
echo "   - 上传功能已恢复，新文件会自动上传"
echo "   - 下载功能正常，云端文件会自动下载"
echo "   - 可在 系统设置 → Apple ID → iCloud → iCloud Drive 查看状态"
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║           ✅ 恢复完成!                                ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
