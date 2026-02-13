#!/usr/bin/env python3
"""
从飞书下载PART4内容
"""
import os
import sys
import json
import re

# 飞书应用凭证
APP_ID = 'cli_a48818290ef8100d'
APP_SECRET = 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4'

TOKEN_FILE = os.path.join(os.path.dirname(__file__), '.feishu_tokens.json')

def load_tokens():
    """加载token"""
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def get_app_token():
    """获取应用token"""
    try:
        import urllib.request
        import urllib.parse
        
        url = "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal/"
        data = json.dumps({
            "app_id": APP_ID,
            "app_secret": APP_SECRET
        }).encode('utf-8')
        
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
        response = urllib.request.urlopen(req, timeout=10)
        result = json.loads(response.read().decode('utf-8'))
        
        if result.get('code') == 0:
            return result.get('app_access_token')
    except Exception as e:
        print(f"获取app_token失败: {e}")
    return None

def refresh_user_token(refresh_token):
    """刷新用户token"""
    app_token = get_app_token()
    if not app_token:
        return None
    
    try:
        import urllib.request
        
        url = "https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token"
        data = json.dumps({
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }).encode('utf-8')
        
        req = urllib.request.Request(
            url, 
            data=data, 
            headers={
                'Authorization': f'Bearer {app_token}',
                'Content-Type': 'application/json'
            }
        )
        response = urllib.request.urlopen(req, timeout=10)
        result = json.loads(response.read().decode('utf-8'))
        
        if result.get('code') == 0:
            return result.get('data', {}).get('access_token')
    except Exception as e:
        print(f"刷新token失败: {e}")
    return None

def get_user_token():
    """获取用户token"""
    tokens = load_tokens()
    access_token = tokens.get('access_token')
    refresh_token_val = tokens.get('refresh_token')
    
    if access_token:
        return access_token
    
    if refresh_token_val:
        new_token = refresh_user_token(refresh_token_val)
        if new_token:
            tokens['access_token'] = new_token
            with open(TOKEN_FILE, 'w', encoding='utf-8') as f:
                json.dump(tokens, f, ensure_ascii=False, indent=2)
            return new_token
    
    print("❌ 未找到token，请先运行飞书工具箱授权")
    return None

def get_wiki_blocks_direct(doc_token):
    """直接使用文档token获取文档块"""
    token = get_user_token()
    if not token:
        return None
    
    import urllib.request
    import urllib.error
    
    # 获取文档块
    url = f'https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks?page_size=100'
    
    def make_request(access_token):
        """发起请求"""
        req = urllib.request.Request(
            url,
            headers={'Authorization': f'Bearer {access_token}'}
        )
        try:
            response = urllib.request.urlopen(req, timeout=30)
            return json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code == 401:
                error_body = e.read().decode('utf-8')
                try:
                    error_data = json.loads(error_body)
                    return error_data
                except:
                    return {'code': 99991677, 'msg': 'Unauthorized'}
            raise
    
    # 第一次请求
    result = make_request(token)
    
    # 如果token过期，尝试刷新
    if result.get('code') in [99991663, 99991677]:
        tokens = load_tokens()
        new_token = refresh_user_token(tokens.get('refresh_token'))
        if new_token:
            tokens['access_token'] = new_token
            with open(TOKEN_FILE, 'w', encoding='utf-8') as f:
                json.dump(tokens, f, ensure_ascii=False, indent=2)
            result = make_request(new_token)
        else:
            return None
    
    if result.get('code') == 0:
        return result.get('data', {}).get('items', [])
    else:
        return None

