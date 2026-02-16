#!/usr/bin/env python3
"""
按清晰统一格式写入飞书
格式：
日期
☐ 项目名
  T 目标/成果
  N 类型/过程
  W 产出文件
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
SUMMARIES_FILE = os.path.join(os.path.dirname(__file__), 'smart_summaries.json')

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

def clean_text(text):
    """清理文本"""
    if not text:
        return ""
    # 去掉markdown标记
    text = re.sub(r'\*+', '', text)
    text = re.sub(r'#+\s*', '', text)
    text = text.strip()
    # 截断
    return text[:50]

def build_day_blocks(month, day, data):
    """构建日期块"""
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
    
    tasks = data.get('tasks', [])[:2]  # 最多2个任务
    
    for task in tasks:
        events = task.get('events', ['工作'])[0]
        quadrant = task.get('quadrant', '重要不紧急')
        color = color_map.get(quadrant, 3)
        
        # 清理数据
        t_targets = [clean_text(t) for t in task.get('t_targets', []) if clean_text(t)]
        n_process = [clean_text(n) for n in task.get('n_process', []) if clean_text(n)]
        w_work = [clean_text(w) for w in task.get('w_work', []) if clean_text(w)]
        
        # 去重
        t_targets = list(dict.fromkeys(t_targets))[:2]
        w_work = list(dict.fromkeys(w_work))[:2]
        
        # 项目标题
        blocks.append({
            "block_type": 17,
            "todo": {
                "elements": [{"text_run": {"content": f"☐ {events}", "text_element_style": {"bold": True, "text_color": color}}}],
                "style": {"done": True}
            }
        })
        
        # T 目标
        if t_targets:
            blocks.append({
                "block_type": 2,
                "text": {"elements": [
                    {"text_run": {"content": "T ", "text_element_style": {"bold": True, "text_color": 7}}},
                    {"text_run": {"content": t_targets[0], "text_element_style": {}}}
                ], "style": {}}
            })
        
        # N 类型
        if n_process:
            blocks.append({
                "block_type": 2,
                "text": {"elements": [
                    {"text_run": {"content": "N ", "text_element_style": {"bold": True, "text_color": 3}}},
                    {"text_run": {"content": n_process[0], "text_element_style": {}}}
                ], "style": {}}
            })
        
        # W 产出
        if w_work:
            blocks.append({
                "block_type": 2,
                "text": {"elements": [
                    {"text_run": {"content": "W ", "text_element_style": {"bold": True, "text_color": 5}}},
                    {"text_run": {"content": "、".join(w_work), "text_element_style": {}}}
                ], "style": {}}
            })
    
    # 空行
    blocks.append({
        "block_type": 2,
        "text": {"elements": [{"text_run": {"content": "", "text_element_style": {}}}], "style": {}}
    })
    
    return blocks

def find_heading2_index(blocks, doc_id):
    """找到heading2位置"""
    root_children = [b for b in blocks if b.get('parent_id') == doc_id]
    for i, block in enumerate(root_children):
        if block.get('block_type') == 4:
            content = ""
            for el in block.get('heading2', {}).get('elements', []):
                if 'text_run' in el:
                    content += el['text_run'].get('content', '')
            if '本月最重要的任务' in content:
                return i
    return None

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
    
    # 按日期从小到大写入（最新在最前）
    days = sorted([int(d) for d in summaries.keys()])
    
    for day in days:
        blocks = get_all_blocks(doc_id, token)
        idx = find_heading2_index(blocks, doc_id)
        
        if idx is None:
            print("❌ 找不到位置")
            return
        
        data = summaries[str(day)]
        day_blocks = build_day_blocks(1, day, data)
        
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
