---
name: 局域网控制
description: 局域网设备发现、Android远程管理、投屏部署、批量应用安装
triggers: 设备管理、局域网扫描、ADB、投屏、远程控制、乐播投屏、会议平板、安装应用、刷机、scrcpy、VNC、RustDesk、扩展屏、MAXHUB、会议白板
owner: 金仓
group: 金
version: "2.0"
updated: "2026-03-17"
---

# 局域网控制

基于 ADB + scrcpy 的 Android 设备管理与控制系统。v2.0 已将原 `开发/8、小工具/局域网手机电脑控制` 项目的全部脚本、APK、文档迁入本目录，卡若AI 以后直接调用此处文件。

## 核心链路

```
设备发现 → 连接 → 屏幕镜像 → 远程控制 → 应用安装 → 系统诊断
    │         │        │           │           │           │
    ▼         ▼        ▼           ▼           ▼           ▼
 局域网扫描  ADB     scrcpy     鼠标键盘    乐播/微信    日志修复
 ping/nmap  WiFi/USB  60fps      手势映射    飞书/VNC    崩溃分析
```

## 目录结构（本 SKILL 内）

```
局域网控制/
├── SKILL.md                          ← 本文件
├── 脚本/
│   ├── 连接脚本/       (6)           ADB连接、scrcpy投屏、WiFi保持
│   ├── 安装脚本/       (32)          乐播投屏、微信、飞书、MAXHUB、刷机、VNC等
│   ├── 测试脚本/       (17)          诊断修复、扩展屏、投屏破解、网络扫描
│   ├── 局域网设备管理.sh             主扫描脚本（交互式菜单）
│   ├── 获取设备IMEI.sh               批量获取设备信息
│   └── 多屏互动APP分析脚本.sh
├── 配置/
│   ├── env.sample                    环境变量模板
│   └── targets.csv                   批量设备配置
├── 应用文件/            (<20MB APK)
│   ├── 会议白板2.apk
│   ├── ckb.apk                       存客宝
│   ├── AuroraStore.apk               第三方应用商店
│   ├── aurora-store.apk
│   ├── doubao.apk                    豆包
│   └── ...
├── 参考资料/
│   ├── 快速参考.md
│   ├── 公司路由器配置.md
│   ├── 锐捷路由器配置.md
│   ├── 项目规则文档.md
│   ├── 局域网设备远程控制能力报告.md
│   ├── 需求文档.md / 架构设计.md / 功能迭代记录.md / 安装记录.md
│   └── ...
└── (大文件外置 → 01_卡资/金仓_存储备份/大文件外置/局域网控制_APK/)
    ├── 乐bo投屏，安装在电视或投影仪.apk   (74MB)
    ├── weixin8062android2900_arm64.apk      (245MB)
    ├── 飞书_7.56.10_APKPure.apk            (212MB)
    ├── rustdesk-1.4.2-universal.apk         (61MB)
    ├── anydesk.apk                          (46MB)
    └── ...（符号链接指向开发目录原始文件）
```

## 能力清单

### 1. 设备发现与管理

```bash
# 交互式扫描（主脚本）
bash 脚本/局域网设备管理.sh

# 批量获取设备 IMEI / 型号 / 电量等
bash 脚本/获取设备IMEI.sh
```

功能：
- 自动检测本机 IP 与网段
- 并行 ping 扫描 254 个 IP
- 分类识别：Android 手机/平板、Android TV、电脑（VNC/RDP/SSH）
- 交互菜单：连接、投屏、安装应用、查看详情、导出设备列表

### 2. ADB 连接

| 脚本 | 用途 |
|------|------|
| `脚本/连接脚本/ADB连接脚本.sh` | 基础连接 |
| `脚本/连接脚本/配置Android设备ADB无线连接.sh` | 首次无线配置 |
| `脚本/连接脚本/ADB_WiFi连接保持脚本.sh` | 长连接守护 |

常用端口：5555、5037、4444、5556

### 3. 屏幕镜像与投屏

| 脚本 | 用途 |
|------|------|
| `脚本/连接脚本/启动scrcpy投屏.sh` | scrcpy 一键投屏 |
| `脚本/连接脚本/投屏连接脚本.sh` | 投屏连接全流程 |
| `脚本/连接脚本/MacBook屏幕镜像脚本.sh` | Mac → Android 镜像 |
| `脚本/测试脚本/快速启动投屏.sh` | 快速启动 |
| `脚本/测试脚本/BetterDisplay扩展屏方案.sh` | BetterDisplay + VNC 扩展屏 |
| `脚本/测试脚本/MacBook手机扩展屏解决方案.sh` | Mac 扩展屏方案汇总 |

