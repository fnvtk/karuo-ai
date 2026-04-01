#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从飞书妙记 space/list 中按「第 N 场 / soul 派对」解析 object_token（需 Cursor 已登录 cunkebao 妙记，Cookie 来自本机）。"""
import argparse
import re
import shutil
import sqlite3
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path

import requests

LIST_URL = "https://cunkebao.feishu.cn/minutes/api/space/list"
PAGE_SIZE = 50
MAX_PAGES = 80


def get_cookie():
    p = Path.home() / "Library/Application Support/Cursor/Partitions/cursor-browser/Cookies"
    if not p.exists():
        return "", ""
    tmp = tempfile.mktemp(suffix=".db")
    shutil.copy2(p, tmp)
    try:
        conn = sqlite3.connect(tmp)
        rows = conn.execute(
            "SELECT name, value FROM cookies WHERE (host_key LIKE '%feishu%' OR host_key LIKE '%cunkebao%') AND value != ''"
        ).fetchall()
        conn.close()
    finally:
        Path(tmp).unlink(missing_ok=True)
    cookie_str = "; ".join([f"{n}={v}" for n, v in rows])
    bv = ""
    for key in ("bv_csrf_token=", "minutes_csrf_token="):
        i = cookie_str.find(key)
        if i != -1:
            s = i + len(key)
            e = cookie_str.find(";", s)
            val = cookie_str[s : e if e != -1 else len(cookie_str)].strip()
            if len(val) == 36:
                bv = val
                break
    return cookie_str, bv


def fetch_list(headers):
    all_items = []
    last_ts = ""
    for _ in range(1, MAX_PAGES + 1):
        url = f"{LIST_URL}?size={PAGE_SIZE}&space_name=1"
        if last_ts:
            url += f"&last_time={last_ts}"
        r = requests.get(url, headers=headers, timeout=60)
        if r.status_code != 200:
            break
        data = r.json()
        if data.get("code") != 0:
            print("API", data.get("code"), data.get("msg"), file=sys.stderr)
            break
        items = data.get("data", {}).get("list", [])
        if not items:
            break
        all_items.extend(items)
        last_ts = items[-1].get("create_time", "")
        if len(items) < PAGE_SIZE:
            break
        time.sleep(0.15)
    return all_items


def session_num(topic, n):
    t = topic or ""
    if re.search(rf"第\s*{n}\s*场", t):
        return True
    if re.search(rf"(?<!\d){n}\s*场(?!\d)", t):
        return True
    if re.search(rf"派对\s*{n}\b", t, re.I):
        return True
    return False


def ts_to_date(ts):
    try:
        t = int(ts)
        if t > 1e12:
            t = t // 1000
        return datetime.fromtimestamp(t).strftime("%Y%m%d")
    except Exception:
        return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sessions", type=int, nargs="+", help="场次号，如 138 139")
    args = ap.parse_args()

    cookie_str, bv = get_cookie()
    if len(cookie_str) < 100:
        print("无法读取 Cookie（请在 Cursor 内置浏览器登录 cunkebao 妙记）", file=sys.stderr)
        return 2
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Cookie": cookie_str,
        "Referer": "https://cunkebao.feishu.cn/minutes/",
    }
    if bv:
        headers["bv-csrf-token"] = bv

    items = fetch_list(headers)
    for n in args.sessions:
        hits = []
        for it in items:
            topic = it.get("topic") or ""
            if not any(k in topic.lower() for k in ("soul", "派对")):
                continue
            if session_num(topic, n):
                tok = it.get("object_token", "")
                if tok and all(h.get("object_token") != tok for h in hits):
                    hits.append(it)
        print(f"\n## 第{n}场 命中 {len(hits)} 条（去重 token）")
        for it in hits:
            topic = it.get("topic", "")
            tok = it.get("object_token", "")
            d = ts_to_date(it.get("create_time", ""))
            print(f"  token={tok}")
            print(f"  date={d}")
            print(f"  topic={topic!r}")
            print(f"  url=https://cunkebao.feishu.cn/minutes/{tok}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
