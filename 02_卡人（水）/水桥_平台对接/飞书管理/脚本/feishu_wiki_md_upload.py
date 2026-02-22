#!/usr/bin/env python3
"""
直接将 Markdown 文件（含图片）上传到飞书 Wiki。
不依赖 JSON，直接解析 .md 并转换为飞书 blocks。

用法:
  python3 feishu_wiki_md_upload.py /path/to/article.md
  python3 feishu_wiki_md_upload.py "/Users/karuo/Documents/个人/2、我写的日记/火：开发分享/卡若：基因胶囊——AI技能可遗传化的实现与落地.md"
"""
import re
import sys
import json
import argparse
import requests
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PARENT_TOKEN = "KNf7wA8Rki1NSdkkSIqcdFtTnWb"

sys.path.insert(0, str(SCRIPT_DIR))
import feishu_wiki_create_doc as fwd


def upload_image_to_doc(token: str, doc_token: str, img_path: Path) -> str | None:
    """上传图片到飞书文档，返回 file_token"""
    if not img_path.exists():
        return None
    size = img_path.stat().st_size
    if size > 20 * 1024 * 1024:
        return None
    url = "https://open.feishu.cn/open-apis/drive/v1/medias/upload_all"
    with open(img_path, "rb") as f:
        files = {
            "file_name": (None, img_path.name),
            "parent_type": (None, "docx_image"),
            "parent_node": (None, doc_token),
            "size": (None, str(size)),
            "file": (img_path.name, f, "image/png"),
        }
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.post(url, headers=headers, files=files, timeout=60)
    if r.json().get("code") == 0:
        return r.json().get("data", {}).get("file_token")
    return None


def _text_block(t: str):
    return {"block_type": 2, "text": {"elements": [{"text_run": {"content": t, "text_element_style": {}}}], "style": {}}}


def _h1(t: str):
    return {"block_type": 3, "heading1": {"elements": [{"text_run": {"content": t, "text_element_style": {}}}], "style": {}}}


def _h2(t: str):
    return {"block_type": 4, "heading2": {"elements": [{"text_run": {"content": t, "text_element_style": {}}}], "style": {}}}


def _h3(t: str):
    return {"block_type": 5, "heading3": {"elements": [{"text_run": {"content": t, "text_element_style": {}}}], "style": {}}}


def _code_block(code: str):
    return {"block_type": 15, "code": {"language": "Plain Text", "elements": [{"text_run": {"content": code, "text_element_style": {}}}]}}


def md_to_blocks(md_path: Path, file_tokens: dict[str, str]) -> list:
    """将 Markdown 解析为飞书 blocks。file_tokens: {相对路径或文件名: file_token}"""
    text = md_path.read_text(encoding="utf-8")
    blocks = []
    lines = text.split("\n")
    i = 0

    while i < len(lines):
        line = lines[i]

        # 一级标题
        if line.startswith("# ") and not line.startswith("## "):
            blocks.append(_h1(line[2:].strip()))
            i += 1
            continue

        # 二级标题
        if line.startswith("## ") and not line.startswith("### "):
            blocks.append(_h2(line[3:].strip()))
            i += 1
            continue

        # 三级标题
        if line.startswith("### "):
            blocks.append(_h3(line[4:].strip()))
            i += 1
            continue

        # 代码块：飞书 code block API 易报 invalid param，暂以文本块呈现
        if line.strip().startswith("```"):
            lang_raw = line.strip()[3:].strip()
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            if i < len(lines):
                i += 1
            code = "\n".join(code_lines)
            blocks.append(_text_block(f"```{lang_raw}\n{code}\n```"))
            continue

        # 图片 ![alt](path)：飞书 gallery/image 插入 API 易报 invalid param，用占位符 + 提示
        m = re.match(r'!\[([^\]]*)\]\(([^)]+)\)', line.strip())
        if m:
            alt, path = m.group(1), m.group(2)
            resolved = (md_path.parent / path).resolve()
            # 图片已上传到文档素材，但 API 插入块易失败，用占位符；用户可手动「插入→图片→文档素材」
            blocks.append(_text_block(f"📷 [图片: {alt or Path(path).name}]（已上传至文档素材，可在飞书中插入）"))
            i += 1
            continue

        # 引用块 >
        if line.startswith("> "):
            blocks.append(_text_block(line[2:].strip()))
            i += 1
            continue

        # 分隔线
        if line.strip() in ("---", "***", "___"):
            i += 1
            continue

        # 空行
        if not line.strip():
            i += 1
            continue

        # 普通段落
        blocks.append(_text_block(line.rstrip()))
        i += 1

    return blocks


