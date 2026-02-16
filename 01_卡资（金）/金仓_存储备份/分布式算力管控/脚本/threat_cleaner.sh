#!/bin/bash
# ============================================================
#  威胁清除器 - 自动清除挖矿木马和后门
#  直接在目标机器上执行
#  用法: bash threat_cleaner.sh [--auto]
# ============================================================

RED='\033[91m'; GREEN='\033[92m'; YELLOW='\033[93m'
BLUE='\033[94m'; CYAN='\033[96m'; NC='\033[0m'

AUTO=false
[ "$1" = "--auto" ] && AUTO=true

banner() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║            威胁清除器 v1.0                            ║"
    echo "║            自动清除挖矿木马和后门                     ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; }
step() { echo -e "\n${BLUE}[*] $1${NC}"; }

confirm() {
    if $AUTO; then return 0; fi
    read -p "$(echo -e ${YELLOW})[?] $1 (y/N): $(echo -e ${NC})" choice
    [[ "$choice" =~ ^[Yy]$ ]]
}

banner

# ---- 阶段1: 杀死恶意进程 ----
step "阶段1: 杀死恶意进程"

PROCS="xmrig|xmr-stak|minerd|cpuminer|kdevtmpfsi|kinsing|sys-update-daemon|cryptonight"

FOUND=$(ps aux | grep -iE "$PROCS" | grep -v grep | awk '{print $2}')
if [ -n "$FOUND" ]; then
    echo "$FOUND" | while read pid; do
        PNAME=$(ps -p "$pid" -o comm= 2>/dev/null)
        if confirm "杀死进程 $pid ($PNAME)?"; then
            kill -9 "$pid" 2>/dev/null && ok "已杀死: $pid ($PNAME)" || fail "杀死失败: $pid"
        fi
    done
else
    ok "未发现恶意进程"
fi

# ---- 阶段2: 删除恶意文件 ----
step "阶段2: 删除恶意文件"

EVIL_PATHS=(
    "/tmp/.systemdpw"
    "/tmp/.X11-unix/.rsync"
    "/var/tmp/.cache"
    "/dev/shm/.x"
    "/tmp/.font-unix"
)

for p in "${EVIL_PATHS[@]}"; do
    if [ -e "$p" ]; then
        if confirm "删除 $p?"; then
            rm -rf "$p" && ok "已删除: $p" || fail "删除失败: $p"
        fi
    fi
done

# 用户目录
for home in /home/*; do
    [ ! -d "$home" ] && continue
    USER=$(basename "$home")
    
    for suspect in ".config/sys-update-daemon" "c3pool" ".c3pool" ".xmrig"; do
        TARGET="$home/$suspect"
        if [ -e "$TARGET" ]; then
            if confirm "删除 $TARGET (用户: $USER)?"; then
                rm -rf "$TARGET" && ok "已删除: $TARGET" || fail "删除失败: $TARGET"
            fi
        fi
    done
done

# systemwatcher日志
find /tmp -maxdepth 1 -name "systemwatcher*" 2>/dev/null | while read f; do
    if confirm "删除日志 $f?"; then
        rm -f "$f" && ok "已删除: $f"
    fi
done

# ---- 阶段3: 清理恶意定时任务 ----
step "阶段3: 清理恶意定时任务"

CRON_EVIL="sys-update-daemon|miner|xmrig|c3pool|hashvault|nanopool|update-daemon"

# root crontab
ROOT_CRON=$(crontab -l 2>/dev/null)
if echo "$ROOT_CRON" | grep -qiE "$CRON_EVIL"; then
    if confirm "清理root中的恶意crontab?"; then
        echo "$ROOT_CRON" | grep -viE "$CRON_EVIL" | crontab -
        ok "已清理root crontab"
    fi
fi

# 其他用户
for home in /home/*; do
    [ ! -d "$home" ] && continue
    USER=$(basename "$home")
    
    USER_CRON=$(crontab -u "$USER" -l 2>/dev/null)
    if echo "$USER_CRON" | grep -qiE "$CRON_EVIL"; then
        if confirm "清理${USER}的恶意crontab?"; then
            CLEAN=$(echo "$USER_CRON" | grep -viE "$CRON_EVIL")
            if [ -z "$CLEAN" ]; then
                crontab -u "$USER" -r 2>/dev/null
            else
                echo "$CLEAN" | crontab -u "$USER" -
            fi
            ok "已清理${USER}的crontab"
        fi
    fi
done

# ---- 阶段4: 封禁攻击IP ----
step "阶段4: 封禁暴力破解IP"

LOG="/var/log/secure"
[ ! -f "$LOG" ] && LOG="/var/log/auth.log"

if [ -f "$LOG" ]; then
    ATTACK_IPS=$(grep "Failed password" "$LOG" 2>/dev/null | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | sort | uniq -c | sort -rn | awk '$1>50{print $2}' | head -10)
    
    if [ -n "$ATTACK_IPS" ]; then
        echo "$ATTACK_IPS" | while read ip; do
            if confirm "封禁IP $ip?"; then
                iptables -I INPUT -s "$ip" -j DROP 2>/dev/null && ok "已封禁: $ip" || fail "封禁失败: $ip"
            fi
        done
        
        # 保存规则
        iptables-save > /etc/sysconfig/iptables 2>/dev/null || true
    else
        ok "未发现需要封禁的IP"
    fi
fi

# ---- 阶段5: 移除恶意systemd服务 ----
step "阶段5: 检查恶意systemd服务"

systemctl list-unit-files --type=service 2>/dev/null | grep enabled | grep -iE "miner|crypto|xmr|update-daemon" | awk '{print $1}' | while read svc; do
    if confirm "禁用服务 $svc?"; then
        systemctl stop "$svc" 2>/dev/null
        systemctl disable "$svc" 2>/dev/null
        ok "已禁用: $svc"
    fi
done

# ---- 总结 ----
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  清理完成！${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${YELLOW}建议后续操作：${NC}"
echo "  1. 修改服务器密码:  passwd root"
echo "  2. 安装fail2ban:    yum install -y fail2ban && systemctl enable fail2ban"
echo "  3. 禁用密码登录:    编辑 /etc/ssh/sshd_config"
echo "  4. 重启SSH服务:     systemctl restart sshd"
echo ""
