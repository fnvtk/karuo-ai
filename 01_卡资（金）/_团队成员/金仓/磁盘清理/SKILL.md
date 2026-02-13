---
name: 磁盘清理
description: Mac 磁盘空间管理和清理。触发词：清理磁盘、释放空间、清理缓存、清空回收站、磁盘占用、大文件、磁盘满了、空间不足。包含安全清理脚本、大文件定位、应用缓存清理、开发环境清理。
---

# 磁盘清理

为卡若的 MacBook Pro (Apple Silicon) 提供专业磁盘清理服务。

## 系统信息

- **系统盘**: 926GB，保持 100GB+ 可用
- **外置盘**: J_CENA_X64F，1TB FAT32

## 清理流程

```
┌──────────────────────────────────────────────────────────────┐
│                      磁盘清理工作流                           │
├──────────────────────────────────────────────────────────────┤
│  1. 诊断        2. 定位         3. 清理        4. 验证       │
│     │              │               │              │          │
│     ▼              ▼               ▼              ▼          │
│  df -h         find大文件     按优先级       再次检查        │
│  du分析        TOP10目录      回收站→缓存      df -h         │
└──────────────────────────────────────────────────────────────┘
```

---

## 快速诊断

```bash
# 磁盘总览
df -h /System/Volumes/Data

# 用户目录占用 TOP10
du -d 1 -h ~/ 2>/dev/null | sort -hr | head -10

# 回收站大小
du -sh ~/.Trash

# 系统缓存大小
du -sh ~/Library/Caches

# 开发缓存统计
du -sh ~/.npm ~/.pnpm-store ~/.cache ~/.gradle/caches 2>/dev/null
```

---

## 清理优先级

### 🟢 第1级：回收站（最安全，立即释放）

```bash
# 清空回收站
rm -rf ~/.Trash/*

# 查看释放空间
df -h /System/Volumes/Data
```

### 🟡 第2级：系统和开发缓存

```bash
# 系统缓存
rm -rf ~/Library/Caches/*

# 通用开发缓存
rm -rf ~/.cache/*

# Node.js 缓存
rm -rf ~/.npm/_npx ~/.npm/_logs ~/.npm/_cacache
rm -rf ~/.pnpm-store
rm -rf ~/.yarn/cache

# Python 缓存
find ~/ -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find ~/ -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null
rm -rf ~/.cache/pip

# Java/Gradle 缓存
rm -rf ~/.gradle/caches
rm -rf ~/.m2/repository

# Homebrew 清理
brew cleanup --prune=all
brew autoremove
```

### 🟡 第3级：Xcode 和 iOS 开发

```bash
# Xcode DerivedData（可安全删除）
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Xcode Archives（旧应用归档）
rm -rf ~/Library/Developer/Xcode/Archives/*

# iOS 设备支持文件（保留最新2个版本）
ls -t ~/Library/Developer/Xcode/iOS\ DeviceSupport/ | tail -n +3 | \
    xargs -I {} rm -rf ~/Library/Developer/Xcode/iOS\ DeviceSupport/{}

# 模拟器缓存
xcrun simctl delete unavailable
```

### 🟠 第4级：应用内清理（需手动操作）

| 应用 | 预估大小 | 清理方式 |
|------|----------|----------|
| 微信 | 70GB+ | 设置 → 通用 → 存储空间 → 清理 |
| Docker | 20GB+ | `docker system prune -a --volumes` |
| 飞书 | 15GB+ | 设置 → 存储空间 → 清理缓存 |
| Xmind | 16GB | 检查旧版本文件 |
| VS Code | 5GB+ | 清理扩展缓存 |

```bash
# Docker 深度清理
docker system prune -a --volumes -f
docker builder prune -a -f

# VS Code 扩展缓存
rm -rf ~/.vscode/extensions/.obsolete
```

---

## 大文件定位

```bash
# 100MB以上文件 TOP20
find ~/ -xdev -type f -size +100M 2>/dev/null | head -20

# 1GB以上文件
find ~/ -xdev -type f -size +1G 2>/dev/null

# 按大小排序显示详情
find ~/ -xdev -type f -size +100M -exec ls -lh {} \; 2>/dev/null | \
    sort -k5 -hr | head -20

# 查找重复大文件（相同大小）
find ~/ -type f -size +50M -exec ls -s {} \; 2>/dev/null | \
    sort -n | uniq -d -w10
```

---

## 一键清理脚本

```bash
#!/bin/bash
# 安全清理脚本 - 只清理可恢复内容

echo "🧹 开始安全清理..."
echo "================================"

# 清理前空间
BEFORE=$(df -h /System/Volumes/Data | awk 'NR==2{print $4}')
echo "清理前可用空间: $BEFORE"
echo ""

# 1. 回收站
echo "[1/6] 清空回收站..."
rm -rf ~/.Trash/* 2>/dev/null
echo "✓ 回收站已清空"

# 2. 系统缓存
echo "[2/6] 清理系统缓存..."
rm -rf ~/Library/Caches/* 2>/dev/null
echo "✓ 系统缓存已清理"

# 3. 开发缓存
echo "[3/6] 清理开发缓存..."
rm -rf ~/.npm/_npx ~/.npm/_logs ~/.npm/_cacache 2>/dev/null
rm -rf ~/.cache/* 2>/dev/null
rm -rf ~/.gradle/caches 2>/dev/null
echo "✓ 开发缓存已清理"

# 4. Python 缓存
echo "[4/6] 清理 Python 缓存..."
find ~/ -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find ~/ -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null
echo "✓ Python 缓存已清理"

# 5. Xcode
echo "[5/6] 清理 Xcode..."
rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null
echo "✓ Xcode DerivedData 已清理"

# 6. Homebrew
echo "[6/6] 清理 Homebrew..."
brew cleanup --prune=all 2>/dev/null
brew autoremove 2>/dev/null
echo "✓ Homebrew 已清理"

echo ""
echo "================================"
AFTER=$(df -h /System/Volumes/Data | awk 'NR==2{print $4}')
echo "清理后可用空间: $AFTER"
echo "🎉 清理完成!"
```

---

## 定期维护建议

| 频率 | 任务 |
|------|------|
| 每周 | 清空回收站 |
| 每月 | 清理缓存目录、检查下载文件夹 |
| 每季度 | 清理应用内缓存（微信/飞书等）、Xcode |
| 每年 | 整理照片库、检查大文件 |

---

## 安全原则

| 类型 | 处理方式 |
|------|----------|
| ⛔ 照片图库（117GB） | 通过照片App管理，不直接删除 |
| ⛔ 数据库目录（211GB） | 迁移到外置硬盘而非删除 |
| ⛔ ~/Documents | 绝不自动删除 |
| ⚠️ 删除前 | 必须确认，建议 dry-run |
| ✅ MongoDB日志 | 可安全截断：`> ~/数据库/mongodb/logs/mongod.log` |
| ✅ 缓存文件 | 可安全删除，会自动重建 |

---

## 参考工具

| 工具 | 说明 |
|------|------|
| `ncdu` | 交互式磁盘占用分析：`brew install ncdu && ncdu ~/` |
| `dust` | 现代化 du 替代：`brew install dust && dust ~/` |
| `duf` | 现代化 df 替代：`brew install duf && duf` |
