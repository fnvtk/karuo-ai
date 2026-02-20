#!/usr/bin/env python3
"""读取飞书运营报表指定月份 sheet 或全部月份，汇总效果数据并输出统计。
用法：python3 feishu_sheet_monthly_stats.py [月份|all]
  月份：1=第1个月(1月)，2=第2个月(2月)，默认 2
  all（或 全部）：遍历所有「x月」工作表，汇总总数据并分月展示
"""
import os
import sys
import json
import requests
from urllib.parse import quote

FEISHU_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TOKEN_FILE = os.path.join(FEISHU_SCRIPT_DIR, '.feishu_tokens.json')
WIKI_NODE_OR_SPREADSHEET_TOKEN = os.environ.get('FEISHU_SPREADSHEET_TOKEN', 'wikcnIgAGSNHo0t36idHJ668Gfd')
# 默认 2 月 sheet（未指定月份或未找到对应月份时使用）
SHEET_ID_DEFAULT = os.environ.get('FEISHU_SHEET_ID', '7A3Cy9')

# 效果数据行顺序：主题、时长、推流、进房、人均时长、互动、礼物、灵魂力、增加关注、最高在线
LABELS = ['主题', '时长', 'Soul推流人数', '进房人数', '人均时长', '互动数量', '礼物', '灵魂力', '增加关注', '最高在线']


def load_token():
    if not os.path.exists(TOKEN_FILE):
        return None
    with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
        return json.load(f).get('access_token')


def refresh_token():
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


def get_sheets_list(token):
    """返回 [(sheetId, title), ...]"""
    url = f'https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{WIKI_NODE_OR_SPREADSHEET_TOKEN}/metainfo'
    r = requests.get(url, headers={'Authorization': f'Bearer {token}'}, timeout=15)
    if r.status_code != 200:
        return []
    body = r.json()
    if body.get('code') != 0:
        return []
    sheets = (body.get('data') or {}).get('sheets') or []
    return [(s.get('sheetId') or s.get('title'), (s.get('title') or '')) for s in sheets]


def resolve_sheet_id_for_month(token, month_num):
    """month_num 1=1月 2=2月。返回 (sheet_id, 月份标签)。"""
    if month_num == 2:
        return SHEET_ID_DEFAULT, '2月'
    if month_num != 1:
        return SHEET_ID_DEFAULT, '2月'
    # 第1个月：找标题含 1月 的 sheet
    for sheet_id, title in get_sheets_list(token):
        if '1月' in title:
            return sheet_id, '1月'
    return None, '1月'


def read_range(token, range_str):
    url = f'https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{WIKI_NODE_OR_SPREADSHEET_TOKEN}/values/{quote(range_str, safe="")}'
    r = requests.get(url, headers={'Authorization': f'Bearer {token}'}, timeout=15)
    if r.status_code != 200:
        return None
    body = r.json()
    if body.get('code') != 0:
        return None
    return (body.get('data') or {}).get('valueRange', {}).get('values') or []


def num(s):
    if s is None or s == '':
        return 0
    try:
        return int(float(str(s).replace(',', '').strip()))
    except (ValueError, TypeError):
        return 0


def get_month_sheets_sorted(token):
    """返回标题含「x月」的工作表，按 1月、2月… 排序。[(sheet_id, title), ...]"""
    import re
    sheets = get_sheets_list(token)
    month_sheets = []
    for sid, title in sheets:
        if not title or '月' not in title:
            continue
        m = re.search(r'(\d{1,2})月', title)
        key = int(m.group(1)) if m else 99
        month_sheets.append((sid, title, key))
    month_sheets.sort(key=lambda x: x[2])
    return [(x[0], x[1]) for x in month_sheets]


