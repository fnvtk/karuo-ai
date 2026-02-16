---
name: 文件整理
description: 文件归档和硬盘管理。触发词：整理文件、整理硬盘、外置硬盘、归档文件、文件分类、J_CENA、5类归档、清理下载、批量移动、批量删除。包含5类归档法、外置硬盘管理、批量操作脚本。
---

# 文件整理

为卡若提供文件整理和归档服务，包括本地和外置硬盘管理。

## 5类归档法

```
┌──────────────────────────────────────────────────────────────┐
│                        5类归档体系                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   01_资产库        长期价值内容（照片、设计源文件、CG）        │
│        │                                                     │
│   02_项目交付      完成的项目（部署包、源码、数据库）          │
│        │                                                     │
│   03_备份与同步    系统/数据备份（机器备份、IM记录）           │
│        │                                                     │
│   04_工具软件      安装包、驱动、插件                         │
│        │                                                     │
│   99_临时与待清理  临时文件、下载、可再下载内容                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 外置硬盘 J_CENA_X64F

### 硬盘信息

| 项目 | 值 |
|------|-----|
| 卷名 | J_CENA_X64F |
| 容量 | 1TB |
| 格式 | FAT32 |
| 单文件限制 | 4GB |
| 挂载点 | `/Volumes/J_CENA_X64F` |

### 目录结构

```
/Volumes/J_CENA_X64F/
├── 00_索引与说明/          # 整理规则说明
├── 01_资产库/              # 素材/作品/可长期复用内容
│   ├── CG/                 # 游戏CG收藏 (324GB)
│   ├── 0 素材/             # 电商设计素材 (24GB)
│   ├── 视频/               # 视频内容 (30GB)
│   └── 抖音视频/           # 抖音相关
├── 02_项目交付/            # 部署包/源码/数据库/交付物
│   ├── MongoDB_NAS_部署包/
│   ├── 源码备份/
│   └── 数据库/
├── 03_备份与同步/          # 机器/工具/同步盘/历史备份
│   ├── backup/             # 旧机器备份 (43GB)
│   ├── 备份/               # 项目备份 (34GB)
│   └── IM备份/             # 聊天记录备份
├── 04_工具软件/            # 安装包/驱动/插件/工具
│   ├── 常用软件/
│   ├── 安卓APK/
│   └── OBS工具包/
└── 99_临时与待清理/        # 下载/缓存/临时/可再下载内容
    ├── 迅雷下载/
    └── BaiduNetdiskDownload/
```

---

## 常用操作

### 挂载/卸载硬盘

```bash
# 列出所有磁盘
diskutil list

# 挂载外置硬盘
diskutil mount /dev/disk4s4

# 安全卸载
diskutil unmount /Volumes/J_CENA_X64F
```

### 查看占用

```bash
# 外置盘各目录大小
du -d 1 -h /Volumes/J_CENA_X64F/

# 找大于1GB的文件
find /Volumes/J_CENA_X64F -type f -size +1G 2>/dev/null

# 找接近4GB限制的文件
find /Volumes/J_CENA_X64F -type f -size +3900M 2>/dev/null
```

---

## 批量操作脚本

### 批量移动文件

```bash
#!/bin/bash
# 批量移动下载文件到外置硬盘

DEST="/Volumes/J_CENA_X64F"

# 检查硬盘是否挂载
if [ ! -d "$DEST" ]; then
    echo "❌ 外置硬盘未挂载"
    exit 1
fi

