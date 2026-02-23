#!/usr/bin/env python3
"""全量拉取所有 IMAP 可见文件夹 · 支持进度写入"""
import json
import sys
import imaplib
import os
from datetime import datetime
from pathlib import Path
from qq_mail_fetch import fetch_emails, list_folders, AUTH_CODE

OUT = Path("/Users/karuo/Documents/卡若Ai的文件夹/报告")
OUT.mkdir(parents=True, exist_ok=True)
PROGRESS_FILE = OUT / "qq_fetch_progress.json"

def count_folder(server, folder):
    mb = f'"{folder}"' if " " in folder else folder
    try:
        typ, data = server.select(mb, readonly=True)
        if typ == "OK" and data:
            n = int(data[0].decode())
            server.close()
            return n
    except Exception:
        pass
    return 0

def get_folder_counts(folders):
    """预扫各文件夹邮件数"""
    from qq_mail_fetch import IMAP_HOST, IMAP_PORT, EMAIL
    server = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
    server.login(EMAIL, AUTH_CODE)
    counts = {f: count_folder(server, f) for f in folders}
    server.logout()
    return counts

def write_progress(progress):
    progress["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(PROGRESS_FILE, "w", encoding="utf-8") as fp:
        json.dump(progress, fp, ensure_ascii=False, indent=2)

def main():
    if not AUTH_CODE:
        print("无授权码")
        return 1
    folders = list_folders()
    counts = get_folder_counts(folders)
    total_emails = sum(counts.values())
    start_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    all_emails = []
    stats = {}
    done_emails = 0
    for i, f in enumerate(folders):
        try:
            emails = fetch_emails(days=365*20, limit=0, all_mail=True, progress=False, folder=f)
            stats[f] = len(emails)
            for e in emails:
                e["_folder"] = f
            all_emails.extend(emails)
            done_emails += len(emails)
            elapsed = (datetime.now() - datetime.strptime(start_at, "%Y-%m-%d %H:%M:%S")).total_seconds()
            eta_sec = (elapsed / done_emails * (total_emails - done_emails)) if done_emails else 0
            progress = {
                "total_folders": len(folders),
                "done_folders": i + 1,
                "total_emails": total_emails,
                "done_emails": done_emails,
                "pct": round(done_emails / total_emails * 100, 1) if total_emails else 0,
                "current_folder": f,
                "start_at": start_at,
                "eta_minutes": round(eta_sec / 60, 1),
            }
            write_progress(progress)
            print(f"  [{i+1}/{len(folders)}] {f}: {len(emails)} | 总进度 {done_emails}/{total_emails} ({progress['pct']}%) ETA {progress['eta_minutes']}min")
        except Exception as ex:
            print(f"  {f}: 失败 {ex}")
            stats[f] = 0
    with open(OUT / "qq_all_folders_export.json", "w", encoding="utf-8") as fp:
        json.dump(all_emails, fp, ensure_ascii=False, indent=None)
    with open(OUT / "qq_folders_stats.json", "w", encoding="utf-8") as fp:
        json.dump(stats, fp, ensure_ascii=False, indent=2)
    write_progress({
        "total_folders": len(folders),
        "done_folders": len(folders),
        "total_emails": total_emails,
        "done_emails": len(all_emails),
        "pct": 100,
        "status": "completed",
        "start_at": start_at,
        "finished_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "eta_minutes": 0,
    })
    print(f"\n合计: {len(all_emails)} 封")
    return 0

if __name__ == "__main__":
    sys.exit(main())
