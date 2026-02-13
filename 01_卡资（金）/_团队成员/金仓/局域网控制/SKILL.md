---
name: 局域网控制
description: 局域网Android设备管理与控制。触发词：手机控制、设备投屏、ADB连接、应用安装、设备扫描、屏幕镜像、远程控制、应用管理、系统诊断、手机投屏。基于ADB和scrcpy实现设备连接、屏幕镜像、应用管理、文件传输、系统诊断等功能。
---

# 局域网控制

基于 ADB + scrcpy 的 Android 设备管理与控制系统。

## 核心能力

```
设备连接 → 屏幕镜像 → 远程控制 → 应用管理 → 系统诊断
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼
  WiFi/USB   实时显示   鼠标键盘   安装卸载   日志分析
```

## 技术架构

### 1. 桌面端
- **技术栈**：Electron + React + Node.js
- **支持平台**：macOS、Windows
- **核心模块**：
  - 设备连接管理
  - 屏幕镜像显示（scrcpy）
  - 远程控制交互
  - 文件传输
  - 应用管理

### 2. 手机端
- **目标系统**：Android 7.1.2+
- **通信协议**：ADB + WebSocket + HTTP
- **主要功能**：权限管理、屏幕共享、文件访问

### 3. 项目位置
```bash
/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制
```

## 功能清单

### 设备管理

```bash
# 1. 扫描局域网设备
# 自动扫描网段内所有 Android 设备（端口 5555, 5037, 4444, 5556）
# 获取设备品牌、型号、Android 版本

# 2. 连接设备
adb connect <IP>:5555

# 3. 查看已连接设备
adb devices -l

# 4. 断开设备
adb disconnect <IP>:5555
```

### 屏幕镜像

```bash
# 启动屏幕镜像（scrcpy）
# - 实时显示手机屏幕
# - 支持 60fps 流畅显示
# - 延迟 < 100ms
# - 支持全屏、截图、录屏

# 参数：
# - 画面质量和分辨率设置
# - 帧率和比特率调整
```

### 远程控制

```bash
# 鼠标点击 → 触摸事件
# 键盘输入 → 手机输入
# 手势操作：滑动、缩放、旋转
# 快捷键支持
```

### 应用管理

```bash
# 查看已安装应用
adb shell pm list packages

# 安装应用
adb install -r -g <app.apk>

# 卸载应用
adb uninstall <package_name>

# 启动应用
adb shell am start -n <package_name>/.MainActivity

# 停止应用
adb shell am force-stop <package_name>

# 清理应用数据
adb shell pm clear <package_name>

# 启用/禁用应用
adb shell pm enable <package_name>
adb shell pm disable <package_name>
```

### 系统诊断

```bash
# 设备信息
adb shell getprop ro.build.version.release  # Android 版本
adb shell getprop ro.product.model           # 设备型号
adb shell getprop ro.product.cpu.abi         # CPU 架构

# 内存状态
adb shell cat /proc/meminfo

# 存储空间
adb shell df -h

# 应用状态
adb shell dumpsys package <package_name>

# 崩溃日志
adb shell logcat -d | grep FATAL
adb shell logcat -d | grep CRASH

# 性能优化
adb shell pm clear <package_name>  # 清理缓存
```

### 文件传输

```bash
# 推送文件到手机
adb push <本地路径> <手机路径>

# 从手机拉取文件
adb pull <手机路径> <本地路径>

# 浏览手机文件
adb shell ls /sdcard/
```

## 使用场景

### 场景 1：连接并控制新设备

```bash
# 1. 扫描局域网设备
# 使用桌面端应用的"扫描设备"功能
# 或手动连接：adb connect 192.168.2.15:5555

# 2. 验证连接
adb devices -l

# 3. 启动屏幕镜像
# 在桌面端应用中点击"屏幕镜像"

# 4. 开始控制
# 鼠标点击 = 触摸
# 键盘输入 = 手机输入
```

### 场景 2：批量安装应用

