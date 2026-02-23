#!/usr/bin/env python3
"""
QQ 邮箱多文件夹批量拉取 · 收件箱 + 垃圾箱 + 已发送 + 我的文件夹（若已开启）
"""
import json
import sys
from pathlib import Path
from qq_mail_fetch import fetch_emails, AUTH_CODE

OUT_DIR = Path("/Users/karuo/Documents/卡若Ai的文件夹/报告")

FOLDERS = [
    ("INBOX", "收件箱"),
    ("Junk", "垃圾箱"),
    ("Sent Messages", "已发送"),
    ("Drafts", "草稿箱"),
    ("Deleted Messages", "已删除"),
]

# 我的文件夹（需在 QQ 设置中勾选「收取我的文件夹」后才能在 IMAP 中看到子目录）
MY_FOLDERS = ["&UXZO1mWHTvZZOQ-"]  # 父级，可扩展子目录


def main():
    if not AUTH_CODE:
        print("请配置 .qq_mail_env 中的授权码")
        return 1

    results = {}
    for folder, label in FOLDERS:
        try:
            emails = fetch_emails(days=365 * 20, limit=0, all_mail=True, progress=True, folder=folder)
            results[label] = {"folder": folder, "count": len(emails), "emails": emails}
            out = OUT_DIR / f"qq_{folder.replace(' ', '_').lower()}_export.json"
            with open(out, "w", encoding="utf-8") as f:
                json.dump(emails, f, ensure_ascii=False, indent=None)
            print(f"  -> {out.name}: {len(emails)} 封")
        except Exception as e:
            print(f"{label} ({folder}): 失败 - {e}")
            results[label] = {"folder": folder, "count": 0, "error": str(e)}

    for folder in MY_FOLDERS:
        try:
            emails = fetch_emails(days=365 * 20, limit=0, all_mail=True, progress=True, folder=folder)
            results["我的文件夹"] = {"folder": folder, "count": len(emails), "emails": emails}
            out = OUT_DIR / "qq_myfolders_export.json"
            with open(out, "w", encoding="utf-8") as f:
                json.dump(emails, f, ensure_ascii=False, indent=None)
            print(f"  我的文件夹 -> {out.name}: {len(emails)} 封")
        except Exception as e:
            print(f"我的文件夹: 失败 - {e}")

    # 合并统计
    total = sum(r.get("count", 0) for r in results.values() if isinstance(r, dict))
    print(f"\n合计拉取: {total} 封")
    return 0


if __name__ == "__main__":
    sys.exit(main())