def parse_sheet_vals(vals):
    """从表格 values 解析场次与汇总。返回 (sessions, stats_dict) 或 (None, None) 若解析失败。"""
    if not vals or len(vals) < 12:
        return None, None
    header_row_idx = None
    for ri in (1, 0, 2):
        if ri >= len(vals):
            continue
        for c in vals[ri]:
            if '场' in str(c):
                header_row_idx = ri
                break
        if header_row_idx is not None:
            break
    if header_row_idx is None:
        return None, None
    header = vals[header_row_idx]
    data_start = header_row_idx + 1
    sessions = []
    for col_idx in range(len(header)):
        cell = str(header[col_idx]).strip()
        if '场' not in cell:
            continue
        row_vals = []
        for row_offset in range(10):
            ri = data_start + row_offset
            if ri < len(vals) and col_idx < len(vals[ri]):
                row_vals.append(vals[ri][col_idx])
            else:
                row_vals.append('')
        sessions.append((cell, row_vals))
    if not sessions:
        return None, None
    total_dur = total_push = total_room = total_interact = total_gift = total_soul = total_follow = 0
    max_online = 0
    avg_dur_list = []
    for name, row in sessions:
        total_dur += num(row[1])
        total_push += num(row[2])
        total_room += num(row[3])
        if num(row[4]) > 0:
            avg_dur_list.append(num(row[4]))
        total_interact += num(row[5])
        total_gift += num(row[6])
        total_soul += num(row[7])
        total_follow += num(row[8])
        o = num(row[9])
        if o > max_online:
            max_online = o
    avg_dur_list = [x for x in avg_dur_list if x and x > 0]
    avg_dur = round(sum(avg_dur_list) / len(avg_dur_list), 1) if avg_dur_list else 0
    with_data = [s[0] for s in sessions if num(s[1][1]) > 0]
    stats = {
        'total_dur': total_dur, 'total_push': total_push, 'total_room': total_room,
        'total_interact': total_interact, 'total_gift': total_gift, 'total_soul': total_soul,
        'total_follow': total_follow, 'max_online': max_online, 'avg_dur': avg_dur,
        'sessions_count': len(sessions), 'with_data_count': len(with_data), 'with_data_names': with_data,
    }
    return sessions, stats


def run_all_months(token):
    """遍历所有月份 sheet，汇总总数据并分月展示。"""
    month_sheets = get_month_sheets_sorted(token)
    if not month_sheets:
        print('❌ 未找到任何标题含「x月」的工作表')
        return
    grand = {
        'total_dur': 0, 'total_push': 0, 'total_room': 0, 'total_interact': 0,
        'total_gift': 0, 'total_soul': 0, 'total_follow': 0, 'max_online': 0,
        'avg_dur_sum': 0.0, 'avg_dur_n': 0, 'sessions_count': 0, 'with_data_count': 0,
    }
    per_month = []
    for sheet_id, title in month_sheets:
        vals = read_range(token, f'{sheet_id}!A1:AG15')
        sessions, stats = parse_sheet_vals(vals) if vals else (None, None)
        if not stats:
            per_month.append((title, None))
            continue
        per_month.append((title, stats))
        grand['total_dur'] += stats['total_dur']
        grand['total_push'] += stats['total_push']
        grand['total_room'] += stats['total_room']
        grand['total_interact'] += stats['total_interact']
        grand['total_gift'] += stats['total_gift']
        grand['total_soul'] += stats['total_soul']
        grand['total_follow'] += stats['total_follow']
        if stats['max_online'] > grand['max_online']:
            grand['max_online'] = stats['max_online']
        if stats['avg_dur'] > 0:
            grand['avg_dur_sum'] += stats['avg_dur'] * stats['with_data_count']
            grand['avg_dur_n'] += stats['with_data_count']
        grand['sessions_count'] += stats['sessions_count']
        grand['with_data_count'] += stats['with_data_count']
    grand_avg_dur = round(grand['avg_dur_sum'] / grand['avg_dur_n'], 1) if grand['avg_dur_n'] else 0
    # 输出
    print('=' * 60)
    print('飞书运营报表 · 全部月份总数据汇总')
    print('=' * 60)
    print(f'涉及工作表：共 {len(month_sheets)} 个月 → {", ".join(t for _, t in month_sheets)}')
    print()
    print('【各月明细】')
    print('-' * 60)
    for title, stats in per_month:
        if not stats:
            print(f'  {title}: 未解析到数据')
            continue
        print(f'  {title}')
        print(f'    有数据场次 {stats["with_data_count"]} 场 | 时长 {stats["total_dur"]} 分钟 | '
              f'推流 {stats["total_push"]} | 进房 {stats["total_room"]} | '
              f'互动 {stats["total_interact"]} | 礼物 {stats["total_gift"]} | '
              f'灵魂力 {stats["total_soul"]} | 关注 {stats["total_follow"]} | 最高在线 {stats["max_online"]}')
    print('-' * 60)
    print('【全部月份合计】')
    print(f'  总时长（分钟）   {grand["total_dur"]}')
    print(f'  Soul推流人数    {grand["total_push"]}')
    print(f'  进房人数        {grand["total_room"]}')
    print(f'  互动数量        {grand["total_interact"]}')
    print(f'  礼物            {grand["total_gift"]}')
    print(f'  灵魂力          {grand["total_soul"]}')
    print(f'  增加关注        {grand["total_follow"]}')
    print('【全部月份取值】')
    print(f'  最高在线（各场最大）  {grand["max_online"]}')
    print(f'  人均时长（加权平均）  {grand_avg_dur} 分钟')
    print(f'  表内场次列合计       {grand["sessions_count"]} 列')
    print(f'  有数据场次合计       {grand["with_data_count"]} 场')
    print('=' * 60)


