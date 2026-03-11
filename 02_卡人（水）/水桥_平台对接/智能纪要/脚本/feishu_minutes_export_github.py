#!/usr/bin/env python3
"""
飞书妙记单条导出（核心逻辑来自 GitHub bingsanyu/feishu_minutes）

- Cookie 必须从「飞书妙记」列表请求中获取，且包含 bv_csrf_token（36 位）。
- 获取方式：打开 https://meetings.feishu.cn/minutes/home → F12 → 网络 → 找到 list?size=20&space_name= 请求 → 复制请求头中的 Cookie。
- 若使用 cunkebao 等子域，请打开对应空间的妙记主页，从 list 请求复制 Cookie。

用法:
  python3 feishu_minutes_export_github.py --cookie "..." --object-token obcnxrkz6k459k669544228c -o /path/to/soul
  或：cookie 放在脚本同目录 cookie_minutes.txt 第一行
  python3 feishu_minutes_export_github.py --object-token obcnxrkz6k459k669544228c -o /path/to/soul
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from datetime import datetime

try:
    import requests
except ImportError:
    requests = None

SCRIPT_DIR = Path(__file__).resolve().parent
COOKIE_FILE = SCRIPT_DIR / "cookie_minutes.txt"

# 与 bingsanyu/feishu_minutes 一致
EXPORT_URL = "https://meetings.feishu.cn/minutes/api/export"
REFERER = "https://meetings.feishu.cn/minutes/me"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36"


def _cookie_from_browser() -> str:
    """从本机浏览器读取飞书 Cookie（与 download_soul_minutes_101_to_103 一致）。"""
    c = os.environ.get("FEISHU_MINUTES_COOKIE", "").strip()
    if c and len(c) > 100 and "PASTE_YOUR" not in c:
        return c
    try:
        import browser_cookie3
        for domain in ("cunkebao.feishu.cn", "feishu.cn", ".feishu.cn"):
            for loader in (browser_cookie3.safari, browser_cookie3.chrome, browser_cookie3.chromium, browser_cookie3.firefox, browser_cookie3.edge):
                try:
                    cj = loader(domain_name=domain)
                    s = "; ".join([f"{c.name}={c.value}" for c in cj])
                    if len(s) > 100:
                        return s
                except Exception:
                    continue
    except ImportError:
        pass
    # Cursor 内置浏览器 Cookie（明文 SQLite，无需解密）
    try:
        import shutil as _shutil
        import tempfile as _tmpmod
        import sqlite3 as _sql3
        cursor_cookie = Path.home() / "Library/Application Support/Cursor/Partitions/cursor-browser/Cookies"
        if cursor_cookie.exists():
            _tmp = _tmpmod.mktemp(suffix=".db")
            _shutil.copy2(cursor_cookie, _tmp)
            _conn = _sql3.connect(_tmp)
            _cur = _conn.cursor()
            _cur.execute("SELECT name, value FROM cookies WHERE (host_key LIKE '%feishu%' OR host_key LIKE '%cunkebao%') AND value != ''")
            _rows = _cur.fetchall()
            _conn.close()
            Path(_tmp).unlink(missing_ok=True)
            if _rows:
                _s = "; ".join([f"{n}={v}" for n, v in _rows])
                if len(_s) > 100:
                    return _s
    except Exception:
        pass
    # Doubao 浏览器 Cookie（需解密）
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


def get_cookie_from_args_or_file(cookie_arg: str | None) -> str:
    if cookie_arg and cookie_arg.strip() and "PASTE_YOUR" not in cookie_arg:
        return cookie_arg.strip()
    if COOKIE_FILE.exists():
        raw = COOKIE_FILE.read_text(encoding="utf-8", errors="ignore").strip().splitlines()
        for line in raw:
            line = line.strip()
            if line and not line.startswith("#") and "PASTE_YOUR" not in line:
                return line
    return _cookie_from_browser()


def get_bv_csrf_token(cookie: str) -> str:
    """从 cookie 字符串中解析 bv_csrf_token 或 minutes_csrf_token（36 字符，兼容 GitHub bingsanyu/feishu_minutes）。"""
    for key in ("bv_csrf_token=", "minutes_csrf_token="):
        i = cookie.find(key)
        if i == -1:
            continue
        start = i + len(key)
        end = cookie.find(";", start)
        if end == -1:
            end = len(cookie)
        val = cookie[start:end].strip()
        if len(val) == 36:
            return val
    return ""


def build_headers(cookie: str, require_bv: bool = True):
    """请求头。require_bv=True 时必须有 36 位 bv_csrf_token；False 时能带就带。"""
    bv = get_bv_csrf_token(cookie)
    h = {
        "User-Agent": USER_AGENT,
        "cookie": cookie,
        "referer": REFERER,
        "content-type": "application/x-www-form-urlencoded",
    }
    if len(bv) == 36:
        h["bv-csrf-token"] = bv
    if require_bv and len(bv) != 36:
        raise ValueError(
            "Cookie 中未包含有效的 bv_csrf_token（需 36 位）。"
            "请从 飞书妙记主页 → F12 → 网络 → list?size=20& 请求 中复制完整 Cookie。"
        )
    return h


def export_transcript(cookie: str, object_token: str, format_txt: bool = True, add_speaker: bool = True, add_timestamp: bool = False) -> str | None:
    """
    调用妙记导出接口。先试 meetings，再试 cunkebao；请求头可无 bv_csrf_token（能带就带）。
    返回导出的文本，失败返回 None。
    """
    if not requests:
        return None
    params = {
        "object_token": object_token,
        "add_speaker": "true" if add_speaker else "false",
        "add_timestamp": "true" if add_timestamp else "false",
        "format": 2 if format_txt else 3,
    }
    headers = build_headers(cookie, require_bv=False)
    for url, ref in [
        (EXPORT_URL, REFERER),
        ("https://cunkebao.feishu.cn/minutes/api/export", "https://cunkebao.feishu.cn/minutes/"),
    ]:
        headers = {**headers, "referer": ref}
        try:
            r = requests.post(url, params=params, headers=headers, timeout=20)
            r.encoding = "utf-8"
            if r.status_code != 200:
                continue
            text = (r.text or "").strip()
            if not text or len(text) < 20:
                continue
            if text.startswith("{"):
                try:
                    j = r.json()
                    data = j.get("data")
                    if isinstance(data, str):
                        return data
                    if isinstance(data, dict):
                        return data.get("content") or data.get("text") or data.get("transcript")
                except Exception:
                    pass
                continue
            if "<html" in text.lower()[:100] or "Something went wrong" in text:
                continue
            return text
        except Exception:
            continue
    return None


def extract_token_from_url(url_or_token: str) -> str:
    m = re.search(r"/minutes/([a-zA-Z0-9]+)", url_or_token)
    if m:
        return m.group(1)
    return url_or_token.strip()


def save_txt(output_dir: Path, title: str, body: str, date_str: str | None = None) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    date_str = date_str or datetime.now().strftime("%Y%m%d")
    safe_title = re.sub(r'[\\/*?:"<>|]', "_", (title or "妙记"))
    filename = f"{safe_title}_{date_str}.txt"
    path = output_dir / filename
    header = f"日期: {date_str}\n标题: {title}\n\n文字记录:\n\n" if title else f"日期: {date_str}\n\n文字记录:\n\n"
    path.write_text(header + body, encoding="utf-8")
    return path


def main() -> int:
    if not requests:
        print("请安装 requests: pip install requests", file=sys.stderr)
        return 1

    parser = argparse.ArgumentParser(description="飞书妙记单条导出（GitHub bingsanyu/feishu_minutes 逻辑）")
    parser.add_argument("url_or_token", nargs="?", default="", help="妙记链接或 object_token")
    parser.add_argument("--cookie", "-c", default="", help="完整 Cookie（或从 cookie_minutes.txt 读取）")
    parser.add_argument("--object-token", "-t", default="", help="妙记 object_token")
    parser.add_argument("--output", "-o", default="/Users/karuo/Documents/聊天记录/soul", help="输出目录（默认: 聊天记录/soul）")
    parser.add_argument("--title", default="", help="可选标题（否则用默认文件名）")
    parser.add_argument("--no-speaker", action="store_true", help="字幕不包含说话人")
    parser.add_argument("--timestamp", action="store_true", help="字幕包含时间戳")
    args = parser.parse_args()

    cookie = get_cookie_from_args_or_file(args.cookie)
    if not cookie:
        print("未配置 Cookie。请：", file=sys.stderr)
        print("  1. 打开 https://meetings.feishu.cn/minutes/home（或你空间的妙记主页）", file=sys.stderr)
        print("  2. F12 → 网络 → 找到 list?size=20&space_name= 请求 → 复制请求头中的 Cookie", file=sys.stderr)
        print("  3. 粘贴到脚本同目录 cookie_minutes.txt 第一行，或使用 --cookie \"...\"", file=sys.stderr)
        return 1

    object_token = args.object_token or extract_token_from_url(args.url_or_token)
    if not object_token:
        object_token = "obcnyg5nj2l8q281v32de6qz"  # 104 场

    try:
        build_headers(cookie, require_bv=False)
    except ValueError as e:
        print(str(e), file=sys.stderr)
        return 1

    print(f"📝 object_token: {object_token}")
    print("📡 导出中（meetings / cunkebao）…")
    text = export_transcript(cookie, object_token, format_txt=True, add_speaker=not args.no_speaker, add_timestamp=args.timestamp)
    if not text:
        print("❌ 导出失败。请确认：", file=sys.stderr)
        print("  1. Cookie 来自「妙记列表 list 请求」且包含 bv_csrf_token（36 位）", file=sys.stderr)
        print("  2. 该妙记在当前登录空间内可访问", file=sys.stderr)
        return 1

    out_dir = Path(args.output).resolve()
    title = args.title or f"妙记_{object_token}"
    path = save_txt(out_dir, title, text)
    print(f"✅ 已保存: {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
