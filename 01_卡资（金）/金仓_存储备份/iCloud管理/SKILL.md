---
name: iCloud管理
description: iCloud 同步优化和问题修复。触发词：iCloud优化、排除同步、恢复iCloud、同步卡住、iCloud占用、排除node_modules、iCloud下载、nosync。包含排除开发目录、恢复同步、实时监控、批量管理。
group: 金
---

# iCloud 管理

管理卡若 MacBook 的 iCloud 同步，优化开发体验。

## 核心流程

```
┌──────────────────────────────────────────────────────────────┐
│                    iCloud 管理工作流                          │
├──────────────────────────────────────────────────────────────┤
│  1. 检查状态     2. 排除目录     3. 修复问题     4. 监控      │
│       │              │               │              │        │
│       ▼              ▼               ▼              ▼        │
│  brctl status    .nosync方案     重启服务      实时日志      │
│  同步队列        符号链接        清理缓存      下载进度      │
└──────────────────────────────────────────────────────────────┘
```

---

## 1. 状态检查

```bash
# 查看 iCloud 状态
brctl status

# 查看同步队列数量
brctl status | grep -c "needs-upload\|needs-sync-up"

# 实时日志（调试用）
brctl log --wait --shorten | head -50

# 查看 .icloud 占位符数量
find ~/Library/Mobile\ Documents -name "*.icloud" 2>/dev/null | wc -l

# 查看 iCloud 进程
ps aux | grep -E "bird|cloudd"
```

---

## 2. 排除开发目录

### 方案A：.nosync 重命名法（推荐）

原理：将目录改名为 `.nosync` 结尾，iCloud 会自动忽略，然后创建符号链接保持原路径可用。

```bash
# 排除单个 node_modules
mv node_modules node_modules.nosync
ln -s node_modules.nosync node_modules

# 排除 Python 虚拟环境
mv venv venv.nosync
ln -s venv.nosync venv

# 排除 .venv
mv .venv .venv.nosync
ln -s .venv.nosync .venv
```

### 方案B：批量排除所有开发目录

```bash
#!/bin/bash
# 批量排除开发目录脚本

echo "🔄 开始批量排除开发目录..."

# 排除所有 node_modules
find ~/Documents -maxdepth 8 -type d -name "node_modules" ! -type l 2>/dev/null | while read dir; do
    echo "处理: $dir"
    mv "$dir" "${dir}.nosync"
    ln -s "node_modules.nosync" "$dir"
done

# 排除所有 venv
find ~/Documents -maxdepth 8 -type d -name "venv" ! -type l 2>/dev/null | while read dir; do
    echo "处理: $dir"
    mv "$dir" "${dir}.nosync"
    ln -s "venv.nosync" "$dir"
done

# 排除所有 .venv
find ~/Documents -maxdepth 8 -type d -name ".venv" ! -type l 2>/dev/null | while read dir; do
    echo "处理: $dir"
    mv "$dir" "${dir}.nosync"
    ln -s ".venv.nosync" "$dir"
done

# 排除所有 __pycache__
find ~/Documents -maxdepth 10 -type d -name "__pycache__" ! -type l 2>/dev/null | while read dir; do
    mv "$dir" "${dir}.nosync"
    ln -s "__pycache__.nosync" "$dir"
done

echo "✓ 完成!"
```

### 方案C：xattr 标记法（无需改名）

```bash
# 标记单个目录不同步
xattr -w com.apple.fileprovider.ignore 1 node_modules

# 批量标记
find ~/Documents -type d -name "node_modules" -exec xattr -w com.apple.fileprovider.ignore 1 {} \;
find ~/Documents -type d -name "venv" -exec xattr -w com.apple.fileprovider.ignore 1 {} \;
find ~/Documents -type d -name ".venv" -exec xattr -w com.apple.fileprovider.ignore 1 {} \;
find ~/Documents -type d -name ".git" -exec xattr -w com.apple.fileprovider.ignore 1 {} \;
```

### 应排除的目录类型

| 目录 | 说明 | 推荐方式 |
|------|------|----------|
| `node_modules` | npm 依赖 | .nosync |
| `venv` / `.venv` | Python 虚拟环境 | .nosync |
| `__pycache__` | Python 缓存 | .nosync |
| `.git` | Git 仓库 | xattr（保留同步） |
| `build` / `dist` | 构建产物 | .nosync |
| `.gradle` | Gradle 缓存 | .nosync |
| `Pods` | iOS CocoaPods | .nosync |

---

## 3. 修复同步问题

### 重启 iCloud 服务

```bash
# 基础重启
killall bird
killall cloudd

# 等待服务自动恢复（约3秒）
sleep 3
brctl status | head -5
```

