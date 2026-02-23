#!/bin/bash
# 通过 ipatool 下载兼容 iPad 2（iOS 9）的 Duet Display 旧版 IPA
# 使用前需先执行：ipatool auth login

set -e
OUTPUT_DIR="/Users/karuo/Documents/卡若Ai的文件夹"
IPA_DIR="$OUTPUT_DIR/ipa_cache"
mkdir -p "$IPA_DIR"

echo "=========================================="
echo "  下载 Duet Display 旧版 IPA（兼容 iPad 2 / iOS 9）"
echo "=========================================="

# 检查 ipatool 是否已登录
if ! ipatool auth info 2>/dev/null; then
    echo "请先登录 Apple ID："
    echo "  ipatool auth login"
    exit 1
fi

# 列出 Duet 可用版本，找到兼容 iOS 9 的
echo ""
echo "正在获取 Duet Display 版本列表..."
ipatool list-versions -b com.kairos.duet 2>&1 | head -30

echo ""
echo "请从上述列表中选择 external-version-id（兼容 iOS 9 的版本约 2.x）"
echo "然后执行："
echo "  ipatool download -b com.kairos.duet --external-version-id <版本ID>"
echo "  ideviceinstaller -i ~/Downloads/*.ipa"
echo ""
echo "IPA 将下载到当前目录或 ~/Downloads"
