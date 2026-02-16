"""
卡若日记发布工具
功能：保存到本地目录 + 上传到飞书知识库
作者：卡火
"""
import os
import sys
import json
import requests
from datetime import datetime

# ============== 配置 ==============

CONFIG = {
    # 飞书应用凭证
    'APP_ID': 'cli_a48818290ef8100d',
    'APP_SECRET': 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4',
    
    # 本地日记目录
    'LOCAL_DIARY_DIR': '/Users/karuo/Documents/个人/2、我写的日记',
    
    # 飞书知识库配置
    'WIKI_SPACES': {
        '金融': {
            'space_id': '',  # 需要从飞书获取
            'parent_node_token': 'CRIfwEUyniGMSRkqFohc8x2inLX'  # 用户提供的节点
        },
        '私域干货': {
            'space_id': '',
            'parent_node_token': ''
        },
        '个人分享': {
            'space_id': '',
            'parent_node_token': ''
        }
    }
}

# Token缓存
TOKEN_FILE = os.path.join(os.path.dirname(__file__), '.feishu_tokens.json')
USER_TOKENS = {}

# ============== Token管理 ==============

def load_tokens():
    """加载保存的Token"""
    global USER_TOKENS
    try:
        if os.path.exists(TOKEN_FILE):
            with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
                USER_TOKENS = json.load(f)
                print(f"✅ 已加载飞书登录状态: {USER_TOKENS.get('name', '未知')}")
                return True
    except Exception as e:
        print(f"⚠️ 加载tokens失败: {e}")
    return False

def save_tokens():
    """保存Token"""
    try:
        with open(TOKEN_FILE, 'w', encoding='utf-8') as f:
            json.dump(USER_TOKENS, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"⚠️ 保存tokens失败: {e}")

def get_app_access_token():
    """获取应用Token"""
    url = "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal/"
    try:
        response = requests.post(url, json={
            "app_id": CONFIG['APP_ID'],
            "app_secret": CONFIG['APP_SECRET']
        }, timeout=10)
        data = response.json()
        if data.get('code') == 0:
            return data.get('app_access_token')
    except Exception as e:
        print(f"获取app_token失败: {e}")
    return None

def refresh_token():
    """刷新用户Token"""
    refresh = USER_TOKENS.get('refresh_token')
    if not refresh:
        return False
    
    app_token = get_app_access_token()
    if not app_token:
        return False
    
    try:
        response = requests.post(
            "https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token",
            headers={"Authorization": f"Bearer {app_token}", "Content-Type": "application/json"},
            json={"grant_type": "refresh_token", "refresh_token": refresh},
            timeout=10
        )
        result = response.json()
        if result.get('code') == 0:
            data = result.get('data', {})
            USER_TOKENS['access_token'] = data.get('access_token')
            USER_TOKENS['refresh_token'] = data.get('refresh_token')
            save_tokens()
            return True
    except:
        pass
    return False

def get_token():
    """获取可用的用户Token"""
    token = USER_TOKENS.get('access_token')
    if not token and USER_TOKENS.get('refresh_token'):
        if refresh_token():
            token = USER_TOKENS.get('access_token')
    return token

# ============== 飞书API ==============

def api_get(endpoint, params=None):
    """GET请求"""
    token = get_token()
    if not token:
        return {'code': -1, 'msg': '未授权，请先运行飞书工具箱授权'}
    
    try:
        response = requests.get(
            f'https://open.feishu.cn/open-apis{endpoint}',
            headers={'Authorization': f'Bearer {token}'},
            params=params, timeout=30
        )
        result = response.json()
        if result.get('code') == 99991663 and refresh_token():
            response = requests.get(
                f'https://open.feishu.cn/open-apis{endpoint}',
                headers={'Authorization': f'Bearer {get_token()}'},
                params=params, timeout=30
            )
            result = response.json()
        return result
    except Exception as e:
        return {'code': -1, 'msg': str(e)}

