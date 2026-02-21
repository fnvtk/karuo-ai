#!/bin/bash
# kr宝塔 43.139.27.93：列出可能占满带宽的 程序/端口/网站 及 连接数占比（近似带宽占比）
# 在服务器上执行：bash kr宝塔_带宽占用排查.sh  或 宝塔面板 → 终端 粘贴运行

set -e
echo "=============================================================="
echo "  kr宝塔 · 带宽占用排查（程序 / 端口 / 网站 · 连接数占比）"
echo "=============================================================="

# 1) 监听中的端口与进程
echo ""
echo "【1】监听端口与对应进程（可能对外提供服务的程序）"
echo "--------------------------------------------------------------"
ss -tlnp 2>/dev/null | awk 'NR==1 || /LISTEN/ {print}' | while read line; do
  if echo "$line" | grep -q "LISTEN"; then
    port=$(echo "$line" | awk '{print $4}' | rev | cut -d: -f1 | rev)
    pid=$(echo "$line" | grep -oE 'pid=[0-9]+' 2>/dev/null | sed 's/pid=//' | head -1)
    if [ -n "$pid" ] && [ "$pid" -eq "$pid" ] 2>/dev/null; then
      exe=$(readlink -f /proc/$pid/exe 2>/dev/null || ps -p $pid -o comm= 2>/dev/null)
      echo "  端口 $port  →  PID $pid  →  $exe"
    else
      echo "  $line"
    fi
  fi
done

# 2) ESTABLISHED 按本地端口统计 → 连接数占比
echo ""
echo "【2】当前连接数按「本地端口」统计（占比 ≈ 该服务占用带宽的大致比例）"
echo "--------------------------------------------------------------"
total=$(ss -antn state established 2>/dev/null | wc -l)
[ "$total" -eq 0 ] && total=1
ss -antn state established 2>/dev/null | awk '{print $4}' | sed 's/.*://' | sort | uniq -c | sort -rn | head -25 | while read cnt port; do
  pct=$((cnt * 100 / total))
  # 解析端口对应服务（常见）
  name=""
  case "$port" in
    80|443)   name="(Nginx HTTP/HTTPS)" ;;
    9988)    name="(宝塔面板)" ;;
    22022)   name="(SSH)" ;;
    8000)    name="(常见 Node/网关)" ;;
    3000)    name="(常见 Node)" ;;
    3306)    name="(MySQL)" ;;
  esac
  echo "  端口 $port  $name  →  连接数 $cnt  →  占比 ${pct}%"
done
echo "  总连接数: $total"

# 3) ESTABLISHED 按进程(PID)统计 → 程序维度占比
echo ""
echo "【3】当前连接数按「进程」统计（程序维度 ≈ 带宽占比）"
echo "--------------------------------------------------------------"
# 从 ss -antp 提取 pid（格式因系统而异）
ss -antp state established 2>/dev/null | grep -oE 'pid=[0-9]+' | sed 's/pid=//' | sort | uniq -c | sort -rn | head -20 | while read cnt pid; do
  [ -z "$pid" ] && continue
  pct=$((cnt * 100 / total))
  exe=$(readlink -f /proc/$pid/exe 2>/dev/null || ps -p $pid -o comm= 2>/dev/null)
  cmd=$(ps -p $pid -o args= 2>/dev/null | cut -c1-60)
  echo "  PID $pid  连接数 $cnt (${pct}%)  →  $exe"
  echo "      命令: $cmd"
done

# 4) Nginx 站点与端口（端口 → 网站）
echo ""
echo "【4】Nginx 站点（端口 → 网站/域名）"
echo "--------------------------------------------------------------"
if [ -d /www/server/panel/vhost/nginx ]; then
  for f in /www/server/panel/vhost/nginx/*.conf; do
    [ -f "$f" ] || continue
    name=$(grep -m1 'server_name' "$f" 2>/dev/null | sed 's/.*server_name\s*//;s/;.*//;s/\s.*//')
    listen=$(grep -m1 'listen' "$f" 2>/dev/null | sed 's/.*listen\s*//;s/\s.*//;s/;.*//')
    root=$(grep -m1 'root ' "$f" 2>/dev/null | sed 's/.*root\s*//;s/;.*//')
    [ -z "$name" ] && name="(未配置 server_name)"
    echo "  $name  →  listen $listen  root $root"
  done
else
  echo "  (未找到 /www/server/panel/vhost/nginx)"
fi

# 5) PM2 / Node 进程（常见占带宽）
echo ""
echo "【5】Node/PM2 进程（常见占带宽应用）"
echo "--------------------------------------------------------------"
if command -v pm2 >/dev/null 2>&1; then
  pm2 list 2>/dev/null || true
else
  ps aux | grep -E 'node|next|nuxt' | grep -v grep || echo "  (未发现 pm2/node 或未在 PATH)"
fi

# 6) 若安装 nethogs，可采样几秒得到实时带宽占比
echo ""
echo "【6】实时带宽占比（需安装 nethogs，采样 5 秒）"
echo "--------------------------------------------------------------"
if command -v nethogs >/dev/null 2>&1; then
  echo "  运行: nethogs -t -c 5 (5 秒采样，需 root)"
  (timeout 6 nethogs -t -c 5 2>/dev/null || nethogs -t -d 1 -c 5 2>/dev/null) || echo "  (请手动执行: nethogs -t)"
else
  echo "  未安装 nethogs。安装: yum install nethogs 或 apt install nethogs，可得到各进程实时带宽占比。"
fi

echo ""
echo "=============================================================="
echo "说明：连接数占比可近似看作该程序/端口占用带宽的比例；精确带宽请用 nethogs 或宝塔「监控」"
echo "=============================================================="
