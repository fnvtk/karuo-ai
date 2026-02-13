#!/usr/bin/env python3
"""
解析 AI 输出的五行拆书内容，转换为 XMind 数据格式

用法:
    python parse_ai_output.py <ai_output_file> <书名> <作者> <分类>
    
示例:
    python parse_ai_output.py /tmp/book_notes.md "原则" "瑞·达利欧" "投资"
"""

import re
import sys
import json

def parse_section(text, section_name):
    """提取指定章节的内容"""
    pattern = rf"##\s*{section_name}.*?\n(.*?)(?=\n##|\Z)"
    match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return ""

def parse_list_items(text):
    """提取列表项"""
    items = []
    for line in text.split('\n'):
        line = line.strip()
        if line.startswith(('-', '*', '•')):
            item = line.lstrip('-*• ').strip()
            if item:
                items.append(item)
    return items

def parse_element_items(text, element_prefix):
    """提取五行元素的子项"""
    items = []
    pattern = rf"\*\*{element_prefix}-\d[：:](.*?)\*\*"
    matches = re.findall(pattern, text)
    for match in matches:
        items.append(f"{element_prefix}: {match.strip()}")
    
    if not items:
        # 备用解析方式
        for line in text.split('\n'):
            if f"{element_prefix}-" in line:
                items.append(line.strip().lstrip('-*• '))
    
    return items[:4] if items else [f"{element_prefix}-1：待填写", f"{element_prefix}-2：待填写", 
                                      f"{element_prefix}-3：待填写", f"{element_prefix}-4：待填写"]

def parse_ai_output(content):
    """
    解析 AI 输出的五行拆书内容
    
    Args:
        content: AI 输出的文本内容
    
    Returns:
        dict: XMind 笔记数据格式
    """
    note_data = {
        "summary": "",
        "gold": [],
        "water": [],
        "wood": [],
        "fire": [],
        "earth": [],
        "questions": [],
        "characters": [],
        "quotes": [],
        "keywords": [],
        "process": "",
        "rules": ""
    }
    
    # 一句话总结
    summary_section = parse_section(content, "一、全书一句话总结|一句话总结")
    if summary_section:
        # 提取"这是一本..."格式
        match = re.search(r"这是一本[^。\n]+", summary_section)
        if match:
            note_data["summary"] = match.group(0)
        else:
            note_data["summary"] = summary_section.split('\n')[0].strip()
    
    # 五行元素
    gold_section = parse_section(content, "金（定位与角色）|### 金")
    note_data["gold"] = parse_element_items(gold_section, "金") if gold_section else ["金-1：待填写"]*4
    
    water_section = parse_section(content, "水（经历与路径）|### 水")
    note_data["water"] = parse_element_items(water_section, "水") if water_section else ["水-1：待填写"]*4
    
    wood_section = parse_section(content, "木（方法与产出）|### 木")
    note_data["wood"] = parse_element_items(wood_section, "木") if wood_section else ["木-1：待填写"]*4
    
    fire_section = parse_section(content, "火（认知与判断）|### 火")
    note_data["fire"] = parse_element_items(fire_section, "火") if fire_section else ["火-1：待填写"]*4
    
    earth_section = parse_section(content, "土（系统与沉淀）|### 土")
    note_data["earth"] = parse_element_items(earth_section, "土") if earth_section else ["土-1：待填写"]*4
    
    # 问题与解答
    qa_section = parse_section(content, "三、问题与解答|问题与解答")
    if qa_section:
        questions = parse_list_items(qa_section)
        note_data["questions"] = questions[:5] if questions else ["待填写"]
    
    # 人物分析
    char_section = parse_section(content, "四、人物分析|人物分析")
    if char_section:
        characters = parse_list_items(char_section)
        note_data["characters"] = characters[:10] if characters else ["待填写"]
    
    # 金句与关键词
    quotes_section = parse_section(content, "五、金句与关键词|金句与关键词")
    if quotes_section:
        all_items = parse_list_items(quotes_section)
        # 尝试分离金句和关键词
        note_data["quotes"] = all_items[:5] if all_items else ["待填写"]
        note_data["keywords"] = all_items[5:10] if len(all_items) > 5 else ["待填写"]
    
    # 流程图示
    process_section = parse_section(content, "六、流程|流程图示")
    if process_section:
        note_data["process"] = process_section.strip()[:500]  # 限制长度
    
    # 使用规则
    rules_section = parse_section(content, "七、适合什么人看|使用规则")
    if rules_section:
        note_data["rules"] = rules_section.strip()[:500]
    
    return note_data

def main():
    """命令行入口"""
    if len(sys.argv) < 5:
        print("用法: python parse_ai_output.py <ai_output_file> <书名> <作者> <分类>")
        print("示例: python parse_ai_output.py /tmp/notes.md \"原则\" \"瑞·达利欧\" \"投资\"")
        sys.exit(1)
    
    input_file = sys.argv[1]
    book_name = sys.argv[2]
    author = sys.argv[3]
    category = sys.argv[4]
    
    # 读取 AI 输出
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 解析内容
    note_data = parse_ai_output(content)
    
    print(f"📖 书籍: 《{book_name}》- {author}")
    print(f"📂 分类: {category}")
    print(f"\n📝 解析结果:")
    print(json.dumps(note_data, ensure_ascii=False, indent=2))
    
    # 写入 XMind
    print(f"\n是否写入 XMind? (y/N): ", end="")
    response = input().strip().lower()
    if response == 'y':
        from write_to_xmind import write_book_to_xmind
        write_book_to_xmind(book_name, author, category, note_data)
    else:
        print("已取消")

if __name__ == '__main__':
    main()
