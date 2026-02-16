#!/usr/bin/env python3
"""
AI智能总结每日工作
- 读取每天修改的文件内容
- 用Gemini AI总结
- 按四象限格式输出
"""
import os
import subprocess
import json
from datetime import datetime
import requests

# Gemini API配置
GEMINI_API_KEY = "AIzaSyCPARryq8o6MKptLoT4STAvCsRB7uZuOK8"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

def get_files_on_date(date_str, max_files=50):
    """获取某天修改的文件"""
    dirs = ['/Users/karuo/Documents/个人', '/Users/karuo/Documents/开发', '/Users/karuo/Documents/1、金：项目']
    files = []
    for d in dirs:
        cmd = f'find "{d}" -type f -newermt "{date_str} 00:00" ! -newermt "{date_str} 23:59" 2>/dev/null'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
        for f in result.stdout.strip().split('\n'):
            if f and '.git' not in f and 'node_modules' not in f and '.DS_Store' not in f and '__pycache__' not in f:
                # 只取有意义的文件
                if f.endswith(('.md', '.py', '.ts', '.tsx', '.txt', '.json')):
                    files.append(f)
    return files[:max_files]

def read_file_content(fpath, max_chars=2000):
    """读取文件内容"""
    try:
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()[:max_chars]
        return content
    except:
        return ""

def summarize_with_ai(files_info, date_str):
    """用Gemini AI总结工作内容"""
    
    # 构建提示词
    prompt = f"""请分析以下{date_str}修改的文件，总结当天的主要工作内容。

文件列表和内容摘要：
{files_info}

请按以下格式输出JSON（直接输出JSON，不要其他内容）：
{{
  "tasks": [
    {{
      "person": "卡若",
      "event": "具体工作事项（如：SOUL项目商业计划书撰写）",
      "quadrant": "重要紧急/重要不紧急/不重要紧急/不重要不紧急",
      "targets": ["具体目标1", "具体目标2"],
      "process": ["完成的步骤1", "完成的步骤2"]
    }}
  ],
  "summary": "当天工作一句话总结"
}}

分类规则：
- SOUL项目、代码开发、紧急修复 → 重要紧急
- 文档编写、模板开发、学习研究 → 重要不紧急
- 日常维护、小工具 → 不重要紧急
- 其他 → 不重要不紧急

请根据文件内容推断具体做了什么工作，不要只写"处理文件"，要总结实际工作内容。
"""

    try:
        response = requests.post(
            GEMINI_URL,
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.3}
            },
            timeout=60
        )
        
        result = response.json()
        text = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
        text = text.strip()
        
        # 提取JSON
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0]
        elif '```' in text:
            text = text.split('```')[1].split('```')[0]
        
        return json.loads(text)
    except Exception as e:
        print(f"  AI总结失败: {e}")
        return None

def collect_day_info(date_str):
    """收集某天的文件信息"""
    files = get_files_on_date(date_str)
    
    if not files:
        return None, 0
    
    # 构建文件信息
    files_info = []
    for f in files[:30]:  # 最多30个文件
        fname = os.path.basename(f)
        # 根据文件类型决定是否读取内容
        if f.endswith('.md'):
            content = read_file_content(f, 500)
            # 提取标题
            lines = content.split('\n')
            title = ""
            for line in lines[:5]:
                if line.startswith('#'):
                    title = line.strip('#').strip()
                    break
            files_info.append(f"- {fname}: {title or '(文档)'}")
        elif f.endswith('.py'):
            content = read_file_content(f, 300)
            # 提取docstring
            if '"""' in content:
                doc = content.split('"""')[1].split('"""')[0].strip()[:100]
                files_info.append(f"- {fname}: {doc}")
            else:
                files_info.append(f"- {fname}: Python脚本")
        else:
            files_info.append(f"- {fname}")
    
    return "\n".join(files_info), len(files)

def process_day(day, month=1, year=2026):
    """处理某一天"""
    date_str = f"{year}-{month:02d}-{day:02d}"
    print(f"\n📅 处理 {month}月{day}日...")
    
    files_info, file_count = collect_day_info(date_str)
    
    if not files_info:
        print(f"  无文件记录")
        return None
    
    print(f"  找到 {file_count} 个文件，正在AI总结...")
    
    result = summarize_with_ai(files_info, f"{month}月{day}日")
    
    if result:
        print(f"  ✅ 总结完成: {result.get('summary', '')[:50]}...")
        return result
    
    return None

def main():
    """主函数"""
    results = {}
    
    # 处理1月1日到25日
    for day in range(1, 26):
        result = process_day(day)
        if result:
            results[day] = result
    
    # 保存结果
    output_file = os.path.join(os.path.dirname(__file__), 'ai_summaries.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 结果保存到: {output_file}")
    return results

if __name__ == "__main__":
    main()
