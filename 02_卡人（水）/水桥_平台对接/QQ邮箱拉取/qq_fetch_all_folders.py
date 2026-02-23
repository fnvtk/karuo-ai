#!/usr/bin/env python3
"""全量拉取所有 IMAP 可见文件夹"""
import json
import sys
from pathlib import Path
from qq_mail_fetch import fetch_emails, list_folders, AUTH_CODE

OUT = Path("/Users/karuo/Documents/卡若Ai的文件夹/报告")
OUT.mkdir(parents=True, exist_ok=True)

def safe_name(f):
    return f.replace("/", "_").replace(" ", "_").replace("&", "x")[:40]

def main():
    if not AUTH_CODE:
        print("无授权码")
        return 1
    folders = list_folders()
    all_emails = []
    stats = {}
    for f in folders:
        try:
            emails = fetch_emails(days=365*20, limit=0, all_mail=True, progress=False, folder=f)
            stats[f] = len(emails)
            for e in emails:
                e["_folder"] = f
            all_emails.extend(emails)
            print(f"  {f}: {len(emails)}")
        except Exception as ex:
            print(f"  {f}: 失败 {ex}")
            stats[f] = 0
    with open(OUT / "qq_all_folders_export.json", "w", encoding="utf-8") as fp:
        json.dump(all_emails, fp, ensure_ascii=False, indent=None)
    with open(OUT / "qq_folders_stats.json", "w", encoding="utf-8") as fp:
        json.dump(stats, fp, ensure_ascii=False, indent=2)
    print(f"\n合计: {len(all_emails)} 封")
    return 0

if __name__ == "__main__":
    sys.exit(main())
