#!/usr/bin/env python3
"""
飞书 Token 命令行：获取 access_token、写入/读取月度 wiki token，全部用命令行操作。
用法:
  python3 feishu_token_cli.py get-access-token   # 刷新并输出 access_token，写入 .feishu_tokens.json
  python3 feishu_token_cli.py set-march-token <token>  # 将 3 月文档 token 写入本地，供 auto_log 读取
  python3 feishu_token_cli.py get-march-token    # 输出当前 3 月 wiki token（env 或本地文件）
"""
import os
import sys
import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
MONTH_TOKENS_FILE = SCRIPT_DIR / ".feishu_month_wiki_tokens.json"


def _load_month_tokens():
    if MONTH_TOKENS_FILE.exists():
        try:
            with open(MONTH_TOKENS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def _save_month_tokens(data):
    with open(MONTH_TOKENS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def cmd_get_access_token():
    sys.path.insert(0, str(SCRIPT_DIR))
    from auto_log import get_token_silent, load_tokens
    token = get_token_silent()
    if token:
        print(token)
        return 0
    print("", file=sys.stderr)
    return 1


def cmd_set_march_token(token_value):
    token_value = (token_value or "").strip()
    if not token_value:
        print("用法: feishu_token_cli.py set-march-token <token>", file=sys.stderr)
        return 1
    data = _load_month_tokens()
    data["3"] = token_value
    _save_month_tokens(data)
    print(f"✅ 3 月 wiki token 已写入 {MONTH_TOKENS_FILE}")
    return 0


def cmd_get_march_token():
    # 优先环境变量
    env_tok = os.environ.get("FEISHU_MARCH_WIKI_TOKEN", "").strip()
    if env_tok:
        print(env_tok)
        return 0
    data = _load_month_tokens()
    tok = data.get("3", "").strip()
    if tok:
        print(tok)
        return 0
    print("", file=sys.stderr)
    return 1


def main():
    if len(sys.argv) < 2:
        print(__doc__.strip(), file=sys.stderr)
        return 1
    cmd = sys.argv[1].lower()
    if cmd == "get-access-token":
        return cmd_get_access_token()
    if cmd == "set-march-token":
        return cmd_set_march_token(sys.argv[2] if len(sys.argv) > 2 else None)
    if cmd == "get-march-token":
        return cmd_get_march_token()
    print(f"未知命令: {cmd}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
