---
name: 群晖NAS管理
description: 群晖NAS矩阵运维与Docker容器管理
triggers: NAS、群晖、Docker、Synology、QuickConnect
owner: 金仓
group: 金
version: "1.0"
updated: "2026-02-16"
---

# 群晖NAS管理

统一管理卡若私域数字底座的NAS矩阵，支持DSM、Docker、虚拟机、MongoDB、Qdrant、宝塔中控等核心服务。

---

## 快速入口（复制即用）

### 内网访问

| 服务 | 地址 | 备注 |
|------|------|------|
| **DSM管理界面** | http://192.168.1.201:5000 | 主控台 |
| **MongoDB** | `mongodb://admin:admin123@192.168.1.201:27017/` | AI微信数据库 |
| **Qdrant向量库** | http://192.168.1.201:6333 | RAG检索 |
| **bt-hub中控** | http://192.168.1.201:8890 | 宝塔统一管理 |
| **本地宝塔** | http://192.168.1.201:8888 | 网站管理 |
| **Windows VM** | http://192.168.1.201:8006 | Windows远程桌面（按需启动） |
| **macOS VM** | http://192.168.1.201:8007/?qualityLevel=3&compressionLevel=6&resize=scale | macOS远程桌面（流畅优化 URL） |
| **Cursor 网页版** | http://192.168.1.201:5800 | 浏览器内使用Cursor编程 |
| **code-server** | http://192.168.1.201:8443 | VS Code网页版（备选） |

### 外网访问

| 服务 | 地址 |
|------|------|
| **Gitea（CKB Git）** | http://open.quwanzhi.com:3000 |
| **QuickConnect** | https://udbfnvtk.quickconnect.cn |
| **QuickConnect ID** | `udbfnvtk` |

> Gitea 创建/推送/API 统一由 **Gitea管理 Skill** 负责，见 `金仓/Gitea管理/SKILL.md`。QuickConnect 无需端口映射。

---

## 核心环境

### NAS硬件信息

| 项目 | 配置 |
|------|------|
| **型号** | Synology DS1825+ (8盘位) |
| **CPU** | AMD Ryzen Embedded V1500B (4核8线程) |
| **内存** | 8GB DDR4 ECC (可扩展至32GB) |
| **存储** | 21TB 可用 (BTRFS) |
| **网络** | 双千兆网口 + PCIe扩展槽 |

### NAS节点信息

| 节点 | 内网IP | 外网入口 | 主机名 | 用途 |
|------|--------|----------|--------|------|
| **NAS-2 (主节点)** | `192.168.1.201` | https://udbfnvtk.quickconnect.cn | CKBNAS | 存储与容器管理主控 |
| **NAS-1 (备用)** | `192.168.1.200` | - | - | 管理节点 |

### 账号凭证

```bash
# NAS-2 主节点 (192.168.1.201)
主账户: fnvtk / zhiqun1984
备用账户: admin / zhiqun1984

# NAS-1 备用节点 (192.168.1.200)
账户: admin / zhiqun1984

# MongoDB (Docker容器)
默认用户: admin / admin123
认证数据库: admin
```

> ⚠️  **重要提示**：密码全部为小写 `zhiqun1984`，MongoDB默认账号密码可通过脚本自动获取。

### 关键端口

| 端口 | 服务 | 说明 |
|------|------|------|
| 5000 | DSM (HTTP) | 管理界面 |
| 5001 | DSM (HTTPS) | 加密访问 |
| 22 | SSH | 远程命令 |
| 27017 | MongoDB | 数据库 |
| 6333 | Qdrant | 向量检索 |
| 8890 | bt-hub | 宝塔中控 |
| 8888 | 本地宝塔 | 网站管理 |

---

## 一键操作（卡若习惯）

### 1. SSH快速连接

```bash
# 方式1: 配置别名后直接用（推荐）
ssh nas

# 方式2: 完整命令（首次使用）
ssh -o KexAlgorithms=+diffie-hellman-group1-sha1 \
    -o Ciphers=+aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc \
    -o StrictHostKeyChecking=no \
    fnvtk@192.168.1.201

# 方式3: sshpass自动登录
sshpass -p 'zhiqun1984' ssh -o KexAlgorithms=+diffie-hellman-group1-sha1 \
    -o Ciphers=+aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc \
    fnvtk@192.168.1.201
```

**一劳永逸：添加到 `~/.ssh/config`**

```bash
Host nas nas2
    HostName 192.168.1.201
    User fnvtk
    KexAlgorithms +diffie-hellman-group1-sha1
    Ciphers +aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc
    StrictHostKeyChecking no

Host nas1
    HostName 192.168.1.200
    User admin
    KexAlgorithms +diffie-hellman-group1-sha1
    Ciphers +aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc
```