# 移动安装包
echo "移动安装包..."
mv ~/Downloads/*.dmg "$DEST/04_工具软件/" 2>/dev/null
mv ~/Downloads/*.pkg "$DEST/04_工具软件/" 2>/dev/null
mv ~/Downloads/*.iso "$DEST/04_工具软件/" 2>/dev/null

# 移动压缩包到临时
echo "移动压缩包..."
mv ~/Downloads/*.zip "$DEST/99_临时与待清理/" 2>/dev/null
mv ~/Downloads/*.rar "$DEST/99_临时与待清理/" 2>/dev/null

# 移动视频
echo "移动视频..."
mv ~/Downloads/*.mp4 "$DEST/01_资产库/视频/" 2>/dev/null
mv ~/Downloads/*.mov "$DEST/01_资产库/视频/" 2>/dev/null

echo "✓ 移动完成"
```

### 批量删除脚本

```bash
#!/bin/bash
# 安全批量删除（支持大量文件）

TARGET_DIR="$1"

if [ -z "$TARGET_DIR" ]; then
    echo "用法: $0 <目标目录>"
    exit 1
fi

if [ ! -d "$TARGET_DIR" ]; then
    echo "❌ 目录不存在: $TARGET_DIR"
    exit 1
fi

echo "⚠️  即将删除: $TARGET_DIR"
echo "文件数量: $(find "$TARGET_DIR" -type f | wc -l | tr -d ' ')"
read -p "确认删除? (y/N): " confirm

if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    echo "🔥 开始删除..."
    
    # 停止 iCloud 避免干扰
    killall bird 2>/dev/null
    
    # 使用系统级 rm 删除
    /bin/rm -rf "$TARGET_DIR"
    
    echo "✓ 删除完成"
else
    echo "已取消"
fi
```

### 清理空目录

```bash
# 查找空目录
find /Volumes/J_CENA_X64F -type d -empty

# 删除空目录
find /Volumes/J_CENA_X64F -type d -empty -delete
```

---

## 下载文件夹管理

### 查看状态

```bash
# 下载文件夹大小
du -sh ~/Downloads

# 按修改时间列出（旧文件优先）
ls -lt ~/Downloads | tail -20

# 按大小排序
ls -lhS ~/Downloads | head -20
```

### 清理旧文件

```bash
# 查看30天前的文件
find ~/Downloads -mtime +30 -type f

# 删除30天前的文件（谨慎）
find ~/Downloads -mtime +30 -type f -delete

# 删除7天前的特定类型
find ~/Downloads -name "*.tmp" -mtime +7 -delete
find ~/Downloads -name "*.part" -mtime +7 -delete
```

---

## FAT32 大文件处理

FAT32 单文件不能超过 4GB，需分卷处理：

```bash
# 分卷压缩（每片 3.9GB）
split -b 3900m 大文件.zip 大文件.zip.part

# 合并还原
cat 大文件.zip.part* > 大文件.zip

# 使用 7z 分卷（更好）
7z a -v3900m 压缩包.7z 大文件/

# 还原 7z 分卷
7z x 压缩包.7z.001
```

---

## 文件同步和复制监控

### 复制进度监控

```bash
#!/bin/bash
# 监控大文件复制进度

SOURCE="$1"
DEST="$2"

if [ -z "$SOURCE" ] || [ -z "$DEST" ]; then
    echo "用法: $0 <源文件> <目标路径>"
    exit 1
fi

# 获取源文件大小
TOTAL_SIZE=$(stat -f%z "$SOURCE")
TOTAL_MB=$((TOTAL_SIZE / 1024 / 1024))

echo "📂 源文件: $SOURCE"
echo "📊 总大小: ${TOTAL_MB}MB"
echo ""

# 开始复制（后台）
cp "$SOURCE" "$DEST" &
CP_PID=$!

# 监控进度
while kill -0 $CP_PID 2>/dev/null; do
    if [ -f "$DEST/$(basename $SOURCE)" ]; then
        CURRENT_SIZE=$(stat -f%z "$DEST/$(basename $SOURCE)" 2>/dev/null || echo 0)
        CURRENT_MB=$((CURRENT_SIZE / 1024 / 1024))
        PERCENT=$((CURRENT_SIZE * 100 / TOTAL_SIZE))
        echo -ne "\r📥 进度: ${CURRENT_MB}MB / ${TOTAL_MB}MB (${PERCENT}%)"
    fi
    sleep 1
done

echo ""
echo "✓ 复制完成!"
```

---

## 整理原则

| 原则 | 说明 |
|------|------|
| 可读性 | 文件名用中文，保持可读性 |
| 结构化 | 保留原始目录结构关键信息 |
| 可追溯 | 生成操作日志 |
| 安全性 | 删除前必须确认 |
| 格式限制 | FAT32 单文件不超过 4GB |

---

## 注意事项

### 启动盘文件不动

以下文件/目录是 Windows 启动盘必需的，不要移动或删除：

```
boot/
efi/
sources/
bootmgr*
setup.exe
$RECYCLE.BIN
System Volume Information
.Spotlight-V100
```

### 系统隐藏目录

```bash
# 查看隐藏文件
ls -la /Volumes/J_CENA_X64F/

# 这些目录是系统自动生成的，一般不需要处理
# - .Spotlight-V100（Spotlight 索引）
# - .fseventsd（文件事件日志）
# - .Trashes（回收站）
```
