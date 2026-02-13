#!/usr/bin/env python3
"""
飞书智能写入工具 v2.0
- 自动使用已保存的token
- 搜索本月/当天是否已存在
- 使用正确的飞书表格格式（左右分栏、可打勾）
- 最新日期插入到最前面
"""
import os
import json
import requests
from datetime import datetime

# 配置
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
            with open(path, 'r', encoding='utf-8') as f:
                tokens = json.load(f)
                print(f"✅ Token: {tokens.get('name', '未知')}")
                return tokens
    return {}

def save_tokens(tokens):
    with open(TOKEN_PATHS[0], 'w', encoding='utf-8') as f:
        json.dump(tokens, f, ensure_ascii=False, indent=2)

def get_app_token():
    url = "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal/"
    r = requests.post(url, json={"app_id": CONFIG['APP_ID'], "app_secret": CONFIG['APP_SECRET']}, timeout=10)
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
        json={"grant_type": "refresh_token", "refresh_token": tokens['refresh_token']},
        timeout=10
    )
    result = r.json()
    if result.get('code') == 0:
        data = result.get('data', {})
        tokens['access_token'] = data.get('access_token')
        tokens['refresh_token'] = data.get('refresh_token')
        save_tokens(tokens)
        print("✅ Token已刷新")
        return tokens['access_token']
    return None

def api(method, endpoint, token, data=None, params=None):
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    url = f'https://open.feishu.cn/open-apis{endpoint}'
    if method == 'GET':
        r = requests.get(url, headers=headers, params=params, timeout=30)
    elif method == 'DELETE':
        r = requests.delete(url, headers=headers, timeout=30)
    else:
        r = requests.post(url, headers=headers, json=data, timeout=30)
    return r.json()

def get_all_blocks(doc_id, token):
    """获取文档所有块"""
    all_items = []
    page_token = None
    while True:
        params = {'page_size': 100}
        if page_token:
            params['page_token'] = page_token
        result = api('GET', f'/docx/v1/documents/{doc_id}/blocks', token, params=params)
        if result.get('code') == 0:
            items = result.get('data', {}).get('items', [])
            all_items.extend(items)
            page_token = result.get('data', {}).get('page_token')
            if not page_token:
                break
        else:
            break
    return all_items

def find_date_block(blocks, date_str):
    """查找是否已有该日期的块"""
    for block in blocks:
        content = ""
        for key in ['heading4', 'text']:
            if key in block:
                elements = block[key].get('elements', [])
                for el in elements:
                    if 'text_run' in el:
                        content += el['text_run'].get('content', '')
        if date_str in content:
            return block
    return None

def find_insert_position(blocks, parent_id):
    """找到"金、本月最重要的任务"后面的第一个位置"""
    for i, block in enumerate(blocks):
        content = ""
        for key in ['heading2']:
            if key in block:
                elements = block[key].get('elements', [])
                for el in elements:
                    if 'text_run' in el:
                        content += el['text_run'].get('content', '')
        if '本月最重要的任务' in content:
            # 返回这个块的ID和索引，在它后面插入
            return block.get('block_id'), i
    return parent_id, 0

def delete_blocks(doc_id, block_ids, token):
    """删除指定的块"""
    for block_id in block_ids:
        result = api('DELETE', f'/docx/v1/documents/{doc_id}/blocks/{block_id}', token)
        print(f"删除块 {block_id[:8]}...: {result.get('code') == 0}")

def create_children(doc_id, parent_id, children, token, index=None):
    """在指定位置创建子块"""
    data = {"children": children}
    if index is not None:
        data["index"] = index
    return api('POST', f'/docx/v1/documents/{doc_id}/blocks/{parent_id}/children', token, data)

def build_task_blocks(date_str, tasks):
    """构建任务块 - 使用正确的飞书格式"""
    blocks = []
    
    # 1. 日期标题 (heading4, type=6)
    blocks.append({
        "block_type": 6,
        "heading4": {
            "elements": [{
                "text_run": {
                    "content": date_str,
                    "text_element_style": {}
                }
            }],
            "style": {"align": 1}
        }
    })
    
    # 2. 执行标签 (callout, type=19)
    blocks.append({
        "block_type": 19,
        "callout": {
            "emoji_id": "sunrise",
            "background_color": 2,
            "border_color": 2
        }
    })
    
    # 3. 分栏容器 (grid, type=24)
    blocks.append({
        "block_type": 24,
        "grid": {
            "column_size": 2
        }
    })
    
    return blocks

def build_callout_content():
    """callout内的文字"""
    return {
        "block_type": 2,
        "text": {
            "elements": [{
                "text_run": {
                    "content": "[执行]",
                    "text_element_style": {"bold": True, "text_color": 7}
                }
            }],
            "style": {"align": 1}
        }
    }

def build_column_content(quadrant, tasks_in_quadrant):
    """构建一个栏的内容"""
    blocks = []
    
    # 象限标题
    color_map = {
        "重要紧急": 5,      # 蓝色
        "重要不紧急": 3,    # 绿色
        "不重要紧急": 6,    # 橙色
        "不重要不紧急": 4   # 灰色
    }
    
    blocks.append({
        "block_type": 2,
        "text": {
            "elements": [{
                "text_run": {
                    "content": f"[{quadrant}]",
                    "text_element_style": {"bold": True, "text_color": color_map.get(quadrant, 1)}
                }
            }],
            "style": {"align": 1}
        }
    })
    
    for task in tasks_in_quadrant:
        # 人物和事件 (todo, type=17)
        events_str = "、".join(task['events'])
        blocks.append({
            "block_type": 17,
            "todo": {
                "elements": [{
                    "text_run": {
                        "content": f"{task['person']}（{events_str}）",
                        "text_element_style": {}
                    }
                }],
                "style": {"done": False, "align": 1}
            }
        })
        
        # { 开始
        blocks.append({
            "block_type": 2,
            "text": {
                "elements": [{"text_run": {"content": "{", "text_element_style": {}}}],
                "style": {}
            }
        })
        
        # TNTWF内容
        for label, items in [
            ("T", task.get('t_targets', [])),
            ("N", task.get('n_process', [])),
            ("T", task.get('t_thoughts', [])),
            ("W", task.get('w_work', [])),
            ("F", task.get('f_feedback', []))
        ]:
            if items:
                # 标签
                blocks.append({
                    "block_type": 2,
                    "text": {
                        "elements": [{"text_run": {"content": label, "text_element_style": {"bold": True}}}],
                        "style": {}
                    }
                })
                # 每个项目用todo
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
            "text": {
                "elements": [{"text_run": {"content": "}", "text_element_style": {}}}],
                "style": {}
            }
        })
    
    return blocks

