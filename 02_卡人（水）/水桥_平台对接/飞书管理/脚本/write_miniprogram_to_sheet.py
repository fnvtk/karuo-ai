#!/usr/bin/env python3
"""
小程序运营数据写入飞书运营报表（当日交易金额、访客数、小程序访问次数）。
- 自动查找表格中「交易金额」「访客」「小程序访问」对应行
- 写入指定日期列
用法：python3 write_miniprogram_to_sheet.py <日期列号> <访问次数> [访客数] [交易金额]
  例：python3 write_miniprogram_to_sheet.py 23 55 55 0
  例：python3 write_miniprogram_to_sheet.py 23 55    （访客=访问次数，交易金额=0）
"""
import os
import sys
import json
import requests
from urllib.parse import quote

FEISHU_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TOKEN_FILE = os.path.join(FEISHU_SCRIPT_DIR, '.feishu_tokens.json')
SPREADSHEET_TOKEN = os.environ.get('FEISHU_SPREADSHEET_TOKEN', 'wikcnIgAGSNHo0t36idHJ668Gfd')
SHEET_ID = os.environ.get('FEISHU_SHEET_ID', '7A3Cy9')

# 指标名 → 匹配关键词（A列包含即认为找到）
ROW_KEYWORDS = {
    '交易金额': ['交易金额'],
    '访客': ['访客'],
    '小程序访问': ['小程序访问'],
}


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
    r = requests.post(
        'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal',
        json={'app_id': 'cli_a48818290ef8100d', 'app_secret': 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4'},
        timeout=10,
    )
    app_token = (r.json() or {}).get('app_access_token')
    if not app_token:
        return None
    r2 = requests.post(
        'https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token',
        headers={'Authorization': f'Bearer {app_token}', 'Content-Type': 'application/json'},
        json={'grant_type': 'refresh_token', 'refresh_token': data.get('refresh_token')},
        timeout=10,
    )
    out = r2.json()
    if out.get('code') == 0 and out.get('data', {}).get('access_token'):
        data['access_token'] = out['data']['access_token']
        data['refresh_token'] = out['data'].get('refresh_token', data.get('refresh_token'))
        with open(TOKEN_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return data['access_token']
    return None


def read_range(token, range_str):
    url = f'https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{SPREADSHEET_TOKEN}/values/{quote(range_str, safe="")}'
    r = requests.get(url, headers={'Authorization': f'Bearer {token}'}, timeout=15)
    if r.status_code != 200:
        return None
    body = r.json()
    if body.get('code') != 0:
        return None
    return (body.get('data') or {}).get('valueRange', {}).get('values') or []


def update_cell(token, range_str, value, value_input_option='USER_ENTERED'):
    if range_str.count('!') == 1 and ':' not in range_str.split('!')[1]:
        range_str = range_str + ':' + range_str.split('!')[1]
    url = f'https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{SPREADSHEET_TOKEN}/values'
    params = {'valueInputOption': value_input_option}
    v = value if value is not None and value != '' else ''
    payload = {'valueRange': {'range': range_str, 'values': [[v]]}}
    r = requests.put(
        url, params=params,
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        json=payload, timeout=15,
    )
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, {}


def _col_letter(n):
    s = ''
    while True:
        s = chr(65 + (n % 26)) + s
        n = n // 26 - 1
        if n < 0:
            break
    return s


def find_row_for_keyword(vals, keyword_list):
    """在 vals 中找 A 列包含任一 keyword 的行号（1-based）"""
    for ri, row in enumerate(vals):
        a1 = (row[0] if row and len(row) > 0 else '')
        a1 = str(a1 or '').strip()
        for kw in keyword_list:
            if kw in a1:
                return ri + 1
    return None


def main():
    if len(sys.argv) < 3:
        print('用法：python3 write_miniprogram_to_sheet.py <日期列号> <访问次数> [访客数] [交易金额]')
        print('  例：python3 write_miniprogram_to_sheet.py 23 55 55 0')
        sys.exit(1)
    date_col_str = sys.argv[1].strip()
    access_count = sys.argv[2].strip()
    visitor_count = sys.argv[3].strip() if len(sys.argv) > 3 else access_count
    transaction = sys.argv[4].strip() if len(sys.argv) > 4 else '0'

    token = load_token() or refresh_token()
    if not token:
        print('❌ 无法获取飞书 Token')
        sys.exit(1)

    vals = read_range(token, f'{SHEET_ID}!A1:AG35')
    if not vals or len(vals) < 2:
        print('❌ 读取表格失败')
        sys.exit(1)

    header = vals[0]
    col_idx = None
    for idx, cell in enumerate(header):
        if str(cell).strip() == date_col_str:
            col_idx = idx
            break
    if col_idx is None:
        print(f'❌ 未找到日期列 {date_col_str}')
        sys.exit(1)

    # 查找三行：交易金额、访客、小程序访问
    row_txn = find_row_for_keyword(vals, ROW_KEYWORDS['交易金额'])
    row_visitor = find_row_for_keyword(vals, ROW_KEYWORDS['访客'])
    row_access = find_row_for_keyword(vals, ROW_KEYWORDS['小程序访问'])

    # 若未找到「访客」单独行，可能和「小程序访问」共用，用访问次数
    if not row_visitor and row_access:
        row_visitor = row_access  # 同一行填访客与访问

    col_letter = _col_letter(col_idx)
    written = 0

    def _write_one(row_num, val, name):
        nonlocal written, token
        if row_num is None:
            return
        rng = f'{SHEET_ID}!{col_letter}{row_num}'
        code, body = update_cell(token, rng, val)
        if code == 401 or body.get('code') in (99991677, 99991663):
            t = refresh_token()
            if t:
                token = t
                code, body = update_cell(token, rng, val)
        if code == 200 and body.get('code') in (0, None):
            print(f'✅ 已写入 {name} → 2月{date_col_str}日列：{val}')
            written += 1
        else:
            print(f'⚠️ 写入 {name} 失败：{code} {body}')

    _write_one(row_txn, transaction, '交易金额')
    _write_one(row_visitor, visitor_count, '访客')
    _write_one(row_access, access_count, '小程序访问')

    if written == 0:
        print('❌ 未找到可写入的行，请确认表格 A 列有「交易金额」「访客」「小程序访问」等指标')
        sys.exit(1)
    print(f'✅ 小程序运营数据已填入 2月{date_col_str}日列，共 {written} 项')


if __name__ == '__main__':
    main()
