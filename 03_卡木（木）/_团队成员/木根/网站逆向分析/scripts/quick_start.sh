#!/bin/bash
#
# 网站逆向分析 - 快速启动脚本
# 用法: ./quick_start.sh <目标URL>
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${BASE_DIR}/output"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    info "检查依赖..."
    
    # 检查Python
    if ! command -v python3 &> /dev/null; then
        error "Python3 未安装"
        exit 1
    fi
    
    # 检查pip
    if ! command -v pip3 &> /dev/null; then
        error "pip3 未安装"
        exit 1
    fi
    
    # 检查playwright
    if ! python3 -c "import playwright" 2>/dev/null; then
        warn "playwright 未安装，正在安装..."
        pip3 install playwright
        playwright install chromium
    fi
    
    # 检查其他依赖
    if ! python3 -c "import aiohttp" 2>/dev/null; then
        warn "部分依赖未安装，正在安装..."
        pip3 install -r "${BASE_DIR}/requirements.txt"
    fi
    
    info "依赖检查完成"
}

# 显示帮助
show_help() {
    echo "网站逆向分析工具"
    echo ""
    echo "用法: $0 [选项] <目标URL>"
    echo ""
    echo "选项:"
    echo "  -l, --login       执行登录流程（显示浏览器）"
    echo "  -o, --output DIR  指定输出目录 (默认: ./output)"
    echo "  -s, --sdk TYPE    生成SDK (python/php)"
    echo "  -d, --deploy      生成Docker部署文件"
    echo "  -p, --port PORT   部署服务端口 (默认: 8080)"
    echo "  -h, --help        显示帮助"
    echo ""
    echo "示例:"
    echo "  $0 https://example.com"
    echo "  $0 --login https://example.com"
    echo "  $0 --login --sdk python --deploy https://example.com"
}

# 主函数
main() {
    # 默认参数
    TARGET_URL=""
    DO_LOGIN=false
    OUTPUT_DIR="${BASE_DIR}/output"
    SDK_TYPE=""
    DO_DEPLOY=false
    DEPLOY_PORT=8080
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -l|--login)
                DO_LOGIN=true
                shift
                ;;
            -o|--output)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            -s|--sdk)
                SDK_TYPE="$2"
                shift 2
                ;;
            -d|--deploy)
                DO_DEPLOY=true
                shift
                ;;
            -p|--port)
                DEPLOY_PORT="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                TARGET_URL="$1"
                shift
                ;;
        esac
    done
    
    # 检查URL
    if [[ -z "$TARGET_URL" ]]; then
        error "请提供目标URL"
        show_help
        exit 1
    fi
    
    # 创建输出目录
    mkdir -p "$OUTPUT_DIR"
    
    # 检查依赖
    check_dependencies
    
    # 从URL提取站点名
    SITE_NAME=$(echo "$TARGET_URL" | sed -E 's|https?://||' | sed 's|/.*||' | tr '.' '_')
    ANALYSIS_FILE="${OUTPUT_DIR}/${SITE_NAME}_analysis.json"
    
    echo ""
    echo "========================================"
    echo "  网站逆向分析工具"
    echo "========================================"
    echo "目标: $TARGET_URL"
    echo "输出: $OUTPUT_DIR"
    echo "========================================"
    echo ""
    
    # 步骤1: 分析网站
    info "步骤1: 分析网站..."
    
    LOGIN_FLAG=""
    if $DO_LOGIN; then
        LOGIN_FLAG="--login"
    fi
    
    python3 "${SCRIPT_DIR}/site_analyzer.py" \
        --url "$TARGET_URL" \
        --output "$OUTPUT_DIR" \
        $LOGIN_FLAG
    
    # 检查分析结果
    if [[ ! -f "$ANALYSIS_FILE" ]]; then
        error "分析失败，未生成结果文件"
        exit 1
    fi
    
    info "分析完成: $ANALYSIS_FILE"
    
    # 步骤2: 生成SDK（如果指定）
    if [[ -n "$SDK_TYPE" ]]; then
        info "步骤2: 生成 $SDK_TYPE SDK..."
        
        python3 "${SCRIPT_DIR}/sdk_generator.py" \
            --input "$ANALYSIS_FILE" \
            --template "$SDK_TYPE" \
            --output "$OUTPUT_DIR"
        
        info "SDK生成完成"
    fi
    
    # 步骤3: 生成部署文件（如果指定）
    if $DO_DEPLOY; then
        info "步骤3: 生成Docker部署文件..."
        
        python3 "${SCRIPT_DIR}/docker_deploy.py" \
            --input "$ANALYSIS_FILE" \
            --output "$OUTPUT_DIR" \
            --port "$DEPLOY_PORT"
        
        info "部署文件生成完成"
    fi
    
    echo ""
    echo "========================================"
    echo "  完成！"
    echo "========================================"
    echo ""
    echo "生成的文件:"
    ls -la "$OUTPUT_DIR"
    echo ""
    
    if $DO_DEPLOY; then
        echo "启动服务:"
        echo "  cd ${OUTPUT_DIR}/${SITE_NAME}_deploy"
        echo "  docker-compose up -d"
        echo ""
        echo "API文档: http://localhost:${DEPLOY_PORT}/docs"
    fi
}

# 运行
main "$@"
