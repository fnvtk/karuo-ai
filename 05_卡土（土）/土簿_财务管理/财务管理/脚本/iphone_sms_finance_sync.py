#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import datetime as dt
import os
import re
import shutil
import sqlite3
import subprocess
import sys
from pathlib import Path


IOS_EPOCH = dt.datetime(2001, 1, 1, tzinfo=dt.timezone.utc)


def env(name: str, default: str) -> str:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return value.strip()


ROOT = Path(env("KARUO_AI_ROOT", "/Users/karuo/Documents/个人/卡若AI"))
DATA_DIR = Path(env("SMS_SYNC_DATA_DIR", str(ROOT / "data" / "finance_sync")))
REPORT_DIR = Path(env("SMS_REPORT_DIR", str(DATA_DIR)))
CHAT_DB = Path(env("SMS_CHAT_DB_PATH", str(Path.home() / "Library/Messages/chat.db")))
SNAPSHOT_DB = DATA_DIR / "chat.snapshot.db"
STATE_DB = DATA_DIR / "finance_sync.db"
DETAIL_CSV = DATA_DIR / "finance_sms_transactions.csv"
MONTHLY_CSV = REPORT_DIR / "finance_monthly_summary.csv"
LOG_PATH = DATA_DIR / "sync.log"
TARGET_SENDERS = [x.strip() for x in env("SMS_TARGET_SENDERS", "中信银行,95558,中信").split(",") if x.strip()]
KEYWORDS = [x.strip() for x in env("SMS_KEYWORDS", "交易,入账,扣款,支出,收入,余额,转入,转出,消费").split(",") if x.strip()]
BACKFILL_START = env("SMS_BACKFILL_START", "2026-01-20")
BACKFILL_END = env("SMS_BACKFILL_END", "2026-02-12")


def log(text: str) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    now = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{now}] {text}"
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(line + "\n")
    print(line)


def ensure_full_disk_access_hint() -> None:
    if not CHAT_DB.exists():
        log(f"未找到短信数据库: {CHAT_DB}")
        log("请在系统设置中为终端开启完全磁盘访问权限。")
        sys.exit(1)


def copy_chat_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        shutil.copy2(CHAT_DB, SNAPSHOT_DB)
    except PermissionError:
        log("读取 chat.db 权限不足，请开启终端完全磁盘访问权限。")
        raise


def ensure_state() -> sqlite3.Connection:
    conn = sqlite3.connect(STATE_DB)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS transactions (
            row_id INTEGER PRIMARY KEY,
            sender TEXT,
            text TEXT,
            amount REAL,
            card_tail TEXT,
            balance REAL,
            ts TEXT,
            date_key TEXT,
            created_at TEXT
        )
        """
    )
    conn.commit()
    return conn


def set_state(conn: sqlite3.Connection, key: str, value: str) -> None:
    conn.execute(
        "INSERT INTO state(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, value),
    )
    conn.commit()


def get_state(conn: sqlite3.Connection, key: str, default: str) -> str:
    row = conn.execute("SELECT value FROM state WHERE key = ?", (key,)).fetchone()
    if not row:
        return default
    return row[0]


def apple_ts_to_local(ts_raw) -> dt.datetime:
    if ts_raw is None:
        return dt.datetime.now().astimezone()
    try:
        t = int(ts_raw)
    except Exception:
        return dt.datetime.now().astimezone()
    # Newer db uses nanoseconds
    if t > 10_000_000_000:
        seconds = t / 1_000_000_000
    else:
        seconds = t
    return (IOS_EPOCH + dt.timedelta(seconds=seconds)).astimezone()


def parse_amount(text: str):
    # 支持: 123.45 / 1,234.56 / 123元
    matches = re.findall(r"([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*元?", text)
    if not matches:
        return None
    try:
        return float(matches[0].replace(",", ""))
    except Exception:
        return None


def parse_card_tail(text: str):
    m = re.search(r"(?:尾号|末四位|卡号尾号)\s*([0-9]{4})", text)
    if m:
        return m.group(1)
    m = re.search(r"\*{4}\s*([0-9]{4})", text)
    return m.group(1) if m else None


def parse_balance(text: str):
    m = re.search(r"(?:余额|可用余额|账户余额)[^\d]*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)", text)
    if not m:
        return None
    try:
        return float(m.group(1).replace(",", ""))
    except Exception:
        return None


def is_finance_message(sender: str, text: str) -> bool:
    if not text:
        return False
    sender_hit = any(x in (sender or "") for x in TARGET_SENDERS)
    kw_hit = any(x in text for x in KEYWORDS)
    return sender_hit or kw_hit


def fetch_new_messages(min_row_id: int):
    conn = sqlite3.connect(SNAPSHOT_DB)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            m.ROWID,
            COALESCE(h.id, m.service),
            m.text,
            m.date
        FROM message m
        LEFT JOIN handle h ON h.ROWID = m.handle_id
        WHERE m.ROWID > ?
          AND m.text IS NOT NULL
        ORDER BY m.ROWID ASC
        """,
        (min_row_id,),
    )
    rows = cur.fetchall()
    conn.close()
    return rows


