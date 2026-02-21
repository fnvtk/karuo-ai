#!/usr/bin/env python3
"""
将「团队入职流程与新人登记表」飞书 blocks JSON 写入指定飞书知识库子页
本地源文件：运营中枢/工作台/团队入职流程与新人登记表_feishu_blocks.json
使用: python3 upload_wiki_onboarding.py
"""
import os
import sys
import json
import requests
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG = {
    'APP_ID': 'cli_a48818290ef8100d',
    'APP_SECRET': 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4',
    'TARGET_WIKI_TOKEN': 'IpPjwts3iiPH5nkg1gLcp2GonUf',
    'TOKEN_FILE': os.path.join(SCRIPT_DIR, '.feishu_tokens.json'),
}
JSON_PATH = '/Users/karuo/Documents/个人/卡若AI/运营中枢/工作台/团队入职流程与新人登记表_feishu_blocks.json'
WIKI_URL = f"https://cunkebao.feishu.cn/wiki/{CONFIG['TARGET_WIKI_TOKEN']}"

def load_tokens():
    if os.path.exists(CONFIG['TOKEN_FILE']):
        with open(CONFIG['TOKEN_FILE']) as f:
            return json.load(f)
    return {}

def save_tokens(tokens):
    with open(CONFIG['TOKEN_FILE'], 'w') as f:
        json.dump(tokens, f, ensure_ascii=False, indent=2)

def get_app_token():
    r = requests.post("https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal/",
        json={"app_id": CONFIG['APP_ID'], "app_secret": CONFIG['APP_SECRET']}, timeout=10)
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
        json={"grant_type": "refresh_token", "refresh_token": tokens['refresh_token']}, timeout=10)
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
    if not token:
        return False
    try:
        r = requests.get(
            f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={CONFIG['TARGET_WIKI_TOKEN']}",
            headers={'Authorization': f'Bearer {token}'}, timeout=10)
        return r.json().get('code') == 0
    except Exception:
        return False

def get_token_silent():
    tokens = load_tokens()
    if tokens.get('access_token') and check_token_valid(tokens['access_token']):
        return tokens['access_token']
    print("🔄 静默刷新Token...")
    new_token = refresh_token_silent(tokens)
    if new_token and check_token_valid(new_token):
        print("✅ Token刷新成功")
        return new_token
    print("❌ 无法获取有效Token，请先运行 auto_log.py 完成飞书授权")
    return None

def load_blocks_from_json():
    """从本地飞书 blocks JSON 加载 children 数组"""
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get('children', [])

def main():
    print("=" * 50)
    print("📤 上传「团队入职流程与新人登记表」到飞书知识库（源：feishu_blocks.json）")
    print("=" * 50)
    token = get_token_silent()
    if not token:
        sys.exit(1)
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

    # 1. 获取目标节点文档 ID
    r1 = requests.get(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={CONFIG['TARGET_WIKI_TOKEN']}",
        headers=headers, timeout=30)
    try:
        j1 = r1.json()
    except Exception as e:
        print(f"❌ 解析 get_node 响应失败: {e}, text={r1.text[:300]}")
        sys.exit(1)
    if j1.get('code') != 0:
        print(f"❌ 获取节点失败: {j1.get('msg')}")
        sys.exit(1)
    doc_id = j1['data']['node']['obj_token']
    print(f"✅ 文档 ID: {doc_id}")

    # 2. 获取现有 blocks，找出根节点下直接子块
    r2 = requests.get(
        f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks",
        headers=headers, params={'page_size': 100}, timeout=30)
    if not r2.text.strip():
        items = []
    else:
        try:
            j = r2.json()
        except Exception as e:
            print(f"❌ 解析 blocks 响应失败: {e}, text={r2.text[:200]}")
            sys.exit(1)
        if j.get('code') != 0:
            print(f"❌ 获取 blocks 失败: {j.get('msg')}")
            sys.exit(1)
        items = j.get('data', {}).get('items', [])
    child_ids = [b['block_id'] for b in items if b.get('parent_id') == doc_id]

    # 3. 若有子块则批量删除（先清空再写）
    if child_ids:
        rd = requests.delete(
            f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{doc_id}/children/batch_delete",
            headers=headers, json={'block_id_list': child_ids}, timeout=30)
        try:
            jd = rd.json()
        except Exception:
            jd = {}
        if jd.get('code') != 0:
            print(f"⚠️ 清空原内容失败（将追加写入）: {jd.get('msg', rd.text[:100])}")
        else:
            print(f"✅ 已清空原内容（{len(child_ids)} 块）")

    # 4. 从本地 JSON 加载并写入
    content_blocks = load_blocks_from_json()
    if not content_blocks:
        print("❌ JSON 中 children 为空")
        sys.exit(1)
    r4 = requests.post(
        f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{doc_id}/children",
        headers=headers, json={'children': content_blocks, 'index': 1}, timeout=30)
    try:
        j4 = r4.json()
    except Exception as e:
        print(f"❌ 解析写入响应失败: {e}, text={r4.text[:200]}")
        sys.exit(1)
    if j4.get('code') != 0:
        print(f"❌ 写入失败: {j4.get('msg')}")
        sys.exit(1)
    print(f"✅ 已写入 {len(content_blocks)} 个块")
    print(f"📎 文档链接: {WIKI_URL}")
    print("=" * 50)

if __name__ == "__main__":
    main()
