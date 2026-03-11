#!/usr/bin/env python3
"""
Cursor 浏览器 Cookie 提取工具（通用）

从 Cursor IDE 内置浏览器的 SQLite 数据库中提取指定域名的 Cookie。
Cursor 浏览器 Cookie 为明文存储，无需 Keychain 解密。

路径: ~/Library/Application Support/Cursor/Partitions/cursor-browser/Cookies

用法（命令行）:
  python3 cursor_cookie_util.py feishu          # 提取飞书 Cookie
  python3 cursor_cookie_util.py github          # 提取 GitHub Cookie
  python3 cursor_cookie_util.py --domain .example.com  # 自定义域名

用法（导入）:
  from cursor_cookie_util import get_cursor_cookies
  cookie_str = get_cursor_cookies(domains=[".feishu.cn", "cunkebao.feishu.cn"])

2026-03-11 created | 卡若AI · 水桥
"""
from __future__ import annotations
import sys
from pathlib import Path

CURSOR_COOKIE_DB = Path.home() / "Library/Application Support/Cursor/Partitions/cursor-browser/Cookies"

PRESET_DOMAINS = {
    "feishu": [".feishu.cn", "cunkebao.feishu.cn", "meetings.feishu.cn"],
    "github": [".github.com", "github.com"],
    "google": [".google.com"],
}


def get_cursor_cookies(domains: list[str] | None = None, as_dict: bool = False) -> str | dict[str, str]:
    """
    从 Cursor 浏览器 SQLite 提取指定域名的 Cookie。

    Args:
        domains: 要匹配的域名列表（SQL LIKE 模式）。None 则提取所有。
        as_dict: True 返回 {name: value}，False 返回 "name=value; ..." 字符串。

    Returns:
        Cookie 字符串 或 字典。失败返回空字符串/空字典。
    """
    if not CURSOR_COOKIE_DB.exists():
        return {} if as_dict else ""

    try:
        import sqlite3, shutil, tempfile
        tmp = tempfile.mktemp(suffix=".db")
        shutil.copy2(CURSOR_COOKIE_DB, tmp)
        conn = sqlite3.connect(tmp)
        cur = conn.cursor()

        if domains:
            where_clauses = " OR ".join([f"host_key LIKE '%{d}%'" for d in domains])
            sql = f"SELECT host_key, name, value FROM cookies WHERE ({where_clauses}) AND value != ''"
        else:
            sql = "SELECT host_key, name, value FROM cookies WHERE value != ''"

        cur.execute(sql)
        rows = cur.fetchall()
        conn.close()
        Path(tmp).unlink(missing_ok=True)

        if not rows:
            return {} if as_dict else ""

        if as_dict:
            return {name: value for _, name, value in rows}

        return "; ".join([f"{name}={value}" for _, name, value in rows])

    except Exception:
        return {} if as_dict else ""


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Cursor 浏览器 Cookie 提取工具")
    parser.add_argument("preset", nargs="?", default="", help=f"预设域名: {', '.join(PRESET_DOMAINS.keys())}")
    parser.add_argument("--domain", "-d", action="append", default=[], help="自定义域名（可多次指定）")
    parser.add_argument("--dict", action="store_true", help="输出为 JSON dict")
    args = parser.parse_args()

    domains = args.domain
    if args.preset and args.preset in PRESET_DOMAINS:
        domains = PRESET_DOMAINS[args.preset]
    elif args.preset:
        domains = [args.preset]

    if not domains:
        print(f"用法: python3 {Path(__file__).name} <preset|--domain DOMAIN>")
        print(f"预设: {', '.join(PRESET_DOMAINS.keys())}")
        return

    result = get_cursor_cookies(domains, as_dict=args.dict)

    if args.dict:
        import json
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print(f"\n共 {len(result)} 个 Cookie", file=sys.stderr)
    else:
        if result:
            print(result)
            print(f"\n✅ Cookie 长度: {len(result)} chars", file=sys.stderr)
        else:
            print("❌ 未找到匹配的 Cookie", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