def upload_md_to_feishu(md_path: Path, parent_token: str = PARENT_TOKEN) -> tuple[bool, str]:
    """将 Markdown 上传到飞书 Wiki，有同名则更新"""
    token = fwd.get_token(parent_token)
    if not token:
        return False, "Token 无效"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    title = md_path.stem
    if not title:
        title = md_path.name

    r = requests.get(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={parent_token}",
        headers=headers, timeout=30)
    if r.json().get("code") != 0:
        return False, r.json().get("msg", "get_node 失败")
    space_id = r.json()["data"]["node"].get("space_id") or \
        (r.json()["data"]["node"].get("space") or {}).get("space_id") or \
        r.json()["data"]["node"].get("origin_space_id")
    if not space_id:
        return False, "无法获取 space_id"

    doc_token = None
    node_token = None
    nodes = []
    page_token = None
    while True:
        params = {"parent_node_token": parent_token, "page_size": 50}
        if page_token:
            params["page_token"] = page_token
        rr = requests.get(
            f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes",
            headers=headers, params=params, timeout=30)
        if rr.json().get("code") != 0:
            break
        data = rr.json().get("data", {})
        nodes = data.get("nodes", []) or data.get("items", [])
        for n in nodes:
            t = n.get("title", "") or n.get("node", {}).get("title", "")
            if title in t or "基因胶囊" in t:
                doc_token = n.get("obj_token") or n.get("node_token")
                node_token = n.get("node_token")
                break
        if doc_token:
            break
        page_token = data.get("page_token")
        if not page_token:
            break

    if not doc_token:
        create_r = requests.post(
            f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes",
            headers=headers,
            json={
                "parent_node_token": parent_token,
                "obj_type": "docx",
                "node_type": "origin",
                "title": title,
            },
            timeout=30)
        cd = create_r.json()
        if cd.get("code") != 0:
            return False, cd.get("msg", str(cd))
        doc_token = cd.get("data", {}).get("node", {}).get("obj_token")
        node_token = cd.get("data", {}).get("node", {}).get("node_token")
        if not doc_token:
            doc_token = node_token
        print("📄 创建新文档")
    else:
        print("📋 更新已有文档")

    file_tokens = {}
    for m in re.finditer(r'!\[([^\]]*)\]\(([^)]+)\)', md_path.read_text(encoding="utf-8")):
        path = m.group(2)
        resolved = (md_path.parent / path).resolve()
        if resolved.exists():
            ft = upload_image_to_doc(token, doc_token, resolved)
            if ft:
                file_tokens[str(resolved)] = ft
                file_tokens[path] = ft
                file_tokens[resolved.name] = ft
                print(f"✅ 图片上传: {resolved.name}")

    if doc_token and doc_token != node_token:
        child_ids = []
        pt = None
        while True:
            params = {"page_size": 100}
            if pt:
                params["page_token"] = pt
            rb = requests.get(
                f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks",
                headers=headers, params=params, timeout=30)
            if rb.json().get("code") != 0:
                break
            data = rb.json().get("data", {})
            items = data.get("items", [])
            for b in items:
                if b.get("parent_id") == doc_token:
                    child_ids.append(b["block_id"])
            pt = data.get("page_token")
            if not pt:
                break
        if child_ids:
            for j in range(0, len(child_ids), 50):
                batch = child_ids[j : j + 50]
                requests.delete(
                    f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks/{doc_token}/children/batch_delete",
                    headers=headers, json={"block_id_list": batch}, timeout=30)

    blocks = md_to_blocks(md_path, file_tokens)

    for i in range(0, len(blocks), 50):
        batch = blocks[i : i + 50]
        wr = requests.post(
            f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks/{doc_token}/children",
            headers=headers,
            json={"children": batch, "index": i},
            timeout=30)
        if wr.json().get("code") != 0:
            return False, wr.json().get("msg", "写入失败")
        import time
        time.sleep(0.3)

    url = f"https://cunkebao.feishu.cn/wiki/{node_token}"
    return True, url


def main():
    ap = argparse.ArgumentParser(description="Markdown 直接上传到飞书 Wiki")
    ap.add_argument("md", nargs="?", default="/Users/karuo/Documents/个人/2、我写的日记/火：开发分享/卡若：基因胶囊——AI技能可遗传化的实现与落地.md", help="Markdown 文件路径")
    ap.add_argument("--parent", default=PARENT_TOKEN, help="父节点 token")
    args = ap.parse_args()

    md_path = Path(args.md).expanduser().resolve()
    if not md_path.exists():
        print(f"❌ 文件不存在: {md_path}")
        sys.exit(1)

    print("=" * 50)
    print(f"📤 Markdown 直接上传: {md_path.name}")
    print("=" * 50)
    ok, result = upload_md_to_feishu(md_path, args.parent)
    if ok:
        print(f"✅ 成功")
        print(f"📎 {result}")
    else:
        print(f"❌ 失败: {result}")
        sys.exit(1)
    print("=" * 50)


if __name__ == "__main__":
    main()