### 深度修复

```bash
# 清理 iCloud 缓存后重启（更彻底）
rm -rf ~/Library/Application\ Support/CloudDocs/session/containers
killall bird && killall cloudd
sleep 3
echo "✓ iCloud 服务已重置"
```

### 恢复上传和下载功能

```bash
#!/bin/bash
# 恢复 iCloud 完整同步功能

echo "🔄 恢复 iCloud 上传和下载功能..."
echo "=========================================="

# 恢复上传功能
defaults write com.apple.bird DisableUpload -bool false
echo "✓ 上传功能已启用"

# 重启 iCloud 进程
killall bird cloudd 2>/dev/null
sleep 3
echo "✓ iCloud 进程已重启"

# 检查状态
SYNC_COUNT=$(brctl status 2>&1 | grep -c "needs-sync")
echo "当前待同步文件: $SYNC_COUNT 个"

echo "=========================================="
echo "✓ 恢复完成!"
```

### 暂停/恢复同步

```bash
# 暂停上传（保留下载）
defaults write com.apple.bird DisableUpload -bool true
killall bird cloudd

# 恢复完整同步
defaults write com.apple.bird DisableUpload -bool false
killall bird cloudd
```

---

## 4. 下载管理

### 强制下载文件

```bash
# 下载指定文件
brctl download <文件路径>

# 下载整个目录
brctl download ~/Library/Mobile\ Documents/com~apple~CloudDocs/

# 查看下载状态
brctl status | grep downloading
```

### 实时下载监控脚本

```bash
#!/bin/bash
# iCloud 下载实时监控

ICLOUD_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs"
START_SIZE=$(du -sk "$ICLOUD_DIR" 2>/dev/null | cut -f1)
LAST_SIZE=$START_SIZE

echo "📥 iCloud 下载监控已启动"
echo "按 Ctrl+C 停止"
echo ""

while true; do
    sleep 5
    CURRENT_SIZE=$(du -sk "$ICLOUD_DIR" 2>/dev/null | cut -f1)
    CHANGE_KB=$((CURRENT_SIZE - LAST_SIZE))
    TOTAL_KB=$((CURRENT_SIZE - START_SIZE))
    
    CURRENT_GB=$(awk "BEGIN {printf \"%.2f\", $CURRENT_SIZE / 1024 / 1024}")
    SPEED_MB=$(awk "BEGIN {printf \"%.2f\", $CHANGE_KB / 5 / 1024}")
    TOTAL_MB=$(awk "BEGIN {printf \"%.2f\", $TOTAL_KB / 1024}")
    
    ACTIVE=$(brctl status 2>/dev/null | grep -c "downloading")
    
    echo "[$(date +%H:%M:%S)] 容量: ${CURRENT_GB}GB | 速度: ${SPEED_MB}MB/s | 已下载: ${TOTAL_MB}MB | 活跃: ${ACTIVE}个"
    
    # 卡住检测
    if [ $CHANGE_KB -le 0 ]; then
        echo "⚠️  下载可能卡住，尝试重启..."
        killall bird 2>/dev/null
        sleep 2
        brctl download "$ICLOUD_DIR" 2>/dev/null &
    fi
    
    LAST_SIZE=$CURRENT_SIZE
done
```

---

## 5. 常见问题

| 问题 | 解决方案 |
|------|----------|
| 同步卡住 | `killall bird && killall cloudd` |
| 上传太多文件 | 批量排除 node_modules 等开发目录 |
| 下载失败 | 清理缓存：`rm -rf ~/Library/Application Support/CloudDocs/session/containers` |
| 空间占用大 | 系统设置 → Apple ID → iCloud → 优化存储 |
| 文件显示 .icloud | 使用 `brctl download <文件路径>` 下载 |
| 新项目自动上传 | npm install 后立即执行 .nosync 转换 |

---

## 6. 新项目初始化模板

创建新项目时，自动排除开发目录：

```bash
# 在项目根目录执行
mkdir -p node_modules.nosync
ln -s node_modules.nosync node_modules

mkdir -p .venv.nosync
ln -s .venv.nosync .venv

# 然后再安装依赖
npm install
# 或
python -m venv .venv.nosync
```

---

## 安全原则

- ⛔ 不删除 iCloud 云端数据
- ⛔ 排除目录前确认不影响备份需求
- ⚠️ 重要操作前先确保同步完成
- ✅ .nosync 转换是安全可逆的

---

## 参考工具

| 工具 | 说明 | 安装 |
|------|------|------|
| icloud-nosync | CLI 排除工具 | `brew install icloud-nosync` |
| nosync | Node.js 排除工具 | `npm install -g nosync` |
