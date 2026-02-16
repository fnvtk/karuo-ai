#!/usr/bin/env python3
"""
从飞书知识库下载文档并转换为Markdown
"""
import os
import sys
import json
import requests
import re
from pathlib import Path

# 添加当前目录到路径
sys.path.insert(0, os.path.dirname(__file__))

# 导入飞书API
from feishu_api import get_token, api_get, refresh_token, load_tokens

# 加载token
load_tokens()

def extract_node_token(url):
    """从飞书URL中提取node_token"""
    # 格式: https://cunkebao.feishu.cn/wiki/V6y7wurMGi3wTmkDcOicffHDn1c
    match = re.search(r'/wiki/([A-Za-z0-9]+)', url)
    if match:
        return match.group(1)
    return None

def get_wiki_content(node_token):
    """获取飞书文档内容"""
    token = get_token()
    if not token:
        print("❌ 未授权，请先运行飞书工具箱授权")
        return None
    
    # 获取文档块
    result = api_get(f'/docx/v1/documents/{node_token}/blocks', {'page_size': 100})
    
    if result.get('code') != 0:
        print(f"❌ 获取文档失败: {result.get('msg')}")
        return None
    
    return result.get('data', {}).get('items', [])

def blocks_to_markdown(blocks):
    """将飞书文档块转换为Markdown"""
    markdown = []
    
    for block in blocks:
        block_type = block.get('block_type')
        block_id = block.get('block_id', '')
        
        # 标题
        if block_type == 3:  # heading1
            text = extract_text(block.get('heading1', {}).get('elements', []))
            markdown.append(f"# {text}\n")
        elif block_type == 4:  # heading2
            text = extract_text(block.get('heading2', {}).get('elements', []))
            markdown.append(f"## {text}\n")
        elif block_type == 5:  # heading3
            text = extract_text(block.get('heading3', {}).get('elements', []))
            markdown.append(f"### {text}\n")
        elif block_type == 6:  # heading4
            text = extract_text(block.get('heading4', {}).get('elements', []))
            markdown.append(f"#### {text}\n")
        
        # 段落
        elif block_type == 2:  # text
            text = extract_text(block.get('text', {}).get('elements', []))
            if text.strip():
                markdown.append(f"{text}\n")
        
        # 列表
        elif block_type == 7:  # bullet
            text = extract_text(block.get('bullet', {}).get('elements', []))
            markdown.append(f"- {text}\n")
        elif block_type == 8:  # ordered
            text = extract_text(block.get('ordered', {}).get('elements', []))
            markdown.append(f"1. {text}\n")
        
        # 引用
        elif block_type == 11:  # quote
            text = extract_text(block.get('quote', {}).get('elements', []))
            markdown.append(f"> {text}\n")
        
        # 代码块
        elif block_type == 12:  # code
            code = block.get('code', {})
            language = code.get('language', '')
            text = extract_text(code.get('elements', []))
            markdown.append(f"```{language}\n{text}\n```\n")
        
        # 表格
        elif block_type == 31:  # table
            table = block.get('table', {})
            rows = table.get('rows', [])
            if rows:
                # 表头
                header = rows[0]
                header_cells = [extract_text(cell.get('elements', [])) for cell in header.get('cells', [])]
                markdown.append("| " + " | ".join(header_cells) + " |\n")
                markdown.append("| " + " | ".join(["---"] * len(header_cells)) + " |\n")
                
                # 数据行
                for row in rows[1:]:
                    cells = [extract_text(cell.get('elements', [])) for cell in row.get('cells', [])]
                    markdown.append("| " + " | ".join(cells) + " |\n")
        
        # 任务列表
        elif block_type == 17:  # todo
            todo = block.get('todo', {})
            text = extract_text(todo.get('elements', []))
            checked = "x" if todo.get('style', {}).get('done') else " "
            markdown.append(f"- [{checked}] {text}\n")
        
        # 高亮框
        elif block_type == 19:  # callout
            callout = block.get('callout', {})
            text = extract_text(callout.get('elements', []))
            markdown.append(f"> 💡 {text}\n")
        
        # 分割线
        elif block_type == 27:  # divider
            markdown.append("---\n")
        
        # 递归处理子块
        children = block.get('children', [])
        if children:
            child_md = blocks_to_markdown(children)
            markdown.extend(child_md)
    
    return markdown

def extract_text(elements):
    """从元素中提取文本"""
    text_parts = []
    for elem in elements:
        if 'text_run' in elem:
            content = elem['text_run'].get('content', '')
            style = elem['text_run'].get('text_element_style', {})
            
            # 处理样式
            if style.get('bold'):
                content = f"**{content}**"
            if style.get('italic'):
                content = f"*{content}*"
            if style.get('strikethrough'):
                content = f"~~{content}~~"
            
            text_parts.append(content)
        elif 'mention' in elem:
            mention = elem['mention']
            if mention.get('type') == 1:  # user
                text_parts.append(f"@{mention.get('user', {}).get('name', '')}")
            elif mention.get('type') == 2:  # doc
                text_parts.append(f"[{mention.get('doc', {}).get('title', '')}]")
    return ''.join(text_parts)

def download_wiki(url, output_dir=None):
    """下载飞书文档"""
    node_token = extract_node_token(url)
    if not node_token:
        print(f"❌ 无法从URL中提取node_token: {url}")
        return False
    
    print(f"📥 开始下载文档: {node_token}")
    
    # 获取文档内容
    blocks = get_wiki_content(node_token)
    if not blocks:
        return False
    
    # 转换为Markdown
    markdown_lines = blocks_to_markdown(blocks)
    markdown_content = ''.join(markdown_lines)
    
    # 保存文件
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        output_file = os.path.join(output_dir, f"{node_token}.md")
    else:
        output_file = f"{node_token}.md"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(markdown_content)
    
    print(f"✅ 文档已保存: {output_file}")
    print(f"📄 内容长度: {len(markdown_content)} 字符")
    
    return True

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法: python download_wiki.py <飞书URL> [输出目录]")
        print("示例: python download_wiki.py https://cunkebao.feishu.cn/wiki/V6y7wurMGi3wTmkDcOicffHDn1c")
        sys.exit(1)
    
    url = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None
    
    download_wiki(url, output_dir)
