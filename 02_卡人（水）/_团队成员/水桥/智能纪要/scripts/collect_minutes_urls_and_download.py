#!/usr/bin/env python3
"""
纯接口+命令行：从 urls 文件批量下载妙记 TXT，不打开浏览器。

用法：
  # 使用默认 urls_soul_party.txt，输出到 soul_party_100_txt/
  python3 collect_minutes_urls_and_download.py

  # 指定链接文件和输出目录
  python3 collect_minutes_urls_and_download.py --list urls.txt --output ./out_txt

  # 凭证用环境变量（可选，不设则用脚本内置默认）
  FEISHU_APP_ID=xxx FEISHU_APP_SECRET=yyy python3 collect_minutes_urls_and_download.py --list urls.txt

飞书无「妙记列表」API，链接需自行整理到文件（每行一个妙记 URL 或 minute_token）。
"""

import argparse
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
URLS_FILE_DEFAULT = SCRIPT_DIR / "urls_soul_party.txt"
OUTPUT_DEFAULT = ROOT / "soul_party_100_txt"


def load_urls(path: Path) -> list[str]:
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8", errors="ignore")
    lines = [L.strip() for L in text.splitlines() if L.strip() and not L.strip().startswith("#")]
    return [u for u in lines if "/minutes/" in u or (u.startswith("http") and "feishu" in u) or (len(u) > 10 and u.isalnum())]


def main():
    parser = argparse.ArgumentParser(description="纯接口批量下载妙记 TXT（不打开浏览器）")
    parser.add_argument("--list", "-l", type=str, default=str(URLS_FILE_DEFAULT), help="妙记链接列表文件，每行一个 URL 或 token")
    parser.add_argument("--output", "-o", type=str, default=str(OUTPUT_DEFAULT), help="TXT 输出目录")
    parser.add_argument("--skip-existing", action="store_true", default=True, help="已存在同名 TXT 则跳过")
    parser.add_argument("--no-skip-existing", action="store_false", dest="skip_existing", help="不跳过，全部覆盖")
    args = parser.parse_args()

    list_path = Path(args.list).resolve()
    if not list_path.exists():
        print(f"❌ 链接文件不存在: {list_path}")
        print("   请创建该文件，每行一个妙记链接（如 https://xxx.feishu.cn/minutes/xxx）")
        return 1

    urls = load_urls(list_path)
    if not urls:
        print(f"❌ 文件中无有效链接: {list_path}")
        print("   每行一个妙记 URL 或 minute_token，# 开头行为注释")
        return 1

    out_path = Path(args.output).resolve()
    out_path.mkdir(parents=True, exist_ok=True)
    print(f"📋 链接数: {len(urls)} | 输出: {out_path}\n")

    cmd = [
        sys.executable,
        str(SCRIPT_DIR / "batch_download_minutes_txt.py"),
        "--list", str(list_path),
        "--output", str(out_path),
    ]
    if args.skip_existing:
        cmd.append("--skip-existing")

    r = subprocess.run(cmd, cwd=str(SCRIPT_DIR))
    if r.returncode == 0:
        print(f"\n✅ 完成。TXT 保存在: {out_path}")
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
