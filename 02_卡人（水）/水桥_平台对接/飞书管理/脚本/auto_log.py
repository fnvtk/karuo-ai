#!/usr/bin/env python3
"""
飞书日志一键写入（全自动+静默授权）
- 优先使用refresh_token自动刷新（静默）
- 写入日志（倒序：新日期在上）
- 自动打开飞书查看结果

使用: python3 auto_log.py
"""
import os
import sys
import json
import subprocess
import requests
from datetime import datetime, timedelta
import time
import re

# ============ 配置 ============
CONFIG = {
    'APP_ID': 'cli_a48818290ef8100d',
    'APP_SECRET': 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4',
    'WIKI_TOKEN': 'JZiiwxEjHiRxouk8hSPcqBn6nrd',
    # 按月份路由到对应日志文档，避免跨月误写
    'MONTH_WIKI_TOKENS': {
        1: 'JZiiwxEjHiRxouk8hSPcqBn6nrd',  # 2026年1月 运营团队启动
        2: 'Jn2EwXP2OiTujNkAbNCcDcM7nRA',  # 2026年2月 （突破执行）
    },
    'SERVICE_PORT': 5050,
    'TOKEN_FILE': os.path.join(os.path.dirname(__file__), '.feishu_tokens.json')
}

AUTH_URL = f"https://open.feishu.cn/open-apis/authen/v1/authorize?app_id={CONFIG['APP_ID']}&redirect_uri=http%3A//localhost%3A{CONFIG['SERVICE_PORT']}/api/auth/callback&scope=wiki:wiki+docx:document+drive:drive"
WIKI_URL = f"https://cunkebao.feishu.cn/wiki/{CONFIG['WIKI_TOKEN']}"

# ============ Token管理（静默） ============
def load_tokens():
    """加载token文件"""
    if os.path.exists(CONFIG['TOKEN_FILE']):
        with open(CONFIG['TOKEN_FILE']) as f:
            return json.load(f)
    return {}

def save_tokens(tokens):
    """保存token文件"""
    with open(CONFIG['TOKEN_FILE'], 'w') as f:
        json.dump(tokens, f, ensure_ascii=False, indent=2)

def get_app_token():
    """获取应用token"""
    r = requests.post("https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal/",
        json={"app_id": CONFIG['APP_ID'], "app_secret": CONFIG['APP_SECRET']}, timeout=10)
    data = r.json()
    return data.get('app_access_token') if data.get('code') == 0 else None

def refresh_token_silent(tokens):
    """静默刷新token（优先使用）"""
    if not tokens.get('refresh_token'):
        return None
    
    app_token = get_app_token()
    if not app_token:
        return None
    
    r = requests.post(
        "https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token",
        headers={"Authorization": f"Bearer {app_token}", "Content-Type": "application/json"},
        json={"grant_type": "refresh_token", "refresh_token": tokens['refresh_token']}, 
        timeout=10
    )
    result = r.json()
    
    if result.get('code') == 0:
        data = result.get('data', {})
        tokens['access_token'] = data.get('access_token')
        tokens['refresh_token'] = data.get('refresh_token')
        tokens['auth_time'] = datetime.now().isoformat()
        save_tokens(tokens)
        return tokens['access_token']
    return None

def check_token_valid(token):
    """检查token是否有效"""
    if not token:
        return False
    try:
        r = requests.get(
            f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={CONFIG['WIKI_TOKEN']}",
            headers={'Authorization': f'Bearer {token}'}, timeout=10)
        return r.json().get('code') == 0
    except:
        return False

