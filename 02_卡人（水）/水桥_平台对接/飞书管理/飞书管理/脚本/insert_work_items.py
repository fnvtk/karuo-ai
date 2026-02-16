#!/usr/bin/env python3
"""
在已存在日期块后面插入工作内容
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

# 工作摘要
DAILY_WORK = {
    7: ["SOUL项目（6项）", "项目规划", "玩值电竞项目"],
    8: ["SOUL项目（18项）"],
    9: ["SOUL项目（77项）"],
    10: ["SOUL项目（42项）", "SOUL运营SOP"],
    11: ["前端开发（556项）", "SOUL项目", "报告分析", "SOUL团队建设"],
    12: ["项目规划（6项）", "SOUL项目", "SOUL团队建设", "卡若AI系统"],
    14: ["SOUL项目（157项）", "SOUL运营SOP"],
    15: ["前端开发（41项）", "SOUL项目"],
    17: ["SOUL项目（560项）", "前端开发", "模板开发", "玩值电竞项目"],
    18: ["飞书工具开发（864项）", "SOUL项目（204项）", "玩值电竞项目"],
    19: ["Python开发（1543项）", "SOUL项目", "前端开发", "项目规划"],
    20: ["卡若AI系统（36项）", "玩值电竞项目", "SOUL项目", "AI技能开发"],
    21: ["Python开发（1576项）", "卡若AI系统", "AI技能开发", "玩值电竞项目"],
    22: ["卡若AI系统（14项）", "玩值电竞项目", "Python开发", "玩值落地执行"],
    23: ["SOUL项目（44项）", "卡若AI系统", "Python开发", "AI技能开发"],
    24: ["卡若AI系统（2811项）", "前端开发", "SOUL项目", "项目规划"],
    25: ["SOUL项目（267项）", "卡若AI系统", "AI技能开发"],
    26: ["飞书日历自动化", "1月工作汇总"],
}

TOKEN_FILE = os.path.join(os.path.dirname(__file__), '.feishu_tokens.json')

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
    """找到日期块在根级别的索引"""
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

def check_work_exists(blocks, doc_id, date_block_id):
    """检查日期块后面是否已有工作项"""
    root_children = [b for b in blocks if b.get('parent_id') == doc_id]
    
    found_date = False
    for block in root_children:
        if block.get('block_id') == date_block_id:
            found_date = True
            continue
        if found_date:
            # 下一个块
            if block.get('block_type') == 17:  # todo
                content = ""
                for el in block.get('todo', {}).get('elements', []):
                    if 'text_run' in el:
                        content += el['text_run'].get('content', '')
                # 如果已有工作项（包含[重]标记）
                if '[重' in content:
                    return True
            break
    return False

def insert_work_items(token, doc_id, month, day, work_items, insert_idx):
    """在日期块后面插入工作项"""
    blocks_to_insert = []
    
    for item in work_items:
        if 'SOUL' in item or '开发' in item:
            color = 5  # 红
        else:
            color = 3  # 绿
        
        blocks_to_insert.append({
            "block_type": 17,
            "todo": {
                "elements": [{"text_run": {"content": f"[重] {item}", "text_element_style": {"text_color": color}}}],
                "style": {"done": True}
            }
        })
    
    result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', token, {
        "children": blocks_to_insert,
        "index": insert_idx + 1  # 日期块后面
    })
    
    return result.get('code') == 0

def main():
    tokens = load_tokens()
    token = refresh_token(tokens) or tokens.get('access_token')
    
    if not token:
        print("❌ 未找到token")
        return
    
    print("🔄 Token已刷新")
    doc_id = CONFIG['DOC_ID']
    
    for day in sorted(DAILY_WORK.keys(), reverse=True):
        work_items = DAILY_WORK.get(day, [])
        if not work_items:
            continue
        
        blocks = get_all_blocks(doc_id, token)
        idx, block_id = find_date_index(blocks, doc_id, 1, day)
        
        if idx is None:
            print(f"⚠️ 1月{day}日 未找到")
            continue
        
        # 检查是否已有工作项
        if check_work_exists(blocks, doc_id, block_id):
            print(f"⏭️ 1月{day}日 已有工作项")
            continue
        
        success = insert_work_items(token, doc_id, 1, day, work_items, idx)
        if success:
            print(f"✅ 1月{day}日: {work_items[0]}...")
        else:
            print(f"❌ 1月{day}日 插入失败")
        
        time.sleep(0.5)
    
    print("\n🎉 完成!")

if __name__ == "__main__":
    main()
