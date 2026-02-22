# 宝塔 443 不监听 · 系统 Nginx 与宝塔 Nginx 优先排查

> 来源：存客宝 42.194.245.239 | 2026-02

## 现象

- 80 可达，443 不可达；外网 443 返回 Connection refused
- 安全组、iptables、证书、nginx -t 均正常

## 根因（优先检查）

**运行的是系统 Nginx（`/usr/sbin/nginx`），非宝塔 Nginx。**

- 系统 Nginx：`/etc/nginx/`，不含宝塔 vhost 的 listen 443
- 宝塔 Nginx：`/www/server/nginx/conf/nginx.conf`，含全部 SSL

## 诊断

```bash
ps aux | grep nginx   # 若 /usr/sbin/nginx → 有问题
ss -tlnp | grep 443   # 无输出则未监听
```

## 修复

```bash
killall nginx
sleep 2
/www/server/nginx/sbin/nginx -c /www/server/nginx/conf/nginx.conf
```

## 防重复

**宝塔服务器 443 不监听时，先查 `ps aux | grep nginx`，若为系统 Nginx 则按上修复。**
