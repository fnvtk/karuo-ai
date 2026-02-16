#!/usr/bin/env python3
"""
下载飞书知识库到本地目录
"""
import json
import urllib.request
import os
import time
import re

# 配置
TOKEN_FILE = '/Users/karuo/Documents/开发/4、小工具/飞书工具箱/backend/.feishu_tokens.json'
OUTPUT_DIR = '/Users/karuo/Documents/个人/2、我写的日记'
SPACE_ID = '7394841112965447684'
ROOT_NODE = 'QPyPwwUmtiweUOk6aTmcZLBxnIg'

# 读取token
with open(TOKEN_FILE) as f:
    tokens = json.load(f)
USER_TOKEN = tokens.get('access_token')

def api_request(method, endpoint, data=None):
    """API请求"""
    url = f"https://open.feishu.cn/open-apis{endpoint}"
    if data:
        data = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Authorization', f'Bearer {USER_TOKEN}')
    req.add_header('Content-Type', 'application/json')
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return {'code': -1, 'msg': str(e)}

def get_child_nodes(parent_node_token):
    """获取子节点列表"""
    result = api_request('GET', f'/wiki/v2/spaces/{SPACE_ID}/nodes?parent_node_token={parent_node_token}&page_size=50')
    if result and result.get('code') == 0:
        return result.get('data', {}).get('items', [])
    return []

def get_doc_content(obj_token, obj_type='docx'):
    """获取文档内容"""
    if obj_type == 'docx':
        result = api_request('GET', f'/docx/v1/documents/{obj_token}/raw_content')
    elif obj_type == 'doc':
        result = api_request('GET', f'/doc/v2/{obj_token}/raw_content')
    else:
        result = api_request('GET', f'/docx/v1/documents/{obj_token}/raw_content')
    
    if result and result.get('code') == 0:
        return result.get('data', {}).get('content', '')
    return None

def safe_filename(name):
    """生成安全的文件名"""
    # 移除或替换不安全字符
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    name = name.strip()
    if not name:
        name = 'untitled'
    return name[:100]  # 限制长度

def download_node(node, parent_dir, depth=0):
    """递归下载节点"""
    title = node.get('title', 'untitled')
    node_token = node.get('node_token')
    obj_token = node.get('obj_token')
    obj_type = node.get('obj_type', 'docx')
    has_child = node.get('has_child', False)
    
    indent = '  ' * depth
    safe_title = safe_filename(title)
    
    if has_child:
        # 这是一个目录
        dir_path = os.path.join(parent_dir, safe_title)
        os.makedirs(dir_path, exist_ok=True)
        print(f"{indent}📁 {title}/")
        
        # 获取并下载子节点
        children = get_child_nodes(node_token)
        for child in children:
            download_node(child, dir_path, depth + 1)
            time.sleep(0.2)  # 避免请求过快
    else:
        # 这是一个文档
        file_path = os.path.join(parent_dir, f"{safe_title}.md")
        print(f"{indent}📄 {title}")
        
        # 获取文档内容
        content = get_doc_content(obj_token, obj_type)
        if content:
            # 添加标题
            full_content = f"# {title}\n\n{content}"
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(full_content)
            print(f"{indent}   ✅ 已保存")
        else:
            print(f"{indent}   ⚠️ 内容为空或获取失败")

def main():
    print("=" * 50)
    print("飞书知识库下载工具")
    print("=" * 50)
    print(f"知识库: 我写的日记")
    print(f"输出目录: {OUTPUT_DIR}")
    print("=" * 50)
    print()
    
    # 确保输出目录存在
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # 获取根节点的子节点
    print("开始下载...")
    print()
    
    children = get_child_nodes(ROOT_NODE)
    print(f"共找到 {len(children)} 个顶级节点")
    print()
    
    for child in children:
        download_node(child, OUTPUT_DIR, 0)
        time.sleep(0.3)
    
    print()
    print("=" * 50)
    print("✅ 下载完成!")
    print("=" * 50)

if __name__ == '__main__':
    main()
