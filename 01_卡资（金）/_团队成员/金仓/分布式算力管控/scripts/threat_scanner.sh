#!/bin/bash
# ============================================================
#  威胁扫描器 - 检测挖矿木马、后门、可疑活动
#  直接在目标机器上执行即可
#  用法: bash threat_scanner.sh
# ============================================================

RED='\033[91m'; GREEN='\033[92m'; YELLOW='\033[93m'
BLUE='\033[94m'; CYAN='\033[96m'; NC='\033[0m'

CRITICAL=0; WARNING=0; INFO=0

banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║            威胁扫描器 v1.0                            ║"
    echo "║            检测挖矿木马、后门、可疑活动               ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

critical() { echo -e "${RED}🚨 [严重] $1${NC}"; ((CRITICAL++)); }
warning()  { echo -e "${YELLOW}⚠️  [警告] $1${NC}"; ((WARNING++)); }
info()     { echo -e "${BLUE}ℹ️  [信息] $1${NC}"; ((INFO++)); }

# ---- 1. 扫描恶意文件路径 ----
scan_paths() {
    echo -e "\n${CYAN}[1/6] 扫描恶意文件路径...${NC}"
    
    local PATHS=(
        "/tmp/.systemdpw"
        "/tmp/.X11-unix/.rsync"
        "/tmp/.font-unix"
        "/var/tmp/.cache"
        "/dev/shm/.x"
    )
    
    for p in "${PATHS[@]}"; do
        if [ -e "$p" ]; then
            critical "发现恶意路径: $p"
            ls -la "$p" 2>/dev/null | head -5 | while read line; do
                echo "        → $line"
            done
        fi
    done
    
    # 检查用户目录
    for home in /home/*; do
        [ ! -d "$home" ] && continue
        local USER=$(basename "$home")
        
        for suspect in ".config/sys-update-daemon" "c3pool" ".c3pool" ".xmrig"; do
            if [ -e "$home/$suspect" ]; then
                critical "发现恶意文件: $home/$suspect (用户: $USER)"
            fi
        done
    done
    
    # 检查 /tmp 下的隐藏文件
    local HIDDEN=$(find /tmp -maxdepth 1 -name ".*" -not -name "." -not -name ".." 2>/dev/null)
    if [ -n "$HIDDEN" ]; then
        echo "$HIDDEN" | while read f; do
            if [ "$f" != "/tmp/.X11-unix" ] && [ "$f" != "/tmp/.ICE-unix" ] && [ "$f" != "/tmp/.font-unix" ]; then
                warning "可疑隐藏文件: $f"
            fi
        done
    fi
}

# ---- 2. 扫描恶意进程 ----
scan_processes() {
    echo -e "\n${CYAN}[2/6] 扫描恶意进程...${NC}"
    
    local PROCS="xmrig|xmr-stak|minerd|cpuminer|kdevtmpfsi|kinsing|sys-update-daemon|cryptonight|hashvault"
    
    ps aux 2>/dev/null | grep -iE "$PROCS" | grep -v grep | while read line; do
        critical "恶意进程: $line"
    done
    
    # 高CPU进程
    ps aux --sort=-%cpu 2>/dev/null | head -6 | tail -5 | while read line; do
        local CPU=$(echo "$line" | awk '{print $3}')
        if (( $(echo "$CPU > 80" | bc -l 2>/dev/null || echo 0) )); then
            warning "高CPU进程 (${CPU}%): $(echo $line | awk '{print $11}')"
        fi
    done
}

# ---- 3. 扫描定时任务 ----
scan_crontabs() {
    echo -e "\n${CYAN}[3/6] 扫描定时任务...${NC}"
    
    local SUSPECTS="daemon|miner|pool|xmrig|\.config|c3pool|hashvault|update-daemon"
    
    # root crontab
    crontab -l 2>/dev/null | grep -iE "$SUSPECTS" | while read line; do
        critical "root恶意crontab: $line"
    done
    
    # 其他用户
    for home in /home/*; do
        [ ! -d "$home" ] && continue
        local USER=$(basename "$home")
        crontab -u "$USER" -l 2>/dev/null | grep -iE "$SUSPECTS" | while read line; do
            critical "${USER}恶意crontab: $line"
        done
    done
    
    # /etc/cron.*
    for d in /etc/cron.d /etc/cron.daily /etc/cron.hourly; do
        ls "$d" 2>/dev/null | while read f; do
            grep -ilE "$SUSPECTS" "$d/$f" 2>/dev/null && warning "可疑cron文件: $d/$f"
        done
    done
}

# ---- 4. 扫描网络连接 ----
scan_network() {
    echo -e "\n${CYAN}[4/6] 扫描网络连接...${NC}"
    
    local POOLS="hashvault|c3pool|nanopool|minexmr|supportxmr|minergate|moneroocean|xmrpool"
    local PORTS="3333|5555|7777|14433|14444|45700|45560"
    
    local CONNS=$(ss -tnp 2>/dev/null || netstat -tnp 2>/dev/null)
    
    echo "$CONNS" | grep -iE "$POOLS" | while read line; do
        critical "矿池连接: $line"
    done
    
    echo "$CONNS" | grep -E ":($PORTS)" | grep ESTAB | while read line; do
        warning "可疑端口连接: $line"
    done
    
    local ESTAB_COUNT=$(echo "$CONNS" | grep ESTAB | wc -l)
    if [ "$ESTAB_COUNT" -gt 50 ]; then
        warning "大量活跃连接: ${ESTAB_COUNT}个"
    fi
}

# ---- 5. 扫描SSH日志 ----
scan_ssh_logs() {
    echo -e "\n${CYAN}[5/6] 扫描SSH日志...${NC}"
    
    local LOG="/var/log/secure"
    [ ! -f "$LOG" ] && LOG="/var/log/auth.log"
    [ ! -f "$LOG" ] && { info "未找到SSH日志"; return; }
    
    # 统计暴破IP
    local TOP_FAIL=$(grep "Failed password" "$LOG" 2>/dev/null | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | sort | uniq -c | sort -rn | head -5)
    
    if [ -n "$TOP_FAIL" ]; then
        echo "$TOP_FAIL" | while read count ip; do
            if [ "$count" -gt 50 ]; then
                warning "暴力破解: $ip ($count 次失败)"
            fi
        done
    fi
    
    # 统计成功登录
    local SUCC=$(grep "Accepted password" "$LOG" 2>/dev/null | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | sort -u)
    if [ -n "$SUCC" ]; then
        echo "$SUCC" | while read ip; do
            if [[ ! "$ip" =~ ^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.) ]]; then
                info "外部成功登录: $ip"
            fi
        done
    fi
}

# ---- 6. 扫描systemd服务 ----
scan_systemd() {
    echo -e "\n${CYAN}[6/6] 扫描systemd服务...${NC}"
    
    systemctl list-unit-files --type=service 2>/dev/null | grep enabled | grep -iE "miner|crypto|update-daemon|xmr" | while read line; do
        warning "可疑systemd服务: $line"
    done
}

# ---- 输出总结 ----
summary() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  扫描完成${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "  🚨 严重: ${RED}$CRITICAL${NC}"
    echo -e "  ⚠️  警告: ${YELLOW}$WARNING${NC}"
    echo -e "  ℹ️  信息: ${BLUE}$INFO${NC}"
    echo ""
    
    if [ "$CRITICAL" -gt 0 ]; then
        echo -e "  ${RED}发现严重威胁！建议立即执行 threat_cleaner.sh${NC}"
    elif [ "$WARNING" -gt 0 ]; then
        echo -e "  ${YELLOW}存在可疑活动，建议进一步检查${NC}"
    else
        echo -e "  ${GREEN}未发现明显威胁${NC}"
    fi
}

# ---- 主流程 ----
banner
scan_paths
scan_processes
scan_crontabs
scan_network
scan_ssh_logs
scan_systemd
summary
