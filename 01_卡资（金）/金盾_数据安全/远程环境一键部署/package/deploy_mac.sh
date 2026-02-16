#!/bin/bash
# ============================================================
# 卡若AI · 远程环境一键部署脚本 (macOS)
# 自动安装 Clash Verge Rev (代理) + Cursor (AI编辑器) + Docker Desktop (容器) + Linux 容器
# 版本: 1.0 | 日期: 2026-02-14 | 所属: 金盾
# ============================================================

set -euo pipefail

# ==================== 配置 ====================
SUBSCRIPTION_URL="https://api.v6v.eu/api/v1/client/subscribe?token=371fe0545c77e4d9efdf2906a865e403"
CURSOR_EMAIL="WilliamAtkins4153@outlook.com"
CURSOR_PASSWORD="?056uXrtaWKQ"
TEMP_DIR="/tmp/karuo_deploy"
CLASH_PROXY_PORT=7897

# ==================== 颜色 ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m'

# ==================== 工具函数 ====================
print_banner() {
    echo ""
    echo -e "${CYAN}  ╔══════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}  ║                                          ║${NC}"
    echo -e "${CYAN}  ║    卡若AI · 远程环境一键部署 v1.0        ║${NC}"
    echo -e "${CYAN}  ║                                          ║${NC}"
    echo -e "${CYAN}  ║    [1] Clash Verge Rev  代理客户端       ║${NC}"
    echo -e "${CYAN}  ║    [2] Cursor           AI 编辑器        ║${NC}"
    echo -e "${CYAN}  ║    [3] Docker Desktop   容器平台         ║${NC}"
    echo -e "${CYAN}  ║    [4] Ubuntu Linux     开发环境         ║${NC}"
    echo -e "${CYAN}  ║                                          ║${NC}"
    echo -e "${CYAN}  ╚══════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() { echo -e "\n  ${YELLOW}[$1] $2${NC}"; }
print_ok()   { echo -e "    ${GREEN}[OK] $1${NC}"; }
print_err()  { echo -e "    ${RED}[ERR] $1${NC}"; }
print_info() { echo -e "    ${GRAY}-> $1${NC}"; }

# ==================== 主流程 ====================
print_banner

START_TIME=$(date +%s)

# 检测系统架构
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    IS_ARM=true
    print_info "检测到 Apple Silicon (ARM64)"
else
    IS_ARM=false
    print_info "检测到 Intel (x86_64)"
fi

# 检测 Homebrew
HAS_BREW=false
if command -v brew &>/dev/null; then
    HAS_BREW=true
    print_ok "Homebrew 已安装"
else
    print_info "未检测到 Homebrew，将使用直接下载安装"
fi

# 创建临时目录
mkdir -p "$TEMP_DIR"

# ============================================================
# Step 1: 下载 Clash Verge Rev
# ============================================================
print_step "1/8" "下载 Clash Verge Rev (代理客户端)"

if [ -d "/Applications/Clash Verge.app" ]; then
    print_ok "Clash Verge Rev 已安装，跳过"
else
    if $HAS_BREW; then
        print_info "通过 Homebrew 安装..."
        brew install --cask clash-verge-rev 2>/dev/null || brew install --cask clash-verge 2>/dev/null || {
            print_err "Homebrew 安装失败，尝试直接下载"
            HAS_BREW=false
        }
    fi

    if ! [ -d "/Applications/Clash Verge.app" ] && ! $HAS_BREW; then
        print_info "从 GitHub 获取最新版本..."

        # 根据架构选择下载
        if $IS_ARM; then
            PATTERN="aarch64"
        else
            PATTERN="x64"
        fi

        CLASH_URL=$(curl -sL "https://api.github.com/repos/clash-verge-rev/clash-verge-rev/releases/latest" | \
            python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    assets = data.get('assets', [])
    for a in assets:
        name = a['name']
        if '${PATTERN}' in name and name.endswith('.dmg'):
            print(a['browser_download_url'])
            break
except:
    pass
" 2>/dev/null)

        if [ -n "$CLASH_URL" ]; then
            print_info "下载中..."
            curl -L --progress-bar -o "$TEMP_DIR/clash-verge.dmg" "$CLASH_URL"

            if [ -f "$TEMP_DIR/clash-verge.dmg" ]; then
                print_info "安装中..."
                hdiutil attach "$TEMP_DIR/clash-verge.dmg" -quiet -nobrowse 2>/dev/null

                # 查找挂载点
                MOUNT_POINT=$(find /Volumes -maxdepth 1 -name "*Clash*" -type d 2>/dev/null | head -1)
                if [ -n "$MOUNT_POINT" ]; then
                    APP_PATH=$(find "$MOUNT_POINT" -maxdepth 1 -name "*.app" -type d 2>/dev/null | head -1)
                    if [ -n "$APP_PATH" ]; then
                        cp -R "$APP_PATH" /Applications/
                        print_ok "Clash Verge Rev 安装完成"
                    fi
                    hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null
                fi
            fi
        else
            print_err "无法获取下载链接"
            print_info "请手动下载: https://github.com/clash-verge-rev/clash-verge-rev/releases"
        fi
    elif [ -d "/Applications/Clash Verge.app" ]; then
        print_ok "Clash Verge Rev 安装完成"
    fi
fi

# ============================================================
# Step 2: 跳过（合并到 Step 1）
# ============================================================
print_step "2/8" "安装验证"
if [ -d "/Applications/Clash Verge.app" ]; then
    print_ok "Clash Verge Rev 已就绪"
else
    print_err "Clash Verge Rev 未安装成功"
fi

# ============================================================
# Step 3: 配置代理订阅
# ============================================================
print_step "3/8" "配置代理订阅"

CLASH_CONFIG_DIR="$HOME/Library/Application Support/io.github.clash-verge-rev.clash-verge-rev"
mkdir -p "$CLASH_CONFIG_DIR/profiles"

PROFILE_UID=$(date +%s)000

cat > "$CLASH_CONFIG_DIR/profiles.yaml" << EOF
current: $PROFILE_UID
chain: []
valid:
  - $PROFILE_UID
items:
  - uid: $PROFILE_UID
    type: remote
    name: "KaruoAI Proxy"
    desc: "Auto Deploy"
    url: "$SUBSCRIPTION_URL"
    option:
      update_interval: 86400
      with_proxy: false
    updated: 0
EOF

print_ok "订阅配置已写入 profiles.yaml"

# 写入 verge.yaml
if [ ! -f "$CLASH_CONFIG_DIR/verge.yaml" ]; then
    cat > "$CLASH_CONFIG_DIR/verge.yaml" << 'EOF'
enable_system_proxy: true
enable_auto_launch: true
clash_core: mihomo
theme_mode: system
EOF
    print_ok "代理设置已写入 verge.yaml"
else
    print_info "verge.yaml 已存在，保留原配置"
fi

# ============================================================
# Step 4: 启动 Clash 并验证网络
# ============================================================
print_step "4/8" "启动代理并验证网络"

if [ -d "/Applications/Clash Verge.app" ]; then
    # 先关闭已有进程
    killall "Clash Verge" 2>/dev/null || true
    sleep 2

    print_info "启动 Clash Verge Rev..."
    open "/Applications/Clash Verge.app"
    print_info "等待代理初始化..."

    PROXY_READY=false
    for i in $(seq 1 12); do
        sleep 5
        if curl -s --proxy "http://127.0.0.1:$CLASH_PROXY_PORT" --max-time 5 "https://www.google.com" >/dev/null 2>&1; then
            PROXY_READY=true
            break
        fi
        printf "."
    done
    echo ""

    if $PROXY_READY; then
        print_ok "代理已就绪，Google 访问正常"
    else
        print_err "代理初始化超时（60秒）"
        print_info "请手动操作："
        print_info "  1. 打开 Clash Verge Rev"
        print_info "  2. 点击 Profiles → 更新订阅"
        print_info "  3. 选择一个节点"
        print_info "  4. 开启 System Proxy"
        echo ""
        read -p "    代理就绪后按回车继续..." _
    fi
else
    print_err "未找到 Clash Verge Rev"
    print_info "跳过代理启动"
fi

# ============================================================
# Step 5: 下载并安装 Cursor
# ============================================================
print_step "5/8" "下载并安装 Cursor (AI 编辑器)"

if [ -d "/Applications/Cursor.app" ]; then
    print_ok "Cursor 已安装，跳过"
else
    if $HAS_BREW; then
        print_info "通过 Homebrew 安装..."
        brew install --cask cursor 2>/dev/null || {
            print_info "Homebrew 安装失败，尝试直接下载"
            HAS_BREW=false
        }
    fi

    if ! [ -d "/Applications/Cursor.app" ] && ! $HAS_BREW; then
        if $IS_ARM; then
            CURSOR_URL="https://downloader.cursor.sh/arm64/darwin/stable/latest"
        else
            CURSOR_URL="https://downloader.cursor.sh/darwin/stable/latest"
        fi

        CURL_OPTS=""
        if $PROXY_READY 2>/dev/null; then
            CURL_OPTS="--proxy http://127.0.0.1:$CLASH_PROXY_PORT"
        fi

        print_info "下载 Cursor..."
        curl -L $CURL_OPTS --progress-bar -o "$TEMP_DIR/Cursor.dmg" "$CURSOR_URL"

        if [ -f "$TEMP_DIR/Cursor.dmg" ]; then
            print_info "安装中..."
            hdiutil attach "$TEMP_DIR/Cursor.dmg" -quiet -nobrowse 2>/dev/null

            MOUNT_POINT=$(find /Volumes -maxdepth 1 -name "*Cursor*" -type d 2>/dev/null | head -1)
            if [ -n "$MOUNT_POINT" ]; then
                APP_PATH=$(find "$MOUNT_POINT" -maxdepth 1 -name "*.app" -type d 2>/dev/null | head -1)
                if [ -n "$APP_PATH" ]; then
                    cp -R "$APP_PATH" /Applications/
                    print_ok "Cursor 安装完成"
                fi
                hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null
            fi
        fi
    elif [ -d "/Applications/Cursor.app" ]; then
        print_ok "Cursor 安装完成"
    fi
fi

# ============================================================
# Step 6: 保存 Cursor 登录信息
# ============================================================
print_step "6/8" "保存 Cursor 登录信息"

CRED_FILE="$HOME/Desktop/Cursor登录信息.txt"
cat > "$CRED_FILE" << EOF
================================================
  Cursor 登录信息
  由 卡若AI 自动部署生成
  $(date '+%Y-%m-%d %H:%M:%S')
================================================

  邮箱:  $CURSOR_EMAIL
  密码:  $CURSOR_PASSWORD

  使用方法:
  1. 打开 Cursor
  2. 点击左下角齿轮 → Sign In
  3. 选择 Email 登录
  4. 输入上述邮箱和密码
  5. 登录成功后请立即删除此文件

================================================
  !! 安全提示: 登录完成后请立即删除此文件 !!
================================================
EOF

print_ok "登录信息已保存到桌面: Cursor登录信息.txt"

# ============================================================
# Step 7: 安装 Docker Desktop + 配置国内镜像
# ============================================================
print_step "7/8" "安装 Docker Desktop + 配置国内镜像"

DOCKER_INSTALLED=false
if command -v docker &>/dev/null; then
    DOCKER_INSTALLED=true
    print_ok "Docker 已安装: $(docker --version 2>/dev/null)"
elif [ -d "/Applications/Docker.app" ]; then
    DOCKER_INSTALLED=true
    print_ok "Docker Desktop 已安装"
fi

if ! $DOCKER_INSTALLED; then
    if $HAS_BREW; then
        print_info "通过 Homebrew 安装 Docker Desktop..."
        brew install --cask docker 2>/dev/null || {
            print_err "Homebrew 安装失败，尝试直接下载"
            HAS_BREW=false
        }
    fi

    if ! [ -d "/Applications/Docker.app" ] && ! $HAS_BREW; then
        print_info "下载 Docker Desktop..."
        if $IS_ARM; then
            DOCKER_URL="https://desktop.docker.com/mac/main/arm64/Docker.dmg"
        else
            DOCKER_URL="https://desktop.docker.com/mac/main/amd64/Docker.dmg"
        fi

        CURL_OPTS=""
        if ${PROXY_READY:-false} 2>/dev/null; then
            CURL_OPTS="--proxy http://127.0.0.1:$CLASH_PROXY_PORT"
        fi

        curl -L $CURL_OPTS --progress-bar -o "$TEMP_DIR/Docker.dmg" "$DOCKER_URL"

        if [ -f "$TEMP_DIR/Docker.dmg" ]; then
            print_info "安装 Docker Desktop..."
            hdiutil attach "$TEMP_DIR/Docker.dmg" -quiet -nobrowse 2>/dev/null
            MOUNT_POINT=$(find /Volumes -maxdepth 1 -name "*Docker*" -type d 2>/dev/null | head -1)
            if [ -n "$MOUNT_POINT" ]; then
                APP_PATH=$(find "$MOUNT_POINT" -maxdepth 1 -name "*.app" -type d 2>/dev/null | head -1)
                if [ -n "$APP_PATH" ]; then
                    cp -R "$APP_PATH" /Applications/
                    print_ok "Docker Desktop 安装完成"
                    DOCKER_INSTALLED=true
                fi
                hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null
            fi
        fi
    elif [ -d "/Applications/Docker.app" ]; then
        DOCKER_INSTALLED=true
        print_ok "Docker Desktop 安装完成"
    fi
fi

# 配置国内镜像加速
print_info "配置 Docker 国内镜像加速..."
DOCKER_CONFIG_DIR="$HOME/.docker"
mkdir -p "$DOCKER_CONFIG_DIR"
DAEMON_JSON="$DOCKER_CONFIG_DIR/daemon.json"

if [ ! -f "$DAEMON_JSON" ]; then
    cat > "$DAEMON_JSON" << 'MIRROREOF'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://registry.docker-cn.com"
  ]
}
MIRROREOF
    print_ok "国内镜像配置已写入 daemon.json"
