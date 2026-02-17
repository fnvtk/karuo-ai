#!/bin/bash
# ============================================
# Time Machine → 家里 DiskStation 全自动检测与验证
# 用途：能自动做的就做，做不了的输出材料路径供卡若AI按参考资料处理，不追问用户
# 解决后运行本脚本可验证是否已恢复
# ============================================

DISKSTATION_IP="${DISKSTATION_IP:-192.168.110.29}"
REFERENCE_MD="参考资料/Time_Machine_DiskStation_错误排查.md"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REFERENCE_PATH="$SKILL_DIR/$REFERENCE_MD"

echo "=== Time Machine → DiskStation 自动检测 ==="
echo "目标: $DISKSTATION_IP (DiskStation.local)"
echo ""

# ---------- 1. 本机可达性 ----------
echo "[1] 网络连通性"
if ping -c 1 -W 2 "$DISKSTATION_IP" >/dev/null 2>&1; then
    echo "    ✅ $DISKSTATION_IP 可达"
else
    echo "    ❌ $DISKSTATION_IP 不可达（NAS 可能关机或不在同网）"
    echo "    建议: 确认与家里 Wi-Fi 同网、NAS 已开机"
    echo ""
    echo ">>> 无法自动修复网络。材料: $REFERENCE_PATH"
    exit 1
fi

# ---------- 2. DSM / SMB 端口 ----------
echo ""
echo "[2] 服务端口"
DSM_OK=0
SMB_OK=0
nc -z -w2 "$DISKSTATION_IP" 5000 2>/dev/null && DSM_OK=1
nc -z -w2 "$DISKSTATION_IP" 445 2>/dev/null && SMB_OK=1
nc -z -w2 "$DISKSTATION_IP" 139 2>/dev/null && SMB_OK=1

if [ "$DSM_OK" -eq 1 ]; then
    echo "    ✅ DSM 5000 开放"
else
    echo "    ❌ DSM 5000 未开放"
fi
if [ "$SMB_OK" -eq 1 ]; then
    echo "    ✅ SMB (445/139) 开放"
else
    echo "    ❌ SMB 未开放"
fi

if [ "$DSM_OK" -eq 0 ] && [ "$SMB_OK" -eq 0 ]; then
    echo ""
    echo ">>> 需在 DSM 检查文件服务与 SMB。材料: $REFERENCE_PATH"
    echo "    DSM: http://$DISKSTATION_IP:5000"
    exit 2
fi

# ---------- 3. Time Machine 目标状态（仅验证用）----------
echo ""
echo "[3] Time Machine 目标（本机）"
if command -v tmutil >/dev/null 2>&1; then
    DEST_INFO=$(tmutil destinationinfo 2>/dev/null)
    if echo "$DEST_INFO" | grep -qi "DiskStation\|$DISKSTATION_IP"; then
        echo "    已配置 DiskStation 目标"
        echo "$DEST_INFO" | head -20 | sed 's/^/    /'
    else
        echo "    未检测到 DiskStation 目标（可能已移除或名称不同）"
    fi
else
    echo "    (tmutil 不可用，跳过)"
fi

# ---------- 4. 结论 ----------
echo ""
echo "=== 结论 ==="
if [ "$DSM_OK" -eq 1 ]; then
    echo "网络与 DSM 正常。若系统设置里仍显示红点，请执行："
    echo "  1. 打开: $REFERENCE_PATH"
    echo "  2. 按「二、Mac 端操作」移除并重新添加备份磁盘"
    echo "  3. 若仍报错，按「一、NAS 端」在 DSM 中检查 Time Machine / SMB / Bonjour"
    echo ""
    echo "DSM 管理: http://$DISKSTATION_IP:5000"
else
    echo "请按参考资料在 DSM 与 Mac 端逐项检查，无需再问用户。"
    echo "材料路径: $REFERENCE_PATH"
fi
echo ""
echo "（解决后再次运行本脚本可验证网络与端口是否正常）"
