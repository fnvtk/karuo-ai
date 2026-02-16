#!/usr/bin/env python3
"""
写入1-25号重点工作（去重、精简）
"""
import os
import json
import requests
import time

CONFIG = {
    'APP_ID': 'cli_a48818290ef8100d',
    'APP_SECRET': 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4',
    'DOC_ID': 'JZiiwxEjHiRxouk8hSPcqBn6nrd'
}

TOKEN_FILE = os.path.join(os.path.dirname(__file__), '.feishu_tokens.json')

# 1月重点工作（去重精简版）
JANUARY_WORK = {
    1: {
        "重要紧急": [{"person": "卡若", "events": ["SOUL", "复盘"], "t": ["📝 五步法复盘模板"], "n": ["✅ 模板设计完成"], "w": ["复盘模板.md"]}],
        "重要不紧急": [{"person": "卡若", "events": ["开发", "规范"], "t": ["🔧 Webhook部署提示词"], "n": ["✅ 开发规范建立"], "w": ["规范文档"]}]
    },
    2: {
        "重要不紧急": [{"person": "卡若", "events": ["财务", "分析"], "t": ["💰 家庭财务简报"], "n": ["📊 16个月数据分析"], "w": ["财务简报.md"]}]
    },
    3: {
        "重要不紧急": [{"person": "卡若", "events": ["玩值", "前端"], "t": ["🎮 玩值电竞前端"], "n": ["✅ Dashboard组件"], "w": ["前端页面"]}]
    },
    4: {
        "重要不紧急": [{"person": "卡若", "events": ["规划", "画像"], "t": ["👤 自我画像总览"], "n": ["📋 职业发展规划"], "w": ["2025-2027规划"]}]
    },
    5: {
        "重要紧急": [{"person": "卡若", "events": ["SOUL", "融资"], "t": ["💎 5149融资模式"], "n": ["✅ 用户资产数字化"], "w": ["融资方案"]}],
        "重要不紧急": [{"person": "卡若", "events": ["开发", "规范"], "t": ["📖 项目管理规范"], "n": ["✅ 版本管理规范"], "w": ["第10章"]}]
    },
    6: {
        "重要紧急": [{"person": "卡若", "events": ["SOUL", "协议"], "t": ["📄 项目合作协议"], "n": ["✅ 智能生成引擎v3"], "w": ["协议汇编"]}],
        "重要不紧急": [{"person": "卡若", "events": ["品牌", "画布"], "t": ["🎯 品牌定位画布"], "n": ["✅ 人物画像分析"], "w": ["画布模板"]}]
    },
    7: {
        "重要紧急": [{"person": "卡若", "events": ["SOUL", "产品"], "t": ["📋 产品人员整理"], "n": ["✅ 商业闭环方案"], "w": ["整理文档"]}],
        "重要不紧急": [{"person": "卡若", "events": ["NAS", "部署"], "t": ["🖥️ DS1825+部署"], "n": ["✅ 配置手册完成"], "w": ["部署手册"]}]
    },
    8: {
        "重要紧急": [{"person": "卡若", "events": ["SOUL", "写书"], "t": ["📚 创业故事整理"], "n": ["✅ 内容红利章节"], "w": ["第6-7章"]}]
    },
    9: {
        "重要紧急": [{"person": "卡若", "events": ["SOUL", "商业"], "t": ["💊 药物私域模式"], "n": ["✅ 健康包高复购"], "w": ["第9章"]}]
    },
    10: {
        "重要紧急": [{"person": "卡若", "events": ["SOUL", "序言"], "t": ["📖 为什么6点开播"], "n": ["✅ 数据资产化"], "w": ["序言完成"]}]
    },
    11: {
        "重要紧急": [{"person": "卡若", "events": ["SOUL", "对话"], "t": ["💬 精选对话录"], "n": ["✅ 派对房对话"], "w": ["附录1"]}],
        "重要不紧急": [{"person": "卡若", "events": ["存客宝", "规范"], "t": ["🏦 项目规则"], "n": ["✅ 运营指南"], "w": ["对接指南"]}]
    },
    12: {
        "重要紧急": [{"person": "卡若", "events": ["SOUL", "定位"], "t": ["🎯 品牌定位画布"], "n": ["✅ 股东结构表"], "w": ["画布完成"]}],
        "重要不紧急": [{"person": "卡若", "events": ["银掌柜", "计划"], "t": ["📊 商业计划书"], "n": ["✅ 协议汇编"], "w": ["计划书"]}]
    },
    14: {
        "重要紧急": [{"person": "卡若", "events": ["SOUL", "前端"], "t": ["🌐 官网首页"], "n": ["✅ 组件开发"], "w": ["HomePage"]}]
    },
    15: {
        "重要紧急": [{"person": "卡若", "events": ["SOUL", "部署"], "t": ["🚨 502错误解决"], "n": ["✅ 部署报告"], "w": ["部署完成"]}],
        "重要不紧急": [{"person": "卡若", "events": ["AI发型", "服务"], "t": ["💇 后端服务"], "n": ["✅ Nest.js开发"], "w": ["部署文档"]}]
    },
    17: {
        "重要紧急": [{"person": "卡若", "events": ["SOUL", "支付"], "t": ["💳 支付API v4"], "n": ["✅ 安全合规"], "w": ["接口定义"]}],
        "重要不紧急": [{"person": "卡若", "events": ["引擎", "展开"], "t": ["⚙️ 智能展开引擎"], "n": ["✅ PM/前端/API"], "w": ["三个引擎"]}]
    },
    18: {
        "重要紧急": [{"person": "卡若", "events": ["SOUL", "分销"], "t": ["🔗 分销系统"], "n": ["✅ 找伙伴功能"], "w": ["功能说明"]}],
        "重要不紧急": [{"person": "卡若", "events": ["飞书", "工具"], "t": ["📦 飞书工具箱"], "n": ["✅ 需求文档"], "w": ["迭代记录"]}]
    },
    20: {
        "重要紧急": [{"person": "卡若", "events": ["卡若AI", "技能"], "t": ["🏭 技能工厂"], "n": ["✅ 五行拆书"], "w": ["SKILL.md"]}]
    },
    21: {
        "重要紧急": [{"person": "卡若", "events": ["卡若AI", "体系"], "t": ["📚 Skills体系"], "n": ["✅ 视频切片脚本"], "w": ["体系文档"]}]
    },
    22: {
        "重要紧急": [{"person": "卡若", "events": ["卡若AI", "字幕"], "t": ["🎬 字幕烧录v3"], "n": ["✅ 修正脚本"], "w": ["脚本完成"]}],
        "重要不紧急": [{"person": "卡若", "events": ["玩值", "规划"], "t": ["👥 团队架构"], "n": ["✅ 用户画像"], "w": ["规划文档"]}]
    },
    23: {
        "重要紧急": [{"person": "卡若", "events": ["SOUL", "切片"], "t": ["✂️ 切片v2"], "n": ["✅ 一键处理"], "w": ["脚本完成"]}],
        "重要不紧急": [{"person": "卡若", "events": ["万推", "分发"], "t": ["📤 视频矩阵"], "n": ["✅ 部署脚本"], "w": ["分发系统"]}]
    },
    24: {
        "重要紧急": [{"person": "卡若", "events": ["卡若AI", "卡火"], "t": ["🔥 技术研发"], "n": ["✅ 代码修复"], "w": ["全栈开发"]}],
        "重要不紧急": [{"person": "卡若", "events": ["飞书", "权限"], "t": ["🔐 权限配置"], "n": ["✅ CLI工具"], "w": ["配置指南"]}]
    },
    25: {
        "重要紧急": [{"person": "卡若", "events": ["SOUL", "小程序"], "t": ["📱 小程序前端"], "n": ["✅ 章节页面"], "w": ["前端完成"]}],
        "重要不紧急": [{"person": "卡若", "events": ["认证", "隐私"], "t": ["🔒 隐私协议"], "n": ["✅ 企业认证"], "w": ["指南文档"]}]
    }
}