else
    if ! grep -q "registry-mirrors" "$DAEMON_JSON" 2>/dev/null; then
        # 简单合并：备份原文件，写入新配置
        cp "$DAEMON_JSON" "$DAEMON_JSON.bak"
        python3 -c "
import json
with open('$DAEMON_JSON') as f:
    cfg = json.load(f)
cfg['registry-mirrors'] = [
    'https://mirror.ccs.tencentyun.com',
    'https://docker.mirrors.ustc.edu.cn',
    'https://hub-mirror.c.163.com',
    'https://registry.docker-cn.com'
]
with open('$DAEMON_JSON', 'w') as f:
    json.dump(cfg, f, indent=2)
" 2>/dev/null && print_ok "已合并国内镜像到现有 daemon.json" || print_info "请手动配置 Docker 镜像"
    else
        print_info "daemon.json 已有镜像配置，保留原设置"
    fi
fi

# 启动 Docker Desktop
if $DOCKER_INSTALLED && [ -d "/Applications/Docker.app" ]; then
    print_info "启动 Docker Desktop..."
    open "/Applications/Docker.app"

    print_info "等待 Docker 引擎就绪（最多120秒）..."
    DOCKER_READY=false
    for i in $(seq 1 24); do
        sleep 5
        if docker info >/dev/null 2>&1; then
            DOCKER_READY=true
            break
        fi
        printf "."
    done
    echo ""

    if $DOCKER_READY; then
        print_ok "Docker 引擎已就绪"
    else
        print_err "Docker 引擎启动超时"
        print_info "请手动启动 Docker Desktop 后重新运行脚本"
    fi
