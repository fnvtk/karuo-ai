#!/bin/bash
# ============================================================
#  SSH安全加固 - 防暴力破解
#  用法: bash ssh_hardening.sh [--level basic|medium|high]
# ============================================================

RED='\033[91m'; GREEN='\033[92m'; YELLOW='\033[93m'
BLUE='\033[94m'; CYAN='\033[96m'; NC='\033[0m'

LEVEL="${1:---level}"
[ "$1" = "--level" ] && LEVEL="$2"
[ -z "$LEVEL" ] || [ "$LEVEL" = "--level" ] && LEVEL="medium"

ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
step() { echo -e "\n${BLUE}[*] $1${NC}"; }

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║            SSH安全加固 v1.0                           ║"
echo "║            级别: $LEVEL                                "
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ---- 备份 ----
step "备份SSH配置"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp /etc/ssh/sshd_config "/etc/ssh/sshd_config.bak_$TIMESTAMP"
ok "已备份: /etc/ssh/sshd_config.bak_$TIMESTAMP"

# ---- 基础加固 (basic/medium/high) ----
step "基础加固"

SSHD="/etc/ssh/sshd_config"

# 限制尝试次数
sed -i 's/^#*MaxAuthTries.*/MaxAuthTries 5/' "$SSHD"
grep -q "^MaxAuthTries" "$SSHD" || echo "MaxAuthTries 5" >> "$SSHD"
ok "MaxAuthTries 5"

# 登录超时
sed -i 's/^#*LoginGraceTime.*/LoginGraceTime 60/' "$SSHD"
grep -q "^LoginGraceTime" "$SSHD" || echo "LoginGraceTime 60" >> "$SSHD"
ok "LoginGraceTime 60"

# 禁止空密码
sed -i 's/^#*PermitEmptyPasswords.*/PermitEmptyPasswords no/' "$SSHD"
grep -q "^PermitEmptyPasswords" "$SSHD" || echo "PermitEmptyPasswords no" >> "$SSHD"
ok "PermitEmptyPasswords no"

# ---- 中级加固 (medium/high) ----
if [ "$LEVEL" = "medium" ] || [ "$LEVEL" = "high" ]; then
    step "中级加固"
    
    # 安装fail2ban
    if ! command -v fail2ban-client &>/dev/null; then
        warn "安装fail2ban..."
        if command -v apt-get &>/dev/null; then
            apt-get install -y -qq fail2ban > /dev/null 2>&1
        elif command -v yum &>/dev/null; then
            yum install -y -q fail2ban > /dev/null 2>&1
        elif command -v dnf &>/dev/null; then
            dnf install -y -q fail2ban > /dev/null 2>&1
        fi
    fi
    
    if command -v fail2ban-client &>/dev/null; then
        cat > /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/secure
maxretry = 5
bantime = 3600
findtime = 600
EOF
        systemctl enable fail2ban 2>/dev/null
        systemctl restart fail2ban 2>/dev/null
        ok "fail2ban 已安装并配置"
    else
        warn "fail2ban 安装失败，请手动安装"
    fi
    
    # 限制root登录方式
    sed -i 's/^#*PermitRootLogin.*/PermitRootLogin prohibit-password/' "$SSHD"
    grep -q "^PermitRootLogin" "$SSHD" || echo "PermitRootLogin prohibit-password" >> "$SSHD"
    ok "PermitRootLogin prohibit-password"
    
    # 更严格的尝试次数
    sed -i 's/^MaxAuthTries.*/MaxAuthTries 3/' "$SSHD"
    ok "MaxAuthTries 3"
fi

# ---- 高级加固 (high) ----
if [ "$LEVEL" = "high" ]; then
    step "高级加固"
    
    warn "高级模式将禁用密码登录！请确保已配置SSH密钥！"
    read -p "$(echo -e ${YELLOW})[?] 确认继续? (y/N): $(echo -e ${NC})" choice
    
    if [[ "$choice" =~ ^[Yy]$ ]]; then
        sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD"
        grep -q "^PasswordAuthentication" "$SSHD" || echo "PasswordAuthentication no" >> "$SSHD"
        ok "PasswordAuthentication no"
        
        sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' "$SSHD"
        ok "PermitRootLogin no"
        
        warn "密码登录已禁用！请确保密钥能正常登录再断开连接！"
    else
        warn "跳过高级加固"
    fi
fi

# ---- 重启SSH ----
step "重启SSH服务"
systemctl restart sshd 2>/dev/null || service sshd restart 2>/dev/null
ok "SSH服务已重启"

# ---- 验证 ----
step "验证配置"
sshd -t 2>/dev/null && ok "SSH配置语法正确" || warn "SSH配置有错误，请检查"

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  SSH加固完成 (级别: $LEVEL)${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
echo ""
