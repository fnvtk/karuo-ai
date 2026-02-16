#!/usr/bin/env python3
"""
任务规划初始化脚本
在项目根目录创建 task_plan.md
"""

import os
from datetime import datetime

TEMPLATE = '''# 任务规划书

> 生成时间: {timestamp}
> 来源: [待填写]

---

## 一、项目概览

### 目标
> 一句话描述要实现什么

### 成功标准
- [ ] 标准1：
- [ ] 标准2：
- [ ] 标准3：

### 约束条件
- 技术栈：
- 时间限制：
- 其他约束：

---

## 二、任务分解

### Epic 1: [功能模块名]

| ID | 任务 | 依赖 | 优先级 | 状态 | 预估 |
|----|------|------|--------|------|------|
| T1.1 | | - | P0 | ⏳ | |
| T1.2 | | T1.1 | P0 | ⏳ | |

---

## 三、技术决策

| 决策点 | 选项 | 最终选择 | 理由 |
|--------|------|----------|------|
| | | | |

---

## 四、风险预判

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| | | | |

---

## 五、执行日志

### {date}

**完成**:
- 

**进行中**:
- 

**下一步**:
- 

---

## 状态说明

| 状态 | 含义 |
|------|------|
| ⏳ | 待开始 |
| 🔄 | 进行中 |
| ✅ | 已完成 |
| ❌ | 已取消 |
| 🚫 | 阻塞中 |
| ⚠️ | 有风险 |
'''

def create_task_plan(directory='.'):
    """在指定目录创建任务规划文件"""
    filepath = os.path.join(directory, 'task_plan.md')
    
    if os.path.exists(filepath):
        print(f"⚠️ task_plan.md 已存在于 {directory}")
        response = input("是否覆盖？(y/N): ")
        if response.lower() != 'y':
            print("已取消")
            return
    
    now = datetime.now()
    content = TEMPLATE.format(
        timestamp=now.strftime("%Y-%m-%d %H:%M"),
        date=now.strftime("%Y-%m-%d")
    )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ 已创建 {filepath}")

if __name__ == '__main__':
    import sys
    directory = sys.argv[1] if len(sys.argv) > 1 else '.'
    create_task_plan(directory)
