#!/bin/bash
# 查看 QQ 邮箱全量拉取进度
P="/Users/karuo/Documents/卡若Ai的文件夹/报告/qq_fetch_progress.json"
if [ ! -f "$P" ]; then
  echo "进度文件不存在，拉取可能未启动或使用旧版脚本"
  exit 1
fi
python3 -c "
import json
from pathlib import Path
p = Path('/Users/karuo/Documents/卡若Ai的文件夹/报告/qq_fetch_progress.json')
d = json.load(open(p, encoding='utf-8'))
print('=== QQ 邮箱全量拉取进度 ===')
print(f\"进度: {d.get('done_emails',0)} / {d.get('total_emails',0)} 封 ({d.get('pct',0)}%)\")
print(f\"文件夹: {d.get('done_folders',0)} / {d.get('total_folders',0)}\")
print(f\"当前: {d.get('current_folder','-')}\")
print(f\"开始: {d.get('start_at','-')}\")
print(f\"更新: {d.get('updated_at','-')}\")
eta = d.get('eta_minutes',0)
if eta > 0:
  print(f\"预计剩余: {eta} 分钟\")
if d.get('status')=='completed':
  print(f\"完成: {d.get('finished_at','-')}\")
"
