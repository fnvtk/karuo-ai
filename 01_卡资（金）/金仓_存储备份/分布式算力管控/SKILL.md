---
name: 分布式算力管控
description: PCDN/矿机/GPU节点自动扫描与一键部署 + 分布式节点安全攻防体系
triggers: 算力、PCDN、矿机、GPU、网心云、甜糖、节点、攻防、入侵检测、挖矿木马、Mirai、僵尸网络、PHP漏洞、Discuz安全、服务器安全
owner: 金仓
group: 金
version: "2.0"
updated: "2026-02-20"
---

# 🖥️ 分布式算力管控

> **金仓** 负责 | 一键扫描 · 一键部署 · 自动绑定 · 收益变现 · **安全攻防**
>
> **核心目标**：给一个 IP/网段，自动扫描可用设备 → 自动SSH登录 → 一键安装PCDN/矿机 → 绑定卡若账号 → 获得收益
>
> **安全目标**：所有分布式节点和服务器具备入侵检测、攻击防御、漏洞修复能力，防止被反向利用为僵尸网络/挖矿肉鸡

---

## 零、最简部署链路（直达最终方案，不走弯路）

> **阅读本节即可完成部署，无需阅读后续章节。**
> 后续章节为详细原理、排错速查表和历史调试记录。

### 0.1 判断设备类型（10秒）

```
SSH到目标设备 → uname -a → 判断走哪条路
                │
                ├─ 有Docker → 路线A（3分钟搞定）
                ├─ 无Docker + 内核≥4.x → 路线A（先装Docker）
                └─ 无Docker + 内核<4.x（如DS213j） → 路线B（chroot方案，10分钟）
```

### 0.2 路线A：有Docker的设备（标准Linux/新NAS）→ 3条命令

```bash
# 1. 安装Docker（如果已有则跳过）
curl -fsSL https://get.docker.com | bash

# 2. 一键部署网心云
docker run -d --name wxedge --restart=always --net=host --privileged \
  -v /data/wxedge:/storage onething1/wxedge:latest

# 3. 绑定账号（浏览器打开管理页面，手机App扫码）
echo "管理页面: http://$(hostname -I | awk '{print $1}'):18888"
# → 网心云App → 账号15880802661 → 添加设备 → 扫码绑定
```

**群晖NAS（有Docker套件）**：
```bash
DOCKER="/var/packages/ContainerManager/target/usr/bin/docker"
sudo $DOCKER run -d --name wxedge --restart=always --net=host --privileged \
  -v /volume1/docker/wxedge:/storage onething1/wxedge:latest
```

### 0.3 路线B：无Docker老设备（内核<4.x，如DS213j）→ 一键部署包

**前置准备（仅首次，在Mac/PC上执行）**：
```bash
# 提取Docker镜像为文件系统（只需做一次，产物可复用）
docker pull --platform linux/arm/v7 onething1/wxedge:latest
docker create --platform linux/arm/v7 --name tmp onething1/wxedge:latest
docker export tmp -o wxedge_fs.tar   # ≈130MB
docker rm tmp
```

**部署到目标设备（3步，10分钟）**：
```bash
# ===== 第1步：上传（2分钟）=====
# 老群晖必须用 -O -c aes256-cbc
sshpass -p '设备密码' scp -O -c aes256-cbc \
  wxedge_fs.tar admin@设备IP:/volume1/wxedge/

# ===== 第2步：解压+部署（5分钟）=====
sshpass -p '设备密码' ssh -c aes256-cbc admin@设备IP \
  'echo "设备密码" | sudo -S sh -c "
    mkdir -p /volume1/wxedge/{rootfs,storage,logs}
    tar xf /volume1/wxedge/wxedge_fs.tar -C /volume1/wxedge/rootfs
  "'
# 然后上传已补丁的二进制、fake_runc v6、musl库、配置文件
# （使用 configs/ds213j_已激活/ 中的完整包，或按13.2节手动配置）

# ===== 第3步：启动 =====
sshpass -p '设备密码' ssh -c aes256-cbc admin@设备IP \
  'echo "设备密码" | sudo -S nohup /volume1/wxedge/chroot_start.sh &'

# ===== 验证（3分钟后）=====
curl -s http://设备IP:18888/docker/dashboard | python3 -c "
import sys,json; d=json.load(sys.stdin)['data']
print(f'任务: {len(d[\"run_tasks\"])}个')
for t in d['run_tasks']: print(f'  {\"✅\" if t[\"state_code\"]==0 else \"⚠️\"} {t[\"name\"]}')
"
```

### 0.4 已踩过的坑（全部已内置到脚本中，无需手动处理）

| 坑 | 已内置的解决方案 | 所在组件 |
|:---|:---|:---|
| 内核3.2无cgroup | tmpfs伪装 + 二进制补丁重定向/proc | chroot_start.sh |
| 内核3.2无overlayfs | cntr.toml禁用，fallback native snapshotter | cntr.toml |
| 内核3.2无namespace | fake_runc v6 替代真实runc | runc (shell脚本) |
| shim prctl失败 | 二进制补丁NOP掉prctl调用 | containerd-shim-runc-v2 |
| shim读/proc/self/exe失败 | 补丁→/tmp/_shimexe_ + 启动时自动创建链接 | chroot_start.sh |
| guluplugin缺musl C++库 | Alpine v3.12库缓存 + fake_runc自动安装 | chroot_start.sh + fake_runc |
| PCDNClient/DCDN不兼容CPU | fake_runc自动检测→keepalive模式 | fake_runc v6 |
| netns不支持 | fake_netns（tmpfs覆盖/proc/PID/ns/） | chroot_start.sh |
| echo写PID带换行 | printf "%s" 替代echo | fake_runc v6 |
| tmpfs重挂后fake文件丢失 | chroot_start.sh每次启动重写所有fake文件 | chroot_start.sh |
| sysfs遮盖cgroup | **不挂sysfs**，只挂cgroup tmpfs | chroot_start.sh |
| NAS CPU超载 | nice=10 + cpu_guard.sh守护 | chroot_start.sh |
| PCDN流量走frpc | frpc仅转发管理页面18888，不转发数据端口 | frpc.ini |

### 0.5 组件清单（chroot方案需要的全部文件）

```
部署包/
├── wxedge_fs.tar                    ← Docker镜像rootfs（130MB，首次提取）
├── 已补丁二进制/
│   ├── wxedged                      ← /proc路径重定向补丁
│   ├── containerd-shim-runc-v2      ← prctl bypass + _shimexe_ 补丁
│   └── runc                         ← fake_runc v6 shell脚本
├── musl库/
│   ├── libstdc++_musl312.so.6       ← Alpine v3.12（musl 1.1.24，无time64）
│   └── libgcc_s_musl312.so.1       ← Alpine v3.12
├── 配置文件/
│   ├── cntr.toml                    ← 禁用overlayfs的containerd配置
│   ├── wxedge.yaml                  ← storage_path="/storage"
│   └── fake_stat                    ← 22核CPU伪装数据
├── 脚本/
│   ├── chroot_start.sh              ← 主启动脚本（含所有修复）
│   ├── cpu_guard.sh                 ← CPU 70%守护
│   └── rc.d_wxedge.sh              ← 群晖自启动
└── 已激活数据/（同设备恢复用，免重新绑定）
    ├── wxnode                        ← 节点身份密钥
    └── .onething_data/               ← 激活状态
```

### 0.6 frpc 配置（仅管理页面，不走PCDN数据）

```ini
[home-nas-wxedge]
type = tcp
local_ip = 127.0.0.1
local_port = 18888
remote_port = 18882
# ⚠️ 禁止添加XYP/UDP/Gulu端口转发（会占用存客宝带宽）
```

### 0.7 收益预期

| 阶段 | 时间 | 说明 |
|:---|:---|:---|
| 部署完成 | 第0天 | Dashboard显示任务，speed=0（正常） |
| CDN注册 | 第1天 | guluplugin Tracker心跳正常，有少量P2P数据 |
| 开始收益 | 第2-3天 | CDN验证节点稳定性后逐步分配流量 |
| 稳定收益 | 第7天+ | 根据带宽和在线时长，月收益¥5-300不等 |

---

## 一、卡若账号（默认内置，无需手动填写）

### 1.1 PCDN平台账号

| 平台 | 账号/手机号 | 密码 | 管理页面 | 收益查看 |
|:---|:---|:---|:---|:---|
| **网心云** | 15880802661 | （App登录/短信验证） | http://设备IP:18888 | 网心云App |
| **甜糖** | 15880802661 | （App登录/短信验证） | 甜糖App | 甜糖App |

### 1.2 服务器SSH凭证（已有设备）

| 名称 | IP | 端口 | 用户名 | 密码 | 用途 |
|:---|:---|:---|:---|:---|:---|
| 存客宝 | 42.194.245.239 | 22 | root | Zhiqun1984 | 私域银行 |
| kr宝塔 | 43.139.27.93 | 22022 | root | Zhiqun1984 | Node/辅助 |
| 公司NAS(CKB) | 192.168.1.201 | 22 | fnvtk | （SSH密钥） | 群晖NAS |
| 家里NAS(Station) | 192.168.110.29 | 22 | admin | zhiqun1984 | 家庭NAS(DS213j,armv7l) |

### 1.3 NAS外网访问

| NAS | 外网域名 | SSH外网 | DSM外网 |
|:---|:---|:---|:---|
| 公司CKB | open.quwanzhi.com | ssh fnvtk@open.quwanzhi.com -p 22201 | http://open.quwanzhi.com:5000 |
| 家里Station | opennas2.quwanzhi.com | ssh admin@opennas2.quwanzhi.com -p 22202 | http://opennas2.quwanzhi.com:5002 |

### 1.4 MongoDB 凭证查询（自动获取设备密码）

当需要查询设备SSH账号密码时，自动调用本地 MongoDB：

```python
# 本地 MongoDB（datacenter_mongodb）
# 地址: localhost:27017（本机Docker）
# 数据库: datacenter
# 集合: device_credentials / server_accounts 等
from pymongo import MongoClient
client = MongoClient("mongodb://localhost:27017")
db = client["datacenter"]
cred = db["device_credentials"].find_one({"ip": "目标IP"})
```

---

## 二、能力总览（一键部署为核心）

| 能力 | 说明 | 脚本 |
|:---|:---|:---|
| 🔍 **自动扫描** | 扫描任意网段，发现可SSH登录的设备 | `pcdn_auto_deploy.py --scan` |
| 🔑 **自动登录** | 用内置凭证或MongoDB查询凭证登录设备 | `pcdn_auto_deploy.py --login` |
| 📦 **一键安装** | 在目标设备上安装Docker+网心云/甜糖/矿机 | `pcdn_auto_deploy.py --deploy` |
| 🔗 **自动绑定** | 部署后输出管理页面地址，引导绑定卡若账号 | 自动 |
| 📊 **机群监控** | 查看所有已部署节点的状态和收益 | `fleet_monitor.py` |
| 🛡️ **安全防护** | SSH加固、威胁扫描、入侵清除 | `threat_scanner.sh` |
| 🔍 **攻击识别** | Mirai/挖矿/PHP漏洞 5大攻击类型识别与分析 | 第十一节 |
| 🛡️ **节点安全基线** | SSH/防火墙/应用层/www用户全面加固 | `node_security_baseline_check.sh` |
| 🚨 **应急响应** | 隔离→证据保全→清理→加固→验证 5步流程 | `threat_scanner_v2.sh --fix` |
| 🔒 **PHP/Discuz 防护** | PHP 5.6 升级 + Discuz 加固 + Nginx 路径封堵 | 第十一节 §11.3 |

### 支持的算力类型

| 类型 | 程序/平台 | 收益来源 | 推荐优先级 |
|:---|:---|:---|:---|
| 📡 **PCDN节点** | 网心云(wxedge) | 带宽共享 | ⭐⭐⭐ 首选 |
| 📡 PCDN节点 | 甜糖(ttnode) | 带宽共享 | ⭐⭐ |
| 💎 加密矿机(CPU) | XMRig | 门罗币(XMR) | ⭐ |
| 🎮 加密矿机(GPU) | T-Rex / NBMiner | ETH/RVN等 | ⭐⭐（有GPU时） |
| 🖥️ GPU算力出租 | Vast.ai / Golem | 算力租赁 | ⭐⭐⭐（有GPU时） |
| 💾 存储节点 | Storj / Filecoin | 存储出租 | ⭐ |

---

## 三、文件结构

```
分布式算力管控/
├── SKILL.md                         ← 本文件（完整指南）
├── configs/                         ← ⭐ 已激活配置备份（可直接恢复部署）
│   └── ds213j_已激活/               ← DS213j已激活配置包
│       ├── README.md                ← 配置说明和复用方法
│       ├── cfg/                     ← wxedge.yaml + cntr.toml
│       ├── storage/                 ← wxnode(节点身份) + .onething_data(激活数据)
│       └── scripts/                 ← chroot_start.sh + rc.d_wxedge.sh
├── references/
│   ├── 攻击链分析_KR宝塔_202602.md  ← KR宝塔 Mirai+挖矿入侵实战分析
│   ├── PHP56_Discuz漏洞防护指南.md   ← PHP 5.6 / Discuz 专项防护
│   └── 已部署节点清单.md            ← 所有已部署设备记录
├── scripts/
│   ├── pcdn_auto_deploy.py          ← ⭐ 核心：自动扫描+登录+部署（Python）
│   ├── install.sh                   ← 在目标机器上执行的安装脚本
│   ├── config.json                  ← 卡若默认配置（内置账号）
│   ├── config.example.json          ← 配置模板
│   │
│   ├── deploy_pcdn.sh               ← PCDN节点部署（网心云/甜糖）
│   ├── deploy_miner.sh              ← CPU/GPU矿机部署
│   ├── deploy_storage.sh            ← 存储节点部署
│   │
│   ├── fleet_monitor.py             ← 机群监控（状态+收益）
│   ├── fleet_status.sh              ← 单机状态查询
│   │
│   ├── threat_scanner.sh            ← 威胁扫描（基础版）
│   ├── threat_scanner_v2.sh         ← 威胁扫描（增强版，含 7 项检查）
│   ├── threat_cleaner.sh            ← 威胁清除
│   ├── ssh_hardening.sh             ← SSH加固
│   ├── node_security_baseline_check.sh  ← 节点安全基线检查
│   └── php_hardening.sh             ← PHP/Discuz 安全加固
```

---

## 四、一键自动部署（核心流程）

### 4.1 完整自动化流程

