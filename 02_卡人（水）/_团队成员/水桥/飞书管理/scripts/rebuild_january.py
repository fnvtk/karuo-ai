#!/usr/bin/env python3
"""
重建1月日期记录
按TNTFW格式统一写入
"""
import os
import json
import requests
import time

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

def build_day_with_content(month, day, data):
    """构建日期块 + TNTFW内容"""
    blocks = []
    color_map = {"重要紧急": 5, "重要不紧急": 3}
    
    # 日期标题
    blocks.append({
        "block_type": 6,
        "heading4": {
            "elements": [{"text_run": {"content": f"{month}月{day}日", "text_element_style": {}}}],
            "style": {}
        }
    })
    
    tasks = data.get('tasks', [])
    
    for task in tasks[:3]:
        quadrant = task.get('quadrant', '重要不紧急')
        color = color_map.get(quadrant, 3)
        events = task.get('events', ['工作'])[0]
        
        t_targets = task.get('t_targets', [])
        n_process = task.get('n_process', [])
        w_work = task.get('w_work', [])
        
        # 事项标题
        blocks.append({
            "block_type": 17,
            "todo": {
                "elements": [{"text_run": {"content": f"☐ {events}", "text_element_style": {"bold": True, "text_color": color}}}],
                "style": {"done": True}
            }
        })
        
        # T（目标）
        if t_targets and t_targets[0]:
            target_text = t_targets[0][:60]
            blocks.append({
                "block_type": 2,
                "text": {"elements": [
                    {"text_run": {"content": "T ", "text_element_style": {"bold": True, "text_color": 7}}},
                    {"text_run": {"content": target_text, "text_element_style": {}}}
                ], "style": {}}
            })
        
        # N（过程）
        if n_process and n_process[0]:
            process_text = n_process[0][:60]
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
            blocks.append({
                "block_type": 2,
                "text": {"elements": [
                    {"text_run": {"content": "W ", "text_element_style": {"bold": True, "text_color": 5}}},
                    {"text_run": {"content": work_text, "text_element_style": {}}}
                ], "style": {}}
            })
    
    # 空行分隔
    blocks.append({
        "block_type": 2,
        "text": {"elements": [{"text_run": {"content": "", "text_element_style": {}}}], "style": {}}
    })
    
    return blocks

def find_1month_heading2(blocks, doc_id):
    """找到1月的heading2位置"""
    root_children = [b for b in blocks if b.get('parent_id') == doc_id]
    
    for i, block in enumerate(root_children):
        if block.get('block_type') == 4:  # heading2
            content = ""
            for el in block.get('heading2', {}).get('elements', []):
                if 'text_run' in el:
                    content += el['text_run'].get('content', '')
            if '本月最重要的任务' in content:
                return i, block.get('block_id')
    return None, None

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
    
    # 获取当前块
    blocks = get_all_blocks(doc_id, token)
    print(f"📊 当前文档有 {len(blocks)} 个块")
    
    # 找到heading2位置
    idx, block_id = find_1month_heading2(blocks, doc_id)
    if idx is None:
        print("❌ 找不到'本月最重要的任务'标题")
        return
    
    print(f"📍 找到位置: 索引 {idx}")
    
    # 按日期从小到大（1日在最后，25日在最前）写入
    # 所以我们从1日开始写，每次都写在heading2后面
    days = sorted([int(d) for d in summaries.keys()])
    
    for day in days:
        data = summaries[str(day)]
        
        # 重新获取块（位置会变）
        blocks = get_all_blocks(doc_id, token)
        idx, _ = find_1month_heading2(blocks, doc_id)
        
        if idx is None:
            print(f"⚠️ 位置丢失，跳过1月{day}日")
            continue
        
        # 构建内容
        day_blocks = build_day_with_content(1, day, data)
        
        # 写入
        result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', token, {
            "children": day_blocks,
            "index": idx + 1
        })
        
        if result.get('code') == 0:
            print(f"✅ 1月{day}日: {data.get('summary', '')[:30]}")
        else:
            print(f"❌ 1月{day}日: {result.get('msg')}")
        
        time.sleep(0.5)
    
    print("\n🎉 完成!")

if __name__ == "__main__":
    main()
