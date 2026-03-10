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
        3: os.environ.get('FEISHU_MARCH_WIKI_TOKEN') or '',  # 2026年3月（突破执行），需在飞书复制2月文档后填 token
    },
    'SERVICE_PORT': 5050,
    'TOKEN_FILE': os.path.join(os.path.dirname(__file__), '.feishu_tokens.json')
}

# 授权 scope：wiki/docx/drive 用于日志与文档；bitable:app、base:app:create 用于创建多维表格（上传 JSON 按类型创建）
AUTH_URL = f"https://open.feishu.cn/open-apis/authen/v1/authorize?app_id={CONFIG['APP_ID']}&redirect_uri=http%3A//localhost%3A{CONFIG['SERVICE_PORT']}/api/auth/callback&scope=wiki:wiki+docx:document+drive:drive+bitable:app+base:app:create"
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
# 写日志前应先读 运营中枢/工作台/2026年整体目标.md，使百分比与总目标一致、上下文相关
def get_today_tasks():
    """获取今天的任务（可自定义修改）；目标百分比以总目标为核心，见 2026年整体目标.md"""
    today = datetime.now()
    date_str = f"{today.month}月{today.day}日"
    
    # 每日固定项：开发<20%，侧重事务与方向；每晚20:00玩值电竞朋友圈已入本机日历
    tasks = [
        {
            "person": "卡若",
            "events": ["一人公司", "玩值电竞", "事务与方向", "飞书日志"],
            "quadrant": "重要紧急",
            "t_targets": [
                "一人公司→分发聚合 (5%)",
                "玩值电竞→Docker/功能 (25%)；每晚20:00朋友圈→本机日历重复",
                "飞书日志→每日迭代 (100%)",
            ],
            "n_process": [
                "【事务】导出与婼瑄导出见 卡若Ai的文件夹/执行日志",
                "【方向】一人公司第一、玩值电竞第二；开发内容控在20%内",
                "【日志】每日更新前日进度与完成度",
            ],
            "t_thoughts": ["日志以事务与未来为主，开发仅提要"],
            "w_work": ["一人公司", "玩值电竞", "飞书日志", "导出/婼瑄日志"],
            "f_feedback": ["一人公司 5% 🔄", "玩值电竞 25% 🔄", "日志 100% ✅"]
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
            
            # TNTWF格式：仅 W(工作) F(反馈) 有复选框，T/N/T 为纯文本
            labels = [
                ('T', 't_targets', '目标', False),
                ('N', 'n_process', '过程', False),
                ('T', 't_thoughts', '思考', False),
                ('W', 'w_work', '工作', True),
                ('F', 'f_feedback', '反馈', True)
            ]
            for label, key, name, use_todo in labels:
                items = task.get(key, [])
                if items:
                    blocks.append({'block_type': 2, 'text': {'elements': [{'text_run': {'content': f'{label} ({name})', 'text_element_style': {'bold': True}}}], 'style': {}}})
                    for item in items:
                        if use_todo:
                            blocks.append({'block_type': 17, 'todo': {'elements': [{'text_run': {'content': item}}], 'style': {'done': False}}})
                        else:
                            blocks.append({'block_type': 2, 'text': {'elements': [{'text_run': {'content': item}}], 'style': {}}})
            
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


MONTH_TOKENS_FILE = os.path.join(os.path.dirname(__file__), ".feishu_month_wiki_tokens.json")


def _try_auto_fetch_march_token(access_token):
    """无 3 月 token 时通过 API 自动获取：用 2 月文档所在 space 列出节点，匹配标题含「3月」的节点并写入本地。返回 token 或 None。"""
    feb_token = (CONFIG.get("MONTH_WIKI_TOKENS") or {}).get(2) or CONFIG.get("WIKI_TOKEN")
    if not feb_token:
        return None
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    try:
        r = requests.get(
            "https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node",
            params={"token": feb_token},
            headers=headers,
            timeout=15,
        )
        j = r.json()
        if j.get("code") != 0:
            return None
        data = j.get("data", {})
        node = data.get("node", {})
        space_id = node.get("space_id") or data.get("space_id")
        if not space_id:
            return None
        # 列出空间下节点（可能需分页）
        page_token = None
        for _ in range(5):
            params = {"page_size": 50}
            if page_token:
                params["page_token"] = page_token
            r2 = requests.get(
                f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes",
                params=params,
                headers=headers,
                timeout=15,
            )
            j2 = r2.json()
            if j2.get("code") != 0:
                break
            items = j2.get("data", {}).get("items", [])
            for n in items:
                title = (n.get("title") or "")
                if "3月" in title or "3 月" in title:
                    tok = n.get("node_token") or n.get("obj_token") or n.get("token")
                    if tok:
                        data = {}
                        if os.path.exists(MONTH_TOKENS_FILE):
                            try:
                                with open(MONTH_TOKENS_FILE, encoding="utf-8") as f:
                                    data = json.load(f)
                            except Exception:
                                pass
                        data["3"] = tok
                        with open(MONTH_TOKENS_FILE, "w", encoding="utf-8") as f:
                            json.dump(data, f, ensure_ascii=False, indent=2)
                        print("✅ 已通过 API 自动获取 3 月文档 token 并写入本地")
                        return tok
            page_token = j2.get("data", {}).get("page_token")
            if not page_token or not j2.get("data", {}).get("has_more"):
                break
    except Exception as e:
        print(f"⚠️ 自动获取 3 月 token 异常: {e}")
    return None


def _get_month_wiki_token(month):
    """当月 wiki token：3 月优先 环境变量 > 本地 .feishu_month_wiki_tokens.json > CONFIG"""
    if month == 3:
        v = os.environ.get("FEISHU_MARCH_WIKI_TOKEN", "").strip()
        if v:
            return v
        try:
            if os.path.exists(MONTH_TOKENS_FILE):
                with open(MONTH_TOKENS_FILE, encoding="utf-8") as f:
                    v = (json.load(f).get("3") or "").strip()
                    if v:
                        return v
        except Exception:
            pass
        return (CONFIG.get("MONTH_WIKI_TOKENS") or {}).get(3) or ""
    return (CONFIG.get("MONTH_WIKI_TOKENS") or {}).get(month) or ""


def resolve_wiki_token_for_date(date_str, explicit_wiki_token=None):
    """根据日期路由文档token；允许显式覆盖；当月 token 为空时返回 None"""
    if explicit_wiki_token:
        return explicit_wiki_token
    month = parse_month_from_date_str(date_str)
    if month:
        tok = _get_month_wiki_token(month)
        if tok and str(tok).strip():
            return tok
        if month in (1, 2):
            return CONFIG["MONTH_WIKI_TOKENS"].get(month) or CONFIG["WIKI_TOKEN"]
        return None  # 3 月等未配置时返回 None
    return CONFIG["WIKI_TOKEN"]

def _find_date_section_block_ids(blocks, date_str, doc_id):
    """找到某日期区块的 block_id 列表（用于覆盖删除）"""
    date_re = re.compile(r'\d+\s*月\s*\d+\s*日')
    start_i = None
    for i, block in enumerate(blocks):
        for key in ['heading4', 'text']:
            if key in block:
                for el in block[key].get('elements', []):
                    c = el.get('text_run', {}).get('content', '')
                    if date_str in c:
                        start_i = i
                        break
        if start_i is not None:
            break
    if start_i is None:
        return []
    # 从 start_i 向后收集，直到遇到下一个日期标题
    ids = []
    for i in range(start_i, len(blocks)):
        b = blocks[i]
        bid = b.get('block_id')
        if not bid:
            continue
        # 若遇下一个日期 heading4，停止
        if i > start_i and 'heading4' in b:
            for el in b.get('heading4', {}).get('elements', []):
                if date_re.search(el.get('text_run', {}).get('content', '')):
                    return ids
        ids.append(bid)
    return ids

def write_log(token, date_str=None, tasks=None, wiki_token=None, overwrite=False):
    """写入日志（倒序插入：新日期在最上面）；overwrite=True 时先删后写"""
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    if not date_str or not tasks:
        date_str, tasks = get_today_tasks()
    target_wiki_token = resolve_wiki_token_for_date(date_str, wiki_token)
    month = parse_month_from_date_str(date_str)
    if not target_wiki_token:
        if month == 3:
            print("🔄 未配置 3 月 token，尝试通过 API 自动获取...")
            target_wiki_token = _try_auto_fetch_march_token(token)
        if not target_wiki_token:
            print(f"❌ 未配置当月文档 token（{month or '?'} 月请用 feishu_token_cli.py set-march-token <token> 或设置环境变量）")
            return False

    # 获取文档ID（若为 3 月且 get_node 失败，可再尝试自动获取后重试一次）
    r = requests.get(f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={target_wiki_token}",
        headers=headers, timeout=30)
    if r.json().get('code') != 0 and month == 3:
        target_wiki_token = _try_auto_fetch_march_token(token)
        if target_wiki_token:
            r = requests.get(f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={target_wiki_token}",
                headers=headers, timeout=30)
    if r.json().get('code') != 0:
        # 若本地曾保存过无效 token，清除以便下次可重新自动获取或手动 set
        try:
            if os.path.exists(MONTH_TOKENS_FILE) and month == 3:
                with open(MONTH_TOKENS_FILE, encoding="utf-8") as f:
                    data = json.load(f)
                if (data.get("3") or "").strip() == (target_wiki_token or "").strip():
                    data["3"] = ""
                    with open(MONTH_TOKENS_FILE, "w", encoding="utf-8") as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
        print(f"❌ 获取文档失败（当月 token 无效或网络异常，可用 feishu_token_cli.py set-march-token 写入正确 token）")
        return False
    node = r.json()['data']['node']
    doc_id = node['obj_token']
    doc_title = node.get('title', '')

    # 防串月：文档月份与当月不符则先迁（新建当月文档并 set-march-token）
    month = parse_month_from_date_str(date_str)
    if month and f"{month}月" not in doc_title:
        print(f"❌ 文档月份与当月不符：《{doc_title}》不含「{month}月」")
        print(f"   请先在飞书新建当月文档，再用 feishu_token_cli.py set-march-token <新文档token> 后重试")
        return False
    
    r = requests.get(f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks", 
        headers=headers, params={'document_revision_id': -1, 'page_size': 500}, timeout=30)
    blk_data = r.json().get('data', {})
    blocks = blk_data.get('items', [])
    
    # 检查是否已存在
    exists = False
    for block in blocks:
        for key in ['heading4', 'text']:
            if key in block:
                for el in block[key].get('elements', []):
                    if 'text_run' in el and date_str in el['text_run'].get('content', ''):
                        exists = True
                        break
        if exists:
            break
    
    if exists and overwrite:
        to_del = _find_date_section_block_ids(blocks, date_str, doc_id)
        if to_del:
            try:
                for i in range(0, len(to_del), 20):
                    batch = to_del[i:i+20]
                    body = {"requests": [{"block_id": bid} for bid in batch]}
                    rd = requests.post(f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/batch_delete",
                        headers=headers, json=body, timeout=30)
                    try:
                        j = rd.json()
                    except Exception:
                        j = {}
                    if j.get('code') != 0:
                        print(f"⚠️ 覆盖删除失败: {j.get('msg', rd.text[:80])}，请手动删飞书中 {date_str} 后重试")
                        break
                else:
                    r = requests.get(f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks", 
                        headers=headers, params={'document_revision_id': -1, 'page_size': 500}, timeout=30)
                    blocks = r.json().get('data', {}).get('items', [])
                    exists = False
            except Exception as e:
                print(f"⚠️ 覆盖删除异常: {e}，请手动删飞书中 {date_str} 后重试")
    
    if exists:
        print(f"✅ {date_str} 日志已存在，无需重复写入（可用 --overwrite 覆盖）")
        return True
    
    # 找插入位置：有「本月最重要的任务」则插在其后，否则插在文档开头(index=0)，避免新/空文档 index=1 报 invalid param
    root_blocks = [b for b in blocks if b.get('parent_id') == doc_id]
    insert_index = 0
    for i, block in enumerate(root_blocks):
        if 'heading2' in block:
            for el in block['heading2'].get('elements', []):
                if 'text_run' in el and '本月最重要的任务' in el['text_run'].get('content', ''):
                    insert_index = i + 1
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
