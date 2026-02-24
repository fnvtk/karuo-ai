---
name: Excel表格与日报
description: 本地 Excel/CSV 批量写入飞书表格，并自动生成日报图表（图片）发飞书群。
triggers: Excel写飞书、Excel导入飞书、批量写飞书表格、飞书表格导入、CSV写飞书、日报图表发飞书、表格日报
owner: 水桥
group: 水
version: "1.0"
updated: "2026-02-24"
---

# Excel表格与日报（飞书）

## 能做什么（Capabilities）

- 批量读取本地 `.xlsx/.xlsm/.csv`
- 写入飞书电子表格（同一 sheet 内按区块堆叠）
- 自动生成「日报图表」：HTML → PNG（截图）
- 发飞书群：先发文字，再可选发图片

## 怎么用（Usage）

触发词：`Excel写飞书`、`批量写飞书表格`、`表格日报`、`日报图表发飞书`

## 前置条件（一次性）

1. **已完成飞书授权**（同目录 `脚本/.feishu_tokens.json` 存在）  
   - 若没有：先运行 `飞书管理` 的 `auto_log.py` 完成授权/刷新 token。
2. **脚本运行环境**：使用独立 venv（不污染系统 Python）  
   - Python：`/Users/karuo/.venvs/karuo-feishu/bin/python`

## 必填参数（用环境变量最省事）

- `FEISHU_SPREADSHEET_TOKEN`：目标表格 token
- `FEISHU_SHEET_ID`：目标 sheetId
- `FEISHU_GROUP_WEBHOOK`：飞书群机器人 webhook

可选（用于脚本内自动 refresh access_token）：
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`

## 一键命令（推荐）

```bash
# 1) 配置目标表格（示例：请替换为你的）
export FEISHU_SPREADSHEET_TOKEN="xxx"
export FEISHU_SHEET_ID="yyy"
export FEISHU_GROUP_WEBHOOK="https://open.feishu.cn/open-apis/bot/v2/hook/zzz"

# 2) 批量导入并生成日报（默认只发文字）
"/Users/karuo/.venvs/karuo-feishu/bin/python" \
  "/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本/excel_batch_to_feishu_sheet_report.py" \
  --input "/path/to/excel_or_dir"

# 3) 追加：同时把日报图片发到群里
"/Users/karuo/.venvs/karuo-feishu/bin/python" \
  "/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本/excel_batch_to_feishu_sheet_report.py" \
  --input "/path/to/excel_or_dir" \
  --send-image
```

## 输出位置

按卡若AI 输出规范，自动写到：

`/Users/karuo/Documents/卡若Ai的文件夹/导出/飞书/Excel日报/`

包含：`report.html`、`report.png`、`charts_flat/`。

## 相关文件（Files）

- 脚本：`飞书管理/脚本/excel_batch_to_feishu_sheet_report.py`
- 发送图片工具（复用）：`智能纪要/脚本/send_to_feishu.py`

