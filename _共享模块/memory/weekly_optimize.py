#!/usr/bin/env python3
"""
卡若AI 每周优化脚本
- 整理 _经验库/待沉淀 -> 已整理
- 检查 SKILL 质量（是否符合标准模板）
- 更新 skills_registry.json
- 生成优化建议报告

用法：
    python weekly_optimize.py           # 执行每周优化
    python weekly_optimize.py --audit   # 仅执行 SKILL 质量审计
"""

import os
import json
from datetime import datetime
from pathlib import Path

# 路径配置
KARUO_AI_ROOT = Path("/Users/karuo/Documents/个人/卡若AI")
EXPERIENCE_DIR = KARUO_AI_ROOT / "_经验库"
MEMORY_DIR = KARUO_AI_ROOT / "_共享模块" / "memory" / "structured"
SKILL_TEMPLATE_KEYS = ["name", "version", "owner", "triggers"]

def audit_skills():
    """SKILL 质量审计"""
    print("[weekly] 开始 SKILL 质量审计...")
    
    registry_path = MEMORY_DIR / "skills_registry.json"
    if not registry_path.exists():
        print("[weekly] skills_registry.json 不存在，跳过审计")
        return []
    
    with open(registry_path, "r", encoding="utf-8") as f:
        registry = json.load(f)
    
    issues = []
    
    for member_name, member_data in registry["members"].items():
        member_path = KARUO_AI_ROOT / member_data["path"]
        
        for skill in member_data["skills"]:
            skill_path = member_path / skill["path"]
            
            if not skill_path.exists():
                issues.append({
                    "member": member_name,
                    "skill": skill["name"],
                    "issue": "SKILL.md 文件不存在",
                    "severity": "critical",
                    "path": str(skill_path)
                })
                continue
            
            content = skill_path.read_text(encoding="utf-8")
            
            # 检查 frontmatter
            if not content.startswith("---"):
                issues.append({
                    "member": member_name,
                    "skill": skill["name"],
                    "issue": "缺少 frontmatter",
                    "severity": "warning",
                    "path": str(skill_path)
                })
            
            # 检查关键章节
            required_sections = ["触发条件", "执行步骤", "输出格式"]
            for section in required_sections:
                if section not in content:
                    issues.append({
                        "member": member_name,
                        "skill": skill["name"],
                        "issue": f"缺少 '{section}' 章节",
                        "severity": "warning",
                        "path": str(skill_path)
                    })
            
            # 检查内容长度
            if len(content) < 200:
                issues.append({
                    "member": member_name,
                    "skill": skill["name"],
                    "issue": f"内容过短（{len(content)} 字符），建议补充",
                    "severity": "info",
                    "path": str(skill_path)
                })
    
    print(f"[weekly] 审计完成，发现 {len(issues)} 个问题")
    return issues

def organize_experience():
    """整理经验库：待沉淀 -> 已整理"""
    pending_dir = EXPERIENCE_DIR / "待沉淀"
    organized_dir = EXPERIENCE_DIR / "已整理"
    
    if not pending_dir.exists():
        print("[weekly] 待沉淀目录不存在，跳过")
        return 0
    
    pending_files = list(pending_dir.glob("*.md"))
    moved = 0
    
    for f in pending_files:
        content = f.read_text(encoding="utf-8").lower()
        
        # 简单分类（后续可用本地模型增强）
        if any(k in content for k in ["开发", "代码", "api", "bug"]):
            target = organized_dir / "开发经验"
        elif any(k in content for k in ["商业", "roi", "投资", "营收", "竞品"]):
            target = organized_dir / "商业经验"
        elif any(k in content for k in ["工具", "mcp", "脚本", "快捷"]):
            target = organized_dir / "工具技巧"
        elif any(k in content for k in ["运维", "服务器", "部署", "监控"]):
            target = organized_dir / "运维经验"
        else:
            continue  # 无法分类的跳过
        
        target.mkdir(parents=True, exist_ok=True)
        dest = target / f.name
        if not dest.exists():
            f.rename(dest)
            moved += 1
            print(f"[weekly] 移动: {f.name} -> {target.name}/")
    
    print(f"[weekly] 整理完成，移动 {moved} 个文件")
    return moved

def generate_report(issues):
    """生成优化建议报告"""
    today = datetime.now().strftime("%Y-%m-%d")
    report_path = MEMORY_DIR / f"weekly_report_{today}.md"
    
    content = f"""# 卡若AI 每周优化报告

> 自动生成 | {today}

---

## SKILL 质量审计

共发现 {len(issues)} 个问题：

| 成员 | 技能 | 问题 | 严重度 |
|:---|:---|:---|:---|
"""
    
    for issue in issues:
        content += f"| {issue['member']} | {issue['skill']} | {issue['issue']} | {issue['severity']} |\n"
    
    content += "\n---\n\n## 建议行动\n\n"
    
    critical = [i for i in issues if i["severity"] == "critical"]
    warnings = [i for i in issues if i["severity"] == "warning"]
    
    if critical:
        content += f"- **紧急**：{len(critical)} 个 SKILL 文件缺失，需立即修复\n"
    if warnings:
        content += f"- **改进**：{len(warnings)} 个 SKILL 缺少标准章节，建议按模板补齐\n"
    
    content += "\n> 模板参考：`_共享模块/references/SKILL模板.md`\n"
    
    report_path.write_text(content, encoding="utf-8")
    print(f"[weekly] 报告已生成: {report_path}")

def main():
    import sys
    
    audit_only = "--audit" in sys.argv
    
    print("[weekly] 开始每周优化...")
    
    # 1. SKILL 质量审计
    issues = audit_skills()
    
    if not audit_only:
        # 2. 经验库整理
        organize_experience()
    
    # 3. 生成报告
    generate_report(issues)
    
    print("[weekly] 完成！")

if __name__ == "__main__":
    main()
