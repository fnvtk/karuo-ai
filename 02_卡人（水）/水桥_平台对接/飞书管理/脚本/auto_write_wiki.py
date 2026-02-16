#!/usr/bin/env python3
"""
飞书知识库自动写入工具
自动使用已保存的token，无需手动授权
"""
import os
import json
import requests
from datetime import datetime

# 配置
CONFIG = {
    'APP_ID': 'cli_a48818290ef8100d',
    'APP_SECRET': 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4'
}

# Token文件路径（优先使用本地，否则使用飞书工具箱的）
TOKEN_PATHS = [
    os.path.join(os.path.dirname(__file__), '.feishu_tokens.json'),
    '/Users/karuo/Documents/开发/4、小工具/飞书工具箱/backend/.feishu_tokens.json'
]

def load_tokens():
    """加载token"""
    for path in TOKEN_PATHS:
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    tokens = json.load(f)
                    print(f"✅ 已加载token: {tokens.get('name', '未知')}")
                    return tokens
            except:
                continue
    return {}

def save_tokens(tokens):
    """保存token"""
    path = TOKEN_PATHS[0]
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(tokens, f, ensure_ascii=False, indent=2)

def get_app_access_token():
    """获取应用token"""
    url = "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal/"
    response = requests.post(url, json={
        "app_id": CONFIG['APP_ID'],
        "app_secret": CONFIG['APP_SECRET']
    }, timeout=10)
    data = response.json()
    if data.get('code') == 0:
        return data.get('app_access_token')
    return None

def refresh_user_token(tokens):
    """刷新用户token"""
    refresh = tokens.get('refresh_token')
    if not refresh:
        return None
    
    app_token = get_app_access_token()
    if not app_token:
        return None
    
    response = requests.post(
        "https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token",
        headers={"Authorization": f"Bearer {app_token}", "Content-Type": "application/json"},
        json={"grant_type": "refresh_token", "refresh_token": refresh},
        timeout=10
    )
    result = response.json()
    if result.get('code') == 0:
        data = result.get('data', {})
        tokens['access_token'] = data.get('access_token')
        tokens['refresh_token'] = data.get('refresh_token')
        save_tokens(tokens)
        print("✅ Token已刷新")
        return tokens['access_token']
    return None

def api_request(method, endpoint, token, data=None, params=None):
    """通用API请求"""
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    url = f'https://open.feishu.cn/open-apis{endpoint}'
    
    if method == 'GET':
        response = requests.get(url, headers=headers, params=params, timeout=30)
    else:
        response = requests.post(url, headers=headers, json=data, timeout=30)
    
    return response.json()

def get_wiki_node_info(space_id, node_token, token):
    """获取知识库节点信息"""
    return api_request('GET', f'/wiki/v2/spaces/{space_id}/nodes/{node_token}', token)

def get_document_info(document_id, token):
    """获取文档信息"""
    return api_request('GET', f'/docx/v1/documents/{document_id}', token)

def get_document_blocks(document_id, token):
    """获取文档块"""
    return api_request('GET', f'/docx/v1/documents/{document_id}/blocks', token)

def create_block(document_id, parent_id, children, token):
    """在指定位置创建内容块"""
    return api_request('POST', f'/docx/v1/documents/{document_id}/blocks/{parent_id}/children', token, {
        "children": children
    })

