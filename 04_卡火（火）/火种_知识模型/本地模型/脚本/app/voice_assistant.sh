#!/bin/bash
# 🔥 卡若AI 语音助手 - 完整语音交互版本
# 使用macOS原生语音识别和合成

API_URL="http://localhost:5888"

# 颜色
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  🔥 卡若AI 语音助手                                      ║"
echo "║  说话后按回车，或直接输入文字                            ║"
echo "║  输入 q 退出                                             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 确保服务运行
if ! curl -s "$API_URL/api/status" > /dev/null 2>&1; then
    echo -e "${YELLOW}正在启动卡若AI服务...${NC}"
    cd "/Users/karuo/Documents/个人/卡若AI/04_卡火（火）/火种_知识模型/本地模型/脚本/app"
    python3 server.py &
    sleep 3
fi

echo -e "${GREEN}✓ 服务已就绪${NC}"
echo ""

while true; do
    # 提示输入
    echo -e "${CYAN}你：${NC}" 
    read -r query
    
    # 退出条件
    if [[ "$query" == "q" || "$query" == "退出" || "$query" == "exit" ]]; then
        say "再见" using "Tingting"
        echo -e "${GREEN}再见！${NC}"
        break
    fi
    
    # 跳过空输入
    if [[ -z "$query" ]]; then
        continue
    fi
    
    # 发送请求
    echo -e "${YELLOW}思考中...${NC}"
    
    response=$(curl -s -X POST "$API_URL/api/chat" \
        -H "Content-Type: application/json" \
        -d "{\"message\": \"$query\", \"voice\": false}" \
        --max-time 60 2>/dev/null)
    
    # 解析回复
    answer=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('response','抱歉，出错了'))" 2>/dev/null)
    
    # 显示并朗读
    echo -e "${GREEN}卡若AI：${NC}$answer"
    echo ""
    
    # 语音播报（后台运行不阻塞）
    say "$answer" using "Tingting" &
done
