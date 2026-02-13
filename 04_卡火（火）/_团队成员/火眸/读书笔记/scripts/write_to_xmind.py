#!/usr/bin/env python3
"""
读书笔记写入 XMind 脚本
将五行结构化的读书笔记写入 XMind 文件

用法:
    python write_to_xmind.py "书名" "作者" "分类" [--test]
    
示例:
    python write_to_xmind.py "厚黑学" "李宗吾" "商业思维"
"""

import json
import os
import shutil
import zipfile
import uuid
import sys
from datetime import datetime

# XMind 文件路径
XMIND_PATH = "/Users/karuo/Documents/我的脑图/5 学习/读书笔记.xmind"

# 分类映射
CATEGORIES = {
    "个人提升": "一、个人提升",
    "人际关系": "二、人际关系", 
    "创业": "三、创业",
    "商业思维": "四、商业思维",
    "投资": "五、投资"
}

# 五行颜色标记
MARKERS = {
    "金": "flag-yellow",
    "水": "flag-blue",
    "木": "flag-green",
    "火": "flag-red",
    "土": "flag-orange"
}

def gen_id():
    """生成 XMind 节点 ID（26位混合字母数字格式）"""
    import random
    import string
    chars = string.ascii_lowercase + string.digits
    return ''.join(random.choice(chars) for _ in range(26))

def create_book_sheet(book_name, author, note_data=None):
    """
    创建书籍标签页结构
    
    Args:
        book_name: 书名
        author: 作者
        note_data: 笔记数据字典（可选，用于填充内容）
    
    Returns:
        tuple: (sheet结构, sheet_id, root_id)  # 返回root_id用于链接
    """
    sheet_id = str(uuid.uuid4())  # sheet用标准UUID格式
    root_id = gen_id()  # rootTopic用26位格式
    
    # 默认笔记数据
    if note_data is None:
        note_data = {
            "summary": "待填写一句话总结",
            "gold": ["金-1：待填写", "金-2：待填写", "金-3：待填写", "金-4：待填写"],
            "water": ["水-1：待填写", "水-2：待填写", "水-3：待填写", "水-4：待填写"],
            "wood": ["木-1：待填写", "木-2：待填写", "木-3：待填写", "木-4：待填写"],
            "fire": ["火-1：待填写", "火-2：待填写", "火-3：待填写", "火-4：待填写"],
            "earth": ["土-1：待填写", "土-2：待填写", "土-3：待填写", "土-4：待填写"],
            "questions": [],
            "characters": [],
            "quotes": [],
            "keywords": [],
            "process": "",
            "rules": ""
        }
    
    def create_element_node(name, marker, items, description=""):
        """创建五行元素节点"""
        children = []
        if description:
            children.append({
                "id": gen_id(),
                "title": description
            })
        for item in items:
            children.append({
                "id": gen_id(),
                "title": item
            })
        return {
            "id": gen_id(),
            "title": name,
            "markers": [{"markerId": marker}],
            "children": {"attached": children} if children else {}
        }
    
    sheet = {
        "id": sheet_id,
        "class": "sheet",
        "title": f"《{book_name}》- {author}",
        "rootTopic": {
            "id": root_id,
            "class": "topic",
            "title": f"《{book_name}》- {author}",
            "structureClass": "org.xmind.ui.map.unbalanced",
            "children": {
                "attached": [
                    # 一句话总结
                    {
                        "id": gen_id(),
                        "title": "一句话总结",
                        "children": {
                            "attached": [
                                {"id": gen_id(), "title": note_data.get("summary", "待填写")}
                            ]
                        }
                    },
                    # 金
                    create_element_node("金", MARKERS["金"], note_data.get("gold", []), "定位与角色：是谁、给谁、站在什么位置上"),
                    # 水
                    create_element_node("水", MARKERS["水"], note_data.get("water", []), "经历与路径：事情是怎么发生的"),
                    # 木
                    create_element_node("木", MARKERS["木"], note_data.get("wood", []), "方法与产出：具体怎么干、能产出什么"),
                    # 火
                    create_element_node("火", MARKERS["火"], note_data.get("fire", []), "认知与判断：为什么这么想、怎么判断对错"),
                    # 土
                    create_element_node("土", MARKERS["土"], note_data.get("earth", []), "系统与沉淀：如何长期稳定、不崩盘"),
                    # 问题与解答
                    {
                        "id": gen_id(),
                        "title": "问题与解答",
                        "children": {
                            "attached": [{"id": gen_id(), "title": q} for q in note_data.get("questions", ["待填写"])]
                        }
                    },
                    # 人物分析
                    {
                        "id": gen_id(),
                        "title": "人物分析",
                        "children": {
                            "attached": [{"id": gen_id(), "title": c} for c in note_data.get("characters", ["待填写"])]
                        }
                    },
                    # 金句与关键词
                    {
                        "id": gen_id(),
                        "title": "金句与关键词",
                        "children": {
                            "attached": [
                                {"id": gen_id(), "title": "金句", "children": {"attached": [{"id": gen_id(), "title": q} for q in note_data.get("quotes", ["待填写"])]}},
                                {"id": gen_id(), "title": "关键词", "children": {"attached": [{"id": gen_id(), "title": k} for k in note_data.get("keywords", ["待填写"])]}}
                            ]
                        }
                    },
                    # 流程图示
                    {
                        "id": gen_id(),
                        "title": "流程图示",
                        "children": {
                            "attached": [{"id": gen_id(), "title": note_data.get("process", "待填写")}]
                        }
                    },
                    # 使用规则
                    {
                        "id": gen_id(),
                        "title": "使用规则",
                        "children": {
                            "attached": [{"id": gen_id(), "title": note_data.get("rules", "待填写")}]
                        }
                    }
                ]
            }
        }
    }
    
    return sheet, sheet_id, root_id