def build_today_task_blocks(date_str, tasks):
    """构建今日任务的内容块 - 使用简化的文本格式"""
    blocks = []
    
    # 日期标题 (heading2)
    blocks.append({
        "block_type": 4,  # heading2
        "heading2": {
            "style": {},
            "elements": [{
                "text_run": {
                    "content": date_str,
                    "text_element_style": {}
                }
            }]
        }
    })
    
    # 执行标签
    blocks.append({
        "block_type": 2,  # text
        "text": {
            "style": {},
            "elements": [{
                "text_run": {
                    "content": "🌅 [执行]",
                    "text_element_style": {}
                }
            }]
        }
    })
    
    for task in tasks:
        # 空行
        blocks.append({
            "block_type": 2,
            "text": {
                "style": {},
                "elements": [{
                    "text_run": {
                        "content": "",
                        "text_element_style": {}
                    }
                }]
            }
        })
        
        # 象限标题
        blocks.append({
            "block_type": 2,
            "text": {
                "style": {},
                "elements": [{
                    "text_run": {
                        "content": f"[{task['quadrant']}]",
                        "text_element_style": {"bold": True}
                    }
                }]
            }
        })
        
        # 人物和事件
        events_str = "、".join(task['events'])
        blocks.append({
            "block_type": 2,
            "text": {
                "style": {},
                "elements": [{
                    "text_run": {
                        "content": f"☐ {task['person']}（{events_str}）",
                        "text_element_style": {}
                    }
                }]
            }
        })
        
        # TNTWF开始
        blocks.append({
            "block_type": 2,
            "text": {
                "style": {},
                "elements": [{"text_run": {"content": "{", "text_element_style": {}}}]
            }
        })
        
        # T - 目标
        if task.get('t_targets'):
            blocks.append({
                "block_type": 2,
                "text": {
                    "style": {},
                    "elements": [{"text_run": {"content": "T", "text_element_style": {"bold": True}}}]
                }
            })
            for item in task['t_targets']:
                blocks.append({
                    "block_type": 2,
                    "text": {
                        "style": {},
                        "elements": [{"text_run": {"content": f"☐ {item}", "text_element_style": {}}}]
                    }
                })
        
        # N - 过程
        if task.get('n_process'):
            blocks.append({
                "block_type": 2,
                "text": {
                    "style": {},
                    "elements": [{"text_run": {"content": "N", "text_element_style": {"bold": True}}}]
                }
            })
            for item in task['n_process']:
                blocks.append({
                    "block_type": 2,
                    "text": {
                        "style": {},
                        "elements": [{"text_run": {"content": f"☐ {item}", "text_element_style": {}}}]
                    }
                })
        
        # T - 双方想法
        if task.get('t_thoughts'):
            blocks.append({
                "block_type": 2,
                "text": {
                    "style": {},
                    "elements": [{"text_run": {"content": "T", "text_element_style": {"bold": True}}}]
                }
            })
            for item in task['t_thoughts']:
                blocks.append({
                    "block_type": 2,
                    "text": {
                        "style": {},
                        "elements": [{"text_run": {"content": f"☐ {item}", "text_element_style": {}}}]
                    }
                })
        
        # W - 合作形式
        if task.get('w_work'):
            blocks.append({
                "block_type": 2,
                "text": {
                    "style": {},
                    "elements": [{"text_run": {"content": "W", "text_element_style": {"bold": True}}}]
                }
            })
            for item in task['w_work']:
                blocks.append({
                    "block_type": 2,
                    "text": {
                        "style": {},
                        "elements": [{"text_run": {"content": f"☐ {item}", "text_element_style": {}}}]
                    }
                })
        
        # F - 反馈
        if task.get('f_feedback'):
            blocks.append({
                "block_type": 2,
                "text": {
                    "style": {},
                    "elements": [{"text_run": {"content": "F", "text_element_style": {"bold": True}}}]
                }
            })
            for item in task['f_feedback']:
                blocks.append({
                    "block_type": 2,
                    "text": {
                        "style": {},
                        "elements": [{"text_run": {"content": f"☐ {item}", "text_element_style": {}}}]
                    }
                })
        
        # TNTWF结束
        blocks.append({
            "block_type": 2,
            "text": {
                "style": {},
                "elements": [{"text_run": {"content": "}", "text_element_style": {}}}]
            }
        })
    
    return blocks