```bash
# 示例：安装微信到 RK3399 设备（Android 7.1.2, arm64）

# 1. 连接设备
adb connect 192.168.2.15:5555

# 2. 卸载旧版（如果存在）
adb shell pm list packages | grep com.tencent.mm
adb shell am force-stop com.tencent.mm
adb uninstall com.tencent.mm

# 3. 安装新版
adb install -r -g 应用文件/weixin8062android2900_0x28003e39_arm64.apk

# 4. 验证安装
adb shell dumpsys package com.tencent.mm | grep versionName

# 5. 启动验证
adb shell monkey -p com.tencent.mm 1
```

### 场景 3：应用闪退修复

```bash
# 1. 检查设备信息
adb shell getprop ro.build.version.release
adb shell cat /proc/meminfo

# 2. 收集崩溃日志
adb shell logcat -d > logs/crash_$(date +%Y%m%d_%H%M%S).log
adb shell logcat -d | grep -E "FATAL|CRASH"

# 3. 分析问题
# - 权限不足：授予必要权限
# - 缓存问题：清理应用数据
# - 版本不兼容：更换适配版本

# 4. 执行修复
adb shell pm clear <package_name>  # 清理缓存
adb shell pm grant <package_name> <permission>  # 授予权限
adb shell pm enable <package_name>  # 启用应用

# 5. 验证修复
adb shell monkey -p <package_name> 1
```

### 场景 4：投屏方案部署

```bash
# MacBook 投屏到 Android 设备

# 方案 1：BetterDisplay + VNC
# - BetterDisplay 创建虚拟显示器
# - macOS 屏幕共享服务（端口 5900）
# - Android VNC 客户端连接

# 方案 2：RustDesk
# - Mac 和 Android 都安装 RustDesk
# - 双向远程桌面连接

# 方案 3：AnyDesk
# - 轻量级远程控制
# - 支持 Android 7.1.2+
```

## 常用设备配置

### RK3399 设备（192.168.2.15）

```yaml
型号: RK3399
系统: Android 7.1.2
构建: RK3399_android7.1_20200421092001
架构: arm64-v8a
IP: 192.168.2.15
ADB端口: 5555
序列号: CBI9SU7JNR

适配应用:
  - 微信: weixin8062android2900_0x28003e39_arm64.apk (v8.0.62)
  - 存客宝: ckb.apk (uni.app.UNI2B34F1A)
  - AnyDesk: anydesk.apk
  - RustDesk: rustdesk-1.4.2-universal.apk
  - 腾讯会议: wemeet_android6.apk
  - 飞书: 飞书_7.56.10_APKPure.apk
```

## 项目文件结构

```
局域网手机电脑控制/
├── 开发文档/
│   ├── 需求文档.md
│   ├── 功能迭代记录.md
│   └── 架构设计.md
├── 执行脚本/
│   ├── 安装脚本/
│   ├── 连接脚本/
│   └── 测试脚本/
├── 文档/
│   ├── 安装文档/
│   ├── 连接文档/
│   └── 测试文档/
├── 应用文件/        # APK 安装包
├── ROM文件/         # 系统镜像
├── 数据备份/        # 设备备份
├── 桌面端/          # Electron 应用
│   ├── src/
│   └── out/
├── 手机端/          # Android 应用
└── config/          # 配置文件
```

## 执行协议

### 当用户说"手机控制"、"设备投屏"时

```bash
# 1. 定位问题
询问用户具体需求：
- 连接新设备？
- 安装应用？
- 屏幕镜像？
- 系统诊断？

# 2. 检查环境
- 设备 IP 和端口
- ADB 连接状态
- 设备系统版本和架构

# 3. 执行操作
根据需求执行对应功能

# 4. 验证结果
确认操作成功并汇报
```

### 当用户说"应用安装"、"应用管理"时

```bash
# 1. 收集信息
- 目标应用名称
- 设备信息（IP、系统版本、架构）
- APK 文件路径

# 2. 检查兼容性
adb shell getprop ro.build.version.release  # Android 版本
adb shell getprop ro.product.cpu.abi         # 架构

# 3. 安装流程
- 检查是否已安装
- 卸载旧版（如需要）
- 安装新版（adb install -r -g）
- 验证安装（dumpsys package）
- 启动测试（monkey）

# 4. 汇报结果
- 版本号
- 权限状态
- 启动状态
```

