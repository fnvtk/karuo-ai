#!/usr/bin/env python3
"""
批量写入1月工作记录到飞书 v2
- 使用工作内容摘要
- 日期最新在前
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

# 1月每日工作摘要
DAILY_WORK = {
    1: ["项目规划（42项）", "模板开发（40项）", "SOUL项目", "报告分析"],
    2: ["Python开发（2793项）", "模板开发", "报告分析", "玩值电竞项目"],
    3: ["玩值电竞项目（96项）"],
    4: ["前端开发（568项）", "玩值电竞项目（93项）", "项目规划"],
    5: ["模板开发（15项）", "玩值团队管理", "玩值电竞项目", "SOUL项目"],
    6: ["模板开发（49项）", "SOUL项目", "项目规划", "玩值电竞项目"],
    7: ["SOUL项目（6项）", "项目规划", "玩值电竞项目"],
    8: ["SOUL项目（18项）"],
    9: ["SOUL项目（77项）"],
    10: ["SOUL项目（42项）", "SOUL运营SOP"],
    11: ["前端开发（556项）", "SOUL项目", "报告分析", "SOUL团队建设"],
    12: ["项目规划（6项）", "SOUL项目", "SOUL团队建设", "卡若AI系统"],
    13: [],  # 无记录
    14: ["SOUL项目（157项）", "SOUL运营SOP"],
    15: ["前端开发（41项）", "SOUL项目"],
    16: [],  # 无记录
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
    """获取已存在的日期"""
    import re
    dates = set()
    for block in blocks:
        if block.get('block_type') == 6:
            content = ""
            for el in block.get('heading4', {}).get('elements', []):
                if 'text_run' in el:
                    content += el['text_run'].get('content', '')
            match = re.search(r'(\d+)月\s*(\d+)日', content)
            if match:
                dates.add((int(match.group(1)), int(match.group(2))))
    return dates

def find_insert_index(blocks, doc_id, month, day):
    """找到插入位置"""
    import re
    root_children = [b for b in blocks if b.get('parent_id') == doc_id]
    
    # 找所有日期块
    date_positions = []
    for i, block in enumerate(root_children):
        if block.get('block_type') == 6:
            content = ""
            for el in block.get('heading4', {}).get('elements', []):
                if 'text_run' in el:
                    content += el['text_run'].get('content', '')
            match = re.search(r'(\d+)月\s*(\d+)日', content)
            if match:
                m, d = int(match.group(1)), int(match.group(2))
                date_positions.append((i, m, d))
    
    if not date_positions:
        return 4  # 默认
    
    target = month * 100 + day
    for idx, m, d in date_positions:
        if target > m * 100 + d:
            return idx
    
    return date_positions[-1][0] + 3

def write_day(token, doc_id, month, day, work_items):
    """写入一天的记录"""
    date_str = f"{month}月{day}日"
    
    blocks = get_all_blocks(doc_id, token)
    existing = get_existing_dates(blocks)
    
    if (month, day) in existing:
        print(f"⏭️ {date_str} 已存在")
        return True
    
    if not work_items:
        print(f"⏭️ {date_str} 无记录")
        return True
    
    insert_idx = find_insert_index(blocks, doc_id, month, day)
    
    # 构建内容 - 简化版，只用heading4 + todo列表
    day_blocks = [
        {
            "block_type": 6,
            "heading4": {
                "elements": [{"text_run": {"content": f"{date_str}  ", "text_element_style": {}}}],
                "style": {}
            }
        }
    ]
    
    # 添加工作项
    for item in work_items:
        # 判断象限
        if 'SOUL' in item or '开发' in item:
            quadrant = "重要紧急"
            color = 5
        else:
            quadrant = "重要不紧急"
            color = 3
        
        day_blocks.append({
            "block_type": 17,
            "todo": {
                "elements": [{"text_run": {"content": f"[{quadrant[:2]}] {item}", "text_element_style": {"text_color": color}}}],
                "style": {"done": True}
            }
        })
    
    # 添加空行
    day_blocks.append({
        "block_type": 2,
        "text": {"elements": [{"text_run": {"content": "", "text_element_style": {}}}], "style": {}}
    })
    
    result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', token, {
        "children": day_blocks,
        "index": insert_idx
    })
    
    if result.get('code') == 0:
        print(f"✅ {date_str}: {', '.join(work_items[:2])}...")
        return True
    else:
        print(f"❌ {date_str}: {result.get('msg')}")
        return False

def main():
    tokens = load_tokens()
    token = refresh_token(tokens) or tokens.get('access_token')
    
    if not token:
        print("❌ 未找到token")
        return
    
    print("🔄 Token已刷新")
    doc_id = CONFIG['DOC_ID']
    
    # 从25日往前写（最新在前）
    for day in range(25, 0, -1):
        work_items = DAILY_WORK.get(day, [])
        write_day(token, doc_id, 1, day, work_items)
        time.sleep(0.5)
    
    print("\n🎉 完成!")

if __name__ == "__main__":
    main()
