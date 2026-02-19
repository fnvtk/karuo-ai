#!/usr/bin/env python3
"""
拉取妙记列表，按场次范围筛选并下载文字记录到 soul 目录。
默认 101～103 场；可用 --from 90 --to 102 指定 90～102 场等。
依赖 Cookie（cookie_minutes.txt，需含 bv_csrf_token）。与 feishu_minutes_export_github 同源。
"""
from __future__ import annotations

import argparse
import re
import sys
import time
from pathlib import Path
from datetime import datetime

try:
    import requests
except ImportError:
    requests = None

SCRIPT_DIR = Path(__file__).resolve().parent
COOKIE_FILE = SCRIPT_DIR / "cookie_minutes.txt"
OUT_DIR = Path("/Users/karuo/Documents/聊天记录/soul")

# 与 feishu_minutes_export_github 一致
LIST_URL = "https://meetings.feishu.cn/minutes/api/space/list"
EXPORT_URL = "https://meetings.feishu.cn/minutes/api/export"
REFERER = "https://meetings.feishu.cn/minutes/me"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36"

FIELD_PATTERN = re.compile(r"第?(\d{2,3})场", re.I)


def _cookie_from_browser() -> str:
    """全自动：从本机浏览器读取飞书 Cookie，无需用户手动复制。"""
    import os as _os
    # 1) 环境变量
    c = _os.environ.get("FEISHU_MINUTES_COOKIE", "").strip()
    if c and len(c) > 100 and "PASTE_YOUR" not in c:
        return c
    # 2) browser_cookie3
    try:
        import browser_cookie3
        for domain in ("cunkebao.feishu.cn", "feishu.cn", ".feishu.cn"):
            for loader in (browser_cookie3.safari, browser_cookie3.chrome, browser_cookie3.chromium, browser_cookie3.firefox, browser_cookie3.edge):
                try:
                    cj = loader(domain_name=domain)
                    parts = [f"{c.name}={c.value}" for c in cj]
                    s = "; ".join(parts)
                    if len(s) > 100:
                        return s
                except Exception:
                    continue
    except ImportError:
        pass
    # 3) Doubao 浏览器 Cookie（macOS）
    try:
        import subprocess
        import shutil
        import tempfile
        import sqlite3
        import hashlib
        for name in ("Doubao Browser Safe Storage", "Doubao Safe Storage"):
            try:
                key = subprocess.run(["security", "find-generic-password", "-s", name, "-w"], capture_output=True, text=True, timeout=5).stdout.strip()
                if not key:
                    continue
            except Exception:
                continue
            for profile in ("Default", "Profile 1", "Profile 2", "Profile 3"):
                db = Path.home() / "Library/Application Support/Doubao" / profile / "Cookies"
                if not db.exists():
                    continue
                try:
                    tmp = tempfile.mktemp(suffix=".db")
                    shutil.copy2(db, tmp)
                    conn = sqlite3.connect(tmp)
                    cur = conn.cursor()
                    cur.execute("SELECT host_key, name, encrypted_value FROM cookies WHERE host_key LIKE '%feishu%' OR host_key LIKE '%cunkebao%'")
                    rows = cur.fetchall()
                    conn.close()
                    Path(tmp).unlink(missing_ok=True)
                except Exception:
                    continue
                if not rows:
                    continue
                from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
                derived = hashlib.pbkdf2_hmac("sha1", key.encode("utf-8"), b"saltysalt", 1003, dklen=16)
                parts = []
                for host, name, enc in rows:
                    if enc[:3] != b"v10":
                        continue
                    raw = enc[3:]
                    dec = Cipher(algorithms.AES(derived), modes.CBC(b" " * 16)).decryptor()
                    pt = dec.update(raw) + dec.finalize()
                    pad = pt[-1]
                    if isinstance(pad, int) and 1 <= pad <= 16:
                        pt = pt[:-pad]
                    for i in range(min(len(pt), 48)):
                        if i + 4 <= len(pt) and all(32 <= pt[j] < 127 for j in range(i, min(i + 8, len(pt)))):
                            val = pt[i:].decode("ascii", errors="ignore")
                            if val and "\x00" not in val:
                                parts.append(f"{name}={val}")
                            break
                if len(parts) > 5:
                    return "; ".join(parts)
    except Exception:
        pass
    return ""


def get_cookie() -> str:
    """优先级：cookie_minutes.txt → 环境变量 → 自动从浏览器读取（全自动，无需用户手动）。"""
    if COOKIE_FILE.exists():
        for line in COOKIE_FILE.read_text(encoding="utf-8", errors="ignore").strip().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "PASTE_YOUR" not in line and len(line) > 100:
                return line
    c = _cookie_from_browser()
    if c:
        return c
    return ""