def smart_write(wiki_url, date_str, tasks):
    """智能写入飞书知识库"""
    # 加载并刷新token
    tokens = load_tokens()
    if not tokens.get('access_token'):
        print("❌ 未找到token")
        return False
    
    print("🔄 刷新Token...")
    token = refresh_token(tokens)
    if not token:
        token = tokens['access_token']
    
    # 解析URL
    doc_id = wiki_url.rstrip('/').split('/')[-1]
    print(f"📄 文档ID: {doc_id}")
    
    # 获取所有块
    blocks = get_all_blocks(doc_id, token)
    print(f"📊 文档共 {len(blocks)} 个块")
    
    # 检查是否已有该日期
    existing = find_date_block(blocks, date_str)
    if existing:
        print(f"⚠️ 已存在 {date_str}，跳过写入")
        return True
    
    # 找到插入位置（"金、本月最重要的任务"后面）
    target_block_id, target_index = find_insert_position(blocks, doc_id)
    print(f"📍 插入位置: {target_block_id[:8]}... 后面")
    
    # 分类任务到四个象限
    left_quadrants = ["重要紧急", "不重要紧急"]
    right_quadrants = ["重要不紧急", "不重要不紧急"]
    
    left_tasks = [t for t in tasks if t.get('quadrant') in left_quadrants]
    right_tasks = [t for t in tasks if t.get('quadrant') in right_quadrants]
    
    # 构建主要块
    main_blocks = build_task_blocks(date_str, tasks)
    
    # 在文档根级别插入主块
    print("📝 写入主块...")
    result = create_children(doc_id, doc_id, main_blocks, token, target_index + 1)
    
    if result.get('code') != 0:
        print(f"❌ 写入失败: {result}")
        return False
    
    # 获取新创建的块ID
    new_blocks = result.get('data', {}).get('children', [])
    if len(new_blocks) < 3:
        print("❌ 创建块数量不足")
        return False
    
    callout_id = new_blocks[1].get('block_id')
    grid_id = new_blocks[2].get('block_id')
    
    # 在callout里添加[执行]文字
    callout_content = build_callout_content()
    api('POST', f'/docx/v1/documents/{doc_id}/blocks/{callout_id}/children', token, {"children": [callout_content]})
    
    # 在grid里添加两个column
    left_column = {
        "block_type": 25,
        "grid_column": {"width_ratio": 50}
    }
    right_column = {
        "block_type": 25,
        "grid_column": {"width_ratio": 50}
    }
    
    col_result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{grid_id}/children', token, {"children": [left_column, right_column]})
    
    if col_result.get('code') != 0:
        print(f"❌ 创建分栏失败: {col_result}")
        return False
    
    cols = col_result.get('data', {}).get('children', [])
    if len(cols) < 2:
        print("❌ 分栏创建不完整")
        return False
    
    left_col_id = cols[0].get('block_id')
    right_col_id = cols[1].get('block_id')
    
    # 在左栏添加内容
    for quadrant in left_quadrants:
        tasks_in_q = [t for t in tasks if t.get('quadrant') == quadrant]
        if tasks_in_q:
            content = build_column_content(quadrant, tasks_in_q)
            api('POST', f'/docx/v1/documents/{doc_id}/blocks/{left_col_id}/children', token, {"children": content})
    
    # 在右栏添加内容
    for quadrant in right_quadrants:
        tasks_in_q = [t for t in tasks if t.get('quadrant') == quadrant]
        if tasks_in_q:
            content = build_column_content(quadrant, tasks_in_q)
            api('POST', f'/docx/v1/documents/{doc_id}/blocks/{right_col_id}/children', token, {"children": content})
    
    print("✅ 写入成功！")
    return True

if __name__ == "__main__":
    # 今天的任务（简化版）
    today = datetime.now()
    date_str = f"{today.month}月{today.day}日"
    
    tasks = [
        {
            "person": "卡若",
            "events": ["荷电", "玩值", "知己"],
            "quadrant": "重要紧急",
            "t_targets": ["荷电→招商 💰", "玩值→一页纸 📄"],
            "n_process": ["五行文档12份"],
            "t_thoughts": ["何天全→快速落地"],
            "w_work": ["云阿米巴"],
            "f_feedback": ["荷电可招商 ✅"]
        },
        {
            "person": "卡火",
            "events": ["技能", "经验"],
            "quadrant": "重要不紧急",
            "t_targets": ["技能库→5个SKILL 📚"],
            "n_process": ["SKILL更新"],
            "t_thoughts": ["系统化沉淀"],
            "w_work": ["学习→转化"],
            "f_feedback": ["经验归档 ✅"]
        }
    ]
    
    wiki_url = "https://cunkebao.feishu.cn/wiki/JZiiwxEjHiRxouk8hSPcqBn6nrd"
    smart_write(wiki_url, date_str, tasks)