def get_wiki_blocks(node_token):
    """获取文档块"""
    token = get_user_token()
    if not token:
        return None
    
    import urllib.request
    import urllib.error
    
    # 先尝试获取wiki节点信息
    wiki_url = f'https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={node_token}'
    
    def make_wiki_request(access_token, endpoint):
        """发起wiki请求"""
        req = urllib.request.Request(
            endpoint,
            headers={'Authorization': f'Bearer {access_token}'}
        )
        try:
            response = urllib.request.urlopen(req, timeout=30)
            return json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code == 401:
                error_body = e.read().decode('utf-8')
                try:
                    error_data = json.loads(error_body)
                    return error_data
                except:
                    return {'code': 99991677, 'msg': 'Unauthorized'}
            raise
    
    # 获取wiki节点信息
    wiki_result = make_wiki_request(token, wiki_url)
    
    # 如果token过期，刷新
    if wiki_result.get('code') in [99991663, 99991677]:
        print("🔄 Token过期，尝试刷新...")
        tokens = load_tokens()
        new_token = refresh_user_token(tokens.get('refresh_token'))
        if new_token:
            tokens['access_token'] = new_token
            with open(TOKEN_FILE, 'w', encoding='utf-8') as f:
                json.dump(tokens, f, ensure_ascii=False, indent=2)
            token = new_token
            wiki_result = make_wiki_request(token, wiki_url)
    
    # 获取文档token
    doc_token = node_token
    if wiki_result.get('code') == 0:
        node_data = wiki_result.get('data', {}).get('node', {})
        if node_data.get('obj_type') == 'doc':
            doc_token = node_data.get('obj_token', node_token)
    
    # 获取文档块（page_size最大500，但先尝试100）
    url = f'https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks?page_size=100'
    
    def make_request(access_token):
        """发起请求"""
        req = urllib.request.Request(
            url,
            headers={'Authorization': f'Bearer {access_token}'}
        )
        try:
            response = urllib.request.urlopen(req, timeout=30)
            return json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code == 401:
                # 读取错误响应
                error_body = e.read().decode('utf-8')
                try:
                    error_data = json.loads(error_body)
                    return error_data
                except:
                    return {'code': 99991663, 'msg': 'Unauthorized'}
            raise
    
    # 第一次请求
    result = make_request(token)
    
    # 如果token过期，尝试刷新（99991663或99991677都表示token过期）
    if result.get('code') in [99991663, 99991677]:
        print("🔄 Token过期，尝试刷新...")
        tokens = load_tokens()
        new_token = refresh_user_token(tokens.get('refresh_token'))
        if new_token:
            tokens['access_token'] = new_token
            with open(TOKEN_FILE, 'w', encoding='utf-8') as f:
                json.dump(tokens, f, ensure_ascii=False, indent=2)
            
            print("✅ Token刷新成功，重试请求...")
            # 重试请求
            result = make_request(new_token)
        else:
            print("❌ Token刷新失败，请重新授权")
            print("💡 运行: cd /Users/karuo/Documents/开发/4、小工具/飞书工具箱/backend && python3 app.py")
            return None
    
    if result.get('code') == 0:
        return result.get('data', {}).get('items', [])
    else:
        print(f"❌ 获取文档失败: {result.get('msg')} (code: {result.get('code')})")
        if result.get('code') == 99991663:
            print("💡 请运行飞书工具箱重新授权")
    
    return None

def extract_text(elements):
    """提取文本"""
    text_parts = []
    for elem in elements:
        if 'text_run' in elem:
            content = elem['text_run'].get('content', '')
            style = elem['text_run'].get('text_element_style', {})
            
            if style.get('bold'):
                content = f"**{content}**"
            if style.get('italic'):
                content = f"*{content}*"
            
            text_parts.append(content)
    return ''.join(text_parts)

def blocks_to_markdown(blocks):
    """转换为Markdown"""
    markdown = []
    
    if not isinstance(blocks, list):
        return markdown
    
    for block in blocks:
        if not isinstance(block, dict):
            continue
        
        block_type = block.get('block_type')
        
        if block_type == 3:  # heading1
            text = extract_text(block.get('heading1', {}).get('elements', []))
            markdown.append(f"# {text}\n\n")
        elif block_type == 4:  # heading2
            text = extract_text(block.get('heading2', {}).get('elements', []))
            markdown.append(f"## {text}\n\n")
        elif block_type == 5:  # heading3
            text = extract_text(block.get('heading3', {}).get('elements', []))
            markdown.append(f"### {text}\n\n")
        elif block_type == 6:  # heading4
            text = extract_text(block.get('heading4', {}).get('elements', []))
            markdown.append(f"#### {text}\n\n")
        elif block_type == 2:  # text
            text = extract_text(block.get('text', {}).get('elements', []))
            if text.strip():
                markdown.append(f"{text}\n\n")
        elif block_type == 7:  # bullet
            text = extract_text(block.get('bullet', {}).get('elements', []))
            markdown.append(f"- {text}\n")
        elif block_type == 8:  # ordered
            text = extract_text(block.get('ordered', {}).get('elements', []))
            markdown.append(f"1. {text}\n")
        elif block_type == 11:  # quote
            text = extract_text(block.get('quote', {}).get('elements', []))
            markdown.append(f"> {text}\n\n")
        elif block_type == 17:  # todo
            todo = block.get('todo', {})
            text = extract_text(todo.get('elements', []))
            checked = "x" if todo.get('style', {}).get('done') else " "
            markdown.append(f"- [{checked}] {text}\n")
        elif block_type == 19:  # callout
            callout = block.get('callout', {})
            text = extract_text(callout.get('elements', []))
            markdown.append(f"> 💡 {text}\n\n")
        elif block_type == 27:  # divider
            markdown.append("---\n\n")
        
        # 递归处理子块
        children = block.get('children', [])
        if children and isinstance(children, list):
            child_md = blocks_to_markdown(children)
            markdown.extend(child_md)
    
    return markdown

def get_wiki_node_info(node_token):
    """获取wiki节点信息"""
    token = get_user_token()
    if not token:
        return None
    
    import urllib.request
    import urllib.error
    
    wiki_url = f'https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={node_token}'
    req = urllib.request.Request(
        wiki_url,
        headers={'Authorization': f'Bearer {token}'}
    )
    try:
        response = urllib.request.urlopen(req, timeout=30)
        result = json.loads(response.read().decode('utf-8'))
        if result.get('code') == 0:
            return result.get('data', {}).get('node', {})
    except Exception as e:
        print(f"获取节点信息失败: {e}")
    
    return None

