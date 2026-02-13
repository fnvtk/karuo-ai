#!/usr/bin/env python3
"""
飞书任务写入 v3
简化版 - 使用heading4 + callout + todo格式
"""
import os
import json
import requests
from datetime import datetime

CONFIG = {
    'APP_ID': 'cli_a48818290ef8100d',
    'APP_SECRET': 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4'
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

def get_blocks(doc_id, token):
    result = api('GET', f'/docx/v1/documents/{doc_id}/blocks', token, params={'page_size': 200})
    return result.get('data', {}).get('items', []) if result.get('code') == 0 else []

def find_date(blocks, date_str):
    for block in blocks:
        for key in ['heading4', 'heading2', 'text']:
            if key in block:
                for el in block[key].get('elements', []):
                    if 'text_run' in el and date_str in el['text_run'].get('content', ''):
                        return block
    return None

def find_insert_index(blocks, doc_id):
    """找到"金、本月最重要的任务"的位置"""
    for i, block in enumerate(blocks):
        if block.get('parent_id') == doc_id:
            for key in ['heading2']:
                if key in block:
                    for el in block[key].get('elements', []):
                        if 'text_run' in el and '本月最重要的任务' in el['text_run'].get('content', ''):
                            return i + 1  # 在它后面插入
    return 1  # 默认插入到开头后面

def build_blocks(date_str, tasks):
    """构建所有内容块"""
    blocks = []
    
    # 日期标题
    blocks.append({
        "block_type": 6,
        "heading4": {
            "elements": [{"text_run": {"content": f"{date_str}  ", "text_element_style": {}}}],
            "style": {"align": 1}
        }
    })
    
    # 执行callout
    blocks.append({
        "block_type": 19,
        "callout": {
            "emoji_id": "sunrise",
            "background_color": 2,
            "border_color": 2,
            "elements": [{"text_run": {"content": "[执行]", "text_element_style": {"bold": True, "text_color": 7}}}]
        }
    })
    
    # 按象限分组
    quadrant_order = ["重要紧急", "重要不紧急", "不重要紧急", "不重要不紧急"]
    color_map = {"重要紧急": 5, "重要不紧急": 3, "不重要紧急": 6, "不重要不紧急": 4}
    
    for quadrant in quadrant_order:
        tasks_in_q = [t for t in tasks if t.get('quadrant') == quadrant]
        if not tasks_in_q:
            continue
        
        # 象限标题
        blocks.append({
            "block_type": 2,
            "text": {
                "elements": [{"text_run": {"content": f"[{quadrant}]", "text_element_style": {"bold": True, "text_color": color_map.get(quadrant, 1)}}}],
                "style": {"align": 1}
            }
        })
        
        for task in tasks_in_q:
            # 人物任务 - 使用todo可打勾
            events = "、".join(task['events'])
            blocks.append({
                "block_type": 17,
                "todo": {
                    "elements": [{"text_run": {"content": f"{task['person']}（{events}）", "text_element_style": {}}}],
                    "style": {"done": False, "align": 1}
                }
            })
            
            # { 开始
            blocks.append({
                "block_type": 2,
                "text": {"elements": [{"text_run": {"content": "{", "text_element_style": {}}}], "style": {}}
            })
            
            # TNTWF
            labels = [("T", task.get('t_targets', [])), ("N", task.get('n_process', [])),
                      ("T", task.get('t_thoughts', [])), ("W", task.get('w_work', [])),
                      ("F", task.get('f_feedback', []))]
            
            for label, items in labels:
                if items:
                    blocks.append({
                        "block_type": 2,
                        "text": {"elements": [{"text_run": {"content": label, "text_element_style": {"bold": True}}}], "style": {}}
                    })
                    for item in items:
                        blocks.append({
                            "block_type": 17,
                            "todo": {
                                "elements": [{"text_run": {"content": item, "text_element_style": {}}}],
                                "style": {"done": False}
                            }
                        })
            
            # } 结束
            blocks.append({
                "block_type": 2,
                "text": {"elements": [{"text_run": {"content": "}", "text_element_style": {}}}], "style": {}}
            })
        
        # 空行
        blocks.append({
            "block_type": 2,
            "text": {"elements": [{"text_run": {"content": "", "text_element_style": {}}}], "style": {}}
        })
    
    return blocks

def write_tasks(wiki_url, date_str, tasks):
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
    
    doc_id = wiki_url.rstrip('/').split('/')[-1]
    print(f"📄 文档: {doc_id}")
    
    blocks = get_blocks(doc_id, token)
    print(f"📊 共 {len(blocks)} 个块")
    
    # 检查日期是否存在
    if find_date(blocks, date_str):
        print(f"⚠️ {date_str} 已存在，跳过")
        return True
    
    # 找插入位置
    insert_index = find_insert_index(blocks, doc_id)
    print(f"📍 插入位置: 索引 {insert_index}")
    
    # 构建内容
    content_blocks = build_blocks(date_str, tasks)
    print(f"📝 准备写入 {len(content_blocks)} 个块")
    
    # 写入
    result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', token, {
        "children": content_blocks,
        "index": insert_index
    })
    
    if result.get('code') == 0:
        print("✅ 写入成功!")
        return True
    else:
        print(f"❌ 失败: {result}")
        return False

