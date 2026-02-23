# iPad 2 当 Mac 触控副屏 — 操作指南

> 适用于：iPad 2（iOS 9.3.5）+ MacBook，通过 USB 连接。  
> 脚本路径：`运营中枢/脚本/iPad2_副屏安装.sh`

---

## 一、已完成的安装

| 项目 | 状态 |
|------|------|
| Duet Mac 端 | ✅ 已安装到 `/Applications/Duet.app` |
| 安装脚本 | ✅ `运营中枢/脚本/iPad2_副屏安装.sh` |
| ideviceinstaller | ✅ 已安装，可命令行安装 IPA 到 iPad |

---

## 二、连接要求（iPad 2 特需）

iPad 2 使用 **30 针接口**，MacBook 使用 **Type-C**，需：

- **30 针转 USB-A 数据线** + **USB-A 转 Type-C 转接器**；或  
- **30 针转 USB-C 数据线**（若可用）

必须是**可传数据**的线，不能是仅充电线。

---

## 三、命令行安装流程

### 1. 连接 iPad 并信任电脑

1. 用数据线把 iPad 2 连到 Mac
2. 解锁 iPad
3. 若出现「要信任此电脑吗？」→ 点 **信任**

### 2. 运行安装脚本

```bash
cd /Users/karuo/Documents/个人/卡若AI
bash 运营中枢/脚本/iPad2_副屏安装.sh
```

脚本会：检测 iPad → 确认 Duet Mac 已安装 → 尝试安装 IPA（若有）→ 启动 Duet。

### 3. 在 iPad 2 上安装 Duet Display

当前 Duet 在 App Store 要求 **iPadOS 12+**，iPad 2 无法直接安装最新版。

**可行方式：**

| 方式 | 说明 |
|------|------|
| **已购项目** | 若曾购买 Duet，在 iPad 2 上打开 App Store → 已购项目 → 搜索 Duet Display → 安装最后兼容版本 |
| **ipatool 下载旧版** | 运行 `bash 运营中枢/脚本/iPad2_下载Duet旧版IPA.sh`，按提示用 ipatool 下载兼容 iOS 9 的旧版，再用 `ideviceinstaller -i xxx.ipa` 安装 |

### 4. 授予 Duet 权限

- **系统设置** → **隐私与安全性** → **辅助功能** → 勾选 **Duet**  
- 若提示 **屏幕录制**，同样勾选 Duet

---

## 四、使用步骤

1. 打开 Duet Mac 端（菜单栏出现 Duet 图标）
2. 在 iPad 2 上打开 Duet Display
3. 使用 USB 连接，Duet 会自动识别 iPad 为副屏
4. 在 **系统设置 → 显示器** 中调整排列和扩展方式

---

## 五、常见问题

| 情况 | 处理 |
|------|------|
| 未检测到 iPad | 检查线缆可传数据、是否点过「信任」、重新插拔 |
| iPad 2 无法安装 Duet | 需用已购项目或 ipatool 下载旧版 IPA 后命令行安装 |
| Duet 无反应 | 确认 Mac 端已授予「辅助功能」「屏幕录制」权限 |

---

*文档生成：卡若AI · 运营中枢 | 配合 `iPad2_副屏安装.sh` 使用*