def write_to_wiki(wiki_url, date_str, tasks):
    """写入知识库"""
    # 加载token
    tokens = load_tokens()
    if not tokens.get('access_token'):
        print("❌ 未找到token")
        return False
    
    # 先尝试刷新token
    print("🔄 刷新Token...")
    token = refresh_user_token(tokens)
    if not token:
        token = tokens['access_token']
        print("⚠️ Token刷新失败，使用现有token")
    
    # 解析URL获取node_token
    # URL格式: https://xxx.feishu.cn/wiki/JZiiwxEjHiRxouk8hSPcqBn6nrd
    parts = wiki_url.rstrip('/').split('/')
    node_token = parts[-1]
    
    print(f"📝 目标节点: {node_token}")
    
    # 首先尝试直接作为文档ID使用
    doc_info = get_document_info(node_token, token)
    
    if doc_info.get('code') == 99991663:
        # Token过期，尝试刷新
        print("🔄 Token过期，正在刷新...")
        token = refresh_user_token(tokens)
        if not token:
            print("❌ Token刷新失败")
            return False
        doc_info = get_document_info(node_token, token)
    
    # 如果直接获取失败，可能需要通过知识库API获取obj_token
    if doc_info.get('code') != 0:
        print(f"⚠️ 获取文档失败，尝试获取知识库节点...")
        
        # 尝试获取知识库列表找到space_id
        spaces_result = api_request('GET', '/wiki/v2/spaces', token, params={'page_size': 50})
        if spaces_result.get('code') == 0:
            spaces = spaces_result.get('data', {}).get('items', [])
            
            for space in spaces:
                space_id = space.get('space_id')
                node_info = get_wiki_node_info(space_id, node_token, token)
                if node_info.get('code') == 0:
                    node = node_info.get('data', {}).get('node', {})
                    document_id = node.get('obj_token')
                    print(f"✅ 找到文档: {document_id}")
                    break
            else:
                print("❌ 未找到对应的知识库节点")
                return False
        else:
            print(f"❌ 获取知识库列表失败: {spaces_result}")
            return False
    else:
        document_id = node_token
    
    # 获取文档块，找到插入位置
    blocks_result = get_document_blocks(document_id, token)
    if blocks_result.get('code') != 0:
        print(f"❌ 获取文档块失败: {blocks_result}")
        return False
    
    items = blocks_result.get('data', {}).get('items', [])
    if not items:
        print("❌ 文档为空")
        return False
    
    # 文档ID就是根块ID
    root_block_id = document_id
    
    # 构建内容块
    content_blocks = build_today_task_blocks(date_str, tasks)
    
    print(f"📝 准备写入 {len(content_blocks)} 个内容块...")
    
    # 在文档末尾追加内容
    result = create_block(document_id, root_block_id, content_blocks, token)
    
    if result.get('code') == 0:
        print("✅ 写入成功!")
        return True
    else:
        print(f"❌ 写入失败: {result}")
        return False

if __name__ == "__main__":
    # 今天的任务
    today_tasks = [
        {
            "person": "卡若",
            "events": ["荷电", "玩值", "知己"],
            "quadrant": "重要紧急",
            "t_targets": ["荷电→招商 💰", "玩值→一页纸 📄", "知己→可视化 ✅"],
            "n_process": ["五行文档12份", "后台10+页面"],
            "t_thoughts": ["何天全→快速落地", "卡若→体系复制"],
            "w_work": ["云阿米巴分润", "不占股分现钱"],
            "f_feedback": ["荷电可招商 ✅", "玩值一页纸 ✅"]
        },
        {
            "person": "卡火",
            "events": ["技能", "经验", "开发"],
            "quadrant": "重要不紧急",
            "t_targets": ["技能库→5个SKILL 📚"],
            "n_process": ["全栈开发SKILL更新", "商业工具集新建"],
            "t_thoughts": ["系统化沉淀", "可复用可检索"],
            "w_work": ["学习→整理→转化"],
            "f_feedback": ["SKILL更新 ✅", "经验已归档 ✅"]
        }
    ]
    
    wiki_url = "https://cunkebao.feishu.cn/wiki/JZiiwxEjHiRxouk8hSPcqBn6nrd"
    
    write_to_wiki(wiki_url, "1月25日", today_tasks)