### 当用户说"系统诊断"、"应用闪退"时

```bash
# 1. 收集日志
adb shell logcat -d | grep -E "FATAL|CRASH" > crash.log

# 2. 系统信息
- Android 版本
- 内存状态
- 存储空间
- 应用状态

# 3. 分析问题
- 权限不足？
- 缓存问题？
- 版本不兼容？
- 系统资源不足？

# 4. 执行修复
- 清理缓存
- 授予权限
- 启用应用
- 优化性能

# 5. 生成诊断报告
保存到 logs/ 目录
```

## 安全原则

### 设备连接
- 首次连接需用户确认授权
- 支持连接密码保护
- 敏感操作需二次确认

### 应用操作
- 卸载应用前确认
- 清理数据前备份重要信息
- 避免误删系统应用

### 系统命令
- 危险命令（rm、dd、reboot）需明确警告
- 刷机操作必须先备份系统
- 优先使用 `-r -g` 参数安装（覆盖安装+授予权限）

## 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 屏幕镜像延迟 | < 100ms | scrcpy 优化 |
| 帧率 | 60fps | 流畅显示 |
| 设备扫描速度 | < 10s | 局域网 /24 网段 |
| 应用安装时间 | < 30s | 取决于 APK 大小 |
| ADB 连接稳定性 | > 95% | WiFi 连接 |

## 常见问题

### 1. ADB 连接失败

```bash
# 解决方案
adb kill-server
adb start-server
adb connect <IP>:5555

# 尝试其他常见端口
adb connect <IP>:5037
adb connect <IP>:4444
adb connect <IP>:5556
```

### 2. 屏幕镜像卡顿

```bash
# 降低分辨率
scrcpy -m 1024

# 降低比特率
scrcpy -b 2M

# 降低帧率
scrcpy --max-fps 30
```

### 3. 应用安装失败

```bash
# 检查架构兼容性
adb shell getprop ro.product.cpu.abi

# 检查 Android 版本
adb shell getprop ro.build.version.release

# 检查存储空间
adb shell df -h /data

# 强制覆盖安装
adb install -r -d -g <app.apk>
```

### 4. 应用白屏/闪退

```bash
# 检查应用状态
adb shell dumpsys package <package_name> | grep enabled

# 启用应用
adb shell pm enable <package_name>

# 清理缓存
adb shell pm clear <package_name>

# 授予权限
adb shell pm grant <package_name> android.permission.WRITE_EXTERNAL_STORAGE
```

## 快捷命令参考

### 设备信息速查

```bash
# 一键获取设备完整信息
adb shell "echo '=== 设备信息 ==='; \
  getprop ro.product.model; \
  getprop ro.build.version.release; \
  getprop ro.product.cpu.abi; \
  echo '=== 内存 ==='; \
  cat /proc/meminfo | grep MemTotal; \
  echo '=== 存储 ==='; \
  df -h /data"
```

### 应用状态速查

```bash
# 一键检查应用状态
adb shell "dumpsys package <package_name> | \
  grep -E 'versionName|versionCode|enabled|userId|permission'"
```

## 通用使用场景

### 场景 A：全新环境快速部署

```yaml
环境: 任何局域网（家庭/办公室/会议室）
网段: 自动检测（192.168.x.0/24）
目标: 10分钟内控制所有设备

步骤:
1. 运行设备扫描脚本
   chmod +x scripts/局域网设备管理.sh
   ./scripts/局域网设备管理.sh

2. 自动完成:
   - 检测本机IP和网段
   - 扫描254个IP地址
   - 识别设备类型
   - 显示可控制设备列表

3. 选择操作:
   - 连接 Android 设备
   - 启动屏幕镜像
   - 连接 VNC/RDP
   - 安装应用

输出示例:
📱 Android 手机/平板 (3 台)
  1  192.168.1.100   Xiaomi 12          Android 13      ADB-WiFi
  2  192.168.1.101   OPPO Find X5       Android 12      ADB-WiFi VNC
  3  192.168.1.102   Samsung Galaxy     Android 11      ADB-WiFi

📺 Android TV (2 台)
  1  192.168.1.50    Rockchip RK3399    Android 7.1.2   ADB-WiFi VNC
  2  192.168.1.51    TCL Smart TV       Android 11      ADB-WiFi

💻 电脑 (4 台)
  1  192.168.1.10    MacBook Pro        VNC/RDP         VNC SSH
  2  192.168.1.11    Windows PC         VNC/RDP         RDP
  3  192.168.1.12    Linux Server       SSH             SSH
  4  192.168.1.13    iMac               VNC             VNC

可控制设备总数: 9 台
```

