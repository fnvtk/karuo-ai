#!/usr/bin/env python3
"""
飞书 Token 命令行：获取 access_token、写入/读取当月 wiki token，全部用命令行操作。
用法:
  python3 feishu_token_cli.py get-access-token   # 刷新并获取 access_token（静默写入 .feishu_tokens.json）
  python3 feishu_token_cli.py set-march-token <token>  # 将 3 月文档 token 写入本地，供写入日志使用
  python3 feishu_token_cli.py get-march-token    # 输出当前 3 月 wiki token（环境变量 > 本地文件）
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
            with open(MONTH_TOKENS_FILE, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def _save_month_tokens(data):
    with open(MONTH_TOKENS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def cmd_get_access_token():
    """刷新并获取 access_token，写入 .feishu_tokens.json，并输出结果"""
    sys.path.insert(0, str(SCRIPT_DIR))
    from auto_log import get_token_silent
    token = get_token_silent()
    if token:
        print("OK")
        print(token[:20] + "..." if len(token) > 20 else token)
        return 0
    print("FAIL")
    return 1


def cmd_set_march_token(token: str):
    """将 3 月 wiki token 写入 .feishu_month_wiki_tokens.json"""
    token = (token or "").strip()
    if not token:
        print("FAIL: token 为空")
        return 1
    data = _load_month_tokens()
    data["3"] = token
    _save_month_tokens(data)
    print("OK")
    print("已写入 3 月 wiki token，写今日日志将自动使用")
    return 0


def cmd_get_march_token():
    """输出当前 3 月 wiki token（环境变量 > 本地文件）"""
    v = os.environ.get("FEISHU_MARCH_WIKI_TOKEN", "").strip()
    if v:
        print(v)
        return 0
    data = _load_month_tokens()
    v = (data.get("3") or "").strip()
    if v:
        print(v)
        return 0
    print("未配置 3 月 token（可用 set-march-token <token> 写入）", file=sys.stderr)
    return 1


def main():
    if len(sys.argv) < 2:
        print("用法: get-access-token | set-march-token <token> | get-march-token", file=sys.stderr)
        return 1
    cmd = sys.argv[1].strip().lower()
    if cmd == "get-access-token":
        return cmd_get_access_token()
    if cmd == "set-march-token":
        if len(sys.argv) < 3:
            print("用法: set-march-token <token>", file=sys.stderr)
            return 1
        return cmd_set_march_token(sys.argv[2])
    if cmd == "get-march-token":
        return cmd_get_march_token()
    print(f"未知命令: {cmd}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
