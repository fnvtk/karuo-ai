#!/bin/bash
# 纯命令行、不用浏览器：用飞书企业身份（tenant_access_token）拉取 104 场妙记并保存到 soul 目录。
# 凭证：脚本内置 APP_ID/APP_SECRET，或环境变量 FEISHU_APP_ID / FEISHU_APP_SECRET。
# 需在飞书开放平台为该应用开通「查看妙记文件」「导出妙记转写的文字内容」，且可访问数据范围包含该妙记（或选「全部」）。
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="/Users/karuo/Documents/聊天记录/soul"
cd "$SCRIPT_DIR"
python3 fetch_feishu_minutes.py "https://cunkebao.feishu.cn/minutes/obcnyg5nj2l8q281v32de6qz" --tenant-only --output "$OUT"
exit $?
