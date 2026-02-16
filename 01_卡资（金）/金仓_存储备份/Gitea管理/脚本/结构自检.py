#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
卡若AI 结构自检脚本（4.6 目标结构）
- 检查 01～05、_共享模块、_经验库、开发文档 存在性
- 检查 33 个 Skill 路径与 SKILL_INDEX 一致
- 不依赖 _归档、_执行日志
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # 卡若AI 根目录

DIRS = [
    "01_卡资（金）",
    "02_卡人（水）",
    "03_卡木（木）",
    "04_卡火（火）",
    "05_卡土（土）",
    "_共享模块",
    "_经验库",
]
# 已整合：开发文档→_共享模块/开发文档，财务→土簿/财务管理，scripts→_共享模块/scripts 与 土簿/财务管理/scripts

FORBIDDEN = ["_归档", "_执行日志"]  # 4.6 目标下不应存在

# 33 技能相对路径（与 _共享模块/skill_router/SKILL_INDEX.md 一致）
SKILL_PATHS = [
    "01_卡资（金）/_团队成员/金仓/磁盘清理/SKILL.md",
    "01_卡资（金）/_团队成员/金仓/iCloud管理/SKILL.md",
    "01_卡资（金）/_团队成员/金仓/iPhone管理/SKILL.md",
    "01_卡资（金）/_团队成员/金仓/微信管理/SKILL.md",
    "01_卡资（金）/_团队成员/金仓/数据库管理/SKILL.md",
    "01_卡资（金）/_团队成员/金仓/文件整理/SKILL.md",
    "01_卡资（金）/_团队成员/金仓/服务器管理/SKILL.md",
    "01_卡资（金）/_团队成员/金仓/系统监控/SKILL.md",
    "01_卡资（金）/_团队成员/金仓/群晖NAS管理/SKILL.md",
    "01_卡资（金）/_团队成员/金仓/照片分类/SKILL.md",
    "01_卡资（金）/_团队成员/金盾/Vercel与v0部署流水线/SKILL.md",
    "01_卡资（金）/_团队成员/金盾/02_开发辅助/v0模型集成/SKILL.md",
    "01_卡资（金）/_团队成员/金盾/02_开发辅助/任务规划/SKILL.md",
    "01_卡资（金）/_团队成员/金盾/02_开发辅助/智能追问/SKILL.md",
    "01_卡资（金）/_团队成员/金盾/02_开发辅助/代码修复/SKILL.md",
    "01_卡资（金）/_团队成员/金盾/02_开发辅助/开发模板/SKILL.md",
    "01_卡资（金）/_团队成员/金盾/02_开发辅助/项目生成/SKILL.md",
    "01_卡资（金）/_团队成员/金盾/存客宝/SKILL.md",
    "02_卡人（水）/_团队成员/水桥/飞书管理/SKILL.md",
    "02_卡人（水）/_团队成员/水桥/智能纪要/SKILL.md",
    "02_卡人（水）/_团队成员/水桥/小程序管理/SKILL.md",
    "04_卡火（火）/_团队成员/火炬/全栈开发/SKILL.md",
    "04_卡火（火）/_团队成员/火炬/03_知识管理/读书笔记/SKILL.md",
    "04_卡火（火）/_团队成员/火炬/03_知识管理/文档清洗/SKILL.md",
    "04_卡火（火）/_团队成员/火炬/03_知识管理/对话归档/SKILL.md",
    "04_卡火（火）/_团队成员/火眸/上帝之眼/SKILL.md",
    "04_卡火（火）/_团队成员/火眸/04_效率工具/前端生成/SKILL.md",
    "04_卡火（火）/_团队成员/火眸/04_效率工具/技能工厂/SKILL.md",
    "04_卡火（火）/_团队成员/火眸/04_效率工具/流量自动化/SKILL.md",
    "04_卡火（火）/_团队成员/火眸/04_效率工具/视频切片/SKILL.md",
    "04_卡火（火）/_团队成员/火眸/04_效率工具/网站逆向分析/SKILL.md",
    "04_卡火（火）/_团队成员/火眸/05_安全保障/容灾备份/SKILL.md",
    "04_卡火（火）/_团队成员/火眸/05_安全保障/局域网控制/SKILL.md",
    "05_卡土（土）/_团队成员/土簿/财务管理/SKILL.md",
]


def main():
    ok = 0
    for d in DIRS:
        p = ROOT / d
        if p.is_dir():
            print(f"  [OK] {d}")
            ok += 1
        else:
            print(f"  [--] 缺失: {d}")
    for d in FORBIDDEN:
        p = ROOT / d
        if p.is_dir():
            print(f"  [!!] 应移除: {d}")
        else:
            print(f"  [OK] 已无: {d}")
            ok += 1
    print(f"\n--- 33 Skill 路径校验 ---")
    skill_ok = 0
    for rel in SKILL_PATHS:
        p = ROOT / rel
        if p.is_file():
            skill_ok += 1
        else:
            print(f"  [--] 缺失: {rel}")
    print(f"  Skill 路径: {skill_ok}/{len(SKILL_PATHS)}")
    print(f"\n结构检查完成: 目录 {ok}/{len(DIRS) + len(FORBIDDEN)}，Skill {skill_ok}/{len(SKILL_PATHS)}")


if __name__ == "__main__":
    main()
