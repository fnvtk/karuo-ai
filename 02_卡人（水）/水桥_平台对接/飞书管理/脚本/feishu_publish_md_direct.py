#!/usr/bin/env python3
"""
MD 原文直传飞书（不转飞书 JSON）

特性：
1) 直接读取 .md 原文，按行原样写入（保留 Markdown 符号）
2) 同名/相似标题优先更新，不重复新建
3) 不处理图片上传与替换（纯原文直传）
"""

import argparse
import re
from pathlib import Path
import requests
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import feishu_wiki_create_doc as fwd


def _text_block(content: str) -> dict:
    return {
        "block_type": 2,
        "text": {
            "elements": [{"text_run": {"content": content, "text_element_style": {}}}],
            "style": {},
        },
    }


def _normalize_title(t: str) -> str:
    s = (t or "").strip().lower()
    s = re.sub(r"[（(][^）)]*[）)]\s*$", "", s)
    s = re.sub(r"[\s\-—_·:：]+", "", s)
    return s


def _is_similar_title(a: str, b: str) -> bool:
    na, nb = _normalize_title(a), _normalize_title(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    if len(na) >= 6 and na in nb:
        return True
    if len(nb) >= 6 and nb in na:
        return True
    return False


def parse_title(md_text: str, fallback: str) -> str:
    for line in md_text.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return fallback


def find_existing(parent_token: str, title: str, headers: dict) -> tuple[str | None, str | None, str | None]:
    r = requests.get(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={parent_token}",
        headers=headers,
        timeout=30,
    )
    j = r.json()
    if j.get("code") != 0:
        return None, None, None
    node = j["data"]["node"]
    space_id = node.get("space_id") or (node.get("space") or {}).get("space_id") or node.get("origin_space_id")
    if not space_id:
        return None, None, None

    page_token = None
    while True:
        params = {"parent_node_token": parent_token, "page_size": 50}
        if page_token:
            params["page_token"] = page_token
        nr = requests.get(
            f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes",
            headers=headers,
            params=params,
            timeout=30,
        )
        nj = nr.json()
        if nj.get("code") != 0:
            return None, None, None
        data = nj.get("data", {}) or {}
        nodes = data.get("nodes", []) or data.get("items", []) or []
        for n in nodes:
            node_title = n.get("title", "") or n.get("node", {}).get("title", "")
            if _is_similar_title(node_title, title):
                obj = n.get("obj_token")
                node_token = n.get("node_token")
                return (obj or node_token), node_token, node_title
        page_token = data.get("page_token")
        if not page_token:
            break
    return None, None, None


def resolve_doc_token(node_token: str, headers: dict) -> str:
    r = requests.get(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={node_token}",
        headers=headers,
        timeout=30,
    )
    j = r.json()
    if j.get("code") != 0:
        raise RuntimeError(f"get_node 失败: {j.get('msg')}")
    return j["data"]["node"].get("obj_token") or node_token


def clear_doc_blocks(doc_token: str, headers: dict) -> bool:
    # 该接口在部分租户会 field validation failed，失败就返回 False（后续走追加）
    all_items = []
    page_token = None
    while True:
        params = {"page_size": 100}
        if page_token:
            params["page_token"] = page_token
        r = requests.get(
            f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks",
            headers=headers,
            params=params,
            timeout=30,
        )
        j = r.json()
        if j.get("code") != 0:
            return False
        data = j.get("data", {}) or {}
        all_items.extend(data.get("items", []) or [])
        page_token = data.get("page_token")
        if not page_token:
            break
    child_ids = [b["block_id"] for b in all_items if b.get("parent_id") == doc_token and b.get("block_id")]
    if not child_ids:
        return True
    for i in range(0, len(child_ids), 50):
        batch = child_ids[i : i + 50]
        rd = requests.delete(
            f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks/{doc_token}/children/batch_delete",
            headers=headers,
            json={"block_id_list": batch},
            timeout=30,
        )
        if rd.json().get("code") != 0:
            return False
    return True


def create_node(parent_token: str, title: str, headers: dict) -> tuple[str, str]:
    r = requests.get(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={parent_token}",
        headers=headers,
        timeout=30,
    )
    j = r.json()
    if j.get("code") != 0:
        raise RuntimeError(f"get_node 失败: {j.get('msg')}")
    node = j["data"]["node"]
    space_id = node.get("space_id") or (node.get("space") or {}).get("space_id") or node.get("origin_space_id")
    if not space_id:
        raise RuntimeError("无法获取 space_id")
    cr = requests.post(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes",
        headers=headers,
        json={"parent_node_token": parent_token, "obj_type": "docx", "node_type": "origin", "title": title},
        timeout=30,
    )
    cj = cr.json()
    if cj.get("code") != 0:
        raise RuntimeError(f"创建节点失败: {cj.get('msg')}")
    node = cj["data"]["node"]
    return (node.get("obj_token") or node.get("node_token")), node.get("node_token")


def write_raw_md_lines(doc_token: str, headers: dict, md_text: str) -> None:
    lines = md_text.splitlines()
    blocks = [_text_block(line) for line in lines if line is not None]
    for i in range(0, len(blocks), 50):
        batch = blocks[i : i + 50]
        r = requests.post(
            f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks/{doc_token}/children",
            headers=headers,
            json={"children": batch},
            timeout=30,
        )
        j = r.json()
        if j.get("code") != 0:
            raise RuntimeError(f"写入失败: {j.get('msg')}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--parent", default="MyvRwCVNSiTg5ok6e3fc6uA5nHg", help="Wiki 父节点 token")
    ap.add_argument("--md", required=True, help="Markdown 文件路径")
    ap.add_argument("--title", default="", help="可选，覆盖 MD 第一行标题")
    args = ap.parse_args()

    md_path = Path(args.md).expanduser().resolve()
    if not md_path.exists():
        raise SystemExit(f"❌ MD 不存在: {md_path}")
    md_text = md_path.read_text(encoding="utf-8")
    title = args.title.strip() if args.title.strip() else parse_title(md_text, md_path.stem)

    token = fwd.get_token(args.parent)
    if not token:
        raise SystemExit("❌ Token 无效，请先授权")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    print("=" * 50)
    print("📤 MD 原文直传飞书（不转 JSON）")
    print(f"父节点: {args.parent}")
    print(f"标题: {title}")
    print(f"文件: {md_path}")
    print("=" * 50)

    doc_token, node_token, hit_title = find_existing(args.parent, title, headers)
    if doc_token and node_token:
        print(f"📋 命中相似标题，更新: {hit_title}")
        if clear_doc_blocks(doc_token, headers):
            print("✅ 已清空原内容")
        else:
            print("⚠️ 清空失败，改为追加")
    else:
        doc_token, node_token = create_node(args.parent, title, headers)
        print(f"✅ 新建文档: {node_token}")

    write_raw_md_lines(doc_token, headers, md_text)
    print(f"✅ 上传完成: https://cunkebao.feishu.cn/wiki/{node_token}")


if __name__ == "__main__":
    main()