### 4. 应用安装（重点）

#### 乐播投屏

```bash
# 一键安装乐播投屏到设备
bash 脚本/安装脚本/乐播投屏安装脚本.sh <设备IP>

# 本地已有APK（74MB，大文件外置）
# 路径：大文件外置/局域网控制_APK/乐bo投屏，安装在电视或投影仪.apk

# 乐播投屏破解（5分钟限制）
bash 脚本/测试脚本/乐播投屏5分钟限制破解方案.sh
bash 脚本/测试脚本/乐播投屏自动破解守护.sh
bash 脚本/测试脚本/乐播投屏高级破解方案.sh
```

包名候选：
- `com.hpplay.happycast.tv`（TV版）
- `com.hpplay.happycast`（手机版）
- `com.lebo.doubletvmobile`
- `com.lebo.airplaydmr`（接收端）

#### 微信

```bash
bash 脚本/安装脚本/微信安装脚本.sh
bash 脚本/安装脚本/专业微信安装脚本.sh
# APK（245MB）→ 大文件外置
```

#### 飞书 / 会议

```bash
bash 脚本/安装脚本/飞书安装脚本.sh
bash 脚本/安装脚本/飞书会议室安装脚本.sh
bash 脚本/安装脚本/install_meeting_apps.sh
# 飞书APK（212MB）→ 大文件外置
```

#### 投屏类

```bash
bash 脚本/安装脚本/安装投屏应用到手机.sh
bash 脚本/安装脚本/安装投屏软件.sh
bash 脚本/安装脚本/快速安装投屏应用.sh
bash 脚本/安装脚本/智能连接投屏安装.sh
bash 脚本/安装脚本/直接安装投屏应用.sh
bash 脚本/安装脚本/自动安装投屏软件.sh
```

#### MAXHUB / 会议白板

```bash
bash 脚本/安装脚本/MAXHUB应用安装脚本.sh
bash 脚本/安装脚本/MAXHUB风格系统安装脚本.sh
# 会议白板2.apk（3.6MB）→ 应用文件/
```

#### VNC / 远程桌面

```bash
bash 脚本/安装脚本/安装VNC客户端到手机.sh
bash 脚本/安装脚本/安装AnyDesk到手机.sh
# RustDesk（61MB）→ 大文件外置
```

#### 系统级

```bash
bash 脚本/安装脚本/01_check_env.sh          # 环境检查
bash 脚本/安装脚本/02_download_apk.sh       # 下载 APK
bash 脚本/安装脚本/03_install_apk.sh        # 安装 APK
bash 脚本/安装脚本/04_verify_app.sh         # 验证安装
bash 脚本/安装脚本/05_troubleshoot.sh       # 故障排查
bash 脚本/安装脚本/WiFi调试永久开启脚本.sh    # 永久开启 ADB WiFi
```

### 5. 刷机与系统升级

```bash
bash 脚本/安装脚本/一键刷机脚本.sh
bash 脚本/安装脚本/RK3399系统升级脚本.sh
bash 脚本/安装脚本/系统备份脚本.sh
bash 脚本/安装脚本/Android显示管理应用安装脚本.sh
```

### 6. 系统诊断与修复

```bash
bash 脚本/测试脚本/Android系统诊断修复脚本.sh
bash 脚本/测试脚本/AI数智员工存客宝白屏修复脚本.sh
bash 脚本/测试脚本/设备连接和投屏完整解决方案.sh
bash 脚本/测试脚本/投屏问题综合解决方案.sh
```

### 7. 设备信息与扫描

```bash
bash 脚本/测试脚本/discover_devices.sh
bash 脚本/测试脚本/simple_network_scan.sh
bash 脚本/测试脚本/设置开机自启动投屏应用.sh
```

## 常用设备

### RK3399 会议电视（192.168.2.15）

