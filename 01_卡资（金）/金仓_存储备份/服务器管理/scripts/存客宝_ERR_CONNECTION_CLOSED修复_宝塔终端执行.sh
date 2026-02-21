#!/bin/bash
# 存客宝 kr-kf.quwanzhi.com、lytiao.com 无法访问（ERR_CONNECTION_CLOSED）修复
# 在存客宝宝塔面板【终端】复制整段粘贴执行

echo "========== 存客宝 站点无法访问 修复 =========="

echo "[1] 端口监听"
ss -tlnp | grep -E ':80 |:443 ' || true

echo ""
echo "[2] Nginx 配置测试"
nginx -t 2>&1

echo ""
echo "[3] 重启 Nginx"
nginx -s reload 2>&1 || systemctl restart nginx 2>&1

echo ""
echo "[4] 宝塔防火墙 80/443（若启用）"
bt 14 2>/dev/null | grep -E "80|443" | head -5 || echo "  (bt 14 未输出)"

echo ""
echo "[5] 腾讯云安全组"
echo "  请到 腾讯云控制台 → 云服务器 → 存客宝实例 → 安全组 → 入站规则"
echo "  确认 80、443 已放行（0.0.0.0/0 或 来源 0.0.0.0/0）"

echo ""
echo "========== 完成 =========="
echo "若 443 仍未监听，检查各站点 SSL 证书是否已部署；"
echo "若腾讯云安全组未放行 443，需在控制台添加 443 入站规则。"
