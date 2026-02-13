#!/usr/bin/env python3
"""
玩值电竞任务 → 飞书 同步脚本

双模式：
1. 飞书项目：当 FEISHU_PROJECT_PLUGIN_TOKEN + FEISHU_PROJECT_KEY 已配置时，写入飞书项目需求管理
2. 飞书知识库（fallback）：用现有 token 写入飞书知识库「玩值电竞任务清单」文档

使用: python3 wanzhi_feishu_project_sync.py [--dry-run] [--wiki]
"""
import os
import re
import json
import time
import argparse
import requests
from pathlib import Path

# ============ 配置 ============
SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG = {
    # 飞书项目（需用 Plugin ID + Secret 交换 token）
    'PLUGIN_ID': os.environ.get('FEISHU_PROJECT_PLUGIN_ID', 'MII_698EA68807C08CB2'),
    'PLUGIN_SECRET': os.environ.get('FEISHU_PROJECT_PLUGIN_SECRET', '63D218CF0E3B0CBC456B09FF4F7F2ED3'),
    'PLUGIN_TOKEN': os.environ.get('FEISHU_PROJECT_PLUGIN_TOKEN', ''),
    'USER_KEY': os.environ.get('FEISHU_PROJECT_USER_KEY', '756877947514450739'),
    'PROJECT_KEY': os.environ.get('FEISHU_PROJECT_KEY', '玩值电竞'),
    'BASE_URL': 'https://project.feishu.cn',
    # 飞书知识库（fallback，使用存客宝飞书 token）
    'APP_ID': 'cli_a48818290ef8100d',
    'APP_SECRET': 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4',
    'TOKEN_FILE': SCRIPT_DIR / '.feishu_tokens.json',
    'WIKI_PARENT_TOKEN': 'JZiiwxEjHiRxouk8hSPcqBn6nrd',  # 卡若日志所在节点，在其下创建子文档
    # 甘特图路径（支持双月版）
    'GANTT_30': '水：流程规划/玩值电竞_30天落地执行甘特图.md',
    'GANTT_90': '水：流程规划/玩值电竞_90天落地执行甘特图.md',
    'GANTT_双月': '水：流程规划/玩值电竞_双月任务安排（飞书项目版）.md',
}

WANZHI_ROOT = Path(os.environ.get('WANZHI_ROOT', '/Users/karuo/Documents/1、金：项目/3、自营项目/玩值电竞'))


def parse_gantt_table(content: str, source: str) -> list[dict]:
    """从 Markdown 表格解析任务（支持 **Day N** 与 Day N 两种格式）"""
    tasks = []
    # 匹配 | Day N | 或 | **Day N** | 任务 | 负责人 | 交付物/产出 | 状态 |
    pattern = r'\|\s*(?:\*\*)?Day\s*(\d+)(?:\*\*)?\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|'
    for m in re.finditer(pattern, content, re.IGNORECASE):
        day, name, owner, deliverable = m.groups()
        name = name.strip()
        owner = owner.strip()
        deliverable = deliverable.strip()
        if not name or '天数' in name or '日期' in name or name.startswith('---'):
            continue
        tasks.append({
            'day': int(day),
            'name': name,
            'owner': owner,
            'deliverable': deliverable,
            'source': source,
        })
    return tasks


def parse_shuangyue_table(content: str, source: str) -> list[dict]:
    """解析双月任务表 | 任务 | 负责人 | 截止 | 交付物 |"""
    tasks = []
    for m in re.finditer(r'\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|', content):
        name, owner, deadline, deliverable = (x.strip() for x in m.groups())
        if not name or name in ('任务', '---') or name.startswith('---'):
            continue
        tasks.append({'day': 0, 'name': name, 'owner': owner, 'deliverable': deliverable, 'source': source, 'deadline': deadline})
    return tasks


def load_tasks_from_gantt() -> list[dict]:
    """从 30天、90天、双月 甘特图加载任务"""
    tasks = []
    for name, rel in [
        ('30天', CONFIG.get('GANTT_30', '水：流程规划/玩值电竞_30天落地执行甘特图.md')),
        ('90天', CONFIG.get('GANTT_90', '水：流程规划/玩值电竞_90天落地执行甘特图.md')),
        ('双月', CONFIG.get('GANTT_双月', '水：流程规划/玩值电竞_双月任务安排（飞书项目版）.md')),
    ]:
        path = WANZHI_ROOT / rel
        if path.exists():
            content = path.read_text(encoding='utf-8')
            if '双月' in name:
                tasks.extend(parse_shuangyue_table(content, name))
            else:
                tasks.extend(parse_gantt_table(content, name))
    seen = set()
    unique = []
    for t in tasks:
        k = (t.get('day', 0), t['name'])
        if k not in seen:
            seen.add(k)
            unique.append(t)
    return unique


