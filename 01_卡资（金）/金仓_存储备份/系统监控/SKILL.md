---
name: 系统监控
description: CPU/内存/磁盘实时监控与进程管理
triggers: 系统状态、CPU占用、内存使用、杀进程、端口占用
owner: 金仓
group: 金
version: "1.0"
updated: "2026-02-16"
---

# 系统监控

监控和诊断卡若 MacBook Pro (Apple Silicon) 的系统状态。

## 快速诊断流程

```
┌──────────────────────────────────────────────────────────────┐
│                      系统诊断工作流                           │
├──────────────────────────────────────────────────────────────┤
│  1. 系统概览     2. 定位问题     3. 处理      4. 验证        │
│       │              │             │            │            │
│       ▼              ▼             ▼            ▼            │
│    top/htop      ps aux排序     kill/重启   再次检查        │
│   memory_pressure  lsof端口                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 1. 系统概览

### 快速状态检查

```bash
# CPU和内存快照
top -l 1 | head -12

# 内存压力（最重要指标）
memory_pressure

# 磁盘使用
df -h /System/Volumes/Data

# 系统运行时间
uptime
```

### 详细资源监控

```bash
# 交互式监控（推荐 htop）
htop   # brew install htop

# 或使用原生 top
top -o cpu  # 按 CPU 排序
top -o mem  # 按内存排序

# 内存详情
vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages\s+(\w+)[:\s]+(\d+)/ and printf("%-16s % 8.2f MB\n", "$1:", $2 * $size / 1048576);'
```

---

## 2. 进程监控

### CPU 和内存 TOP10

```bash
# CPU 占用 TOP10
ps aux | sort -nrk 3 | head -10

# 内存占用 TOP10
ps aux | sort -nrk 4 | head -10

# 格式化输出
ps aux --sort=-%cpu | awk 'NR<=11 {printf "%-10s %-6s %-6s %s\n", $1, $3"%", $4"%", $11}'
```

### 查找特定进程

```bash
# 按名称查找
ps aux | grep -i <进程名>

# 查看进程树
pstree -p <PID>

# 查看进程详情
ps -p <PID> -o pid,ppid,user,%cpu,%mem,start,time,command
```

---

## 3. 端口管理

### 查看端口占用

```bash
# 查看指定端口
lsof -i :<端口号>

# 常用开发端口
lsof -i :3000    # React/Next.js
lsof -i :5173    # Vite
lsof -i :8080    # 通用后端
lsof -i :8000    # Django
lsof -i :4000    # Phoenix
lsof -i :27017   # MongoDB
lsof -i :3306    # MySQL
lsof -i :6379    # Redis
lsof -i :5432    # PostgreSQL

# 查看所有监听端口
netstat -an | grep LISTEN
# 或
lsof -iTCP -sTCP:LISTEN -n -P
```

### 杀死占用端口的进程

```bash
# 方法1：直接杀死
kill $(lsof -t -i:<端口号>)

# 方法2：强制杀死
kill -9 $(lsof -t -i:<端口号>)

# 方法3：查看后再杀
lsof -i :3000  # 先查看 PID
kill -9 <PID>
```

---

## 4. 进程管理

### 结束进程

```bash
# 温柔关闭（发送 SIGTERM）
kill <PID>

# 强制终止（发送 SIGKILL）
kill -9 <PID>

# 按名称杀死
pkill -f <进程名>

# 杀死所有同名进程
killall <进程名>
```

### 批量清理

```bash
# 杀死所有 node 进程
pkill -f node

# 杀死所有 python 进程
pkill -f python

# 杀死所有僵尸进程
ps aux | grep 'Z' | awk '{print $2}' | xargs kill -9 2>/dev/null
```

---

## 5. 常用服务重启

### 系统服务

```bash
# Finder（文件管理器卡住）
killall Finder

# Dock（任务栏卡住）
killall Dock

# 菜单栏（状态栏图标异常）
killall SystemUIServer

# 控制中心
killall ControlCenter

# Spotlight（搜索异常）
sudo mdutil -E /
```

### iCloud 服务

```bash
# 重启 iCloud 同步
killall bird && killall cloudd

# 强制刷新
defaults write com.apple.bird DisableUpload -bool false
killall bird cloudd
```

### 开发服务

```bash
# 重启 Docker Desktop
osascript -e 'quit app "Docker"'
sleep 2
open -a Docker

# 重启 MongoDB
brew services restart mongodb-community

# 重启 MySQL
brew services restart mysql

# 重启 Redis
brew services restart redis
```

---

## 6. Docker 管理

### 状态检查

```bash
# 容器状态
docker ps -a

# 磁盘占用
docker system df

# 镜像列表
docker images
```

### 清理

```bash
# 清理停止的容器
docker container prune -f

# 清理无用镜像
docker image prune -a -f

# 清理所有（慎用）
docker system prune -a --volumes -f

