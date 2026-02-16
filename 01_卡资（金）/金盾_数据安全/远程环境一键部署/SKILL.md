---
name: 远程环境一键部署
version: "1.0"
owner: 金盾
group: 金
triggers: [远程部署, 一键部署, 装Clash, 装Cursor, 远程装环境]
updated: "2026-02-14"
description: 远程服务器环境一键配置与Clash代理部署
---

# 远程环境一键部署

> 一句话说明：一键在远程 Windows/Mac 系统上安装 Clash Verge Rev（代理）+ Cursor（编辑器），自动配置订阅和账号。

---

## 触发条件

用户说以下关键词时自动激活：
- 远程部署、一键部署
- 装 Clash、装 Cursor
- 远程装环境、部署远程机器

---

## 部署内容

| 序号 | 软件 | 用途 | 配置 |
|:---|:---|:---|:---|
| 1 | Clash Verge Rev | 代理客户端 | 自动导入订阅 URL，开启系统代理 |
| 2 | Cursor | AI 编辑器 | 自动保存登录凭据到桌面 |
| 3 | Docker Desktop | 容器平台 | 自动安装 + 国内镜像加速（腾讯/中科大/网易/官方） |
| 4 | Ubuntu Linux 容器 | 开发环境 | 预装 git/python3/node/vim，清华 apt 源，持久化 /workspace |

---

## 执行步骤

### 1. 准备部署包

部署包位置：`package/` 目录（已打包为 `远程环境一键部署.zip`）

```
package/
├── 一键部署.bat           # Windows 入口（双击即可）
├── setup_mac.command      # Mac 入口（双击即可）
├── deploy_windows.ps1     # Windows 完整部署脚本
├── deploy_mac.sh          # Mac 完整部署脚本
└── README.txt             # 使用说明
```

### 2. 部署方式

**Windows：**
1. 解压 `远程环境一键部署.zip`
2. 右键 `一键部署.bat` → 以管理员身份运行
3. 等待自动完成

**Mac：**
1. 解压 `远程环境一键部署.zip`
2. 双击 `setup_mac.command`（首次需在安全设置中允许）
3. 等待自动完成

### 3. 一键命令（远程执行）

**Windows PowerShell（管理员）：**
```powershell
irm https://raw.githubusercontent.com/fnvtk/karuo-deploy/main/deploy_windows.ps1 -OutFile $env:TEMP\deploy.ps1; powershell -ExecutionPolicy Bypass -File $env:TEMP\deploy.ps1
```

**Mac 终端：**
```bash
curl -fsSL https://raw.githubusercontent.com/fnvtk/karuo-deploy/main/deploy_mac.sh | bash
```

**下载完整 zip 包：**
```bash
# Windows PowerShell
Invoke-WebRequest -Uri "https://github.com/fnvtk/karuo-deploy/releases/latest/download/karuo-deploy.zip" -OutFile karuo-deploy.zip

# macOS / Linux
curl -LO https://github.com/fnvtk/karuo-deploy/releases/latest/download/karuo-deploy.zip
```

**GitHub 仓库：** https://github.com/fnvtk/karuo-deploy

---

## 部署流程图

```
开始
  ├─ [1] 下载 Clash Verge Rev (GitHub Releases)
  ├─ [2] 静默安装 Clash Verge Rev
  ├─ [3] 写入代理订阅配置 + 启用系统代理
  ├─ [4] 启动 Clash，等待代理就绪 (google.com)
  ├─ [5] 下载并安装 Cursor
  ├─ [6] 保存 Cursor 登录信息到桌面
  ├─ [7] 安装 Docker Desktop + 配置国内镜像加速
  ├─ [8] 拉取 Ubuntu 22.04 + 创建开发容器 (karuo-linux)
  └─ 完成！
```

---

## 输出格式

```
[远程环境一键部署] 执行完成
├─ Clash Verge Rev：已安装，订阅已配置，代理已启用
├─ Cursor：已安装，登录信息已保存到桌面
├─ Docker Desktop：已安装，国内镜像已配置
├─ Ubuntu Linux：容器已就绪 (docker exec -it karuo-linux bash)
├─ 网络验证：通过
└─ 耗时：约 x 分钟
```

---

## 配套脚本

| 脚本 | 用途 |
|:---|:---|
| package/deploy_windows.ps1 | Windows 完整自动部署脚本 |
| package/deploy_mac.sh | Mac 完整自动部署脚本 |
| package/一键部署.bat | Windows 一键启动入口 |
| package/setup_mac.command | Mac 一键启动入口 |

---

## 配置信息

### 代理订阅
- URL: `https://api.v6v.eu/api/v1/client/subscribe?token=371fe0545c77e4d9efdf2906a865e403`
- 节点：香港/台湾/新加坡/日本/美国/韩国/德国/荷兰/加拿大/英国/澳洲等
- 协议：Trojan + Hysteria2

### Cursor 账号
- 邮箱: `WilliamAtkins4153@outlook.com`
- 密码: `?056uXrtaWKQ`

---

### Docker 容器
- 容器名: `karuo-linux`
- 系统: Ubuntu 22.04
- 预装工具: git, curl, python3, node, npm, vim, build-essential
- apt 源: 清华镜像（国内加速）
- 持久化卷: `karuo-workspace` → 容器内 `/workspace`
- 使用: `docker exec -it karuo-linux bash`

### macOS 容器
- 仅在 Linux 宿主机（需 KVM）上可用
- 镜像: `sickcodes/docker-osx:auto`
- Windows 推荐用 VMware/UTM 运行 macOS 虚拟机
- Mac 上无需 Docker 运行 macOS（已在原生环境）

---

## 安全原则

- 登录信息文件使用后立即删除
- 订阅 token 不在公开仓库中存储
- 代理配置仅限内部使用

---

## 版本记录

| 日期 | 版本 | 变更 |
|:---|:---|:---|
| 2026-02-14 | 1.0 | 初始版本：Clash Verge Rev + Cursor 一键部署 |