def get_feishu_token() -> str | None:
    """获取飞书 access_token（用于知识库写入）"""
    tokens = {}
    if CONFIG['TOKEN_FILE'].exists():
        with open(CONFIG['TOKEN_FILE']) as f:
            tokens = json.load(f)
    token = tokens.get('access_token')
    if token:
        r = requests.get(
            f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={CONFIG['WIKI_PARENT_TOKEN']}",
            headers={'Authorization': f'Bearer {token}'}, timeout=10)
        if r.json().get('code') == 0:
            return token
    # 尝试 refresh
    if tokens.get('refresh_token'):
        app_r = requests.post(
            "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal/",
            json={"app_id": CONFIG['APP_ID'], "app_secret": CONFIG['APP_SECRET']}, timeout=10)
        app_token = app_r.json().get('app_access_token') if app_r.json().get('code') == 0 else None
        if app_token:
            ref_r = requests.post(
                "https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token",
                headers={"Authorization": f"Bearer {app_token}", "Content-Type": "application/json"},
                json={"grant_type": "refresh_token", "refresh_token": tokens['refresh_token']}, timeout=10)
            if ref_r.json().get('code') == 0:
                tokens['access_token'] = ref_r.json()['data']['access_token']
                tokens['refresh_token'] = ref_r.json()['data'].get('refresh_token', tokens['refresh_token'])
                with open(CONFIG['TOKEN_FILE'], 'w') as f:
                    json.dump(tokens, f, ensure_ascii=False, indent=2)
                return tokens['access_token']
    return None


def write_tasks_to_wiki(token: str, tasks: list[dict]) -> tuple[int, str | None]:
    """把任务写入飞书知识库（在卡若日志节点下创建子文档「玩值电竞任务清单」）"""
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    # 1. 获取父节点信息（含 space_id）
    r = requests.get(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={CONFIG['WIKI_PARENT_TOKEN']}",
        headers=headers, timeout=30)
    if r.json().get('code') != 0:
        return 0, r.json().get('msg', 'get_node failed')
    node = r.json()['data']['node']
    space_id = node.get('space_id') or (node.get('space') or {}).get('space_id')
    if not space_id:
        space_id = node.get('origin_space_id')
    # 2. 创建子节点
    create_r = requests.post(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes",
        headers=headers,
        json={
            "parent_node_token": CONFIG['WIKI_PARENT_TOKEN'],
            "obj_type": "doc",
            "node_type": "origin",
            "title": "玩值电竞任务清单",
        },
        timeout=30)
    create_data = create_r.json()
    if create_r.status_code != 200 or create_data.get('code') != 0:
        return 0, create_data.get('msg', str(create_data))
    new_node = create_data.get('data', {}).get('node', {})
    node_token = new_node.get('node_token')
    doc_token = new_node.get('obj_token') or node_token
    if not doc_token:
        nr = requests.get(
            f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={node_token}",
            headers=headers, timeout=30)
        if nr.json().get('code') == 0:
            doc_token = nr.json()['data']['node'].get('obj_token') or node_token
    # 3. 构建 blocks 并写入
    blocks = [
        {'block_type': 4, 'heading2': {'elements': [{'text_run': {'content': '玩值电竞任务清单（30天+90天甘特图）', 'text_element_style': {}}}], 'style': {'align': 1}}},
        {'block_type': 2, 'text': {'elements': [{'text_run': {'content': f'共 {len(tasks)} 条任务，来源：玩值电竞落地执行甘特图', 'text_element_style': {}}}], 'style': {'align': 1}}},
    ]
    for t in tasks:
        blocks.append({
            'block_type': 17,
            'todo': {
                'elements': [{'text_run': {'content': f"[Day {t['day']}] {t['name']} | 负责人: {t['owner']} | 交付: {t['deliverable']}", 'text_element_style': {}}}],
                'style': {'done': False, 'align': 1}
            }
        })
    # 分批写入（每批最多 50）
    ok = 0
    for i in range(0, len(blocks), 50):
        batch = blocks[i:i + 50]
        wr = requests.post(
            f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks/{doc_token}/children",
            headers=headers,
            json={'children': batch, 'index': i},
            timeout=30)
        if wr.json().get('code') == 0:
            ok += len(batch)
        time.sleep(0.2)
    url = f"https://cunkebao.feishu.cn/wiki/{node_token}" if node_token else "https://cunkebao.feishu.cn/wiki"
    return ok, url


