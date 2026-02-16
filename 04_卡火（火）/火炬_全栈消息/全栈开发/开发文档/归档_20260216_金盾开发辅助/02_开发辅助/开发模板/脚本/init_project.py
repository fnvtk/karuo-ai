#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
项目初始化脚本
功能：基于开发模板快速创建新项目结构
作者：卡若AI
"""

import os
import sys
from pathlib import Path
from datetime import datetime

# 开发模板路径
TEMPLATE_PATH = Path("/Users/karuo/Documents/开发/1、开发模板")

# 10个目录配置
DIRECTORIES = {
    "1、需求": "需求文档和业务分析",
    "2、架构": "系统架构和技术选型",
    "3、原型": "UI/UX设计和原型",
    "4、前端": "前端代码和组件",
    "5、接口": "API接口文档",
    "6、后端": "后端代码和服务",
    "7、数据库": "数据库设计",
    "8、部署": "部署配置和脚本",
    "9、手册": "用户手册和文档",
    "10、项目管理": "项目管理和复盘"
}


def create_project_structure(project_name: str, target_path: str = "."):
    """
    创建项目目录结构
    
    Args:
        project_name: 项目名称
        target_path: 目标路径，默认当前目录
    """
    # 创建项目根目录
    project_root = Path(target_path) / project_name
    
    if project_root.exists():
        print(f"❌ 项目目录已存在：{project_root}")
        return False
    
    print(f"🚀 开始创建项目：{project_name}")
    print(f"📍 目标路径：{project_root.absolute()}")
    print()
    
    # 创建根目录
    project_root.mkdir(parents=True)
    
    # 创建10个子目录
    for dir_name, description in DIRECTORIES.items():
        dir_path = project_root / dir_name
        dir_path.mkdir()
        
        # 创建README.md
        readme_content = f"""# {dir_name}

> {description}

## 目录说明

本目录用于存放{description}相关文档。

## 使用指引

1. 根据项目需求，创建对应的文档
2. 遵循卡若开发规范
3. 使用 `@项目引擎 展开{dir_name[0]}` 自动生成内容

---

创建时间：{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
项目名称：{project_name}
"""
        (dir_path / "README.md").write_text(readme_content, encoding="utf-8")
        
        print(f"✅ {dir_name}/ - {description}")
    
    # 创建项目根README
    root_readme = f"""# {project_name}

> 基于卡若AI开发模板创建

## 项目信息

- **项目名称**：{project_name}
- **创建时间**：{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
- **开发模板**：卡若AI全栈开发模板 v2.0

## 目录结构

```
{project_name}/
├── 1、需求/           # 需求文档和业务分析
├── 2、架构/           # 系统架构和技术选型
├── 3、原型/           # UI/UX设计和原型
├── 4、前端/           # 前端代码和组件
├── 5、接口/           # API接口文档
├── 6、后端/           # 后端代码和服务
├── 7、数据库/         # 数据库设计
├── 8、部署/           # 部署配置和脚本
├── 9、手册/           # 用户手册和文档
└── 10、项目管理/      # 项目管理和复盘
```

## 快速开始

### 方式1：一键全量展开

在 Cursor 中打开本项目，然后：

```
@项目引擎 一键展开：

【项目名称】：{project_name}
【核心功能】：[填写核心功能]
【目标用户】：[填写目标用户]
【预期规模】：[填写预期规模]
```

### 方式2：单目录展开

```
@项目引擎 展开1：生成需求文档
@项目引擎 展开2：生成系统架构
@项目引擎 展开4：生成前端代码
```

## 开发规范

- **代码规范**：必须中文注释 + TypeScript
- **UI规范**：iOS风格 + 骨架屏
- **商业规范**：必须通过云阿米巴检查

## 技术栈

- **前端**：React + Next.js + Shadcn UI + Tailwind CSS
- **后端**：Python FastAPI + MongoDB
- **部署**：Webhook + 宝塔 / Docker

---

📞 技术支持：微信 28533368
"""
    (project_root / "README.md").write_text(root_readme, encoding="utf-8")
    
    print()
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"🎉 项目创建成功！")
    print(f"📂 项目路径：{project_root.absolute()}")
    print()
    print("🚀 下一步：")
    print(f"   cd {project_name}")
    print("   在 Cursor 中打开，使用 @项目引擎 开始开发")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    return True


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("使用方法：")
        print(f"  python {sys.argv[0]} <项目名称> [目标路径]")
        print()
        print("示例：")
        print(f"  python {sys.argv[0]} 私域银行")
        print(f"  python {sys.argv[0]} 私域银行 ~/Projects")
        sys.exit(1)
    
    project_name = sys.argv[1]
    target_path = sys.argv[2] if len(sys.argv) > 2 else "."
    
    # 验证开发模板是否存在
    if not TEMPLATE_PATH.exists():
        print(f"❌ 找不到开发模板：{TEMPLATE_PATH}")
        print("   请确认路径是否正确")
        sys.exit(1)
    
    # 创建项目
    create_project_structure(project_name, target_path)


if __name__ == "__main__":
    main()
