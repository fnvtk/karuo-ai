#!/bin/bash
# 存客宝 443 放行 · 在宝塔面板【终端】复制整段粘贴执行
# 用于确保 宝塔防火墙 和 系统防火墙 均放行 443

echo "========== 存客宝 443 放行 =========="
echo ""
echo "[1] iptables 添加 443"
iptables -I INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null && echo "  OK" || echo "  已存在或失败"
echo ""
echo "[2] 宝塔 firewall.json 添加 443"
python3 << 'PY'
import json, os
p = "/www/server/panel/data/firewall.json"
if os.path.isfile(p):
    with open(p) as f:
        d = json.load(f)
    ps = d.get("ports", "") or ""
    lst = [x.strip() for x in ps.split(",") if x.strip()]
    if "443" not in lst:
        lst.append("443")
        d["ports"] = ",".join(lst)
        with open(p, "w") as f:
            json.dump(d, f, ensure_ascii=False, indent=2)
        print("  已添加 443")
    else:
        print("  已有 443")
PY
echo ""
echo "[3] 重要：宝塔面板 安全 → 防火墙 → 手动添加 443"
echo "  若列表中无 443，请点击「添加端口」添加 443，协议 TCP，策略放行"
echo ""
echo "[4] 若 443 未监听，切回宝塔 Nginx"
if ! ss -tlnp | grep -q ':443 '; then
  echo "  443 未监听，重启为宝塔 Nginx..."
  killall nginx 2>/dev/null || true
  sleep 2
  /www/server/nginx/sbin/nginx -c /www/server/nginx/conf/nginx.conf 2>/dev/null && echo "  宝塔 Nginx 已启动" || /etc/init.d/nginx start
  sleep 1
fi
echo ""
echo "[5] 检查监听"
ss -tlnp | grep -E ':80 |:443 ' || true
echo ""
echo "========== 完成 =========="
echo "访问 https://kr-kf.quwanzhi.com 测试"