def ensure_service():
    """确保本地服务运行"""
    try:
        r = requests.get(f"http://localhost:{CONFIG['SERVICE_PORT']}/api/health", timeout=2)
        if r.json().get('status') == 'ok':
            return True
    except:
        pass
    
    # 启动服务（后台）
    script_dir = os.path.dirname(__file__)
    subprocess.Popen(
        ['python3', 'feishu_api.py'],
        cwd=script_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(2)
    return True

def get_token_silent():
    """静默获取token（优先refresh，失败才授权）"""
    tokens = load_tokens()
    
    # 1. 先尝试使用现有token
    if tokens.get('access_token'):
        if check_token_valid(tokens['access_token']):
            return tokens['access_token']
    
    # 2. 尝试refresh_token刷新（静默）
    print("🔄 静默刷新Token...")
    new_token = refresh_token_silent(tokens)
    if new_token and check_token_valid(new_token):
        print("✅ Token刷新成功（静默）")
        return new_token
    
    # 3. refresh失败，需要重新授权（后台打开，不显示）
    print("⚠️ Token已过期，需要重新授权...")
    ensure_service()
    
    # 后台打开授权（不显示窗口）
    subprocess.Popen(['open', '-g', '-a', 'Feishu', AUTH_URL], 
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    # 等待授权完成（最多30秒）
    for i in range(30):
        time.sleep(1)
        tokens = load_tokens()
        if tokens.get('access_token'):
            if check_token_valid(tokens['access_token']):
                print("✅ 授权成功")
                return tokens['access_token']
    
    print("❌ 授权超时")
    return None

# ============ 日志写入 ============
def get_today_tasks():
    """获取今天的任务（可自定义修改）"""
    today = datetime.now()
    date_str = f"{today.month}月{today.day}日"
    
    # 今日三条要事（2026-02-20）
    tasks = [
        {
            "person": "卡若",
            "events": ["书小程序修改上架", "玉宁直播项目运营", "算力分布系统"],
            "quadrant": "重要紧急",
            "t_targets": [
                "书小程序→修改并完成上架 📱 (0%)",
                "玉宁直播项目→运营情况跟进与落地 📺 (0%)",
                "算力分布系统→晚上9点推进 ⚡ (0%)"
            ],
            "n_process": [
                "【书小程序】需求确认→修改开发→提审→上架",
                "【玉宁直播】运营数据查看→问题跟进→优化动作",
                "【算力分布】今晚21:00 算力分布系统开发/联调"
            ],
            "t_thoughts": ["三件事并行：产品上架、直播运营、算力系统"],
            "w_work": ["小程序开发与上架", "直播运营", "算力系统开发"],
            "f_feedback": ["书小程序→待执行 ⏰", "玉宁直播→待执行 ⏰", "算力分布系统→今晚21:00 ⏰"]
        }
    ]
    
    return date_str, tasks

def build_blocks(date_str, tasks):
    """构建飞书文档块（倒序：新日期在上）"""
    blocks = [
        {'block_type': 6, 'heading4': {'elements': [{'text_run': {'content': f'{date_str}  '}}], 'style': {'align': 1}}},
        {'block_type': 19, 'callout': {'emoji_id': 'sunrise', 'background_color': 2, 'border_color': 2, 
         'elements': [{'text_run': {'content': '[执行]', 'text_element_style': {'bold': True, 'text_color': 7}}}]}}
    ]
    
    quadrant_colors = {"重要紧急": 5, "重要不紧急": 3, "不重要紧急": 6, "不重要不紧急": 4}
    quadrant_order = ["重要紧急", "重要不紧急", "不重要紧急", "不重要不紧急"]
    
    for quadrant in quadrant_order:
        q_tasks = [t for t in tasks if t.get('quadrant') == quadrant]
        if not q_tasks:
            continue
            
        blocks.append({'block_type': 2, 'text': {'elements': [{'text_run': {'content': f'[{quadrant}]', 
            'text_element_style': {'bold': True, 'text_color': quadrant_colors[quadrant]}}}], 'style': {'align': 1}}})
        
        for task in q_tasks:
            events = "、".join(task['events'])
            blocks.append({'block_type': 17, 'todo': {'elements': [{'text_run': {'content': f"{task['person']}（{events}）"}}], 
                'style': {'done': False, 'align': 1}}})
            blocks.append({'block_type': 2, 'text': {'elements': [{'text_run': {'content': '{'}}], 'style': {}}})
            
            # TNTWF格式，标注清楚
            labels = [
                ('T', 't_targets', '目标'),
                ('N', 'n_process', '过程'),
                ('T', 't_thoughts', '思考'),
                ('W', 'w_work', '工作'),
                ('F', 'f_feedback', '反馈')
            ]
            
            for label, key, name in labels:
                items = task.get(key, [])
                if items:
                    blocks.append({'block_type': 2, 'text': {'elements': [{'text_run': {'content': f'{label} ({name})', 'text_element_style': {'bold': True}}}], 'style': {}}})
                    for item in items:
                        blocks.append({'block_type': 17, 'todo': {'elements': [{'text_run': {'content': item}}], 'style': {'done': False}}})
            
            blocks.append({'block_type': 2, 'text': {'elements': [{'text_run': {'content': '}'}}], 'style': {}}})
        blocks.append({'block_type': 2, 'text': {'elements': [{'text_run': {'content': ''}}], 'style': {}}})
    
    return blocks


def parse_month_from_date_str(date_str):
    """从如 '2月25日' 提取月份整数"""
    m = re.search(r'(\d+)\s*月', date_str or '')
    if not m:
        return None
    try:
        return int(m.group(1))
    except ValueError:
        return None


def resolve_wiki_token_for_date(date_str, explicit_wiki_token=None):
    """根据日期路由文档token；允许显式覆盖"""
    if explicit_wiki_token:
        return explicit_wiki_token
    month = parse_month_from_date_str(date_str)
    if month and month in CONFIG.get('MONTH_WIKI_TOKENS', {}):
        return CONFIG['MONTH_WIKI_TOKENS'][month]
    return CONFIG['WIKI_TOKEN']

def write_log(token, date_str=None, tasks=None, wiki_token=None):
    """写入日志（倒序插入：新日期在最上面）"""
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    if not date_str or not tasks:
        date_str, tasks = get_today_tasks()
    target_wiki_token = resolve_wiki_token_for_date(date_str, wiki_token)
    
    # 获取文档ID
    r = requests.get(f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={target_wiki_token}", 
        headers=headers, timeout=30)
    if r.json().get('code') != 0:
        print(f"❌ 获取文档失败")
        return False
    node = r.json()['data']['node']
    doc_id = node['obj_token']
    doc_title = node.get('title', '')

    # 防串月：日期月份与文档标题不一致时拒绝写入
    month = parse_month_from_date_str(date_str)
    if month and f"{month}月" not in doc_title:
        print(f"❌ 月份校验失败：{date_str} 不应写入《{doc_title}》")
        return False
    
    # 获取blocks检查日期是否存在
    r = requests.get(f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks", 
        headers=headers, params={'page_size': 500}, timeout=30)
    blocks = r.json().get('data', {}).get('items', [])
    
    # 检查是否已存在
    for block in blocks:
        for key in ['heading4', 'text']:
            if key in block:
                for el in block[key].get('elements', []):
                    if 'text_run' in el and date_str in el['text_run'].get('content', ''):
                        print(f"✅ {date_str} 日志已存在，无需重复写入")
                        return True
    
    # 找插入位置（倒序：插入到"本月最重要的任务"标题后，即第一个位置）
    insert_index = 1
    for i, block in enumerate(blocks):
        if block.get('parent_id') == doc_id and 'heading2' in block:
            for el in block['heading2'].get('elements', []):
                if 'text_run' in el and '本月最重要的任务' in el['text_run'].get('content', ''):
                    insert_index = i + 1  # 插入到标题后
                    break
    
    # 写入（倒序：新日期在上）
    content_blocks = build_blocks(date_str, tasks)
    r = requests.post(f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{doc_id}/children",
        headers=headers, json={'children': content_blocks, 'index': insert_index}, timeout=30)
    
    if r.json().get('code') == 0:
        print(f"✅ {date_str} 日志写入成功 -> {doc_title}")
        return True
    else:
        print(f"❌ 写入失败: {r.json().get('msg')}")
        return False

def open_result(wiki_token=None):
    """打开飞书查看结果"""
    token = wiki_token or CONFIG['WIKI_TOKEN']
    url = f"https://cunkebao.feishu.cn/wiki/{token}"
    subprocess.run(['open', url], capture_output=True)
    print(f"📎 已打开飞书: {url}")

# ============ 主流程 ============
def main():
    print("=" * 50)
    print("🚀 飞书日志一键写入（静默授权）")
    print("=" * 50)
    
    # 1. 确保服务运行
    print("\n📡 Step 1: 检查服务...")
    ensure_service()
    
    # 2. 静默获取Token
    print("\n🔑 Step 2: 获取Token（静默）...")
    token = get_token_silent()
    if not token:
        print("❌ 无法获取Token")
        sys.exit(1)
    
    # 3. 写入日志（按月份自动路由）
    print("\n📝 Step 3: 写入日志...")
    date_str, tasks = get_today_tasks()
    target_wiki_token = resolve_wiki_token_for_date(date_str)
    if not write_log(token, date_str, tasks, target_wiki_token):
        sys.exit(1)
    
    # 4. 打开结果
    print("\n🎉 Step 4: 完成!")
    open_result(target_wiki_token)
    
    print("\n" + "=" * 50)
    print("✅ 全部完成!")
    print("=" * 50)

if __name__ == "__main__":
    main()
