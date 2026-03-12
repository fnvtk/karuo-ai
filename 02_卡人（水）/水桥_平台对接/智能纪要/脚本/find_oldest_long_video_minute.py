#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
飞书妙记：查找「最早 + 时长≥1小时 + 有画面」的一条。

用法：
  python3 find_oldest_long_video_minute.py
  python3 find_oldest_long_video_minute.py --list-only   # 只拉列表并保存，不查 status
  python3 find_oldest_long_video_minute.py --max-status 100   # 只对最早 100 条查 status（默认 300）
"""

import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

SCRIPT_DIR = Path(__file__).resolve().parent
COOKIE_FILE = SCRIPT_DIR / "cookie_minutes.txt"
TOKEN_LIST_FILE = Path("/tmp/feishu_all_minutes_tokens.json")
FULL_LIST_FILE = Path("/tmp/feishu_all_minutes_full.json")  # 含 duration（list API 返回，单位毫秒）
STATUS_URL = "https://cunkebao.feishu.cn/minutes/api/status"
REFERER = "https://cunkebao.feishu.cn/minutes/"
MIN_DURATION_MS = 3600 * 1000  # 1 小时，毫秒


def _cookie_from_cursor_browser() -> str:
    try:
        import sqlite3
        import shutil
        import tempfile
        cookie_path = Path.home() / "Library/Application Support/Cursor/Partitions/cursor-browser/Cookies"
        if not cookie_path.exists():
            return ""
        tmp = tempfile.mktemp(suffix=".db")
        shutil.copy2(cookie_path, tmp)
        conn = sqlite3.connect(tmp)
        cur = conn.cursor()
        cur.execute(
            "SELECT name, value FROM cookies WHERE (host_key LIKE '%feishu%' OR host_key LIKE '%cunkebao%') AND value != ''"
        )
        rows = cur.fetchall()
        conn.close()
        Path(tmp).unlink(missing_ok=True)
        if rows:
            s = "; ".join([f"{name}={value}" for name, value in rows])
            if len(s) > 100:
                return s
    except Exception:
        pass
    return ""


def get_cookie() -> str:
    cookie = os.environ.get("FEISHU_MINUTES_COOKIE", "").strip()
    if cookie and len(cookie) > 100 and "PASTE_YOUR" not in cookie:
        return cookie
    if COOKIE_FILE.exists():
        raw = COOKIE_FILE.read_text(encoding="utf-8", errors="ignore").strip().splitlines()
        for line in raw:
            line = line.strip()
            if line and not line.startswith("#") and "PASTE_YOUR" not in line:
                return line
    return _cookie_from_cursor_browser()


def get_csrf(cookie: str) -> str:
    for name in ("bv_csrf_token=", "minutes_csrf_token="):
        i = cookie.find(name)
        if i != -1:
            start = i + len(name)
            end = cookie.find(";", start)
            if end == -1:
                end = len(cookie)
            return cookie[start:end].strip()
    return ""


def duration_to_seconds(val) -> int:
    """把 API 返回的 duration 转为秒数。支持 int、'2小时47分钟52秒'、'2h47m52s' 等。"""
    if val is None:
        return 0
    if isinstance(val, (int, float)):
        # 若大于 10000 可能是毫秒
        v = int(val)
        return v if v < 10000 else v // 1000
    s = str(val).strip()
    if not s:
        return 0
    # 中文：2小时47分钟52秒 / 47分钟52秒
    m = re.search(r"(?:(\d+)\s*[小時时])?\s*(?:(\d+)\s*[分分钟])?\s*(\d+)\s*[秒]?", s)
    if m:
        h, mi, sec = int(m.group(1) or 0), int(m.group(2) or 0), int(m.group(3) or 0)
        return h * 3600 + mi * 60 + sec
    # 英文/数字：2h47m52s 或 10072
    m = re.search(r"(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(\d+)\s*s?", s, re.I)
    if m:
        h, mi, sec = int(m.group(1) or 0), int(m.group(2) or 0), int(m.group(3) or 0)
        return h * 3600 + mi * 60 + sec
    try:
        return int(float(s))
    except ValueError:
        return 0


def fetch_list(cookie: str, max_pages: int = 50) -> list:
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Cookie": cookie,
        "Referer": REFERER,
    }
    if get_csrf(cookie):
        headers["bv-csrf-token"] = get_csrf(cookie)
    all_items = []
    last_ts = ""
    for page in range(1, max_pages + 1):
        url = "https://cunkebao.feishu.cn/minutes/api/space/list?size=50&space_name=1"
        if last_ts:
            url += f"&last_time={last_ts}"
        try:
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
            t = items[-1].get("create_time", "")
            if t:
                try:
                    ts = int(t)
                    dt = datetime.fromtimestamp(ts / 1000) if ts > 1e12 else datetime.fromtimestamp(ts)
                    print(f"  页{page}: +{len(items)} 条, 本页最早: {dt}")
                except Exception:
                    print(f"  页{page}: +{len(items)} 条")
            if len(items) < 50:
                break
            time.sleep(0.35)
        except Exception as e:
            print(f"  页{page} 错误: {e}")
            break
    return all_items


def get_status(cookie: str, object_token: str) -> dict | None:
    """GET status，返回 data 字典；失败返回 None。"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Cookie": cookie,
        "Referer": REFERER,
    }
    if get_csrf(cookie):
        headers["bv-csrf-token"] = get_csrf(cookie)
    url = f"{STATUS_URL}?object_token={object_token}&language=zh_cn&_t={int(time.time() * 1000)}"
    try:
        r = requests.get(url, headers=headers, timeout=20)
        if r.status_code != 200:
            return None
        data = r.json()
        if data.get("code") != 0:
            return None
        return data.get("data")
    except Exception:
        return None


