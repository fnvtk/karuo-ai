#!/usr/bin/env python3
"""
从 QQ 邮箱中筛选「Boss直聘」相关邮件，下载所有附件（简历等）到下载目录。
依赖：同目录 .qq_mail_env（QQ_MAIL、QQ_MAIL_AUTH_CODE）
用法：python3 download_boss_zhipin_resumes.py [--days 365]
"""
import imaplib
import email
import argparse
import os
import re
import sys
from datetime import datetime, timedelta
from email.header import decode_header
from pathlib import Path

# 复用 qq_mail_fetch 的环境加载
def _load_env():
    env_file = Path(__file__).resolve().parent / ".qq_mail_env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

_load_env()

IMAP_HOST = "imap.qq.com"
IMAP_PORT = 993
EMAIL = os.environ.get("QQ_MAIL", "zhengzhiqun@qq.com")
AUTH_CODE = os.environ.get("QQ_MAIL_AUTH_CODE", "")

# 下载目录：用户下载目录下的子文件夹
DOWN_DIR = Path.home() / "Downloads" / "Boss直聘简历"


def _decode_mime(s):
    if not s:
        return ""
    if isinstance(s, bytes):
        s = s.decode("utf-8", errors="replace")
    s = s.strip()
    # 统一用 decode_header 解析（支持 =?UTF-8?B?xxx?= 等）
    try:
        parts = decode_header(s)
    except Exception:
        return re.sub(r'[<>:"/\\|?*]', "_", s)
    out = []
    for part, enc in parts:
        if isinstance(part, bytes):
            out.append(part.decode(enc or "utf-8", errors="replace"))
        else:
            out.append(str(part) if part else "")
    return "".join(out)


def _is_boss_zhipin_email(subject: str, from_addr: str) -> bool:
    """判断是否为 Boss 直聘相关邮件（主题或发件人包含关键词）"""
    subject = (subject or "").lower()
    from_addr = (from_addr or "").lower()
    keywords = ["boss", "直聘", "zhipin", "博聘"]
    for kw in keywords:
        if kw in subject or kw in from_addr:
            return True
    return False


def _safe_filename(name: str) -> str:
    """去掉非法文件名字符"""
    name = re.sub(r'[<>:"/\\|?*]', "_", name)
    return name.strip() or "attachment"


def download_attachments_from_message(msg, date_str: str, global_index: int, saved: set) -> list[Path]:
    """从一封邮件中提取所有附件并保存，返回保存路径列表。"""
    saved_paths = []
    for part in msg.walk():
        filename = part.get_filename()
        if not filename:
            continue
        filename = _decode_mime(filename)
        if not filename.strip():
            continue
        payload = part.get_payload(decode=True)
        if payload is None:
            continue
        safe_base = _safe_filename(filename)
        base, ext = os.path.splitext(safe_base)
        path = DOWN_DIR / f"{date_str}_{global_index}_{safe_base}"
        cnt = 0
        while path in saved or path.exists():
            cnt += 1
            path = DOWN_DIR / f"{date_str}_{global_index}_{base}_{cnt}{ext}"
        path.write_bytes(payload)
        saved.add(path)
        saved_paths.append(path)
    return saved_paths


def main():
    ap = argparse.ArgumentParser(description="下载邮箱中 Boss 直聘相关邮件的附件到下载目录")
    ap.add_argument("--days", type=int, default=0, help="只处理最近 N 天的邮件，0 表示全部")
    args = ap.parse_args()

    if not AUTH_CODE:
        print("未配置 QQ 邮箱授权码，请在同目录 .qq_mail_env 中设置 QQ_MAIL_AUTH_CODE", file=sys.stderr)
        return 1

    DOWN_DIR.mkdir(parents=True, exist_ok=True)
    print(f"下载目录: {DOWN_DIR}", file=sys.stderr)

    server = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
    server.login(EMAIL, AUTH_CODE)

    # 收件箱 + 垃圾箱（Boss 邮件有时会被归类到垃圾箱）
    folders = [("INBOX", "收件箱"), ("Junk", "垃圾箱")]
    total_saved = 0
    saved_paths_global = set()
    global_file_index = 0

    # 可选：按日期限制（SINCE）
    since_criteria = ""
    if args.days > 0:
        since = (datetime.now() - timedelta(days=args.days)).strftime("%d-%b-%Y")
        since_criteria = f'(SINCE {since})'
        print(f"仅处理 {args.days} 天内邮件 (since {since})", file=sys.stderr)

    for folder, label in folders:
        mb = f'"{folder}"' if " " in folder else folder
        try:
            server.select(mb, readonly=True)
        except Exception as e:
            print(f"跳过 {label} ({folder}): {e}", file=sys.stderr)
            continue

        typ, data = server.search(None, since_criteria or "ALL")
        if typ != "OK":
            continue
        ids = list(reversed(data[0].split()))
        print(f"\n{label}: 共 {len(ids)} 封待检查...", file=sys.stderr)

        for i, num in enumerate(ids):
            typ, msg_data = server.fetch(num, "(RFC822)")
            if typ != "OK":
                continue
            raw = msg_data[0][1]
            msg = email.message_from_bytes(raw)
            subject = _decode_mime(msg.get("Subject", ""))
            from_addr = _decode_mime(msg.get("From", ""))
            if not _is_boss_zhipin_email(subject, from_addr):
                continue
            date_str = msg.get("Date", "")[:10].replace(" ", "_") or "nodate"
            date_str = re.sub(r"[^\d\-_]", "", date_str) or "nodate"
            global_file_index += 1
            paths = download_attachments_from_message(msg, date_str, global_file_index, saved_paths_global)
            if paths:
                total_saved += len(paths)
                for p in paths:
                    print(p.name)

    server.close()
    server.logout()
    print(f"\n合计下载 {total_saved} 个附件到: {DOWN_DIR}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
