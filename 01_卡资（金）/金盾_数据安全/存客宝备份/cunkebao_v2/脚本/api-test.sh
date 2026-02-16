#!/bin/bash

# API接口测试脚本
echo "🚀 开始测试存客宝API接口..."

# 设置API基础地址
API_BASE_URL="https://ckbapi.quwanzhi.com"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印消息函数
print_message() {
    echo -e "${1}${2}${NC}"
}

# 测试API接口函数
test_api() {
    local endpoint=$1
    local description=$2
    
    print_message $BLUE "测试: $description"
    print_message $YELLOW "接口: $API_BASE_URL$endpoint"
    
    # 发送请求并获取状态码
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL$endpoint")
    
    if [ "$status_code" -eq 200 ]; then
        print_message $GREEN "✅ 成功 (状态码: $status_code)"
    elif [ "$status_code" -eq 404 ]; then
        print_message $YELLOW "⚠️  接口不存在 (状态码: $status_code)"
    elif [ "$status_code" -eq 401 ]; then
        print_message $YELLOW "⚠️  需要认证 (状态码: $status_code)"
    else
        print_message $RED "❌ 失败 (状态码: $status_code)"
    fi
    
    echo ""
}

# 检查网络连接
print_message $BLUE "🌐 检查网络连接..."
if ping -c 1 quwanzhi.com &> /dev/null; then
    print_message $GREEN "✅ 网络连接正常"
else
    print_message $RED "❌ 网络连接失败"
    exit 1
fi

echo ""

# 测试主要API接口
print_message $BLUE "📡 开始测试API接口..."
echo ""

# 设备管理接口
test_api "/api/devices" "设备列表"
test_api "/api/devices/stats" "设备统计"

# 微信管理接口
test_api "/api/wechat/accounts" "微信账号列表"
test_api "/api/wechat/accounts/status" "微信账号状态"

# 流量池接口
test_api "/api/traffic/pools" "流量池列表"
test_api "/api/traffic/tags" "流量标签"

# 场景获客接口
test_api "/api/scenarios" "场景列表"
test_api "/api/scenarios/stats" "场景统计"

# 内容库接口
test_api "/api/content/library" "内容库"
test_api "/api/content/categories" "内容分类"

# 工作台接口
test_api "/api/workspace/overview" "工作台概览"
test_api "/api/workspace/tasks" "工作台任务"

# 用户接口
test_api "/api/user/profile" "用户资料"
test_api "/api/auth/verify" "认证验证"

print_message $BLUE "🔍 测试完成！"
print_message $YELLOW "注意事项："
echo "1. 状态码200表示接口正常"
echo "2. 状态码401表示需要认证，这是正常的"
echo "3. 状态码404表示接口不存在，需要确认接口地址"
echo "4. 其他状态码可能表示服务器问题"

echo ""
print_message $GREEN "🎉 API测试脚本执行完成！"
