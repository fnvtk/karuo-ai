# 宝塔域名 502 / ERR_CONNECTION_CLOSED 排查经验

> 来源：卡若AI 服务器管理 | 2026-02-22

## 问题

- lkdie.com：502 Bad Gateway
- lytiao.com：ERR_CONNECTION_CLOSED（连接意外终止）

## 根因

1. **lkdie**：服务器内 curl 200 正常，外网 502 多为 PHP 路径/后端偶发超时，或刚重启后服务未就绪。
2. **lytiao**：**www.lytiao.com / lytiao.com 无独立 Nginx server 块**，请求命中默认站点，默认使用自签名证书，浏览器可能拒绝连接或中断握手。

## 处理

1. 在宝塔面板终端执行：`nginx -t && nginx -s reload`，必要时 `systemctl restart php-fpm-56`
2. 为 www.lytiao.com / lytiao.com 在宝塔中新增站点并申请 Let's Encrypt，或手动添加 redirect 配置指向已有子站（如 zhijipro.lytiao.com）

## 可复用

- 完整步骤见：`01_卡资（金）/金仓_存储备份/服务器管理/references/宝塔_域名无法访问_lkdie_lytiao_诊断与修复.md`
