#!/usr/bin/env python3
"""
按四象限格式写入飞书
格式：Grid左右分栏 + TNTFW详情
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

# 今天的任务数据
TODAY_TASKS = {
    "重要紧急": [
        {
            "person": "卡若",
            "events": ["飞书日历", "工作汇总", "自动化"],
            "t": ["💰 日历系统上线", "📊 1月数据归档"],
            "n": ["✅ 开发smart_calendar.py", "✅ 批量写入23天记录"],
            "t2": ["🤔 格式需统一TNTFW"],
            "w": ["🤝 脚本自动执行"],
            "f": ["✨ 飞书日历可自动更新"]
        }
    ],
    "重要不紧急": [
        {
            "person": "卡若",
            "events": ["卡若AI", "技能库", "文档"],
            "t": ["📁 完善AI系统架构"],
            "n": ["✅ 更新15个技能文档"],
            "t2": ["🤔 五行分类更清晰"],
            "w": ["📝 SKILL.md规范化"],
            "f": ["✨ 工作台索引完善"]
        }
    ],
    "不重要紧急": [
        {
            "person": "卡若",
            "events": ["SOUL", "小程序"],
            "t": ["📱 小程序改造方案"],
            "n": ["✅ TDD需求文档v1.0"],
            "t2": [],
            "w": ["📄 交付文档"],
            "f": []
        }
    ],
    "不重要不紧急": []
}

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

def build_quadrant_content(quadrant, tasks):
    """构建象限内容块"""
    blocks = []
    
    # 象限颜色
    color_map = {
        "重要紧急": 5,      # 红
        "重要不紧急": 3,    # 绿
        "不重要紧急": 1,    # 蓝
        "不重要不紧急": 4   # 灰
    }
    color = color_map.get(quadrant, 1)
    
    # 象限标题
    blocks.append({
        "block_type": 2,
        "text": {"elements": [{"text_run": {"content": f"[{quadrant}]", "text_element_style": {"bold": True, "text_color": color}}}], "style": {}}
    })
    
    for task in tasks:
        person = task.get('person', '卡若')
        events = task.get('events', [])
        events_str = "、".join(events[:3])
        
        # 人物（事件）
        blocks.append({
            "block_type": 17,
            "todo": {"elements": [{"text_run": {"content": f"{person}（{events_str}）", "text_element_style": {}}}], "style": {"done": False}}
        })
        
        # { 开始
        blocks.append({
            "block_type": 2,
            "text": {"elements": [{"text_run": {"content": "{", "text_element_style": {}}}], "style": {}}
        })
        
        # T 目标
        t_items = task.get('t', [])
        if t_items:
            blocks.append({
                "block_type": 2,
                "text": {"elements": [{"text_run": {"content": "T", "text_element_style": {"bold": True}}}], "style": {}}
            })
            for item in t_items[:3]:
                blocks.append({
                    "block_type": 17,
                    "todo": {"elements": [{"text_run": {"content": item, "text_element_style": {}}}], "style": {"done": False}}
                })
        
        # N 过程
        n_items = task.get('n', [])
        if n_items:
            blocks.append({
                "block_type": 2,
                "text": {"elements": [{"text_run": {"content": "N", "text_element_style": {"bold": True}}}], "style": {}}
            })
            for item in n_items[:3]:
                blocks.append({
                    "block_type": 17,
                    "todo": {"elements": [{"text_run": {"content": item, "text_element_style": {}}}], "style": {"done": False}}
                })
        
        # T 双方想法
        t2_items = task.get('t2', [])
        if t2_items:
            blocks.append({
                "block_type": 2,
                "text": {"elements": [{"text_run": {"content": "T", "text_element_style": {"bold": True}}}], "style": {}}
            })
            for item in t2_items[:3]:
                blocks.append({
                    "block_type": 17,
                    "todo": {"elements": [{"text_run": {"content": item, "text_element_style": {}}}], "style": {"done": False}}
                })
        
        # W 合作形式
        w_items = task.get('w', [])
        if w_items:
            blocks.append({
                "block_type": 2,
                "text": {"elements": [{"text_run": {"content": "W", "text_element_style": {"bold": True}}}], "style": {}}
            })
            for item in w_items[:3]:
                blocks.append({
                    "block_type": 17,
                    "todo": {"elements": [{"text_run": {"content": item, "text_element_style": {}}}], "style": {"done": False}}
                })
        
        # F 反馈
        f_items = task.get('f', [])
        if f_items:
            blocks.append({
                "block_type": 2,
                "text": {"elements": [{"text_run": {"content": "F", "text_element_style": {"bold": True}}}], "style": {}}
            })
            for item in f_items[:3]:
                blocks.append({
                    "block_type": 17,
                    "todo": {"elements": [{"text_run": {"content": item, "text_element_style": {}}}], "style": {"done": False}}
                })
        
        # } 结束
        blocks.append({
            "block_type": 2,
            "text": {"elements": [{"text_run": {"content": "}", "text_element_style": {}}}], "style": {}}
        })
    
    # 如果没有任务，添加空checkbox
    if not tasks:
        blocks.append({
            "block_type": 17,
            "todo": {"elements": [{"text_run": {"content": "", "text_element_style": {}}}], "style": {"done": False}}
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

def write_today():
    """写入今天的四象限任务"""
    tokens = load_tokens()
    token = refresh_token(tokens) or tokens.get('access_token')
    
    if not token:
        print("❌ 未找到token")
        return
    
    print("🔄 Token已刷新")
    
    doc_id = CONFIG['DOC_ID']
    blocks = get_all_blocks(doc_id, token)
    
    idx = find_heading2_index(blocks, doc_id)
    if idx is None:
        print("❌ 找不到位置")
        return
    
    print(f"📍 插入位置: 索引 {idx}")
    
    # 构建日期结构
    day_blocks = [
        # 日期标题
        {
            "block_type": 6,
            "heading4": {
                "elements": [{"text_run": {"content": "1月26日", "text_element_style": {}}}],
                "style": {}
            }
        },
        # [执行] callout
        {
            "block_type": 19,
            "callout": {
                "emoji_id": "sunrise",
                "background_color": 2,
                "border_color": 2,
                "elements": [{"text_run": {"content": "[执行]", "text_element_style": {"bold": True, "text_color": 7}}}]
            }
        },
        # Grid分栏
        {
            "block_type": 24,
            "grid": {"column_size": 2}
        }
    ]
    
    # 创建主框架
    result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', token, {
        "children": day_blocks,
        "index": idx + 1
    })
    
    if result.get('code') != 0:
        print(f"❌ 创建框架失败: {result.get('msg')}")
        return
    
    print("✅ 框架创建成功")
    
    new_blocks = result.get('data', {}).get('children', [])
    if len(new_blocks) < 3:
        print("❌ 块数量不足")
        return
    
    grid_id = new_blocks[2].get('block_id')
    
    # 等待并获取grid columns
    time.sleep(1)
    blocks = get_all_blocks(doc_id, token)
    
    left_col_id = right_col_id = None
    for b in blocks:
        if b.get('parent_id') == grid_id and b.get('block_type') == 25:
            if left_col_id is None:
                left_col_id = b.get('block_id')
            else:
                right_col_id = b.get('block_id')
    
    if not left_col_id or not right_col_id:
        print("⚠️ Grid columns未创建")
        return
    
    print(f"📊 左栏: {left_col_id[:8]}..., 右栏: {right_col_id[:8]}...")
    
    # 左栏: 重要紧急 + 不重要紧急
    left_content = []
    left_content.extend(build_quadrant_content("重要紧急", TODAY_TASKS["重要紧急"]))
    left_content.extend(build_quadrant_content("不重要紧急", TODAY_TASKS["不重要紧急"]))
    
    result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{left_col_id}/children', token, {"children": left_content})
    if result.get('code') == 0:
        print("✅ 左栏写入成功")
    else:
        print(f"❌ 左栏: {result.get('msg')}")
    
    # 右栏: 重要不紧急 + 不重要不紧急
    right_content = []
    right_content.extend(build_quadrant_content("重要不紧急", TODAY_TASKS["重要不紧急"]))
    right_content.extend(build_quadrant_content("不重要不紧急", TODAY_TASKS["不重要不紧急"]))
    
    result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{right_col_id}/children', token, {"children": right_content})
    if result.get('code') == 0:
        print("✅ 右栏写入成功")
    else:
        print(f"❌ 右栏: {result.get('msg')}")
    
    print("\n🎉 1月26日四象限任务写入完成!")
    print("🔗 https://cunkebao.feishu.cn/wiki/JZiiwxEjHiRxouk8hSPcqBn6nrd")

if __name__ == "__main__":
    write_today()
