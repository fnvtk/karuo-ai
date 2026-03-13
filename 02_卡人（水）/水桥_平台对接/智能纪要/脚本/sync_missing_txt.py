#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""对比 聊天记录/soul 下已有 txt 与妙记列表，只下载缺失场次的文字。"""
import re
import sys
import sqlite3
import shutil
import tempfile
import time
import requests
from pathlib import Path

TXT_DIR = Path("/Users/karuo/Documents/聊天记录/soul")
COOKIE_PATH = Path.home() / "Library/Application Support/Cursor/Partitions/cursor-browser/Cookies"
LIST_URL = "https://cunkebao.feishu.cn/minutes/api/space/list"
EXPORT_URL = "https://cunkebao.feishu.cn/minutes/api/export"
MAX_PAGES = 30
PAGE_SIZE = 50


def get_cookie():
    if not COOKIE_PATH.exists():
        return "", ""
    tmp = tempfile.mktemp(suffix=".db")
    shutil.copy2(COOKIE_PATH, tmp)
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


def have_pairs_from_dir():
    have = set()
    for f in TXT_DIR.iterdir():
        if not f.is_file() or f.suffix.lower() != ".txt":
            continue
        nums = re.findall(r"(\d+)场", f.name)
        dates = re.findall(r"(20\d{6})", f.name)
        for n in nums:
            for d in dates:
                have.add((int(n), d))
            if not dates:
                have.add((int(n), ""))
    return have


def topic_to_pair(topic):
    nums = re.findall(r"(\d+)场", topic)
    dates = re.findall(r"(20\d{6})", topic)
    if not nums:
        return None, None
    return int(nums[0]), (dates[0] if dates else "")


def sanitize(topic):
    s = topic.strip()
    for c in r'\/:*?"<>|':
        s = s.replace(c, "_")
    return s[:85].strip()


def fetch_list(headers):
    all_items = []
    last_ts = ""
    for page in range(1, MAX_PAGES + 1):
        url = f"{LIST_URL}?size={PAGE_SIZE}&space_name=1"
        if last_ts:
            url += f"&last_time={last_ts}"
        r = requests.get(url, headers=headers, timeout=30)
        if r.status_code != 200:
            break
        data = r.json()
        if data.get("code") != 0:
            break
        items = data.get("data", {}).get("list", [])
        if not items:
            break
        all_items.extend(items)
        last_ts = items[-1].get("create_time", "")
        if len(items) < PAGE_SIZE:
            break
        time.sleep(0.25)
    return all_items


def export_txt(headers, object_token):
    params = {"object_token": object_token, "format": 2, "add_speaker": "true", "add_timestamp": "false"}
    r = requests.post(EXPORT_URL, params=params, headers=headers, timeout=25)
    r.encoding = "utf-8"
    if r.status_code == 200 and (r.text or "").strip():
        return (r.text or "").strip()
    return None


def main():
    import argparse
    ap = argparse.ArgumentParser(description="同步缺失场次文字到 聊天记录/soul")
    ap.add_argument("--max-download", type=int, default=0, help="最多下载条数，0=全部")
    ap.add_argument("--dry-run", action="store_true", help="只列缺失不下载")
    args = ap.parse_args()

    TXT_DIR.mkdir(parents=True, exist_ok=True)
    cookie_str, bv = get_cookie()
    if len(cookie_str) < 100:
        print("无法获取 Cookie（请用 Cursor 打开过飞书妙记）", file=sys.stderr)
        sys.exit(1)
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Cookie": cookie_str,
        "Referer": "https://cunkebao.feishu.cn/minutes/",
    }
    if bv:
        headers["bv-csrf-token"] = bv

    have = have_pairs_from_dir()
    print(f"目录已有场次对: {len(have)}", flush=True)

    all_items = fetch_list(headers)
    print(f"API 拉取: {len(all_items)} 条", flush=True)

    missing = []
    seen_tokens = set()
    for it in all_items:
        topic = it.get("topic", "")
        token = it.get("object_token", "")
        if not token or token in seen_tokens:
            continue
        n, d = topic_to_pair(topic)
        if n is None:
            continue
        if (n, d) in have or (n, "") in have:
            continue
        seen_tokens.add(token)
        missing.append({"topic": topic, "object_token": token, "n": n, "d": d})

    print(f"缺失需下载: {len(missing)} 条（已按 object_token 去重）", flush=True)
    if not missing:
        return 0
    if args.dry_run:
        for m in missing[:50]:
            print(f"  {m['n']}场 {m['d']} {m['topic'][:55]}", flush=True)
        if len(missing) > 50:
            print(f"  ... 共 {len(missing)} 条", flush=True)
        return 0

    to_do = missing[: args.max_download] if args.max_download else missing
    ok = 0
    for i, m in enumerate(to_do):
        topic = m["topic"]
        token = m["object_token"]
        body = export_txt(headers, token)
        if body and len(body) > 50:
            base = sanitize(topic) + ".txt"
            path = TXT_DIR / base
            path.write_text("标题: " + topic + "\n\n" + body, encoding="utf-8")
            print(f"  [{i+1}/{len(to_do)}] OK {m['n']}场 -> {base[:50]}", flush=True)
            ok += 1
        else:
            print(f"  [{i+1}/{len(to_do)}] 跳过(无转写) {m['n']}场 {topic[:40]}", flush=True)
        time.sleep(0.4)
    print(f"完成: 新写入 {ok} 个 txt（本次处理 {len(to_do)}，剩余 {len(missing)-len(to_do)} 可再次运行本脚本补全）", flush=True)
    return ok


if __name__ == "__main__":
    main()
