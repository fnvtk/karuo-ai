#!/usr/bin/env python3
"""
卡若日记 - 飞书上传工具
功能：
1. 检测同名文章，避免重复创建
2. 自动转换Markdown为飞书块格式
3. 批量上传，处理特殊字符
"""
import json
import urllib.request
import time
import os
import re
from datetime import datetime

# ============== 配置 ==============

CONFIG = {
    'APP_ID': 'cli_a48818290ef8100d',
    'APP_SECRET': 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4',
    'TOKEN_FILE': '/Users/karuo/Documents/开发/4、小工具/飞书工具箱/backend/.feishu_tokens.json',
    
    # 知识库配置
    'WIKI_SPACES': {
        '金融': {
            'space_id': '7394841112965447684',
            'parent_node': 'CRIfwEUyniGMSRkqFohc8x2inLX'
        },
        '私域干货': {
            'space_id': '',
            'parent_node': ''
        }
    },
    
    # 固定结尾链接
    'FOOTER_LINK': 'https://cunkebao.feishu.cn/wiki/JBwrwlZJziwjSzk3wojcRY6dndR#share-DqpudkhtqopKXDxcmhecjjtrnNc'
}

# ============== Token管理 ==============

def load_token():
    """加载用户Token"""
    try:
        with open(CONFIG['TOKEN_FILE']) as f:
            tokens = json.load(f)
            return tokens.get('access_token')
    except:
        return None

def api_request(method, endpoint, data=None):
    """发送API请求"""
    token = load_token()
    if not token:
        print("❌ 未找到Token，请先授权")
        return None
    
    url = f"https://open.feishu.cn/open-apis{endpoint}"
    
    if data:
        data = json.dumps(data).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Authorization', f'Bearer {token}')
    req.add_header('Content-Type', 'application/json')
    
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"API Error: {e}")
        return None

# ============== 知识库操作 ==============

def list_wiki_nodes(space_id, parent_node):
    """列出知识库下的所有文章"""
    result = api_request('GET', f'/wiki/v2/spaces/{space_id}/nodes?parent_node_token={parent_node}&page_size=50')
    if result and result.get('code') == 0:
        return result.get('data', {}).get('items', [])
    return []

def find_existing_article(space_id, parent_node, title):
    """查找同名文章"""
    articles = list_wiki_nodes(space_id, parent_node)
    for article in articles:
        if article.get('title') == title:
            return {
                'node_token': article.get('node_token'),
                'obj_token': article.get('obj_token')
            }
    return None

def create_wiki_node(space_id, parent_node, title):
    """创建新的知识库文档"""
    result = api_request('POST', f'/wiki/v2/spaces/{space_id}/nodes', {
        'obj_type': 'docx',
        'parent_node_token': parent_node,
        'node_type': 'origin',
        'title': title
    })
    
    if result and result.get('code') == 0:
        node = result.get('data', {}).get('node', {})
        return {
            'node_token': node.get('node_token'),
            'obj_token': node.get('obj_token')
        }
    return None

# ============== 内容转换 ==============

def markdown_to_blocks(content):
    """将Markdown内容转换为飞书块格式"""
    blocks = []
    lines = content.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # 分割线
        if line == '---':
            blocks.append({"block_type": 22, "divider": {}})
            continue
        
        # 检测粗体（**text**）
        bold = False
        if line.startswith('**') and line.endswith('**'):
            line = line[2:-2]
            bold = True
        elif '**' in line:
            # 部分粗体，简化处理：去掉**标记
            line = line.replace('**', '')
        
        # 去掉其他Markdown标记
        if line.startswith('# '):
            line = line[2:]  # 去掉标题标记
        elif line.startswith('## '):
            line = line[3:]
        elif line.startswith('### '):
            line = line[4:]
        
        # 创建文本块
        blocks.append({
            "block_type": 2,
            "text": {
                "style": {},
                "elements": [{
                    "text_run": {
                        "content": line,
                        "text_element_style": {"bold": bold}
                    }
                }]
            }
        })
    
    return blocks

def send_blocks(doc_token, blocks):
    """发送块到文档"""
    result = api_request('POST', f'/docx/v1/documents/{doc_token}/blocks/{doc_token}/children', {
        'children': blocks
    })
    return result and result.get('code') == 0

# ============== 主函数 ==============

def upload_article(content, title, category='金融'):
    """
    上传文章到飞书知识库
    
    参数:
        content: 文章内容（Markdown格式）
        title: 文章标题
        category: 分类（金融/私域干货等）
    
    返回:
        {'success': bool, 'url': str, 'message': str}
    """
    # 获取知识库配置
    wiki_config = CONFIG['WIKI_SPACES'].get(category, CONFIG['WIKI_SPACES']['金融'])
    space_id = wiki_config['space_id']
    parent_node = wiki_config['parent_node']
    
    if not space_id or not parent_node:
        return {'success': False, 'url': '', 'message': f'分类 {category} 未配置'}
    
    # 检查是否有同名文章
    print(f"🔍 检查是否有同名文章: {title}")
    existing = find_existing_article(space_id, parent_node, title)
    
    if existing:
        print(f"⚠️ 发现同名文章，将创建新版本")
        title = f"{title}（更新版）"
    
    # 创建新文档
    print(f"📝 创建文档: {title}")
    doc_info = create_wiki_node(space_id, parent_node, title)
    
    if not doc_info:
        return {'success': False, 'url': '', 'message': '创建文档失败'}
    
    doc_token = doc_info['obj_token']
    node_token = doc_info['node_token']
    
    # 添加固定结尾链接
    if CONFIG['FOOTER_LINK'] not in content:
        content = content.rstrip() + f"\n\n---\n\n{CONFIG['FOOTER_LINK']}"
    
    # 转换为飞书块格式
    blocks = markdown_to_blocks(content)
    
    # 分批上传
    print(f"📤 上传内容（共 {len(blocks)} 块）...")
    batch_size = 10
    success_count = 0
    
    for i in range(0, len(blocks), batch_size):
        batch = blocks[i:i+batch_size]
        if send_blocks(doc_token, batch):
            success_count += len(batch)
            print(f"  ✅ 已上传 {success_count}/{len(blocks)} 块")
        else:
            print(f"  ❌ 上传失败")
        time.sleep(0.3)
    
    url = f"https://cunkebao.feishu.cn/wiki/{node_token}"
    print(f"\n✅ 上传完成!")
    print(f"📄 飞书链接: {url}")
    
    return {'success': True, 'url': url, 'message': '上传成功'}

# ============== 命令行入口 ==============

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 2:
        print("""
卡若日记 - 飞书上传工具

用法:
    python upload_feishu.py <markdown文件路径> [分类]

示例:
    python upload_feishu.py ~/日记.md 金融
    python upload_feishu.py ~/日记.md 私域干货

特性:
    - 自动检测同名文章
    - 自动添加固定结尾链接
    - 批量上传，处理特殊字符
        """)
        sys.exit(0)
    
    file_path = sys.argv[1]
    category = sys.argv[2] if len(sys.argv) > 2 else '金融'
    
    if not os.path.exists(file_path):
        print(f"❌ 文件不存在: {file_path}")
        sys.exit(1)
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 从内容提取标题
    lines = content.split('\n')
    title = '卡若日记'
    for line in lines:
        if line.startswith('# '):
            title = line[2:].strip()
            break
    
    result = upload_article(content, title, category)
    
    if not result['success']:
        print(f"❌ {result['message']}")
        sys.exit(1)
