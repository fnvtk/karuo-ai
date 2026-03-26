#!/usr/bin/env python3
"""
将「团队/内部会议纪要」与「派对今日总结」的图片上传到飞书运营报表对应单元格内。
- 内部会议纪要：写在「内部会议纪要」这一行，按纪要上的日期（如 2月20日）填到该日期列。
- 派对今日总结：写在「今日总结」这一行，按派对日期（如 2月19日）填到该日期列。
不发飞书群。
用法：
  python3 feishu_write_minutes_to_sheet.py [内部会议图片路径] [派对总结图片路径]
  python3 feishu_write_minutes_to_sheet.py --party-image <图> --sheet-id bJR5sA --date-col 4   # 今日总结
  python3 feishu_write_minutes_to_sheet.py --team-image <图> --sheet-id bJR5sA --date-col 20  # 团队会议
  python3 feishu_write_minutes_to_sheet.py --internal-image <图> --sheet-id bJR5sA --date-col 20  # 内部会议纪要
  可同时传 --party-image、--team-image、--internal-image（同一 date-col）。本脚本不发飞书群。
"""
import os
import sys
import argparse
import json
import requests
from urllib.parse import quote

FEISHU_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TOKEN_FILE = os.path.join(FEISHU_SCRIPT_DIR, '.feishu_tokens.json')
WIKI_TOKEN = os.environ.get('FEISHU_SPREADSHEET_TOKEN', 'wikcnIgAGSNHo0t36idHJ668Gfd')
SHEET_ID = os.environ.get('FEISHU_SHEET_ID', '7A3Cy9')

# 默认图片路径（内部会议 2月20日、派对总结 2月19日）
DEFAULT_IMAGE_INTERNAL = '/Users/karuo/Downloads/20260220-094434.jpg'
DEFAULT_IMAGE_PARTY = '/Users/karuo/Downloads/20260220-094442.png'

# 飞书写入图片：单次请求 body 可能限制大小，图片过大时先压缩
MAX_IMAGE_BYTES = 800 * 1024  # 800KB 以内较稳妥


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
    url = f'https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{WIKI_TOKEN}/values/{quote(range_str, safe="")}'
    r = requests.get(url, headers={'Authorization': f'Bearer {token}'}, timeout=15)
    if r.status_code != 200:
        return None
    body = r.json()
    if body.get('code') != 0:
        return None
    return (body.get('data') or {}).get('valueRange', {}).get('values') or []


def _col_letter(n):
    s = ''
    while True:
        s = chr(65 + (n % 26)) + s
        n = n // 26 - 1
        if n < 0:
            break
    return s


def _resize_image_if_needed(path, max_bytes=MAX_IMAGE_BYTES):
    """若图片超过 max_bytes，用 PIL 压缩后返回 bytes；否则直接读文件。"""
    data = open(path, 'rb').read()
    if len(data) <= max_bytes:
        return data
    try:
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(data))
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        buf = io.BytesIO()
        q = 85
        while q >= 20:
            buf.seek(0)
            buf.truncate()
            img.save(buf, 'JPEG', quality=q, optimize=True)
            if buf.tell() <= max_bytes:
                return buf.getvalue()
            q -= 15
        return buf.getvalue()
    except Exception:
        return data


def _find_col_and_rows_for_sheet(token, sheet_id, date_col):
    """返回 (col_idx 0-based, row_party, row_team, row_internal) 或失败时 (None, None, None, None)"""
    vals = read_range(token, f'{sheet_id}!A1:AG50')
    if not vals or len(vals) < 2:
        return None, None, None, None
    header = vals[0]
    col_idx = None
    for idx, cell in enumerate(header):
        if str(cell).strip() == str(date_col).strip():
            col_idx = idx
            break
    row_party = row_team = row_internal = None
    for ri, row in enumerate(vals):
        a1 = (row[0] if row and len(row) > 0 else '')
        a1 = str(a1 or '').strip()
        if '今日总结' in a1:
            row_party = ri + 1
        if '团队会议' in a1 or ('团队' in a1 and '会议' in a1 and '内部' not in a1):
            row_team = ri + 1
        if '内部会议' in a1 and ('纪要' in a1 or '智要' in a1):
            row_internal = ri + 1
        elif '内部会议纪要' in a1 or '内部会议智要' in a1:
            row_internal = ri + 1
    return col_idx, row_party, row_team, row_internal