### 2. Docker容器管理

```bash
# 群晖Docker路径（必须用绝对路径）
DOCKER="/volume1/@appstore/ContainerManager/usr/bin/docker"
COMPOSE="$DOCKER compose"

# 查看运行中容器
ssh nas "$DOCKER ps"

# 查看所有容器（含停止的）
ssh nas "$DOCKER ps -a"

# 查看容器资源占用
ssh nas "$DOCKER stats --no-stream"

# 重启容器
ssh nas "$DOCKER restart mongodb"

# 查看日志
ssh nas "$DOCKER logs -f --tail 100 mongodb"

# 进入容器
ssh nas "$DOCKER exec -it mongodb bash"
```

### 3. 虚拟机管理（按需启动）

虚拟机默认不自动启动，节省NAS资源。需要时手动启动。

```bash
# ===== Windows 虚拟机 =====
# 启动
ssh nas "cd /volume1/docker/windows-vm && echo 'zhiqun1984' | sudo -S /volume1/@appstore/ContainerManager/usr/bin/docker compose up -d"

# 停止
ssh nas "cd /volume1/docker/windows-vm && echo 'zhiqun1984' | sudo -S /volume1/@appstore/ContainerManager/usr/bin/docker compose down"

# 访问: http://192.168.1.201:8006 (Web VNC)
# RDP: 192.168.1.201:3389 (安装完成后)

# ===== macOS 虚拟机 =====
# 启动
ssh nas "cd /volume1/docker/macos-vm && echo 'zhiqun1984' | sudo -S /volume1/@appstore/ContainerManager/usr/bin/docker compose up -d"

# 停止
ssh nas "cd /volume1/docker/macos-vm && echo 'zhiqun1984' | sudo -S /volume1/@appstore/ContainerManager/usr/bin/docker compose down"

# 访问: http://192.168.1.201:8007 (Web VNC)
# VNC: vnc://192.168.1.201:5901

# ===== 查看虚拟机状态 =====
ssh nas "/volume1/@appstore/ContainerManager/usr/bin/docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'windows-vm|macos-vm'"
```

#### 虚拟机配置参考

| VM | 镜像 | 内存 | CPU | 存储 | 端口 |
|----|------|------|-----|------|------|
| Windows | dockurr/windows | 4GB | 2核 | 64GB | 8006, 3389 |
| macOS | dockurr/macos | 4GB | 2核 | 64GB | 8007, 5901 |

> **macOS noVNC 卡顿**：见 `references/noVNC_macOS_VM流畅度优化.md`。优先用优化 URL：`http://IP:8007/?qualityLevel=3&compressionLevel=6&resize=scale`

#### docker-compose 示例 (Windows)

```yaml
# /volume1/docker/windows-vm/docker-compose.yml
version: "3.8"
services:
  windows:
    image: dockurr/windows
    container_name: windows-vm
    environment:
      - VERSION=2022
      - RAM_SIZE=4G
      - CPU_CORES=2
      - DISK_SIZE=64G
    ports:
      - "8006:8006"
      - "3389:3389"
    volumes:
      - /volume1/vm/windows:/storage
    devices:
      - /dev/kvm
    cap_add:
      - NET_ADMIN
    restart: "no"
```

#### docker-compose 示例 (macOS) — 流畅度优化版

```yaml
# /volume1/docker/macos-vm/docker-compose.yml
version: "3.8"
services:
  macos:
    image: dockurr/macos
    container_name: macos-vm
    environment:
      - VERSION=ventura
      - RAM_SIZE=4G              # 3G→4G 提升响应
      - CPU_CORES=2              # 1核→2核 减轻卡顿
      - DISK_SIZE=64G
    ports:
      - "8007:8006"
      - "5901:5900"
    volumes:
      - /volume1/vm/macos:/storage
    devices:
      - /dev/kvm
    cap_add:
      - NET_ADMIN
    restart: "no"
    deploy:
      resources:
        limits:
          memory: 4500M
```

### 4. Cursor 网页版（Web IDE）

在NAS上部署Cursor，通过浏览器远程访问编程。

#### 方案对比

| 方案 | 镜像 | 特点 | 推荐场景 |
|------|------|------|----------|
| **cursor-container** | `recluzegeek/cursor-container` | 真正的Cursor，带AI功能 | 想用Cursor AI |
| **code-server** | `linuxserver/code-server` | VS Code网页版，更稳定 | 纯编辑需求 |

#### 一键部署 Cursor 网页版

