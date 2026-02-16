#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import datetime as dt
from pathlib import Path


COLLECT_DIR = Path("/Users/karuo/Documents/个人/4、财务/财务收集")
REPORT_DIR = Path("/Users/karuo/Documents/个人/4、财务/财务报表")
SOURCE = COLLECT_DIR / "finance_sms_transactions.csv"
FOCUS_CSV = REPORT_DIR / "重点机构与主体_交易明细.csv"
FOCUS_MD = REPORT_DIR / "重点机构与主体_汇总.md"

KEYWORDS = ["中信", "中信银行", "民生", "民生银行", "企业银行", "存客宝", "卡若网络", "卡卡猫"]


def contains_focus(text: str) -> bool:
    s = (text or "").strip()
    return any(k in s for k in KEYWORDS)


def main() -> int:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    if SOURCE.exists():
        with SOURCE.open("r", encoding="utf-8-sig", newline="") as f:
            rows = list(csv.DictReader(f))

    focus = []
    for r in rows:
        sender = r.get("sender", "")
        text = r.get("text", "")
        if contains_focus(sender) or contains_focus(text):
            focus.append(r)

    with FOCUS_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(
            f, fieldnames=["row_id", "sender", "time", "amount", "card_tail", "balance", "text"]
        )
        writer.writeheader()
        writer.writerows(focus)

    total = len(focus)
    amount_sum = 0.0
    for r in focus:
        try:
            v = (r.get("amount") or "").strip()
            if v:
                amount_sum += float(v)
        except Exception:
            pass

    latest = focus[-1]["time"] if focus else "无"
    now = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines = [
        "# 重点机构与主体汇总",
        "",
        f"- 生成时间：{now}",
        "- 范围：中信银行、民生银行、企业银行、存客宝、卡若网络、卡卡猫",
        f"- 命中条数：{total}",
        f"- 命中金额合计：{amount_sum:.2f}",
        f"- 最新记录时间：{latest}",
        "",
        "## 输出文件",
        "",
        f"- 明细：`{FOCUS_CSV}`",
    ]
    FOCUS_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(str(FOCUS_CSV))
    print(str(FOCUS_MD))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
