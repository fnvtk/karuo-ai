#!/bin/bash
# 存客宝服务器 42.194.245.239 流量与负载查询（需在能 SSH 登录该机或在本机用 sshpass 时执行）
# 用法：本机执行需先 sshpass -p 'Zhiqun1984' ssh root@42.194.245.239 'bash -s' < 本脚本
# 或：登录存客宝服务器后直接 bash 本脚本（若已上传）

echo "========== 存客宝服务器 42.194.245.239 状态 =========="
echo "--- 1. 系统负载 ---"
uptime
echo ""
echo "--- 2. 内存 ---"
free -h
echo ""
echo "--- 3. 磁盘使用 ---"
df -h / /www 2>/dev/null | head -6
echo ""
echo "--- 4. 当前 ESTABLISHED 连接数 ---"
ss -tn state established 2>/dev/null | wc -l
echo ""
echo "--- 5. 网卡累计收发包（可隔几秒再跑一次对比流量）---"
cat /proc/net/dev
echo ""
echo "--- 6. 按进程的 TCP 连接数 TOP ---"
ss -tnp 2>/dev/null | awk '{print $6}' | sort | uniq -c | sort -rn | head -15
echo ""
echo "--- 7. 监听端口 ---"
ss -tlnp 2>/dev/null | head -30
