#!/usr/bin/env python3
"""
飞书任务写入 - 四象限分栏版
使用grid实现左右分栏的艾森豪威尔矩阵
"""
import os
import json
import requests
from datetime import datetime

CONFIG = {
    'APP_ID': 'cli_a48818290ef8100d',
    'APP_SECRET': 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4'
}

TOKEN_PATHS = [
    os.path.join(os.path.dirname(__file__), '.feishu_tokens.json'),
    '/Users/karuo/Documents/开发/4、小工具/飞书工具箱/backend/.feishu_tokens.json'
]

def load_tokens():
    for path in TOKEN_PATHS:
        if os.path.exists(path):
            with open(path, 'r') as f:
                return json.load(f)
    return {}

def save_tokens(tokens):
    with open(TOKEN_PATHS[0], 'w') as f:
        json.dump(tokens, f, ensure_ascii=False, indent=2)

def get_app_token():
    r = requests.post("https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal/",
        json={"app_id": CONFIG['APP_ID'], "app_secret": CONFIG['APP_SECRET']}, timeout=10)
    data = r.json()
    return data.get('app_access_token') if data.get('code') == 0 else None

def refresh_token(tokens):
    if not tokens.get('refresh_token'):
        return None
    app_token = get_app_token()
    if not app_token:
        return None
    r = requests.post(
        "https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token",
        headers={"Authorization": f"Bearer {app_token}", "Content-Type": "application/json"},
        json={"grant_type": "refresh_token", "refresh_token": tokens['refresh_token']}, timeout=10)
    result = r.json()
    if result.get('code') == 0:
        data = result.get('data', {})
        tokens['access_token'] = data.get('access_token')
        tokens['refresh_token'] = data.get('refresh_token')
        save_tokens(tokens)
        return tokens['access_token']
    return None

def api(method, endpoint, token, data=None, params=None):
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    url = f'https://open.feishu.cn/open-apis{endpoint}'
    if method == 'GET':
        r = requests.get(url, headers=headers, params=params, timeout=30)
    else:
        r = requests.post(url, headers=headers, json=data, timeout=30)
    return r.json()

def get_blocks(doc_id, token):
    result = api('GET', f'/docx/v1/documents/{doc_id}/blocks', token, params={'page_size': 200})
    return result.get('data', {}).get('items', []) if result.get('code') == 0 else []

def find_date(blocks, date_str):
    for block in blocks:
        for key in ['heading4', 'heading2', 'text']:
            if key in block:
                for el in block[key].get('elements', []):
                    if 'text_run' in el and date_str in el['text_run'].get('content', ''):
                        return block
    return None

def find_insert_index(blocks, doc_id):
    for i, block in enumerate(blocks):
        if block.get('parent_id') == doc_id:
            for key in ['heading2']:
                if key in block:
                    for el in block[key].get('elements', []):
                        if 'text_run' in el and '本月最重要的任务' in el['text_run'].get('content', ''):
                            return i + 1
    return 1

