# 群晖NAS管理 - 快速开始

> 卡若私域数字底座的NAS矩阵统一管理工具

## 🚀 快速测试连接

```bash
cd /Users/karuo/Documents/个人/卡若AI/01_系统管理/群晖NAS管理/scripts
./quick_connect_test.sh
```

这个脚本会自动测试：
- ✅ 网络连通性
- ✅ SSH连接
- ✅ 关键服务端口（DSM/MongoDB/Qdrant等）
- ✅ Docker容器状态

---

## 📋 NAS基本信息

| 项目 | 配置 |
|------|------|
| **IP地址** | 192.168.1.201 |
| **主账户** | fnvtk / zhiqun1984 |
| **DSM管理** | http://192.168.1.201:5000 |
| **QuickConnect** | https://udbfnvtk.quickconnect.cn |
| **型号** | Synology DS1825+ (8盘位) |
| **存储** | 21TB 可用 (BTRFS) |

---

## 🛠️ 常用脚本

### 1. 快速连接测试
```bash
./scripts/quick_connect_test.sh
```
**功能**：验证NAS连接和服务可用性

### 2. NAS状态检查
```bash
./scripts/nas_status.sh
```
**功能**：
- 系统负载和运行时间
- 内存使用情况
- 磁盘空间
- Docker容器状态
- 服务端口检查

### 3. Docker容器列表
```bash
./scripts/docker_list.sh
```
**功能**：
- 列出所有容器
- 显示运行状态
- 显示端口映射
- 统计运行中/停止的容器数量

### 4. MongoDB连接信息
```bash
python3 ./scripts/get_mongodb_info.py
```
**功能**：
- 自动查找MongoDB容器
- 提取用户名和密码
- 生成连接字符串
- 提供Python连接示例

### 5. DSM API演示
```bash
python3 ./scripts/synology_api_demo.py
```
**功能**：
- DSM官方API使用演示
- 系统信息获取
- 文件管理操作
- synology-api库示例

---

## 🔌 SSH快速连接

### 方式1: 使用别名（推荐）

添加到 `~/.ssh/config`：

```bash
Host nas nas2
    HostName 192.168.1.201
    User fnvtk
    KexAlgorithms +diffie-hellman-group1-sha1
    Ciphers +aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc
    StrictHostKeyChecking no
```

然后直接连接：
```bash
ssh nas
```

### 方式2: sshpass自动登录

```bash
sshpass -p 'zhiqun1984' ssh -o KexAlgorithms=+diffie-hellman-group1-sha1 \
    -o Ciphers=+aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc \
    fnvtk@192.168.1.201
```

### 方式3: 完整命令

```bash
ssh -o KexAlgorithms=+diffie-hellman-group1-sha1 \
    -o Ciphers=+aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc \
    fnvtk@192.168.1.201
# 然后输入密码: zhiqun1984
```

---

## 🗄️ MongoDB快速连接

### Python连接

```python
from pymongo import MongoClient

client = MongoClient("mongodb://admin:admin123@192.168.1.201:27017/")
print(client.list_database_names())
```

### MongoDB Compass（GUI工具）

连接字符串：
```
mongodb://admin:admin123@192.168.1.201:27017/
```

### mongosh命令行

```bash
mongosh "mongodb://admin:admin123@192.168.1.201:27017/"
```

---

## 🐳 Docker常用命令

```bash
# Docker命令路径
DOCKER="/volume1/@appstore/ContainerManager/usr/bin/docker"

# 查看所有容器
ssh nas "$DOCKER ps -a"

# 查看容器日志
ssh nas "$DOCKER logs -f --tail 100 <容器名>"

# 重启容器
ssh nas "$DOCKER restart <容器名>"

# 进入容器
ssh nas "$DOCKER exec -it <容器名> bash"

# 查看容器资源占用
ssh nas "$DOCKER stats --no-stream"
```

---

## 🔧 Cursor集成

### 触发Skill

在Cursor中输入以下任一关键词即可触发此Skill：
- `NAS管理`
- `群晖管理`
- `Synology`
- `NAS状态`
- `Docker容器`
- `MongoDB连接`

### Skill位置

```
/Users/karuo/Documents/个人/卡若AI/01_系统管理/群晖NAS管理/SKILL.md
```

### 在Cursor中使用

```
@群晖NAS管理 帮我查看NAS状态
@群晖NAS管理 获取MongoDB连接信息
@群晖NAS管理 列出所有Docker容器
```

---

## 📦 依赖安装

### macOS

```bash
# sshpass（SSH自动登录）
brew install hudochenkov/sshpass/sshpass

# MongoDB客户端（可选）
brew install mongosh

# Python MongoDB库（可选）
pip3 install pymongo

# Synology API库（可选）
pip3 install synology-api
```

---

## ⚠️ 常见问题

### Q1: SSH连接被拒绝

**错误**: `no matching key exchange method found`

**原因**: 群晖使用旧版SSH算法

**解决**: 添加兼容参数
```bash
-o KexAlgorithms=+diffie-hellman-group1-sha1
-o Ciphers=+aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc
```

### Q2: sshpass command not found

**安装**:
```bash
brew install hudochenkov/sshpass/sshpass
```

### Q3: Docker命令找不到

**原因**: 群晖Docker不在PATH中

**解决**: 使用绝对路径
```bash
/volume1/@appstore/ContainerManager/usr/bin/docker
```

### Q4: MongoDB连接超时

**检查步骤**:
1. 检查容器状态: `ssh nas "docker ps | grep mongo"`
2. 重启容器: `ssh nas "docker restart mongodb"`
3. 查看日志: `ssh nas "docker logs mongodb"`
4. 检查端口: `nc -zv 192.168.1.201 27017`

---

## 📚 完整文档

详细的使用说明请查看：

```
/Users/karuo/Documents/个人/卡若AI/01_系统管理/群晖NAS管理/SKILL.md
```

或访问DSM管理界面：http://192.168.1.201:5000

---

## 📞 技术支持

- **开发者**: 卡若
- **微信**: 28533368
- **电话**: 15880802661
- **项目路径**: `/Users/karuo/Documents/个人/卡若AI/01_系统管理/群晖NAS管理/`

---

## 🔄 最近更新

**2026-01-21**:
- ✅ 更新所有脚本密码为小写 `zhiqun1984`
- ✅ 优化MongoDB连接检查流程
- ✅ 添加快速连接测试脚本
- ✅ 增强SKILL.md文档
- ✅ 统一IP配置为 192.168.1.201
- ✅ 完善Cursor集成说明
