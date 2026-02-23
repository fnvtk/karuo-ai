#!/usr/bin/env python3
"""
QQ 邮箱 IMAP 拉取脚本 · 水桥（平台对接）
用途：拉取收件箱全部或指定时间范围的邮件，输出为可读格式

前置：QQ 邮箱设置 → 账户 → POP3/IMAP/SMTP → 开启 IMAP → 生成授权码
用法：
  python qq_mail_fetch.py                    # 拉取最近 30 天
  python qq_mail_fetch.py --days 7           # 拉取最近 7 天
  python qq_mail_fetch.py --all              # 拉取全部历史邮件（无日期限制）
  python qq_mail_fetch.py --all --output out.json  # 导出到 JSON 便于分析
"""
import imaplib
import email
import argparse
import json
import os
import sys
from email.utils import parsedate_to_datetime
from datetime import datetime, timedelta
from pathlib import Path

# 加载本地 .qq_mail_env（授权码保存于此，调用时直接使用）
def _load_env():
    env_file = Path(__file__).resolve().parent / ".qq_mail_env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

_load_env()

# 配置：优先环境变量，次之 .qq_mail_env
IMAP_HOST = "imap.qq.com"
IMAP_PORT = 993
EMAIL = os.environ.get("QQ_MAIL", "zhengzhiqun@qq.com")
AUTH_CODE = os.environ.get("QQ_MAIL_AUTH_CODE", "")  # 授权码，非 QQ 密码


def list_folders() -> list[str]:
    """列出所有 IMAP 文件夹"""
    if not AUTH_CODE:
        return []
    server = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
    server.login(EMAIL, AUTH_CODE)
    typ, data = server.list()
    server.logout()
    if typ != "OK":
        return []
    folders = []
    for line in data:
        if line:
            parts = line.decode().split('"')
            if len(parts) >= 2:
                folders.append(parts[-2])
    return folders


def fetch_emails(days: int = 30, limit: int = 0, all_mail: bool = False, progress: bool = True, folder: str = "INBOX") -> list[dict]:
    """拉取收件箱邮件，返回 [{date, from, subject, preview}, ...]"""
    if not AUTH_CODE:
        print("请设置环境变量 QQ_MAIL_AUTH_CODE（QQ 邮箱授权码）")
        print("或在脚本内填写 AUTH_CODE 变量")
        return []

    server = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
    server.login(EMAIL, AUTH_CODE)
    # 含空格的文件夹名需加双引号（如 "Sent Messages"）
    mb = f'"{folder}"' if " " in folder else folder
    try:
        server.select(mb, readonly=True)
    except (imaplib.IMAP4.error, imaplib.IMAP4.readonly):
        server.select(mb, readonly=False)

    if all_mail:
        typ, data = server.search(None, "ALL")
    else:
        since = (datetime.now() - timedelta(days=days)).strftime("%d-%b-%Y")
        typ, data = server.search(None, f"(SINCE {since})")

    if typ != "OK":
        server.close()
        server.logout()
        return []

    ids = data[0].split()
    ids = list(reversed(ids))  # 新的在前
    total = len(ids)
    if limit and total > limit:
        ids = ids[:limit]
    total_fetch = len(ids)

    if progress:
        print(f"共 {total} 封邮件，将拉取 {total_fetch} 封...", file=sys.stderr)

    results = []
    for i, num in enumerate(ids):
        typ, msg_data = server.fetch(num, "(RFC822)")
        if typ != "OK":
            continue
        raw = msg_data[0][1]
        msg = email.message_from_bytes(raw)
        subject = msg.get("Subject", "")
        if isinstance(subject, bytes):
            from email.header import decode_header
            parts = decode_header(subject)
            subject = "".join(
                p.decode(c or "utf-8", errors="replace") if isinstance(p, bytes) else p
                for p, c in parts
            )
        from_addr = msg.get("From", "")
        date_str = msg.get("Date", "")
        try:
            dt = parsedate_to_datetime(date_str)
            date_display = dt.strftime("%Y-%m-%d %H:%M")
        except Exception:
            date_display = date_str[:20] if date_str else ""
        preview = ""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    try:
                        preview = part.get_payload(decode=True).decode("utf-8", errors="replace")[:200]
                    except Exception:
                        pass
                    break
        else:
            try:
                preview = msg.get_payload(decode=True).decode("utf-8", errors="replace")[:200]
            except Exception:
                preview = "(无法解析正文)"
        results.append({
            "date": date_display,
            "from": from_addr[:80],
            "subject": subject[:120],
            "preview": preview.replace("\n", " ").strip()[:200],
        })
        if progress and (i + 1) % 500 == 0:
            print(f"  已拉取 {i + 1}/{total_fetch} ...", file=sys.stderr)

    server.close()
    server.logout()
    return results


def main():
    ap = argparse.ArgumentParser(description="QQ 邮箱 IMAP 拉取")
    ap.add_argument("--days", type=int, default=30, help="拉取最近 N 天（与 --all 互斥）")
    ap.add_argument("--all", dest="all_mail", action="store_true", help="拉取全部历史邮件")
    ap.add_argument("--folder", type=str, default="INBOX", help="指定文件夹，如 INBOX、我的文件夹 等；先 --list-folders 查看")
    ap.add_argument("--list-folders", action="store_true", help="列出所有 IMAP 文件夹")
    ap.add_argument("--limit", type=int, default=0, help="最多拉取 N 封，0 表示不限制")
    ap.add_argument("--output", "-o", type=str, default="", help="导出到 JSON 文件")
    ap.add_argument("--quiet", "-q", action="store_true", help="不显示进度")
    args = ap.parse_args()

    if args.list_folders:
        for f in list_folders():
            print(f)
        return

    days = 365 * 20 if args.all_mail else args.days
    emails = fetch_emails(
        days=days,
        limit=args.limit,
        all_mail=args.all_mail,
        progress=not args.quiet,
        folder=args.folder,
    )

    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(emails, f, ensure_ascii=False, indent=None)
        print(f"已导出 {len(emails)} 封到 {out_path}", file=sys.stderr)
    else:
        for i, e in enumerate(emails, 1):
            print(f"[{i}] {e['date']} | {e['from']}")
            print(f"    主题: {e['subject']}")
            print(f"    摘要: {e['preview']}")
            print("-" * 60)


if __name__ == "__main__":
    main()
