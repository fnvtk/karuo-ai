"""
飞书知识库写入工具
用于向知识库页面追加内容块
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

TOKEN_FILE = os.path.join(os.path.dirname(__file__), '.feishu_tokens.json')

def load_tokens():
    """加载已保存的token"""
    try:
        if os.path.exists(TOKEN_FILE):
            with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except:
        pass
    return {}

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

def get_user_token():
    """获取用户token"""
    tokens = load_tokens()
    return tokens.get('access_token')

def get_wiki_node_info(space_id, node_token, token):
    """获取知识库节点信息"""
    url = f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes/{node_token}"
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(url, headers=headers, timeout=30)
    return response.json()

def create_document_block(document_id, block_id, children, token):
    """在文档中创建内容块"""
    url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{document_id}/blocks/{block_id}/children"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    response = requests.post(url, headers=headers, json={
        "children": children
    }, timeout=30)
    return response.json()

def get_document_blocks(document_id, token):
    """获取文档所有块"""
    url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{document_id}/blocks"
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(url, headers=headers, timeout=30)
    return response.json()

def build_task_blocks(date_str, tasks):
    """
    构建任务块
    tasks格式: [
        {
            "person": "卡若",
            "events": ["荷电", "玩值", "知己"],
            "quadrant": "重要紧急",
            "t_targets": ["荷电→招商 💰", "玩值→一页纸 📄"],
            "n_process": ["五行文档", "后台更新"],
            "t_thoughts": ["快速落地", "体系复制"],
            "w_work": ["云阿米巴", "分现钱"],
            "f_feedback": ["可招商 ✅", "完成 ✅"]
        }
    ]
    """
    blocks = []
    
    # 日期标题
    blocks.append({
        "block_type": 3,  # heading1
        "heading1": {
            "elements": [{
                "text_run": {
                    "content": f"{date_str}"
                }
            }]
        }
    })
    
    # 执行标签
    blocks.append({
        "block_type": 14,  # callout
        "callout": {
            "emoji_id": "🌅",
            "elements": [{
                "text_run": {
                    "content": "[执行]"
                }
            }]
        }
    })
    
    for task in tasks:
        # 象限标题
        blocks.append({
            "block_type": 2,  # text
            "text": {
                "elements": [{
                    "text_run": {
                        "content": f"[{task['quadrant']}]",
                        "text_element_style": {
                            "bold": True,
                            "text_color": 1  # 蓝色
                        }
                    }
                }]
            }
        })
        
        # 人物和事件
        events_str = "、".join(task['events'])
        blocks.append({
            "block_type": 2,
            "text": {
                "elements": [{
                    "text_run": {
                        "content": f"☐ {task['person']}（{events_str}）"
                    }
                }]
            }
        })
        
        # TNTWF内容
        blocks.append({
            "block_type": 2,
            "text": {
                "elements": [{
                    "text_run": {"content": "{"}
                }]
            }
        })
        
        # T - 目标
        if task.get('t_targets'):
            blocks.append({
                "block_type": 2,
                "text": {
                    "elements": [{
                        "text_run": {"content": "T"}
                    }]
                }
            })
            for item in task['t_targets']:
                blocks.append({
                    "block_type": 2,
                    "text": {
                        "elements": [{
                            "text_run": {"content": f"☐ {item}"}
                        }]
                    }
                })
        
        # N - 过程
        if task.get('n_process'):
            blocks.append({
                "block_type": 2,
                "text": {
                    "elements": [{
                        "text_run": {"content": "N"}
                    }]
                }
            })
            for item in task['n_process']:
                blocks.append({
                    "block_type": 2,
                    "text": {
                        "elements": [{
                            "text_run": {"content": f"☐ {item}"}
                        }]
                    }
                })
        
        # T - 双方想法
        if task.get('t_thoughts'):
            blocks.append({
                "block_type": 2,
                "text": {
                    "elements": [{
                        "text_run": {"content": "T"}
                    }]
                }
            })
            for item in task['t_thoughts']:
                blocks.append({
                    "block_type": 2,
                    "text": {
                        "elements": [{
                            "text_run": {"content": f"☐ {item}"}
                        }]
                    }
                })
        
        # W - 合作形式
        if task.get('w_work'):
            blocks.append({
                "block_type": 2,
                "text": {
                    "elements": [{
                        "text_run": {"content": "W"}
                    }]
                }
            })
            for item in task['w_work']:
                blocks.append({
                    "block_type": 2,
                    "text": {
                        "elements": [{
                            "text_run": {"content": f"☐ {item}"}
                        }]
                    }
                })
        
        # F - 反馈
        if task.get('f_feedback'):
            blocks.append({
                "block_type": 2,
                "text": {
                    "elements": [{
                        "text_run": {"content": "F"}
                    }]
                }
            })
            for item in task['f_feedback']:
                blocks.append({
                    "block_type": 2,
                    "text": {
                        "elements": [{
                            "text_run": {"content": f"☐ {item}"}
                        }]
                    }
                })
        
        blocks.append({
            "block_type": 2,
            "text": {
                "elements": [{
                    "text_run": {"content": "}"}
                }]
            }
        })
    
    return blocks

def write_to_wiki(wiki_url, date_str, tasks):
    """
    写入知识库
    wiki_url: 飞书知识库页面URL
    date_str: 日期字符串，如 "1月25日"
    tasks: 任务列表
    """
    token = get_user_token()
    if not token:
        print("❌ 未登录，请先运行 feishu_api.py 并完成授权")
        return False
    
    # 解析URL获取space_id和node_token
    # URL格式: https://xxx.feishu.cn/wiki/JZiiwxEjHiRxouk8hSPcqBn6nrd
    parts = wiki_url.rstrip('/').split('/')
    node_token = parts[-1]
    
    # 获取节点信息
    # 需要先获取space_id
    # 使用搜索或直接调用文档API
    
    print(f"📝 准备写入: {date_str}")
    print(f"📄 目标节点: {node_token}")
    
    # 构建内容块
    blocks = build_task_blocks(date_str, tasks)
    
    # 尝试直接写入文档
    # 飞书知识库节点的obj_token就是文档token
    result = create_document_block(node_token, node_token, blocks, token)
    
    if result.get('code') == 0:
        print("✅ 写入成功!")
        return True
    else:
        print(f"⚠️ 写入失败: {result}")
        # 返回构建的内容供手动复制
        return blocks

# 测试
if __name__ == "__main__":
    # 示例：今天的任务
    today_tasks = [
        {
            "person": "卡若",
            "events": ["荷电", "玩值", "知己"],
            "quadrant": "重要紧急",
            "t_targets": ["荷电→招商 💰", "玩值→一页纸 📄", "知己→可视化 ✅"],
            "n_process": ["五行文档", "后台更新"],
            "t_thoughts": ["快速落地", "体系复制"],
            "w_work": ["云阿米巴", "分现钱"],
            "f_feedback": ["可招商 ✅", "完成 ✅"]
        }
    ]
    
    wiki_url = "https://cunkebao.feishu.cn/wiki/JZiiwxEjHiRxouk8hSPcqBn6nrd"
    
    result = write_to_wiki(wiki_url, "1月25日", today_tasks)
    print(result)