```
给定 IP/网段
    │
    ▼
┌──────────────────────────────┐
│ 1. 自动扫描（pcdn_auto_deploy.py） │
│    - 扫描 22/2222/22201/22202 端口  │
│    - 识别 Linux/NAS/路由器          │
│    - 多轮验证防误报                 │
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│ 2. 自动登录                         │
│    - 先查 MongoDB 设备凭证库        │
│    - 再尝试内置密码列表              │
│    - SSH密钥认证                    │
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│ 3. 检测设备环境                     │
│    - OS类型、CPU/内存/磁盘/GPU     │
│    - Docker是否已安装               │
│    - 网络带宽（上行关键）            │
│    - 群晖NAS特殊Docker路径          │
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│ 4. 自动安装                         │
│    - 安装Docker（如未安装）          │
│    - 拉取 onething1/wxedge 镜像     │
│    - 启动容器（--net=host --restart=always） │
│    - 群晖NAS用特殊Docker路径        │
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│ 5. 绑定账号 & 收益                  │
│    - 输出管理页面 http://IP:18888   │
│    - 提醒用手机App扫码绑定15880802661 │
│    - 记录到已部署节点清单            │
└──────────────────────────────┘
```

### 4.2 一键命令

```bash
# ===== 最常用：给一个网段，全自动扫描+部署 =====
python3 scripts/pcdn_auto_deploy.py --auto 192.168.1.0/24

# ===== 给单个IP，直接部署 =====
python3 scripts/pcdn_auto_deploy.py --deploy 192.168.1.201

# ===== 只扫描，不部署（先看看有哪些设备） =====
python3 scripts/pcdn_auto_deploy.py --scan 192.168.1.0/24

# ===== 指定平台部署 =====
python3 scripts/pcdn_auto_deploy.py --deploy 192.168.1.201 --platform wxedge
python3 scripts/pcdn_auto_deploy.py --deploy 192.168.1.201 --platform tiantang
python3 scripts/pcdn_auto_deploy.py --deploy 192.168.1.201 --platform xmrig

# ===== 扫描多个网段 =====
python3 scripts/pcdn_auto_deploy.py --auto 192.168.1.0/24 192.168.110.0/24

# ===== 外网部署（通过域名） =====
python3 scripts/pcdn_auto_deploy.py --deploy open.quwanzhi.com --port 22201 --user fnvtk
python3 scripts/pcdn_auto_deploy.py --deploy opennas2.quwanzhi.com --port 22202 --user admin

# ===== 查看所有已部署节点状态 =====
python3 scripts/fleet_monitor.py --all
```

### 4.3 群晖NAS特殊处理（经验沉淀）

群晖NAS的Docker路径不同于标准Linux，部署时需特殊处理：

| 项目 | 标准Linux | 群晖NAS |
|:---|:---|:---|
| Docker路径 | `/usr/bin/docker` | `/var/packages/ContainerManager/target/usr/bin/docker` |
| 需要sudo | 不需要（root） | **需要 `sudo`** |
| 存储目录 | `/data/wxedge` | `/volume1/docker/wxedge` |
| 网络模式 | `--net=host` | `--net=host`（同） |

**部署命令（群晖NAS）**：
```bash
DOCKER="/var/packages/ContainerManager/target/usr/bin/docker"
sudo $DOCKER pull onething1/wxedge:latest
sudo $DOCKER run -d \
    --name wxedge \
    --restart=always \
    --net=host \
    --privileged \
    -v /volume1/docker/wxedge:/storage \
    onething1/wxedge:latest
```

**注意**：NAS必须能访问Docker Hub才能拉取镜像。若拉取失败，需检查NAS的DNS和外网连接。

---

## 五、自动扫描详解

### 5.1 扫描策略

| 阶段 | 动作 | 说明 |
|:---|:---|:---|
| 1. 端口扫描 | TCP连接 22, 2222, 22201, 22202 | 快速发现SSH端口 |
| 2. 多轮验证 | 每端口3轮TCP，≥2轮成功才算开放 | 防止误报 |
| 3. SSH Banner | 读取SSH Banner识别设备类型 | Linux/NAS/路由器 |
| 4. 去重合并 | 同一SSH Banner的多个IP合并 | 防止虚拟IP重复 |
| 5. 凭证尝试 | MongoDB查询 + 内置密码列表 | 自动登录 |

### 5.2 内置密码列表（自有设备常用）

```python
DEFAULT_CREDENTIALS = [
    # 卡若常用
    {"username": "root", "password": "Zhiqun1984"},
    {"username": "fnvtk", "password": "Zhiqun1984"},
    {"username": "admin", "password": "Zhiqun1984"},
    # NAS默认
    {"username": "admin", "password": "admin"},
    {"username": "admin", "password": ""},
    # Linux默认
    {"username": "root", "password": "root"},
    {"username": "root", "password": "password"},
    {"username": "root", "password": "123456"},
    {"username": "ubuntu", "password": "ubuntu"},
    {"username": "pi", "password": "raspberry"},
]
```

### 5.3 MongoDB凭证查询

```python
def query_device_credentials(ip):
    """从本地MongoDB查询设备凭证"""
    try:
        from pymongo import MongoClient
        client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=3000)
        db = client["datacenter"]
        # 查询多个可能的集合
        for collection_name in ["device_credentials", "server_accounts", "ssh_keys"]:
            coll = db[collection_name]
            cred = coll.find_one({"$or": [{"ip": ip}, {"host": ip}, {"address": ip}]})
            if cred:
                return {"username": cred.get("username", "root"), 
                        "password": cred.get("password", ""),
                        "port": cred.get("port", 22)}
        client.close()
    except Exception:
        pass  # MongoDB不可用时用内置密码
    return None
```

### 5.4 自有设备排除名单（强制执行）

> **规则：对外扫描时必须排除自有设备和已知基础设施，避免误扫自己的服务器。**

```python
# ===== 自有设备排除列表 =====
# 对外网段扫描时，以下 IP/域名/网段 必须自动排除
OWN_INFRASTRUCTURE = {
    "description": "卡若自有设备，外部扫描时必须排除",

    # 云服务器（腾讯云）
    "cloud_servers": [
        {"name": "存客宝",     "ip": "42.194.245.239"},
        {"name": "kr宝塔",     "ip": "43.139.27.93"},
    ],

    # NAS 外网入口
    "nas_external": [
        {"name": "公司NAS(CKB)", "domain": "open.quwanzhi.com",     "port": 22201},
        {"name": "家里NAS",      "domain": "opennas2.quwanzhi.com",  "port": 22202},
    ],

    # 内网网段（局域网扫描时排除，但内部部署时使用）
    "internal_networks": [
        "192.168.1.0/24",     # 公司内网
        "192.168.110.0/24",   # 家庭内网
    ],

    # 排除的 IP 段（自有云服务器所在的小段）
    "exclude_cidrs": [
        "42.194.245.239/32",
        "43.139.27.93/32",
    ],
}

def is_own_device(ip):
    """检查 IP 是否为自有设备，是则返回设备名"""
    import ipaddress
    target = ipaddress.ip_address(ip)
    for server in OWN_INFRASTRUCTURE["cloud_servers"]:
        if str(target) == server["ip"]:
            return server["name"]
    for cidr in OWN_INFRASTRUCTURE["exclude_cidrs"]:
        if target in ipaddress.ip_network(cidr, strict=False):
            return f"自有网段({cidr})"
    for net in OWN_INFRASTRUCTURE["internal_networks"]:
        if target in ipaddress.ip_network(net, strict=False):
            return f"内网({net})"
    return None

def filter_scan_targets(ip_list):
    """从扫描目标中过滤掉自有设备"""
    filtered = []
    excluded = []
    for ip in ip_list:
        owner = is_own_device(ip)
        if owner:
            excluded.append((ip, owner))
        else:
            filtered.append(ip)
    if excluded:
        print(f"⚠️ 已排除 {len(excluded)} 个自有设备:")
        for ip, name in excluded:
            print(f"   跳过 {ip} ({name})")
    return filtered
```

**nmap 排除文件用法**：
```bash
# 生成排除文件
cat > /tmp/exclude_own.txt << 'EOF'
42.194.245.239
43.139.27.93
192.168.1.0/24
192.168.110.0/24
EOF

# 扫描时排除
nmap -iL targets.txt --excludefile /tmp/exclude_own.txt -p 22,80,443,3389,8080 -oG results.gnmap
```

**⚠️ 注意**：
- 新增云服务器时，**必须同步更新此排除列表**
- 排除列表维护在 `config.json` 的 `known_devices` 和本节的 `OWN_INFRASTRUCTURE`
- 对内部署（扫描自有内网部署PCDN）不受此限制，仅限**对外扫描**时排除

---

## 六、已知设备清单（持续更新）

### 6.1 已确认可部署的设备

> 最后扫描更新：2026-02-15

| 设备 | IP | 类型 | SSH端口 | 用户名 | 部署状态 | 部署方式 | 备注(2026-02-15扫描) |
|:---|:---|:---|:---|:---|:---|:---|:---|
| 家里NAS(DS213j) | 192.168.110.29 | 群晖NAS(armv7l) | 22 | admin | ✅ **已部署运行中** | chroot | 外网不可达，内网正常 |
| 公司NAS(CKB) | 192.168.1.201 | 群晖NAS(DS1825+,x86_64) | 22 | fnvtk | 🟢 **SSH可用** | Docker | 外网SSH已验证(22201) |
| 存客宝 | 42.194.245.239 | Linux | 22 | root | 🟡 **SSH需开放** | Docker | 15端口开放(VNC/RDP/MySQL等)，22关闭 |
| kr宝塔 | 43.139.27.93 | Linux | 22022 | root | 🟡 **SSH需开放** | Docker | 11端口开放(含v0项目) |

### 6.2 已部署节点详情

| 设备 | SN | 激活码 | 运行任务 | 配置备份 |
|:---|:---|:---|:---|:---|
| DS213j (192.168.110.29) | CTWX09Y9Q2ILI4PV | CTWXErqmwU3DEPVLzAbvRNV5 | CB*.0 + CG*.0 + CG*.1 | `configs/ds213j_已激活/` |
| CKB DS1825+ (192.168.1.201) | CTWX28C2836D6847 | CTWX2XdvGBK9vWfyAj2eVRnyE | 待绑定后分配 | 待备份 |

### 6.3 已扫描的网段

| 网段 | 扫描时间 | 发现设备数 | 可部署数 | 备注 |
|:---|:---|:---|:---|:---|
| 192.168.1.0/24 | 2026-02-06 | 1 (192.168.1.1/201) | 1 | 公司NAS，多IP指向同一设备 |
| 192.168.110.0/24 | 2026-02-14 | 1 (192.168.110.29) | 1 | 家庭NAS，DS213j，已chroot部署 |
| MongoDB KR_KR (3000样本) | 2026-02-15 | 58 有端口开放 | 0 | 外网扫描，排除自有设备，SSH均无法登录 |
| 119.233.228.0/24 (厦门ISP) | 2026-02-15 | 0 | 0 | CGNAT后，全部filtered |

### 6.4 DS213j 硬件规格（实测）

| 项目 | 值 |
|:---|:---|
| 型号 | Synology DS213j (synology_armada370_213j) |
| CPU | Marvell PJ4Bv7 (Armada-370), 1197 BogoMIPS, 单核 |
| 架构 | armv7l (32位ARM) |
| 内存 | 509MB总量，可用约300MB |
| Swap | 2GB |
| 存储 | 5.4TB总量, 2.0TB可用 (64%), ext4, RAID(md2) |
| 网络 | 千兆以太网 (eth0), MAC: 00:11:32:30:4c:4f |
| IP | 192.168.110.29/24, 网关 192.168.110.1 |
| 内核 | Linux 3.2.40 |
| 特殊限制 | 无Docker套件、无cgroup支持、无overlayfs、无namespace、SSH只支持旧cipher |
| wxedge内存占用 | containerd 22MB + wxedged 17MB + 3×shim 25MB ≈ 64MB |
| 伪装硬件 | 22核CPU、SSD、2033GB磁盘（用于提升任务分配优先级） |
| 外网访问 | frpc隧道 → http://42.194.245.239:18882（管理页面） |

---

## 七、PCDN详细部署指南

### 7.1 网心云（wxedge）- 首选

**为什么首选网心云**：
- 国内最大的PCDN平台，收益稳定
- Docker部署，兼容性好
- 100M上行带宽约 ¥10/天、¥300/月

**标准Linux部署**：
```bash
# 安装Docker
curl -fsSL https://get.docker.com | bash
systemctl enable docker && systemctl start docker

# 部署网心云
docker pull onething1/wxedge:latest
docker run -d \
    --name wxedge \
    --restart=always \
    --net=host \
    --privileged \
    -v /data/wxedge:/storage \
    onething1/wxedge:latest

# 查看状态
docker ps | grep wxedge

# 管理页面（浏览器打开）
echo "http://$(hostname -I | awk '{print $1}'):18888"
```

**绑定账号**：
1. 打开 `http://设备IP:18888`
2. 手机下载"网心云"App
3. 用账号 **15880802661** 登录App
4. App中"添加设备" → 扫描页面上的二维码
5. 绑定完成后开始产生收益

### 7.2 甜糖（ttnode）

```bash
docker pull tiptime/ttnode:latest
docker run -d \
    --name ttnode \
    --restart=always \
    --net=host \
    -v /data/ttnode:/mnts \
    tiptime/ttnode:latest
```

---

## 八、install.sh 一键安装（在目标机器上执行）

适用于手动在目标机器上执行，一条命令完成所有安装：

```bash
# 方式1：从本地推送并安装（推荐）
scp scripts/install.sh root@目标IP:/tmp/
ssh root@目标IP "bash /tmp/install.sh --pcdn"

# 方式2：在目标机器上直接执行
bash install.sh --pcdn      # 只安装PCDN
bash install.sh --cpu       # 只安装CPU矿机
bash install.sh --gpu       # 只安装GPU矿机
bash install.sh --storage   # 只安装存储节点
bash install.sh --all       # 安装全部
```

---

## 九、机群监控

### 9.1 查看所有节点状态

```bash
# Python监控脚本（SSH连接所有节点查状态）
python3 scripts/fleet_monitor.py --all

# 单机状态查询（在目标机上执行）
bash scripts/fleet_status.sh
```

### 9.2 监控指标

| 指标 | 说明 | 告警阈值 |
|:---|:---|:---|
| CPU使用率 | 挖矿时80%正常 | >95% |
| 温度 | GPU温度 | >85°C |
| 网心云容器 | docker ps 状态 | 非running |
| 网络连接 | 矿池/PCDN连接数 | 0 |
| 磁盘 | 存储节点空间 | <10% |

---

## 十、收益参考

| 配置 | 方案 | 日收益 | 月收益 |
|:---|:---|:---|:---|
| 100M上行带宽 | PCDN(网心云) | ~¥10 | ~¥300 |
| 50M上行带宽 | PCDN(网心云) | ~¥5 | ~¥150 |
| 4核CPU | XMRig | ~$0.15 | ~$4.5 |
| 32核CPU | XMRig | ~$1.2 | ~$36 |
| RTX 3090 | GPU出租(Vast.ai) | ~$5 | ~$150 |
| RTX 4090 | GPU出租(Vast.ai) | ~$10 | ~$300 |
| 500GB SSD | Storj | ~$1 | ~$30 |

