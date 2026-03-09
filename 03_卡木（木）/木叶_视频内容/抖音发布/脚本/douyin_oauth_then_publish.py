#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
抖音 OAuth 授权后立即发布 119 场成片。
需设置环境变量：DOUYIN_CLIENT_KEY、DOUYIN_CLIENT_SECRET；
可选 DOUYIN_REDIRECT_URI（默认 http://127.0.0.1:8765/callback，需在开放平台应用里配置同值）。
会打开浏览器，用户登录抖音并点击授权后，自动保存 token 并执行批量发布。
"""
import json
import os
import subprocess
import sys
import threading
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse

try:
    import requests
except ImportError:
    print("请安装 requests: pip install requests", file=sys.stderr)
    sys.exit(1)

SCRIPT_DIR = Path(__file__).resolve().parent
REDIRECT_PORT = 8765
REDIRECT_URI = os.environ.get("DOUYIN_REDIRECT_URI") or f"http://127.0.0.1:{REDIRECT_PORT}/callback"
TOKEN_URL = "https://open.douyin.com/oauth/access_token/"


def get_client_creds():
    # 支持从 .env 读取（若存在 python-dotenv）
    try:
        from dotenv import load_dotenv
        load_dotenv(SCRIPT_DIR / ".env")
    except ImportError:
        pass
    key = os.environ.get("DOUYIN_CLIENT_KEY")
    secret = os.environ.get("DOUYIN_CLIENT_SECRET")
    return key, secret


class CallbackHandler(BaseHTTPRequestHandler):
    code = None

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/callback":
            qs = parse_qs(parsed.query)
            CallbackHandler.code = qs.get("code", [None])[0]
        self.send_response(200)
        self.send_header("Content-type", "text/html; charset=utf-8")
        self.end_headers()
        if CallbackHandler.code:
            body = "<html><body><p>授权成功，正在保存 token 并发布视频...</p></body></html>"
        else:
            body = "<html><body><p>未收到 code，请关闭此页。</p></body></html>"
        self.wfile.write(body.encode("utf-8"))

    def log_message(self, format, *args):
        pass


def main():
    key, secret = get_client_creds()
    if not key or not secret:
        print("未配置 DOUYIN_CLIENT_KEY / DOUYIN_CLIENT_SECRET，无法执行 OAuth。", file=sys.stderr)
        print("可在脚本目录创建 .env 或设置环境变量后重试。", file=sys.stderr)
        sys.exit(1)

    auth_url = (
        "https://open.douyin.com/platform/oauth/connect/"
        f"?client_key={key}&response_type=code&scope=user_info,video.create"
        f"&redirect_uri={requests.utils.quote(REDIRECT_URI)}&state=1"
    )

    server = HTTPServer(("127.0.0.1", REDIRECT_PORT), CallbackHandler)
    thread = threading.Thread(target=server.handle_request)
    thread.start()
    webbrowser.open(auth_url)
    thread.join(timeout=120)
    server.server_close()

    code = CallbackHandler.code
    if not code:
        print("未获取到授权码，请重试。", file=sys.stderr)
        sys.exit(1)

    r = requests.post(
        TOKEN_URL,
        data={
            "client_key": key,
            "client_secret": secret,
            "code": code,
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    data = r.json()
    if data.get("data") is None:
        print("换 token 失败:", data, file=sys.stderr)
        sys.exit(1)
    d = data["data"]
    token_file = SCRIPT_DIR / "tokens.json"
    with open(token_file, "w", encoding="utf-8") as f:
        json.dump({"access_token": d["access_token"], "open_id": d["open_id"]}, f, ensure_ascii=False, indent=2)
    print("已保存 token 到 tokens.json，开始发布...")
    subprocess.run([sys.executable, str(SCRIPT_DIR / "batch_publish_119.py")], check=True)


if __name__ == "__main__":
    main()
