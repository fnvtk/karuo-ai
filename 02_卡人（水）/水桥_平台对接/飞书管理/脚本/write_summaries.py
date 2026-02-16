#!/usr/bin/env python3
"""
把AI总结的工作内容写入飞书
按四象限格式写入每日记录
"""
import os
import json
import requests
import time
import re

CONFIG = {
    'APP_ID': 'cli_a48818290ef8100d',
    'APP_SECRET': 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4',
    'DOC_ID': 'JZiiwxEjHiRxouk8hSPcqBn6nrd'
}

TOKEN_FILE = os.path.join(os.path.dirname(__file__), '.feishu_tokens.json')
SUMMARIES_FILE = os.path.join(os.path.dirname(__file__), 'daily_summaries.json')

def load_tokens():
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_tokens(tokens):
    with open(TOKEN_FILE, 'w') as f:
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

def find_date_block_index(blocks, doc_id, month, day):
    """找到日期块在根级别的索引"""
    root_children = [b for b in blocks if b.get('parent_id') == doc_id]
    
    for i, block in enumerate(root_children):
        if block.get('block_type') == 6:  # heading4
            content = ""
            for el in block.get('heading4', {}).get('elements', []):
                if 'text_run' in el:
                    content += el['text_run'].get('content', '')
            match = re.search(r'(\d+)月\s*(\d+)日', content)
            if match and int(match.group(1)) == month and int(match.group(2)) == day:
                return i, block.get('block_id')
    return None, None

def check_has_detailed_content(blocks, doc_id, date_block_id):
    """检查是否已有详细内容（超过3个todo）"""
    root_children = [b for b in blocks if b.get('parent_id') == doc_id]
    
    found_date = False
    todo_count = 0
    
    for block in root_children:
        if block.get('block_id') == date_block_id:
            found_date = True
            continue
        
        if found_date:
            if block.get('block_type') == 6:  # 遇到下一个日期
                break
            if block.get('block_type') == 17:  # todo
                todo_count += 1
    
    return todo_count > 5

def build_task_blocks(tasks):
    """构建任务块"""
    blocks = []
    color_map = {"重要紧急": 5, "重要不紧急": 3, "不重要紧急": 6, "不重要不紧急": 4}
    
    for task in tasks:
        quadrant = task.get('quadrant', '重要不紧急')
        color = color_map.get(quadrant, 3)
        event = task.get('event', '')
        targets = task.get('targets', [])
        process = task.get('process', [])
        
        # 任务标题
        blocks.append({
            "block_type": 17,
            "todo": {
                "elements": [{"text_run": {"content": f"[{quadrant[:2]}] {event}", "text_element_style": {"bold": True, "text_color": color}}}],
                "style": {"done": True}
            }
        })
        
        # 目标
        for t in targets[:2]:
            blocks.append({
                "block_type": 2,
                "text": {"elements": [{"text_run": {"content": f"  T: {t}", "text_element_style": {}}}], "style": {}}
            })
        
        # 过程
        for p in process[:2]:
            if p and len(p) > 2:
                blocks.append({
                    "block_type": 2,
                    "text": {"elements": [{"text_run": {"content": f"  N: {p}", "text_element_style": {}}}], "style": {}}
                })
    
    return blocks

def write_day_content(token, doc_id, day, data):
    """写入某天的内容"""
    month = 1
    
    blocks = get_all_blocks(doc_id, token)
    idx, block_id = find_date_block_index(blocks, doc_id, month, day)
    
    if idx is None:
        print(f"⚠️ 1月{day}日 未找到日期块")
        return False
    
    # 检查是否已有详细内容
    if check_has_detailed_content(blocks, doc_id, block_id):
        print(f"⏭️ 1月{day}日 已有详细内容")
        return True
    
    # 构建任务块
    tasks = data.get('tasks', [])
    if not tasks:
        print(f"⏭️ 1月{day}日 无任务数据")
        return True
    
    task_blocks = build_task_blocks(tasks)
    
    # 插入到日期块后面
    result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', token, {
        "children": task_blocks,
        "index": idx + 1
    })
    
    if result.get('code') == 0:
        summary = data.get('summary', '')[:30]
        print(f"✅ 1月{day}日: {summary}")
        return True
    else:
        print(f"❌ 1月{day}日: {result.get('msg')}")
        return False

def main():
    # 加载token
    tokens = load_tokens()
    token = refresh_token(tokens) or tokens.get('access_token')
    
    if not token:
        print("❌ 未找到token")
        return
    
    print("🔄 Token已刷新")
    
    # 加载总结数据
    with open(SUMMARIES_FILE, 'r', encoding='utf-8') as f:
        summaries = json.load(f)
    
    doc_id = CONFIG['DOC_ID']
    
    # 按日期从大到小处理
    for day in range(25, 0, -1):
        day_str = str(day)
        if day_str in summaries:
            write_day_content(token, doc_id, day, summaries[day_str])
            time.sleep(0.5)
    
    print("\n🎉 完成!")

if __name__ == "__main__":
    main()
