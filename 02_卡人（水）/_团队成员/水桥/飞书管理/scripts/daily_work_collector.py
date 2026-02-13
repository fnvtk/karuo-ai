#!/usr/bin/env python3
"""
每日工作内容收集器
- 扫描文件修改记录
- 分析Cursor对话记录
- 按天生成工作总结
"""
import os
import json
import subprocess
from datetime import datetime, timedelta
from collections import defaultdict
import re

def get_files_modified_on_date(date_str, base_dirs):
    """获取某天修改的文件"""
    files = []
    for base_dir in base_dirs:
        try:
            # 使用find命令
            cmd = f'find "{base_dir}" -type f -newermt "{date_str} 00:00" ! -newermt "{date_str} 23:59" 2>/dev/null'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
            for f in result.stdout.strip().split('\n'):
                if f and not '.git' in f and not 'node_modules' in f and not '.DS_Store' in f:
                    files.append(f)
        except:
            pass
    return files

def analyze_file_changes(files):
    """分析文件变更，提取工作内容"""
    work_items = defaultdict(list)
    
    for f in files:
        # 按项目分类
        if 'soul' in f.lower():
            work_items['SOUL项目'].append(os.path.basename(f))
        elif '玩值' in f or 'esports' in f.lower():
            work_items['玩值电竞'].append(os.path.basename(f))
        elif '飞书' in f:
            work_items['飞书工具'].append(os.path.basename(f))
        elif '卡若AI' in f:
            work_items['卡若AI系统'].append(os.path.basename(f))
        elif '开发' in f:
            work_items['开发工作'].append(os.path.basename(f))
        elif '.py' in f or '.ts' in f or '.tsx' in f:
            work_items['代码开发'].append(os.path.basename(f))
        elif '.md' in f:
            work_items['文档编写'].append(os.path.basename(f))
    
    return work_items

def get_cursor_transcripts_for_date(date_str):
    """获取某天的Cursor对话记录"""
    transcripts = []
    transcript_dirs = [
        '/Users/karuo/.cursor/projects/Users-karuo-Documents-AI/agent-transcripts/',
        '/Users/karuo/.cursor/projects/Users-karuo-Documents-3-code-workspace/agent-transcripts/',
        '/Users/karuo/.cursor/projects/Users-karuo-Documents-3-soul-code-workspace/agent-transcripts/',
    ]
    
    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
    
    for trans_dir in transcript_dirs:
        if os.path.exists(trans_dir):
            for f in os.listdir(trans_dir):
                if f.endswith('.txt'):
                    fpath = os.path.join(trans_dir, f)
                    mtime = datetime.fromtimestamp(os.path.getmtime(fpath))
                    if mtime.date() == date_obj.date():
                        transcripts.append(fpath)
    
    return transcripts

def extract_work_summary_from_transcript(fpath):
    """从对话记录中提取工作摘要"""
    try:
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()[:5000]  # 只读前5000字符
        
        # 提取关键词
        keywords = []
        patterns = [
            r'完成了?(.*?)(?:功能|开发|修复|优化)',
            r'创建了?(.*?)(?:文件|脚本|模板)',
            r'(SOUL|玩值|飞书|soul|视频).*?(?:相关|功能|开发)',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, content)
            keywords.extend(matches[:3])
        
        return keywords
    except:
        return []

def generate_daily_summary(date_str):
    """生成某天的工作总结"""
    base_dirs = [
        '/Users/karuo/Documents/个人',
        '/Users/karuo/Documents/开发',
        '/Users/karuo/Documents/1、金：项目',
    ]
    
    # 获取文件修改
    files = get_files_modified_on_date(date_str, base_dirs)
    work_items = analyze_file_changes(files)
    
    # 获取Cursor对话
    transcripts = get_cursor_transcripts_for_date(date_str)
    
    # 构建任务列表
    tasks = []
    
    if work_items:
        for category, items in work_items.items():
            if items:
                tasks.append({
                    'person': '卡若',
                    'events': [category],
                    'quadrant': '重要紧急' if 'SOUL' in category or '开发' in category else '重要不紧急',
                    't_targets': [f"处理{len(items)}个文件"],
                    'n_process': items[:3],  # 只取前3个
                    't_thoughts': [],
                    'w_work': [],
                    'f_feedback': []
                })
    
    if not tasks:
        # 没有记录，生成默认任务
        tasks = [{
            'person': '卡若',
            'events': ['日常工作'],
            'quadrant': '重要不紧急',
            't_targets': [f'修改{len(files)}个文件' if files else '待补充'],
            'n_process': [],
            't_thoughts': [],
            'w_work': [],
            'f_feedback': []
        }]
    
    return tasks, len(files), len(transcripts)

def collect_january_work():
    """收集1月份工作记录"""
    results = {}
    
    for day in range(1, 26):  # 1月1日到25日
        date_str = f'2026-01-{day:02d}'
        tasks, file_count, transcript_count = generate_daily_summary(date_str)
        
        results[day] = {
            'tasks': tasks,
            'file_count': file_count,
            'transcript_count': transcript_count
        }
        
        print(f"1月{day}日: {file_count}个文件, {transcript_count}个对话")
    
    return results

if __name__ == "__main__":
    print("📊 收集1月工作记录...")
    results = collect_january_work()
    
    # 保存结果
    output_file = '/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/飞书管理/scripts/january_work.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 结果保存到: {output_file}")