```bash
# ===== 步骤1: 创建目录 =====
ssh nas "mkdir -p /volume1/docker/cursor-web /volume1/projects"

# ===== 步骤2: 创建docker-compose.yml =====
ssh nas "cat > /volume1/docker/cursor-web/docker-compose.yml << 'EOF'
version: \"3.8\"
services:
  cursor:
    image: recluzegeek/cursor-container
    container_name: cursor-web
    environment:
      - APP_USER_ID=1026
      - APP_GROUP_ID=100
      - DISPLAY_WIDTH=1920
      - DISPLAY_HEIGHT=1080
    ports:
      - \"5800:5800\"
      - \"5900:5900\"
    volumes:
      - /volume1/projects:/config/workspace
      - /volume1/docker/cursor-web/config:/config
    restart: unless-stopped
EOF"

# ===== 步骤3: 启动 =====
ssh nas "cd /volume1/docker/cursor-web && echo 'zhiqun1984' | sudo -S /volume1/@appstore/ContainerManager/usr/bin/docker compose up -d"

# ===== 步骤4: 查看状态 =====
ssh nas "/volume1/@appstore/ContainerManager/usr/bin/docker ps | grep cursor"
```

#### 访问 Cursor 网页版

```
🌐 浏览器访问: http://192.168.1.201:5800
📺 VNC客户端: vnc://192.168.1.201:5900

外网访问（需配置端口转发或用Tailscale）:
https://udbfnvtk.quickconnect.cn → 仅DSM，不含Docker端口
```

#### Cursor 常用操作

```bash
# 启动
ssh nas "cd /volume1/docker/cursor-web && echo 'zhiqun1984' | sudo -S /volume1/@appstore/ContainerManager/usr/bin/docker compose up -d"

# 停止
ssh nas "cd /volume1/docker/cursor-web && echo 'zhiqun1984' | sudo -S /volume1/@appstore/ContainerManager/usr/bin/docker compose down"

# 重启
ssh nas "echo 'zhiqun1984' | sudo -S /volume1/@appstore/ContainerManager/usr/bin/docker restart cursor-web"

# 查看日志
ssh nas "/volume1/@appstore/ContainerManager/usr/bin/docker logs -f cursor-web"
```

#### 备选方案: code-server (VS Code网页版)

如果cursor-container不稳定，可用更成熟的code-server：

```bash
# 创建目录
ssh nas "mkdir -p /volume1/docker/code-server /volume1/projects"

# 创建配置
ssh nas "cat > /volume1/docker/code-server/docker-compose.yml << 'EOF'
version: \"3.8\"
services:
  code-server:
    image: linuxserver/code-server:latest
    container_name: code-server
    environment:
      - PUID=1026
      - PGID=100
      - TZ=Asia/Shanghai
      - PASSWORD=zhiqun1984
      - SUDO_PASSWORD=zhiqun1984
      - DEFAULT_WORKSPACE=/config/workspace
    ports:
      - \"8443:8443\"
    volumes:
      - /volume1/docker/code-server/config:/config
      - /volume1/projects:/config/workspace
    restart: unless-stopped
EOF"

# 启动
ssh nas "cd /volume1/docker/code-server && echo 'zhiqun1984' | sudo -S /volume1/@appstore/ContainerManager/usr/bin/docker compose up -d"

# 访问: http://192.168.1.201:8443
# 密码: zhiqun1984
```

#### 配置说明

| 配置项 | 值 | 说明 |
|--------|-----|------|
| 端口 | 5800 (Web), 5900 (VNC) | Cursor网页版 |
| 端口 | 8443 | code-server |
| 工作目录 | `/volume1/projects` | 项目文件存放 |
| 分辨率 | 1920x1080 | 可在环境变量调整 |

### 5. MongoDB快速操作

```bash
# 【方式1】运行自动检查脚本（推荐）
python3 /Users/karuo/Documents/个人/卡若AI/01_系统管理/群晖NAS管理/scripts/get_mongodb_info.py

# 【方式2】手动连接字符串
mongodb://admin:admin123@192.168.1.201:27017/

# 【方式3】进入MongoDB Shell
ssh nas "/volume1/@appstore/ContainerManager/usr/bin/docker exec -it mongodb mongosh -u admin -p admin123 --authenticationDatabase admin"

# MongoDB常用命令
show dbs                          # 列出所有数据库
use ai_wechat                     # 切换数据库
show collections                  # 列出集合
db.users.find().limit(5)          # 查询数据
db.stats()                        # 数据库状态
exit                              # 退出

# Python连接示例
from pymongo import MongoClient
client = MongoClient("mongodb://admin:admin123@192.168.1.201:27017/")
print(client.server_info())

# 检查MongoDB状态
ssh nas "/volume1/@appstore/ContainerManager/usr/bin/docker ps | grep mongo"
ssh nas "/volume1/@appstore/ContainerManager/usr/bin/docker restart mongodb"
```