def main():
    month_num = 2
    run_all = False
    if len(sys.argv) >= 2:
        arg = str(sys.argv[1]).strip().lower()
        if arg in ('all', '全部', 'all月'):
            run_all = True
        else:
            try:
                month_num = int(sys.argv[1])
                if month_num not in (1, 2):
                    month_num = 2
            except ValueError:
                pass
    token = load_token() or refresh_token()
    if not token:
        print('❌ 无法获取飞书 Token')
        sys.exit(1)
    if run_all:
        run_all_months(token)
        return
    sheet_id, month_label = resolve_sheet_id_for_month(token, month_num)
    if sheet_id is None:
        print(f'❌ 未找到第1个月（{month_label}）对应的工作表，请确认飞书表格中存在标题含「1月」的 sheet')
        sys.exit(1)
    vals = read_range(token, f'{sheet_id}!A1:AG15')
    if not vals or len(vals) < 12:
        print('❌ 读取表格失败或数据行不足')
        sys.exit(1)
    # 找表头行：某行单元格含「场」
    header_row_idx = None
    for ri in (1, 0, 2):
        if ri >= len(vals):
            continue
        row = vals[ri]
        for c in row:
            if '场' in str(c):
                header_row_idx = ri
                break
        if header_row_idx is not None:
            break
    if header_row_idx is None:
        print('❌ 未找到场次表头行')
        sys.exit(1)
    header = vals[header_row_idx]
    # 数据从下一行开始，共10行：主题、时长、推流、进房、人均时长、互动、礼物、灵魂力、增加关注、最高在线
    data_start = header_row_idx + 1
    sessions = []  # [(场次名, [10个值]), ...]
    for col_idx in range(len(header)):
        cell = str(header[col_idx]).strip()
        if '场' not in cell:
            continue
        row_vals = []
        for row_offset in range(10):
            ri = data_start + row_offset
            if ri < len(vals) and col_idx < len(vals[ri]):
                row_vals.append(vals[ri][col_idx])
            else:
                row_vals.append('')
        sessions.append((cell, row_vals))
    if not sessions:
        print('❌ 未解析到任何场次数据')
        sys.exit(1)
    # 汇总：时长、推流、进房、互动、礼物、灵魂力、增加关注 相加；最高在线 取 max；人均时长 取非零平均
    total_dur = total_push = total_room = total_interact = total_gift = total_soul = total_follow = 0
    max_online = 0
    avg_dur_list = []
    for name, row in sessions:
        duration = num(row[1])
        push = num(row[2])
        room = num(row[3])
        avg_dur = num(row[4])
        interact = num(row[5])
        gift = num(row[6])
        soul = num(row[7])
        follow = num(row[8])
        online = num(row[9])
        total_dur += duration
        total_push += push
        total_room += room
        total_interact += interact
        total_gift += gift
        total_soul += soul
        total_follow += follow
        if online > max_online:
            max_online = online
        if avg_dur > 0:
            avg_dur_list.append(avg_dur)
    avg_dur = round(sum(avg_dur_list) / len(avg_dur_list), 1) if avg_dur_list else 0
    with_data = [(n, r) for n, r in sessions if num(r[1]) > 0]  # 时长>0 视为有数据
    # 输出
    print('=' * 50)
    print(f'飞书运营报表 · 第{month_num}个月（{month_label}）运营数据统计')
    print('=' * 50)
    print(f'表内场次列：共 {len(sessions)} 场')
    print(f'有数据场次：共 {len(with_data)} 场 → {", ".join(s[0] for s in with_data)}')
    print()
    print('【合计】')
    print(f'  时长（分钟）     {total_dur}')
    print(f'  Soul推流人数    {total_push}')
    print(f'  进房人数        {total_room}')
    print(f'  互动数量        {total_interact}')
    print(f'  礼物            {total_gift}')
    print(f'  灵魂力          {total_soul}')
    print(f'  增加关注        {total_follow}')
    print('【取值】')
    print(f'  最高在线（取各场最大）  {max_online}')
    print(f'  人均时长（非零场平均）  {avg_dur} 分钟')
    print('=' * 50)


if __name__ == '__main__':
    main()
