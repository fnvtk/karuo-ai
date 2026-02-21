#!/usr/bin/env python3
"""
飞书运营报表 · Soul 派对效果数据写入（按场次竖列、数字类型、不填比率）
- 只填前 10 项：主题、时长、Soul推流人数、进房人数、人均时长、互动数量、礼物、灵魂力、增加关注、最高在线
- 推流进房率、1分钟进多少人、加微率 由表格公式自动计算，导入时不填
- 数值按数字类型写入（非文本），便于表格公式与图表
"""
import os
import sys
import json
import requests
from urllib.parse import quote

# 卡若AI 飞书 Token 与 API
FEISHU_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TOKEN_FILE = os.path.join(FEISHU_SCRIPT_DIR, '.feishu_tokens.json')
WIKI_NODE_OR_SPREADSHEET_TOKEN = os.environ.get('FEISHU_SPREADSHEET_TOKEN', 'wikcnIgAGSNHo0t36idHJ668Gfd')
SHEET_ID = os.environ.get('FEISHU_SHEET_ID', '7A3Cy9')
# 飞书群机器人 webhook（推送运营报表链接与场次数据）
FEISHU_GROUP_WEBHOOK = os.environ.get('FEISHU_GROUP_WEBHOOK', 'https://open.feishu.cn/open-apis/bot/v2/hook/34b762fc-5b9b-4abb-a05a-96c8fb9599f1')
OPERATION_REPORT_LINK = 'https://cunkebao.feishu.cn/wiki/wikcnIgAGSNHo0t36idHJ668Gfd?sheet=7A3Cy9'

# 写入列数：仅前 10 项（比率三项不填，表内公式自动算）
EFFECT_COLS = 10