### 场景 B：跨网段设备控制

```yaml
环境: 不同网段（如：192.168.2.x → 192.168.3.x）
方案: 手动指定IP或配置路由

方法1: 直接指定IP
  adb connect 192.168.3.100:5555
  
方法2: 修改扫描网段
  对AI说："扫描 192.168.3.x 网段的设备"
  
方法3: VPN隧道
  连接到同一VPN后进行控制
```

### 场景 C：会议室设备批量部署

```yaml
目标: 会议室电视 + 多台平板
应用: 腾讯会议、飞书、存客宝

操作:
1. 扫描发现所有设备
2. 批量连接Android设备
3. 统一安装会议应用
4. 配置自动启动
5. 设置开机自启

命令示例:
# 对AI说：
"扫描局域网设备"
"连接所有 Android TV"
"安装腾讯会议到所有设备"
"设置开机自启动腾讯会议"
```

### 场景 D：多地点设备管理

```yaml
场景: 家里 + 公司 + 客户现场
方案: 设备配置文件管理

家庭网络 (192.168.1.x):
- 手机: 192.168.1.100
- 电视: 192.168.1.50
- iPad: 192.168.1.101

公司网络 (192.168.2.x):
- 会议室TV: 192.168.2.15
- 演示平板1: 192.168.2.16
- 演示平板2: 192.168.2.17

客户现场 (自动检测):
- 扫描并临时连接
- 完成后断开

操作:
对AI说："切换到家庭网络"
对AI说："切换到公司网络"  
对AI说："扫描当前网络"
```

## 实战案例库

### 案例 1：RK3399 微信安装（2025-09）

```yaml
设备: Rockchip RK3399
系统: Android 7.1.2, arm64
IP: 192.168.2.15
目标: 卸载旧版微信 → 安装 8.0.62 arm64 版本

执行流程:
1. 网络测试:
   ping 192.168.2.15 -c 2 -W 1000
   → 在线（0%丢包，avg≈20.8ms）

2. ADB连接:
   adb connect 192.168.2.15:5555
   → 成功连接

3. 检查已安装:
   adb shell pm list packages | grep com.tencent.mm
   → 发现旧版本

4. 卸载旧版:
   adb shell am force-stop com.tencent.mm
   adb uninstall com.tencent.mm
   → Success

5. 检查系统信息:
   Android: 7.1.2
   ABI: arm64-v8a
   /data 可用: 20GB

6. 安装新版:
   adb install -r -g weixin8062android2900_0x28003e39_arm64.apk
   → Success

7. 验证安装:
   adb shell dumpsys package com.tencent.mm | grep versionName
   → versionName=8.0.62

8. 启动测试:
   adb shell monkey -p com.tencent.mm 1
   → 成功注入事件，应用启动正常

结果: ✓ 一次成功，耗时约3分钟
```

### 案例 2：存客宝白屏修复（2025-01）

```yaml
设备: RK3399, 192.168.2.15
应用: 存客宝 (uni.app.UNI2B34F1A)
问题: 安装后点击白屏无响应

诊断流程:
1. 检查应用状态:
   adb shell dumpsys package uni.app.UNI2B34F1A | grep enabled
   → enabled=0 (被禁用)

2. 检查启动Activity:
   adb shell dumpsys package uni.app.UNI2B34F1A | grep activity
   → io.dcloud.PandoraEntry

3. 收集崩溃日志:
   adb shell logcat -d | grep -E "FATAL|CRASH"
   → 无崩溃日志，确认是禁用问题

修复步骤:
1. 启用应用:
   adb shell pm enable uni.app.UNI2B34F1A
   → Package uni.app.UNI2B34F1A new state: enabled

2. 清理缓存:
   adb shell pm clear uni.app.UNI2B34F1A
   → Success

3. 启动验证:
   adb shell am start -n uni.app.UNI2B34F1A/io.dcloud.PandoraEntry
   → Starting: Intent { cmp=uni.app.UNI2B34F1A/.io.dcloud.PandoraEntry }

4. 检查进程:
   adb shell ps | grep UNI2B34F1A
   → 发现主进程和jse进程都在运行

结果: ✓ 应用正常启动，白屏问题解决
```

