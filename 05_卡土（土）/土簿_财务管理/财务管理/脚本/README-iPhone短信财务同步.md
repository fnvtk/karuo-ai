# iPhone 短信财务实时同步（中信）

## 目标
- 每 60 秒自动同步一次 iPhone 短信到本地财务明细
- 自动补抓 `2026-01-20` 到 `2026-02-12` 区间数据
- 输出财务明细与月度汇总

## 文件说明
- `scripts/iphone_sms_finance_sync.py`：短信抓取+解析+汇总主脚本
- `scripts/run-iphone-sms-finance-sync.sh`：执行入口（含环境变量）
- `scripts/com.karuo.ai.iphone-sms-finance-sync.plist`：launchd 定时任务

## 输出目录
- `data/finance_sync/finance_sms_transactions.csv`
- `data/finance_sync/finance_monthly_summary.csv`
- `data/finance_sync/finance_sync.db`
- `data/finance_sync/sync.log`

## 一次性安装
```bash
chmod +x "/Users/karuo/Documents/个人/卡若AI/scripts/run-iphone-sms-finance-sync.sh"
cp "/Users/karuo/Documents/个人/卡若AI/scripts/com.karuo.ai.iphone-sms-finance-sync.plist" "$HOME/Library/LaunchAgents/"
launchctl unload "$HOME/Library/LaunchAgents/com.karuo.ai.iphone-sms-finance-sync.plist" 2>/dev/null || true
launchctl load "$HOME/Library/LaunchAgents/com.karuo.ai.iphone-sms-finance-sync.plist"
```

## 查看状态
```bash
launchctl list | rg "com.karuo.ai.iphone-sms-finance-sync"
tail -n 50 /tmp/karuo-ai-iphone-sms-finance-sync.log
tail -n 50 /tmp/karuo-ai-iphone-sms-finance-sync.err
```

## 关键前提
- iPhone 与 Mac 使用同一 Apple ID，并开启 iCloud 信息同步
- Terminal（或 Cursor）已开启 macOS 完全磁盘访问权限
