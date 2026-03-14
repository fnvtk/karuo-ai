#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""下载妙记中所有 Soul 相关文字记录，从第1场（最早）开始。"""
import re
import sys
import sqlite3
import shutil
import tempfile
import time
from datetime import datetime
import requests
from pathlib import Path

TXT_DIR = Path("/Users/karuo/Documents/聊天记录/soul")
COOKIE_PATH = Path.home() / "Library/Application Support/Cursor/Partitions/cursor-browser/Cookies"
LIST_URL = "https://cunkebao.feishu.cn/minutes/api/space/list"
EXPORT_URL = "https://cunkebao.feishu.cn/minutes/api/export"
MAX_PAGES = 80
PAGE_SIZE = 50

SOUL_KEYWORDS = ("soul", "派对", "团队会议")


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


def is_soul_related(topic):
    t = (topic or "").lower()
    return any(k in t for k in SOUL_KEYWORDS)


def sanitize(topic):
    s = (topic or "").strip()
    for c in r'\/:*?"<>|':
        s = s.replace(c, "_")
    return re.sub(r"\s+", " ", s)[:90].strip()


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
    r = requests.post(EXPORT_URL, params=params, headers=headers, timeout=30)
    r.encoding = "utf-8"
    if r.status_code == 200 and (r.text or "").strip():
        return (r.text or "").strip()
    return None


def ts_to_date(ts):
    try:
        t = int(ts)
        if t > 1e12:
            t = t // 1000
        return datetime.fromtimestamp(t).strftime("%Y%m%d")
    except Exception:
        return ""


def main():
    import argparse
    ap = argparse.ArgumentParser(description="下载妙记中所有 Soul 相关文字，从第1场开始")
    ap.add_argument("--dry-run", action="store_true", help="只列出待下载，不实际下载")
    ap.add_argument("--max-download", type=int, default=0, help="最多下载条数，0=全部")
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

    have_basenames = set()
    for f in TXT_DIR.iterdir():
        if f.is_file() and f.suffix.lower() == ".txt":
            have_basenames.add(f.name)

    print("正在拉取妙记列表...", flush=True)
    all_items = fetch_list(headers)
    soul_items = [it for it in all_items if is_soul_related(it.get("topic", ""))]
    seen = {}
    for it in soul_items:
        tok = it.get("object_token", "")
        if tok and tok not in seen:
            seen[tok] = it
    soul_items = list(seen.values())
    soul_items.sort(key=lambda x: int(x.get("create_time", 0) or 0))  # 最早在前

    print(f"Soul 相关共 {len(soul_items)} 条（已去重，按时间升序）", flush=True)

    to_download = []
    for it in soul_items:
        topic = it.get("topic", "")
        token = it.get("object_token", "")
        ts = it.get("create_time", "")
        date_str = ts_to_date(ts)
        base = sanitize(topic) + ".txt"
        alt_base = (sanitize(topic) + "_" + date_str + ".txt") if date_str else base
        if base in have_basenames or alt_base in have_basenames:
            continue
        to_download.append({"topic": topic, "object_token": token, "date_str": date_str})

    print(f"待下载（目录暂无）: {len(to_download)} 条", flush=True)
    if not to_download:
        print("目录已齐全，无需下载。")
        return 0

    if args.dry_run:
        for i, m in enumerate(to_download[:80]):
            print(f"  {i+1}. {m['topic'][:60]}", flush=True)
        if len(to_download) > 80:
            print(f"  ... 共 {len(to_download)} 条", flush=True)
        return 0

    to_do = to_download[: args.max_download] if args.max_download else to_download
    ok = 0
    for i, m in enumerate(to_do):
        topic = m["topic"]
        token = m["object_token"]
        date_str = m["date_str"]
        base = sanitize(topic) + ".txt"
        body = export_txt(headers, token)
        if body and len(body) > 30:
            out_path = TXT_DIR / base
            out_path.write_text("标题: " + topic + "\n\n" + body, encoding="utf-8")
            have_basenames.add(base)
            ok += 1
            print(f"  [{i+1}/{len(to_do)}] 已保存 {base[:55]}", flush=True)
        else:
            print(f"  [{i+1}/{len(to_do)}] 无转写 {topic[:45]}", flush=True)
        time.sleep(0.4)

    print(f"完成: 新写入 {ok} 个 txt", flush=True)
    return ok


if __name__ == "__main__":
    main()