def add_link_to_category(topics, category_title, book_name, author, sheet_id):
    """
    在主图的指定分类下添加书籍链接
    
    Args:
        topics: XMind topics 列表
        category_title: 分类标题（如"三、创业"）
        book_name: 书名
        author: 作者
        sheet_id: 目标标签页 ID
    
    Returns:
        bool: 是否成功添加
    """
    for topic in topics:
        if topic.get('title') == category_title:
            if 'children' not in topic:
                topic['children'] = {'attached': []}
            if 'attached' not in topic['children']:
                topic['children']['attached'] = []
            
            # 检查是否已存在
            link_title = f"《{book_name}》- {author}"
            for child in topic['children']['attached']:
                if child.get('title') == link_title:
                    print(f"⚠️ 链接已存在: {link_title}")
                    return True
            
            # 添加链接
            topic['children']['attached'].append({
                "id": gen_id(),
                "title": link_title,
                "href": f"xmind:#{sheet_id}"
            })
            print(f"✅ 已添加链接: {link_title} → {category_title}")
            return True
        
        # 递归搜索子节点
        children = topic.get('children', {}).get('attached', [])
        if add_link_to_category(children, category_title, book_name, author, sheet_id):
            return True
    
    return False

def write_book_to_xmind(book_name, author, category, note_data=None, test_mode=False):
    """
    将书籍笔记写入 XMind 文件
    
    Args:
        book_name: 书名
        author: 作者
        category: 分类（个人提升/人际关系/创业/商业思维/投资）
        note_data: 笔记数据字典（可选）
        test_mode: 测试模式，不实际写入文件
    
    Returns:
        bool: 是否成功
    """
    # 验证分类
    if category not in CATEGORIES:
        print(f"❌ 无效分类: {category}")
        print(f"   可用分类: {', '.join(CATEGORIES.keys())}")
        return False
    
    category_title = CATEGORIES[category]
    
    # 检查 XMind 文件
    if not os.path.exists(XMIND_PATH):
        print(f"❌ XMind 文件不存在: {XMIND_PATH}")
        return False
    
    # 创建临时目录
    tmp_dir = f"/tmp/xmind_edit_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    os.makedirs(tmp_dir, exist_ok=True)
    
    try:
        # 解压 XMind 文件
        print(f"📦 解压 XMind 文件...")
        with zipfile.ZipFile(XMIND_PATH, 'r') as zf:
            zf.extractall(tmp_dir)
        
        # 读取 content.json
        content_path = os.path.join(tmp_dir, 'content.json')
        with open(content_path, 'r', encoding='utf-8') as f:
            content = json.load(f)
        
        # 创建书籍标签页
        print(f"📝 创建标签页: 《{book_name}》- {author}")
        book_sheet, sheet_id, root_id = create_book_sheet(book_name, author, note_data)
        
        # 检查是否已存在同名标签页
        sheet_title = f"《{book_name}》- {author}"
        for sheet in content:
            if sheet.get('title') == sheet_title:
                print(f"⚠️ 标签页已存在: {sheet_title}")
                return False
        
        # 添加标签页
        content.append(book_sheet)
        
        # 在主图添加链接
        main_sheet = content[0]
        main_topics = main_sheet.get('rootTopic', {}).get('children', {}).get('attached', [])
        
        # 链接应该指向 rootTopic.id 而不是 sheet.id
        if not add_link_to_category(main_topics, category_title, book_name, author, root_id):
            print(f"⚠️ 未找到分类: {category_title}")
        
        if test_mode:
            print(f"\n🧪 测试模式 - 不写入文件")
            print(f"   将添加标签页: {sheet_title}")
            print(f"   将添加到分类: {category_title}")
            return True
        
        # 写回 content.json
        with open(content_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
        
        # 重新打包 XMind 文件
        print(f"📦 重新打包 XMind 文件...")
        
        # 创建新的 XMind 文件（不再备份）
        with zipfile.ZipFile(XMIND_PATH, 'w', zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(tmp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, tmp_dir)
                    zf.write(file_path, arcname)
        
        print(f"\n✅ 成功写入 XMind!")
        print(f"   标签页: {sheet_title}")
        print(f"   分类: {category_title}")
        print(f"   文件: {XMIND_PATH}")
        
        return True
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # 清理临时目录
        if os.path.exists(tmp_dir):
            shutil.rmtree(tmp_dir)

def main():
    """命令行入口"""
    if len(sys.argv) < 4:
        print("用法: python write_to_xmind.py <书名> <作者> <分类> [--test]")
        print("分类: 个人提升 | 人际关系 | 创业 | 商业思维 | 投资")
        print("\n示例:")
        print('  python write_to_xmind.py "厚黑学" "李宗吾" "商业思维"')
        print('  python write_to_xmind.py "原则" "瑞·达利欧" "投资" --test')
        sys.exit(1)
    
    book_name = sys.argv[1]
    author = sys.argv[2]
    category = sys.argv[3]
    test_mode = "--test" in sys.argv
    
    write_book_to_xmind(book_name, author, category, test_mode=test_mode)

if __name__ == '__main__':
    main()
