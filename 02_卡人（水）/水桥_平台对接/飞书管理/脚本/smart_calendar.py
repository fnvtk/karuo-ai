#!/usr/bin/env python3
"""
飞书运营日历智能管理
- 自动检测月份
- 如果是新月份，自动创建月份模板
- 日期最新在前
- 四象限分栏格式
"""
import os
import json
import requests
from datetime import datetime

CONFIG = {
    'APP_ID': 'cli_a48818290ef8100d',
    'APP_SECRET': 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4',
    'WIKI_URL': 'https://cunkebao.feishu.cn/wiki/JZiiwxEjHiRxouk8hSPcqBn6nrd'
}

# 月份主题配置
MONTH_THEMES = {
    1: "坚定方向",
    2: "深耕执行",
    3: "突破增长",
    4: "优化迭代",
    5: "规模复制",
    6: "半年复盘",
    7: "下半年启动",
    8: "持续推进",
    9: "冲刺准备",
    10: "全力冲刺",
    11: "收尾总结",
    12: "年度复盘"
}

TOKEN_PATHS = [
    os.path.join(os.path.dirname(__file__), '.feishu_tokens.json'),
    '/Users/karuo/Documents/开发/4、小工具/飞书工具箱/backend/.feishu_tokens.json'
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

def find_month_section(blocks, month):
    """查找月份区块"""
    month_str = f"{month}月"
    for block in blocks:
        if block.get('block_type') == 3:  # heading1
            content = ""
            for el in block.get('heading1', {}).get('elements', []):
                if 'text_run' in el:
                    content += el['text_run'].get('content', '')
            if month_str in content:
                return block
    return None

def find_date_in_month(blocks, doc_id, date_str):
    """查找某日期是否已存在"""
    for block in blocks:
        if block.get('block_type') == 6:  # heading4
            content = ""
            for el in block.get('heading4', {}).get('elements', []):
                if 'text_run' in el:
                    content += el['text_run'].get('content', '')
            if date_str in content:
                return block
    return None

def find_container_block(blocks, doc_id):
    """找到内容容器块（quote_container）"""
    for block in blocks:
        if block.get('block_type') == 34:  # quote_container
            return block.get('block_id')
    return doc_id

def find_insert_position_for_date(blocks, doc_id, month):
    """找到当月"金、本月最重要的任务"后面的位置，在容器内的索引"""
    month_str = f"{month}月"
    in_month = False
    container_id = find_container_block(blocks, doc_id)
    
    # 获取容器内的子块，按顺序
    container_children = []
    for block in blocks:
        if block.get('parent_id') == container_id:
            container_children.append(block)
    
    print(f"🔍 容器内有 {len(container_children)} 个直接子块")
    
    for i, block in enumerate(container_children):
        # 找到月份标题
        if block.get('block_type') == 3:
            content = ""
            for el in block.get('heading1', {}).get('elements', []):
                if 'text_run' in el:
                    content += el['text_run'].get('content', '')
            if month_str in content:
                in_month = True
                print(f"🔍 找到月份块: {content[:20]}... at index {i}")
            elif in_month and '月' in content:
                # 进入下一个月了
                print(f"🔍 遇到下个月: {content[:20]}...")
                break
        
        # 在当月内，找到"本月最重要的任务"
        if in_month and block.get('block_type') == 4:  # heading2
            content = ""
            for el in block.get('heading2', {}).get('elements', []):
                if 'text_run' in el:
                    content += el['text_run'].get('content', '')
            if '本月最重要的任务' in content:
                print(f"🔍 找到任务标题: {content[:20]}... at index {i}, 插入位置: {i+1}")
                return i + 1, block.get('block_id'), container_id
    
    # 如果没找到，尝试返回月份标题后面
    for i, block in enumerate(container_children):
        if block.get('block_type') == 3:
            content = ""
            for el in block.get('heading1', {}).get('elements', []):
                if 'text_run' in el:
                    content += el['text_run'].get('content', '')
            if month_str in content:
                print(f"🔍 降级：使用月份后面的位置 {i+1}")
                return i + 1, block.get('block_id'), container_id
    
    return None, None, container_id

def create_month_template(doc_id, token, month, year=2026):
    """创建新月份模板"""
    theme = MONTH_THEMES.get(month, "持续推进")
    
    # 月份模板块 - 简化版，避免参数问题
    month_blocks = [
        # 月份标题 (heading1)
        {
            "block_type": 3,
            "heading1": {
                "elements": [{"text_run": {"content": f"{month}月（{theme}）", "text_element_style": {}}}],
                "style": {}
            }
        },
        # 金、本月最重要的任务
        {
            "block_type": 4,
            "heading2": {
                "elements": [{"text_run": {"content": "金、本月最重要的任务 （每日安排）", "text_element_style": {}}}],
                "style": {}
            }
        },
        # 空行占位
        {
            "block_type": 2,
            "text": {"elements": [{"text_run": {"content": "（待添加每日任务）", "text_element_style": {}}}], "style": {}}
        },
        # 火 1、本月营业额
        {
            "block_type": 5,
            "heading3": {
                "elements": [{"text_run": {"content": "火 1、本月营业额", "text_element_style": {}}}],
                "style": {}
            }
        },
        # 火 2、竞争对手
        {
            "block_type": 5,
            "heading3": {
                "elements": [{"text_run": {"content": "火 2、竞争对手", "text_element_style": {}}}],
                "style": {}
            }
        },
        # 火 3、学习
        {
            "block_type": 5,
            "heading3": {
                "elements": [{"text_run": {"content": "火 3、学习", "text_element_style": {}}}],
                "style": {}
            }
        },
        # 火 4、人脉
        {
            "block_type": 5,
            "heading3": {
                "elements": [{"text_run": {"content": "火 4、人脉", "text_element_style": {}}}],
                "style": {}
            }
        },
        # 土、本月复盘
        {
            "block_type": 3,
            "heading1": {
                "elements": [{"text_run": {"content": "土、本月复盘", "text_element_style": {}}}],
                "style": {}
            }
        }
    ]
    
    return month_blocks

def build_quadrant_content(quadrant, tasks_in_q):
    """构建象限内容"""
    blocks = []
    color_map = {"重要紧急": 5, "重要不紧急": 3, "不重要紧急": 6, "不重要不紧急": 4}
    
    blocks.append({
        "block_type": 2,
        "text": {
            "elements": [{"text_run": {"content": f"[{quadrant}]", "text_element_style": {"bold": True, "text_color": color_map.get(quadrant, 1)}}}],
            "style": {"align": 1}
        }
    })
    
    for task in tasks_in_q:
        events = "、".join(task['events'])
        blocks.append({
            "block_type": 17,
            "todo": {
                "elements": [{"text_run": {"content": f"{task['person']}（{events}）", "text_element_style": {}}}],
                "style": {"done": False, "align": 1}
            }
        })
        
        blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": "{", "text_element_style": {}}}], "style": {}}})
        
        for label, items in [("T", task.get('t_targets', [])), ("N", task.get('n_process', [])),
                              ("T", task.get('t_thoughts', [])), ("W", task.get('w_work', [])),
                              ("F", task.get('f_feedback', []))]:
            if items:
                blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": label, "text_element_style": {"bold": True}}}], "style": {}}})
                for item in items:
                    blocks.append({
                        "block_type": 17,
                        "todo": {"elements": [{"text_run": {"content": item, "text_element_style": {}}}], "style": {"done": False}}
                    })
        
        blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": "}", "text_element_style": {}}}], "style": {}}})
    
    if not tasks_in_q:
        blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": "", "text_element_style": {}}}], "style": {}}})
    
    return blocks

def write_daily_task(token, doc_id, month, day, tasks):
    """写入每日任务"""
    date_str = f"{month}月{day}日"
    
    blocks = get_all_blocks(doc_id, token)
    print(f"📊 文档共 {len(blocks)} 个块")
    
    # 找到内容容器
    container_id = find_container_block(blocks, doc_id)
    print(f"📦 容器: {container_id[:12]}...")
    
    # 检查月份是否存在
    month_block = find_month_section(blocks, month)
    if not month_block:
        print(f"📅 {month}月不存在，创建新月份...")
        
        # 找到容器内"上个月（更多）"的位置
        container_children = [b for b in blocks if b.get('parent_id') == container_id]
        insert_idx = len(container_children)  # 默认末尾
        
        for i, block in enumerate(container_children):
            if block.get('block_type') == 3:
                content = ""
                for el in block.get('heading1', {}).get('elements', []):
                    if 'text_run' in el:
                        content += el['text_run'].get('content', '')
                if '上个月' in content:
                    insert_idx = i
                    break
        
        month_template = create_month_template(doc_id, token, month)
        # 插入到容器中
        result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{container_id}/children', token, {
            "children": month_template,
            "index": insert_idx
        })
        
        if result.get('code') == 0:
            print(f"✅ {month}月模板创建成功")
            blocks = get_all_blocks(doc_id, token)  # 重新获取
        else:
            print(f"❌ 创建月份失败: {result}")
            return False
    
    # 检查日期是否存在
    if find_date_in_month(blocks, doc_id, date_str):
        print(f"⚠️ {date_str} 已存在，跳过")
        return True
    
    # 找到插入位置
    insert_idx, after_block_id, container_id = find_insert_position_for_date(blocks, doc_id, month)
    if insert_idx is None:
        print(f"❌ 找不到插入位置")
        return False
    
    print(f"📍 插入位置: 索引 {insert_idx}")
    
    # 构建日期内容块
    day_blocks = [
        # 日期标题
        {
            "block_type": 6,
            "heading4": {
                "elements": [{"text_run": {"content": f"{date_str}  ", "text_element_style": {}}}],
                "style": {"align": 1}
            }
        },
        # 执行callout
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
    
    # 日期块放在文档根级别，不是容器里
    # 需要找到文档根级别的正确位置
    root_children = [b for b in blocks if b.get('parent_id') == doc_id]
    
    # 找到容器在根级别的位置，然后在其后面插入
    root_insert_idx = 0
    for i, b in enumerate(root_children):
        if b.get('block_id') == container_id:
            root_insert_idx = i + 1
            break
    
    # 如果有其他日期块（heading4），找到最新的位置
    for i, b in enumerate(root_children):
        if b.get('block_type') == 6:  # heading4
            content = ""
            for el in b.get('heading4', {}).get('elements', []):
                if 'text_run' in el:
                    content += el['text_run'].get('content', '')
            if f"{month}月" in content:
                # 在当月日期前面插入（最新在前）
                root_insert_idx = i
                break
    
    print(f"📍 根级别插入位置: {root_insert_idx}")
    
    # 创建主框架（在文档根级别）
    result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', token, {
        "children": day_blocks,
        "index": root_insert_idx
    })
    
    if result.get('code') != 0:
        print(f"❌ 创建框架失败: {result}")
        return False
    
    new_blocks = result.get('data', {}).get('children', [])
    if len(new_blocks) < 3:
        print("❌ 块数量不足")
        return False
    
    grid_id = new_blocks[2].get('block_id')
    
    # 获取grid的columns
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
        return False
    
    # 左栏：重要紧急 + 不重要紧急
    for quadrant in ["重要紧急", "不重要紧急"]:
        tasks_in_q = [t for t in tasks if t.get('quadrant') == quadrant]
        content = build_quadrant_content(quadrant, tasks_in_q)
        api('POST', f'/docx/v1/documents/{doc_id}/blocks/{left_col_id}/children', token, {"children": content})
    
    # 右栏：重要不紧急 + 不重要不紧急
    for quadrant in ["重要不紧急", "不重要不紧急"]:
        tasks_in_q = [t for t in tasks if t.get('quadrant') == quadrant]
        content = build_quadrant_content(quadrant, tasks_in_q)
        api('POST', f'/docx/v1/documents/{doc_id}/blocks/{right_col_id}/children', token, {"children": content})
    
    print(f"✅ {date_str} 写入成功!")
    return True