# 清理构建缓存
docker builder prune -a -f
```

---

## 7. 网络诊断

### 基础检查

```bash
# 网络质量测试
networkQuality

# DNS 查询
nslookup <域名>
dig <域名>

# 路由追踪
traceroute <域名>

# 网络接口信息
ifconfig en0
```

### 连接测试

```bash
# 测试端口连通性
nc -zv <IP> <端口>

# HTTP 请求测试
curl -I https://www.baidu.com

# 查看外网 IP
curl ip.sb
```

### DNS 刷新

```bash
# 刷新 DNS 缓存
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
echo "DNS 缓存已刷新"
```

### Cursor 上传占用降低

已在 `~/Library/Application Support/Cursor/User/settings.json` 中建议或已配置：

- `"redhat.telemetry.enabled": false` — 关闭 Red Hat 扩展遥测上传
- `"telemetry.telemetryLevel": "off"` — 关闭 IDE 遥测
- `"cursor.general.enableCodebaseIndexing": false` — 关闭代码库索引（避免整库分块上传）

**需在 Cursor 内手动操作（进一步降上传）：**

1. **开启 Privacy Mode**：`Cursor` → `Settings` → `General` → 打开 **Privacy Mode**（代码不存 Cursor/第三方，部分 AI 能力会受限）
2. **少 @ 大文件**：对话里少引用整文件，只 @ 必要片段，可明显减少单次请求上传量
3. **不用时关扩展**：禁用暂时不用的扩展，减少后台同步与遥测

---

## 8. 性能基准

### 正常指标

| 指标 | 正常 | 警告 | 危险 |
|------|------|------|------|
| CPU | <50% | 50-80% | >80%持续 |
| 内存压力 | 正常(normal) | 警告(warn) | 严重(critical) |
| 磁盘可用 | >100GB | 50-100GB | <50GB |
| 交换内存 | <2GB | 2-8GB | >8GB |

### 性能测试

```bash
# CPU 压力测试
yes > /dev/null &  # 创建负载
# 按 Ctrl+C 停止，然后 kill %1

# 内存测试
memory_pressure

# 磁盘 I/O 测试
dd if=/dev/zero of=/tmp/testfile bs=1m count=1024
rm /tmp/testfile
```

---

## 9. 一键诊断脚本

```bash
#!/bin/bash
# 系统快速诊断

echo "=========================================="
echo "🖥️  系统诊断报告 - $(date)"
echo "=========================================="
echo ""

# 1. 系统信息
echo "📊 系统信息"
echo "-------------------------------------------"
sw_vers
echo ""

# 2. 运行时间和负载
echo "⏱️  运行时间和负载"
echo "-------------------------------------------"
uptime
echo ""

# 3. 内存压力
echo "🧠 内存压力"
echo "-------------------------------------------"
memory_pressure
echo ""

# 4. 磁盘空间
echo "💾 磁盘空间"
echo "-------------------------------------------"
df -h /System/Volumes/Data
echo ""

# 5. CPU TOP5
echo "🔥 CPU 占用 TOP5"
echo "-------------------------------------------"
ps aux | sort -nrk 3 | head -6 | awk '{printf "%-10s %6s%% %s\n", $1, $3, $11}'
echo ""

# 6. 内存 TOP5
echo "📦 内存占用 TOP5"
echo "-------------------------------------------"
ps aux | sort -nrk 4 | head -6 | awk '{printf "%-10s %6s%% %s\n", $1, $4, $11}'
echo ""

# 7. 监听端口
echo "🌐 监听端口"
echo "-------------------------------------------"
lsof -iTCP -sTCP:LISTEN -n -P | awk 'NR>1 {print $1, $9}' | sort -u | head -10
echo ""

echo "=========================================="
echo "✅ 诊断完成"
echo "=========================================="
```

---

## 10. 常见问题处理

| 问题 | 快速解决 |
|------|----------|
| 电脑很卡 | `memory_pressure` 检查内存，关闭高占用应用 |
| 端口被占用 | `lsof -i :端口号` 查看，`kill -9` 杀死 |
| Finder 无响应 | `killall Finder` |
| Docker 异常 | 重启 Docker Desktop 或 `docker system prune` |
| 网络异常 | 刷新 DNS：`sudo dscacheutil -flushcache` |
| Cursor 上传大 | 关遥测/关代码库索引见上文「Cursor 上传占用降低」；可开 Privacy Mode |
| iCloud 不同步 | `killall bird && killall cloudd` |
| Spotlight 搜索慢 | `sudo mdutil -E /` 重建索引 |

---

## 推荐工具

| 工具 | 说明 | 安装 |
|------|------|------|
| htop | 交互式进程监控 | `brew install htop` |
| btop | 更漂亮的系统监控 | `brew install btop` |
| ncdu | 交互式磁盘分析 | `brew install ncdu` |
| duf | 现代化 df | `brew install duf` |
| bandwhich | 网络带宽监控 | `brew install bandwhich` |