def get_bv_csrf(cookie: str) -> str:
    key = "bv_csrf_token="
    i = cookie.find(key)
    if i == -1:
        return ""
    start = i + len(key)
    end = cookie.find(";", start)
    if end == -1:
        end = len(cookie)
    return cookie[start:end].strip()


def build_headers(cookie: str, require_bv: bool = False) -> dict:
    """require_bv=True 时强制 bv_csrf_token 36 位；否则能带就带，不带也尝试请求（cunkebao 等可能可用）。"""
    h = {
        "User-Agent": USER_AGENT,
        "cookie": cookie,
        "referer": REFERER,
        "content-type": "application/x-www-form-urlencoded",
    }
    bv = get_bv_csrf(cookie)
    if len(bv) == 36:
        h["bv-csrf-token"] = bv
    elif require_bv:
        raise ValueError("Cookie 需包含 bv_csrf_token（36 位）。请从妙记 list 请求复制完整 Cookie。")
    return h


def fetch_list(cookie: str, space_name: int = 1, size: int = 50, last_ts=None, base_url: str = None) -> list:
    """拉取妙记列表（分页）。base_url 默认 meetings，可改为 cunkebao。"""
    base = base_url or LIST_URL
    url = f"{base}?size={size}&space_name={space_name}"
    if last_ts:
        url += f"&timestamp={last_ts}"
    headers = build_headers(cookie, require_bv=False)
    r = requests.get(url, headers=headers, timeout=30)
    data = r.json()
    if data.get("code") != 0:
        raise RuntimeError(data.get("msg", "list api error") or r.text[:200])
    inner = data.get("data", {})
    lst = inner.get("list", [])
    out = list(lst)
    if inner.get("has_more") and lst:
        last = lst[-1]
        ts = last.get("share_time") or last.get("create_time")
        if ts:
            time.sleep(0.3)
            out.extend(fetch_list(cookie, space_name, size, ts, base_url))
    return out


def filter_by_field_range(all_items: list, from_num: int, to_num: int) -> list:
    """保留标题中含「第N场」且 N 在 [from_num, to_num] 的项（去重、按场次排序）。"""
    seen = set()
    matched = []
    for item in all_items:
        topic = (item.get("topic") or "").strip()
        m = FIELD_PATTERN.search(topic)
        if not m:
            continue
        num = int(m.group(1))
        if not (from_num <= num <= to_num):
            continue
        token = item.get("object_token") or item.get("minute_token")
        if not token or token in seen:
            continue
        seen.add(token)
        matched.append((num, topic, token, item.get("create_time"), item.get("share_time")))
    return sorted(matched, key=lambda x: x[0])


def export_transcript(cookie: str, object_token: str) -> str | None:
    """尝试 meetings 与 cunkebao 两个导出域名。"""
    params = {"object_token": object_token, "add_speaker": "true", "add_timestamp": "false", "format": 2}
    for export_base in (EXPORT_URL, "https://cunkebao.feishu.cn/minutes/api/export"):
        ref = "https://cunkebao.feishu.cn/minutes/" if "cunkebao" in export_base else REFERER
        headers = build_headers(cookie, require_bv=False)
        headers["referer"] = ref
        try:
            r = requests.post(export_base, params=params, headers=headers, timeout=20)
            r.encoding = "utf-8"
            if r.status_code != 200:
                continue
            text = (r.text or "").strip()
            if not text or len(text) < 20:
                continue
            if text.startswith("{"):
                try:
                    j = r.json()
                    d = j.get("data")
                    if isinstance(d, str):
                        return d
                    if isinstance(d, dict):
                        return d.get("content") or d.get("text") or d.get("transcript")
                except Exception:
                    pass
                continue
            if "<html" in text.lower()[:100] or "Something went wrong" in text:
                continue
            return text
        except Exception:
            continue
    return None