# 各场效果数据（主题≤12字且含干货与数值、时长、推流、进房…）— 比率不写入
# 主题写分析内容最核心干货；来源TXT可写在飞书群消息中
ROWS = {
    '96':  [ '', 0, 0, 0, 0, 0, 0, 0, 0, 0 ],   # 96场（无记录，占位）
    '97':  [ '', 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
    '98':  [ '', 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
    '99':  [ '', 116, 16976, 208, 0, 0, 4, 166, 12, 39 ],
    '100': [ '', 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
    '103': [ '号商几毛卖十几 日销两万', 155, 46749, 545, 7, 34, 1, 8, 13, 47 ],
    '104': [ 'AI创业最赚钱一月分享', 140, 36221, 367, 7, 49, 0, 0, 11, 38 ],
    # 105场 2026-02-20：截图 138分钟/403进房/54最高在线/31关注/2礼物/24灵魂力，小助手 人均10min/互动170；推流截图中无填0
    '105': [ '创业社群AI培训6980 电竞私域', 138, 0, 403, 10, 170, 2, 24, 31, 54 ],
    # 106场 2026-02-21：关闭页 135min/395进房/42最高/9关注/3礼物/24灵魂力/33312曝光，小助手 7人均/88互动
    '106': [ '退伍军人低空经济 贴息8800', 135, 33312, 395, 7, 88, 3, 24, 9, 42 ],
}
# 场次→按日期列填写时的日期（表头为当月日期 1~31）
SESSION_DATE_COLUMN = {'105': '20', '106': '21'}


def load_token():
    if not os.path.exists(TOKEN_FILE):
        print('❌ 未找到飞书 Token 文件:', TOKEN_FILE)
        print('请先运行一次 auto_log.py 或完成飞书授权。')
        return None
    with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get('access_token')


def refresh_and_load_token():
    """若 token 过期，尝试用 refresh_token 刷新后返回新 token"""
    if not os.path.exists(TOKEN_FILE):
        return None
    with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    refresh = data.get('refresh_token')
    if not refresh:
        return data.get('access_token')
    app_id = os.environ.get('FEISHU_APP_ID', 'cli_a48818290ef8100d')
    app_secret = os.environ.get('FEISHU_APP_SECRET', 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4')
    r = requests.post(
        'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal',
        json={'app_id': app_id, 'app_secret': app_secret},
        timeout=10
    )
    app_token = (r.json() or {}).get('app_access_token')
    if not app_token:
        return data.get('access_token')
    r2 = requests.post(
        'https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token',
        headers={'Authorization': f'Bearer {app_token}', 'Content-Type': 'application/json'},
        json={'grant_type': 'refresh_token', 'refresh_token': refresh},
        timeout=10
    )
    out = r2.json()
    if out.get('code') == 0 and out.get('data', {}).get('access_token'):
        new_token = out['data']['access_token']
        data['access_token'] = new_token
        data['refresh_token'] = out['data'].get('refresh_token', refresh)
        with open(TOKEN_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return new_token
    return data.get('access_token')


def get_sheet_meta(access_token, spreadsheet_token):
    """获取表格下的工作表列表，返回第一个 sheet 的 sheet_id（用于 range）"""
    url = f'https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{spreadsheet_token}/metainfo'
    r = requests.get(
        url,
        headers={'Authorization': f'Bearer {access_token}'},
        timeout=15,
    )
    if r.status_code != 200:
        return None
    body = r.json()
    if body.get('code') != 0:
        return None
    sheets = (body.get('data') or {}).get('sheets') or []
    if not sheets:
        return None
    return sheets[0].get('sheetId') or sheets[0].get('title') or SHEET_ID


def read_sheet_range(access_token, spreadsheet_token, range_str):
    """读取表格范围，返回 values 或 None"""
    url = f'https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{spreadsheet_token}/values/{quote(range_str, safe="")}'
    r = requests.get(
        url,
        headers={'Authorization': f'Bearer {access_token}'},
        timeout=15,
    )
    if r.status_code != 200:
        return None, r.status_code, r.json()
    body = r.json()
    if body.get('code') != 0:
        return None, r.status_code, body
    vals = (body.get('data') or {}).get('valueRange', {}).get('values') or []
    return vals, r.status_code, body


def write_sheet_row(access_token, spreadsheet_token, sheet_id, values):
    """向飞书电子表格追加一行。range 用 sheet_id 或 工作表名"""
    url = f'https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{spreadsheet_token}/values_append'
    range_str = f"{sheet_id}!A1:M1"
    payload = {
        'valueRange': {
            'range': range_str,
            'values': [values],
        },
        'insertDataOption': 'INSERT_ROWS',
    }
    r = requests.post(
        url,
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        },
        json=payload,
        timeout=15,
    )
    return r.status_code, r.json()


def update_sheet_range(access_token, spreadsheet_token, range_str, values, value_input_option='RAW'):
    """向指定 range 写入/覆盖数据。values 二维数组；value_input_option=RAW 按数字写入不转文本。"""
    url = f'https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{spreadsheet_token}/values'
    params = {'valueInputOption': value_input_option}
    payload = {'valueRange': {'range': range_str, 'values': values}}
    r = requests.put(
        url,
        params=params,
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        },
        json=payload,
        timeout=15,
    )
    try:
        body = r.json()
    except Exception:
        body = {'code': -1, 'msg': (r.text or '')[:200]}
    return r.status_code, body


def _col_letter(n):
    """0->A, 1->B, ..., 25->Z, 26->AA"""
    s = ''
    while True:
        s = chr(65 + n % 26) + s
        n = n // 26
        if n <= 0:
            break
    return s


def _to_cell_value(v):
    """主题可空/字符串，其余按数字写入（int/float），便于表格公式。"""
    if v == '' or v is None:
        return ''
    if isinstance(v, (int, float)):
        return int(v) if isinstance(v, float) and v == int(v) else v
    try:
        return int(v)
    except (ValueError, TypeError):
        try:
            return float(v)
        except (ValueError, TypeError):
            return str(v)


def send_feishu_group_message(webhook_url, text):
    """飞书群机器人：发送文本（msg_type=text）。"""
    if not webhook_url or not text:
        return False, None
    payload = {'msg_type': 'text', 'content': {'text': text}}
    try:
        r = requests.post(webhook_url, json=payload, timeout=10)
        return r.status_code == 200, r.json() if r.text else None
    except Exception as e:
        return False, str(e)


def main():
    session = (sys.argv[1] if len(sys.argv) > 1 else '104').strip()
    row = ROWS.get(session)
    if not row:
        print('❌ 未知场次，可用: 96, 97, 98, 99, 100, 103, 104, 105, 106')
        sys.exit(1)
    token = load_token() or refresh_and_load_token()
    if not token:
        print('❌ 无法获取飞书 Token，请先运行 auto_log.py 完成授权')
        sys.exit(1)
    raw = (row + [None] * EFFECT_COLS)[:EFFECT_COLS]
    values = [_to_cell_value(raw[0])] + [_to_cell_value(raw[i]) for i in range(1, EFFECT_COLS)]
    spreadsheet_token = WIKI_NODE_OR_SPREADSHEET_TOKEN
    sheet_id = SHEET_ID
    range_read = f"{sheet_id}!A1:AG30"
    vals, read_code, read_body = read_sheet_range(token, spreadsheet_token, range_read)
    # 401 时刷新 token 并重试读取，确保能定位到日期列
    if (read_code == 401 or read_body.get('code') in (99991677, 99991663)) and not vals:
        token = refresh_and_load_token()
        if token:
            vals, read_code, read_body = read_sheet_range(token, spreadsheet_token, range_read)
    # 优先按当天日期列填：表头第1行多为 2月、1、2、…、20、…（日期），105场 填在 2月20日 → 找列 "20"
    target_col_0based = None
    date_col = SESSION_DATE_COLUMN.get(session)
    if vals and date_col:
        row0 = vals[0] if len(vals) > 0 else []
        for col_idx, cell in enumerate(row0):
            if str(cell).strip() == date_col:
                target_col_0based = col_idx
                break
    # 否则按「x场」列名找
    if target_col_0based is None and vals and len(vals) >= 2:
        for row_idx in (1, 0):
            row_cells = vals[row_idx] if row_idx < len(vals) else []
            for col_idx, cell in enumerate(row_cells):
                if f"{session}场" in str(cell).strip():
                    target_col_0based = col_idx
                    break
            if target_col_0based is not None:
                break
    if read_code != 200 or (read_body.get('code') not in (0, None)) and not vals:
        print('⚠️ 读取表格失败:', read_code, read_body.get('msg', read_body))
    # 发群消息用竖状格式（每行一项，便于阅读）
    LABELS_GROUP = ['主题', '时长（分钟）', 'Soul推流人数', '进房人数', '人均时长（分钟）', '互动数量', '礼物', '灵魂力', '增加关注', '最高在线']

    def _maybe_send_group(sess, raw_vals):
        if sess not in ('105', '106'):
            return
        date_label = {'105': '2月20日', '106': '2月21日'}.get(sess, sess + '场')
        lines = [
            '【Soul 派对运营报表】',
            f'链接：{OPERATION_REPORT_LINK}',
            '',
            f'{sess}场（{date_label}）已登记：',
        ]
        for i, label in enumerate(LABELS_GROUP):
            val = raw_vals[i] if i < len(raw_vals) else ''
            lines.append(f'{label}：{val}')
        src_date = {'105': '20260220', '106': '20260221'}.get(sess, '20260220')
        lines.append(f'数据来源：soul 派对 {sess}场 {src_date}.txt')
        msg = '\n'.join(lines)
        ok, _ = send_feishu_group_message(FEISHU_GROUP_WEBHOOK, msg)
        if ok:
            print('✅ 已同步推送到飞书群（竖状格式）')
        else:
            print('⚠️ 飞书群推送失败（请检查 webhook）')

    def _verify_write(spreadsheet_token, sheet_id, col_letter, values, token):
        """写入后读回校验，确保写入成功"""
        range_verify = f"{sheet_id}!{col_letter}3:{col_letter}{2 + len(values)}"
        vvals, vcode, _ = read_sheet_range(token, spreadsheet_token, range_verify)
        if not vvals or vcode != 200:
            return False, '校验读取失败'
        flat = [c for row in vvals for c in (row if isinstance(row, list) else [row])]
        expect_first = values[0] if values else ''
        got_first = str(flat[0]).strip() if flat else ''
        if str(expect_first).strip() != got_first:
            return False, f'校验不符：期望首格≈{str(expect_first)[:20]}，实际≈{got_first[:20]}'
        return True, 'ok'

    if target_col_0based is not None:
        col_letter = _col_letter(target_col_0based)
        range_col = f"{sheet_id}!{col_letter}3:{col_letter}{2 + len(values)}"
        values_vertical = [[v] for v in values]
        code, body = update_sheet_range(token, spreadsheet_token, range_col, values_vertical)
        if code == 401 or body.get('code') in (99991677, 99991663):
            token = refresh_and_load_token()
            if token:
                code, body = update_sheet_range(token, spreadsheet_token, range_col, values_vertical)
        if code == 200 and body.get('code') == 0:
            ok, msg = _verify_write(spreadsheet_token, sheet_id, col_letter, values, token)
            if ok:
                print(f'✅ 已写入飞书表格：{session}场 效果数据（竖列 {col_letter}3:{col_letter}{2+len(values)}，共{len(values)}格），校验通过')
                _maybe_send_group(session, raw)
                return
            print(f'⚠️ 写入成功但校验未通过：{msg}')
        err = body.get('code')
        if err == 90202 or (err and 'range' in str(body.get('msg', '')).lower()):
            all_ok = True
            for r in range(3, 3 + len(values)):
                one_cell = f"{sheet_id}!{col_letter}{r}"
                code, body = update_sheet_range(token, spreadsheet_token, one_cell, [[values[r - 3]]])
                if code != 200 or body.get('code') not in (0, None):
                    if code == 401 or body.get('code') in (99991677, 99991663):
                        token = refresh_and_load_token()
                        if token:
                            code, body = update_sheet_range(token, spreadsheet_token, one_cell, [[values[r - 3]]])
                    if code != 200 or body.get('code') not in (0, None):
                        all_ok = False
                        print('❌ 写入单元格失败:', one_cell, code, body)
                        break
            if all_ok:
                ok, msg = _verify_write(spreadsheet_token, sheet_id, col_letter, values, token)
                if ok:
                    print(f'✅ 已写入飞书表格：{session}场 效果数据（竖列 {col_letter} 逐格），校验通过')
                    _maybe_send_group(session, raw)
                    return
                print(f'⚠️ 逐格写入成功但校验未通过：{msg}')
        else:
            print('❌ 按列更新失败:', code, body)
    # 有日期列配置但未找到列时，不降级为追加，直接失败
    if date_col and target_col_0based is None:
        print('❌ 未找到日期列，无法写入正确位置。请运行 python3 auto_log.py 刷新 Token 后重试。')
        sys.exit(1)
    code, body = write_sheet_row(token, spreadsheet_token, sheet_id, values)
    if code == 200 and (body.get('code') == 0 or body.get('code') is None):
        print(f'✅ 已追加一行：{session}场 效果数据')
        _maybe_send_group(session, raw)
        return
    if code == 401 or body.get('code') in (99991677, 99991663):
        token = refresh_and_load_token()
        if token:
            code, body = write_sheet_row(token, spreadsheet_token, sheet_id, values)
            if code == 200 and (body.get('code') == 0 or body.get('code') is None):
                print(f'✅ 已追加一行：{session}场 效果数据')
                _maybe_send_group(session, raw)
                return
    print('❌ 写入失败:', code, body)
    if body.get('code') in (99991663, 99991677):
        print('Token 已过期，请重新授权飞书后再试。')
    elif body.get('code') in (403, 404, 1254101):
        print('若表格在 Wiki 内，请打开该电子表格→分享→复制链接，链接里 /sheets/ 后的一串为 spreadsheet_token，执行：')
        print('  export FEISHU_SPREADSHEET_TOKEN=该token')
    sys.exit(1)


if __name__ == '__main__':
    main()
