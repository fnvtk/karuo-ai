---
name: 照片分类
description: 照片整理与相册分类。触发词：照片整理、相册分类、照片归档、整理照片、照片库。基于 macOS 照片 App 与 Python 脚本，支持自动分类、创建相册、批量导入导出。
---

# 照片分类

为卡若的 Mac 照片图库提供整理与分类服务。

## 系统信息

- **照片图库**：约 117GB
- **管理方式**：macOS 照片 App / Python 脚本

## 触发词

照片整理、相册分类、照片归档、整理照片、照片库、导入相册

## 核心能力

1. **分类规则**：按时间、地点、人物、类型自动分类
2. **相册创建**：批量创建相册并导入照片
3. **导出备份**：按分类导出到指定目录
4. **重复检测**：识别并处理重复照片

## 工作流

```
诊断照片库 → 定义分类规则 → 执行分类/创建相册 → 验证结果
```

## 常用命令

```bash
# 照片库路径（macOS 默认）
# ~/Pictures/Photos\ Library.photoslibrary

# 本目录脚本（已从婼瑄恢复）
python classify_photos.py
python create_albums.py
./auto_organize.sh
```

## 脚本列表

classify_photos.py、create_albums.py、add_photos_to_albums.py、add_photos_auto.py、auto_organize.sh、final_auto.py、full_auto.py
