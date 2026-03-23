#!/usr/bin/env python3
"""
飞书运营报表 · Soul 派对效果数据写入（按场次竖列、数字类型、不填比率）
- 只填前 10 项：主题、时长、Soul推流人数、进房人数、人均时长、互动数量、礼物、灵魂力、增加关注、最高在线
- 推流人数为 0 时不填（留空），有数据才填；推流进房率、1分钟进多少人、加微率 由表格公式自动计算，导入时不填
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
SHEET_ID = os.environ.get('FEISHU_SHEET_ID', '7A3Cy9')  # 2月默认 sheet
# 月份 → 工作表 sheetId（2月=7A3Cy9；3月=bJR5sA，与飞书「3月」标签一致）
SHEET_ID_BY_MONTH = {2: '7A3Cy9', 3: 'bJR5sA'}
# 飞书群机器人 webhook（推送运营报表链接与场次数据；默认=开发群，与 FEISHU_DEV_GROUP_WEBHOOK 一致）
FEISHU_GROUP_WEBHOOK = os.environ.get(
    'FEISHU_GROUP_WEBHOOK',
    os.environ.get(
        'FEISHU_DEV_GROUP_WEBHOOK',
        'https://open.feishu.cn/open-apis/bot/v2/hook/c558df98-e13a-419f-a3c0-7e428d15f494',
    ),
)
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
    # 107场 2026-02-23：关闭页 137min/398进房/60最高/36关注/2礼物/16灵魂力/33820曝光，小助手 10人均/85互动/34关注
    '107': [ '职场情绪价值 核心团队管理', 137, 33820, 398, 10, 85, 2, 16, 36, 60 ],
    # 113场 2026-03-02：关闭页 163min/430成员/50最高/20新增粉丝/13礼物/66灵魂力/34290曝光，小助手 162min建房/429进房/9人均/110互动/20关注
    '113': [ '钱一月Ai创业私域', 163, 34290, 430, 9, 110, 13, 66, 20, 50 ],
    # 114场 2026-03-03：关闭页 163min/445成员/54最高/19新增粉丝/1礼物/29灵魂力/42360曝光，小助手 158min建房/437进房/8人均/139互动/16关注
    '114': [ '电竞AI私域招人 龙虾', 163, 42360, 445, 8, 139, 1, 29, 19, 54 ],
    # 115场 2026-03-04：关闭页 156min/484成员/56最高/15新增粉丝/1礼物/3灵魂力/36974曝光，小助手 154min建房/480进房/8人均/82互动/15关注
    '115': [ '破产两次 家庭先于事业', 156, 36974, 484, 8, 82, 1, 3, 15, 56 ],
    # 116场 2026-03-05：小助手 154min建房/418进房/11人均/104互动/19关注，话题职场；推流/礼物/灵魂力/最高在线待关闭页补
    '116': [ '量化猎头人才 职场分享', 154, 0, 418, 11, 104, 0, 0, 19, 0 ],
    # 117场 2026-03-06：关闭页 154min/503成员/72最高/36新增/16礼物/351灵魂力/51602曝光，小助手 151min/494进房/11人均/118互动/26关注
    '117': [ '链接合作 派对流量 教培', 154, 51602, 503, 11, 118, 16, 351, 36, 72 ],
    # 118场 2026-03-07：关闭页 190min/586成员/65最高/33新增/46礼物/7456灵魂力/74873曝光，小助手 180min/559进房/10人均/149互动/29关注
    '118': [ '3D打印 游戏代充 正财偏财', 190, 74873, 586, 10, 149, 46, 7456, 33, 65 ],
    # 119场 2026-03-08：关闭页 154min/446成员/64最高/26新增/20礼物/3315灵魂力/50692曝光，小助手 151min/441进房/11人均/110互动/23关注
    '119': [ '开派对初心 早上不影响老婆', 154, 50692, 446, 11, 110, 20, 3315, 26, 64 ],
    # 124场 2026-03-14：关闭页 95min/171成员/32最高/7新增/0礼物/0灵魂力，小助手 91min建房/169进房/8人均/48互动/6关注，妙记提炼主题
    '124': [ '房主号设备与手机业务线', 95, 0, 171, 8, 48, 0, 0, 7, 32 ],
    # 126场 2026-03-17：关闭页 123min/161成员/24最高/10新增/5礼物/9灵魂力，小助手 118min建房/155进房/10人均/63互动/9关注，主题来自派对标题
    '126': [ '分享最赚钱1个月AI', 123, 0, 161, 10, 63, 5, 9, 10, 24 ],
    # 127场 2026-03-18：关闭页 127min/174成员/32最高/14新增/18礼物/69灵魂力，小助手 119min/162进房/10人均/60互动/14关注，话题占卜玄学，TXT关键词职业定位TOKEN
    '127': [ '占卜玄学 AI职业定位TOKEN', 127, 0, 174, 10, 60, 18, 69, 14, 32 ],
    # 128场 2026-03-19：关闭页 187min/236成员/37最高/19新增/2礼物/29灵魂力，小助手 185min建房/233进房/13人均/102互动/19关注，话题知识
    '128': [ '分享最赚钱一个月-知识节奏', 187, 0, 233, 13, 102, 2, 29, 19, 37 ],
    # 129场 2026-03-20：关闭页 200min/252成员/31最高/21新增/4礼物/561灵魂力/灵果+5257，小助手 200min建房/250进房/14人均/187互动/21关注，话题职场；主题从妙记TXT分析：AI手机、金融坏账、投流返点、正反馈
    '129': [ 'AI手机金融坏账投流', 200, 0, 250, 14, 187, 4, 561, 21, 31 ],
    # 130场 2026-03-21：视频号直播结束页 02:25:49≈146min；观众总数2278、最高在线355、新增关注4、总热度3、送礼1；Soul推流无截图数据填0→脚本跳过第5行保留空
    '130': [ 'Soul爆量脸视频号问微信', 146, 0, 2278, 0, 3, 1, 3, 4, 355 ],
    # 131场 2026-03-23：结束页 02:05:55≈126min；观众总数1144、最高在线75、新增关注4；点赞1595+评论498+分享12=2105；礼物/灵魂力/人均未给填0；Soul推流无填0→跳过第5行
    '131': [ '视频号中枢Soul哨兵', 126, 0, 1144, 0, 2105, 0, 0, 4, 75 ],
}
# 场次→按日期列填写时的日期（表头为当月日期 1~31）
SESSION_DATE_COLUMN = {'105': '20', '106': '21', '107': '23', '113': '2', '114': '3', '115': '4', '116': '5', '117': '6', '118': '7', '119': '8', '124': '14', '126': '17', '127': '18', '128': '19', '129': '20', '130': '21', '131': '23'}
# 场次→月份（用于选择 2月/3月 等工作表标签，避免写入错月）
SESSION_MONTH = {'105': 2, '106': 2, '107': 2, '113': 3, '114': 3, '115': 3, '116': 3, '117': 3, '118': 3, '119': 3, '124': 3, '126': 3, '127': 3, '128': 3, '129': 3, '130': 3, '131': 3}

# 派对录屏（飞书妙记）链接：场次 → 完整 URL，填表时写入「派对录屏」行对应列
# 从飞书妙记复制链接后填入，新场次需补全
PARTY_VIDEO_LINKS = {
    '113': 'https://cunkebao.feishu.cn/minutes/obcn6yjq6866c3gl4ibd72vr',
    '114': 'https://cunkebao.feishu.cn/minutes/obcn7nd828351hy4he3974a8',
    '115': 'https://cunkebao.feishu.cn/minutes/obcn8cgvnzk15yfy3buak735',
    '116': 'https://cunkebao.feishu.cn/minutes/obcn81825en52vt3eqoo482e',
    '117': 'https://cunkebao.feishu.cn/minutes/obcn9phnds9a96ma6t8ixa3z',
    '118': 'https://cunkebao.feishu.cn/minutes/obcnaee1h83l1s169e3a18qp',
    '119': 'https://cunkebao.feishu.cn/minutes/obcnbrc925796a6u4c667931',
    '124': 'https://cunkebao.feishu.cn/minutes/obcne7q5dto13494k9a56881',
    '126': 'https://cunkebao.feishu.cn/minutes/obcnha23t28fxfq8g8h5392d',
    '127': 'https://cunkebao.feishu.cn/minutes/obcnhybw322112tad6916v8r',
    '129': 'https://cunkebao.feishu.cn/minutes/obcnjb994323l12lhl448177',
    '130': 'https://cunkebao.feishu.cn/minutes/obcnj1y95z73n53e8m6m1s3j',
}

# 团队会议（飞书妙记）链接：场次 → 完整 URL，填表时写入「团队会议」行对应列（row 31）
TEAM_MEETING_LINKS = {
    '113': 'https://cunkebao.feishu.cn/minutes/obcn6yjq6866c3gl4ibd72vr',
    '114': 'https://kcnxrqd5ata7.feishu.cn/minutes/obcne7k3msifq',
    '116': 'https://kcnxrqd5ata7.feishu.cn/minutes/obcn81825en52vt3eqoo482e',
    '117': 'https://kcnxrqd5ata7.feishu.cn/minutes/obcn9phnds9a96ma6t8ixa3z',
    '118': 'https://kcnxrqd5ata7.feishu.cn/minutes/obcnaee1h83l1s169e3a18qp',
    '119': 'https://kcnxrqd5ata7.feishu.cn/minutes/obcnbrc925796a6u4c667931',
    '124': 'https://kcnxrqd5ata7.feishu.cn/minutes/obcne7k3msifq',
    '126': 'https://kcnxrqd5ata7.feishu.cn/minutes/obcng991jg3114b2nj99548d',
    '127': 'https://cunkebao.feishu.cn/minutes/obcnhxs8usi8c7n27a9f66ux',
    '129': 'https://kcnxrqd5ata7.feishu.cn/minutes/obcnjbn178iy6919od4119ww',
}

# 小程序当日运营数据：日期号 → {访问次数, 访客, 交易金额}，填表时自动写入对应日期列
# 数据来源：微信公众平台 → 小程序 → 统计 → 实时访问/概况（Soul 小程序同源）
# 2 月：MINIPROGRAM_EXTRA；3 月：MINIPROGRAM_EXTRA_3（填 113/114/115 时自动写 3 月表）
MINIPROGRAM_EXTRA = {
    '20': {'访问次数': 45, '访客': 45, '交易金额': 0},  # 2月20日
    '21': {'访问次数': 52, '访客': 52, '交易金额': 0},  # 2月21日
    '23': {'访问次数': 55, '访客': 55, '交易金额': 0},  # 2月23日
}
# 3 月：日期列 2/3/4/5 对应 113/114/115/116 场；数据从 Soul 小程序后台获取后填入此处
MINIPROGRAM_EXTRA_3 = {
    '2': {'访问次数': 0, '访客': 0, '交易金额': 0},   # 3月2日 113场
    '3': {'访问次数': 0, '访客': 0, '交易金额': 0},   # 3月3日 114场
    '4': {'访问次数': 0, '访客': 0, '交易金额': 0},   # 3月4日 115场
    '5': {'访问次数': 0, '访客': 0, '交易金额': 0},   # 3月5日 116场
    '6': {'访问次数': 0, '访客': 0, '交易金额': 0},   # 3月6日 117场
    '7': {'访问次数': 0, '访客': 0, '交易金额': 0},   # 3月7日 118场
    '8': {'访问次数': 0, '访客': 0, '交易金额': 0},   # 3月8日 119场
    '14': {'访问次数': 0, '访客': 0, '交易金额': 0},  # 3月14日 124场
    '17': {'访问次数': 0, '访客': 0, '交易金额': 0},  # 3月17日 126场
    '18': {'访问次数': 0, '访客': 0, '交易金额': 0},  # 3月18日 127场
    '19': {'访问次数': 0, '访客': 0, '交易金额': 0},  # 3月19日 128场
    '20': {'访问次数': 0, '访客': 0, '交易金额': 0},  # 3月20日 129场
    '21': {'访问次数': 0, '访客': 0, '交易金额': 0},  # 3月21日 130场（从小程序后台更新）
    '23': {'访问次数': 0, '访客': 0, '交易金额': 0},  # 3月23日 131场（从小程序后台更新）
}


def _find_row_for_keyword(vals, keywords):
    """在 vals 中找 A 列包含任一 keyword 的行号（1-based）"""
    for ri, row in enumerate(vals):
        a1 = (row[0] if row and len(row) > 0 else '')
        a1 = str(a1 or '').strip()
        for kw in keywords:
            if kw in a1:
                return ri + 1
    return None


def _write_miniprogram_extra(token, spreadsheet_token, sheet_id, vals, date_col, col_letter, month=2):
    """若当日有小程序数据，写入 交易金额、访客、小程序访问 到对应行。2 月用 MINIPROGRAM_EXTRA，3 月用 MINIPROGRAM_EXTRA_3。"""
    extra = (MINIPROGRAM_EXTRA_3 if month == 3 else MINIPROGRAM_EXTRA).get(date_col)
    if not extra:
        return
    month_label = f'{month}月{date_col}日'
    writes = [
        (_find_row_for_keyword(vals, ['交易金额']), extra.get('交易金额', 0)),
        (_find_row_for_keyword(vals, ['访客']), extra.get('访客', extra.get('访问次数'))),
        (_find_row_for_keyword(vals, ['小程序访问']), extra.get('访问次数')),
    ]
    written = 0
    for row_num, val in writes:
        if row_num is None or val is None:
            continue
        rng = f"{sheet_id}!{col_letter}{row_num}"
        code, body = update_sheet_range(token, spreadsheet_token, rng, [[_to_cell_value(val)]])
        if code == 401 or body.get('code') in (99991677, 99991663):
            return
        if code == 200 and body.get('code') in (0, None):
            written += 1
    if written > 0:
        print(f'✅ 已写入小程序运营数据（{month_label}列）：访问次数 {extra.get("访问次数","")}、访客 {extra.get("访客","")}、交易金额 {extra.get("交易金额",0)}')


def _write_session_label(token, spreadsheet_token, sheet_id, col_letter, session):
    """在表头第 2 行写入「第几场」如 117场，便于报表显示该列对应场次。"""
    rng = f"{sheet_id}!{col_letter}2:{col_letter}2"
    code, body = update_sheet_range(token, spreadsheet_token, rng, [[f"{session}场"]], value_input_option='USER_ENTERED')
    if code == 200 and body.get('code') in (0, None):
        print(f'✅ 已写入表头：{col_letter}2 = {session}场')
    elif code != 401 and body.get('code') not in (99991677, 99991663):
        print(f'⚠️ 表头「第几场」写入未成功: {code} {body}')


def _write_party_video_link(token, spreadsheet_token, sheet_id, vals, col_letter, session):
    """若有该场次的派对录屏链接，写入「派对录屏」行对应列（如 E29）。"""
    link = (PARTY_VIDEO_LINKS or {}).get(session, '').strip()
    if not link:
        return
    row_num = _find_row_for_keyword(vals, ['派对录屏', '录屏'])
    if row_num is None:
        row_num = 29  # 运营报表「派对录屏」行为第 29 行
    # 飞书 v2 要求 range 带起止（如 E29:E29），单格也写成范围
    rng = f"{sheet_id}!{col_letter}{row_num}:{col_letter}{row_num}"
    code, body = update_sheet_range(token, spreadsheet_token, rng, [[link]], value_input_option='USER_ENTERED')
    if code == 401 or body.get('code') in (99991677, 99991663):
        return
    if code == 200 and body.get('code') in (0, None):
        print(f'✅ 已写入派对录屏链接 → {col_letter}{row_num}')
    else:
        print(f'⚠️ 派对录屏链接写入未成功: {code} {body}')


def _write_team_meeting_link(token, spreadsheet_token, sheet_id, vals, col_letter, session):
    """若有该场次的团队会议链接，写入「团队会议」行对应列（如 S31）。"""
    link = (TEAM_MEETING_LINKS or {}).get(session, '').strip()
    if not link:
        return
    row_num = _find_row_for_keyword(vals, ['团队会议'])
    if row_num is None:
        row_num = 31
    rng = f"{sheet_id}!{col_letter}{row_num}:{col_letter}{row_num}"
    code, body = update_sheet_range(token, spreadsheet_token, rng, [[link]], value_input_option='USER_ENTERED')
    if code == 401 or body.get('code') in (99991677, 99991663):
        return
    if code == 200 and body.get('code') in (0, None):
        print(f'✅ 已写入团队会议链接 → {col_letter}{row_num}')
    else:
        print(f'⚠️ 团队会议链接写入未成功: {code} {body}')


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


def get_sheet_id_by_month(access_token, spreadsheet_token, month):
    """按月份选工作表标签：标题含「X月」的 sheet（如 3月）→ 返回其 sheetId，避免写入错月。"""
    if month in SHEET_ID_BY_MONTH:
        return SHEET_ID_BY_MONTH[month]
    url = f'https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{spreadsheet_token}/metainfo'
    r = requests.get(
        url,
        headers={'Authorization': f'Bearer {access_token}'},
        timeout=15,
    )
    if r.status_code != 200:
        return SHEET_ID
    body = r.json()
    if body.get('code') != 0:
        return SHEET_ID
    sheets = (body.get('data') or {}).get('sheets') or []
    month_label = f'{month}月'
    for s in sheets:
        title = (s.get('title') or '').strip()
        if month_label in title:
            sid = s.get('sheetId') or s.get('title')
            if sid:
                return sid
    return SHEET_ID


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
        print('❌ 未知场次，可用: 96, 97, 98, 99, 100, 103, 104, 105, 106, 107, 113, 114, 115, 116, 117, 118, 119, 124, 126, 127, 128, 129, 130, 131')
        sys.exit(1)
    token = load_token() or refresh_and_load_token()
    if not token:
        print('❌ 无法获取飞书 Token，请先运行 auto_log.py 完成授权')
        sys.exit(1)
    raw = (row + [None] * EFFECT_COLS)[:EFFECT_COLS]
    # 推流人数（索引2，表格第5行）为 0 或 None 时跳过不填，保留原值
    # 注意：values数组长度必须保持EFFECT_COLS，但推流人数位置写入时需跳过
    def _cell(i):
        if i == 2 and (raw[i] == 0 or raw[i] is None):
            return None  # 返回None表示跳过该列，不覆盖原有值
        return _to_cell_value(raw[i])
    values = [_cell(i) for i in range(EFFECT_COLS)]
    # 记录推流人数位置，写入时跳过
    skip_push_index = 2 if (raw[2] == 0 or raw[2] is None) else None
    spreadsheet_token = WIKI_NODE_OR_SPREADSHEET_TOKEN
    month = SESSION_MONTH.get(session, 2)
    sheet_id = get_sheet_id_by_month(token, spreadsheet_token, month)
    if month != 2:
        print(f'✅ 已选 {month}月 工作表（sheet_id={sheet_id}）')
    range_read = f"{sheet_id}!A1:AG35"
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
        # 飞书群推送改为显式开启，避免未确认就发群：export SOUL_PARTY_PUSH_GROUP=1
        if os.environ.get('SOUL_PARTY_PUSH_GROUP', '').strip() != '1':
            print('⏭️ 已跳过飞书群推送（需 export SOUL_PARTY_PUSH_GROUP=1 后重跑本脚本才会推送运营数据到群）')
            return
        if sess not in ('105', '106', '107', '113', '114', '115', '116', '117', '118', '119', '124', '126', '127', '128', '129', '130', '131'):
            return
        date_label = {'105': '2月20日', '106': '2月21日', '107': '2月23日', '113': '3月2日', '114': '3月3日', '115': '3月4日', '116': '3月5日', '117': '3月6日', '118': '3月7日', '119': '3月8日', '124': '3月14日', '126': '3月17日', '127': '3月18日', '128': '3月19日', '129': '3月20日', '130': '3月21日', '131': '3月23日'}.get(sess, sess + '场')
        report_link = OPERATION_REPORT_LINK if sheet_id == SHEET_ID else f'https://cunkebao.feishu.cn/wiki/wikcnIgAGSNHo0t36idHJ668Gfd?sheet={sheet_id}'
        lines = [
            '【Soul 派对运营报表】',
            f'链接：{report_link}',
            '',
            f'{sess}场（{date_label}）已登记：',
        ]
        for i, label in enumerate(LABELS_GROUP):
            val = raw_vals[i] if i < len(raw_vals) else ''
            lines.append(f'{label}：{val}')
        src_date = {'105': '20260220', '106': '20260221', '107': '20260223', '113': '20260302', '114': '20260303', '115': '20260304', '116': '20260305', '117': '20260306', '118': '20260307', '119': '20260308', '124': '20260314', '126': '20260317', '127': '20260318', '128': '20260319', '129': '20260320', '130': '20260321', '131': '20260323'}.get(sess, '20260220')
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
        # 推流人数为None时，使用逐格写入方式，跳过推流人数行（保留原值）
        if skip_push_index is not None:
            # 使用逐格写入，跳过推流人数行
            all_ok = True
            for r in range(3, 3 + len(values)):
                val_idx = r - 3
                if val_idx == skip_push_index:
                    continue  # 跳过推流人数行，保留原值
                one_cell = f"{sheet_id}!{col_letter}{r}:{col_letter}{r}"
                code, body = update_sheet_range(token, spreadsheet_token, one_cell, [[values[val_idx]]])
                if code != 200 or body.get('code') not in (0, None):
                    if code == 401 or body.get('code') in (99991677, 99991663):
                        token = refresh_and_load_token()
                        if token:
                            code, body = update_sheet_range(token, spreadsheet_token, one_cell, [[values[val_idx]]])
                    if code != 200 or body.get('code') not in (0, None):
                        all_ok = False
                        print('❌ 写入单元格失败:', one_cell, code, body)
                        break
            if all_ok:
                ok, msg = _verify_write(spreadsheet_token, sheet_id, col_letter, values, token)
                if ok:
                    print(f'✅ 已写入飞书表格：{session}场 效果数据（竖列 {col_letter} 逐格，推流人数保留原值），校验通过')
                    _write_session_label(token, spreadsheet_token, sheet_id, col_letter, session)
                    _write_miniprogram_extra(token, spreadsheet_token, sheet_id, vals, date_col, col_letter, month=month)
                    _write_party_video_link(token, spreadsheet_token, sheet_id, vals, col_letter, session)
                    _write_team_meeting_link(token, spreadsheet_token, sheet_id, vals, col_letter, session)
                    _maybe_send_group(session, raw)
                    return
                print(f'⚠️ 逐格写入成功但校验未通过：{msg}')
            else:
                print('❌ 逐格写入失败')
        else:
            # 推流人数有值，使用批量写入
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
                    _write_session_label(token, spreadsheet_token, sheet_id, col_letter, session)
                    _write_miniprogram_extra(token, spreadsheet_token, sheet_id, vals, date_col, col_letter, month=month)
                    _write_party_video_link(token, spreadsheet_token, sheet_id, vals, col_letter, session)
                    _write_team_meeting_link(token, spreadsheet_token, sheet_id, vals, col_letter, session)
                    _maybe_send_group(session, raw)
                    return
                print(f'⚠️ 写入成功但校验未通过：{msg}')
            err = body.get('code')
            if err == 90202 or (err and 'range' in str(body.get('msg', '')).lower()):
                all_ok = True
                for r in range(3, 3 + len(values)):
                    val_idx = r - 3
                    # 推流人数（索引2，行号5）为None时跳过写入，保留原值
                    if val_idx == skip_push_index and values[val_idx] is None:
                        continue
                    one_cell = f"{sheet_id}!{col_letter}{r}:{col_letter}{r}"
                    code, body = update_sheet_range(token, spreadsheet_token, one_cell, [[values[val_idx]]])
                    if code != 200 or body.get('code') not in (0, None):
                        if code == 401 or body.get('code') in (99991677, 99991663):
                            token = refresh_and_load_token()
                            if token:
                                code, body = update_sheet_range(token, spreadsheet_token, one_cell, [[values[val_idx]]])
                        if code != 200 or body.get('code') not in (0, None):
                            all_ok = False
                            print('❌ 写入单元格失败:', one_cell, code, body)
                            break
                if all_ok:
                    ok, msg = _verify_write(spreadsheet_token, sheet_id, col_letter, values, token)
                    if ok:
                        print(f'✅ 已写入飞书表格：{session}场 效果数据（竖列 {col_letter} 逐格），校验通过')
                        _write_session_label(token, spreadsheet_token, sheet_id, col_letter, session)
                        _write_miniprogram_extra(token, spreadsheet_token, sheet_id, vals, date_col, col_letter, month=month)
                        _write_party_video_link(token, spreadsheet_token, sheet_id, vals, col_letter, session)
                        _write_team_meeting_link(token, spreadsheet_token, sheet_id, vals, col_letter, session)
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
