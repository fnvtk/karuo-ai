# 存客宝 kr-kf.quwanzhi.com、lytiao.com 无法访问 修复指南

> 现象：ERR_CONNECTION_CLOSED，面板显示 运行中  
> 诊断结果：**443 端口 Connection refused**（80 正常）

---

## 一、根因

- 80 端口可达
- **443 端口被拒绝** → 访问 https:// 会失败
- 域名已正确解析到 42.194.245.239

---

## 二、处理步骤（按顺序）

### 1. 腾讯云安全组放行 443

1. 打开 [腾讯云控制台](https://console.cloud.tencent.com/cvm/instance) → 找到存客宝实例 (42.194.245.239)
2. 点击实例 → **安全组** → **编辑规则** → **入站规则**
3. 确认有 **443/TCP** 入站，来源 `0.0.0.0/0`
4. 若无，点击 **添加规则**：协议端口 443，来源 0.0.0.0/0，策略 允许

### 2. 宝塔面板终端执行（Nginx 重载）

在 https://42.194.245.239:9988 → 终端 执行：

```bash
nginx -t && nginx -s reload
```

### 3. 检查 SSL 证书

宝塔 → **网站** → 找到 kr-kf.quwanzhi.com、www.lytiao.com → **设置** → **SSL**

- 若未部署证书，部署 Let's Encrypt 或自有证书
- 若已过期，续签或重新部署

### 4. 确认 Nginx 监听 443

终端执行：

```bash
ss -tlnp | grep 443
```

若无输出，说明 Nginx 未监听 443，需在对应站点启用 SSL 并保存配置。

---

## 三、快速验证

- **http://kr-kf.quwanzhi.com**（80）若可访问，说明应用正常，问题在 443/SSL
- **https://kr-kf.quwanzhi.com** 需 443 和 SSL 均正常才能访问