def load_tokens():
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_tokens(tokens):
    with open(TOKEN_FILE, 'w') as f:
        json.dump(tokens, f, ensure_ascii=False, indent=2)

def get_app_token():
    r = requests.post("https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal/",
        json={"app_id": CONFIG['APP_ID'], "app_secret": CONFIG['APP_SECRET']}, timeout=10)
    return r.json().get('app_access_token') if r.json().get('code') == 0 else None

def refresh_token(tokens):
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
        tokens['access_token'] = result['data']['access_token']
        tokens['refresh_token'] = result['data']['refresh_token']
        save_tokens(tokens)
        return tokens['access_token']
    return None

def api(method, endpoint, token, data=None, params=None):
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    url = f'https://open.feishu.cn/open-apis{endpoint}'
    r = requests.get(url, headers=headers, params=params, timeout=30) if method == 'GET' else requests.post(url, headers=headers, json=data, timeout=30)
    return r.json()

def get_all_blocks(doc_id, token):
    all_blocks, page_token = [], None
    while True:
        params = {'page_size': 200}
        if page_token:
            params['page_token'] = page_token
        result = api('GET', f'/docx/v1/documents/{doc_id}/blocks', token, params=params)
        if result.get('code') == 0:
            all_blocks.extend(result['data']['items'])
            page_token = result['data'].get('page_token')
            if not page_token:
                break
        else:
            break
    return all_blocks