### 案例 3：MacBook 扩展屏方案（2025-01）

```yaml
需求: MacBook 投屏到 Android 设备作为扩展屏
设备: 
  - Mac: 192.168.2.7 (MacBook Pro)
  - Android: 192.168.2.15 (RK3399)

方案选择:
✗ Sidecar - 仅支持 iPad
✗ Duet Display - 需要付费且性能一般
✓ BetterDisplay + VNC - 免费且性能好

实施步骤:
1. Mac端配置:
   - 启动 BetterDisplay.app（已安装）
   - 创建虚拟显示器（1920x1080）
   - 启用系统屏幕共享
     系统偏好设置 → 共享 → 屏幕共享 ✓

2. 检查网络:
   Mac IP: 192.168.2.7
   VNC端口: 5900（默认）
   防火墙: 允许屏幕共享

3. Android端配置:
   - 检查 VNC 客户端
     adb shell pm list packages | grep vnc
   - 安装 VNC Viewer (如未安装)
   - 配置连接: 192.168.2.7:5900

4. 连接测试:
   # Mac端
   系统偏好设置 → 显示器 → 检测到虚拟显示器
   
   # Android端
   打开 VNC Viewer
   输入: 192.168.2.7:5900
   连接成功 → 显示Mac虚拟显示器内容

5. 优化配置:
   - 分辨率: 1920x1080 (匹配Android屏幕)
   - 帧率: 30fps (流畅度足够)
   - 质量: Medium (平衡性能)

结果: 
✓ Android 设备成功作为 MacBook 扩展屏
✓ 延迟约 50-100ms，日常使用流畅
✓ 可用于演示、会议、扩展工作区
```

### 案例 4：多设备批量管理（2025-01）

```yaml
场景: 公司会议室设备部署
设备: 
  - TV1: 192.168.2.15 (RK3399)
  - TV2: 192.168.2.20 (TCL Android TV)
  - Pad1: 192.168.2.16 (小米平板)
  - Pad2: 192.168.2.17 (华为平板)

任务: 统一安装腾讯会议、飞书、WPS

操作流程:
1. 扫描设备:
   ./scripts/局域网设备管理.sh
   → 发现4台Android设备

2. 批量连接:
   for ip in 192.168.2.{15,20,16,17}; do
     adb connect $ip:5555
   done
   → 4台设备全部连接成功

3. 批量安装应用:
   # 腾讯会议
   for device in $(adb devices | grep device$ | awk '{print $1}'); do
     adb -s $device install -r -g wemeet_android6.apk
   done
   
   # 飞书
   for device in $(adb devices | grep device$ | awk '{print $1}'); do
     adb -s $device install -r -g 飞书_7.56.10_APKPure.apk
   done
   
   # WPS Office
   for device in $(adb devices | grep device$ | awk '{print $1}'); do
     adb -s $device install -r -g wps_office.apk
   done

4. 验证安装:
   for device in $(adb devices | grep device$ | awk '{print $1}'); do
     echo "=== $device ==="
     adb -s $device shell pm list packages | grep -E "wemeet|feishu|wps"
   done

5. 设置开机自启:
   # 腾讯会议
   for device in $(adb devices | grep device$ | awk '{print $1}'); do
     adb -s $device shell pm enable com.tencent.wemeet
     adb -s $device shell am start -n com.tencent.wemeet/.MainActivity
   done

结果:
✓ 4台设备全部完成部署
✓ 总耗时约15分钟
✓ 所有应用可正常启动
```

### 案例 5：远程技术支持（2025-01）