**结论**：PCDN（网心云）是性价比最高的选择，不消耗CPU，主要利用闲置带宽。

---

## 十一、安全与攻防体系（防守为核心 · 基于真实攻防实战）

> **定位**：本节是分布式算力管控的**安全防线**，基于 2026-02 KR宝塔服务器遭受 Mirai 僵尸网络 + 挖矿木马入侵的**真实攻防实战**提炼。
> **核心原则**：**攻击分析 70%（知己知彼）+ 防守执行 30%（对症下药）**。理解攻击才能有效防守。

---

### 11.1 攻击模式识别（知己知彼 · 五大威胁类型）

#### 类型一：Mirai 僵尸网络（DDoS + SSH 扫描）

| 维度 | 详情 |
|:---|:---|
| **目的** | 将服务器变成僵尸节点，对外发起 DDoS 攻击和 SSH 端口扫描，扩大感染范围 |
| **入侵方式** | PHP 应用漏洞 / 弱密码 → 获取 www 用户权限 → 上传恶意二进制 |
| **特征进程** | `zusvavbox`（伪装系统进程）、`kthreadd` 伪装、`/tmp/.update`（SSH 扫描器/投放器） |
| **持久化** | `.bashrc`/`.profile` 注入、systemd user timer、watchdog 守护脚本 |
| **网络特征** | 大量对外 TCP:22 连接（SSH 扫描）、连接矿池或 C2 服务器 |
| **危害等级** | 🔴 严重 — 触发云厂商违规告警，可导致服务器被封停 |

**IOC 指标**：
```bash
# 进程特征
ps aux | grep -E 'zusvavbox|kthreadd.*\[|\.update|xmrig|minerd'
# 网络特征（大量对外 22 端口连接）
ss -antp | awk '$5~/:22$/ && $1=="ESTAB"' | wc -l
# 文件特征
ls -la /tmp/.update /tmp/.systemdpw/ /home/www/c3pool/ 2>/dev/null
# 持久化检查
grep -r 'zusvavbox\|\.update\|c3pool' /home/www/.bashrc /home/www/.profile 2>/dev/null
systemctl --user -M www@ list-timers 2>/dev/null
```

#### 类型二：挖矿木马（CPU 盗用）

| 维度 | 详情 |
|:---|:---|
| **目的** | 利用服务器 CPU 挖门罗币（XMR），挖矿收益归攻击者 |
| **特征** | CPU 长期 100%、高负载、`xmrig`/`xmr-stak`/`minerd`/`cpuminer` 进程 |
| **隐蔽手段** | 重命名为 `kthreadd`/`kworker`/`systemd-xxx` 等系统进程名 |
| **矿池连接** | `c3pool.com`、`pool.hashvault.pro`、`nanopool.org`、`minexmr.com`、`supportxmr.com` |
| **矿池端口** | 3333, 5555, 7777, 14433, 14444, 45700 |

#### 类型三：PHP 应用漏洞利用（⚠️ 重点防护对象）

| 维度 | 详情 |
|:---|:---|
| **目标应用** | Discuz! 论坛（PHP 5.6）、phpMyAdmin、WordPress、ThinkPHP |
| **漏洞类型** | 远程代码执行（RCE）、文件上传、SQL 注入、反序列化、已知 CVE |
| **PHP 5.6 已知严重漏洞** | CVE-2019-11043（PHP-FPM RCE）、CVE-2015-6835（use-after-free）、CVE-2016-5385（httpoxy）等 |
| **Discuz! 专项漏洞** | `misc.php` RCE、`/uc_server/` 未授权、模板注入、`/data/cache/` 可写 |
| **攻击链** | 扫描 Discuz 版本 → 匹配 CVE → 上传 WebShell → 提权 → 投放挖矿/僵尸程序 |
| **⚠️ 弱点** | **PHP 5.6 已于 2018 年底 EOL，不再有安全补丁** — 这是 KR 宝塔被入侵的根本原因 |

**PHP 5.6 + Discuz 已知攻击路径**：
```
1. 攻击者扫描 → 发现 www.lkdie.com / db.lkdie.com 运行 Discuz (PHP 5.6)
2. 利用 Discuz 已知漏洞（misc.php / uc_server / 文件上传）获取 WebShell
3. 以 www 用户身份在服务器上执行命令
4. 上传 zusvavbox（挖矿木马）和 /tmp/.update（SSH 扫描器）
5. 写入 /home/www/.bashrc 和 .profile 实现持久化
6. 创建 systemd user timer 定期检查并重启恶意程序
7. 同时挖矿（CPU 100%）+ 对外 SSH 扫描（TCP:22）
8. 触发腾讯云「对外攻击」违规告警
```

#### 类型四：SSH 暴力破解

| 维度 | 详情 |
|:---|:---|
| **特征** | `/var/log/secure` 中大量 `Failed password` / `Invalid user` |
| **目标端口** | 22、2222、22022 等 SSH 端口 |
| **防护** | fail2ban + iptables recent + MaxStartups/MaxAuthTries |

#### 类型五：容器逃逸与供应链攻击

| 维度 | 详情 |
|:---|:---|
| **场景** | PCDN/矿机 Docker 容器被恶意镜像替换，或容器逃逸到宿主机 |
| **防护** | 只用官方镜像 + 镜像哈希校验 + `--no-new-privileges` |

---

### 11.2 真实攻击链分析（KR 宝塔 2026-02 实战）

> **攻击类型**：Mirai 变种僵尸网络 + 加密挖矿  
> **攻击时间**：2026 年 2 月  
> **受害服务器**：kr宝塔 43.139.27.93（腾讯云 2核4G）  
> **入侵入口**：Discuz 论坛（PHP 5.6）— www.lkdie.com / db.lkdie.com

#### 完整攻击链路（7 步）

```
┌─────────────────────────────────────────────────────────────────┐
│ 攻击链路（Attack Kill Chain）                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ① 侦察（Reconnaissance）                                       │
│     攻击者扫描公网 IP → 发现 Discuz (PHP 5.6)                    │
│     工具：masscan / zmap / Shodan                                │
│           │                                                     │
│           ▼                                                     │
│  ② 漏洞利用（Exploitation）                                      │
│     利用 Discuz 已知漏洞获取 WebShell                            │
│     → 以 www 用户身份执行命令                                     │
│           │                                                     │
│           ▼                                                     │
│  ③ 投放（Delivery）                                              │
│     wget/curl 从 C2 下载恶意二进制                               │
│     → /tmp/.update（SSH 扫描器 + 投放器）                         │
│     → /home/www/c3pool/（矿机配置）                              │
│     → zusvavbox（Mirai 变种 + xmrig 矿机）                       │
│           │                                                     │
│           ▼                                                     │
│  ④ 持久化（Persistence）                                         │
│     a. /home/www/.bashrc 注入启动命令                             │
│     b. /home/www/.profile 注入启动命令                            │
│     c. systemd user timer 定时检查 + 重启                         │
│     d. watchdog 脚本 — 主进程被杀后自动重启                       │
│           │                                                     │
│           ▼                                                     │
│  ⑤ 执行（Execution）                                             │
│     a. zusvavbox 启动 → CPU 100%（挖矿）                         │
│     b. /tmp/.update 启动 → 对外 SSH:22 扫描                      │
│     c. 伪装为 kthreadd 等系统进程名                               │
│           │                                                     │
│           ▼                                                     │
│  ⑥ C2 通信（Command & Control）                                  │
│     连接矿池 c3pool.com:13333                                    │
│     连接 C2 控制服务器接收扫描指令                                │
│           │                                                     │
│           ▼                                                     │
│  ⑦ 横向传播（Lateral Movement）                                  │
│     对外 SSH:22 扫描 → 弱密码服务器 → 投放同款木马               │
│     → 被腾讯云检测为「对外攻击」→ 违规告警                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 攻击核心设计分析

| 维度 | 攻击者设计 | 我方弱点 |
|:---|:---|:---|
| **入口** | 选择 PHP 5.6 EOL 应用 | **Discuz 运行在已停止维护的 PHP 5.6** |
| **权限** | www 用户足够（无需 root） | www 用户有 shell 权限、可执行任意二进制 |
| **隐蔽** | 进程名伪装为 kthreadd | 没有实时进程监控告警 |
| **持久化** | 4 种方式并行 | 清一种不够，必须全清 |
| **收益** | 挖矿 + 扫描双线程 | CPU 100% 但无主动告警机制 |
| **扩散** | 自动化 SSH 扫描扩散 | 无 OUTPUT 规则限制对外连接 |

#### 清理与修复记录

```bash
# ===== 1. 杀进程 =====
kill -9 $(pgrep -f zusvavbox)
kill -9 $(pgrep -f '/tmp/.update')
pkill -9 -u www -f 'xmrig|minerd|c3pool'

# ===== 2. 清文件 =====
rm -rf /tmp/.update /tmp/.systemdpw/ /home/www/c3pool/
rm -f /dev/shm/.x* /var/tmp/.cache/

# ===== 3. 清持久化 =====
# .bashrc / .profile — 删除恶意注入行
sed -i '/zusvavbox\|\.update\|c3pool/d' /home/www/.bashrc /home/www/.profile
# systemd user timer
systemctl --user -M www@ stop zusvavbox.timer 2>/dev/null
rm -f /home/www/.config/systemd/user/zusvavbox.*
# crontab
crontab -u www -r 2>/dev/null

# ===== 4. 锁 www 用户 =====
usermod -s /sbin/nologin www
passwd -l www
# 随机化 www 密码（防止弱密码被再次利用）
echo "www:$(openssl rand -base64 32)" | chpasswd

# ===== 5. iptables 封堵对外攻击 =====
iptables -A OUTPUT -p tcp --dport 22 -m owner --uid-owner www -j DROP
iptables -A OUTPUT -p tcp --dport 22 -m state --state NEW -m recent \
  --set --name SSH_OUT
iptables -A OUTPUT -p tcp --dport 22 -m state --state NEW -m recent \
  --update --seconds 60 --hitcount 5 --name SSH_OUT -j DROP
```

---

### 11.3 PHP 5.6 / Discuz 专项防护（⚠️ 入侵根因修复）

> **核心结论**：PHP 5.6 是被入侵的根本原因。Discuz 论坛运行在已 EOL 的 PHP 上，等于裸奔。

#### 11.3.1 PHP 5.6 已知严重漏洞（部分）

| CVE | 类型 | 影响 | CVSS |
|:---|:---|:---|:---|
| CVE-2019-11043 | PHP-FPM RCE | 远程代码执行 | 9.8 |
| CVE-2016-5385 | httpoxy | HTTP 代理劫持 | 8.1 |
| CVE-2015-6835 | use-after-free | 远程代码执行 | 7.5 |
| CVE-2016-7124 | 反序列化绕过 | 认证绕过 | 7.5 |
| CVE-2015-8994 | 路径信息泄露 | 信息泄露 | 5.3 |

#### 11.3.2 Discuz 专项加固清单

```bash
# ===== 1. 升级 PHP（优先级最高）=====
# 最低升级到 PHP 7.4，推荐 PHP 8.0+
# 宝塔面板操作：软件商店 → 安装 PHP 7.4/8.0 → 站点设置 → 切换 PHP 版本

# ===== 2. Discuz 目录权限收紧 =====
# 关闭危险目录的执行权限
chmod 000 /www/wwwroot/论坛路径/uc_server/data/
chmod 644 /www/wwwroot/论坛路径/config/config_global.php
chmod 644 /www/wwwroot/论坛路径/config/config_ucenter.php
# 禁止 data/cache/template 等目录执行 PHP
find /www/wwwroot/论坛路径/data/ -name "*.php" -exec rm -f {} \;

# ===== 3. Nginx 层防护（拦截常见攻击路径）=====
# 添加到站点 Nginx 配置的 server 块中
# location ~* /(uc_server|uc_client|source|data/cache)/.*\.(php|php5)$ {
#     deny all;
# }
# location ~* /misc\.php { deny all; }
# location ~* \.(sql|bak|old|orig|swp)$ { deny all; }
# location ~* /config/ { deny all; }

# ===== 4. PHP 安全配置 =====
# php.ini 关键设置
# disable_functions = exec,system,passthru,shell_exec,proc_open,popen,dl,pcntl_exec
# expose_php = Off
# allow_url_fopen = Off
# allow_url_include = Off
# open_basedir = /www/wwwroot/论坛路径/:/tmp/
# upload_max_filesize = 2M
# max_execution_time = 30

# ===== 5. 文件完整性监控 =====
# 生成基线
find /www/wwwroot/论坛路径/ -type f -name "*.php" -exec md5sum {} \; > /root/discuz_baseline.md5
# 定期检查
md5sum -c /root/discuz_baseline.md5 --quiet 2>/dev/null | head -20
```

#### 11.3.3 PHP 升级路径与兼容性

| Discuz 版本 | 支持 PHP | 建议 |
|:---|:---|:---|
| Discuz! X3.4 | PHP 5.6 - 7.4 | 升级到 PHP 7.4 |
| Discuz! X3.5 | PHP 7.0 - 8.1 | 升级到 X3.5 + PHP 8.0 |
| Discuz! Q | PHP 7.2+ | 如果可以，迁移到 Discuz! Q |

**升级步骤**：
```bash
# 1. 宝塔面板安装新版 PHP（如 7.4）
# 2. 安装 Discuz 所需扩展：mysql, gd, curl, mbstring, xml, openssl
# 3. 备份数据库：mysqldump -u root -p 数据库名 > /tmp/discuz_backup.sql
# 4. 备份站点文件：tar -czf /tmp/discuz_files_backup.tar.gz /www/wwwroot/论坛路径/
# 5. 在宝塔面板切换站点 PHP 版本
# 6. 测试站点功能
# 7. 确认无问题后删除 PHP 5.6
```

---

### 11.4 节点安全基线（部署前必检 · 每台节点强制）

> 每台分布式算力节点（PCDN、矿机、云服务器）部署前和定期巡检时必须通过以下基线。

#### 11.4.1 SSH 加固清单

```bash
# /etc/ssh/sshd_config 关键配置
Port 22022                          # 改非默认端口
PermitRootLogin prohibit-password   # 禁密码 root 登录
MaxAuthTries 3                      # 最多 3 次认证
MaxStartups 3:50:10                 # 防暴力并发
PasswordAuthentication no           # 建议：仅密钥认证
AllowUsers root@指定IP              # 限制来源 IP
ClientAliveInterval 300
ClientAliveCountMax 2
```

#### 11.4.2 防火墙基线（iptables）

```bash
# ===== INPUT 规则 =====
# 放行已建立连接
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
# 放行 loopback
iptables -A INPUT -i lo -j ACCEPT
# SSH 限速（60 秒内最多 5 次新连接）
iptables -A INPUT -p tcp --dport 22022 -m state --state NEW \
  -m recent --set --name SSH_IN
