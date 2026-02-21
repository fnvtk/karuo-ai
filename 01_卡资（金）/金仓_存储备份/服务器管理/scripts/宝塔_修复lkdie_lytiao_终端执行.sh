#!/bin/bash
# 在 kr宝塔 宝塔面板 → 终端 全文复制粘贴执行
# 修复：lkdie.com 502 + lytiao.com ERR_CONNECTION_CLOSED

set -e
echo "=== 1. 重载 Nginx + 重启 PHP-FPM（修复 lkdie 502）==="
nginx -t && nginx -s reload
for svc in php-fpm-56 php-fpm-74 php-fpm-80 php-fpm-82 php-fpm php-fpm7.4 php-fpm8.0; do
  systemctl restart $svc 2>/dev/null && echo "  已重启 $svc" && break
done
echo "  Nginx 已重载"

echo ""
echo "=== 2. 添加 lytiao.com / www.lytiao.com 跳转配置（修复 ERR_CONNECTION_CLOSED）==="
CONF="/www/server/panel/vhost/nginx/lytiao_root.conf"
if [ -f "$CONF" ]; then
  echo "  配置已存在，跳过"
else
  cat > "$CONF" << 'NGX'
server {
    listen 80;
    listen [::]:80;
    server_name lytiao.com www.lytiao.com;
    return 301 https://zhijipro.lytiao.com$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name lytiao.com www.lytiao.com;
    ssl_certificate    /www/server/panel/vhost/cert/zhijipro.lytiao.com/fullchain.pem;
    ssl_certificate_key /www/server/panel/vhost/cert/zhijipro.lytiao.com/privkey.pem;
    return 301 https://zhijipro.lytiao.com$request_uri;
}
NGX
  echo "  已创建 $CONF"
fi

echo ""
echo "=== 3. 再次重载 Nginx ==="
nginx -t && nginx -s reload
echo ""
echo "✅ 完成。请刷新 lkdie.com、lytiao.com 测试。"