```yaml
场景: 客户现场设备问题排查
设备: 客户的 Android TV (未知IP)
问题: 应用闪退

远程支持流程:
1. 引导客户提供信息:
   "请告诉我您的设备IP地址"
   方法: 设置 → 关于 → 状态 → IP地址
   获得: 192.168.3.88

2. 尝试连接:
   ping 192.168.3.88
   → 网络不通（不在同一网段）
   
   方案: 引导客户连接同一WiFi或使用VPN

3. 成功连接后:
   adb connect 192.168.3.88:5555
   → connected to 192.168.3.88:5555

4. 系统诊断:
   # 收集设备信息
   adb shell getprop ro.product.model
   adb shell getprop ro.build.version.release
   
   # 收集崩溃日志
   adb shell logcat -d > crash_log.txt
   grep -E "FATAL|CRASH" crash_log.txt

5. 问题分析:
   发现: 应用权限不足导致崩溃
   
6. 远程修复:
   # 授予必要权限
   adb shell pm grant <package_name> android.permission.WRITE_EXTERNAL_STORAGE
   adb shell pm grant <package_name> android.permission.READ_EXTERNAL_STORAGE
   
   # 清理缓存
   adb shell pm clear <package_name>
   
   # 重启应用
   adb shell am start -n <package_name>/.MainActivity

7. 验证修复:
   adb shell ps | grep <package_name>
   → 进程正常运行

结果:
✓ 远程完成问题诊断和修复
✓ 无需到现场
✓ 客户满意度高
```

### 案例 6：跨网段设备控制（2025-01）

```yaml
场景: 控制不同网段的设备
网络: 
  - 本机: 192.168.110.141/24
  - 目标: 192.168.2.15/24

问题: 不在同一网段无法直接连接

解决方案:

方案1: 路由器配置（推荐）
1. 登录路由器管理界面
2. 添加静态路由:
   目标网段: 192.168.2.0/24
   网关: 本机所在网关
3. 测试连接:
   ping 192.168.2.15
   adb connect 192.168.2.15:5555

方案2: VPN隧道
1. 在两个网段间建立VPN
2. 通过VPN连接后再控制设备

方案3: 端口转发
1. 在192.168.2.x网段找一台可访问的设备
2. 配置端口转发:
   ssh -L 5555:192.168.2.15:5555 user@gateway
3. 连接本地端口:
   adb connect localhost:5555

方案4: 切换网络（最简单）
1. 将Mac连接到 192.168.2.x 网段的WiFi
2. 直接控制设备

实际操作:
采用方案4，切换到目标网段WiFi
→ 成功连接并控制设备
```

## 注意事项

### 执行前检查
1. 确认设备 IP 和端口（默认 5555）
2. 检查 ADB 连接状态（`adb devices`）
3. 确认设备系统版本和架构
4. 检查存储空间是否充足

### 操作规范
1. 优先复用本地脚本和 APK，减少重复下载
2. 安装应用前检查是否已安装，避免冲突
3. 删除/卸载操作前务必确认设备为 `device` 状态
4. 下载缓慢时及时中断，更换镜像源或直链

### 日志记录
1. 重要操作记录到 `logs/` 目录
2. 诊断报告使用时间戳命名：`diagnostic_YYYYMMDD_HHMMSS.txt`
3. 成功案例更新到 `项目规则文档.md`

### 项目更新
1. 每次成功执行闭环后更新 `项目规则文档.md`
2. 新增功能更新 `功能迭代记录.md`
3. 重要配置记录到 `config/` 目录

## 相关资源

### 本目录
- [公司路由器配置](references/公司路由器配置.md) — H3C ER2200G2 管理地址、WAN/LAN 配置
- [快速参考](references/快速参考.md) — 常用命令与触发词速查

### 官方文档
- [Android ADB 官方文档](https://developer.android.com/tools/adb)
- [scrcpy GitHub](https://github.com/Genymobile/scrcpy)

### 项目文档
- 需求文档：`开发文档/需求文档.md`
- 功能迭代：`开发文档/功能迭代记录.md`
- 架构设计：`开发文档/架构设计.md`
- 项目规则：`项目规则文档.md`

### 应用资源
- APK 安装包：`应用文件/`
- ROM 镜像：`ROM文件/`
- 配置文件：`config/`
- 日志文件：`logs/`
