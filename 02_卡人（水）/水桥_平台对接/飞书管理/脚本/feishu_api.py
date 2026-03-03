"""
飞书工具箱 - 后端API服务 v2.0
作者: 卡若
更新: 2026-01-18
功能: Token持久化、文件夹递归下载、ZIP打包、批量导出
"""
import os
import io
import json
import zipfile
import requests
from datetime import datetime
from flask import Flask, jsonify, request, send_file, Response
from flask_cors import CORS
import urllib.parse
import time

app = Flask(__name__)
CORS(app, supports_credentials=True)

# 飞书应用凭证
CONFIG = {
    'APP_ID': 'cli_a48818290ef8100d',
    'APP_SECRET': 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4'
}

# Token存储
TOKEN_FILE = os.path.join(os.path.dirname(__file__), '.feishu_tokens.json')
USER_TOKENS = {}

# ============== Token持久化 ==============

def load_tokens():
    global USER_TOKENS
    try:
        if os.path.exists(TOKEN_FILE):
            with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
                USER_TOKENS = json.load(f)
                print(f"✅ 已加载登录状态: {USER_TOKENS.get('name', '未知')}")
    except Exception as e:
        print(f"⚠️ 加载tokens失败: {e}")

def save_tokens():
    try:
        with open(TOKEN_FILE, 'w', encoding='utf-8') as f:
            json.dump(USER_TOKENS, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"⚠️ 保存tokens失败: {e}")

def clear_tokens():
    global USER_TOKENS
    USER_TOKENS = {}
    if os.path.exists(TOKEN_FILE):
        os.remove(TOKEN_FILE)

# ============== Token获取 ==============

def get_app_access_token():
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

def get_user_token_by_code(code):
    app_token = get_app_access_token()
    if not app_token:
        return {'code': -1, 'msg': '获取app_token失败'}
    
    try:
        response = requests.post(
            "https://open.feishu.cn/open-apis/authen/v1/oidc/access_token",
            headers={"Authorization": f"Bearer {app_token}", "Content-Type": "application/json"},
            json={"grant_type": "authorization_code", "code": code},
            timeout=10
        )
        return response.json()
    except Exception as e:
        return {'code': -1, 'msg': f'请求失败: {e}'}

def refresh_token():
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
    token = USER_TOKENS.get('access_token')
    if not token and USER_TOKENS.get('refresh_token'):
        if refresh_token():
            token = USER_TOKENS.get('access_token')
    return token

# ============== API封装 ==============

def api_get(endpoint, params=None):
    token = get_token()
    if not token:
        return {'code': -1, 'msg': '未授权，请先登录'}
    
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
    token = get_token()
    if not token:
        return {'code': -1, 'msg': '未授权，请先登录'}
    
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

# ============== 路由 ==============

@app.route('/api/health')
def health():
    return jsonify({
        'status': 'ok',
        'version': '2.0.0',
        'has_user_token': bool(get_token()),
        'user_name': USER_TOKENS.get('name', ''),
        'timestamp': datetime.now().isoformat()
    })

# 用户授权 scope：含 wiki/docx/drive 与 多维表格 bitable:app、base:app:create（上传 JSON 创建多维表格用）
AUTH_SCOPE = "wiki:wiki+docx:document+drive:drive+bitable:app+base:app:create"

@app.route('/api/auth/url')
def auth_url():
    redirect_uri = request.args.get('redirect_uri', 'http://localhost:5050/api/auth/callback')
    url = f"https://open.feishu.cn/open-apis/authen/v1/index?redirect_uri={urllib.parse.quote(redirect_uri)}&app_id={CONFIG['APP_ID']}&scope={urllib.parse.quote(AUTH_SCOPE)}"
    return jsonify({
        'status': 'ok',
        'auth_url': url
    })

@app.route('/api/auth/callback')
def auth_callback():
    code = request.args.get('code')
    if not code:
        return '<h2>❌ 授权失败</h2><p>未获取到授权码</p>'
    
    result = get_user_token_by_code(code)
    if result.get('code') == 0:
        data = result.get('data', {})
        USER_TOKENS.update({
            'access_token': data.get('access_token'),
            'refresh_token': data.get('refresh_token'),
            'name': data.get('name', '飞书用户'),
            'auth_time': datetime.now().isoformat()
        })
        save_tokens()
        
        return f'''
        <html><head><style>
        body{{font-family:-apple-system,sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0}}
        .card{{background:#fff;padding:50px;border-radius:24px;text-align:center;box-shadow:0 25px 80px rgba(0,0,0,.25)}}
        h2{{color:#34C759;font-size:28px}}p{{color:#666;margin:15px 0}}
        .btn{{background:linear-gradient(135deg,#007AFF,#5856D6);color:#fff;border:none;padding:15px 40px;border-radius:12px;font-size:16px;cursor:pointer}}
        </style></head><body>
        <div class="card">
            <h2>✅ 授权成功</h2>
            <p>欢迎，{USER_TOKENS.get("name")}</p>
            <p style="color:#999;font-size:14px">登录状态已保存，下次无需重新授权</p>
            <button class="btn" onclick="window.close()">关闭窗口</button>
        </div>
        <script>window.opener&&window.opener.postMessage({{type:'feishu_auth_success',name:'{USER_TOKENS.get("name")}'}}, '*')</script>
        </body></html>
        '''
    return f'<h2>❌ 授权失败</h2><p>{result.get("msg")}</p>'

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    clear_tokens()
    return jsonify({'status': 'ok'})