### 5. 系统状态检查

```bash
# 内存
ssh nas "free -h"

# 磁盘
ssh nas "df -h | grep volume"

# CPU负载
ssh nas "uptime"

# 温度
ssh nas "cat /sys/bus/hwmon/devices/hwmon0/temp1_input" | awk '{print $1/1000"°C"}'

# Docker占用
ssh nas "/volume1/@appstore/ContainerManager/usr/bin/docker system df"
```

### 6. 文件同步（MacBook ↔ NAS）

```bash
# 上传到NAS
rsync -avz --progress /本地路径/ fnvtk@192.168.1.201:/volume1/目标路径/

# 从NAS下载
rsync -avz --progress fnvtk@192.168.1.201:/volume1/源路径/ /本地路径/

# 排除node_modules等大目录
rsync -avz --progress --exclude='node_modules' --exclude='.git' \
    /本地项目/ fnvtk@192.168.1.201:/volume1/projects/
```

---

## 宝塔中控 (bt-hub)

统一管理所有宝塔服务器的中控系统。

### 访问入口

```
内网: http://192.168.1.201:8890
API文档: http://192.168.1.201:8890/docs
```

### 核心功能

- **服务器资产管理**: 添加/删除/查询宝塔服务器
- **统一API代理**: 自动生成宝塔鉴权参数（request_time/request_token）
- **批量任务执行**: 一键操作多台服务器

### 已接入服务器

| 服务器 | IP | 用途 |
|--------|-----|------|
| 小型宝塔 | 42.194.232.22 | 通用项目 |
| 存客宝 | 42.194.245.239 | 私域银行 |
| kr宝塔 | 43.139.27.93 | 特殊项目 |

---

## DSM API调用

### 快速认证

```python
import requests

NAS_IP = "192.168.1.201"
USERNAME = "fnvtk"
PASSWORD = "zhiqun1984"

# 登录获取sid
login_url = f"http://{NAS_IP}:5000/webapi/auth.cgi"
params = {
    "api": "SYNO.API.Auth",
    "version": "3",
    "method": "login",
    "account": USERNAME,
    "passwd": PASSWORD,
    "session": "FileStation",
    "format": "sid"
}
response = requests.get(login_url, params=params)
sid = response.json()["data"]["sid"]
print(f"登录成功，SID: {sid[:20]}...")
```

### 常用API

| API | 用途 | 示例 |
|-----|------|------|
| SYNO.API.Auth | 登录认证 | 获取sid |
| SYNO.FileStation.List | 文件列表 | 浏览目录 |
| SYNO.FileStation.Upload | 上传文件 | 推送文件 |
| SYNO.FileStation.Download | 下载文件 | 拉取文件 |
| SYNO.DSM.Info | 系统信息 | 型号/温度 |

### Python库（推荐）

```bash
# 安装
pip install synology-api

# 使用
from synology_api import filestation

fs = filestation.FileStation(
    ip_address='192.168.1.201',
    port='5000',
    username='fnvtk',
    password='zhiqun1984',
    secure=False,
    cert_verify=False
)

# 列出共享文件夹
shares = fs.get_list_share()
print(shares)
```

---

## 目录结构

```
/volume1/
├── docker/              # Docker容器配置
│   ├── windows-vm/      # Windows虚拟机配置
│   ├── macos-vm/        # macOS虚拟机配置
│   ├── mongodb/         # MongoDB配置
│   └── qdrant/          # Qdrant配置
├── vm/                  # 虚拟机磁盘存储
│   ├── windows/         # Windows虚拟磁盘
│   └── macos/           # macOS虚拟磁盘
├── database/            # 数据库数据存储
├── assets/              # 企业数字资产(RAG语料)
├── homes/               # 用户目录
└── @appstore/           # 群晖套件
    └── ContainerManager/usr/bin/docker  # Docker命令
```

## Docker容器分类

### 虚拟机与开发环境（按需启动）

| 容器名称 | 中文说明 | 功能 | 端口 | 状态 |
|----------|----------|------|------|------|
| windows-vm | Windows虚拟机 | Windows Server 2022 远程桌面 | 8006, 3389 | 按需 |
| macos-vm | macOS虚拟机 | macOS Ventura 远程桌面 | 8007, 5901 | 按需 |
| cursor-web | Cursor网页版 | 浏览器内编程(带AI) | 5800, 5900 | 按需 |
| code-server | VS Code网页版 | 浏览器内编程(备选) | 8443 | 按需 |