def api_post(endpoint, data=None):
    """POST请求"""
    token = get_token()
    if not token:
        return {'code': -1, 'msg': '未授权，请先运行飞书工具箱授权'}
    
    try:
        response = requests.post(
            f'https://open.feishu.cn/open-apis{endpoint}',
            headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
            json=data, timeout=30
        )
        result = response.json()
        if result.get('code') == 99991663 and refresh_token():
            response = requests.post(
                f'https://open.feishu.cn/open-apis{endpoint}',
                headers={'Authorization': f'Bearer {get_token()}', 'Content-Type': 'application/json'},
                json=data, timeout=30
            )
            result = response.json()
        return result
    except Exception as e:
        return {'code': -1, 'msg': str(e)}

# ============== 知识库操作 ==============

def get_wiki_spaces():
    """获取所有知识库"""
    result = api_get('/wiki/v2/spaces', {'page_size': 50})
    if result.get('code') == 0:
        spaces = result.get('data', {}).get('items', [])
        return spaces
    return []

def get_space_id_by_node(node_token):
    """通过节点token获取space_id"""
    # 尝试从节点信息反查space_id
    # 飞书API: GET /wiki/v2/spaces/get_node
    result = api_get('/wiki/v2/spaces/get_node', {'token': node_token})
    if result.get('code') == 0:
        node = result.get('data', {}).get('node', {})
        return node.get('space_id')
    return None

def create_wiki_node(space_id, parent_node_token, title, content):
    """在知识库中创建新节点（文档）"""
    # 1. 先创建一个空文档
    result = api_post(f'/wiki/v2/spaces/{space_id}/nodes', {
        'obj_type': 'docx',
        'parent_node_token': parent_node_token,
        'node_type': 'origin',
        'title': title
    })
    
    if result.get('code') != 0:
        return {'success': False, 'msg': f"创建节点失败: {result.get('msg')}"}
    
    node = result.get('data', {}).get('node', {})
    obj_token = node.get('obj_token')
    node_token = node.get('node_token')
    
    if not obj_token:
        return {'success': False, 'msg': '获取文档token失败'}
    
    # 2. 更新文档内容
    # 将Markdown转换为飞书文档格式（简化版，仅支持文本）
    blocks = markdown_to_blocks(content)
    
    # 使用文档API写入内容
    update_result = api_post(f'/docx/v1/documents/{obj_token}/blocks/batch_update', {
        'requests': blocks
    })
    
    return {
        'success': True,
        'node_token': node_token,
        'obj_token': obj_token,
        'url': f"https://cunkebao.feishu.cn/wiki/{node_token}"
    }

def markdown_to_blocks(content):
    """将Markdown内容转换为飞书文档块（简化版）"""
    # 简化处理：直接作为文本块插入
    # 实际使用时可以解析Markdown格式
    blocks = []
    lines = content.split('\n')
    
    for line in lines:
        if line.strip():
            # 处理标题
            if line.startswith('# '):
                blocks.append({
                    'block_type': 1,  # heading1
                    'heading1': {
                        'elements': [{'text_run': {'content': line[2:]}}]
                    }
                })
            elif line.startswith('## '):
                blocks.append({
                    'block_type': 2,  # heading2
                    'heading2': {
                        'elements': [{'text_run': {'content': line[3:]}}]
                    }
                })
            elif line.startswith('### '):
                blocks.append({
                    'block_type': 3,  # heading3
                    'heading3': {
                        'elements': [{'text_run': {'content': line[4:]}}]
                    }
                })
            elif line.startswith('---'):
                blocks.append({
                    'block_type': 22  # divider
                })
            elif line.startswith('**') and line.endswith('**'):
                # 粗体文本
                blocks.append({
                    'block_type': 2,  # text
                    'text': {
                        'elements': [{
                            'text_run': {
                                'content': line.strip('*'),
                                'text_element_style': {'bold': True}
                            }
                        }]
                    }
                })
            else:
                # 普通段落
                blocks.append({
                    'block_type': 2,  # text
                    'text': {
                        'elements': [{'text_run': {'content': line}}]
                    }
                })
    
    return blocks

