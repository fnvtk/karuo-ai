#!/usr/bin/env python3
"""
读取 Soul 派对运营报表 - 飞书多 sheet 数据
用法：python3 read_soul_party_sheets.py
"""
import os
import sys
import json
import requests
from urllib.parse import quote

FEISHU_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TOKEN_FILE = os.path.join(FEISHU_SCRIPT_DIR, '.feishu_tokens.json')
SPREADSHEET_TOKEN = os.environ.get('FEISHU_SPREADSHEET_TOKEN', 'wikcnIgAGSNHo0t36idHJ668Gfd')

# 用户指定的 6 个 sheet
SHEET_IDS = ['bJR5sA', '7A3Cy9', '0uU6Z1', 'RLJkLX', 'K9F2Ab', 'PrDCKC']


def load_token():
    if not os.path.exists(TOKEN_FILE):
        return None
    with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
        return json.load(f).get('access_token')


def refresh_token():
    if not os.path.exists(TOKEN_FILE):
        return None
    with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    refresh = data.get('refresh_token')
    if not refresh:
        return data.get('access_token')
    r = requests.post(
        'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal',
        json={'app_id': 'cli_a48818290ef8100d', 'app_secret': 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4'},
        timeout=10,
    )
    app_token = (r.json() or {}).get('app_access_token')
    if not app_token:
        return data.get('access_token')
    r2 = requests.post(
        'https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token',
        headers={'Authorization': f'Bearer {app_token}', 'Content-Type': 'application/json'},
        json={'grant_type': 'refresh_token', 'refresh_token': refresh},
        timeout=10,
    )
    out = r2.json()
    if out.get('code') == 0 and out.get('data', {}).get('access_token'):
        data['access_token'] = out['data']['access_token']
        data['refresh_token'] = out['data'].get('refresh_token', refresh)
        with open(TOKEN_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return data['access_token']
    return data.get('access_token')


def read_sheet_range(access_token, spreadsheet_token, range_str):
    """读取表格范围，返回 (values, status_code, body)"""
    url = f'https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{spreadsheet_token}/values/{quote(range_str, safe="")}'
    r = requests.get(
        url,
        headers={'Authorization': f'Bearer {access_token}'},
        timeout=15,
    )
    if r.status_code != 200:
        return None, r.status_code, r.json() if r.text else {}
    body = r.json()
    if body.get('code') != 0:
        return None, r.status_code, body
    vals = (body.get('data') or {}).get('valueRange', {}).get('values') or []
    return vals, r.status_code, body


def main():
    token = load_token() or refresh_token()
    if not token:
        print('❌ 无法获取飞书 Token，请先运行 auto_log.py 完成授权')
        sys.exit(1)

    all_data = {}
    for sheet_id in SHEET_IDS:
        range_str = f'{sheet_id}!A1:AG50'
        vals, code, body = read_sheet_range(token, SPREADSHEET_TOKEN, range_str)
        if code == 401 or (body.get('code') in (99991677, 99991663)):
            token = refresh_token()
            if token:
                vals, code, body = read_sheet_range(token, SPREADSHEET_TOKEN, range_str)

        if vals is not None:
            all_data[sheet_id] = vals
            print(f'✅ sheet={sheet_id}: 读取 {len(vals)} 行 x {len(vals[0]) if vals else 0} 列')
        else:
            all_data[sheet_id] = {'error': body.get('msg', body), 'code': body.get('code')}
            print(f'❌ sheet={sheet_id}: {body.get("msg", body)}')

    # 输出 JSON 便于使用
    output_path = os.path.join(FEISHU_SCRIPT_DIR, 'soul_party_sheets_data.json')
    def _serialize(obj):
        if isinstance(obj, (list, dict)):
            return obj
        return str(obj) if obj is not None else None
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2, default=str)
    print(f'\n📁 已保存到: {output_path}')
    return all_data


if __name__ == '__main__':
    result = main()
    # 简洁打印各 sheet 前几行
    print('\n--- 各 sheet 预览（前3行）---')
    for sid, data in result.items():
        if isinstance(data, list) and data:
            print(f'\n### sheet={sid} ###')
            for i, row in enumerate(data[:3]):
                print(f'  Row{i+1}: {row[:8]}...' if len(row) > 8 else f'  Row{i+1}: {row}')
        elif isinstance(data, dict) and 'error' in data:
            print(f'\n### sheet={sid} ### 错误: {data.get("error")}')
