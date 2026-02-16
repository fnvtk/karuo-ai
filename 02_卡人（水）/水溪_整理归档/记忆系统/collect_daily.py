#!/usr/bin/env python3
"""
卡若AI 每日成果收集脚本
- 扫描 Agent 对话记录，提取当日有变更的 Agent
- 生成每日摘要写入 structured/daily_digest.md
- 识别可沉淀内容标记到 _经验库/待沉淀/

用法：
    python collect_daily.py              # 收集今日成果
    python collect_daily.py --date 2026-02-13  # 收集指定日期
"""

import os
import json
import glob
from datetime import datetime, timedelta
from pathlib import Path

# 路径配置
KARUO_AI_ROOT = Path("/Users/karuo/Documents/个人/卡若AI")
MEMORY_DIR = KARUO_AI_ROOT / "02_卡人（水）" / "水溪_整理归档" / "记忆系统" / "structured"
EXPERIENCE_DIR = KARUO_AI_ROOT / "_经验库" / "待沉淀"
AGENT_TRANSCRIPTS = Path.home() / ".cursor" / "projects"

def get_recent_agents(target_date=None):
    """扫描最近有活动的 Agent 对话记录"""
    if target_date is None:
        target_date = datetime.now().strftime("%Y-%m-%d")
    
    agents = []
    # 扫描所有 agent-transcripts 目录
    for proj_dir in AGENT_TRANSCRIPTS.glob("*/agent-transcripts"):
        for transcript in proj_dir.glob("*.txt"):
            stat = transcript.stat()
            mod_date = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d")
            if mod_date == target_date:
                agents.append({
                    "file": str(transcript),
                    "name": transcript.stem,
                    "modified": mod_date,
                    "size": stat.st_size
                })
    
    return agents

def generate_daily_digest(agents, target_date=None):
    """生成每日摘要"""
    if target_date is None:
        target_date = datetime.now().strftime("%Y-%m-%d")
    
    digest_path = MEMORY_DIR / "daily_digest.md"
    
    header = f"""# 卡若AI 每日成果摘要

> 自动生成 | 最后更新：{target_date}

---

## {target_date} 活跃 Agent（{len(agents)} 个）

| Agent | 文件大小 | 路径 |
|:---|:---|:---|
"""
    
    rows = ""
    for a in agents:
        size_kb = a["size"] / 1024
        rows += f"| {a['name']} | {size_kb:.1f} KB | `{a['file']}` |\n"
    
    content = header + rows + "\n---\n\n> 提示：打开对应 Agent 提取有价值的成果，写入对应 SKILL 或经验库。\n"
    
    digest_path.write_text(content, encoding="utf-8")
    print(f"[collect_daily] 摘要已写入: {digest_path}")
    return digest_path

def update_agent_results(agents, target_date=None):
    """更新 agent_results.json"""
    if target_date is None:
        target_date = datetime.now().strftime("%Y-%m-%d")
    
    results_path = MEMORY_DIR / "agent_results.json"
    
    if results_path.exists():
        with open(results_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {"version": "1.0", "updated": target_date, "results": []}
    
    # 检查是否有新 Agent 需要添加
    existing_names = {r["agent"] for r in data["results"]}
    
    for a in agents:
        if a["name"] not in existing_names:
            data["results"].append({
                "agent": a["name"],
                "date": target_date,
                "changes": f"活跃（{a['size']/1024:.1f}KB）",
                "target_skill": "待分配",
                "status": "待提取",
                "priority": "medium"
            })
    
    data["updated"] = target_date
    
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"[collect_daily] 成果追踪已更新: {results_path}")

def main():
    import sys
    
    target_date = None
    if len(sys.argv) > 2 and sys.argv[1] == "--date":
        target_date = sys.argv[2]
    
    print(f"[collect_daily] 开始收集{target_date or '今日'}成果...")
    
    # 1. 扫描活跃 Agent
    agents = get_recent_agents(target_date)
    print(f"[collect_daily] 发现 {len(agents)} 个活跃 Agent")
    
    # 2. 生成每日摘要
    generate_daily_digest(agents, target_date)
    
    # 3. 更新成果追踪
    update_agent_results(agents, target_date)
    
    print("[collect_daily] 完成！")

if __name__ == "__main__":
    main()