def build_quadrant_content(quadrant, tasks_in_q):
    """构建一个象限的内容块"""
    blocks = []
    
    color_map = {"重要紧急": 5, "重要不紧急": 3, "不重要紧急": 6, "不重要不紧急": 4}
    
    # 象限标题
    blocks.append({
        "block_type": 2,
        "text": {
            "elements": [{"text_run": {"content": f"[{quadrant}]", "text_element_style": {"bold": True, "text_color": color_map.get(quadrant, 1)}}}],
            "style": {"align": 1}
        }
    })
    
    for task in tasks_in_q:
        # 人物任务 - todo可打勾
        events = "、".join(task['events'])
        blocks.append({
            "block_type": 17,
            "todo": {
                "elements": [{"text_run": {"content": f"{task['person']}（{events}）", "text_element_style": {}}}],
                "style": {"done": False, "align": 1}
            }
        })
        
        # { 开始
        blocks.append({
            "block_type": 2,
            "text": {"elements": [{"text_run": {"content": "{", "text_element_style": {}}}], "style": {}}
        })
        
        # TNTWF简化版
        labels = [("T", task.get('t_targets', [])), ("N", task.get('n_process', [])),
                  ("T", task.get('t_thoughts', [])), ("W", task.get('w_work', [])),
                  ("F", task.get('f_feedback', []))]
        
        for label, items in labels:
            if items:
                blocks.append({
                    "block_type": 2,
                    "text": {"elements": [{"text_run": {"content": label, "text_element_style": {"bold": True}}}], "style": {}}
                })
                for item in items:
                    blocks.append({
                        "block_type": 17,
                        "todo": {
                            "elements": [{"text_run": {"content": item, "text_element_style": {}}}],
                            "style": {"done": False}
                        }
                    })
        
        # } 结束
        blocks.append({
            "block_type": 2,
            "text": {"elements": [{"text_run": {"content": "}", "text_element_style": {}}}], "style": {}}
        })
    
    # 如果没有任务，添加空占位
    if not tasks_in_q:
        blocks.append({
            "block_type": 2,
            "text": {"elements": [{"text_run": {"content": "", "text_element_style": {}}}], "style": {}}
        })
    
    return blocks

def write_with_grid(wiki_url, date_str, tasks):
    """使用grid分栏写入任务"""
    tokens = load_tokens()
    if not tokens.get('access_token'):
        print("❌ 未找到token")
        return False
    
    print("🔄 刷新Token...")
    token = refresh_token(tokens)
    if not token:
        token = tokens['access_token']
    else:
        print("✅ Token已刷新")
    
    doc_id = wiki_url.rstrip('/').split('/')[-1]
    print(f"📄 文档: {doc_id}")
    
    blocks = get_blocks(doc_id, token)
    print(f"📊 共 {len(blocks)} 个块")
    
    # 检查日期是否存在
    if find_date(blocks, date_str):
        print(f"⚠️ {date_str} 已存在，跳过")
        return True
    
    # 找插入位置
    insert_index = find_insert_index(blocks, doc_id)
    print(f"📍 插入位置: 索引 {insert_index}")
    
    # 第一步：创建日期标题 + callout + grid框架
    main_blocks = [
        # 日期标题
        {
            "block_type": 6,
            "heading4": {
                "elements": [{"text_run": {"content": f"{date_str}  ", "text_element_style": {}}}],
                "style": {"align": 1}
            }
        },
        # 执行callout
        {
            "block_type": 19,
            "callout": {
                "emoji_id": "sunrise",
                "background_color": 2,
                "border_color": 2,
                "elements": [{"text_run": {"content": "[执行]", "text_element_style": {"bold": True, "text_color": 7}}}]
            }
        },
        # Grid分栏 - 先创建空的grid
        {
            "block_type": 24,
            "grid": {
                "column_size": 2
            }
        }
    ]
    
    print("📝 创建主框架...")
    result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', token, {
        "children": main_blocks,
        "index": insert_index
    })
    
    if result.get('code') != 0:
        print(f"❌ 创建主框架失败: {result}")
        return False
    
    new_blocks = result.get('data', {}).get('children', [])
    if len(new_blocks) < 3:
        print("❌ 创建块数量不足")
        return False
    
    grid_id = new_blocks[2].get('block_id')
    print(f"📦 Grid ID: {grid_id}")
    
    # 第二步：在grid中创建两个column
    # 注意：飞书API会自动在grid中创建column，我们需要获取它们
    # 重新获取blocks来找到column
    blocks = get_blocks(doc_id, token)
    
    # 找到grid的子块
    left_col_id = None
    right_col_id = None
    for b in blocks:
        if b.get('parent_id') == grid_id and b.get('block_type') == 25:
            if left_col_id is None:
                left_col_id = b.get('block_id')
            else:
                right_col_id = b.get('block_id')
    
    if not left_col_id or not right_col_id:
        print("⚠️ Grid columns未自动创建，尝试手动创建...")
        # 尝试手动创建columns（可能不支持）
        col_result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{grid_id}/children', token, {
            "children": [
                {"block_type": 25, "grid_column": {"width_ratio": 50}},
                {"block_type": 25, "grid_column": {"width_ratio": 50}}
            ]
        })
        if col_result.get('code') != 0:
            print(f"❌ 创建columns失败: {col_result}")
            # 降级为非分栏模式
            print("⚠️ 降级为普通模式...")
            return write_fallback(doc_id, token, date_str, tasks, insert_index + 3)
        
        cols = col_result.get('data', {}).get('children', [])
        if len(cols) >= 2:
            left_col_id = cols[0].get('block_id')
            right_col_id = cols[1].get('block_id')
    
    print(f"📊 左栏: {left_col_id}, 右栏: {right_col_id}")
    
    # 第三步：往左栏添加内容（重要紧急 + 不重要紧急）
    left_quadrants = ["重要紧急", "不重要紧急"]
    for quadrant in left_quadrants:
        tasks_in_q = [t for t in tasks if t.get('quadrant') == quadrant]
        content = build_quadrant_content(quadrant, tasks_in_q)
        result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{left_col_id}/children', token, {"children": content})
        if result.get('code') == 0:
            print(f"✅ 左栏[{quadrant}]写入成功")
        else:
            print(f"⚠️ 左栏[{quadrant}]写入失败: {result.get('msg')}")
    
    # 第四步：往右栏添加内容（重要不紧急 + 不重要不紧急）
    right_quadrants = ["重要不紧急", "不重要不紧急"]
    for quadrant in right_quadrants:
        tasks_in_q = [t for t in tasks if t.get('quadrant') == quadrant]
        content = build_quadrant_content(quadrant, tasks_in_q)
        result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{right_col_id}/children', token, {"children": content})
        if result.get('code') == 0:
            print(f"✅ 右栏[{quadrant}]写入成功")
        else:
            print(f"⚠️ 右栏[{quadrant}]写入失败: {result.get('msg')}")
    
    print("✅ 四象限分栏写入完成!")
    return True