fi

# ============================================================
# Step 8: 部署 Linux 开发容器
# ============================================================
print_step "8/8" "部署 Linux 开发容器"

DOCKER_READY=false
if docker info >/dev/null 2>&1; then
    DOCKER_READY=true
fi

if $DOCKER_READY; then
    # --- Ubuntu Linux 容器 ---
    print_info "拉取 Ubuntu 22.04 镜像..."
    docker pull ubuntu:22.04

    # 检查容器是否已存在
    EXISTING=$(docker ps -a --filter "name=karuo-linux" --format "{{.Names}}" 2>/dev/null)
    if [ "$EXISTING" = "karuo-linux" ]; then
        print_info "容器 karuo-linux 已存在，重新创建..."
        docker rm -f karuo-linux >/dev/null 2>&1
    fi

    print_info "创建 Ubuntu 开发容器..."
    docker run -d \
        --name karuo-linux \
        --hostname karuo-dev \
        -v karuo-workspace:/workspace \
        --restart unless-stopped \
        ubuntu:22.04 \
        tail -f /dev/null

    print_info "安装开发工具（git/curl/python3/node/vim）..."
    docker exec karuo-linux bash -c '
        # 替换为清华 apt 源（国内加速）
        cat > /etc/apt/sources.list << APTEOF
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy main restricted universe multiverse
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-updates main restricted universe multiverse
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-security main restricted universe multiverse
APTEOF
        apt-get update -qq && \
        DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
            curl wget git vim nano \
            python3 python3-pip \
            nodejs npm \
            build-essential \
            openssh-server \
            htop net-tools iputils-ping \
            locales && \
        locale-gen en_US.UTF-8 && \
        echo "alias ll='"'"'ls -la'"'"'" >> /root/.bashrc && \
        echo "export LANG=en_US.UTF-8" >> /root/.bashrc && \
        echo "开发环境初始化完成"
    '

    if [ $? -eq 0 ]; then
        print_ok "Ubuntu Linux 容器已就绪"
    else
        print_err "容器初始化部分失败，但容器已创建"
    fi

    # --- macOS 容器说明 ---
    echo ""
    print_info "关于 macOS 容器："
    print_info "  macOS 上已在原生环境中，无需 Docker 运行 macOS"
    print_info "  如需在 Linux 服务器上运行 macOS 容器："
    print_info "    docker pull sickcodes/docker-osx:auto"
    print_info "    docker run -it --device /dev/kvm sickcodes/docker-osx:auto"

    # 容器使用说明
    echo ""
    print_info "=== 容器使用方法 ==="
    print_info "进入 Linux:  docker exec -it karuo-linux bash"
    print_info "停止容器:    docker stop karuo-linux"
    print_info "启动容器:    docker start karuo-linux"
    print_info "工作目录:    容器内 /workspace（持久化存储）"

