#!/usr/bin/env python3
"""
批量写入1月工作记录到飞书
- 日期最新在前
- 跳过已存在的日期
- 正确处理中间日期插入
"""
import os
import json
import requests
from datetime import datetime
import time

CONFIG = {
    'APP_ID': 'cli_a48818290ef8100d',
    'APP_SECRET': 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4',
    'WIKI_URL': 'https://cunkebao.feishu.cn/wiki/JZiiwxEjHiRxouk8hSPcqBn6nrd'
}

TOKEN_PATHS = [
    os.path.join(os.path.dirname(__file__), '.feishu_tokens.json'),
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

def get_all_blocks(doc_id, token):
    all_blocks = []
    page_token = None
    while True:
        params = {'page_size': 200}
        if page_token:
            params['page_token'] = page_token
        result = api('GET', f'/docx/v1/documents/{doc_id}/blocks', token, params=params)
        if result.get('code') == 0:
            items = result.get('data', {}).get('items', [])
            all_blocks.extend(items)
            page_token = result.get('data', {}).get('page_token')
            if not page_token:
                break
        else:
            break
    return all_blocks

def get_existing_dates(blocks):
    """获取已存在的日期列表"""
    dates = []
    for block in blocks:
        if block.get('block_type') == 6:  # heading4
            content = ""
            for el in block.get('heading4', {}).get('elements', []):
                if 'text_run' in el:
                    content += el['text_run'].get('content', '')
            # 提取日期 如 "1月25日"
            import re
            match = re.search(r'(\d+)月(\d+)日', content)
            if match:
                month = int(match.group(1))
                day = int(match.group(2))
                dates.append((month, day))
    return dates

def find_insert_index_for_date(blocks, doc_id, month, day):
    """找到日期应该插入的位置（根级别索引）"""
    root_children = [b for b in blocks if b.get('parent_id') == doc_id]
    
    # 收集所有日期块的位置
    date_positions = []
    for i, block in enumerate(root_children):
        if block.get('block_type') == 6:  # heading4
            content = ""
            for el in block.get('heading4', {}).get('elements', []):
                if 'text_run' in el:
                    content += el['text_run'].get('content', '')
            import re
            match = re.search(r'(\d+)月\s*(\d+)日', content)
            if match:
                m = int(match.group(1))
                d = int(match.group(2))
                date_positions.append((i, m, d))
    
    if not date_positions:
        # 没有日期块，找到1月模板后面插入
        for i, block in enumerate(root_children):
            if block.get('block_type') == 4:  # heading2
                content = ""
                for el in block.get('heading2', {}).get('elements', []):
                    if 'text_run' in el:
                        content += el['text_run'].get('content', '')
                if '本月最重要的任务' in content and f'{month}月' in str(blocks):
                    return i + 1
        return 4  # 默认位置
    
    # 找到正确的插入位置（按日期从新到旧排序）
    target_value = month * 100 + day  # 如 1月25日 = 125
    
    for idx, m, d in date_positions:
        existing_value = m * 100 + d
        if target_value > existing_value:
            # 新日期比这个大，插入到这个前面
            return idx
    
    # 比所有日期都小，插入到最后一个日期后面
    return date_positions[-1][0] + 3  # 日期块+callout+grid = 3

def build_date_blocks(month, day, tasks):
    """构建日期块"""
    date_str = f"{month}月{day}日"
    
    blocks = [
        # 日期标题
        {
            "block_type": 6,
            "heading4": {
                "elements": [{"text_run": {"content": f"{date_str}  ", "text_element_style": {}}}],
                "style": {}
            }
        },
        # 执行callout
        {
            "block_type": 19,
            "callout": {
                "emoji_id": "sunrise",
                "background_color": 2,
                "border_color": 2,
                "elements": [{"text_run": {"content": "[执行]", "text_element_style": {"bold": True}}}]
            }
        },
        # Grid分栏
        {
            "block_type": 24,
            "grid": {"column_size": 2}
        }
    ]
    
    return blocks

def write_grid_content(token, doc_id, grid_id, tasks, blocks):
    """写入四象限内容"""
    # 获取grid的columns
    left_col_id = right_col_id = None
    for b in blocks:
        if b.get('parent_id') == grid_id and b.get('block_type') == 25:
            if left_col_id is None:
                left_col_id = b.get('block_id')
            else:
                right_col_id = b.get('block_id')
    
    if not left_col_id or not right_col_id:
        return False
    
    # 按象限分组
    quadrant_tasks = {
        "重要紧急": [],
        "重要不紧急": [],
        "不重要紧急": [],
        "不重要不紧急": []
    }
    
    for task in tasks:
        q = task.get('quadrant', '重要不紧急')
        if q in quadrant_tasks:
            quadrant_tasks[q].append(task)
    
    color_map = {"重要紧急": 5, "重要不紧急": 3, "不重要紧急": 6, "不重要不紧急": 4}
    
    # 左栏
    left_content = []
    for q in ["重要紧急", "不重要紧急"]:
        left_content.append({
            "block_type": 2,
            "text": {"elements": [{"text_run": {"content": f"[{q}]", "text_element_style": {"bold": True, "text_color": color_map[q]}}}], "style": {}}
        })
        for task in quadrant_tasks[q]:
            events = "、".join(task.get('events', []))
            targets = "、".join(task.get('t_targets', []))
            left_content.append({
                "block_type": 17,
                "todo": {"elements": [{"text_run": {"content": f"{task.get('person', '卡若')}（{events}）", "text_element_style": {}}}], "style": {"done": False}}
            })
            if targets:
                left_content.append({
                    "block_type": 2,
                    "text": {"elements": [{"text_run": {"content": f"  T: {targets}", "text_element_style": {}}}], "style": {}}
                })
        if not quadrant_tasks[q]:
            left_content.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": "", "text_element_style": {}}}], "style": {}}})
    
    # 右栏
    right_content = []
    for q in ["重要不紧急", "不重要不紧急"]:
        right_content.append({
            "block_type": 2,
            "text": {"elements": [{"text_run": {"content": f"[{q}]", "text_element_style": {"bold": True, "text_color": color_map[q]}}}], "style": {}}
        })
        for task in quadrant_tasks[q]:
            events = "、".join(task.get('events', []))
            targets = "、".join(task.get('t_targets', []))
            right_content.append({
                "block_type": 17,
                "todo": {"elements": [{"text_run": {"content": f"{task.get('person', '卡若')}（{events}）", "text_element_style": {}}}], "style": {"done": False}}
            })
            if targets:
                right_content.append({
                    "block_type": 2,
                    "text": {"elements": [{"text_run": {"content": f"  T: {targets}", "text_element_style": {}}}], "style": {}}
                })
        if not quadrant_tasks[q]:
            right_content.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": "", "text_element_style": {}}}], "style": {}}})
    
    api('POST', f'/docx/v1/documents/{doc_id}/blocks/{left_col_id}/children', token, {"children": left_content})
    api('POST', f'/docx/v1/documents/{doc_id}/blocks/{right_col_id}/children', token, {"children": right_content})
    
    return True

def batch_write(work_data):
    """批量写入"""
    tokens = load_tokens()
    token = refresh_token(tokens) or tokens.get('access_token')
    
    if not token:
        print("❌ 未找到token")
        return
    
    doc_id = CONFIG['WIKI_URL'].rstrip('/').split('/')[-1]
    
    # 按日期从大到小排序（最新在前）
    days = sorted([int(d) for d in work_data.keys()], reverse=True)
    
    for day in days:
        month = 1
        date_str = f"{month}月{day}日"
        
        # 获取最新blocks
        blocks = get_all_blocks(doc_id, token)
        
        # 检查是否已存在
        existing = get_existing_dates(blocks)
        if (month, day) in existing:
            print(f"⏭️ {date_str} 已存在，跳过")
            continue
        
        # 找到插入位置
        insert_idx = find_insert_index_for_date(blocks, doc_id, month, day)
        
        # 构建日期块
        tasks = work_data[str(day)].get('tasks', [])
        day_blocks = build_date_blocks(month, day, tasks)
        
        # 插入
        result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', token, {
            "children": day_blocks,
            "index": insert_idx
        })
        
        if result.get('code') != 0:
            print(f"❌ {date_str} 创建失败: {result.get('msg')}")
            continue
        
        # 获取grid_id并填充内容
        new_blocks = result.get('data', {}).get('children', [])
        if len(new_blocks) >= 3:
            grid_id = new_blocks[2].get('block_id')
            time.sleep(0.5)  # 等待API
            blocks = get_all_blocks(doc_id, token)
            write_grid_content(token, doc_id, grid_id, tasks, blocks)
        
        print(f"✅ {date_str} 写入成功")
        time.sleep(0.3)  # 控制速率

if __name__ == "__main__":
    # 加载1月工作数据
    work_file = os.path.join(os.path.dirname(__file__), 'january_work.json')
    with open(work_file, 'r', encoding='utf-8') as f:
        work_data = json.load(f)
    
    print("📝 开始批量写入1月工作记录...")
    batch_write(work_data)
    print("\n🎉 完成!")