```yaml
型号: RK3399
系统: Android 7.1.2
架构: arm64-v8a
IP: 192.168.2.15
ADB端口: 5555
序列号: CBI9SU7JNR

适配应用:
  - 乐播投屏: 乐bo投屏，安装在电视或投影仪.apk
  - 微信: weixin8062android2900_arm64.apk (v8.0.62)
  - 存客宝: ckb.apk
  - 腾讯会议: wemeet_android6.apk
  - 飞书: 飞书_7.56.10_APKPure.apk
  - RustDesk: rustdesk-1.4.2-universal.apk
  - 会议白板: 会议白板2.apk
```

## 执行协议

### 用户说「安装乐播投屏」「投屏到会议平板」

```
1. 确认设备 IP（默认 192.168.2.15）
2. 检查 ADB 连接
   adb connect <IP>:5555 && adb devices
3. 检查是否已安装
   adb shell pm list packages | grep -E "hpplay|lebo"
4. 安装（优先用本地 APK）
   APK_PATH="应用文件/" 或 "大文件外置/局域网控制_APK/"
   adb install -r -g "$APK_PATH/乐bo投屏，安装在电视或投影仪.apk"
5. 验证 + 启动
   adb shell monkey -p com.hpplay.happycast.tv 1
```

### 用户说「扫描设备」「局域网有哪些设备」

```
1. bash 脚本/局域网设备管理.sh
2. 按菜单操作
```

### 用户说「安装微信/飞书/会议应用到设备」

```
1. 确认设备 IP + 连接
2. 查对应安装脚本（见上方脚本列表）
3. 执行安装
4. 验证启动
```

### 用户说「刷机」「系统升级」

```
1. bash 脚本/安装脚本/系统备份脚本.sh    ← 先备份
2. bash 脚本/安装脚本/一键刷机脚本.sh     ← 刷机
3. 验证系统版本
```

### 用户说「会议白板安装应用」「MAXHUB」

```
1. adb connect <会议白板IP>:5555
2. bash 脚本/安装脚本/MAXHUB应用安装脚本.sh
3. 安装会议白板 APK：adb install -r -g 应用文件/会议白板2.apk
```

## 技术架构

### 桌面端（原 Electron 应用）
- Electron + React + Redux Toolkit
- macOS arm64 打包可用
- 源码位置：`/Users/karuo/Documents/开发/8、小工具/局域网手机电脑控制/桌面端/`
- 已打包：`桌面端/out/屏幕镜像控制器-darwin-arm64/屏幕镜像控制器.app`

### 手机端（原 Android 应用）
- Kotlin, Android 7.0+ (API 24)
- 包名：`com.karuo.screencontrol`
- 源码位置：`/Users/karuo/Documents/开发/8、小工具/局域网手机电脑控制/手机端/`

### 系统依赖
- **adb**（必需）：`brew install android-platform-tools`
- **scrcpy**（投屏）：`brew install scrcpy`
- **nmap**（可选，扫描增强）：`brew install nmap`

## 快捷命令

```bash
# 一键连接 + 投屏
adb connect 192.168.2.15:5555 && scrcpy -s 192.168.2.15:5555

# 一键获取设备完整信息
adb shell "getprop ro.product.model; getprop ro.build.version.release; getprop ro.product.cpu.abi; cat /proc/meminfo | grep MemTotal; df -h /data"

# 批量安装到所有已连接设备
for d in $(adb devices | grep device$ | awk '{print $1}'); do
  adb -s $d install -r -g <APK路径>
done

# 批量查看已安装应用
for d in $(adb devices | grep device$ | awk '{print $1}'); do
  echo "=== $d ==="; adb -s $d shell pm list packages | grep -E "hpplay|lebo|wemeet|feishu|wps"
done
```

## 安全原则

1. 首次连接需用户确认 ADB 授权
2. 卸载/清理数据前确认
3. 刷机前必须先备份（`系统备份脚本.sh`）
4. 危险命令（rm、reboot）需明确警告
5. APK 安装用 `-r -g`（覆盖 + 授予权限）

## 来源项目

原始完整项目（含 Electron 源码、Android 源码、ROM 等）：
`/Users/karuo/Documents/开发/8、小工具/局域网手机电脑控制/`

本 SKILL 仅迁移脚本、APK、配置、文档等**可直接调用的资源**。
桌面端/手机端源码和 ROM 文件仍留在开发目录，需要时可引用。

## 相关技能

- G10 局域网控制（本技能）
- G07 服务器管理（宝塔/SSL/部署）
- G01 群晖NAS管理（NAS/Docker）
- G15 存客宝（存客宝安装与管理）