def in_backfill_window(ts_local: dt.datetime) -> bool:
    start = dt.datetime.strptime(BACKFILL_START, "%Y-%m-%d").date()
    end = dt.datetime.strptime(BACKFILL_END, "%Y-%m-%d").date()
    d = ts_local.date()
    return start <= d <= end


def save_transactions(state_conn: sqlite3.Connection, rows):
    inserted = 0
    latest_id = int(get_state(state_conn, "last_row_id", "0"))

    for row_id, sender, text, ts_raw in rows:
        latest_id = max(latest_id, int(row_id))
        ts_local = apple_ts_to_local(ts_raw)

        if not (is_finance_message(sender or "", text or "") or in_backfill_window(ts_local)):
            continue

        amount = parse_amount(text or "")
        card_tail = parse_card_tail(text or "")
        balance = parse_balance(text or "")
        date_key = ts_local.strftime("%Y-%m")

        state_conn.execute(
            """
            INSERT OR IGNORE INTO transactions
            (row_id, sender, text, amount, card_tail, balance, ts, date_key, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                int(row_id),
                sender or "",
                text or "",
                amount,
                card_tail,
                balance,
                ts_local.isoformat(),
                date_key,
                dt.datetime.now().isoformat(),
            ),
        )
        inserted += 1

    state_conn.commit()
    set_state(state_conn, "last_row_id", str(latest_id))
    return inserted, latest_id


def export_csv(state_conn: sqlite3.Connection) -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    cur = state_conn.cursor()
    cur.execute(
        """
        SELECT row_id, sender, ts, amount, card_tail, balance, text
        FROM transactions
        ORDER BY ts ASC
        """
    )
    rows = cur.fetchall()
    with DETAIL_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["row_id", "sender", "time", "amount", "card_tail", "balance", "text"])
        writer.writerows(rows)

    cur.execute(
        """
        SELECT
            date_key,
            SUM(CASE WHEN text LIKE '%入账%' OR text LIKE '%收入%' OR text LIKE '%转入%' THEN COALESCE(amount, 0) ELSE 0 END) AS income,
            SUM(CASE WHEN text LIKE '%扣款%' OR text LIKE '%支出%' OR text LIKE '%消费%' OR text LIKE '%转出%' OR text LIKE '%交易%' THEN COALESCE(amount, 0) ELSE 0 END) AS expense,
            COUNT(*) AS message_count
        FROM transactions
        GROUP BY date_key
        ORDER BY date_key ASC
        """
    )
    monthly = cur.fetchall()
    with MONTHLY_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["month", "income", "expense", "net_cashflow", "message_count"])
        for month, income, expense, count in monthly:
            income = float(income or 0)
            expense = float(expense or 0)
            writer.writerow([month, f"{income:.2f}", f"{expense:.2f}", f"{(income-expense):.2f}", int(count or 0)])


def main() -> int:
    ensure_full_disk_access_hint()
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    copy_chat_db()
    state_conn = ensure_state()
    last_row_id = int(get_state(state_conn, "last_row_id", "0"))
    rows = fetch_new_messages(last_row_id)
    inserted, latest_id = save_transactions(state_conn, rows)
    export_csv(state_conn)
    log(f"本轮完成: 扫描 {len(rows)} 条, 入库 {inserted} 条, 最新ROWID={latest_id}")
    state_conn.close()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as e:
        log(f"执行失败: {e}")
        raise
