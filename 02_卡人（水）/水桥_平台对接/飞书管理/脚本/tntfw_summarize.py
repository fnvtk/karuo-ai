#!/usr/bin/env python3
"""
按TNTFW格式整理每日工作
T（目标）：要达成的具体成果
N（过程）：执行步骤
T（思考）：反思心得
W（作品）：产出物
F（反馈）：收获评价
"""
import os
import subprocess
import json
import re
from collections import defaultdict

def get_files_on_date(date_str, max_files=200):
    """获取某天修改的文件"""
    dirs = ['/Users/karuo/Documents/个人', '/Users/karuo/Documents/开发', '/Users/karuo/Documents/1、金：项目']
    files = []
    for d in dirs:
        cmd = f'find "{d}" -type f -newermt "{date_str} 00:00" ! -newermt "{date_str} 23:59" 2>/dev/null'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
        for f in result.stdout.strip().split('\n'):
            if f and '.git' not in f and 'node_modules' not in f and '.DS_Store' not in f and '__pycache__' not in f:
                files.append(f)
    return files[:max_files]

def read_file_info(fpath):
    """读取文件信息"""
    try:
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read(2000)
        
        title = ""
        summary = ""
        
        # 提取md标题和摘要
        if fpath.endswith('.md'):
            lines = content.split('\n')
            for line in lines[:10]:
                if line.startswith('#') and not title:
                    title = line.strip('#').strip()[:80]
                elif line.strip() and not line.startswith('#') and len(line) > 20:
                    summary = line.strip()[:100]
                    break
        
        # 提取py docstring
        elif fpath.endswith('.py'):
            if '"""' in content:
                doc = content.split('"""')[1].split('"""')[0].strip()
                title = doc.split('\n')[0][:80]
                if len(doc.split('\n')) > 1:
                    summary = doc.split('\n')[1][:100]
        
        return title, summary
    except:
        return "", ""

def analyze_day_tntfw(files):
    """按TNTFW格式分析一天的工作"""
    
    # 分类统计
    projects = defaultdict(lambda: {"files": [], "titles": [], "summaries": []})
    
    for f in files:
        fname = os.path.basename(f)
        fpath = f.lower()
        title, summary = read_file_info(f)
        
        # 项目分类
        if 'soul' in fpath:
            project = "SOUL项目"
        elif '玩值' in f or 'esports' in fpath:
            project = "玩值电竞"
        elif '飞书' in f:
            project = "飞书工具"
        elif '卡若ai' in fpath or '卡若AI' in f:
            project = "卡若AI"
        elif '视频切片' in f:
            project = "视频切片"
        elif f.endswith('.py'):
            project = "Python开发"
        elif f.endswith(('.tsx', '.ts')):
            project = "前端开发"
        elif f.endswith('.md'):
            project = "文档工作"
        else:
            project = "其他"
        
        projects[project]["files"].append(fname)
        if title:
            projects[project]["titles"].append(title)
        if summary:
            projects[project]["summaries"].append(summary)
    
    # 生成TNTFW格式
    result = {
        "tasks": [],
        "summary": ""
    }
    
    # 按文件数排序取前3个项目
    sorted_projects = sorted(projects.items(), key=lambda x: -len(x[1]["files"]))[:3]
    
    for project, data in sorted_projects:
        file_count = len(data["files"])
        titles = list(set(data["titles"]))[:3]
        summaries = list(set(data["summaries"]))[:2]
        
        # 判断象限
        if project in ["SOUL项目", "Python开发", "前端开发"]:
            quadrant = "重要紧急"
        else:
            quadrant = "重要不紧急"
        
        task = {
            "person": "卡若",
            "events": [project],
            "quadrant": quadrant,
            "t_targets": titles[:2] if titles else [f"{project}推进"],
            "n_process": [f"完成{file_count}个文件的处理"],
            "t_thoughts": summaries[:1] if summaries else [],
            "w_work": data["files"][:3],
            "f_feedback": []
        }
        result["tasks"].append(task)
    
    # 生成总结
    if sorted_projects:
        main_project = sorted_projects[0][0]
        total_files = sum(len(p[1]["files"]) for p in sorted_projects)
        result["summary"] = f"{main_project}为主，共处理{total_files}个文件"
    
    return result

def process_all_days():
    """处理所有有记录的日期"""
    results = {}
    
    print("📊 按TNTFW格式分析每日工作...\n")
    
    for day in range(1, 26):
        date_str = f"2026-01-{day:02d}"
        files = get_files_on_date(date_str)
        
        if not files or len(files) < 3:  # 少于3个文件跳过
            continue
        
        result = analyze_day_tntfw(files)
        
        if result["tasks"]:
            results[day] = result
            print(f"1月{day}日: {result['summary']}")
    
    # 保存结果
    output_file = os.path.join(os.path.dirname(__file__), 'tntfw_summaries.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 共{len(results)}天有记录，保存到: {output_file}")
    return results

if __name__ == "__main__":
    process_all_days()
