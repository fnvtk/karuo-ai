#!/usr/bin/env python3
"""
将飞书导出的 JSON 文件（含 content + blocks）上传为飞书 Wiki 子文档。
用法: python3 upload_json_to_feishu_doc.py /path/to/水流程规划.json
可选: --parent <wiki_node_token>  --title "文档标题"
"""
import json
import sys
import argparse
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from feishu_wiki_create_doc import create_wiki_doc, get_token, CONFIG

# 默认 Wiki 父节点（与 SKILL 中「日记分享/新研究」一致）
DEFAULT_PARENT = "KNf7wA8Rki1NSdkkSIqcdFtTnWb"


def _text_block(content: str):
    return {
        "block_type": 2,
        "text": {
            "elements": [{"text_run": {"content": content, "text_element_style": {}}}],
            "style": {},
        },
    }


def _heading1_block(content: str):
    return {
        "block_type": 3,
        "heading1": {
            "elements": [{"text_run": {"content": content, "text_element_style": {}}}],
            "style": {},
        },
    }


def blocks_from_export_json(data: dict) -> tuple[str, list]:
    """
    从飞书导出格式（content + blocks）解析出标题和可写入的 children 列表。
    返回 (title, children)。
    """
    blocks = data.get("blocks") or []
    if not blocks:
        title = (data.get("content") or "未命名").split("\n")[0].strip() or "未命名"
        return title, [_heading1_block(title)]

    # 找根块（block_type 1 page 或 parent_id 为空）
    root = None
    by_id = {}
    for b in blocks:
        by_id[b.get("block_id")] = b
        if b.get("block_type") == 1 or b.get("parent_id") == "":
            root = b

    if not root:
        title = (data.get("content") or "未命名").split("\n")[0].strip() or "未命名"
        return title, [_heading1_block(title)]

    # 标题：从 page 或 content 第一行取
    title = "未命名"
    if root.get("page") and root["page"].get("elements"):
        for el in root["page"]["elements"]:
            c = el.get("text_run", {}).get("content", "").strip()
            if c:
                title = c
                break
    if title == "未命名" and data.get("content"):
        title = data["content"].split("\n")[0].strip() or title

    child_ids = root.get("children") or []
    children = []
    children.append(_heading1_block(title))

    for bid in child_ids:
        b = by_id.get(bid)
        if not b:
            continue
        bt = b.get("block_type")
        if bt == 2 and b.get("text"):
            els = b["text"].get("elements") or []
            content = ""
            for el in els:
                content += el.get("text_run", {}).get("content", "")
            content = content.strip()
            if content:
                children.append(_text_block(content))
            # 空段落可跳过，也可保留一行空
        elif bt == 43 and b.get("board"):
            # 多维表格/看板：API 可能不支持直接插入，用说明占位
            token = b["board"].get("token", "")
            children.append(_text_block("（原文档含多维表格/看板，可在原链接中查看）"))
        # 其他类型可后续扩展

    return title, children


def main():
    ap = argparse.ArgumentParser(description="将飞书导出 JSON 上传为飞书 Wiki 文档")
    ap.add_argument("json_path", help="JSON 文件路径（含 content + blocks）")
    ap.add_argument("--parent", default=DEFAULT_PARENT, help="Wiki 父节点 token")
    ap.add_argument("--title", default=None, help="覆盖文档标题（默认从 JSON 解析）")
    args = ap.parse_args()

    path = Path(args.json_path)
    if not path.exists():
        print(f"❌ 文件不存在: {path}")
        sys.exit(1)

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    title, children = blocks_from_export_json(data)
    if args.title:
        title = args.title

    print("=" * 50)
    print(f"📤 上传为飞书文档：{title}")
    print(f"   父节点: {args.parent}")
    print(f"   块数: {len(children)}")
    print("=" * 50)

    ok, result = create_wiki_doc(args.parent, title, children)
    if ok:
        print("✅ 创建成功")
        print(f"📎 {result}")
        try:
            import subprocess
            subprocess.run(["open", result], capture_output=True)
        except Exception:
            pass
    else:
        print(f"❌ 失败: {result}")
        sys.exit(1)
    print("=" * 50)


if __name__ == "__main__":
    main()