def main() -> int:
    if not requests:
        print("❌ 需要 requests: pip install requests", file=sys.stderr)
        return 1

    list_only = "--list-only" in sys.argv
    max_status = 300
    for i, arg in enumerate(sys.argv):
        if arg == "--max-status" and i + 1 < len(sys.argv):
            try:
                max_status = int(sys.argv[i + 1])
            except ValueError:
                pass
            break

    cookie = get_cookie()
    if not cookie or len(cookie) < 100:
        print("❌ 未配置有效 Cookie（见 SKILL 或 cookie_minutes.txt / Cursor 浏览器）", file=sys.stderr)
        return 1

    # 1) 列表：优先用已保存的完整列表（含 duration，list API 单位毫秒）
    if FULL_LIST_FILE.exists():
        try:
            raw = json.loads(FULL_LIST_FILE.read_text(encoding="utf-8"))
            items = [x for x in raw if x.get("object_token")]
            print(f"✅ 已加载 {len(items)} 条妙记（来自 {FULL_LIST_FILE}）")
        except Exception as e:
            print(f"⚠️ 读取完整列表失败: {e}，改为拉取")
            items = []
    elif TOKEN_LIST_FILE.exists():
        try:
            raw = json.loads(TOKEN_LIST_FILE.read_text(encoding="utf-8"))
            items = [x for x in raw if x.get("object_token")]
            print(f"✅ 已加载 {len(items)} 条（来自 {TOKEN_LIST_FILE}，无 duration，将仅按「有视频」筛选）")
        except Exception:
            items = []
    else:
        items = []

    if not items:
        print("拉取妙记列表…")
        items = fetch_list(cookie, max_pages=100)
        if not items:
            print("❌ 未拉取到任何妙记")
            return 1
        items.sort(key=lambda x: int(x.get("create_time") or 0))
        FULL_LIST_FILE.write_text(json.dumps(items, ensure_ascii=False), encoding="utf-8")
        TOKEN_LIST_FILE.write_text(
            json.dumps(
                [{"object_token": x.get("object_token"), "topic": x.get("topic"), "create_time": x.get("create_time")} for x in items],
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        print(f"✅ 共 {len(items)} 条，已保存到 {FULL_LIST_FILE}")

    # 按 create_time 升序（最早在前）
    items.sort(key=lambda x: int(x.get("create_time") or 0))
    if items:
        t0 = int(items[0].get("create_time") or 0)
        t1 = int(items[-1].get("create_time") or 0)
        for ts, label in [(t0, "最早"), (t1, "最新")]:
            dt = datetime.fromtimestamp(ts / 1000) if ts > 1e12 else datetime.fromtimestamp(ts)
            print(f"  {label}一条: {dt} | {items[0].get('topic', '')[:50] if label == '最早' else items[-1].get('topic', '')[:50]}")

    if list_only:
        return 0

    # 2) 用 list 的 duration（毫秒）筛「时长≥1小时」；再按 create_time 升序，逐条查 status 筛「有视频」
    dur_ms_key = "duration"
    has_duration = any(it.get(dur_ms_key) is not None for it in items)
    if has_duration:
        long_items = [it for it in items if (int(it.get(dur_ms_key) or 0)) >= MIN_DURATION_MS]
        print(f"\n列表中含 duration≥1小时 的共 {len(long_items)} 条（按 create_time 从早到晚检查是否有视频）")
    else:
        long_items = items
        print("\n⚠️ 列表无 duration 字段（可能来自旧版 token 列表），按 create_time 从早到晚检查「有视频」；时长请手动核对。")

    long_items.sort(key=lambda x: int(x.get("create_time") or 0))
    to_check = long_items[: max_status]
    print(f"对最早 {len(to_check)} 条请求 status（需含 video_download_url）…")
    candidates = []
    for i, it in enumerate(to_check):
        token = it.get("object_token")
        if not token:
            continue
        create_time = int(it.get("create_time") or 0)
        topic = (it.get("topic") or "")[:60]
        dur_ms = int(it.get(dur_ms_key) or 0)
        dur_sec = dur_ms // 1000 if dur_ms else 0
        data = get_status(cookie, token)
        if not data:
            if (i + 1) % 50 == 0:
                print(f"  已查 {i + 1}/{len(to_check)} …")
            time.sleep(0.2)
            continue
        video_info = data.get("video_info") or {}
        video_url = video_info.get("video_download_url") if isinstance(video_info, dict) else None
        if not video_url or not isinstance(video_url, str):
            time.sleep(0.2)
            continue
        dt_str = ""
        if create_time:
            dt_str = (datetime.fromtimestamp(create_time / 1000) if create_time > 1e12 else datetime.fromtimestamp(create_time)).strftime("%Y-%m-%d %H:%M")
        # 按 object_token 去重，同一场只记一次
        if not any(c["object_token"] == token for c in candidates):
            candidates.append({
                "object_token": token,
                "topic": topic,
                "create_time": create_time,
                "date_str": dt_str,
                "duration_sec": dur_sec,
                "video_url": video_url[:80] + "…" if len(video_url) > 80 else video_url,
            })
            print(f"  ✓ 符合: {dt_str} | {dur_sec}s ({dur_sec // 3600}h{(dur_sec % 3600) // 60}m) | {topic[:40]}")
        time.sleep(0.25)

    if not candidates:
        print("\n未找到「最早 + 时长≥1小时 + 有画面」的妙记（在当前列表与检查条数范围内）。")
        return 0

    first = candidates[0]
    print("\n" + "=" * 60)
    print("【最早的一条】时长>1小时且含视频：")
    print(f"  标题: {first['topic']}")
    print(f"  日期: {first['date_str']}")
    print(f"  时长: {first['duration_sec']} 秒（{first['duration_sec'] // 3600} 小时 {(first['duration_sec'] % 3600) // 60} 分钟）")
    print(f"  object_token: {first['object_token']}")
    print(f"  链接: https://cunkebao.feishu.cn/minutes/{first['object_token']}")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
