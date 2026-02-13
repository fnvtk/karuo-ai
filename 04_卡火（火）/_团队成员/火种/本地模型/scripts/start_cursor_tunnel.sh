#!/bin/bash
# ================================================================
# 卡若AI 本地模型 Cursor 隧道启动脚本
# 
# 用法: ./start_cursor_tunnel.sh
# 
# 功能: 
#   1. 启动Ollama服务（允许外部访问）
#   2. 创建Cloudflare隧道
#   3. 输出隧道URL供Cursor使用
# ================================================================

echo "🔥 卡若AI 本地模型 Cursor 集成"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查依赖
check_deps() {
    echo "检查依赖..."
    
    if ! command -v ollama &> /dev/null; then
        echo -e "${RED}❌ Ollama未安装${NC}"
        echo "请运行: brew install ollama"
        exit 1
    fi
    
    if ! command -v cloudflared &> /dev/null; then
        echo -e "${RED}❌ Cloudflared未安装${NC}"
        echo "请运行: brew install cloudflared"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 依赖检查通过${NC}"
}

# 停止旧进程
cleanup() {
    echo "清理旧进程..."
    pkill ollama 2>/dev/null
    pkill cloudflared 2>/dev/null
    sleep 2
}

# 启动Ollama
start_ollama() {
    echo "启动Ollama服务..."
    OLLAMA_HOST=0.0.0.0:11434 OLLAMA_ORIGINS="*" ollama serve > /tmp/ollama.log 2>&1 &
    sleep 5
    
    # 验证
    if curl -s http://localhost:11434/api/tags > /dev/null; then
        echo -e "${GREEN}✅ Ollama服务启动成功${NC}"
    else
        echo -e "${RED}❌ Ollama服务启动失败${NC}"
        cat /tmp/ollama.log
        exit 1
    fi
}

# 创建隧道
start_tunnel() {
    echo "创建Cloudflare隧道..."
    cloudflared tunnel --url http://localhost:11434 > /tmp/cloudflared.log 2>&1 &
    
    # 等待隧道创建
    echo "等待隧道建立..."
    for i in {1..20}; do
        sleep 1
        TUNNEL_URL=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' /tmp/cloudflared.log 2>/dev/null | head -1)
        if [ -n "$TUNNEL_URL" ]; then
            break
        fi
        echo -n "."
    done
    echo ""
    
    if [ -z "$TUNNEL_URL" ]; then
        echo -e "${RED}❌ 隧道创建失败${NC}"
        cat /tmp/cloudflared.log
        exit 1
    fi
    
    echo -e "${GREEN}✅ 隧道创建成功${NC}"
}

# 测试隧道
test_tunnel() {
    echo "测试隧道连接..."
    RESPONSE=$(curl -s --max-time 10 "$TUNNEL_URL/api/tags" | head -c 50)
    if [ -n "$RESPONSE" ]; then
        echo -e "${GREEN}✅ 隧道测试通过${NC}"
    else
        echo -e "${YELLOW}⚠️ 隧道可能需要几秒钟才能就绪${NC}"
    fi
}

# 显示配置说明
show_config() {
    echo ""
    echo "================================"
    echo -e "${GREEN}🎉 本地模型隧道已就绪！${NC}"
    echo "================================"
    echo ""
    echo -e "${YELLOW}📋 Cursor配置步骤:${NC}"
    echo ""
    echo "1. 打开 Cursor Settings (Cmd+,)"
    echo "2. 搜索 'OpenAI' 或 'API'"
    echo "3. 找到 'OpenAI API Key' 设置"
    echo "4. 填入任意值，如: ollama"
    echo "5. 找到 'Override OpenAI Base URL' 设置"
    echo "6. 填入以下URL:"
    echo ""
    echo -e "   ${GREEN}$TUNNEL_URL/v1${NC}"
    echo ""
    echo "7. 在模型选择器中选择 'gpt-4' 或其他OpenAI模型"
    echo "   (实际会使用本地的 qwen2.5:0.5b)"
    echo ""
    echo "================================"
    echo -e "${YELLOW}⚠️ 注意事项:${NC}"
    echo "- 隧道URL每次启动会变化"
    echo "- 保持此终端窗口运行"
    echo "- 按 Ctrl+C 停止服务"
    echo "================================"
    echo ""
    echo "隧道URL已复制到剪贴板（如果可用）"
    echo "$TUNNEL_URL/v1" | pbcopy 2>/dev/null || true
}

# 保持运行
keep_alive() {
    echo "服务运行中... 按 Ctrl+C 停止"
    echo ""
    
    # 捕获退出信号
    trap cleanup EXIT
    
    # 保持脚本运行
    while true; do
        sleep 60
        # 定期检查服务状态
        if ! pgrep -x "ollama" > /dev/null; then
            echo -e "${RED}❌ Ollama服务已停止${NC}"
            exit 1
        fi
        if ! pgrep -x "cloudflared" > /dev/null; then
            echo -e "${RED}❌ 隧道服务已停止${NC}"
            exit 1
        fi
    done
}

# 主流程
main() {
    check_deps
    cleanup
    start_ollama
    start_tunnel
    test_tunnel
    show_config
    keep_alive
}

main
