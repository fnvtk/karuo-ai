# 宝塔 443 不监听 · 系统 Nginx 与宝塔 Nginx 优先排查

> 来源：卡若AI 服务器管理 | 存客宝 42.194.245.239 | 2026-02

## 现象

- 80 可达，443 不可达
- 外网连接 443 返回 **Connection refused**
- 安全组、iptables、证书、nginx -t 均正常

## 根因（优先检查）

**运行的是系统 Nginx（`/usr/sbin/nginx`），非宝塔 Nginx。**

- 系统 Nginx 使用 `/etc/nginx/` 配置，通常不含宝塔的 vhost（含 listen 443 ssl）
- 宝塔 Nginx 使用 `/www/server/nginx/conf/nginx.conf`，包含所有站点的 SSL 配置
- 若系统 Nginx 先启动或接管，则只监听 80，不监听 443

## 诊断命令

```bash
# 1. 查看实际运行的 Nginx 进程
ps aux | grep nginx

# 若显示 /usr/sbin/nginx → 系统 Nginx，有问题
# 若显示 /www/server/nginx/sbin/nginx → 宝塔 Nginx，正常

# 2. 检查 443 是否监听
ss -tlnp | grep 443
# 无输出则 443 未监听
```

## 修复（任选其一）

### 方式一：TAT 脚本（本机执行，免 SSH）

```bash
cd "01_卡资（金）/金仓_存储备份/服务器管理/scripts"
.venv_tencent/bin/python3 腾讯云_TAT_存客宝_Nginx443强制修复.py
```

### 方式二：宝塔面板终端

```bash
killall nginx
sleep 2
/www/server/nginx/sbin/nginx -c /www/server/nginx/conf/nginx.conf
```

### 方式三：宝塔面板

软件商店 → Nginx → 重启

## 防重复

**宝塔服务器 443 不监听时，优先执行：**

1. `ps aux | grep nginx` 确认是否系统 Nginx
2. 若是，直接执行上述修复，再查安全组/证书

## 相关文档

- `references/存客宝_443无法访问_深度诊断与方案.md`
- `scripts/腾讯云_TAT_存客宝_Nginx443强制修复.py`
- `scripts/存客宝_443放行_宝塔终端执行.sh`（含自动切回宝塔 Nginx 逻辑）
