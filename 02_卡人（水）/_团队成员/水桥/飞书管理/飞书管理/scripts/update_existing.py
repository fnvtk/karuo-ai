#!/usr/bin/env python3
"""
更新已存在日期的工作内容
在日期标题后面添加工作项
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
    elif method == 'PATCH':
        r = requests.patch(url, headers=headers, json=data, timeout=30)
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

def find_date_block(blocks, month, day):
    """找到日期块"""
    date_str = f"{month}月{day}日"
    for block in blocks:
        if block.get('block_type') == 6:
            content = ""
            for el in block.get('heading4', {}).get('elements', []):
                if 'text_run' in el:
                    content += el['text_run'].get('content', '')
            if f"{month}月" in content:
                match = re.search(r'(\d+)月\s*(\d+)日', content)
                if match and int(match.group(1)) == month and int(match.group(2)) == day:
                    return block
    return None

def update_date_title(token, doc_id, block_id, month, day, work_items):
    """更新日期标题，添加工作摘要"""
    # 构建新标题
    work_summary = "、".join(work_items[:3])
    new_title = f"{month}月{day}日 - {work_summary}"
    
    # 更新块内容
    result = api('PATCH', f'/docx/v1/documents/{doc_id}/blocks/{block_id}', token, {
        "update_heading4": {
            "elements": [{"text_run": {"content": new_title, "text_element_style": {}}}]
        }
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
    
    blocks = get_all_blocks(doc_id, token)
    print(f"📊 文档共 {len(blocks)} 个块")
    
    for day, work_items in DAILY_WORK.items():
        if not work_items:
            continue
        
        block = find_date_block(blocks, 1, day)
        if block:
            success = update_date_title(token, doc_id, block['block_id'], 1, day, work_items)
            if success:
                print(f"✅ 1月{day}日 已更新: {work_items[0]}")
            else:
                print(f"❌ 1月{day}日 更新失败")
        else:
            print(f"⚠️ 1月{day}日 未找到")
        
        time.sleep(0.3)
    
    print("\n🎉 完成!")

if __name__ == "__main__":
    main()
