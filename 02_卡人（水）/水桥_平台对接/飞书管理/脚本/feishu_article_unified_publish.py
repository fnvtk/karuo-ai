#!/usr/bin/env python3
"""
统一入口：本地 Markdown 文章发布到飞书 Wiki（先转 JSON，再发布）

能力：
1) MD -> 飞书 blocks JSON（自动美化：去分隔线、清理空块、弱化复杂 Markdown）
2) 同名/相似标题优先更新，不新建重复文档
3) 自动上传图片（来自 image_paths），图片块失败时保底写正文并保留文档素材
4) 可选 webhook 发群

用法：
python3 feishu_article_unified_publish.py \
  --parent MyvRwCVNSiTg5ok6e3fc6uA5nHg \
  --title "卡若：xxx" \
  --md "/abs/path/article.md" \
  --json "/abs/path/article_feishu_blocks.json" \
  --webhook "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
"""

import argparse
import subprocess
import sys
from pathlib import Path


ROOT = Path("/Users/karuo/Documents/个人/卡若AI")
MD2JSON = ROOT / "02_卡人（水）/水桥_平台对接/飞书管理/脚本/md_to_feishu_json.py"
PUBLISH = ROOT / "02_卡人（水）/水桥_平台对接/飞书管理/脚本/feishu_publish_blocks_with_images.py"


def run(cmd: list[str]) -> None:
    print("▶", " ".join(cmd))
    p = subprocess.run(cmd, text=True)
    if p.returncode != 0:
        raise SystemExit(p.returncode)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--parent", required=True, help="飞书 Wiki 父节点 token")
    ap.add_argument("--title", required=True, help="文档标题（同名/相似会更新）")
    ap.add_argument("--md", required=True, help="Markdown 文章路径")
    ap.add_argument("--json", required=True, help="输出 blocks JSON 路径")
    ap.add_argument("--webhook", default="", help="飞书群 webhook（可选）")
    args = ap.parse_args()

    md_path = Path(args.md).expanduser().resolve()
    json_path = Path(args.json).expanduser().resolve()
    if not md_path.exists():
        raise SystemExit(f"❌ MD 不存在: {md_path}")
    json_path.parent.mkdir(parents=True, exist_ok=True)

    # Step 1: 本地转 JSON（--no-callouts 去掉高亮块，表格更清爽）
    run(["python3", str(MD2JSON), str(md_path), str(json_path), "--no-callouts"])

    # Step 2: 发布（同标题优先更新）
    cmd = [
        "python3", str(PUBLISH),
        "--parent", args.parent,
        "--title", args.title,
        "--json", str(json_path),
    ]
    if args.webhook:
        cmd.extend(["--webhook", args.webhook])
    run(cmd)

    print("✅ 统一发布完成")


if __name__ == "__main__":
    main()