@app.route('/api/token')
def token_status():
    return jsonify({
        'has_user_token': bool(get_token()),
        'user_name': USER_TOKENS.get('name', ''),
        'auth_time': USER_TOKENS.get('auth_time', '')
    })


@app.route('/api/token/sync', methods=['POST', 'GET'])
def token_sync():
    """将当前内存中的 Token 写入 .feishu_tokens.json，供 feishu_wiki_create_doc 等脚本使用"""
    if not USER_TOKENS.get('access_token') and not USER_TOKENS.get('refresh_token'):
        return jsonify({'status': 'fail', 'msg': '无可用 Token，请先完成授权'}), 400
    save_tokens()
    return jsonify({'status': 'ok', 'msg': '已同步到 .feishu_tokens.json'})


@app.route('/api/token/export')
def token_export():
    """供本地脚本使用：导出当前 Token 到同一目录 .feishu_tokens.json（仅 localhost）"""
    if not USER_TOKENS.get('access_token') and not USER_TOKENS.get('refresh_token'):
        return jsonify({'status': 'fail', 'msg': '无可用 Token'}), 404
    save_tokens()
    return jsonify({k: v for k, v in USER_TOKENS.items() if k in ('access_token', 'refresh_token', 'name', 'auth_time')})

# ============== 云盘 ==============

@app.route('/api/drive/files')
def drive_files():
    folder_token = request.args.get('folder_token')
    if not folder_token:
        root = api_get('/drive/explorer/v2/root_folder/meta')
        if root.get('code') == 0:
            folder_token = root.get('data', {}).get('token')
    
    result = api_get('/drive/v1/files', {
        'folder_token': folder_token,
        'page_size': 100
    } if folder_token else {'page_size': 100})
    return jsonify(result)

@app.route('/api/drive/folder/all', methods=['POST'])
def get_folder_all_files():
    """递归获取文件夹所有内容"""
    data = request.json or {}
    folder_token = data.get('folder_token')
    
    if not folder_token:
        return jsonify({'code': -1, 'msg': '缺少folder_token'})
    
    all_files = []
    
    def fetch_recursive(token, path=''):
        result = api_get('/drive/v1/files', {'folder_token': token, 'page_size': 100})
        if result.get('code') != 0:
            return
        
        files = result.get('data', {}).get('files', [])
        for f in files:
            f['path'] = path
            if f.get('type') == 'folder':
                fetch_recursive(f.get('token'), f"{path}{f.get('name', 'folder')}/")
            else:
                all_files.append(f)
    
    fetch_recursive(folder_token)
    return jsonify({'code': 0, 'data': {'files': all_files, 'count': len(all_files)}})

@app.route('/api/drive/download/zip', methods=['POST'])
def download_as_zip():
    """下载选中文件打包为ZIP"""
    data = request.json or {}
    items = data.get('items', [])
    zip_name = data.get('name', '飞书文档备份')
    
    if not items:
        return jsonify({'code': -1, 'msg': '没有要下载的文件'})
    
    # 创建内存中的ZIP
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for item in items:
            token = item.get('token')
            name = item.get('name', '未命名')
            doc_type = item.get('type', 'docx')
            path = item.get('path', '')
            
            # 获取文档内容
            content = get_doc_content(token, doc_type)
            if content:
                # 确保文件名安全
                safe_name = "".join(c for c in name if c.isalnum() or c in ' ._-中文')
                file_path = f"{path}{safe_name}.txt" if path else f"{safe_name}.txt"
                zf.writestr(file_path, content.encode('utf-8'))
    
    zip_buffer.seek(0)
    
    return send_file(
        zip_buffer,
        mimetype='application/zip',
        as_attachment=True,
        download_name=f'{zip_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.zip'
    )

def get_doc_content(token, doc_type):
    """获取文档内容"""
    if doc_type == 'docx':
        result = api_get(f'/docx/v1/documents/{token}/raw_content')
    elif doc_type == 'doc':
        result = api_get(f'/doc/v2/{token}/raw_content')
    elif doc_type == 'sheet':
        # 表格获取元信息
        result = api_get(f'/sheets/v2/spreadsheets/{token}/metainfo')
        if result.get('code') == 0:
            return json.dumps(result.get('data', {}), ensure_ascii=False, indent=2)
        return None
    else:
        result = api_get(f'/docx/v1/documents/{token}/raw_content')
    
    if result.get('code') == 0:
        return result.get('data', {}).get('content', '')
    return None

# ============== 知识库 ==============

@app.route('/api/wiki/spaces')
def wiki_spaces():
    return jsonify(api_get('/wiki/v2/spaces', {'page_size': 50}))