else
    print_err "Docker 未就绪，跳过容器部署"
    print_info "请先启动 Docker Desktop，然后运行以下命令手动部署："
    print_info "  docker pull ubuntu:22.04"
    print_info "  docker run -d --name karuo-linux --hostname karuo-dev -v karuo-workspace:/workspace --restart unless-stopped ubuntu:22.04 tail -f /dev/null"
fi

# ============================================================
# 完成总结
# ============================================================
END_TIME=$(date +%s)
ELAPSED=$(( (END_TIME - START_TIME) / 60 ))

echo ""
echo -e "  ${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "  ${GREEN}║         部 署 完 成 !                    ║${NC}"
echo -e "  ${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}已安装软件:${NC}"
echo "    [1] Clash Verge Rev - 代理客户端（订阅已配置）"
echo "    [2] Cursor          - AI 编辑器"
echo "    [3] Docker Desktop  - 容器平台（国内镜像已配置）"
echo "    [4] Ubuntu Linux    - 开发容器 (karuo-linux)"
echo ""
echo -e "  ${CYAN}Cursor 登录信息:${NC}"
echo "    邮箱: $CURSOR_EMAIL"
echo "    密码: $CURSOR_PASSWORD"
echo ""
echo -e "  ${CYAN}Docker 容器:${NC}"
echo "    进入 Linux:  docker exec -it karuo-linux bash"
echo "    工作目录:    /workspace（持久化）"
echo ""
echo -e "  ${YELLOW}[!] 请登录 Cursor 后删除桌面上的 Cursor登录信息.txt${NC}"
echo -e "  ${GRAY}耗时: ${ELAPSED} 分钟${NC}"
echo ""

# 清理
read -p "  是否清理临时下载文件？(y/N) " cleanup
if [ "$cleanup" = "y" ] || [ "$cleanup" = "Y" ]; then
    rm -rf "$TEMP_DIR"
    print_ok "临时文件已清理"
fi

echo ""
echo "  部署完成，感谢使用卡若AI！"
echo ""
