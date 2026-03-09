#!/usr/bin/env python3
"""本地视频服务器：用 CORS 提供视频文件给浏览器 fetch 下载。"""
import http.server
import os
import sys
from pathlib import Path

PORT = 19876
SERVE_DIR = "/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片"


class CORSHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SERVE_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        print(f"[server] {args[0]}" if args else "")


if __name__ == "__main__":
    server = http.server.HTTPServer(("127.0.0.1", PORT), CORSHandler)
    print(f"视频服务器已启动: http://127.0.0.1:{PORT}/")
    for f in Path(SERVE_DIR).glob("*.mp4"):
        print(f"  可访问: http://127.0.0.1:{PORT}/{f.name}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