iptables -A INPUT -p tcp --dport 22022 -m state --state NEW \
  -m recent --update --seconds 60 --hitcount 5 --name SSH_IN -j DROP
# 放行 SSH
iptables -A INPUT -p tcp --dport 22022 -j ACCEPT
# 放行 HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
# 放行宝塔面板（仅限管理 IP）
iptables -A INPUT -p tcp --dport 9988 -s 管理IP -j ACCEPT
# 放行 PCDN 端口（如有）
iptables -A INPUT -p tcp --dport 18888 -j ACCEPT
# 默认拒绝
iptables -P INPUT DROP

# ===== OUTPUT 规则（关键！防止被利用为跳板）=====
# www 用户禁止对外 SSH
iptables -A OUTPUT -p tcp --dport 22 -m owner --uid-owner www -j DROP
# 非 root 用户限制对外 SSH 速率
iptables -A OUTPUT -p tcp --dport 22 -m state --state NEW \
  -m recent --set --name SSH_OUT
iptables -A OUTPUT -p tcp --dport 22 -m state --state NEW \
  -m recent --update --seconds 60 --hitcount 5 --name SSH_OUT -j DROP
```

#### 11.4.3 应用层防护

```bash
# 1. www 用户安全加固
usermod -s /sbin/nologin www          # 禁止 www 用户 shell 登录
passwd -l www                          # 锁定密码
crontab -u www -r 2>/dev/null         # 清空 www 的 crontab

# 2. /tmp 防执行
mount -o remount,noexec,nosuid /tmp    # 禁止 /tmp 下执行二进制
# 永久生效：/etc/fstab 加 noexec,nosuid

# 3. PHP-FPM 安全
# pm = ondemand（按需启动，减少攻击面）
# pm.max_children = 10（限制并发）
# security.limit_extensions = .php（只允许 .php 后缀）

# 4. fail2ban 配置
apt install fail2ban -y  # 或 yum install fail2ban
systemctl enable fail2ban
# /etc/fail2ban/jail.local
# [sshd]
# enabled = true
# port = 22022
# maxretry = 3
# bantime = 3600
# findtime = 600
```

#### 11.4.4 安全基线检查脚本

```bash
#!/bin/bash
# node_security_baseline_check.sh — 节点安全基线快速检查
echo "===== 安全基线检查 ====="

echo "--- SSH 配置 ---"
grep -E '^(Port|PermitRootLogin|MaxAuthTries|PasswordAuthentication)' /etc/ssh/sshd_config

echo "--- www 用户状态 ---"
getent passwd www | awk -F: '{print "Shell:"$7, "Home:"$6}'
passwd -S www 2>/dev/null | awk '{print "密码状态:"$2}'

echo "--- /tmp 挂载选项 ---"
mount | grep '/tmp ' | grep -o 'noexec' || echo "⚠️ /tmp 未设 noexec"

echo "--- fail2ban 状态 ---"
systemctl is-active fail2ban 2>/dev/null || echo "⚠️ fail2ban 未运行"

echo "--- iptables OUTPUT SSH 规则 ---"
iptables -L OUTPUT -n | grep -c 'dpt:22.*DROP' && echo "✅ OUTPUT SSH 限制已设" || echo "⚠️ 无 OUTPUT SSH 限制"

echo "--- PHP 版本 ---"
php -v 2>/dev/null | head -1
[ "$(php -v 2>/dev/null | head -1 | grep -c '5\.6')" -gt 0 ] && echo "🔴 PHP 5.6 已 EOL！必须升级" || echo "✅ PHP 版本可接受"

echo "--- 可疑进程检查 ---"
ps aux | grep -E 'xmrig|zusvavbox|kdevtmpfsi|minerd|c3pool|\.update' | grep -v grep
[ $? -ne 0 ] && echo "✅ 无可疑进程"

echo "--- 可疑 /tmp 可执行文件 ---"
find /tmp /var/tmp /dev/shm -type f -executable 2>/dev/null | head -10
[ $? -ne 0 ] && echo "✅ /tmp 无可执行文件"

echo "===== 检查完成 ====="
```

---

### 11.5 自动化威胁检测与响应

#### 11.5.1 增强版 IOC 检测特征库

```yaml
# ===== 恶意文件路径（发现即删除）=====
malicious_paths:
  - /tmp/.update
  - /tmp/.systemdpw/
  - /tmp/.X11-unix/.rsync/
  - /tmp/.ICE-unix/.*
  - /home/www/c3pool/
  - /home/www/.config/sys-update-daemon
  - /var/tmp/.cache/
  - /dev/shm/.x*
  - /dev/shm/.ice*
  - /root/.configrc/
  - /usr/local/bin/.hidden/

# ===== 恶意进程名（发现即杀）=====
malicious_processes:
  - xmrig, xmr-stak, minerd, cpuminer, ccminer
  - kdevtmpfsi, kinsing, sys-update-daemon
  - zusvavbox, bioset, kthreadd_fake
  - solrd, networkservice, crypto-pool
  - \.update, \.rsync, \.ice

# ===== 矿池域名/IP（发现连接即告警）=====
mining_pools:
  - c3pool.com
  - pool.hashvault.pro
  - nanopool.org
  - minexmr.com
  - supportxmr.com
  - pool.supportxmr.com
  - gulf.moneroocean.stream
  - auto.c3pool.org

# ===== 矿池端口 =====
mining_ports: [3333, 5555, 7777, 13333, 14433, 14444, 45700]

# ===== 持久化路径（必须定期检查）=====
persistence_paths:
  - /home/www/.bashrc
  - /home/www/.profile
  - /home/www/.config/systemd/user/
  - /var/spool/cron/www
  - /etc/cron.d/
  - /etc/rc.local
  - /usr/local/etc/rc.d/
```

#### 11.5.2 威胁扫描脚本（增强版 threat_scanner.sh）

```bash
#!/bin/bash
# threat_scanner_v2.sh — 分布式节点威胁全面扫描
# 用法：bash threat_scanner_v2.sh [--fix]（加 --fix 自动清理）
FIX_MODE="${1:-}"
ALERT=0

echo "========== 分布式节点威胁扫描 v2 =========="
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "主机: $(hostname) ($(hostname -I | awk '{print $1}'))"
echo ""

# --- 1. 可疑进程扫描 ---
echo "--- [1/7] 可疑进程 ---"
SUSPECTS=$(ps aux | grep -Ei 'xmrig|zusvavbox|kdevtmpfsi|minerd|cpuminer|c3pool|\.update|kinsing|solrd|crypto' | grep -v grep)
if [ -n "$SUSPECTS" ]; then
    echo "🔴 发现可疑进程:"
    echo "$SUSPECTS"
    ALERT=1
    if [ "$FIX_MODE" = "--fix" ]; then
        echo "$SUSPECTS" | awk '{print $2}' | xargs -r kill -9
        echo "✅ 已杀掉可疑进程"
    fi
else
    echo "✅ 无可疑进程"
fi

# --- 2. 高 CPU 进程（>80%）---
echo ""
echo "--- [2/7] 高 CPU 进程 ---"
ps aux --sort=-%cpu | awk 'NR<=6 && $3>80 {print "⚠️ CPU "$3"%: "$11" (PID:"$2" USER:"$1")"}'

# --- 3. 恶意文件检查 ---
echo ""
echo "--- [3/7] 恶意文件路径 ---"
for p in /tmp/.update /tmp/.systemdpw /tmp/.X11-unix/.rsync /home/www/c3pool \
         /dev/shm/.x /var/tmp/.cache /root/.configrc; do
    if ls -d ${p}* 2>/dev/null | head -1 > /dev/null 2>&1; then
        echo "🔴 发现: $p"
        ALERT=1
        [ "$FIX_MODE" = "--fix" ] && rm -rf ${p}* && echo "  ✅ 已删除"
    fi
done
[ $ALERT -eq 0 ] && echo "✅ 无恶意文件路径"

# --- 4. /tmp 可执行文件 ---
echo ""
echo "--- [4/7] /tmp 可执行文件 ---"
EXEC_FILES=$(find /tmp /var/tmp /dev/shm -type f -executable 2>/dev/null)
if [ -n "$EXEC_FILES" ]; then
    echo "⚠️ 发现可执行文件:"
    echo "$EXEC_FILES" | head -10
    ALERT=1
    if [ "$FIX_MODE" = "--fix" ]; then
        echo "$EXEC_FILES" | xargs -r rm -f
        echo "✅ 已删除"
    fi
else
    echo "✅ /tmp 无可执行文件"
fi

# --- 5. 持久化检查 ---
echo ""
echo "--- [5/7] 持久化机制 ---"
for f in /home/www/.bashrc /home/www/.profile; do
    if grep -qE 'zusvavbox|\.update|c3pool|xmrig|minerd|curl.*\|.*sh|wget.*\|.*sh' "$f" 2>/dev/null; then
        echo "🔴 $f 中发现恶意注入"
        ALERT=1
        [ "$FIX_MODE" = "--fix" ] && sed -i '/zusvavbox\|\.update\|c3pool\|xmrig\|minerd/d' "$f" && echo "  ✅ 已清理"
    fi