@app.route('/api/wiki/spaces/<space_id>/nodes')
def wiki_nodes(space_id):
    params = {'page_size': 50}
    parent = request.args.get('parent_node_token')
    if parent:
        params['parent_node_token'] = parent
    return jsonify(api_get(f'/wiki/v2/spaces/{space_id}/nodes', params))

@app.route('/api/wiki/node/<space_id>/<node_token>')
def wiki_node_info(space_id, node_token):
    """获取知识库节点详情"""
    return jsonify(api_get(f'/wiki/v2/spaces/{space_id}/nodes/{node_token}'))

@app.route('/api/wiki/export', methods=['POST'])
def wiki_export():
    """导出知识库节点"""
    data = request.json or {}
    items = data.get('items', [])
    
    results = []
    for item in items:
        node_token = item.get('node_token')
        space_id = item.get('space_id')
        title = item.get('title', '未命名')
        
        # 获取节点信息
        node_info = api_get(f'/wiki/v2/spaces/{space_id}/nodes/{node_token}')
        if node_info.get('code') == 0:
            node = node_info.get('data', {}).get('node', {})
            obj_token = node.get('obj_token')
            obj_type = node.get('obj_type', 'docx')
            
            content = get_doc_content(obj_token, obj_type)
            results.append({
                'title': title,
                'content': content or '',
                'success': bool(content)
            })
        else:
            results.append({'title': title, 'content': '', 'success': False})
    
    return jsonify({'code': 0, 'data': {'results': results}})

# ============== 妙记 ==============

@app.route('/api/minutes')
def minutes_list():
    """列出妙记 - 使用正确的API"""
    start_time = request.args.get('start_time')
    end_time = request.args.get('end_time')
    
    params = {'page_size': 50}
    
    # 转换时间戳格式
    if start_time:
        try:
            ts = int(start_time)
            if ts > 10000000000:  # 毫秒转秒
                ts = ts // 1000
            params['start_time'] = str(ts)
        except:
            pass
    
    if end_time:
        try:
            ts = int(end_time)
            if ts > 10000000000:
                ts = ts // 1000
            params['end_time'] = str(ts)
        except:
            pass
    
    result = api_get('/minutes/v1/minutes', params)
    return jsonify(result)

@app.route('/api/minutes/<minute_token>')
def minute_detail(minute_token):
    return jsonify(api_get(f'/minutes/v1/minutes/{minute_token}'))

@app.route('/api/minutes/<minute_token>/transcript')
def minute_transcript(minute_token):
    """获取妙记文字记录"""
    result = api_get(f'/minutes/v1/minutes/{minute_token}/transcript')
    return jsonify(result)

# ============== 搜索 ==============

@app.route('/api/search', methods=['POST'])
def search():
    data = request.json or {}
    query = data.get('query', '')
    doc_types = data.get('doc_types', ['doc', 'docx', 'sheet'])
    
    result = api_post('/suite/docs-api/search/object', {
        'search_key': query,
        'count': 50,
        'offset': 0,
        'docs_types': doc_types
    })
    
    if result.get('code') == 0:
        docs = result.get('data', {}).get('docs_entities', [])
        return jsonify({
            'code': 0,
            'data': {
                'docs': [{
                    'title': d.get('title', '未命名'),
                    'docs_type': d.get('docs_type', 'doc'),
                    'url': d.get('url', ''),
                    'token': d.get('docs_token', ''),
                    'owner_name': d.get('owner', {}).get('name', '')
                } for d in docs]
            }
        })
    
    # 备用：列表过滤
    drive = api_get('/drive/v1/files', {'page_size': 100})
    if drive.get('code') == 0:
        files = drive.get('data', {}).get('files', [])
        filtered = [f for f in files if query.lower() in (f.get('name', '') or '').lower()]
        return jsonify({
            'code': 0,
            'data': {
                'docs': [{
                    'title': f.get('name', '未命名'),
                    'docs_type': f.get('type', 'doc'),
                    'url': f.get('url', ''),
                    'token': f.get('token', '')
                } for f in filtered]
            }
        })
    
    return jsonify(result)

# ============== 批量导出 ==============

@app.route('/api/batch/export', methods=['POST'])
def batch_export():
    data = request.json or {}
    items = data.get('items', [])
    
    results = []
    for item in items:
        token = item.get('token')
        doc_type = item.get('type', 'docx')
        name = item.get('name', '未命名')
        
        content = get_doc_content(token, doc_type)
        results.append({
            'name': name,
            'content': content or '',
            'success': bool(content),
            'type': doc_type
        })
    
    return jsonify({'code': 0, 'data': {'results': results}})

if __name__ == '__main__':
    load_tokens()
    print("=" * 50)
    print("🦋 飞书工具箱 API v2.0.0")
    print("=" * 50)
    if USER_TOKENS.get('name'):
        print(f"👤 已登录: {USER_TOKENS.get('name')}")
    print(f"🌐 http://localhost:5050")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5050, debug=True)