def build_quadrant_content(quadrant, tasks):
    blocks = []
    color_map = {"重要紧急": 5, "重要不紧急": 3, "不重要紧急": 1, "不重要不紧急": 4}
    color = color_map.get(quadrant, 1)
    
    blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": f"[{quadrant}]", "text_element_style": {"bold": True, "text_color": color}}}], "style": {}}})
    
    for task in tasks:
        events_str = "、".join(task.get('events', [])[:3])
        blocks.append({"block_type": 17, "todo": {"elements": [{"text_run": {"content": f"{task['person']}（{events_str}）", "text_element_style": {}}}], "style": {"done": False}}})
        blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": "{", "text_element_style": {}}}], "style": {}}})
        
        for label, items in [("T", task.get('t', [])), ("N", task.get('n', [])), ("W", task.get('w', []))]:
            if items:
                blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": label, "text_element_style": {"bold": True}}}], "style": {}}})
                for item in items[:2]:
                    blocks.append({"block_type": 17, "todo": {"elements": [{"text_run": {"content": item, "text_element_style": {}}}], "style": {"done": False}}})
        
        blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": "}", "text_element_style": {}}}], "style": {}}})
    
    if not tasks:
        blocks.append({"block_type": 17, "todo": {"elements": [{"text_run": {"content": "", "text_element_style": {}}}], "style": {"done": False}}})
    
    return blocks

def find_heading2_index(blocks, doc_id):
    root_children = [b for b in blocks if b.get('parent_id') == doc_id]
    for i, block in enumerate(root_children):
        if block.get('block_type') == 4:
            content = "".join([el['text_run'].get('content', '') for el in block.get('heading2', {}).get('elements', []) if 'text_run' in el])
            if '本月最重要的任务' in content:
                return i
    return None

def write_day(token, doc_id, day, data):
    blocks = get_all_blocks(doc_id, token)
    idx = find_heading2_index(blocks, doc_id)
    if idx is None:
        print("❌ 找不到位置")
        return False
    
    # 创建日期框架
    day_blocks = [
        {"block_type": 6, "heading4": {"elements": [{"text_run": {"content": f"1月{day}日", "text_element_style": {}}}], "style": {}}},
        {"block_type": 19, "callout": {"emoji_id": "sunrise", "background_color": 2, "border_color": 2, "elements": [{"text_run": {"content": "[执行]", "text_element_style": {"bold": True, "text_color": 7}}}]}},
        {"block_type": 24, "grid": {"column_size": 2}}
    ]
    
    result = api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', token, {"children": day_blocks, "index": idx + 1})
    if result.get('code') != 0:
        print(f"❌ 1月{day}日 框架失败")
        return False
    
    grid_id = result['data']['children'][2]['block_id']
    time.sleep(0.5)
    
    blocks = get_all_blocks(doc_id, token)
    cols = [b['block_id'] for b in blocks if b.get('parent_id') == grid_id and b.get('block_type') == 25]
    if len(cols) < 2:
        return False
    
    left_content = build_quadrant_content("重要紧急", data.get("重要紧急", []))
    left_content.extend(build_quadrant_content("不重要紧急", data.get("不重要紧急", [])))
    api('POST', f'/docx/v1/documents/{doc_id}/blocks/{cols[0]}/children', token, {"children": left_content})
    
    right_content = build_quadrant_content("重要不紧急", data.get("重要不紧急", []))
    right_content.extend(build_quadrant_content("不重要不紧急", data.get("不重要不紧急", [])))
    api('POST', f'/docx/v1/documents/{doc_id}/blocks/{cols[1]}/children', token, {"children": right_content})
    
    return True

def main():
    tokens = load_tokens()
    token = refresh_token(tokens) or tokens.get('access_token')
    if not token:
        print("❌ 未找到token")
        return
    
    print("🔄 Token已刷新\n")
    doc_id = CONFIG['DOC_ID']
    
    # 按日期从小到大写入（最新在最前）
    for day in sorted(JANUARY_WORK.keys()):
        if write_day(token, doc_id, day, JANUARY_WORK[day]):
            print(f"✅ 1月{day}日")
        time.sleep(0.5)
    
    print("\n🎉 完成!")
    print("🔗 https://cunkebao.feishu.cn/wiki/JZiiwxEjHiRxouk8hSPcqBn6nrd")

if __name__ == "__main__":
    main()
