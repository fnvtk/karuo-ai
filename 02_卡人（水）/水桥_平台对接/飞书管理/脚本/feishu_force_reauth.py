#!/usr/bin/env python3
"""
强制重新授权：删除本地 Token，并打开带「多维表格」scope 的授权页。
权限开通后必须执行一次，新 Token 才会包含 bitable:app、base:app:create，上传多维表格才能成功。
用法: python3 feishu_force_reauth.py
"""
import os
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
TOKEN_FILE = SCRIPT_DIR / ".feishu_tokens.json"

# 与 auto_log 一致，含 bitable + base:app:create
APP_ID = "cli_a48818290ef8100d"
SERVICE_PORT = 5050
SCOPE = "wiki:wiki+docx:document+drive:drive+bitable:app+base:app:create"
AUTH_URL = (
    f"https://open.feishu.cn/open-apis/authen/v1/authorize"
    f"?app_id={APP_ID}"
    f"&redirect_uri=http%3A//localhost%3A{SERVICE_PORT}/api/auth/callback"
    f"&scope={SCOPE}"
)


def main():
    if TOKEN_FILE.exists():
        TOKEN_FILE.unlink()
        print("✅ 已删除本地 Token，下次使用会走重新授权")
    else:
        print("ℹ️ 本地无 Token 文件，将直接打开授权页")
    print("📎 正在打开飞书授权页（含多维表格权限）…")
    try:
        subprocess.run(["open", AUTH_URL], check=True, capture_output=True)
    except Exception:
        print(f"请手动在浏览器打开：\n{AUTH_URL}")
    print("授权完成后，再运行 batch_upload_json_to_feishu_wiki.py 或 upload_json_to_feishu_doc.py 即可。")


if __name__ == "__main__":
    main()