def write_yesterday():
    """写入昨天的任务"""
    date_str = "1月25日"
    
    tasks = [
        {
            "person": "卡若",
            "events": ["Soul", "小程序", "部署"],
            "quadrant": "重要紧急",
            "t_targets": ["Soul→后台完善 💻", "小程序→认证通过 ✅"],
            "n_process": ["后台6个页面", "API 15个接口"],
            "t_thoughts": ["快速迭代上线"],
            "w_work": ["全栈开发"],
            "f_feedback": ["Soul后台完成 ✅", "小程序管理SKILL ✅"]
        },
        {
            "person": "卡人",
            "events": ["小程序", "认证"],
            "quadrant": "重要紧急",
            "t_targets": ["企业认证→指南完成 📋"],
            "n_process": ["隐私协议指南", "审核规范整理"],
            "t_thoughts": ["流程标准化"],
            "w_work": ["文档沉淀"],
            "f_feedback": ["4份指南文档 ✅"]
        },
        {
            "person": "卡资",
            "events": ["服务器", "部署"],
            "quadrant": "重要不紧急",
            "t_targets": ["一键部署→脚本优化 🚀"],
            "n_process": ["部署脚本更新"],
            "t_thoughts": ["运维自动化"],
            "w_work": ["脚本开发"],
            "f_feedback": ["一键部署.py ✅"]
        }
    ]
    
    wiki_url = "https://cunkebao.feishu.cn/wiki/JZiiwxEjHiRxouk8hSPcqBn6nrd"
    return write_tasks(wiki_url, date_str, tasks)

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "yesterday":
        write_yesterday()
    else:
        today = datetime.now()
        date_str = f"{today.month}月{today.day}日"
        
        tasks = [
            {
                "person": "卡若",
                "events": ["荷电", "玩值", "知己"],
                "quadrant": "重要紧急",
                "t_targets": ["荷电→招商 💰", "玩值→一页纸 📄"],
                "n_process": ["五行文档12份"],
                "t_thoughts": ["何天全→快速落地"],
                "w_work": ["云阿米巴"],
                "f_feedback": ["荷电可招商 ✅"]
            },
            {
                "person": "卡火",
                "events": ["技能", "经验"],
                "quadrant": "重要不紧急",
                "t_targets": ["技能库→5个SKILL 📚"],
                "n_process": ["SKILL更新"],
                "t_thoughts": ["系统化沉淀"],
                "w_work": ["学习→转化"],
                "f_feedback": ["经验归档 ✅"]
            }
        ]
        
        wiki_url = "https://cunkebao.feishu.cn/wiki/JZiiwxEjHiRxouk8hSPcqBn6nrd"
        write_tasks(wiki_url, date_str, tasks)
