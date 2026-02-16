---
name: iPhone管理
description: iPhone连接、网络共享与自动备份
triggers: iPhone备份、iPhone连接、USB共享、热点
owner: 金仓
group: 金
version: "1.0"
updated: "2026-02-16"
---

# iPhone 管理

## 功能概述
自动管理 iPhone 与 MacBook 的连接、网络共享和备份。

## 核心功能

### 1. 网络自动连接
- **USB 网络共享**：iPhone 通过 USB 连接时，自动使用 iPhone 网络上网
- **个人热点自动连接**：WiFi 断开时，自动搜索并连接已保存的 iPhone 个人热点
- **网络优先级调整**：自动调整网络服务顺序，优先使用可用的 iPhone 网络

### 2. 自动备份
- **USB 连接触发**：iPhone 插入时自动检测
- **智能备份**：24 小时内已备份则跳过，避免重复备份
- **本地备份**：数据保存在 `~/Library/Application Support/MobileSync/Backup`

## 快速使用

### 安装自动服务
```bash
cd /Users/karuo/Documents/个人/卡若AI/01_系统管理/iPhone管理/scripts
./setup_auto_service.sh
```

### 手动测试
```bash
# 测试网络自动连接
./iphone_auto_connect.sh

# 测试自动备份
./iphone_auto_backup.sh
```

### 卸载服务
```bash
./uninstall_auto_service.sh
```

## 前置配置

### 1. iPhone 端设置
1. **设置 → 个人热点** → 开启「允许其他人加入」
2. **设置 → 个人热点** → 开启「最大化兼容性」（可选，提高连接成功率）
3. 首次连接 MacBook 时，在 iPhone 上点击「信任此电脑」

### 2. MacBook 端设置
1. **系统设置 → 网络** → 确认「iPhone USB」服务存在
2. **系统设置 → WiFi** → 首次连接 iPhone 热点并保存密码
3. **Finder** → 选中 iPhone → 勾选「连接此 iPhone 时自动同步」

### 3. 增强备份功能（可选）
安装 libimobiledevice 支持命令行备份：
```bash
brew install libimobiledevice
```

## 服务状态

### 查看运行状态
```bash
launchctl list | grep com.karuo.iphone
```

### 查看日志
```bash
# 网络连接日志
cat /tmp/iphone_auto_connect.log

# 备份日志
cat /tmp/iphone_backup.log
```

## 触发词
- iPhone 自动连接
- iPhone 备份
- 手机网络共享
- 个人热点自动连接

## 脚本说明

| 脚本 | 功能 |
|------|------|
| `iphone_auto_connect.sh` | 检测网络并自动切换到 iPhone |
| `iphone_auto_backup.sh` | 检测 iPhone 连接并自动备份 |
| `setup_auto_service.sh` | 安装开机自动运行服务 |
| `uninstall_auto_service.sh` | 卸载自动服务 |

## 工作原理

```
┌─────────────────────────────────────────────────────────┐
│                    iPhone 管理系统                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐    每60秒     ┌──────────────────┐    │
│  │ LaunchAgent │ ──────────→  │ 网络连接检测脚本  │    │
│  └─────────────┘              └──────────────────┘    │
│                                        │              │
│                               ┌────────┴────────┐    │
│                               ▼                 ▼    │
│                    ┌──────────────┐    ┌────────────┐ │
│                    │ iPhone USB   │    │ 个人热点    │ │
│                    │ 网络共享     │    │ WiFi 连接   │ │
│                    └──────────────┘    └────────────┘ │
│                                                       │
│  ┌─────────────┐    USB插入     ┌──────────────────┐ │
│  │ WatchPaths  │ ──────────→   │ 自动备份脚本     │ │
│  │ (usbmuxd)   │               └──────────────────┘ │
│  └─────────────┘                        │           │
│                                         ▼           │
│                              ┌──────────────────┐   │
│                              │ 本地备份目录      │   │
│                              │ MobileSync/Backup │   │
│                              └──────────────────┘   │
└─────────────────────────────────────────────────────────┘
```
