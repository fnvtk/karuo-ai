#!/usr/bin/env python3
"""
按统一TNTFW格式写入飞书
格式清晰统一
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
SUMMARIES_FILE = os.path.join(os.path.dirname(__file__), 'tntfw_summaries.json')

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

def find_date_index(blocks, doc_id, month, day):
    """找到日期块索引"""
    root_children = [b for b in blocks if b.get('parent_id') == doc_id]
    
    for i, block in enumerate(root_children):
        if block.get('block_type') == 6:
            content = ""
            for el in block.get('heading4', {}).get('elements', []):
                if 'text_run' in el:
                    content += el['text_run'].get('content', '')
            match = re.search(r'(\d+)月\s*(\d+)日', content)
            if match and int(match.group(1)) == month and int(match.group(2)) == day:
                return i, block.get('block_id')
    return None, None

def count_blocks_after_date(blocks, doc_id, date_block_id):
    """统计日期后面的块数量"""
    root_children = [b for b in blocks if b.get('parent_id') == doc_id]
    
    found = False
    count = 0
    for block in root_children:
        if block.get('block_id') == date_block_id:
            found = True
            continue
        if found:
            if block.get('block_type') == 6:  # 下一个日期
                break
            count += 1
    return count

def build_tntfw_blocks(data):
    """构建TNTFW格式的块"""
    blocks = []
    
    tasks = data.get('tasks', [])
    summary = data.get('summary', '')
    
    # 颜色映射
    color_map = {"重要紧急": 5, "重要不紧急": 3}
    
    for task in tasks[:3]:  # 最多3个任务
        quadrant = task.get('quadrant', '重要不紧急')
        color = color_map.get(quadrant, 3)
        events = task.get('events', ['工作'])[0]
        
        t_targets = task.get('t_targets', [])
        n_process = task.get('n_process', [])
        t_thoughts = task.get('t_thoughts', [])
        w_work = task.get('w_work', [])
        
        # 事项标题 (todo)
        blocks.append({
            "block_type": 17,
            "todo": {
                "elements": [{"text_run": {"content": f"☐ {events}", "text_element_style": {"bold": True, "text_color": color}}}],
                "style": {"done": True}
            }
        })
        
        # T（目标）
        if t_targets:
            target_text = t_targets[0][:60] if t_targets[0] else ""
            if target_text:
                blocks.append({
                    "block_type": 2,
                    "text": {"elements": [
                        {"text_run": {"content": "T ", "text_element_style": {"bold": True, "text_color": 7}}},
                        {"text_run": {"content": target_text, "text_element_style": {}}}
                    ], "style": {}}
                })
        
        # N（过程）
        if n_process:
            process_text = n_process[0][:60] if n_process[0] else ""
            if process_text:
                blocks.append({
                    "block_type": 2,
                    "text": {"elements": [
                        {"text_run": {"content": "N ", "text_element_style": {"bold": True, "text_color": 3}}},
                        {"text_run": {"content": process_text, "text_element_style": {}}}
                    ], "style": {}}
                })
        
        # W（作品）
        if w_work:
            work_text = "、".join(w_work[:2])[:60]
            if work_text:
                blocks.append({
                    "block_type": 2,
                    "text": {"elements": [
                        {"text_run": {"content": "W ", "text_element_style": {"bold": True, "text_color": 5}}},
                        {"text_run": {"content": work_text, "text_element_style": {}}}
                    ], "style": {}}
                })
    
    return blocks

def write_day(token, doc_id, day, data):
    """写入某天的内容"""
    month = 1
    
    blocks = get_all_blocks(doc_id, token)
    idx, block_id = find_date_index(blocks, doc_id, month, day)
    
    if idx is None:
        print(f"⚠️ 1月{day}日 未找到")
        return False
    
    # 检查已有块数量
    existing_count = count_blocks_after_date(blocks, doc_id, block_id)
    if existing_count > 8:  # 已有超过8个块，跳过
        print(f"⏭️ 1月{day}日 已有{existing_count}个块")
        return True
    
    # 构建内容
    content_blocks = build_tntfw_blocks(data)
    
    if not content_blocks:
        return True
    
    # 写入
    result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', token, {
        "children": content_blocks,
        "index": idx + 1
    })
    
    if result.get('code') == 0:
        print(f"✅ 1月{day}日: {data.get('summary', '')[:40]}")
        return True
    else:
        print(f"❌ 1月{day}日: {result.get('msg')}")
        return False

def main():
    tokens = load_tokens()
    token = refresh_token(tokens) or tokens.get('access_token')
    
    if not token:
        print("❌ 未找到token")
        return
    
    print("🔄 Token已刷新\n")
    
    # 加载数据
    with open(SUMMARIES_FILE, 'r', encoding='utf-8') as f:
        summaries = json.load(f)
    
    doc_id = CONFIG['DOC_ID']
    
    # 从大到小写入
    for day in range(25, 0, -1):
        day_str = str(day)
        if day_str in summaries:
            write_day(token, doc_id, day, summaries[day_str])
            time.sleep(0.5)
    
    print("\n🎉 完成!")

if __name__ == "__main__":
    main()