### 内部服务（常驻运行）

| 容器名称 | 中文说明 | 功能 | 端口 |
|----------|----------|------|------|
| mongodb | MongoDB数据库 | AI微信数据存储 | 27017 |
| qdrant | Qdrant向量数据库 | RAG向量检索 | 6333, 6334 |

### 外部服务（常驻运行）

| 容器名称 | 中文说明 | 功能 | 端口 |
|----------|----------|------|------|
| rustdesk-hbbs | RustDesk信令服务 | 远程桌面信令 | 21115, 21116 |
| rustdesk-hbbr | RustDesk中继服务 | 远程桌面中继 | 21117, 21119 |

---

## 常见问题

### Q1: SSH连接被拒绝

```bash
# 错误: no matching key exchange method found
# 原因: 群晖使用旧版SSH算法
# 解决: 添加 -o KexAlgorithms=+diffie-hellman-group1-sha1
```

### Q2: Docker命令找不到

```bash
# 错误: docker: command not found
# 原因: 群晖Docker不在PATH中
# 解决: 使用绝对路径
/volume1/@appstore/ContainerManager/usr/bin/docker ps
```

### Q3: 权限不足

```bash
# sudo需要密码
echo 'zhiqun1984' | sudo -S <command>

# 或将用户加入docker组
sudo synogroup --add docker fnvtk
```

### Q4: 外网无法访问

```
1. 使用QuickConnect: https://udbfnvtk.quickconnect.cn
2. 或配置端口转发（路由器映射5000端口）
3. 检查DSM > 控制面板 > 外部访问 > QuickConnect是否启用
```

### Q5: MongoDB连接超时

```bash
# 检查容器状态
ssh nas "/volume1/@appstore/ContainerManager/usr/bin/docker ps | grep mongo"

# 重启MongoDB
ssh nas "/volume1/@appstore/ContainerManager/usr/bin/docker restart mongodb"

# 检查端口监听
ssh nas "netstat -tlnp | grep 27017"
```

---

## 运维规范

### 安全准则

1. **禁止明文Token**: 敏感信息用环境变量
2. **IP白名单**: 宝塔API只允许NAS访问
3. **定期备份**: 每周备份Docker配置和数据库

### 操作流程

1. **修改前**: 阅读需求文档
2. **修改后**: 更新迭代记录
3. **测试后**: 再提交

### NAS核心任务（2026规划）

1. **AI微信数据库归档**: RAG语料存储
2. **公司数据资产化**: 数据对撞/备份
3. **远程桌面私有化**: MeshCentral/RustDesk
4. **AI向量库部署**: Qdrant集群

---

## 相关脚本

| 脚本 | 功能 | 位置 | 快速运行 |
|------|------|------|----------|
| `optimize_macos_vm_compose.sh` | 本机→NAS：macOS VM 流畅度优化 | `./scripts/` | 需本机与 NAS 同网 |
| `optimize_macos_vm_on_nas.sh` | **NAS 上直接执行**：macOS VM 流畅度优化（外网推荐） | `./scripts/` | SSH 登录 NAS 后运行 |
| `nas_status.sh` | 一键检查NAS状态（内存/磁盘/容器/端口） | `./scripts/` | `./scripts/nas_status.sh` |
| `docker_list.sh` | 列出所有Docker容器及状态 | `./scripts/` | `./scripts/docker_list.sh` |
| `get_mongodb_info.py` | 自动获取MongoDB连接信息 | `./scripts/` | `python3 ./scripts/get_mongodb_info.py` |
| `synology_api_demo.py` | DSM官方API使用演示 | `./scripts/` | `python3 ./scripts/synology_api_demo.py` |

### 添加脚本到PATH（可选）

```bash
# 添加到 ~/.zshrc 或 ~/.bashrc
export PATH="$PATH:/Users/karuo/Documents/个人/卡若AI/01_系统管理/群晖NAS管理/scripts"

# 然后可以直接运行
nas_status.sh
docker_list.sh
get_mongodb_info.py
```

---

## 相关资源

- **项目目录**: `/Users/karuo/Documents/开发/4、小工具/synology群晖nas`
- **QuickConnect**: https://udbfnvtk.quickconnect.cn
- **官方API文档**: https://www.synology.com/en-us/support/developer
- **synology-api GitHub**: https://github.com/N4S4/synology-api
- **服务器管理Skill**: `/Users/karuo/Documents/开发/4、小工具/5-工具与其他/服务器管理/.codex/skills/karuo-server-manager/`
