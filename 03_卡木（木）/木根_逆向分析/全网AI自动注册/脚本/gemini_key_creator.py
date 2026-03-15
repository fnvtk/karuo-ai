#!/usr/bin/env python3
"""
Gemini API Key 创建器（纯命令行 + 系统浏览器 OAuth 授权）
不需要打开额外浏览器，系统浏览器走 Clash 代理完成 Google 登录授权。
自动创建指定数量的 GCP 项目并生成 Gemini API Key。

用法: python3 gemini_key_creator.py --count 3
"""

import argparse
import http.server
import json
import os
import random
import string
import sys
import threading
import time
import urllib.parse
import webbrowser
from pathlib import Path

import httpx

PROXY = "http://127.0.0.1:7897"

# Google OAuth2 客户端（使用 Google Cloud SDK 的公开 client）
CLIENT_ID = "764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com"
CLIENT_SECRET = "d-FL95Q19q7MQmFpd7hHD0Ty"
REDIRECT_PORT = 18457
REDIRECT_URI = f"http://localhost:{REDIRECT_PORT}"
SCOPES = [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/generative-language",
]

TOKEN_URL = "https://oauth2.googleapis.com/token"
PROJECTS_URL = "https://cloudresourcemanager.googleapis.com/v1/projects"
SERVICES_URL = "https://serviceusage.googleapis.com/v1/projects/{project_id}/services/generativelanguage.googleapis.com:enable"
APIKEYS_URL = "https://apikeys.googleapis.com/v2/projects/{project_id}/locations/global/keys"

DB_PATH = Path(__file__).parent / "accounts.db"
JSON_DIR = Path(__file__).parent / "tokens"

auth_code_result = {"code": None}


class OAuthCallbackHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        code = qs.get("code", [None])[0]
        if code:
            auth_code_result["code"] = code
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"<html><body><h2>&#10004; Google OAuth OK</h2><p>You can close this tab now.</p></body></html>")
        else:
            error = qs.get("error", ["unknown"])[0]
            self.send_response(400)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(f"<html><body><h2>Error: {error}</h2></body></html>".encode())

    def log_message(self, format, *args):
        pass