def save_txt(output_dir: Path, title: str, body: str, date_str: str | None = None) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    date_str = date_str or datetime.now().strftime("%Y%m%d")
    safe_title = re.sub(r'[\\/*?:"<>|]', "_", (title or "妙记"))
    path = output_dir / f"{safe_title}_{date_str}.txt"
    path.write_text(f"日期: {date_str}\n标题: {title}\n\n文字记录:\n\n{body}", encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="soul 派对妙记按场次范围下载")
    parser.add_argument("--from", "-f", type=int, default=101, dest="from_num", help="起始场次（含）")
    parser.add_argument("--to", "-t", type=int, default=103, dest="to_num", help="结束场次（含）")
    args = parser.parse_args()
    from_num, to_num = args.from_num, args.to_num
    if from_num > to_num:
        from_num, to_num = to_num, from_num

    if not requests:
        print("请安装 requests: pip install requests", file=sys.stderr)
        return 1
    cookie = get_cookie()
    if not cookie:
        print("未获取到 Cookie（已尝试 cookie_minutes.txt、环境变量、本机浏览器）。请确保已登录飞书妙记并在 cookie_minutes.txt 第一行粘贴 list 请求的 Cookie。", file=sys.stderr)
        return 1
    try:
        build_headers(cookie, require_bv=False)
    except ValueError as e:
        print(e, file=sys.stderr)
        return 1

    list_cache = SCRIPT_DIR / f"soul_minutes_{from_num}_{to_num}_list.txt"
    items = []

    # 优先从已保存列表加载（全自动重跑：无需再拉列表，直接导出）
    if list_cache.exists():
        try:
            lines = list_cache.read_text(encoding="utf-8").strip().splitlines()
            for line in lines:
                if line.startswith("#") or not line.strip():
                    continue
                parts = line.split("\t")
                if len(parts) >= 3:
                    items.append((int(parts[0]), parts[1], parts[2], None, None))
            if items:
                items = sorted(items, key=lambda x: x[0])
                print(f"📌 从缓存加载 {len(items)} 场，仅做导出（全自动）")
        except Exception:
            pass

    if not items:
        print(f"📋 拉取妙记列表（场次范围 {from_num}～{to_num}）…")
        all_items = []
        for base in (LIST_URL, "https://cunkebao.feishu.cn/minutes/api/space/list"):
            try:
                all_items = fetch_list(cookie, base_url=base)
                if all_items:
                    break
            except Exception as e:
                if base == LIST_URL:
                    print("  meetings 列表失败，尝试 cunkebao…", e)
                continue
        if not all_items:
            print("拉取列表失败，请确认 Cookie 有效且来自妙记 list 请求。", file=sys.stderr)
            return 1
        items = filter_by_field_range(all_items, from_num, to_num)
        if not items:
            print(f"未在列表中匹配到第{from_num}～{to_num}场。")
            return 0

    print(f"📌 匹配到 {len(items)} 场: {[x[1] for x in items]}")
    out_dir = OUT_DIR.resolve()
    saved = 0
    for num, topic, token, create_ts, share_ts in items:
        # 若已存在完整文字记录则跳过（文件名需像妙记：含 第N场 且含 soul/派对，避免误判说明类文件）
        skip = False
        for f in out_dir.glob("*.txt"):
            if f"第{num}场" not in f.name and (f"{num}场" not in f.name or ("soul" not in f.name and "派对" not in f.name)):
                continue
            try:
                t = f.read_text(encoding="utf-8", errors="ignore")
                if len(t) > 5000 and "说话人" in t[:5000]:
                    skip = True
                    print(f"  跳过（已存在）: {topic}")
                    saved += 1
                    break
            except Exception:
                pass
        if skip:
            continue
        else:
            text = export_transcript(cookie, token)
            if not text:
                print(f"  ❌ 导出失败: {topic} ({token})")
                continue
            ts = create_ts or share_ts
            if ts:
                try:
                    if ts > 1e10:
                        ts = ts / 1000
                    date_str = datetime.fromtimestamp(ts).strftime("%Y%m%d")
                except Exception:
                    date_str = datetime.now().strftime("%Y%m%d")
            else:
                date_str = datetime.now().strftime("%Y%m%d")
            path = save_txt(out_dir, topic, text, date_str)
            print(f"  ✅ {topic} -> {path.name}")
            saved += 1
        time.sleep(0.5)

    # 若有导出失败且本次是拉列表得到的 items，保存列表供 Cookie 配置好后重跑（仅做导出）
    failed = len(items) - saved
    if failed > 0 and not list_cache.exists():
        cache_lines = ["# 场次\t标题\tobject_token", "# 配置 cookie_minutes.txt 后重新执行本脚本即可只做导出"]
        for num, topic, token, _, _ in items:
            cache_lines.append(f"{num}\t{topic}\t{token}")
        list_cache.write_text("\n".join(cache_lines), encoding="utf-8")
        print(f"📁 已保存列表到 {list_cache.name}，配置 cookie_minutes.txt（从妙记 list 请求复制 Cookie）后重新执行即可只做导出。")

    print(f"✅ 共处理 {saved}/{len(items)} 场，保存目录: {out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
