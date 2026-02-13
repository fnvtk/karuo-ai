#!/usr/bin/env python3
"""
列出 XMind 读书笔记中的所有书籍

用法:
    python list_books.py
"""

import json
import os
import zipfile

XMIND_PATH = "/Users/karuo/Documents/我的脑图/5 学习/读书笔记.xmind"

def list_books():
    """列出所有书籍标签页"""
    if not os.path.exists(XMIND_PATH):
        print(f"❌ XMind 文件不存在: {XMIND_PATH}")
        return
    
    try:
        with zipfile.ZipFile(XMIND_PATH, 'r') as zf:
            content = json.loads(zf.read('content.json').decode('utf-8'))
        
        print("=" * 60)
        print("📚 读书笔记 - 书籍列表")
        print("=" * 60)
        
        # 主图是第一个 sheet
        main_sheet = content[0]
        print(f"\n📍 主导图: {main_sheet.get('title', '未命名')}")
        
        # 列出分类
        root_topics = main_sheet.get('rootTopic', {}).get('children', {}).get('attached', [])
        print("\n📂 分类:")
        for topic in root_topics:
            title = topic.get('title', '')
            if title.startswith(('一、', '二、', '三、', '四、', '五、')):
                children = topic.get('children', {}).get('attached', [])
                book_count = len([c for c in children if c.get('title', '').startswith('《')])
                print(f"   {title} ({book_count}本)")
                for child in children:
                    child_title = child.get('title', '')
                    if child_title.startswith('《'):
                        href = child.get('href', '')
                        link_mark = "🔗" if href else "📄"
                        print(f"      {link_mark} {child_title}")
        
        # 书籍标签页（跳过主图）
        print("\n📑 书籍标签页:")
        book_sheets = [s for s in content[1:] if s.get('title', '').startswith('《')]
        
        if not book_sheets:
            print("   (暂无)")
        else:
            for i, sheet in enumerate(book_sheets, 1):
                print(f"   {i}. {sheet.get('title', '未命名')}")
        
        print("\n" + "=" * 60)
        print(f"📊 统计: 共 {len(book_sheets)} 本书籍")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ 错误: {e}")

if __name__ == '__main__':
    list_books()
