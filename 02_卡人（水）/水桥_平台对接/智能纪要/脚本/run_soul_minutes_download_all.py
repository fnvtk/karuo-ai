#!/usr/bin/env python3
"""
一键执行：先尝试用 Cookie 拉取全部 soul/派对 妙记链接，再通过飞书 API 批量下载 TXT，直到当前列表全部下载完成。
全命令行，使用 FEISHU_APP_ID / FEISHU_APP_SECRET（及可选 FEISHU_MINUTES_COOKIE 或 cookie_minutes.txt）。
"""
import os
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
OUT_DIR = ROOT / "soul_party_100_txt"
URLS_FILE = SCRIPT_DIR / "urls_soul_party.txt"


def load_urls():
    if not URLS_FILE.exists():
        return []
    text = URLS_FILE.read_text(encoding="utf-8", errors="ignore")
    lines = [L.strip() for L in text.splitlines() if L.strip() and not L.strip().startswith("#")]
    return [u for u in lines if "/minutes/" in u or ("feishu" in u and "http" in u)]


def main():
    os.chdir(SCRIPT_DIR)
    # 1) 若有 Cookie，先拉取列表并更新 urls_soul_party.txt
    cookie_file = SCRIPT_DIR / "cookie_minutes.txt"
    if cookie_file.exists() and cookie_file.read_text(encoding="utf-8", errors="ignore").strip():
        print("检测到 cookie_minutes.txt，拉取妙记列表（派对/受/soul）…")
        r = subprocess.run([sys.executable, "fetch_minutes_list_by_cookie.py"], capture_output=True, text=True, timeout=120)
        if r.returncode == 0 and r.stdout:
            print(r.stdout)
    elif os.environ.get("FEISHU_MINUTES_COOKIE", "").strip():
        print("使用 FEISHU_MINUTES_COOKIE 拉取妙记列表…")
        r = subprocess.run([sys.executable, "fetch_minutes_list_by_cookie.py"], capture_output=True, text=True, timeout=120, env={**os.environ})
        if r.returncode == 0 and r.stdout:
            print(r.stdout)

    urls = load_urls()
    if not urls:
        print("urls_soul_party.txt 中无有效链接。请放入妙记 URL（每行一个）或配置 Cookie 后重试。")
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"共 {len(urls)} 条妙记链接，开始通过 API 批量下载 TXT…")
    cmd = [
        sys.executable, "batch_download_minutes_txt.py",
        "--list", str(URLS_FILE),
        "--output", str(OUT_DIR),
        "--skip-existing",
    ]
    r = subprocess.run(cmd, timeout=600)
    if r.returncode != 0:
        return r.returncode
    print(f"全部处理完成。TXT 目录: {OUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
