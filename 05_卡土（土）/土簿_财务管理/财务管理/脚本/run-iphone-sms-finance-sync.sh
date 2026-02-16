#!/bin/bash
set -euo pipefail

ROOT="/Users/karuo/Documents/个人/卡若AI"
PYTHON_BIN="${PYTHON_BIN:-/usr/bin/python3}"

export KARUO_AI_ROOT="$ROOT"
export SMS_SYNC_DATA_DIR="/Users/karuo/Documents/个人/4、财务/财务收集"
export SMS_REPORT_DIR="/Users/karuo/Documents/个人/4、财务/财务报表"
export SMS_CHAT_DB_PATH="$HOME/Library/Messages/chat.db"
export SMS_TARGET_SENDERS="中信银行,95558,中信,民生银行,95568,民生,企业银行"
export SMS_KEYWORDS="交易,入账,扣款,支出,收入,余额,转入,转出,消费,存客宝,卡若网络,卡卡猫,企业银行"
export SMS_BACKFILL_START="${SMS_BACKFILL_START:-2026-01-20}"
export SMS_BACKFILL_END="${SMS_BACKFILL_END:-2026-02-12}"

"$PYTHON_BIN" "$ROOT/scripts/iphone_sms_finance_sync.py"
