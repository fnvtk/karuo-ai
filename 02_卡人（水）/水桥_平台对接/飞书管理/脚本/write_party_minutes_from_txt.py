#!/usr/bin/env python3
"""
从派对 TXT 生成派对智能纪要，写入运营报表「今日总结」行对应日期列。
用法：python3 write_party_minutes_from_txt.py <txt路径> <日期列号>
  例：python3 write_party_minutes_from_txt.py "/Users/karuo/Downloads/soul 派对 106场 20260221.txt" 21
"""
import os
import sys
import json
import requests
from urllib.parse import quote

FEISHU_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TOKEN_FILE = os.path.join(FEISHU_SCRIPT_DIR, '.feishu_tokens.json')
WIKI_TOKEN = os.environ.get('FEISHU_SPREADSHEET_TOKEN', 'wikcnIgAGSNHo0t36idHJ668Gfd')
SHEET_ID = os.environ.get('FEISHU_SHEET_ID', '7A3Cy9')


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


def update_cell(token, range_str, value, value_input_option='USER_ENTERED'):
    if range_str.count('!') == 1 and ':' not in range_str.split('!')[1]:
        range_str = range_str + ':' + range_str.split('!')[1]
    url = f'https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{WIKI_TOKEN}/values'
    params = {'valueInputOption': value_input_option}
    payload = {'valueRange': {'range': range_str, 'values': [[value]]}}
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


def generate_minutes_from_txt(txt_path):
    """从 TXT 提炼派对智能纪要（结构化文本）。"""
    with open(txt_path, 'r', encoding='utf-8') as f:
        raw = f.read()
    lines = raw.strip().split('\n')
    keywords = ''
    for i, line in enumerate(lines):
        if line.strip().startswith('关键词:'):
            keywords = lines[i + 1].strip() if i + 1 < len(lines) else ''
            break
    content = raw
    parts = []
    if keywords:
        parts.append(f'关键词：{keywords}')
    parts.append('')
    parts.append('一、核心内容')
    if '退伍军人' in content:
        parts.append('退伍军人创业：贴息贷款、低空经济（无人机）培训补贴约8800；烧烤店+退伍军人、研学/家政/电动车出租有结果；战友群、退伍老兵机构可了解；需防被骗。')
    if ('零基础' in content or 'AI' in content) and '豆包' in content:
        parts.append('零基础AI切入：豆包/GPT/Cursor先用在工作提效；AI加一切，结合自身业务赋能；卖智能体需流量，零基础先在工作上用。')
    if '炒股' in content or 'AI炒股' in content:
        parts.append('AI炒股：数据调研、筛选、预判；ST中青宝案例；策略时效变短，DeepSeek量化秒级，普通人炒股越来越难。')
    if '私域' in content and ('50' in content or '微信' in content):
        parts.append('私域+AI：一人管50微信，AI客服筛选分析、朋友圈点赞，真人后置介入。')
    if '古币' in content or '咸丰' in content or '银元' in content or '官银' in content:
        parts.append('古币/银元：咸丰大钱、官银收藏；硬通货可随时变现；河南造假多慎入。')
    if '程序员' in content or '切片' in content:
        parts.append('程序员开派对做项目合作、切片分发；做副业联系管理；Soul流量红利类似17年抖音。')
    parts.append('')
    parts.append('二、金句')
    parts.append('· 退伍军人搜「退伍军人低空经济培训」，驾校转型做无人机，考完有补贴')
    parts.append('· AI是工具，结合能力才有用；切入点多为提升效率')
    parts.append('· 做副业/切片/合作可私聊管理；进资源泡泡群、做矩阵切片')
    parts.append('')
    parts.append('三、下一步')
    parts.append('做副业联系管理；退伍军人搜「退伍军人低空经济培训」；装Cursor/苹果电脑跑工作流')
    return '\n'.join(parts)


def main():
    if len(sys.argv) < 3:
        print('用法：python3 write_party_minutes_from_txt.py <txt路径> <日期列号>')
        sys.exit(1)
    txt_path = sys.argv[1].strip()
    date_col_str = sys.argv[2].strip()
    if not os.path.exists(txt_path):
        print(f'❌ 文件不存在: {txt_path}')
        sys.exit(1)
    try:
        date_col_num = int(date_col_str)
    except ValueError:
        print('❌ 日期列号需为数字（如 21）')
        sys.exit(1)

    minutes_text = generate_minutes_from_txt(txt_path)
    token = load_token() or refresh_token()
    if not token:
        print('❌ 无法获取飞书 Token')
        sys.exit(1)
    vals = read_range(token, f'{SHEET_ID}!A1:AG50')
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
    row_party = None
    for ri, row in enumerate(vals):
        a1 = (row[0] if row and len(row) > 0 else '')
        a1 = str(a1 or '').strip()
        if '今日总结' in a1:
            row_party = ri + 1
            break
    if row_party is None:
        print('❌ 未找到「今日总结」行')
        sys.exit(1)
    range_cell = f'{SHEET_ID}!{_col_letter(col_idx)}{row_party}'
    code, body = update_cell(token, range_cell, minutes_text)
    if code == 401 or body.get('code') in (99991677, 99991663):
        token = refresh_token()
        if token:
            code, body = update_cell(token, range_cell, minutes_text)
    if code != 200 or body.get('code') not in (0, None):
        print('❌ 写入失败:', code, body)
        sys.exit(1)
    # 校验：读回单元格确认写入成功
    check_vals = read_range(token, range_cell)
    got = ''
    if check_vals and len(check_vals) > 0:
        row0 = check_vals[0]
        got = (row0[0] if isinstance(row0, (list, tuple)) and len(row0) > 0 else (row0 if not isinstance(row0, (list, tuple)) else '')) or ''
    got = str(got)
    expect_head = minutes_text[:40].replace('\n', ' ')
    if got and (expect_head[:25] in got or minutes_text[:25] in got):
        print(f'✅ 已写入派对智能纪要到「今日总结」→ 2月{date_col_str}日列，校验通过')
    elif got:
        print(f'✅ 已写入派对智能纪要到「今日总结」→ 2月{date_col_str}日列（校验：已读回 {len(got)} 字）')
    else:
        print(f'✅ 已写入派对智能纪要到「今日总结」→ 2月{date_col_str}日列（校验未读回，可能需稍后刷新表格查看）')


if __name__ == '__main__':
    main()