def get_oauth_token():
    """OAuth 授权码流程：系统浏览器授权 → 获取 access_token"""
    server = http.server.HTTPServer(("localhost", REDIRECT_PORT), OAuthCallbackHandler)
    server.timeout = 300
    thread = threading.Thread(target=server.handle_request, daemon=True)
    thread.start()

    auth_params = urllib.parse.urlencode({
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
    })
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{auth_params}"

    print(f"\n🔐 正在打开系统浏览器进行 Google 授权...")
    print(f"   （系统浏览器走 Clash 代理，无需额外操作）\n")
    webbrowser.open(auth_url)

    print("⏳ 等待授权回调...")
    thread.join(timeout=300)
    server.server_close()

    code = auth_code_result["code"]
    if not code:
        print("❌ 授权超时或失败")
        sys.exit(1)

    print("✅ 授权码获取成功，兑换 Token...")
    with httpx.Client(proxy=PROXY, timeout=20) as client:
        resp = client.post(TOKEN_URL, data={
            "code": code,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        if resp.status_code != 200:
            print(f"❌ Token 兑换失败: {resp.status_code} {resp.text[:200]}")
            sys.exit(1)
        tokens = resp.json()
        print(f"✅ Access Token 获取成功!")
        return tokens["access_token"]


def create_project(token, project_id):
    """创建 GCP 项目"""
    with httpx.Client(proxy=PROXY, timeout=30) as client:
        resp = client.post(
            PROJECTS_URL,
            headers={"Authorization": f"Bearer {token}"},
            json={"projectId": project_id, "name": project_id},
        )
        if resp.status_code in (200, 409):
            if resp.status_code == 409:
                print(f"  项目 {project_id} 已存在，继续使用")
            return True
        print(f"  创建项目失败: {resp.status_code} {resp.text[:200]}")
        return False


def enable_gemini_api(token, project_id):
    """启用 Generative Language API"""
    url = SERVICES_URL.format(project_id=project_id)
    with httpx.Client(proxy=PROXY, timeout=30) as client:
        resp = client.post(
            url,
            headers={"Authorization": f"Bearer {token}"},
        )
        if resp.status_code in (200, 409):
            return True
        print(f"  启用 API 失败: {resp.status_code} {resp.text[:200]}")
        return False


def wait_for_operation(token, operation_name, max_wait=60):
    """等待长期运行操作完成"""
    url = f"https://serviceusage.googleapis.com/v1/{operation_name}"
    with httpx.Client(proxy=PROXY, timeout=15) as client:
        for _ in range(max_wait // 3):
            resp = client.get(url, headers={"Authorization": f"Bearer {token}"})
            if resp.status_code == 200:
                data = resp.json()
                if data.get("done"):
                    return True
            time.sleep(3)
    return True


def create_api_key(token, project_id, display_name):
    """创建 API Key 并限制为 Generative Language API"""
    url = APIKEYS_URL.format(project_id=project_id)
    with httpx.Client(proxy=PROXY, timeout=30) as client:
        resp = client.post(
            url,
            headers={"Authorization": f"Bearer {token}"},
            json={
                "displayName": display_name,
                "restrictions": {
                    "apiTargets": [{"service": "generativelanguage.googleapis.com"}]
                },
            },
        )
        if resp.status_code == 200:
            data = resp.json()
            operation = data.get("name", "")
            if "operations/" in operation:
                time.sleep(3)
                op_resp = client.get(
                    f"https://apikeys.googleapis.com/v2/{operation}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                if op_resp.status_code == 200:
                    op_data = op_resp.json()
                    if op_data.get("done"):
                        key_data = op_data.get("response", {})
                        return key_data.get("keyString", "")
                    time.sleep(5)
                    op_resp2 = client.get(
                        f"https://apikeys.googleapis.com/v2/{operation}",
                        headers={"Authorization": f"Bearer {token}"},
                    )
                    if op_resp2.status_code == 200:
                        return op_resp2.json().get("response", {}).get("keyString", "")
            return data.get("keyString", "")
        print(f"  创建 Key 失败: {resp.status_code} {resp.text[:300]}")
        return None


def list_existing_keys(token, project_id):
    """列出已有的 API Keys"""
    url = APIKEYS_URL.format(project_id=project_id)
    with httpx.Client(proxy=PROXY, timeout=15) as client:
        resp = client.get(url, headers={"Authorization": f"Bearer {token}"})
        if resp.status_code == 200:
            return resp.json().get("keys", [])
    return []


def save_key_to_db(api_key, project_id, idx):
    """保存到 SQLite"""
    import sqlite3
    JSON_DIR.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(str(DB_PATH)) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider TEXT NOT NULL,
                email TEXT NOT NULL,
                password TEXT DEFAULT '',
                api_key TEXT DEFAULT '',
                access_token TEXT DEFAULT '',
                refresh_token TEXT DEFAULT '',
                account_id TEXT DEFAULT '',
                name TEXT DEFAULT '',
                extra TEXT DEFAULT '{}',
                registered_at TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                UNIQUE(provider, email)
            )
        """)
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        conn.execute("""
            INSERT OR REPLACE INTO accounts
            (provider, email, api_key, name, extra, registered_at, status)
            VALUES (?, ?, ?, ?, ?, ?, 'active')
        """, ("gemini", f"gemini_project_{idx}@google.com", api_key,
              project_id, json.dumps({"project": project_id}), now))
        conn.commit()

    json_file = JSON_DIR / f"gemini_{project_id}.json"
    json_file.write_text(json.dumps({
        "provider": "gemini",
        "project": project_id,
        "api_key": api_key,
    }, indent=2))
    print(f"  💾 已保存: DB + {json_file.name}")


def main():
    global PROXY
    parser = argparse.ArgumentParser(description="Gemini API Key 创建器")
    parser.add_argument("--count", "-n", type=int, default=3, help="创建 Key 数量")
    parser.add_argument("--proxy", default=PROXY, help="代理地址")
    args = parser.parse_args()

    PROXY = args.proxy

    print("=" * 60)
    print(f"🔑 Gemini API Key 创建器")
    print(f"   目标: 创建 {args.count} 个 Gemini API Key")
    print(f"   代理: {PROXY}")
    print("=" * 60)

    token = get_oauth_token()

    keys_created = []
    for i in range(1, args.count + 1):
        suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        project_id = f"gemini-auto-{suffix}"
        display_name = f"gemini-key-{i}"

        print(f"\n--- 创建第 {i}/{args.count} 个 Key ---")

        print(f"  [1/3] 创建项目: {project_id}")
        if not create_project(token, project_id):
            print(f"  ⚠️  跳过此 Key")
            continue

        print(f"  [2/3] 启用 Generative Language API")
        time.sleep(2)
        enable_gemini_api(token, project_id)
        time.sleep(5)

        print(f"  [3/3] 创建 API Key: {display_name}")
        api_key = create_api_key(token, project_id, display_name)

        if api_key:
            print(f"  ✅ Key {i}: {api_key}")
            keys_created.append({"key": api_key, "project": project_id})
            save_key_to_db(api_key, project_id, i)
        else:
            print(f"  ❌ Key 创建失败，尝试列出已有 Key...")
            existing = list_existing_keys(token, project_id)
            for k in existing:
                ks = k.get("keyString")
                if ks:
                    print(f"  ✅ 找到已有 Key: {ks}")
                    keys_created.append({"key": ks, "project": project_id})
                    save_key_to_db(ks, project_id, i)
                    break

    print(f"\n{'='*60}")
    print(f"🎉 完成! 创建了 {len(keys_created)}/{args.count} 个 Gemini API Key")
    for idx, kd in enumerate(keys_created, 1):
        print(f"  Key {idx}: {kd['key']}")
        print(f"         Project: {kd['project']}")
    if keys_created:
        print(f"\n测试命令:")
        k = keys_created[0]["key"]
        print(f'  curl -x {PROXY} "https://generativelanguage.googleapis.com/v1beta/models?key={k}"')
    print(f"\n存储: {DB_PATH} + {JSON_DIR}/")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