# ============== 本地保存 ==============

def save_to_local(content, category, title):
    """保存到本地目录"""
    # 构建目录路径
    if category:
        dir_path = os.path.join(CONFIG['LOCAL_DIARY_DIR'], category)
    else:
        dir_path = CONFIG['LOCAL_DIARY_DIR']
    
    # 确保目录存在
    os.makedirs(dir_path, exist_ok=True)
    
    # 清理文件名
    safe_title = "".join(c for c in title if c.isalnum() or c in ' _-——：：中文日记卡若').strip()
    if not safe_title:
        safe_title = f"日记_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    file_path = os.path.join(dir_path, f"{safe_title}.md")
    
    # 写入文件
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return file_path

# ============== 主函数 ==============

def publish_diary(content, title, category='金融', upload_feishu=True):
    """
    发布日记
    
    参数:
        content: 日记内容（Markdown格式）
        title: 文章标题
        category: 分类目录（金融/私域干货/个人分享等）
        upload_feishu: 是否上传到飞书
    
    返回:
        {
            'local_path': '本地保存路径',
            'feishu_url': '飞书链接（如果上传成功）',
            'success': True/False
        }
    """
    result = {
        'local_path': None,
        'feishu_url': None,
        'success': False
    }
    
    # 1. 保存到本地
    print(f"📝 保存到本地...")
    try:
        local_path = save_to_local(content, category, title)
        result['local_path'] = local_path
        print(f"✅ 本地保存成功: {local_path}")
    except Exception as e:
        print(f"❌ 本地保存失败: {e}")
        return result
    
    # 2. 上传到飞书
    if upload_feishu:
        print(f"☁️ 上传到飞书知识库...")
        
        # 加载Token
        if not load_tokens():
            print("⚠️ 未找到飞书登录状态，请先运行飞书工具箱授权")
            print("   运行: python /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/飞书管理/scripts/feishu_api.py")
            result['success'] = True  # 本地保存成功即算成功
            return result
        
        # 获取知识库配置
        wiki_config = CONFIG['WIKI_SPACES'].get(category, {})
        parent_node = wiki_config.get('parent_node_token')
        
        if not parent_node:
            # 使用默认的金融节点
            parent_node = 'CRIfwEUyniGMSRkqFohc8x2inLX'
        
        # 获取space_id
        space_id = get_space_id_by_node(parent_node)
        
        if space_id:
            feishu_result = create_wiki_node(space_id, parent_node, title, content)
            if feishu_result.get('success'):
                result['feishu_url'] = feishu_result.get('url')
                print(f"✅ 飞书上传成功: {result['feishu_url']}")
            else:
                print(f"⚠️ 飞书上传失败: {feishu_result.get('msg')}")
        else:
            print("⚠️ 无法获取知识库ID，跳过飞书上传")
    
    result['success'] = True
    return result

# ============== 命令行入口 ==============

if __name__ == '__main__':
    # 示例用法
    if len(sys.argv) < 2:
        print("""
卡若日记发布工具

用法:
    python publish_diary.py <markdown文件路径> [分类]

示例:
    python publish_diary.py ~/日记.md 金融
    python publish_diary.py ~/日记.md 私域干货

分类选项:
    - 金融
    - 私域干货
    - 个人分享
    - 电竞
    - 美业
        """)
        sys.exit(0)
    
    file_path = sys.argv[1]
    category = sys.argv[2] if len(sys.argv) > 2 else '金融'
    
    # 读取文件
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
    
    # 发布
    result = publish_diary(content, title, category)
    
    print("\n" + "=" * 50)
    print("发布结果:")
    print(f"  本地路径: {result['local_path']}")
    print(f"  飞书链接: {result['feishu_url'] or '未上传'}")
    print("=" * 50)
