# 宝塔域名无法访问 · lkdie / lytiao 诊断与修复

> 适用：kr宝塔 43.139.27.93。当 lkdie.com、lytiao.com 等域名出现 502 Bad Gateway 或 ERR_CONNECTION_CLOSED 时按此处理。
> **执行入口**：宝塔面板 → 终端（https://43.139.27.93:9988，ckb/zhiqun1984）

---

## 一、诊断结果摘要（2026-02-22）

| 域名 | 现象 | 根因 |
|------|------|------|
| **lkdie.com / www.lkdie.com** | 502 Bad Gateway | 服务器内 HTTP 200 正常；外网 502 多为 PHP 路径/后端偶发超时，或刚重启后服务未就绪 |
| **lytiao.com / www.lytiao.com** | ERR_CONNECTION_CLOSED | **无独立 server 块**，命中默认站点，默认使用自签名证书，浏览器可能拒绝或中断连接 |

**服务器状态**：Nginx 语法 OK、80/443 监听正常、PHP-FPM 运行、tongzhi(3043) Node 正常。证书：www.lkdie.com 使用 *.lkdie.com 有效证书；lytiao 子域（aisy、zhijipro 等）有独立证书，**根域名 www.lytiao.com 无配置**。

---

## 二、一键修复（宝塔终端执行）

### 2.1 重启 Nginx + PHP-FPM

```bash
nginx -t && nginx -s reload
systemctl restart php-fpm-56
echo "✅ Nginx + PHP-FPM 已重载"
```

### 2.2 修复 www.lytiao.com / lytiao.com（添加 80 跳转）

因 www.lytiao.com 无独立站点，请求会落到默认 server，易出现自签证书导致 ERR_CONNECTION_CLOSED。建议在宝塔面板新增站点或添加 redirect 配置。

**方案 A：宝塔面板新增站点（推荐）**

1. 网站 → 添加站点
2. 域名：`lytiao.com`、`www.lytiao.com`
3. 根目录：可填 `/www/wwwroot/自营/zhijipro.lytiao.com` 或新建目录
4. 提交后 → 设置 → SSL → 申请 Let's Encrypt（需解析生效）

**方案 B：手动添加 Nginx 配置（临时）**

在 `/www/server/panel/vhost/nginx/` 下新建 `lytiao_root.conf`：

```nginx
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
```

> ⚠️ zhijipro 证书可能未包含 www.lytiao.com，浏览器会提示证书不匹配。更稳妥是方案 A 申请新证书。

执行：

```bash
# 创建配置后
nginx -t && nginx -s reload
```

---

## 三、深度检查命令（排查时用）

在 **宝塔面板 → 终端** 执行：

```bash
# 1. 系统与 Nginx
uptime && free -m | head -2
nginx -t

# 2. 端口监听
ss -tlnp | grep -E ":80|:443|:3043"

# 3. PHP-FPM
systemctl status php-fpm-56

# 4. 站点内 curl
curl -sI -H "Host: www.lkdie.com" http://127.0.0.1/ | head -5
curl -sI -H "Host: zhijipro.lytiao.com" http://127.0.0.1/ | head -5

# 5. SSL 证书
openssl x509 -in /www/server/panel/vhost/cert/www.lkdie.com/fullchain.pem -noout -dates -subject
```

---

## 四、本机 DNS 劫持检查

若本机 dig/nslookup 解析到 `198.18.x.x`，说明被代理软件劫持，需：

- 关闭 Clash / Surge 等代理的「Fake IP / 劫持 DNS」
- 或用 `curl -H "Host: www.lkdie.com" https://43.139.27.93/` 绕过 DNS 直连测试

---

## 五、相关脚本与文档

| 脚本/文档 | 用途 |
|-----------|------|
| **`scripts/腾讯云_TAT_修复lkdie_lytiao.py`** | **免 SSH 一键修复**（腾讯云 TAT，推荐） |
| `scripts/宝塔_修复lkdie_lytiao_终端执行.sh` | 宝塔面板 → 终端 复制粘贴执行 |
| `scripts/kr宝塔_宝塔API_修复502.py` | 通过宝塔 API 重启 Nginx（需 API 白名单） |
| `references/SSH登录方式与故障排查.md` | SSH 登录与 fail2ban 解封 |

**一键修复命令**（本机执行）：
```bash
cd "/Users/karuo/Documents/个人/卡若AI"
./01_卡资（金）/金仓_存储备份/服务器管理/scripts/.venv_tx/bin/python \
  "01_卡资（金）/金仓_存储备份/服务器管理/scripts/腾讯云_TAT_修复lkdie_lytiao.py"
```