def write_fallback(doc_id, token, date_str, tasks, start_index):
    """降级模式：不使用分栏"""
    print("使用降级模式写入...")
    # 直接在文档根级别写入所有象限
    all_blocks = []
    for quadrant in ["重要紧急", "重要不紧急", "不重要紧急", "不重要不紧急"]:
        tasks_in_q = [t for t in tasks if t.get('quadrant') == quadrant]
        if tasks_in_q:
            all_blocks.extend(build_quadrant_content(quadrant, tasks_in_q))
    
    result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', token, {
        "children": all_blocks,
        "index": start_index
    })
    return result.get('code') == 0

if __name__ == "__main__":
    import sys
    
    # 默认写入今天
    today = datetime.now()
    date_str = f"{today.month}月{today.day}日"
    
    # 测试任务
    tasks = [
        {
            "person": "卡若",
            "events": ["荷电", "玩值"],
            "quadrant": "重要紧急",
            "t_targets": ["荷电→招商 💰"],
            "n_process": ["五行文档"],
            "t_thoughts": ["快速落地"],
            "w_work": ["云阿米巴"],
            "f_feedback": ["可招商 ✅"]
        },
        {
            "person": "卡火",
            "events": ["技能", "经验"],
            "quadrant": "重要不紧急",
            "t_targets": ["技能库 📚"],
            "n_process": ["SKILL更新"],
            "t_thoughts": ["沉淀复用"],
            "w_work": ["学习转化"],
            "f_feedback": ["归档 ✅"]
        }
    ]
    
    wiki_url = "https://cunkebao.feishu.cn/wiki/JZiiwxEjHiRxouk8hSPcqBn6nrd"
    
    if len(sys.argv) > 1:
        date_str = sys.argv[1]
    
    write_with_grid(wiki_url, date_str, tasks)
