#!/usr/bin/env python3
"""
在指定飞书 Wiki 节点下创建子文档并写入内容。
用于：日记分享、新研究等内容沉淀到飞书知识库。

用法:
  python3 feishu_wiki_create_doc.py
  python3 feishu_wiki_create_doc.py --parent KNf7wA8Rki1NSdkkSIqcdFtTnWb --title "文档标题" --json blocks.json
"""
import os
import sys
import json
import argparse
import requests
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG = {
    'APP_ID': 'cli_a48818290ef8100d',
    'APP_SECRET': 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4',
    'TOKEN_FILE': os.path.join(SCRIPT_DIR, '.feishu_tokens.json'),
}


def load_tokens():
    if os.path.exists(CONFIG['TOKEN_FILE']):
        with open(CONFIG['TOKEN_FILE'], encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_tokens(tokens):
    with open(CONFIG['TOKEN_FILE'], 'w', encoding='utf-8') as f:
        json.dump(tokens, f, ensure_ascii=False, indent=2)


def get_app_token():
    r = requests.post(
        "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal/",
        json={"app_id": CONFIG['APP_ID'], "app_secret": CONFIG['APP_SECRET']},
        timeout=10)
    data = r.json()
    return data.get('app_access_token') if data.get('code') == 0 else None


def refresh_token_silent(tokens):
    if not tokens.get('refresh_token'):
        return None
    app_token = get_app_token()
    if not app_token:
        return None
    r = requests.post(
        "https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token",
        headers={"Authorization": f"Bearer {app_token}", "Content-Type": "application/json"},
        json={"grant_type": "refresh_token", "refresh_token": tokens['refresh_token']},
        timeout=10)
    result = r.json()
    if result.get('code') == 0:
        data = result.get('data', {})
        tokens['access_token'] = data.get('access_token')
        tokens['refresh_token'] = data.get('refresh_token', tokens['refresh_token'])
        tokens['auth_time'] = datetime.now().isoformat()
        save_tokens(tokens)
        return tokens['access_token']
    return None


def check_token_valid(token, parent_token):
    if not token:
        return False
    try:
        r = requests.get(
            f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={parent_token}",
            headers={'Authorization': f'Bearer {token}'}, timeout=10)
        return r.json().get('code') == 0
    except Exception:
        return False


def get_token(parent_token):
    tokens = load_tokens()
    if tokens.get('access_token') and check_token_valid(tokens['access_token'], parent_token):
        return tokens['access_token']
    print("🔄 静默刷新 Token...")
    new_token = refresh_token_silent(tokens)
    if new_token and check_token_valid(new_token, parent_token):
        print("✅ Token 刷新成功")
        return new_token
    print("❌ 无法获取有效 Token，请先运行 auto_log.py 完成飞书授权")
    return None


def create_wiki_doc(parent_token: str, title: str, blocks: list) -> tuple[bool, str]:
    """
    在指定 wiki 父节点下创建子文档并写入 blocks。
    返回 (成功, url或错误信息)
    """
    token = get_token(parent_token)
    if not token:
        return False, "Token 无效"
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

    # 1. 获取父节点信息（含 space_id）
    r = requests.get(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={parent_token}",
        headers=headers, timeout=30)
    if r.json().get('code') != 0:
        return False, r.json().get('msg', 'get_node 失败')
    node = r.json()['data']['node']
    space_id = node.get('space_id') or (node.get('space') or {}).get('space_id') or node.get('origin_space_id')
    if not space_id:
        return False, "无法获取 space_id"

    # 2. 创建子节点
    create_r = requests.post(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes",
        headers=headers,
        json={
            "parent_node_token": parent_token,
            "obj_type": "docx",
            "node_type": "origin",
            "title": title,
        },
        timeout=30)
    create_data = create_r.json()
    if create_r.status_code != 200 or create_data.get('code') != 0:
        return False, create_data.get('msg', str(create_data))
    new_node = create_data.get('data', {}).get('node', {})
    node_token = new_node.get('node_token')
    doc_token = new_node.get('obj_token') or node_token
    if not doc_token:
        nr = requests.get(
            f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={node_token}",
            headers=headers, timeout=30)
        if nr.json().get('code') == 0:
            doc_token = nr.json()['data']['node'].get('obj_token') or node_token

    # 3. 分批写入 blocks（每批最多 50）
    for i in range(0, len(blocks), 50):
        batch = blocks[i:i + 50]
        wr = requests.post(
            f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks/{doc_token}/children",
            headers=headers,
            json={'children': batch, 'index': i},
            timeout=30)
        if wr.json().get('code') != 0:
            return False, wr.json().get('msg', '写入 blocks 失败')
        if len(blocks) > 50:
            import time
            time.sleep(0.3)

    url = f"https://cunkebao.feishu.cn/wiki/{node_token}" if node_token else "https://cunkebao.feishu.cn/wiki"
    return True, url


def main():
    ap = argparse.ArgumentParser(description='在飞书 Wiki 下创建子文档')
    ap.add_argument('--parent', default='KNf7wA8Rki1NSdkkSIqcdFtTnWb', help='父节点 token')
    ap.add_argument('--title', default='运营逻辑分析及目录结构', help='文档标题')
    ap.add_argument('--json', default=None, help='blocks JSON 文件路径（含 children 数组）')
    args = ap.parse_args()

    # 默认使用内置的运营逻辑文档
    if args.json:
        with open(args.json, 'r', encoding='utf-8') as f:
            data = json.load(f)
        blocks = data.get('children', data) if isinstance(data, dict) else data
    else:
        blocks = get_default_blocks()

    print("=" * 50)
    print(f"📤 在飞书 Wiki 下创建文档：{args.title}")
    print(f"   父节点: {args.parent}")
    print("=" * 50)
    ok, result = create_wiki_doc(args.parent, args.title, blocks)
    if ok:
        print(f"✅ 创建成功")
        print(f"📎 {result}")
    else:
        print(f"❌ 失败: {result}")
        sys.exit(1)
    print("=" * 50)


def get_default_blocks():
    """第一篇：运营逻辑分析及目录结构的默认 blocks"""
    return [
        {"block_type": 3, "heading1": {"elements": [{"text_run": {"content": "运营逻辑分析及目录结构", "text_element_style": {}}}], "style": {}}},
        {"block_type": 2, "text": {"elements": [{"text_run": {"content": "本文档分析本知识空间的运营逻辑，并整理建议的目录结构，供后续日记分享、新研究等内容沉淀使用。", "text_element_style": {}}}], "style": {}}},
        {"block_type": 4, "heading2": {"elements": [{"text_run": {"content": "一、空间定位", "text_element_style": {}}}], "style": {}}},
        {"block_type": 2, "text": {"elements": [{"text_run": {"content": "本空间用于：", "text_element_style": {}}}], "style": {}}},
        {"block_type": 2, "text": {"elements": [{"text_run": {"content": "• 日记分享：日常思考、实践复盘、阶段性总结", "text_element_style": {}}}], "style": {}}},
        {"block_type": 2, "text": {"elements": [{"text_run": {"content": "• 新研究：技术调研、方法论探索、行业/产品分析", "text_element_style": {}}}], "style": {}}},
        {"block_type": 2, "text": {"elements": [{"text_run": {"content": "• 知识沉淀：可复用的经验、模板、工作流", "text_element_style": {}}}], "style": {}}},
        {"block_type": 4, "heading2": {"elements": [{"text_run": {"content": "二、运营逻辑（闭环）", "text_element_style": {}}}], "style": {}}},
        {"block_type": 2, "text": {"elements": [{"text_run": {"content": "输入 → 整理 → 沉淀 → 复用", "text_element_style": {}}}], "style": {}}},
        {"block_type": 2, "text": {"elements": [{"text_run": {"content": "1. 输入：日常产出（对话、会议、实践）、研究发现、灵感碎片", "text_element_style": {}}}], "style": {}}},
        {"block_type": 2, "text": {"elements": [{"text_run": {"content": "2. 整理：按主题/时间归类，提炼要点，形成可读结构", "text_element_style": {}}}], "style": {}}},
        {"block_type": 2, "text": {"elements": [{"text_run": {"content": "3. 沉淀：写入本空间对应目录，便于检索与关联", "text_element_style": {}}}], "style": {}}},
        {"block_type": 2, "text": {"elements": [{"text_run": {"content": "4. 复用：后续查阅、迭代更新、形成模板或 SOP", "text_element_style": {}}}], "style": {}}},
        {"block_type": 4, "heading2": {"elements": [{"text_run": {"content": "三、建议目录结构", "text_element_style": {}}}], "style": {}}},
        {"block_type": 2, "text": {"elements": [{"text_run": {"content": "本空间/\n├── 日记分享/\n│   ├── 按周或按主题归档\n│   └── 可含：今日思考、复盘、阶段性总结\n├── 新研究/\n│   ├── 技术调研\n│   ├── 方法论探索\n│   └── 行业/产品分析\n├── 知识沉淀/\n│   ├── 可复用经验\n│   ├── 模板与工作流\n│   └── SOP 与规范\n└── 运营逻辑分析及目录结构（本文档）", "text_element_style": {}}}], "style": {}}},
        {"block_type": 4, "heading2": {"elements": [{"text_run": {"content": "四、使用建议", "text_element_style": {}}}], "style": {}}},
        {"block_type": 2, "text": {"elements": [{"text_run": {"content": "• 日记类：建议按周或按主题建子页，便于回顾与检索", "text_element_style": {}}}], "style": {}}},
        {"block_type": 2, "text": {"elements": [{"text_run": {"content": "• 研究类：单篇独立，标题含关键词便于搜索", "text_element_style": {}}}], "style": {}}},
        {"block_type": 2, "text": {"elements": [{"text_run": {"content": "• 沉淀类：可链接到卡若AI 经验库、参考资料，形成双向引用", "text_element_style": {}}}], "style": {}}},
        {"block_type": 2, "text": {"elements": [{"text_run": {"content": "— 文档由卡若AI 水桥生成 | 2026-02-22", "text_element_style": {}}}], "style": {}}},
    ]


if __name__ == "__main__":
    main()
