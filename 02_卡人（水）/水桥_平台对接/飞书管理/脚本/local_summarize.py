#!/usr/bin/env python3
"""
本地智能总结每日工作（不依赖API）
- 读取文件名和内容
- 根据规则分析工作内容
- 生成四象限格式
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
        cmd = f'find "{d}" -type f -newermt "{date_str} 00:00" ! -newermt "{date_str} 23:59" 2>/dev/null'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
        for f in result.stdout.strip().split('\n'):
            if f and '.git' not in f and 'node_modules' not in f and '.DS_Store' not in f and '__pycache__' not in f:
                files.append(f)
    return files[:max_files]

def read_file_title(fpath):
    """读取文件标题"""
    try:
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read(1000)
        
        # 提取md标题
        if fpath.endswith('.md'):
            for line in content.split('\n')[:10]:
                if line.startswith('#'):
                    return line.strip('#').strip()[:50]
        
        # 提取py docstring
        if fpath.endswith('.py'):
            if '"""' in content:
                doc = content.split('"""')[1].split('"""')[0].strip()
                return doc.split('\n')[0][:50]
        
        return ""
    except:
        return ""

def analyze_files(files):
    """分析文件，生成工作内容"""
    tasks = []
    categories = defaultdict(list)
    
    for f in files:
        fname = os.path.basename(f)
        fpath = f.lower()
        title = read_file_title(f)
        
        # SOUL项目
        if 'soul' in fpath:
            if '商业计划' in f or '商业模式' in fname:
                categories['SOUL商业规划'].append(title or fname)
            elif '团队' in f or '岗位' in f:
                categories['SOUL团队建设'].append(title or fname)
            elif '协议' in f or '合同' in f:
                categories['SOUL合同协议'].append(title or fname)
            elif 'sop' in fpath or '流程' in f:
                categories['SOUL运营SOP'].append(title or fname)
            elif '产品' in f or '匹配' in f:
                categories['SOUL产品设计'].append(title or fname)
            else:
                categories['SOUL项目推进'].append(title or fname)
        
        # 玩值电竞
        elif '玩值' in f or 'esports' in fpath:
            if '营收' in f or '测算' in f or '财务' in f:
                categories['玩值财务规划'].append(title or fname)
            elif '团队' in f or 'kpi' in fpath:
                categories['玩值团队管理'].append(title or fname)
            elif '落地' in f or '执行' in f or '甘特' in f:
                categories['玩值落地执行'].append(title or fname)
            elif '招商' in f or '渠道' in f:
                categories['玩值招商推广'].append(title or fname)
            else:
                categories['玩值电竞项目'].append(title or fname)
        
        # 飞书工具
        elif '飞书' in f:
            categories['飞书工具开发'].append(title or fname)
        
        # 卡若AI
        elif '卡若AI' in f or '卡若ai' in fpath:
            if 'skill' in fpath:
                categories['AI技能开发'].append(title or fname)
            else:
                categories['卡若AI系统'].append(title or fname)
        
        # 视频切片
        elif '视频切片' in f:
            categories['视频切片工具'].append(title or fname)
        
        # 开发类
        elif f.endswith('.py'):
            categories['Python脚本开发'].append(title or fname)
        elif f.endswith(('.tsx', '.ts')):
            categories['前端开发'].append(title or fname)
        
        # 文档类
        elif f.endswith('.md'):
            if '模板' in f:
                categories['模板文档'].append(title or fname)
            elif '规划' in f or '计划' in f:
                categories['项目规划'].append(title or fname)
            elif '报告' in f or '分析' in f:
                categories['报告分析'].append(title or fname)
            else:
                categories['文档编写'].append(title or fname)
    
    # 生成任务列表
    for cat, items in sorted(categories.items(), key=lambda x: -len(x[1])):
        if not items:
            continue
        
        # 判断象限
        if 'SOUL' in cat or '开发' in cat:
            quadrant = "重要紧急"
        elif '规划' in cat or '模板' in cat or '文档' in cat:
            quadrant = "重要不紧急"
        else:
            quadrant = "重要不紧急"
        
        # 提取有意义的示例
        examples = []
        for item in items[:3]:
            if item and len(item) > 2:
                examples.append(item)
        
        tasks.append({
            "person": "卡若",
            "event": cat,
            "quadrant": quadrant,
            "targets": [f"完成{len(items)}项"],
            "process": examples[:2] if examples else [f"{len(items)}个文件"]
        })
    
    # 生成总结
    if tasks:
        main_work = tasks[0]['event']
        summary = f"主要工作：{main_work}等{len(tasks)}类任务"
    else:
        summary = "无记录"
    
    return {
        "tasks": tasks[:4],  # 最多4个任务
        "summary": summary
    }

def process_day(day, month=1, year=2026):
    """处理某一天"""
    date_str = f"{year}-{month:02d}-{day:02d}"
    
    files = get_files_on_date(date_str)
    
    if not files:
        return None
    
    result = analyze_files(files)
    print(f"1月{day}日: {result['summary']}")
    
    return result

def main():
    """主函数"""
    results = {}
    
    print("📊 本地分析每日工作内容...\n")
    
    for day in range(1, 26):
        result = process_day(day)
        if result and result.get('tasks'):
            results[day] = result
    
    # 保存结果
    output_file = os.path.join(os.path.dirname(__file__), 'daily_summaries.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 结果保存到: {output_file}")
    return results

if __name__ == "__main__":
    main()