def get_plugin_token() -> str | None:
    """用 Plugin ID + Secret 交换 X-PLUGIN-TOKEN"""
    if CONFIG['PLUGIN_TOKEN']:
        return CONFIG['PLUGIN_TOKEN']
    r = requests.post(
        f"{CONFIG['BASE_URL']}/open_api/authen/plugin_token",
        headers={'Content-Type': 'application/json'},
        json={
            'plugin_id': CONFIG['PLUGIN_ID'],
            'plugin_secret': CONFIG['PLUGIN_SECRET'],
        },
        timeout=15)
    d = r.json()
    if d.get('error', {}).get('code') == 0 and d.get('data', {}).get('token'):
        return d['data']['token']
    return None


def create_work_item(task: dict, plugin_token: str, dry_run: bool) -> bool:
    """调用飞书项目 API 创建工作项"""
    if not plugin_token or not CONFIG['PROJECT_KEY']:
        return False

    url = f"{CONFIG['BASE_URL']}/open_api/{CONFIG['PROJECT_KEY']}/work_item/create"
    headers = {
        'Content-Type': 'application/json',
        'X-PLUGIN-TOKEN': plugin_token,
    }
    if CONFIG.get('USER_KEY'):
        headers['X-USER-KEY'] = CONFIG['USER_KEY']
    desc = f"负责人: {task['owner']}\n交付物: {task['deliverable']}\n来源: {task['source']}"
    if task.get('day'):
        desc += f" Day {task['day']}"
    if task.get('deadline'):
        desc += f"\n截止: {task['deadline']}"
    body = {
        'name': task['name'],
        'work_item_type_key': 'story',
        'field_value_pairs': [
            {'field_key': 'name', 'field_value': task['name']},
            {'field_key': 'description', 'field_value': desc},
        ],
    }

    if dry_run:
        print(f"  [dry-run] 创建: {task['name']} | {task['owner']}")
        return True

    try:
        r = requests.post(url, headers=headers, json=body, timeout=15)
        data = r.json()
        err = data.get('error', {})
        if r.status_code == 200 and err.get('code') == 0:
            print(f"  ✅ {task['name']}")
            return True
        print(f"  ❌ {task['name']}: {err.get('msg', data.get('msg', r.text))}")
        return False
    except Exception as e:
        print(f"  ❌ {task['name']}: {e}")
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true', help='仅解析不请求')
    ap.add_argument('--wiki', action='store_true', help='强制使用飞书知识库（不请求飞书项目 API）')
    args = ap.parse_args()

    print('📋 玩值电竞 → 飞书 任务同步')
    print('=' * 50)

    tasks = load_tasks_from_gantt()
    print(f'解析到 {len(tasks)} 条任务')

    if not tasks:
        print('未找到任务，请检查甘特图路径')
        return

    if args.dry_run:
        print('\n[dry-run] 前 10 条:')
        for t in tasks[:10]:
            print(f"  Day {t['day']} | {t['owner']} | {t['name']}")
        print('...')
        return

    # 模式 1：飞书项目（需 Plugin ID+Secret 或 PLUGIN_TOKEN + PROJECT_KEY + USER_KEY）
    use_project = (CONFIG['PLUGIN_TOKEN'] or (CONFIG['PLUGIN_ID'] and CONFIG['PLUGIN_SECRET'])) and CONFIG['PROJECT_KEY'] and not args.wiki
    if use_project:
        plugin_token = get_plugin_token()
        if not plugin_token:
            print('❌ 无法获取飞书项目 Plugin Token（请检查 Plugin ID/Secret）')
            return
        if not CONFIG.get('USER_KEY'):
            print('\n❌ 飞书项目 API 需要 X-USER-KEY')
            print('   请在飞书项目内双击你的头像获取 user_key，然后设置:')
            print('   export FEISHU_PROJECT_USER_KEY=你的user_key')
            return
        print(f'\n✅ 已获取 Plugin Token，开始同步到飞书项目...')
        ok = 0
        for t in tasks:
            if create_work_item(t, plugin_token, False):
                ok += 1
            time.sleep(0.1)
        print(f'\n完成: {ok}/{len(tasks)}（飞书项目）')
        return

    # 模式 2：飞书知识库（fallback）
    print('\n使用飞书知识库模式（无飞书项目 Token 或指定 --wiki）')
    token = get_feishu_token()
    if not token:
        print('❌ 无法获取飞书 Token（可能已过期）')
        print('   请先运行: python3 auto_log.py  完成授权/刷新后重试')
        return
    print('✅ Token 有效')
    ok, url_or_err = write_tasks_to_wiki(token, tasks)
    if url_or_err and ok > 0:
        print(f'\n✅ 已写入 {ok} 条到飞书知识库')
        print(f'📎 {url_or_err}')
        import subprocess
        subprocess.run(['open', url_or_err], capture_output=True)
    else:
        print(f'\n❌ 写入失败: {url_or_err}')


if __name__ == '__main__':
    main()
