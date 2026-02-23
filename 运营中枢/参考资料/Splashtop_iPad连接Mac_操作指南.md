# Splashtop · iPad 远程连接 MacBook 操作指南

> 适用于：MacBook + iPad，通过 Splashtop Personal 实现 iPad 远程控制/访问 Mac。  
> 官网：<https://www.splashtop.com> | 个人版免费（同 Wi‑Fi）

---

## 一、安装步骤

### 1. MacBook 端：安装 Splashtop Streamer（被控端）

在终端执行（需输入本机密码）：

```bash
brew install --cask splashtop-streamer
```

或手动下载：<https://www.splashtop.com/downloads/personal> → 选择 **Personal Streamer** → macOS

### 2. iPad 端：安装 Splashtop Personal（控制端）

- 打开 App Store，搜索 **「Splashtop Personal」**
- 或直达：<https://apps.apple.com/app/splashtop-personal/id382509315>

---

## 二、配置与连接

### 1. 注册 Splashtop 账号

- 在 <https://www.splashtop.com> 注册免费账号（或使用已有账号）

### 2. MacBook 上配置 Streamer

1. 打开 **Splashtop Streamer**（菜单栏会出现图标）
2. 使用 Splashtop 账号登录
3. 按提示完成权限授予：**辅助功能**、**屏幕录制**（系统设置 → 隐私与安全性）
4. 电脑会显示为「已就绪」，可被同一账号下的设备发现

### 3. iPad 上配置 Personal

1. 打开 **Splashtop Personal**
2. 使用**同一 Splashtop 账号**登录
3. 在设备列表中会出现你的 MacBook，点击即可连接

---

## 三、使用说明

| 项目 | 说明 |
|------|------|
| **同 Wi‑Fi** | 基础版 Personal 支持同一局域网内免费使用 |
| **跨网络** | 需购买 Anywhere Access Pack 才能在外网访问 |
| **权限** | 首次连接时 Mac 可能提示允许「控制其他电脑」，需允许 |
| **安全** | 支持 256 位 AES 加密、TLS，可开启双因素认证 |

---

## 四、常见问题

| 情况 | 处理 |
|------|------|
| Mac 未出现在 iPad 列表 | 确认 Mac 与 iPad 在同一 Wi‑Fi；Streamer 已登录同一账号；Mac 未休眠 |
| 连接失败 | 检查防火墙；确认已授予 Streamer 辅助功能、屏幕录制权限 |
| 需外网访问 | 购买 Anywhere Access Pack，或使用 Splashtop Business 等产品 |

---

*文档生成：卡若AI · 运营中枢 | 依据 Splashtop 官网整理*
