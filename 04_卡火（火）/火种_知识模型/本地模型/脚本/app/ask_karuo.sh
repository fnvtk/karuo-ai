#!/bin/bash
# 🔥 卡若AI 语音助手脚本
# 支持Siri快捷指令调用

API_URL="http://localhost:5888"
QUERY="$1"

# 如果没有参数，提示输入
if [ -z "$QUERY" ]; then
    echo "用法: ask_karuo.sh '你的问题'"
    exit 1
fi

# 确保服务运行
if ! curl -s "$API_URL/api/status" > /dev/null 2>&1; then
    echo "正在启动卡若AI服务..."
    cd "/Users/karuo/Documents/个人/卡若AI/_共享模块/local_llm/app"
    python3 server.py &
    sleep 3
fi

# 发送请求
RESPONSE=$(curl -s -X POST "$API_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"$QUERY\", \"voice\": true}" \
    --max-time 60 2>/dev/null)

# 提取回复
ANSWER=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('response','抱歉，出错了'))" 2>/dev/null)

echo "$ANSWER"
