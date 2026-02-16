#!/bin/bash
#
# 上帝之眼 - 一键真实交易
#
# 使用方式：
#   ./一键交易.sh
#
# 功能：
#   1. 自动打开湘财证券网页版
#   2. 登录你的账户（600201668）
#   3. 执行卡若五步选股法
#   4. 真实买入股票
#

echo ""
echo "👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️"
echo "      上帝之眼 - 一键真实交易"
echo "👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️👁️"
echo ""
echo "⚠️  警告：此脚本将执行真实交易！"
echo ""
echo "📍 账号: 600201668"
echo "🏦 券商: 湘财证券"
echo "🌐 网址: https://wt.xcsc.com/"
echo ""

# 进入目录
cd "$(dirname "$0")"

# 激活虚拟环境
source .venv/bin/activate

# 运行交易脚本
python3 scripts/real_trade.py

echo ""
echo "✅ 交易完成！"
