#!/usr/bin/env python3
# Web 钩子接收端：收到 GitHub 或 Gitea 的 POST 后执行同步脚本（与 cron 共用同一脚本，脚本内带锁不冲突）
# 在 NAS 上运行：python3 webhook_receiver.py  或 nohup python3 webhook_receiver.py &
# 需本机或 frp 暴露端口（如 9999），GitHub/Gitea 的 Webhook URL 填 http://你的地址:9999/sync
# 依赖：Python 3，同目录 sync_github_to_gitea.sh、sync_tokens.env

import json
import os
import subprocess
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SYNC_SCRIPT = os.path.join(SCRIPT_DIR, "sync_github_to_gitea.sh")
PORT = int(os.environ.get("WEBHOOK_PORT", "9999"))


class SyncHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        repo = None
        try:
            length = int(self.headers.get("Content-Length", 0))
            if length:
                body = self.rfile.read(length).decode("utf-8", errors="ignore")
                try:
                    data = json.loads(body)
                    # GitHub: repository.name 或 repository.full_name
                    repo = (data.get("repository") or {}).get("name")
                    if not repo and data.get("repository", {}).get("full_name"):
                        repo = data["repository"]["full_name"].split("/")[-1]
                    # Gitea: repository.name
                    if not repo:
                        repo = (data.get("repository") or {}).get("name")
                except Exception:
                    pass
        except Exception:
            pass

        cmd = [SYNC_SCRIPT]
        if repo:
            cmd.extend(["--repo", repo])
        env = os.environ.copy()
        env["SYNC_WORK_DIR"] = os.environ.get("SYNC_WORK_DIR", "/tmp/github_gitea_sync")
        subprocess.Popen(
            ["/bin/bash"] + cmd,
            cwd=SCRIPT_DIR,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(b"ok")

    def do_GET(self):
        if self.path in ("/", "/sync", "/health"):
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"webhook receiver ok")
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("[webhook] %s\n" % (fmt % args))


def main():
    if not os.path.isfile(SYNC_SCRIPT):
        sys.stderr.write("sync script not found: %s\n" % SYNC_SCRIPT)
        sys.exit(1)
    server = HTTPServer(("", PORT), SyncHandler)
    sys.stderr.write("webhook receiver listening on port %s (POST /sync or / => run sync)\n" % PORT)
    server.serve_forever()


if __name__ == "__main__":
    main()
