#!/usr/bin/env python3
"""
智能总结每日工作内容
读取文件内容，提取具体工作描述
"""
import os
import subprocess
import json
import re
from collections import defaultdict

def get_files_on_date(date_str, max_files=100):
    """获取某天修改的文件"""
    dirs = ['/Users/karuo/Documents/个人', '/Users/karuo/Documents/开发', '/Users/karuo/Documents/1、金：项目']
    files = []
    for d in dirs:
        cmd = f'find "{d}" -type f \\( -name "*.md" -o -name "*.py" -o -name "*.tsx" -o -name "*.ts" \\) -newermt "{date_str} 00:00" ! -newermt "{date_str} 23:59" 2>/dev/null'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
        for f in result.stdout.strip().split('\n'):
            if f and '.git' not in f and 'node_modules' not in f:
                files.append(f)
    return files[:max_files]

def extract_work_from_file(fpath):
    """从文件中提取工作内容"""
    try:
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read(3000)
        
        fname = os.path.basename(fpath)
        work = {"title": "", "desc": "", "type": ""}
        
        # MD文件
        if fpath.endswith('.md'):
            lines = content.split('\n')
            for line in lines[:15]:
                line = line.strip()
                if line.startswith('#') and not work["title"]:
                    work["title"] = line.strip('#').strip()[:60]
                elif len(line) > 30 and not line.startswith('#') and not line.startswith('-') and not work["desc"]:
                    work["desc"] = line[:80]
            
            # 识别类型
            if '商业计划' in fname or '商业模式' in content[:500]:
                work["type"] = "商业计划"
            elif 'SOP' in fname or '流程' in fname:
                work["type"] = "SOP流程"
            elif '团队' in fname or '岗位' in fname:
                work["type"] = "团队管理"
            elif '协议' in fname or '合同' in fname:
                work["type"] = "合同协议"
            elif '规划' in fname or '计划' in fname:
                work["type"] = "项目规划"
            elif '模板' in fname:
                work["type"] = "模板设计"
            elif 'SKILL' in fname:
                work["type"] = "技能开发"
            else:
                work["type"] = "文档"
        
        # PY文件
        elif fpath.endswith('.py'):
            if '"""' in content:
                doc = content.split('"""')[1].split('"""')[0].strip()
                work["title"] = doc.split('\n')[0][:60]
                if len(doc.split('\n')) > 1:
                    work["desc"] = doc.split('\n')[1][:80]
            work["type"] = "脚本开发"
        
        # TSX/TS文件
        elif fpath.endswith(('.tsx', '.ts')):
            # 提取组件名
            match = re.search(r'(function|const)\s+(\w+)', content)
            if match:
                work["title"] = match.group(2)
            work["type"] = "前端组件"
        
        return work
    except:
        return None

def summarize_day(day, month=1, year=2026):
    """总结某天的工作"""
    date_str = f"{year}-{month:02d}-{day:02d}"
    files = get_files_on_date(date_str)
    
    if len(files) < 3:
        return None
    
    # 提取工作内容
    projects = defaultdict(lambda: {"works": [], "types": set()})
    
    for f in files:
        fpath = f.lower()
        work = extract_work_from_file(f)
        if not work:
            continue
        
        # 分项目
        if 'soul' in fpath:
            project = "SOUL项目"
        elif '玩值' in f:
            project = "玩值电竞"
        elif '飞书' in f:
            project = "飞书工具"
        elif '卡若ai' in fpath:
            project = "卡若AI"
        else:
            project = "其他"
        
        if work["title"]:
            projects[project]["works"].append(work)
            if work["type"]:
                projects[project]["types"].add(work["type"])
    
    # 生成TNTFW格式
    tasks = []
    sorted_projects = sorted(projects.items(), key=lambda x: -len(x[1]["works"]))[:3]
    
    for project, data in sorted_projects:
        works = data["works"]
        types = list(data["types"])
        
        if not works:
            continue
        
        # 判断象限
        if project in ["SOUL项目", "卡若AI"]:
            quadrant = "重要紧急"
        else:
            quadrant = "重要不紧急"
        
        # 提取具体工作
        titles = [w["title"] for w in works if w["title"]][:3]
        descs = [w["desc"] for w in works if w["desc"]][:2]
        
        task = {
            "person": "卡若",
            "events": [project],
            "quadrant": quadrant,
            "t_targets": titles[:2] if titles else [f"{project}推进"],
            "n_process": [f"类型：{'、'.join(types[:2])}"] if types else [],
            "t_thoughts": descs[:1] if descs else [],
            "w_work": [w["title"] for w in works[:3] if w["title"]],
            "f_feedback": []
        }
        tasks.append(task)
    
    if not tasks:
        return None
    
    # 生成总结
    main_project = sorted_projects[0][0] if sorted_projects else ""
    main_types = list(sorted_projects[0][1]["types"])[:2] if sorted_projects else []
    summary = f"{main_project}：{'、'.join(main_types)}" if main_types else f"{main_project}推进"
    
    return {
        "tasks": tasks,
        "summary": summary
    }

def main():
    """主函数"""
    results = {}
    
    print("📊 智能分析每日工作内容...\n")
    
    for day in range(1, 26):
        result = summarize_day(day)
        if result:
            results[day] = result
            print(f"1月{day}日: {result['summary']}")
    
    # 保存
    output_file = os.path.join(os.path.dirname(__file__), 'smart_summaries.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 共{len(results)}天，保存到: {output_file}")
    return results

if __name__ == "__main__":
    main()
