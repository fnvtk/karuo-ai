---
name: 容灾备份
description: 代码修改前自动备份。触发词：备份代码、创建快照、git stash、容灾、代码回滚、恢复代码、安全气囊。在大幅修改代码前自动执行Git快照，项目出错后可瞬间复原。
group: 金
triggers: 备份、灾备、容灾、定时备份
owner: 金仓
version: "1.0"
updated: "2026-02-16"
---

# 容灾备份

代码修改的"安全气囊"。

## 核心理念

在**大幅修改代码前**，自动执行备份：
- Git stash（临时保存）
- Git commit（快照点）
- 文件复制（物理备份）

## 备份策略

```
┌─────────────────────────────────────────────────────────┐
│                    备份决策流程                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│    修改类型判断                                         │
│         │                                               │
│    ┌────┴────┬────────────┐                            │
│    │         │            │                             │
│    ▼         ▼            ▼                             │
│  小改动    中等改动     大改动                          │
│  <10行    10-100行     >100行                          │
│    │         │            │                             │
│    ▼         ▼            ▼                             │
│  无需备份  Git stash   Git commit                      │
│                        + 分支                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 备份命令

### 快速 Stash（推荐）

```bash
# 保存当前工作
git stash push -m "AI备份: $(date +%Y%m%d_%H%M%S)"

# 查看stash列表
git stash list

# 恢复最近的stash
git stash pop

# 恢复指定stash
git stash apply stash@{0}
```

### 创建备份分支

```bash
# 创建备份分支
git checkout -b backup/$(date +%Y%m%d_%H%M%S)

# 提交快照
git add -A
git commit -m "🔒 AI备份快照"

# 返回原分支
git checkout -
```

### 物理备份

```bash
# 复制整个项目
cp -r /path/to/project /path/to/project_backup_$(date +%Y%m%d_%H%M%S)
```

## 自动备份协议

当检测到以下操作时，**自动执行备份**：

| 操作类型 | 备份方式 |
|----------|----------|
| 删除文件 | Git stash |
| 重命名超过5个文件 | Git commit |
| 修改超过100行 | Git commit |
| 重构/重写 | 备份分支 |
| 删除目录 | 物理备份 |

## 恢复命令

### 从 Stash 恢复

```bash
# 查看stash内容
git stash show -p stash@{0}

# 恢复并保留stash
git stash apply stash@{0}

# 恢复并删除stash
git stash pop stash@{0}
```

### 从备份分支恢复

```bash
# 查看备份分支
git branch | grep backup

# 对比差异
git diff backup/20260119_1000

# 恢复特定文件
git checkout backup/20260119_1000 -- path/to/file
```

### 完全回滚

```bash
# 硬重置到某个提交
git reset --hard <commit-hash>

# 或者从备份分支恢复
git checkout backup/20260119_1000
git checkout -b recovered
```

## 备份脚本

```bash
#!/bin/bash
# 快速备份脚本
# 用法: ./backup.sh "备份说明"

MESSAGE=${1:-"AI自动备份"}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 检查是否有未提交的更改
if [[ -n $(git status -s) ]]; then
    git stash push -m "$MESSAGE - $TIMESTAMP"
    echo "✅ 已创建stash备份: $MESSAGE - $TIMESTAMP"
else
    echo "ℹ️ 没有需要备份的更改"
fi
```

## 安全原则

- 大改动前**必须**备份
- 备份信息要有意义（时间+描述）
- 定期清理过期备份（保留7天）
- 重要项目用物理备份
