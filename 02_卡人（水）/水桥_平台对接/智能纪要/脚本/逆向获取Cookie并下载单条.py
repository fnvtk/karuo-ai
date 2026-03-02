#!/usr/bin/env python3
"""
卡若AI 逆向获取：从本机浏览器/Cookie 文件自动取 Cookie，不弹窗，直接下载单条妙记文字+视频。
与 download_soul_minutes_101_to_103 同源（cookie_minutes.txt → 环境变量 → browser_cookie3 → Doubao）。
用法: python3 逆向获取Cookie并下载单条.py "https://cunkebao.feishu.cn/minutes/obcn6yjg6866c3gl4ibd72vr" "soul 派对 113场 20260302"
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
OUT_DIR = Path("/Users/karuo/Documents/聊天记录/soul")
COOKIE_FILE = SCRIPT_DIR / "cookie_minutes.txt"


def get_cookie() -> str:
    """与 download_soul_minutes_101_to_103 一致：cookie_minutes.txt → 环境变量 → 本机浏览器(Doubao)。"""
    if COOKIE_FILE.exists():
        for line in COOKIE_FILE.read_text(encoding="utf-8", errors="ignore").strip().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "PASTE_YOUR" not in line and len(line) > 100:
                return line
    c = __import__("os").environ.get("FEISHU_MINUTES_COOKIE", "").strip()
    if c and len(c) > 100:
        return c
    # browser_cookie3
    try:
        import browser_cookie3
        for domain in ("cunkebao.feishu.cn", "feishu.cn", ".feishu.cn"):
            for loader in (browser_cookie3.safari, browser_cookie3.chrome, browser_cookie3.chromium, browser_cookie3.firefox, browser_cookie3.edge):
                try:
                    cj = loader(domain_name=domain)
                    s = "; ".join(f"{c.name}={c.value}" for c in cj)
                    if len(s) > 100:
                        return s
                except Exception:
                    continue
    except ImportError:
        pass
    # Doubao
    try:
        import subprocess, shutil, tempfile, sqlite3, hashlib
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


def main() -> int:
    url_or_token = sys.argv[1] if len(sys.argv) > 1 else ""
    title = sys.argv[2] if len(sys.argv) > 2 else ""
    token = (re.search(r"/minutes/([a-zA-Z0-9]+)", url_or_token).group(1) if "/minutes/" in url_or_token else url_or_token) or url_or_token
    if not token or len(token) < 20:
        print("用法: python3 逆向获取Cookie并下载单条.py <妙记URL或token> [标题]", file=sys.stderr)
        return 1
    if not title:
        title = f"妙记_{token[:12]}"

    print("🔄 逆向获取 Cookie（cookie_minutes.txt → 环境变量 → 本机浏览器/Doubao）…")
    cookie = get_cookie()
    if not cookie:
        print("❌ 未获取到 Cookie。请确保：cookie_minutes.txt 有内容，或本机 Chrome/Safari/Doubao 已登录 cunkebao.feishu.cn", file=sys.stderr)
        return 1
    print("   Cookie 长度:", len(cookie))
    # 写入以便后续脚本复用
    COOKIE_FILE.write_text(cookie + "\n# 逆向获取", encoding="utf-8")
    print("   已写入 cookie_minutes.txt")

    sys.path.insert(0, str(SCRIPT_DIR))
    from feishu_minutes_export_github import export_transcript
    from feishu_minutes_download_video import get_video_url, download_video, get_cookie as get_cookie_video, make_headers

    # 1) 文字
    print("📄 下载文字…")
    text = export_transcript(cookie, token)
    if not text:
        try:
            from feishu_minutes_one_url import export_via_playwright_page
            print("   Cookie 导出 401，改用 Playwright 页面内获取…")
            text = export_via_playwright_page(token, title=title, wait_sec=45)
        except Exception as e:
            print("   Playwright 兜底失败:", e, file=sys.stderr)
    if text:
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        safe = re.sub(r'[\\/*?:"<>|]', "_", title)
        path = OUT_DIR / f"{safe}.txt"
        path.write_text(f"标题: {title}\nobject_token: {token}\n\n文字记录:\n\n{text}", encoding="utf-8")
        print("   ✅", path.name)
    else:
        print("   ❌ 文字导出失败（可能 401）")

    # 2) 视频
    print("📹 下载视频…")
    video_url, _title = get_video_url(cookie, token)
    if video_url:
        ref = "https://cunkebao.feishu.cn/minutes/"
        headers = make_headers(cookie, ref)
        safe = re.sub(r'[\\/*?:"<>|]', "_", title or _title or token[:12])
        out_path = OUT_DIR / f"{safe}.mp4"
        if download_video(video_url, out_path, headers):
            print("   ✅", out_path.name, f"({out_path.stat().st_size / (1024*1024):.1f} MB)")
        else:
            print("   ❌ 视频下载失败")
    else:
        print("   ❌ 未获取到视频链接")

    return 0 if text or video_url else 1


if __name__ == "__main__":
    sys.exit(main())