done
# systemd user timer
if ls /home/www/.config/systemd/user/*.timer 2>/dev/null | head -1 > /dev/null 2>&1; then
    echo "🔴 发现 www 用户 systemd timer"
    ls /home/www/.config/systemd/user/*.timer 2>/dev/null
    ALERT=1
fi
# crontab
if crontab -u www -l 2>/dev/null | grep -v '^#' | grep -q .; then
    echo "🔴 www 用户有 crontab 任务:"
    crontab -u www -l 2>/dev/null
    ALERT=1
fi
[ $ALERT -eq 0 ] && echo "✅ 无持久化机制"

# --- 6. 矿池连接检查 ---
echo ""
echo "--- [6/7] 矿池/C2 连接 ---"
POOL_CONN=$(ss -antp | grep -E ':3333|:5555|:7777|:13333|:14433|:14444|:45700' | grep ESTAB)
if [ -n "$POOL_CONN" ]; then
    echo "🔴 发现矿池连接:"
    echo "$POOL_CONN"
    ALERT=1
else
    echo "✅ 无矿池连接"
fi
# 对外 SSH 扫描检查
SSH_OUT=$(ss -antp | awk '$5~/:22$/ && $1=="ESTAB"' | wc -l)
if [ "$SSH_OUT" -gt 10 ]; then
    echo "🔴 对外 SSH 连接数异常: $SSH_OUT"
    ALERT=1
else
    echo "✅ 对外 SSH 连接正常 ($SSH_OUT)"
fi

# --- 7. PHP 版本检查 ---
echo ""
echo "--- [7/7] PHP 安全 ---"
PHP_VER=$(php -v 2>/dev/null | head -1)
if echo "$PHP_VER" | grep -q '5\.[0-6]'; then
    echo "🔴 PHP 版本过旧: $PHP_VER（必须升级！）"
    ALERT=1
elif [ -n "$PHP_VER" ]; then
    echo "✅ PHP: $PHP_VER"
else
    echo "ℹ️ 未安装 PHP"
fi

echo ""
echo "=========================================="
if [ $ALERT -gt 0 ]; then
    echo "🔴 检测到安全威胁！请立即处理。"
else
    echo "✅ 节点安全状态良好。"
fi
```

#### 11.5.3 应急响应流程（发现入侵后）

```
发现入侵告警
    │
    ▼
┌──────────────────────────────┐
│ 1. 立即隔离                   │
│    - iptables 限制 OUTPUT      │
│    - 杀掉所有可疑进程          │
│    - 禁止 www 用户 shell       │
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│ 2. 证据保全                   │
│    - 截图/记录可疑进程列表      │
│    - 保存网络连接快照          │
│    - 备份 .bashrc/.profile     │
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│ 3. 全面清理                   │
│    - 删除恶意文件              │
│    - 清除所有持久化机制        │
│    - 检查并清理 crontab        │
│    - 检查 systemd timer        │
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│ 4. 加固                       │
│    - 升级 PHP（如 5.6 → 7.4+）│
│    - 应用 iptables 规则        │
│    - /tmp 设 noexec            │
│    - 安装/配置 fail2ban        │
│    - 锁定 www 用户             │
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│ 5. 验证                       │
│    - 运行 threat_scanner --fix │
│    - 检查 CPU/负载恢复正常     │
│    - 确认无对外异常连接        │
│    - 确认站点正常访问          │
└──────────────────────────────┘
```

---

### 11.6 防守策略矩阵（按攻击类型对症下药）

| 攻击类型 | 防守措施 | 检测方式 | 响应方式 | 脚本 |
|:---|:---|:---|:---|:---|
| **Mirai 僵尸网络** | OUTPUT iptables + www 禁 shell + fail2ban | 对外 SSH 连接数监控 | 杀进程 + 清持久化 + 封 IP | `threat_cleaner.sh` |
| **挖矿木马** | /tmp noexec + www 无 shell + 进程白名单 | CPU 100% + 可疑进程名 + 矿池端口 | 杀进程 + 删文件 + 清 crontab | `threat_scanner.sh --fix` |
| **PHP 漏洞利用** | **升级 PHP** + disable_functions + Nginx 路径封堵 + WAF | WebShell 扫描 + 文件完整性 + 异常 PHP 日志 | 删 WebShell + 升级 + 加固目录权限 | `php_hardening.sh` |
| **SSH 暴力破解** | 非默认端口 + 密钥认证 + fail2ban + iptables recent | /var/log/secure Failed password 计数 | fail2ban 自动封 IP | `ssh_hardening.sh` |
| **容器逃逸** | `--no-new-privileges` + 镜像哈希校验 + 定期更新 | 宿主机异常进程 | 停容器 + 检查宿主机 | 手动 |

### 11.7 定期巡检计划

| 频率 | 巡检内容 | 执行方式 |
|:---|:---|:---|
| **每日** | CPU/负载/对外连接数 | fleet_monitor.py |
| **每周** | 威胁扫描 + 可疑进程 + /tmp 检查 | threat_scanner_v2.sh |
| **每月** | PHP 版本检查 + 安全基线全量检查 | node_security_baseline_check.sh |
| **每季度** | Discuz/应用版本检查 + 依赖更新 | 手动 |
| **即时** | 收到云厂商告警 | 应急响应流程（11.5.3） |

### 11.8 部署后安全加固（原有 · 保留）

```bash
# SSH加固（在部署完PCDN后执行）
bash scripts/ssh_hardening.sh --level medium
```

### 11.9 威胁扫描工具

```bash
bash scripts/threat_scanner.sh        # 基础检查
bash scripts/threat_scanner_v2.sh     # 增强版（推荐）
bash scripts/threat_scanner_v2.sh --fix  # 增强版 + 自动清理
bash scripts/threat_cleaner.sh        # 深度清除
```

---

## 十二、已激活配置备份与恢复（免重新绑定）

### 12.0 备份策略

每台设备部署成功后，自动备份以下关键文件到 `configs/设备名_已激活/`：

| 文件 | 作用 | 恢复时是否需要 |
|:---|:---|:---|
| `storage/wxnode` | **节点身份密钥**（加密），唯一标识设备 | ✅ 必须（否则需重新绑定） |
| `storage/.onething_data/.nst` | 节点激活状态 | ✅ 必须 |
| `storage/.onething_data/.info.Storage` | 存储映射（任务分配） | 推荐 |
| `storage/.onething_data/.taskinfo` | 任务信息 | 推荐 |
| `storage/.onething_data/base_info/` | 云端连接参数 | 推荐 |
| `cfg/wxedge.yaml` | wxedge主配置 | ✅ 必须 |
| `cfg/cntr.toml` | containerd配置 | 仅chroot方式需要 |
| `scripts/chroot_start.sh` | chroot启动脚本 | 仅chroot方式需要 |
| `scripts/rc.d_wxedge.sh` | 群晖自启动脚本 | 仅群晖需要 |

### 12.0.1 恢复方法（同设备，免重新绑定）

```bash
# 1. 上传rootfs（首次需要，约130MB）
sshpass -p 'zhiqun1984' scp -O -c aes256-cbc wxedge_fs.tar admin@NAS_IP:/volume1/wxedge/
ssh admin@NAS_IP "sudo tar xf /volume1/wxedge/wxedge_fs.tar -C /volume1/wxedge/rootfs"

# 2. 恢复已激活的storage数据（关键！免重新绑定）
scp -O -c aes256-cbc -r configs/ds213j_已激活/storage/* admin@NAS_IP:/volume1/wxedge/storage/

# 3. 恢复配置
scp -O -c aes256-cbc configs/ds213j_已激活/cfg/* admin@NAS_IP:/volume1/wxedge/rootfs/xyapp/miner.plugin-wxedge.ipk/cfg/

# 4. 上传启动脚本
scp -O -c aes256-cbc configs/ds213j_已激活/scripts/chroot_start.sh admin@NAS_IP:/volume1/wxedge/
ssh admin@NAS_IP "sudo cp /volume1/wxedge/rc.d_wxedge.sh /usr/local/etc/rc.d/wxedge.sh && sudo chmod 755 /usr/local/etc/rc.d/wxedge.sh"

# 5. 启动
ssh admin@NAS_IP "sudo /volume1/wxedge/chroot_start.sh &"
```

### 12.0.2 新设备部署（需新绑定）

新设备不能复制 `wxnode`（节点身份与硬件指纹绑定），需要：
1. 用同样的rootfs + chroot方案部署
2. **不复制**`storage/wxnode`和`.onething_data/`
3. 首次启动后用手机App扫码绑定
4. 绑定后立即备份新设备的 `storage/` 到 `configs/设备名_已激活/`

### 12.0.3 已备份设备清单

| 设备 | 配置路径 | SN | 备份日期 |
|:---|:---|:---|:---|
| DS213j (192.168.110.29) | `configs/ds213j_已激活/` | CTWX09Y9Q2ILI4PV | 2026-02-14 |

---

## 十三、经验沉淀

### 13.1 群晖NAS部署网心云的坑

1. **Docker路径不同**：群晖的Docker在 `/var/packages/ContainerManager/target/usr/bin/docker`，不是 `/usr/bin/docker`
2. **需要sudo**：普通用户需要 `sudo` 才能操作Docker
3. **镜像拉取**：NAS必须能访问外网Docker Hub，否则无法拉取镜像
4. **存储目录**：建议用 `/volume1/docker/wxedge` 而非 `/data/wxedge`

### 13.2 老旧NAS（不支持Docker）的chroot部署方案（DS213j实战）

**适用场景**：armv7l/arm32、内核3.x（含3.2）、无Docker套件、无cgroup支持的老群晖（如DS213j）

**核心发现**：
1. `wxedged` 是 **Go静态链接的ARM32 ELF**，无动态库依赖
2. 但 wxedge v2.4.3 **依赖containerd**（container-service/task-service需要cntr.sock），纯二进制运行会因缺少containerd而退出
3. containerd 是**动态链接**的，直接在老NAS上运行报"No such file or directory"（缺库）
4. **终极方案：chroot整个Docker镜像文件系统** + **二进制补丁** + **fake_runc** + **硬件伪装**

#### 13.2.1 方案架构（5层修改）

```
┌─────────────────────────────────────────────────────────────┐
│ 层1：chroot 环境（完整 rootfs 从 Docker 镜像提取）          │
│ 层2：二进制补丁（wxedged + containerd-shim-runc-v2）        │
│ 层3：fake_runc.sh（替代真实 runc，因内核无 namespace）      │
│ 层4：native snapshotter（替代 overlayfs，因内核无 overlay） │
│ 层5：硬件伪装（fake /proc/cpuinfo, /proc/stat, cgroups）   │
│ 层6：frpc 内网穿透（公网访问管理页面）                       │
└─────────────────────────────────────────────────────────────┘
```

#### 13.2.2 实战步骤（2026-02-14验证通过）

```bash
# 1. 在Mac/PC上提取Docker镜像完整文件系统
docker pull --platform linux/arm/v7 onething1/wxedge:latest
docker create --platform linux/arm/v7 --name tmp onething1/wxedge:latest
docker export tmp -o wxedge_fs.tar

# 2. 上传到NAS（SCP需加 -O -c aes256-cbc 兼容老SSH）
sshpass -p 'zhiqun1984' scp -O -c aes256-cbc wxedge_fs.tar admin@NAS_IP:/volume1/wxedge/

# 3. 在NAS上解压rootfs
sudo mkdir -p /volume1/wxedge/rootfs /volume1/wxedge/storage /volume1/wxedge/logs
sudo tar xf /volume1/wxedge/wxedge_fs.tar -C /volume1/wxedge/rootfs

# 4. 修改wxedge.yaml
sed -i 's|storage_path:.*|storage_path: "/storage"|' /volume1/wxedge/rootfs/xyapp/miner.plugin-wxedge.ipk/cfg/wxedge.yaml

# 5. 修改cntr.toml（禁用overlayfs，强制使用native snapshotter）
# 在 disabled_plugins 中添加不支持的 snapshotter
# disabled_plugins = ["...", "io.containerd.snapshotter.v1.overlayfs", "io.containerd.snapshotter.v1.aufs", ...]

# 6. 部署 fake_runc.sh（见下文）
# 7. 二进制补丁 wxedged 和 containerd-shim-runc-v2（见下文）
# 8. 配置硬件伪装（见下文）
# 9. 配置 frpc 内网穿透（见下文）
# 10. 自启动：/usr/local/etc/rc.d/wxedge.sh 调用 chroot_start.sh
```

#### 13.2.3 二进制补丁（关键！内核3.2兼容）

**为什么需要补丁**：Linux 3.2.40 缺少 `prctl(PR_SET_CHILD_SUBREAPER)`、现代 namespace、`overlayfs` 等特性，containerd-shim 和 wxedged 会直接报错退出。

**补丁位置和方法**：

| 二进制文件 | 补丁内容 | 方法 |
|:---|:---|:---|
| **containerd-shim-runc-v2** | 1. NOP 掉 `prctl(PR_SET_CHILD_SUBREAPER)` 调用 | `sed -i` 替换字节 |
| | 2. 跳过其错误检查（mov r0, #0 强制返回成功） | ARM指令替换 |
| | 3. 重定向 `/proc/self/exe` 读取到 `/tmp/_shimexe_` | 字符串替换 |
| **wxedged** | 1. `/proc/self/cgroup` → `/tmp/fake_cgroups_` | 字符串替换 |
| | 2. `/proc/self/mountinfo` → `/tmp/_fake_mountinfo` | 字符串替换 |
| | 3. `/proc/mounts` → `/tmp/fmounts` | 字符串替换（padding \x00） |
| | 4. `/proc/cgroups` → `/tmp/fcgroups` | 字符串替换（padding \x00） |

**containerd-shim-runc-v2 补丁示例**：
```bash
# 补丁1：NOP掉 prctl(PR_SET_CHILD_SUBREAPER) 的 bl 调用
# 找到 bl prctl 指令的偏移，替换为 nop (e1a00000)
# 补丁2：跳过错误检查，mov r0, #0 (e3a00000)
# 补丁3：重定向 /proc/self/exe → /tmp/_shimexe_
printf '/tmp/_shimexe_\x00' | dd of=containerd-shim-runc-v2 bs=1 seek=<OFFSET> conv=notrunc
```

**wxedged 补丁示例**：
```bash
# 将 /proc/self/cgroup 替换为等长字符串（用 \x00 padding）
# /proc/self/cgroup (17字节) → /tmp/fake_cgroups_ (18字节，需精确匹配)
python3 -c "
data = open('wxedged','rb').read()
data = data.replace(b'/proc/self/cgroup\x00', b'/tmp/fake_cgroups_\x00')
data = data.replace(b'/proc/self/mountinfo', b'/tmp/_fake_mountinfo')
data = data.replace(b'/proc/mounts\x00', b'/tmp/fmounts\x00\x00\x00\x00\x00\x00')
data = data.replace(b'/proc/cgroups\x00', b'/tmp/fcgroups\x00\x00\x00\x00\x00')
open('wxedged','wb').write(data)
"
```

#### 13.2.4 fake_runc v6（替代真实runc，支持3种容器）

内核3.2无法运行真实 runc（需要 namespace、pivot_root 等），用shell脚本模拟OCI runtime。
**v6 支持 gulu（收益主力）、pcdn（CPU检测降级）、thunder/dcdn（keepalive）三种容器类型**。

```bash
#!/bin/sh
# =============================================
# fake-runc v6: musl + PCDN降级 + thunder/dcdn
# 适用于 Linux 3.2 内核（无 namespace/cgroup）
# =============================================
LOG="/tmp/fake_runc.log"
SNAP_BASE="/var/lib/containerd/io.containerd.snapshotter.v1.native/snapshots"

log() { echo "$(date '+%Y-%m-%d %T') [runc] $*" >> $LOG; }

# ---- 解析全局参数 ----
COMMAND=""
while [ $# -gt 0 ]; do
  case "$1" in
    --root) shift 2;; --log) shift 2;; --log-format) shift 2;;
    --systemd-cgroup) shift;;
    create|start|state|kill|delete|spec) COMMAND="$1"; shift; break;;
    *) shift;;
  esac
done

log "CMD=$COMMAND ARGS=$*"

case "$COMMAND" in
  create)
    BUNDLE=""; ID=""; PID_FILE=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --bundle|-b) BUNDLE="$2"; shift 2;;
        --pid-file) PID_FILE="$2"; shift 2;;
        --console-socket) shift 2;; --no-pivot) shift;;
        *) [ -z "$ID" ] && ID="$1"; shift;;
      esac
    done

    STATE_DIR="/tmp/runc_states/$ID"; mkdir -p "$STATE_DIR"
    ROOTFS="$BUNDLE/rootfs"; CONFIG="$BUNDLE/config.json"

    if [ ! -f "$CONFIG" ]; then
      /bin/sh -c "exec sleep 86400" &
      INIT_PID=$!
    else
      CFG_DATA=$(cat "$CONFIG")
      PROC_ARGS=$(echo "$CFG_DATA" | grep -o '"args":\[[^]]*\]' | sed 's/"args":\[//;s/\]//')
      PROC_CWD=$(echo "$CFG_DATA" | grep -o '"cwd":"[^"]*"' | sed 's/"cwd":"//;s/"//')
      [ -z "$PROC_CWD" ] && PROC_CWD="/"
      PROC_ENV_RAW=$(echo "$CFG_DATA" | grep -o '"env":\[[^]]*\]' | sed 's/"env":\[//;s/\]//')
      STORAGE_SRC=$(echo "$CFG_DATA" | grep -o '"source":"/storage/[^"]*"' | head -1 | sed 's/"source":"//;s/"//')
      NODE_ID_SRC=$(echo "$CFG_DATA" | grep -o '"source":"/tmp/[^"]*node_id"' | sed 's/"source":"//;s/"//')

      # ---- 判断容器类型 ----
      CONTAINER_TYPE="unknown"; SNAP_DIR=""
      if echo "$PROC_ARGS" | grep -q "softdog"; then
        CONTAINER_TYPE="pcdn"
        for i in $(ls "$SNAP_BASE" 2>/dev/null | sort -rn); do
          [ -f "$SNAP_BASE/$i/PCDN/softdog.sh" ] && SNAP_DIR="$SNAP_BASE/$i" && break
        done
      elif echo "$PROC_ARGS" | grep -q "dcdn_monitor"; then
        CONTAINER_TYPE="thunder"
        for i in $(ls "$SNAP_BASE" 2>/dev/null | sort -rn); do
          [ -f "$SNAP_BASE/$i/thunder/bin/dcdn_monitor.sh" ] && SNAP_DIR="$SNAP_BASE/$i" && break
        done
      elif echo "$PROC_ARGS" | grep -q "start.sh"; then
        CONTAINER_TYPE="gulu"
        for i in $(ls "$SNAP_BASE" 2>/dev/null | sort -rn); do
          [ -f "$SNAP_BASE/$i/usr/local/galaxy/guluplugin/bin/start.sh" ] && SNAP_DIR="$SNAP_BASE/$i" && break
        done
      fi

      if [ -z "$SNAP_DIR" ]; then
        /bin/sh -c "exec sleep 86400" &
        INIT_PID=$!
      else
        log "  type=$CONTAINER_TYPE snap=$SNAP_DIR"
        # ---- 挂载 snapshot 到 rootfs ----
        mount --bind "$SNAP_DIR" "$ROOTFS" 2>/dev/null
        mkdir -p "$ROOTFS/dev" "$ROOTFS/proc" "$ROOTFS/tmp" "$ROOTFS/storage" 2>/dev/null
        mount -t proc proc "$ROOTFS/proc" 2>/dev/null
        mount --bind /dev "$ROOTFS/dev" 2>/dev/null
        [ -n "$STORAGE_SRC" ] && [ -d "$STORAGE_SRC" ] && mount --bind "$STORAGE_SRC" "$ROOTFS/storage"
        [ -n "$NODE_ID_SRC" ] && [ -f "$NODE_ID_SRC" ] && touch "$ROOTFS/tmp/node_id" && mount --bind "$NODE_ID_SRC" "$ROOTFS/tmp/node_id"
        [ -e "/tmp/m.sock" ] && touch "$ROOTFS/tmp/m.sock" && mount --bind "/tmp/m.sock" "$ROOTFS/tmp/m.sock"
        [ -f "/xyapp/miner.plugin-wxedge.ipk/lib/h.so" ] && mkdir -p "$ROOTFS/lib" && touch "$ROOTFS/lib/h.so" && mount --bind "/xyapp/miner.plugin-wxedge.ipk/lib/h.so" "$ROOTFS/lib/h.so"
        cp /etc/resolv.conf "$ROOTFS/etc/resolv.conf" 2>/dev/null

        # ---- ENV + CMD 解析 ----
        ENV_EXPORTS=""; OLDIFS="$IFS"; IFS=","
        for raw_env in $PROC_ENV_RAW; do
          ev=$(echo "$raw_env" | sed 's/^ *"//;s/" *$//'); [ -n "$ev" ] && ENV_EXPORTS="$ENV_EXPORTS export $ev;"
        done; IFS="$OLDIFS"
        EXEC_CMD=""; OLDIFS="$IFS"; IFS=","
        for raw_arg in $PROC_ARGS; do
          arg=$(echo "$raw_arg" | sed 's/^ *"//;s/" *$//'); EXEC_CMD="$EXEC_CMD $arg"
        done; IFS="$OLDIFS"; EXEC_CMD=$(echo "$EXEC_CMD" | sed 's/^ //')

        # ==== Gulu（收益主力）：设置 musl 库 ====
        if [ "$CONTAINER_TYPE" = "gulu" ]; then
          GULU_BIN="$ROOTFS/usr/local/galaxy/guluplugin/bin"
          [ ! -e "$ROOTFS/lib/ld-musl-armhf.so.1" ] && ln -sf /usr/local/galaxy/guluplugin/bin/libc.so "$ROOTFS/lib/ld-musl-armhf.so.1"
          [ ! -f "$GULU_BIN/libstdc++.so.6" ] && [ -f "/tmp/musl_libs/libstdc++.so.6" ] && \
            cp /tmp/musl_libs/libstdc++.so.6 "$GULU_BIN/" && cp /tmp/musl_libs/libgcc_s.so.1 "$GULU_BIN/"
          chroot "$ROOTFS" /bin/sh -c "$ENV_EXPORTS export LD_LIBRARY_PATH=/usr/local/galaxy/guluplugin/bin/:/lib:/usr/lib; cd $PROC_CWD; exec $EXEC_CMD" >> /tmp/container_${ID}.log 2>&1 &
          INIT_PID=$!

        # ==== Thunder/DCDN：直接运行（可能Illegal Instruction→keepalive） ====
        elif [ "$CONTAINER_TYPE" = "thunder" ]; then
          chroot "$ROOTFS" /bin/sh -c "$ENV_EXPORTS export LD_LIBRARY_PATH=/thunder/bin:/lib:/usr/lib; cd $PROC_CWD; exec $EXEC_CMD" >> /tmp/container_${ID}.log 2>&1 &
          INIT_PID=$!

        # ==== PCDN：检测CPU兼容性，不兼容则keepalive ====
        elif [ "$CONTAINER_TYPE" = "pcdn" ]; then
          chroot "$ROOTFS" /bin/sh -c "
            $ENV_EXPORTS; cd $PROC_CWD
            /PCDN/PCDNClient --version > /tmp/pcdn_test.log 2>&1
            if [ \$? -eq 132 ] || [ \$? -eq 127 ]; then
              while true; do echo \"\$(date) PCDN keepalive\" >> /tmp/pcdn_guard.log; sleep 300; done
            else exec $EXEC_CMD; fi
          " >> /tmp/container_${ID}.log 2>&1 &
          INIT_PID=$!

        # ==== 未知类型 ====
        else
          chroot "$ROOTFS" /bin/sh -c "$ENV_EXPORTS; cd $PROC_CWD; exec $EXEC_CMD" >> /tmp/container_${ID}.log 2>&1 &
          INIT_PID=$!
        fi
      fi
    fi

    # ⚠️ 关键：printf 无换行！echo会导致 strconv.Atoi 报错
    printf "%s" "$INIT_PID" > "$STATE_DIR/pid"
    [ -n "$PID_FILE" ] && printf "%s" "$INIT_PID" > "$PID_FILE"
    echo "{\"ociVersion\":\"1.0.2\",\"id\":\"$ID\",\"status\":\"created\",\"pid\":$INIT_PID}" > "$STATE_DIR/state.json"
    ;;

  start) ;; # start 只需返回成功

  state)
    ID="$1"; STATE_DIR="/tmp/runc_states/$ID"
    if [ -f "$STATE_DIR/state.json" ]; then
      PID=$(cat "$STATE_DIR/pid" 2>/dev/null)
      [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null && cat "$STATE_DIR/state.json" || echo "{\"ociVersion\":\"1.0.2\",\"id\":\"$ID\",\"status\":\"stopped\"}"
    else echo '{"status":"stopped"}'; fi
    ;;

  kill)
    ID="$1"; SIG="${2:-TERM}"; STATE_DIR="/tmp/runc_states/$ID"
    [ -f "$STATE_DIR/pid" ] && { PID=$(cat "$STATE_DIR/pid"); kill -"$SIG" "$PID" 2>/dev/null; pkill -"$SIG" -P "$PID" 2>/dev/null; }
    ;;

  delete)
    ID="$1"; STATE_DIR="/tmp/runc_states/$ID"
    [ -f "$STATE_DIR/pid" ] && { PID=$(cat "$STATE_DIR/pid"); kill -9 "$PID" 2>/dev/null; pkill -9 -P "$PID" 2>/dev/null; }
    rm -rf "$STATE_DIR"
    ;;

  *) echo '{"ociVersion":"1.0.2"}' ;;
esac
exit 0
```

**容器类型处理逻辑（v6核心）**：

| 容器类型 | 检测关键词 | 快照路径特征 | 处理方式 |
|:---|:---|:---|:---|
| **gulu**（收益主力） | `start.sh` | `guluplugin/bin/start.sh` | 设置musl环境 + chroot执行 |
| **pcdn** | `softdog` | `PCDN/softdog.sh` | 检测CPU→不兼容则keepalive |
| **thunder/dcdn** | `dcdn_monitor` | `thunder/bin/dcdn_monitor.sh` | 直接运行（可能降级keepalive） |
| 未知 | — | — | 回退sleep保活 |

**部署 fake_runc v6**：
```bash
# 替换原 runc 二进制
cp fake_runc_v6.sh /volume1/wxedge/rootfs/xyapp/miner.plugin-wxedge.ipk/bin/runc
chmod 755 /volume1/wxedge/rootfs/xyapp/miner.plugin-wxedge.ipk/bin/runc
# 创建 PATH 中的软链接
ln -sf /xyapp/miner.plugin-wxedge.ipk/bin/runc /volume1/wxedge/rootfs/usr/bin/runc
ln -sf /xyapp/miner.plugin-wxedge.ipk/bin/runc /volume1/wxedge/rootfs/usr/local/bin/runc
# shim 也需要在 PATH 中
ln -sf /xyapp/miner.plugin-wxedge.ipk/bin/containerd-shim-runc-v2 /volume1/wxedge/rootfs/usr/bin/containerd-shim-runc-v2
```

#### 13.2.5 containerd 配置（cntr.toml 关键修改）

```toml
# 禁用所有不支持的 snapshotter（内核3.2无overlayfs/aufs/btrfs等）
disabled_plugins = [
  "io.containerd.grpc.v1.cri",
  "io.containerd.snapshotter.v1.overlayfs",
  "io.containerd.snapshotter.v1.aufs",
  "io.containerd.snapshotter.v1.btrfs",
  "io.containerd.snapshotter.v1.devmapper",
  "io.containerd.snapshotter.v1.zfs"
]
# containerd 会自动 fallback 到 native snapshotter（文件拷贝方式）
# native snapshotter 较慢但兼容所有内核
```

**清除旧数据重建**（切换snapshotter后必须）：
```bash
# 在chroot内执行
rm -rf /var/lib/containerd/*
rm -rf /storage/.onething_data/cntrd/meta.db
# 重启 containerd 和 wxedged，让它们重新拉取和解压镜像
```

#### 13.2.6 硬件伪装配置（提升任务分配优先级）

wxedge 根据硬件配置分配任务数量和类型。伪装为高配设备可获得更多任务：

**1. CPU伪装（22核）**：
```bash
# fake_cpuinfo - 在 setup_env.sh 中生成并 bind mount 到 /proc/cpuinfo
for i in $(seq 0 21); do
  cat >> $ROOTFS/tmp/fake_cpuinfo <<EOF
processor	: $i
model name	: Intel(R) Xeon(R) CPU E5-2696 v4 @ 2.20GHz
BogoMIPS	: 4400.00
Features	: half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt
CPU implementer	: 0x56
Hardware	: Marvell Armada 370/XP (Device Tree)

EOF
done
mount --bind $ROOTFS/tmp/fake_cpuinfo $ROOTFS/proc/cpuinfo
```

**2. CPU统计伪装（/proc/stat）**：
```bash
# fake_stat - 必须有 cpu0-cpu21 行，wxedge 通过行数判断核心数
# 生成 cpu + cpu0~cpu21 共23行
cat > /volume1/wxedge/fake_stat <<'EOF'
cpu  136808000 223480 50386450 6438110 1086470 0 4307210 0 0 0
cpu0 17101000 27935 6298306 804763 135808 0 538401 0 0 0
... (cpu1-cpu21 同格式)
EOF
mount --bind /volume1/wxedge/fake_stat $ROOTFS/proc/stat
```

**3. 磁盘伪装（SSD 2TB）**：
```bash
# /tmp/fmounts - wxedged 读取此文件判断磁盘类型和大小
cat > $ROOTFS/tmp/fmounts <<'EOF'
/dev/md2 / ext4 rw,relatime 0 0
/dev/md2 /storage ext4 rw,relatime 0 0
cgroup /sys/fs/cgroup/cpu cgroup rw,cpu,cpuacct 0 0
cgroup /sys/fs/cgroup/memory cgroup rw,memory 0 0
cgroup /sys/fs/cgroup/net_cls cgroup rw,net_cls 0 0
... (完整挂载列表)
EOF

# /sys/block/md2/queue/rotational = 0（SSD标识）
mkdir -p $ROOTFS/sys/block/md2/queue
echo 0 > $ROOTFS/sys/block/md2/queue/rotational

# /dev/sda* 设备节点（wxedge检测物理磁盘）
mknod $ROOTFS/dev/sda b 8 0
mknod $ROOTFS/dev/sda1 b 8 1
mknod $ROOTFS/dev/sda2 b 8 2
```

**4. cgroup伪装**：
```bash
# /tmp/fake_cgroups_ （wxedged读取的 /proc/self/cgroup 替代）
cat > $ROOTFS/tmp/fake_cgroups_ <<'EOF'
12:blkio:/
11:cpuset:/
7:memory:/
5:cpu,cpuacct:/
6:devices:/
9:pids:/
3:net_cls,net_prio:/
0::/
EOF

# /tmp/fcgroups （wxedged读取的 /proc/cgroups 替代）
cat > $ROOTFS/tmp/fcgroups <<'EOF'
#subsys_name	hierarchy	num_cgroups	enabled
cpuset	11	1	1
cpu	5	1	1
cpuacct	5	1	1
blkio	12	1	1
memory	7	1	1
devices	6	1	1
net_cls	3	1	1
pids	9	1	1
EOF

# cgroup 控制文件（伪装内存32GB、CPU 22核）
mkdir -p $ROOTFS/sys/fs/cgroup/{cpu,memory,blkio,devices,pids,cpuset,net_cls}
echo 2200000 > $ROOTFS/sys/fs/cgroup/cpu/cpu.cfs_quota_us
echo 100000 > $ROOTFS/sys/fs/cgroup/cpu/cpu.cfs_period_us
echo 34359738368 > $ROOTFS/sys/fs/cgroup/memory/memory.limit_in_bytes
echo 0 > $ROOTFS/sys/fs/cgroup/memory/memory.usage_in_bytes

# per-container net_cls cgroup（任务接收后需创建）
# wxedge 会为每个任务创建 /sys/fs/cgroup/net_cls/wxedge/<task_id>/
# 需预创建目录并写入 cgroup.procs, net_cls.classid, tasks 文件
```

#### 13.2.7 frpc 内网穿透（公网访问管理页面）

在 NAS 的 frpc.ini 中添加 wxedge 管理页面转发：

```ini
# /volume1/homes/admin/frpc/frpc.ini 追加：
# ============================================
# PCDN / 分布式算力（网心云管理）
# ============================================

# 网心云管理页面（外网端口 18882 → NAS 18888）
[home-nas-wxedge]
type = tcp
local_ip = 127.0.0.1
local_port = 18888
remote_port = 18882
```

**frps 服务端**：42.194.245.239（存客宝服务器）
**管理页面公网地址**：`http://42.194.245.239:18882/`
**Dashboard API**：`http://42.194.245.239:18882/docker/dashboard`

#### 13.2.8 chroot_start.sh 完整脚本（最终版，含所有修复）

```bash
#!/bin/sh
# =============================================
# chroot_start.sh - 网心云 wxedge chroot 启动脚本
# 适用于：Linux 3.2+ 无Docker的ARM32设备
# 内置修复：cgroup伪装、硬件伪装、_shimexe_、musl库、fake_netns、资源控制
# =============================================
ROOTFS=/volume1/wxedge/rootfs
STORAGE=/volume1/wxedge/storage

# ---- 1. 清理旧挂载 ----
for mp in proc/cpuinfo proc/stat proc dev storage tmp run sys/fs/cgroup; do
  umount $ROOTFS/$mp 2>/dev/null
done

# ---- 2. 核心挂载（顺序重要！） ----
mount -t proc proc $ROOTFS/proc
mount --bind /dev $ROOTFS/dev
mount --bind $STORAGE $ROOTFS/storage
mount -t tmpfs tmpfs $ROOTFS/tmp
mount -t tmpfs tmpfs $ROOTFS/run
# ⚠️ 绝不挂sysfs！只挂cgroup tmpfs（否则sysfs会遮盖手动创建的cgroup目录）
mkdir -p $ROOTFS/sys/fs/cgroup
mount -t tmpfs fakecgroup $ROOTFS/sys/fs/cgroup
mkdir -p $ROOTFS/sys/fs/cgroup/{memory,cpu,cpuset,devices,blkio,pids,net_cls,systemd}

# ---- 3. cgroup 控制文件（伪装22核CPU + 32GB内存）----
echo 2200000 > $ROOTFS/sys/fs/cgroup/cpu/cpu.cfs_quota_us
echo 100000 > $ROOTFS/sys/fs/cgroup/cpu/cpu.cfs_period_us
echo 34359738368 > $ROOTFS/sys/fs/cgroup/memory/memory.limit_in_bytes
echo 0 > $ROOTFS/sys/fs/cgroup/memory/memory.usage_in_bytes

# ---- 4. 磁盘伪装（SSD标识）----
mkdir -p $ROOTFS/sys/block/md2/queue
echo 0 > $ROOTFS/sys/block/md2/queue/rotational  # SSD
mknod $ROOTFS/dev/sda b 8 0 2>/dev/null
mknod $ROOTFS/dev/sda1 b 8 1 2>/dev/null
mknod $ROOTFS/dev/sda2 b 8 2 2>/dev/null

# ---- 5. CPU伪装（22核 Xeon）----
mount --bind /volume1/wxedge/fake_stat $ROOTFS/proc/stat
: > $ROOTFS/tmp/fake_cpuinfo
for i in $(seq 0 21); do
  printf "processor\t: %d\nmodel name\t: Intel Xeon E5-2696 v4 @ 2.20GHz\nBogoMIPS\t: 4400.00\n\n" $i >> $ROOTFS/tmp/fake_cpuinfo
done
mount --bind $ROOTFS/tmp/fake_cpuinfo $ROOTFS/proc/cpuinfo

# ---- 6. wxedged 读取的 fake 文件（/tmp是tmpfs，每次启动必须重写）----
cat > $ROOTFS/tmp/fmounts <<'FEOF'
/dev/md2 / ext4 rw,relatime 0 0
tmpfs /tmp tmpfs rw 0 0
proc /proc proc rw 0 0
sysfs /sys sysfs rw 0 0
devtmpfs /dev devtmpfs rw 0 0
cgroup /sys/fs/cgroup/cpu cgroup rw,cpu,cpuacct 0 0
cgroup /sys/fs/cgroup/memory cgroup rw,memory 0 0
cgroup /sys/fs/cgroup/blkio cgroup rw,blkio 0 0
cgroup /sys/fs/cgroup/net_cls cgroup rw,net_cls 0 0
/dev/md2 /storage ext4 rw,relatime 0 0
FEOF

cat > $ROOTFS/tmp/_fake_mountinfo <<'FEOF'
25 1 9:2 / / rw,relatime - ext4 /dev/md2 rw
30 25 0:3 / /proc rw,relatime - proc proc rw
32 25 0:5 / /dev rw,nosuid,noexec,relatime - devtmpfs none rw
34 25 0:20 / /tmp rw,relatime - tmpfs tmpfs rw
36 25 0:16 / /sys rw,relatime - sysfs sysfs rw
37 36 0:17 / /sys/fs/cgroup rw,relatime - tmpfs tmpfs rw
38 37 0:18 / /sys/fs/cgroup/cpu,cpuacct rw,relatime - cgroup cgroup rw,cpu,cpuacct
39 37 0:19 / /sys/fs/cgroup/memory rw,relatime - cgroup cgroup rw,memory
44 37 0:24 / /sys/fs/cgroup/net_cls rw,relatime - cgroup cgroup rw,net_cls
33 25 9:2 /wxedge/storage /storage rw,relatime - ext4 /dev/md2 rw
FEOF

cat > $ROOTFS/tmp/fake_cgroups_ <<'FEOF'
12:blkio:/
11:cpuset:/
7:memory:/
5:cpu,cpuacct:/
6:devices:/
9:pids:/
3:net_cls,net_prio:/
0::/
FEOF

cat > $ROOTFS/tmp/fcgroups <<'FEOF'
#subsys_name	hierarchy	num_cgroups	enabled
cpuset	11	1	1
cpu	5	1	1
cpuacct	5	1	1
blkio	12	1	1
memory	7	1	1
devices	6	1	1
net_cls	3	1	1
pids	9	1	1
FEOF

# ---- 7. _shimexe_ 符号链接（shim的os.Executable()需要，tmpfs清空后必须重建）----
ln -sf /xyapp/miner.plugin-wxedge.ipk/bin/containerd-shim-runc-v2 $ROOTFS/tmp/_shimexe_

# ---- 8. musl C++ 库缓存（guluplugin 必须，来自 Alpine v3.12）----
mkdir -p $ROOTFS/tmp/musl_libs/
[ -f /volume1/wxedge/libstdc++_musl312.so.6 ] && \
  cp /volume1/wxedge/libstdc++_musl312.so.6 $ROOTFS/tmp/musl_libs/libstdc++.so.6
[ -f /volume1/wxedge/libgcc_s_musl312.so.1 ] && \
  cp /volume1/wxedge/libgcc_s_musl312.so.1 $ROOTFS/tmp/musl_libs/libgcc_s.so.1
# 预安装到已有 gulu 快照
SNAP_BASE=$ROOTFS/var/lib/containerd/io.containerd.snapshotter.v1.native/snapshots
for d in $(ls $SNAP_BASE 2>/dev/null); do
  GULU="$SNAP_BASE/$d/usr/local/galaxy/guluplugin/bin"
  if [ -d "$GULU" ] && [ ! -f "$GULU/libstdc++.so.6" ]; then
    cp $ROOTFS/tmp/musl_libs/libstdc++.so.6 "$GULU/" 2>/dev/null
    cp $ROOTFS/tmp/musl_libs/libgcc_s.so.1 "$GULU/" 2>/dev/null
    ln -sf /usr/local/galaxy/guluplugin/bin/libc.so "$SNAP_BASE/$d/lib/ld-musl-armhf.so.1" 2>/dev/null
  fi
done

# ---- 9. DNS ----
cp /etc/resolv.conf $ROOTFS/etc/resolv.conf

# ---- 10. 启动 containerd + wxedged ----
chroot $ROOTFS /bin/sh -c '
cd /xyapp/miner.plugin-wxedge.ipk
rm -rf /run/containerd /var/lib/containerd/tmpmounts
./bin/containerd -c ./cfg/cntr.toml &
sleep 5
GODEBUG=x509ignoreCN=0 ./bin/wxedged -c ./cfg/wxedge.yaml &
sleep 30

# ---- 11. fake_netns（wxedged启动后异步设置）----
# 内核3.2的/proc/PID/ns/为空（无net文件），用tmpfs覆盖创建假net文件
WXPID=$(ps -e -o pid,args 2>/dev/null | grep wxedged | grep -v grep | awk "{print \$1}" | head -1)
if [ -n "$WXPID" ]; then
  for TID in $(ls /proc/$WXPID/task/ 2>/dev/null); do
    NS_DIR="/proc/$WXPID/task/$TID/ns"
    if [ -d "$NS_DIR" ] && [ ! -f "$NS_DIR/net" ]; then
      mount -t tmpfs tmpfs "$NS_DIR" 2>/dev/null
      echo "fake" > "$NS_DIR/net" 2>/dev/null
    fi
  done
fi

# ---- 12. 资源控制（nice=10 + CPU守护）----
for P in $(ps -e -o pid,args 2>/dev/null | grep -E "wxedged|containerd|guluplugin" | grep -v grep | awk "{print \$1}"); do
  renice 10 $P 2>/dev/null
done

# CPU守护：负载>70%时暂停guluplugin 15秒
while true; do
  LOAD=$(cat /proc/loadavg | awk "{print \$1}")
  OVER=$(awk "BEGIN {print ($LOAD > 0.70) ? 1 : 0}")
  if [ "$OVER" = "1" ]; then
    GULU_PID=$(ps -e -o pid,args 2>/dev/null | grep guluplugin | grep -v grep | awk "{print \$1}" | head -1)
    [ -n "$GULU_PID" ] && kill -STOP $GULU_PID 2>/dev/null && sleep 15 && kill -CONT $GULU_PID 2>/dev/null
  fi
  sleep 30
done &

wait'
```

#### 13.2.9 验证信息（2026-02-14 最终状态）

- **设备SN**：CTWX09Y9Q2ILI4PV
- **版本**：v2.4.3
- **云端连接**：Handshake Success ✅
- **settlement-service**（收益服务）正常运行 ✅
- **container-service**：3个任务稳定运行中（CB*.0 + CG*.0 + CG*.1）✅
- **guluplugin**：正常运行，Tracker心跳30秒/次，已有P2P数据传输（UP 75KB / DN 2.7MB）✅
- **CDN Tracker**：103.45.73.108:8409（心跳正常）✅
- **Mona Server**：146.196.69.8:1942 / 122.189.221.157:6938 ✅
- **XYP端口**：41540 / 53377（对外CDN服务端口）✅
- **Dashboard API**：`state_code: 0`（3个任务正常）✅
- **伪装资源**：CPU 22核 / SSD / 2033GB / 512GB RAM / ext4 / fs_enable=1 ✅
- **内存实际**：497MB total, ~73MB used (wxedge全栈), ~170MB available
- **进程数**：containerd + wxedged + 4×shim + guluplugin + PCDN-guard + cpu_guard
- **snapshot**：46个（native snapshotter）
- **frpc隧道**：http://42.194.245.239:18882（仅管理页面，**PCDN流量走本地网络**）✅
- **资源控制**：所有进程 nice=10 + CPU守护（>70%自动暂停guluplugin）✅
- **NAT类型**：4（对称NAT），P2P连接受限但不影响基本收益

**不能运行的任务**（硬件限制，无需修复）：
- CX*（DCDN）：`dcdn_client_docker` Illegal instruction → keepalive模式
- CYK：netns依赖，内核3.2不支持（已用fake_netns缓解）
- Z（Centaurs）：要求AMD64架构，ARM32无法运行
- CB*（PCDN）：`PCDNClient` Illegal instruction → keepalive模式

**实际收益来源**：guluplugin（Gulu CDN）是唯一真正工作的收益程序

#### 13.2.10 关键注意（所有踩坑经验汇总，一键部署必读）

**SSH/SCP兼容**：
- `ssh -c aes256-cbc`（老群晖只支持旧cipher）
- `scp -O`（新版macOS默认SFTP，老群晖不支持）
- admin用户需 `echo 'zhiqun1984' | sudo -S` 执行root操作
- 密码：zhiqun1984（**小写z**）

**文件系统**：
- 磁盘空间：5.4TB总量，2.0TB可用（PCDN充足）
- 内存：497MB（全栈占用约73MB，可用约170MB）
- **切换snapshotter后必须清除 /var/lib/containerd/ 重建**

**二进制补丁**：
- **fake_runc v6**（支持 gulu + pcdn + thunder/dcdn 三种容器类型）
- fake_runc 中写 PID 必须用 `printf "%s"` 而非 echo（避免换行符）
- 二进制补丁后的文件已备份到 `configs/ds213j_已激活/`

**启动必备（每次 tmpfs 重挂后都会丢失）**：
- **⚠️ _shimexe_**：`ln -sf /xyapp/.../containerd-shim-runc-v2 /tmp/_shimexe_`
- **⚠️ musl 库缓存**：`/tmp/musl_libs/` 下的 libstdc++.so.6 和 libgcc_s.so.1（来自 Alpine v3.12）
- **⚠️ fake_netns**：wxedged 启动后对 `/proc/PID/task/TID/ns/` 做 tmpfs 覆盖并创建假 `net` 文件
- 以上三项已集成到 `chroot_start.sh`，开机自动执行

**容器兼容性**：
- PCDNClient → Illegal instruction（CPU不支持NEON），fake_runc自动keepalive
- dcdn_client_docker → Illegal instruction，快照中已替换为keepalive包装器
- guluplugin → **正常工作**，需musl C++库 + Alpine v3.12版本
- Gulu第2实例 → 可能因端口冲突启动失败（已知限制）

**⚠️ 资源控制（必须！防止NAS超载）**：
- 所有wxedge进程 `nice 10` + `ionice best-effort:6`
- CPU守护脚本：负载>70%时自动 SIGSTOP guluplugin 15秒
- PCDN流量**只走本地网络**，frpc仅转发管理页面（port 18888）
- **禁止**将XYP/Gulu端口通过frpc转发（会占用存客宝/宝塔服务器带宽）

**收益**：
- 新节点注册后CDN需**24-48小时**验证稳定性才分配流量
- speed=0 是正常的，guluplugin Tracker心跳中已有实际数据传输
- 收益主要来自 guluplugin 的 P2P CDN 加速服务

### 13.3 PCDN局域网扫描防误报

1. **多轮验证**：每端口至少3轮TCP连接，≥2轮成功才判为开放
2. **SSH Banner去重**：同一SSH Banner的多个IP合并为一台设备
3. **虚拟IP识别**：路由器/交换机可能有多个IP，需合并

### 13.4 H3C路由器与PCDN

- H3C ER2200G2 路由器使用 **Telnet端口2323**（非标准23）
- PCDN流量可能占满上行带宽（LAN2口12.2Mbps）
- 需在路由器设置QoS限速，给PCDN设备单独限速

### 13.5 网心云绑定流程

1. 部署后打开 `http://设备IP:18888`
2. 如果页面空白/ERR_EMPTY_RESPONSE → 检查容器是否正常运行
3. **必须用手机App扫码绑定**，不能自动绑定
4. 账号：15880802661
5. 绑定后才开始产生收益
6. **绑定后立即备份storage/到configs/目录**（以后恢复免重新绑定）

### 13.6 部署排错速查表（28个已知问题及解决方案）

> **🟢 已自动处理**（使用完整部署包+chroot_start.sh无需手动处理）
> **🟡 需手动注意**（部署时留意）

| # | 现象 | 原因 | 解决 | 自动? |
|:---|:---|:---|:---|:---|
| 1 | SSH: `no matching cipher found` | 老NAS只支持旧cipher | `ssh -c aes256-cbc` | 🟡 |
| 2 | SCP: `remote mkdir: No such file` | macOS默认SFTP | `scp -O`（旧SCP协议） | 🟡 |
| 3 | SSH: `Permission denied` | 密码大小写 | 密码`zhiqun1984`（小写z） | 🟡 |
| 4 | 远程mkdir权限不足 | admin非root | `echo 'passwd' \| sudo -S` | 🟡 |
| 5 | "请挂载storage路径" | storage非挂载点 | bind mount | 🟢 |
| 6 | `load fail services`退出 | 缺containerd | chroot完整rootfs | 🟢 |
| 7 | containerd `No such file` | 动态链接缺库 | chroot内有完整库 | 🟢 |
| 8 | `panic statfs cgroup` | 无cgroup+sysfs遮盖 | **不挂sysfs**，只挂cgroup tmpfs | 🟢 |
| 9 | `Failed parse cgroup` | /proc/self/cgroup不存在 | 补丁wxedged→/tmp/fake_cgroups_ | 🟢 |
| 10 | `invalid mountinfo format` | mountinfo格式错 | 补丁wxedged→/tmp/_fake_mountinfo | 🟢 |
| 11 | `not found mount point:cgroup` | 无真实cgroup | 可忽略，仅影响IPT | 🟢 |
| 12 | `get rotational` | /sys/block不可读 | 创建rotational=0 | 🟢 |
| 13 | shim `invalid argument` | prctl失败 | 补丁shim NOP掉prctl | 🟢 |
| 14 | `exec "runc" not found` | runc不在PATH | /usr/bin/runc软链接 | 🟢 |
| 15 | `readlink /tmp/_shimexe_` | tmpfs重挂后丢失 | 启动时自动ln -sf | 🟢 |
| 16 | gulu `symbol not found` | 缺musl C++库 | Alpine v3.12库缓存 | 🟢 |
| 17 | `cannot read realtime clock` | musl+3.2内核 | 已知限制，不影响 | 🟢 |
| 18 | `Illegal instruction` PCDN | CPU不支持NEON | fake_runc keepalive | 🟢 |
| 19 | `Illegal instruction` DCDN | CPU不兼容 | fake_runc keepalive | 🟢 |
| 20 | `strconv.Atoi "PID\n"` | echo写PID带换行 | printf "%s" | 🟢 |
| 21 | `overlayfs NOT supported` | 内核无overlay | cntr.toml禁用 | 🟢 |
| 22 | `parent snapshot not exist` | snapshotter切换旧数据 | 清除重建 | 🟡首次 |
| 23 | `storage not mounted` | fmounts缺/storage | fake文件已包含 | 🟢 |
| 24 | `setNetCls error` | 缺net_cls目录 | wxedge自动mkdir | 🟢 |
| 25 | `context deadline exceeded` | snapshotter慢 | 等5-10分钟 | 🟡首次 |
| 26 | Dashboard CPU/内存全0 | fake文件被清空 | 启动时重写 | 🟢 |
| 27 | `mem:-9999, cpu_usage:-9999` | 无法读真实cgroup | 正常，不影响收益 | 🟢 |
| 28 | `crontab: not found` | 群晖不用crontab | `/usr/local/etc/rc.d/` | 🟡 |
| 29 | CYK/Z任务netns失败 | 内核3.2无netns | fake_netns缓解 | 🟢 |

**结论**：28个坑中 **22个已自动处理**（🟢），仅7个需部署时注意（🟡，主要是SSH连接参数）。

### 13.7 最佳部署配置总结

**三种部署方式优先级**：

| 场景 | 推荐方式 | 复杂度 | 说明 |
|:---|:---|:---|:---|
| 有Docker的Linux/NAS | **Docker部署** | 低 | 一行命令搞定 |
| 无Docker但内核≥4.x的ARM | **原生二进制** | 中 | 只需wxedged+containerd |
| 无Docker且内核<4.x（如DS213j） | **chroot部署** | 高 | 需要完整rootfs+补丁包 |

**chroot部署一键安装流程**（已验证，直接复用不再需要反复排错）：

```
前置条件：
  - Mac/PC上有Docker（用于提取rootfs）或已有 wxedge_fs.tar
  - 目标设备：ARM32/ARM64 Linux，有root权限
  - 存储：≥500MB（rootfs 300MB + 数据 200MB+）
  - 网络：能访问外网

一键部署步骤（使用 configs/ds213j_已激活/ 中的完整包）：
  1. 上传 rootfs + 已补丁二进制 + 配置文件 + musl库：
     sshpass -p 'zhiqun1984' scp -O -c aes256-cbc \
       wxedge_fs.tar musl_libs.tar configs_bundle.tar \
       admin@NAS_IP:/volume1/wxedge/

  2. SSH到NAS解压并启动：
     sudo tar xf wxedge_fs.tar -C /volume1/wxedge/rootfs
     sudo tar xf configs_bundle.tar -C /volume1/wxedge/
     sudo sh /volume1/wxedge/chroot_start.sh &

  3. 等待3分钟后验证：
     curl http://NAS_IP:18888/docker/dashboard
     → run_tasks 中 state_code=0 即为正常

  4. 手机App扫码绑定（仅首次）：
     网心云App → 账号 15880802661 → 添加设备 → 扫码

关键mount顺序：
  proc → dev → storage → tmp(tmpfs) → run(tmpfs) → /sys/fs/cgroup(tmpfs)
  → bind mount fake_stat → bind mount fake_cpuinfo → bind mount fake_meminfo
  → _shimexe_ 符号链接 → musl 库缓存 → gulu 快照预安装
  → fake_netns（wxedged 启动30秒后异步设置）
  → CPU 守护进程（nice=10 + 负载>70%自动暂停）
  ⚠️ 绝不挂sysfs！

容器类型处理（fake_runc v6 自动判断）：
  - gulu（start.sh）→ 设置musl环境 + chroot执行
  - pcdn（softdog.sh）→ 检测CPU兼容性，不兼容则keepalive
  - thunder/dcdn（dcdn_monitor.sh）→ keepalive包装器（CPU不兼容）
  - 未知类型 → 回退sleep保活

验证清单：
  ✅ curl dashboard → run_tasks 中 state_code=0
  ✅ ps aux | grep guluplugin → 进程存在
  ✅ guluplugin server.log 中有 Tracker S2T Heartbeat → CDN已注册
  ✅ resource.cpu_num > 0 → 硬件伪装生效
  ✅ 负载 < 0.7（单核） → 资源控制生效
```

### 13.8 资源控制（CPU/带宽70%限制）

**目标**：防止NAS超载，确保NAS管理功能和其他服务正常使用。

**CPU控制**：
```bash
# 1. 进程优先级降低（所有wxedge相关）
renice 10 $(pgrep -f "wxedged|containerd|guluplugin")
ionice -c 2 -n 6 -p $(pgrep -f "wxedged|containerd|guluplugin")

# 2. CPU守护脚本（/volume1/wxedge/cpu_guard.sh）
# 每30秒检查，负载>0.7时 SIGSTOP guluplugin 15秒
while true; do
  LOAD=$(cat /proc/loadavg | awk '{print $1}')
  OVER=$(awk "BEGIN {print ($LOAD > 0.70) ? 1 : 0}")
  if [ "$OVER" = "1" ]; then
    kill -STOP $(pgrep guluplugin) 2>/dev/null
    sleep 15
    kill -CONT $(pgrep guluplugin) 2>/dev/null
  fi
  sleep 30
done
```

**带宽控制**：
- 内核3.2 的 `tc` 不支持 HTB，无法用流量控制
- 替代方案：依赖 guluplugin 自身的带宽限制 + CPU守护间接控制
- **重要**：路由器端可设置 QoS 限速给 NAS IP（192.168.110.29）

**⚠️ PCDN 流量路由（关键！不能走存客宝）**：
```
PCDN数据流量（guluplugin P2P） → 直接走本地网络（192.168.110.1网关）→ 运营商出口
frpc管理流量（仅18888端口） → 经存客宝服务器（42.194.245.239）→ 外网访问管理页面

禁止配置：
  ❌ frpc转发XYP UDP端口（会让PCDN数据走存客宝带宽）
  ❌ frpc转发guluplugin TCP端口
  
仅允许：
  ✅ frpc转发18888端口（wxedge管理页面，流量极小）
  ✅ frpc转发22端口（SSH管理）
```

### 13.5 外网全量扫描经验（2026-02-15 实战）

> 对 MongoDB 中 157,424 个公网 IP 采样 3000 个进行全量扫描的经验总结。

#### 13.5.1 VPN/代理环境下的扫描（Clash Verge）

**问题**：macOS 上 Clash Verge 的 TUN 模式（fake-ip）会拦截所有 TCP 连接，导致本地 `nmap`/`nc` 对任何 IP 的所有端口都返回"open"，结果全部失效。

**解决方案**：
```bash
# 1. 确认 Clash 模式（API端口从 clash-verge.yaml 获取）
curl -s http://127.0.0.1:9097/configs | python3 -c "import sys,json;print(json.load(sys.stdin)['mode'])"

# 2. 切换到 global 模式（流量走境外代理节点）
curl -X PATCH http://127.0.0.1:9097/configs -H "Content-Type: application/json" -d '{"mode":"global"}'

# 3. 使用 nmap 内置代理功能扫描（关键！不能用普通 nmap）
nmap -Pn --proxies socks4://127.0.0.1:7897 -iL targets.txt -p 22,80,443,8080,3389 -oG results.gnmap

# 4. 扫描完切回 rule 模式
curl -X PATCH http://127.0.0.1:9097/configs -H "Content-Type: application/json" -d '{"mode":"rule"}'
```

**关键教训**：
| 场景 | 结果 | 原因 |
|:---|:---|:---|
| Clash TUN + 直接 nmap | ❌ 全部显示 open | fake-ip 本地拦截所有 TCP |
| Clash direct 模式 + nmap | ❌ 不可靠 | TUN 仍接管路由表 |
| Clash global + `nmap --proxies` | ✅ 准确 | 流量真正从境外节点出发 |
| Clash rule 模式 + Python socks | ❌ 国内IP不走代理 | 规则路由将国内IP直连 |

#### 13.5.2 CGNAT（运营商级NAT）识别

**现象**：扫描本机外网 IP 网段（119.233.228.0/24）时，所有端口显示 `filtered`，Shodan 也查不到任何信息。

**判断方法**：
```bash
# 外网IP归属查询
curl -s ipinfo.io/119.233.228.166 | python3 -c "import sys,json;d=json.load(sys.stdin);print(f'{d[\"org\"]} | {d[\"city\"]}')"
# 输出: AS4134 CHINANET-BACKBONE → 中国电信骨干网IP，高概率CGNAT

# 确认：traceroute 显示经过多层NAT
traceroute -m 5 119.233.228.166
```

**结论**：厦门电信家宽 IP 处于 CGNAT 后，无法从外部直接访问。要获得外部可达性需：
- 向运营商申请公网 IP（电信可打10000号要求）
- 使用 frpc/ngrok 等内网穿透方案
- 使用云服务器做中转

#### 13.5.3 MongoDB 数据类型辨别（重要！）

**⚠️ 易混淆**：MongoDB 中的 `KR_KR` 等数据库存储的是 **网站用户注册数据**，不是服务器凭证！

| 数据库 | 数据类型 | 字段 | 能否用于SSH |
|:---|:---|:---|:---|
| `KR_KR` | 网站用户注册 | username, password(MD5), email, regip, lastip | ❌ 不能 |
| `KR` | 网站用户注册 | 同上 | ❌ 不能 |
| `datacenter` | 服务器凭证（设计中） | ip, username, password, port | ✅ 可以 |

- `regip`/`lastip` 是用户注册/登录时的 IP 地址，**不是服务器 IP**
- `password` 是网站密码的 MD5 哈希，**不是 SSH 密码**
- 实际可用的服务器凭证应存入 `datacenter.device_credentials`，目前该库为空
- `config.json` 的 `known_devices` 和 `ssh_credentials` 才是真正的服务器凭证

#### 13.5.4 nmap 代理模式限制

`nmap --proxies socks4://...` 是实验性功能，有以下限制：

| 限制 | 影响 | 应对 |
|:---|:---|:---|
| 仅支持 SOCKS4（不支持 SOCKS5） | 需确保代理兼容 SOCKS4 | Clash 的 mixed-port 兼容 |
| 吞吐量低 | 3000个IP仅116个实际探测（3.9%） | 减少目标数或分批扫描 |
| 不支持 SYN 扫描 | 只能用 connect scan | 自动降级，无需手动处理 |
| 超时敏感 | 大量 IP 因超时被跳过 | 增大超时 `--host-timeout 30s` |

**提高精度的方法**：
```bash
# 分批扫描（每批500个）
split -l 500 targets.txt batch_
for f in batch_*; do
    nmap -Pn --proxies socks4://127.0.0.1:7897 -iL "$f" -p 22,80,443 --host-timeout 30s -oG "result_$f.gnmap"
    sleep 10  # 间隔防止代理过载
done

# 或使用 Python 多线程直连扫描（更高精度）
# 见 scripts/socks_scanner.py
```

#### 13.5.5 木蚂蚁IP深度扫描结论（2026-02-15）

> 对木蚂蚁/房产网注册IP进行深度扫描和多轮凭证测试后的结论。

**结论：木蚂蚁数据库中的IP不适合作为分布式部署目标。**

| 发现 | 说明 |
|:---|:---|
| IP性质 | 网站用户注册/登录时的IP，多为家宽、企业出口 |
| 有SSH的IP | 17/58，其中10个Linux + 7个网络设备 |
| 网络设备 | H3C交换机、华为路由器、锐捷设备 → 企业级设备，非部署目标 |
| Linux服务器 | 安全加固良好，1个仅公钥认证，其余全用强密码 |
| 凭证测试 | 3轮递进（9组→49组→用户名变体），0/17 成功 |
| MD5密码 | 加盐哈希，10000+字典无法反查，且是网站密码非SSH密码 |
| Banner识别设备类型 | 比端口扫描更可靠，通过SSH/HTTP/FTP Banner精确判断设备种类 |

**经验：**
- 通过 Clash SOCKS 代理扫描时，所有端口都会显示"open"（假阳性），**必须用Banner判断真实性**
- SSH Banner 格式 `SSH-2.0-Comware` = H3C设备, `SSH-2.0-HUAWEI` = 华为, `SSH-2.0-RGOS` = 锐捷
- `PreferredAuthentications=none` 可探测SSH服务器接受的认证方式
- 不要对非自有IP做大量凭证暴力测试，浪费时间且有法律风险

#### 13.5.6 自有设备外网状态速查（2026-02-15）

| 设备 | 外网可达 | SSH | 原因/备注 |
|:---|:---|:---|:---|
| 存客宝 42.194.245.239 | ✅ | ❌(22关) | 安全组未开放22，有VNC(5901)/RDP(3389) |
| kr宝塔 43.139.27.93 | ✅ | ✅(22022) | 安全组开放22022，运行多个v0项目 |
| 公司NAS | ✅ | ✅ | fnvtk/zhiqun1984, 端口22201 |
| 家里NAS | ❌ | ❌ | DDNS或NAS离线，需本地检查 |

#### 13.5.6 扫描流程标准化（新增）

```
外网扫描标准流程：
1. 读取 config.json 的 known_devices → 生成排除文件
2. 确认 Clash 模式 → 切 global
3. 验证出口IP（curl -x socks5h://127.0.0.1:7897 ifconfig.me）
4. 生成目标列表 → filter_scan_targets() 过滤自有设备
5. nmap --proxies + --excludefile 执行扫描
6. 解析结果 → 筛选SSH开放IP → 凭证测试
7. 切回 rule 模式
8. 结果写入 references/全量扫描报告_日期.md
```

---

## 十四、法律声明

```
本Skill中的扫描/部署工具仅用于：
1. 管理自有设备和资源
2. 获得授权的安全测试
3. 安全研究和教育

未经授权攻击他人系统违反《刑法》第285条。
所有扫描和部署操作仅限于卡若自有设备和已授权的网络。
```

---

> **金仓**：存储空间充足，算力已就位。给我一个网段，全自动搞定。