def get_wiki_children(node_token):
    """获取wiki子节点"""
    token = get_user_token()
    if not token:
        return []
    
    import urllib.request
    import urllib.error
    
    # 先获取节点信息，获取space_id
    node_info = get_wiki_node_info(node_token)
    if not node_info:
        print("❌ 无法获取节点信息")
        return []
    
    space_id = node_info.get('space_id')
    if not space_id:
        print("❌ 无法获取space_id")
        return []
    
    print(f"📂 Space ID: {space_id}")
    
    # 获取子节点列表（page_size最大50）
    children_url = f'https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes?parent_node_token={node_token}&page_size=50'
    req = urllib.request.Request(
        children_url,
        headers={'Authorization': f'Bearer {token}'}
    )
    
    try:
        response = urllib.request.urlopen(req, timeout=30)
        result = json.loads(response.read().decode('utf-8'))
        
        if result.get('code') == 0:
            items = result.get('data', {}).get('items', [])
            print(f"✅ 找到 {len(items)} 个子节点")
            return items
        else:
            print(f"❌ 获取子节点失败: {result.get('msg')} (code: {result.get('code')})")
            # 打印调试信息
            print(f"   请求URL: {children_url}")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"❌ HTTP错误 {e.code}: {error_body[:200]}")
    except Exception as e:
        print(f"❌ 获取子节点失败: {e}")
    
    return []

def download_node(node_token, output_dir, depth=0, parent_title=""):
    """递归下载节点及其子节点"""
    indent = "  " * depth
    
    # 获取节点信息
    node_info = get_wiki_node_info(node_token)
    if not node_info:
        print(f"{indent}❌ 无法获取节点信息: {node_token}")
        return False
    
    node_title = node_info.get('title', '未命名')
    node_type = node_info.get('obj_type', '')
    obj_token = node_info.get('obj_token', node_token)
    
    print(f"{indent}📄 处理: {node_title} ({node_type})")
    
    # 下载当前节点内容
    if node_type == 'doc' or node_type == 'docx':
        # 直接使用obj_token获取文档块
        blocks = get_wiki_blocks_direct(obj_token)
        if blocks:
            markdown_lines = blocks_to_markdown(blocks)
            content = ''.join(markdown_lines)
            
            # 清理文件名
            safe_title = "".join(c for c in node_title if c.isalnum() or c in ' ._-中文')
            if not safe_title:
                safe_title = f"未命名_{node_token[:8]}"
            
            # 如果文件名已存在，添加序号
            file_path = os.path.join(output_dir, f"{safe_title}.md")
            counter = 1
            while os.path.exists(file_path):
                file_path = os.path.join(output_dir, f"{safe_title}_{counter}.md")
                counter += 1
            
            # 即使内容为空也保存（至少保存标题）
            if not content.strip():
                content = f"# {node_title}\n\n*（内容为空或无法解析）*"
            else:
                content = f"# {node_title}\n\n{content}"
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"{indent}  ✅ 已保存: {os.path.basename(file_path)} ({len(content)} 字符)")
        else:
            print(f"{indent}  ⚠️ 无法获取文档块")
    
    # 递归下载子节点
    children = get_wiki_children(node_token)
    if children:
        print(f"{indent}📚 找到 {len(children)} 个子节点")
        for child in children:
            child_token = child.get('node_token')
            if child_token:
                download_node(child_token, output_dir, depth + 1, node_title)
    
    return True

def download_part4():
    """下载PART4"""
    root_token = "V6y7wurMGi3wTmkDcOicffHDn1c"
    
    print(f"📥 开始查找PART4节点...")
    print(f"🔗 Root Token: {root_token}\n")
    
    # 先找到PART4子节点
    children = get_wiki_children(root_token)
    part4_node = None
    
    for child in children:
        title = child.get('title', '')
        if 'PART 4' in title or 'PART4' in title or '正在做的事情' in title:
            part4_node = child
            print(f"✅ 找到PART4节点: {title}")
            break
    
    if not part4_node:
        print("❌ 未找到PART4节点")
        return False
    
    part4_token = part4_node.get('node_token')
    part4_title = part4_node.get('title', 'PART4')
    
    print(f"📥 开始下载: {part4_title}")
    print(f"🔗 Node Token: {part4_token}\n")
    
    output_dir = "/Users/karuo/Documents/个人/2、我写的书/《卡若的IP财富旅程》/PART4"
    os.makedirs(output_dir, exist_ok=True)
    
    # 递归下载PART4及其所有子节点
    success = download_node(part4_token, output_dir)
    
    if success:
        print(f"\n✅ PART4下载完成！")
        print(f"📂 保存目录: {output_dir}")
        
        # 统计下载的文件
        import glob
        md_files = glob.glob(os.path.join(output_dir, "*.md"))
        print(f"📄 共下载 {len(md_files)} 个文件")
    else:
        print(f"\n❌ PART4下载失败")
    
    return success

if __name__ == '__main__':
    download_part4()