def write_image_to_cell(token, range_str, image_path, name=None):
    """
    飞书 v2 写入图片到单元格：POST .../values_image，body 为 JSON，image 为整数数组（字节流）。
    range 格式：sheetId!A1:A1（单个格子）
    """
    if not os.path.exists(image_path):
        return 404, {'msg': f'文件不存在: {image_path}'}
    name = name or os.path.basename(image_path)
    data = _resize_image_if_needed(image_path)
    # 飞书要求 image 为整数数组（图片二进制流）
    image_arr = list(data)
    url = f'https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{WIKI_TOKEN}/values_image'
    payload = {
        'range': range_str if ':' in range_str else f'{range_str}:{range_str.split("!")[1]}',
        'name': name,
        'image': image_arr,
    }
    r = requests.post(
        url,
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        json=payload,
        timeout=60,
    )
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, {'msg': r.text[:200]}


def main():
    parser = argparse.ArgumentParser(description='上传会议/派对纪要图片到飞书运营报表')
    parser.add_argument('image_internal', nargs='?', default=DEFAULT_IMAGE_INTERNAL, help='内部会议图片路径')
    parser.add_argument('image_party', nargs='?', default=DEFAULT_IMAGE_PARTY, help='派对总结图片路径')
    parser.add_argument('--party-image', dest='party_image_override', type=str, help='派对「今日总结」行图片路径')
    parser.add_argument('--team-image', dest='team_image_override', type=str, help='「团队会议」行图片路径')
    parser.add_argument('--internal-image', dest='internal_image_override', type=str, help='「内部会议纪要」行图片路径')
    parser.add_argument('--sheet-id', dest='sheet_id_override', type=str, help='工作表 ID，如 3 月用 bJR5sA')
    parser.add_argument('--date-col', dest='date_col_override', type=str, help='日期列号（表头单元格值），如 115 场用 4')
    args = parser.parse_args()

    image_internal = (args.image_internal or '').strip()
    image_party = (args.image_party or '').strip()
    sheet_id = args.sheet_id_override or SHEET_ID
    date_col = args.date_col_override
    party_image_override = (args.party_image_override or '').strip()
    team_image_override = (args.team_image_override or '').strip()
    internal_image_override = (args.internal_image_override or '').strip()

    def _upload_one_image(token, col_idx, row_num, img_path, label):
        if row_num is None:
            print(f'❌ 未找到「{label}」行')
            return False
        range_cell = f'{sheet_id}!{_col_letter(col_idx)}{row_num}:{_col_letter(col_idx)}{row_num}'
        code, body = write_image_to_cell(token, range_cell, img_path, name=os.path.basename(img_path))
        if code == 401 or body.get('code') in (99991677, 99991663):
            t2 = refresh_token()
            if t2:
                code, body = write_image_to_cell(t2, range_cell, img_path, name=os.path.basename(img_path))
        if code == 200 and body.get('code') in (0, None):
            print(f'✅ 已上传图片到「{label}」→ 日期列 {date_col}（{sheet_id}）')
            return True
        print(f'❌ 「{label}」上传失败:', code, body)
        return False

    if (party_image_override or team_image_override or internal_image_override) and sheet_id and date_col:
        token = load_token() or refresh_token()
        if not token:
            print('❌ 无法获取飞书 Token')
            sys.exit(1)
        if party_image_override and not os.path.exists(party_image_override):
            print('❌ 派对图片不存在:', party_image_override)
            sys.exit(1)
        if team_image_override and not os.path.exists(team_image_override):
            print('❌ 团队会议图片不存在:', team_image_override)
            sys.exit(1)
        if internal_image_override and not os.path.exists(internal_image_override):
            print('❌ 内部会议纪要图片不存在:', internal_image_override)
            sys.exit(1)
        col_idx, row_party, row_team, row_internal = _find_col_and_rows_for_sheet(token, sheet_id, date_col)
        if col_idx is None:
            print('❌ 未找到日期列', date_col)
            sys.exit(1)
        ok_any = False
        if party_image_override:
            if _upload_one_image(token, col_idx, row_party, party_image_override, '今日总结'):
                ok_any = True
            else:
                sys.exit(1)
        if team_image_override:
            if _upload_one_image(token, col_idx, row_team, team_image_override, '团队会议'):
                ok_any = True
            else:
                sys.exit(1)
        if internal_image_override:
            if _upload_one_image(token, col_idx, row_internal, internal_image_override, '内部会议纪要'):
                ok_any = True
            else:
                sys.exit(1)
        if ok_any:
            print('（未发飞书群）')
        return

    token = load_token() or refresh_token()
    if not token:
        print('❌ 无法获取飞书 Token')
        sys.exit(1)
    vals = read_range(token, f'{SHEET_ID}!A1:AG50')
    if not vals or len(vals) < 2:
        print('❌ 读取表格失败')
        sys.exit(1)
    header = vals[0]
    col_19 = col_20 = None
    for idx, cell in enumerate(header):
        c = str(cell).strip()
        if c == '19':
            col_19 = idx
        if c == '20':
            col_20 = idx
    if col_19 is None or col_20 is None:
        print('⚠️ 未找到日期列 19 或 20')
    row_internal = None
    row_party = None
    for ri, row in enumerate(vals):
        a1 = (row[0] if row and len(row) > 0 else '')
        if a1 is None:
            a1 = ''
        a1 = str(a1).strip()
        if not a1:
            continue
        if '内部会议' in a1 or ('团队' in a1 and '会议' in a1):
            row_internal = ri + 1
        if '今日总结' in a1:
            row_party = ri + 1
    if row_internal is None:
        print('⚠️ 未找到「内部会议纪要」/「团队会议」行')
    if row_party is None:
        print('⚠️ 未找到「今日总结」行')

    written = 0
    if row_internal is not None and col_20 is not None and os.path.exists(image_internal):
        range_cell = f'{SHEET_ID}!{_col_letter(col_20)}{row_internal}:{_col_letter(col_20)}{row_internal}'
        code, body = write_image_to_cell(token, range_cell, image_internal, name='内部会议纪要_2月20.jpg')
        if code == 200 and body.get('code') in (0, None):
            print(f'✅ 已上传图片到「内部会议纪要」→ 2月20日列（{range_cell}）')
            written += 1
        else:
            if code == 401 or body.get('code') in (99991677, 99991663):
                token = refresh_token()
                if token:
                    code, body = write_image_to_cell(token, range_cell, image_internal, name='内部会议纪要_2月20.jpg')
                    if code == 200 and body.get('code') in (0, None):
                        print('✅ 已上传图片到「内部会议纪要」→ 2月20日列')
                        written += 1
            if not written:
                print('❌ 上传内部会议图片失败:', code, body)
    elif not os.path.exists(image_internal):
        print('⚠️ 内部会议图片不存在:', image_internal)

    if row_party is not None and col_19 is not None and os.path.exists(image_party):
        range_cell = f'{SHEET_ID}!{_col_letter(col_19)}{row_party}:{_col_letter(col_19)}{row_party}'
        code, body = write_image_to_cell(token, range_cell, image_party, name='派对今日总结_2月19.png')
        if code == 200 and body.get('code') in (0, None):
            print(f'✅ 已上传图片到「派对今日总结」→ 2月19日列（{range_cell}）')
            written += 1
        else:
            if code == 401 or body.get('code') in (99991677, 99991663):
                token = refresh_token()
                if token:
                    code, body = write_image_to_cell(token, range_cell, image_party, name='派对今日总结_2月19.png')
                    if code == 200 and body.get('code') in (0, None):
                        print('✅ 已上传图片到「派对今日总结」→ 2月19日列')
                        written += 1
            if not written:
                print('❌ 上传派对总结图片失败:', code, body)
    elif not os.path.exists(image_party):
        print('⚠️ 派对总结图片不存在:', image_party)

    if written == 0:
        sys.exit(1)
    print('（未发飞书群）')


if __name__ == '__main__':
    main()