def smart_write(tasks=None, date=None):
    """智能写入主入口"""
    tokens = load_tokens()
    if not tokens.get('access_token'):
        print("❌ 未找到token")
        return False
    
    print("🔄 刷新Token...")
    token = refresh_token(tokens)
    if not token:
        token = tokens['access_token']
    else:
        print("✅ Token已刷新")
    
    doc_id = CONFIG['WIKI_URL'].rstrip('/').split('/')[-1]
    
    # 确定日期
    if date:
        target_date = date
    else:
        target_date = datetime.now()
    
    month = target_date.month
    day = target_date.day
    
    print(f"📅 目标日期: {month}月{day}日")
    
    # 默认任务
    if not tasks:
        tasks = [
            {
                "person": "卡若",
                "events": ["待规划"],
                "quadrant": "重要紧急",
                "t_targets": ["待填写 📝"],
                "n_process": [],
                "t_thoughts": [],
                "w_work": [],
                "f_feedback": []
            }
        ]
    
    return write_daily_task(token, doc_id, month, day, tasks)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # 支持 "2月1日" 格式
        arg = sys.argv[1]
        if '月' in arg and '日' in arg:
            month = int(arg.split('月')[0])
            day = int(arg.split('月')[1].replace('日', ''))
            from datetime import date
            target = datetime(2026, month, day)
            smart_write(date=target)
        else:
            print(f"格式: python smart_calendar.py 2月1日")
    else:
        # 写入今天
        smart_write()
