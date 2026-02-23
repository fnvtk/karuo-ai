#!/bin/bash
# iPad 2 作为 Mac 触控副屏 - 一键安装脚本
# 用途：检测 iPad 连接、安装 Duet 相关组件、配置副屏

set -e
DUET_MAC_URL="https://updates.duetdisplay.com/AppleSilicon"
OUTPUT_DIR="/Users/karuo/Documents/卡若Ai的文件夹"
IPA_DIR="$OUTPUT_DIR/ipa_cache"
mkdir -p "$IPA_DIR"

echo "=========================================="
echo "  iPad 2 → Mac 触控副屏 安装脚本"
echo "=========================================="
echo ""

# 1. 检测 iPad 连接
echo "[1/4] 检测 iPad 连接..."
echo "      请确保：① iPad 已用 USB 连接 Mac  ② iPad 已解锁  ③ 在 iPad 上点「信任此电脑」"
echo ""

IPAD_CONNECTED=0
for i in {1..15}; do
    if idevice_id -l 2>/dev/null | grep -q .; then
        echo "      ✅ 已检测到 iOS 设备"
        ideviceinfo 2>/dev/null | grep -E "ProductName|ProductType|ProductVersion" || true
        IPAD_CONNECTED=1
        break
    fi
    printf "      等待设备... (%d/15)\r" $i
    sleep 2
done
echo ""

if [ $IPAD_CONNECTED -eq 0 ]; then
    echo "      ⚠ 未检测到 iPad，将继续安装 Mac 端；iPad 连接后可重新运行本脚本安装 iOS 端"
fi

# 2. 下载 Duet Mac 端
echo ""
echo "[2/4] 下载 Duet Mac 端..."

if [ ! -d "/Applications/Duet.app" ]; then
    echo "      正在下载 Duet..."
    if [ -f /tmp/DuetMac.dmg ]; then
        echo "      使用已下载的 Duet..."
    elif curl -sL -o /tmp/DuetMac.dmg "$DUET_MAC_URL" 2>/dev/null; then
        :
    fi
    if [ -f /tmp/DuetMac.dmg ]; then
        hdiutil attach /tmp/DuetMac.dmg -nobrowse -quiet
        cp -R /Volumes/Duet*/duet.app /Applications/Duet.app 2>/dev/null || cp -R /Volumes/Duet*/*.app /Applications/ 2>/dev/null
        hdiutil detach /Volumes/Duet* 2>/dev/null || true
        echo "      ✅ Duet Mac 端已安装到 /Applications"
    else
        echo "      ⚠ 自动下载失败，请手动下载："
        echo "         https://www.duetdisplay.com/zh/onboarding/download-apps"
        open "https://www.duetdisplay.com/zh/onboarding/download-apps" 2>/dev/null || true
    fi
else
    echo "      ✅ Duet 已存在于 /Applications"
fi

# 3. 尝试安装 IPA 到 iPad（需提供 IPA 路径）
echo ""
echo "[3/4] 安装副屏 App 到 iPad..."

IPA_PATH=""
for f in "$IPA_DIR"/Duet*.ipa "$IPA_DIR"/*duet*.ipa ~/Downloads/Duet*.ipa; do
    [ -f "$f" ] && IPA_PATH="$f" && break
done

if [ $IPAD_CONNECTED -eq 0 ]; then
    echo "      跳过（iPad 未连接）"
elif [ -n "$IPA_PATH" ]; then
    echo "      找到 IPA: $IPA_PATH"
    if ideviceinstaller -i "$IPA_PATH" 2>/dev/null; then
        echo "      ✅ App 已安装到 iPad"
    else
        echo "      ⚠ 安装失败（可能需 Apple ID 或签名）"
    fi
else
    echo "      ⚠ 未找到 Duet IPA 文件"
    echo "      iPad 2 需兼容 iOS 9 的旧版 Duet。请："
    echo "      1. 在 iPad 2 上打开 App Store → 搜索「Duet Display」"
    echo "      2. 若曾购买过，可在「已购项目」中安装最后兼容版本"
    echo "      3. 或使用 ipatool 下载旧版："
    echo "         ipatool auth login"
    echo "         ipatool download -b com.kairos.duet --external-version-id <旧版ID>"
fi

# 4. 启动 Duet 并提示
echo ""
echo "[4/4] 启动 Duet Mac 端..."
if [ -d "/Applications/Duet.app" ]; then
    open -a Duet 2>/dev/null || open "/Applications/Duet.app" 2>/dev/null
    echo "      ✅ Duet 已启动"
else
    echo "      请先安装 Duet 后再运行"
fi

echo ""
echo "=========================================="
echo "  完成。下一步："
echo "  1. 在 Mac 上允许 Duet 的「辅助功能」「屏幕录制」权限"
echo "  2. 在 iPad 2 上打开 Duet Display 应用"
echo "  3. 用 USB 连接后，Duet 会自动识别并作为副屏"
echo "=========================================="
