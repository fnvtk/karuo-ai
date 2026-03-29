#!/usr/bin/env bash
# 家里 Station NAS：将 frpc 控制面切到 kr 宝塔 frps，并重启 frpc。
# 使用场景：存客宝 frps 已停用后，opennas2.quwanzhi.com 外网全断，必须在「能 ping 通 192.168.110.29」的家庭内网执行。
# 用法（本机 Mac/Linux）：
#   bash 家里Station_frpc切kr_内网执行.sh
# 可选环境变量：
#   STATION_IP=192.168.110.29  STATION_USER=admin
#   若未配置 SSH 公钥，可安装 sshpass 后：STATION_ADMIN_PASS='你的admin密码' bash 家里Station_frpc切kr_内网执行.sh
set -euo pipefail

STATION_IP="${STATION_IP:-192.168.110.29}"
STATION_USER="${STATION_USER:-admin}"
KR_ADDR="${KR_ADDR:-43.139.27.93}"
FRPC_DIR="/volume1/homes/admin/frpc"
FRPC_INI="${FRPC_DIR}/frpc.ini"
START_SH="${FRPC_DIR}/start_frpc.sh"

# 旧版群晖 sshd + 本机 OpenSSH 10：需放宽算法（与 ~/.ssh/config 中 Host diskstation-home 一致）
SSH_BASE=(
  -o ConnectTimeout=12
  -o StrictHostKeyChecking=accept-new
  -o KexAlgorithms=diffie-hellman-group14-sha256,diffie-hellman-group14-sha1
  -o Ciphers=aes128-cbc,aes256-cbc,aes192-cbc,3des-cbc
  -o HostKeyAlgorithms=ssh-rsa
  -o PubkeyAcceptedAlgorithms=ssh-rsa
)

remote_body() {
  cat <<'EOS'
set -e
FRPC_DIR="__FRPC_DIR__"
FRPC_INI="__FRPC_INI__"
START_SH="__START_SH__"
KR_ADDR="__KR_ADDR__"
if [ ! -f "$FRPC_INI" ]; then
  echo "未找到 $FRPC_INI，请确认路径（文档：双NAS区分_公司CKB与家里Station.md）"
  exit 1
fi
TS=$(date +%Y%m%d%H%M%S)
cp -a "$FRPC_INI" "${FRPC_INI}.bak_${TS}"
# [common] 下 server_addr = ...
if grep -qE '^[[:space:]]*server_addr[[:space:]]*=' "$FRPC_INI"; then
  sed -i "s/^[[:space:]]*server_addr[[:space:]]*=.*/server_addr = ${KR_ADDR}/" "$FRPC_INI"
else
  echo "未检测到 server_addr 行，请手工编辑 $FRPC_INI 中 [common] 段"
  exit 2
fi
echo "---- 当前 [common] 前几行 ----"
grep -n . "$FRPC_INI" | head -25
if [ -x "$START_SH" ]; then
  sh "$START_SH"
else
  echo "未找到可执行 $START_SH，请手工重启 frpc（或 kill 旧进程后 nohup frpc -c $FRPC_INI）"
  exit 3
fi
echo "---- frpc 进程 ----"
ps auxww | grep '[f]rpc' || true
EOS
}

BODY=$(remote_body | sed "s|__FRPC_DIR__|${FRPC_DIR}|g; s|__FRPC_INI__|${FRPC_INI}|g; s|__START_SH__|${START_SH}|g; s|__KR_ADDR__|${KR_ADDR}|g")

if [ -n "${STATION_ADMIN_PASS:-}" ] && command -v sshpass >/dev/null 2>&1; then
  SSHPASS="${STATION_ADMIN_PASS}" sshpass -e ssh "${SSH_BASE[@]}" -p 22 "${STATION_USER}@${STATION_IP}" "bash -s" <<<"$BODY"
else
  ssh "${SSH_BASE[@]}" -p 22 "${STATION_USER}@${STATION_IP}" "bash -s" <<<"$BODY"
fi

echo ""
echo "完成后外网抽验（任意网络）："
echo "  curl -sS -m 8 -o /dev/null -w '%{http_code}\\n' http://opennas2.quwanzhi.com:5002/"
echo "  ssh -p 22202 ${STATION_USER}@opennas2.quwanzhi.com"
