#!/usr/bin/env python3
"""
通用发布：本地 blocks JSON（含 image_paths）→ 飞书 Wiki 子目录 docx（含图片上传与占位替换）→ 可选 webhook 发群

用法：
  python3 feishu_publish_blocks_with_images.py \
    --parent <wiki_parent_node_token> \
    --title "文档标题" \
    --json "/abs/path/to/blocks.json" \
    --webhook "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"

说明：
  - blocks JSON 格式：{ "children": [...], "image_paths": [...] }（md_to_feishu_json.py 可生成）
  - 图片上传：drive/v1/medias/upload_all，parent_type=docx_image，parent_node=doc_token
  - 图片块插入：默认用 file 块（block_type=12，viewType=inline）；可用环境变量切换：
      FEISHU_IMG_BLOCK=gallery  → block_type=18 gallery
"""

import os
import sys
import json
import argparse
import re
from pathlib import Path
from datetime import datetime
import requests

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import feishu_wiki_create_doc as fwd  # 复用 token 逻辑


def _make_gallery_block(file_token: str) -> dict:
    return {
        "block_type": 18,
        "gallery": {
            "imageList": [{"fileToken": file_token}],
            "galleryStyle": {"align": "center"},
        },
    }


def _make_file_block(file_token: str, filename: str) -> dict:
    return {
        "block_type": 12,
        "file": {"fileToken": file_token, "viewType": "inline", "fileName": filename},
    }


def upload_image_to_doc(token: str, doc_token: str, img_path: Path) -> str | None:
    if not img_path.exists():
        print(f"⚠️ 图片不存在: {img_path}")
        return None
    size = img_path.stat().st_size
    if size > 20 * 1024 * 1024:
        print(f"⚠️ 图片超过 20MB: {img_path.name}")
        return None

    url = "https://open.feishu.cn/open-apis/drive/v1/medias/upload_all"
    headers = {"Authorization": f"Bearer {token}"}
    with open(img_path, "rb") as f:
        files = {
            "file_name": (None, img_path.name),
            "parent_type": (None, "docx_image"),
            "parent_node": (None, doc_token),
            "size": (None, str(size)),
            "file": (img_path.name, f, "image/png"),
        }
        r = requests.post(url, headers=headers, files=files, timeout=60)
    data = r.json()
    if data.get("code") == 0:
        return data.get("data", {}).get("file_token")
    print(f"⚠️ 上传失败 {img_path.name}: {data.get('msg')} debug={data.get('debug', '')}")
    return None


def create_node(parent_token: str, title: str, headers: dict) -> tuple[str, str]:
    """创建 wiki 子节点，返回 (doc_token, node_token)"""
    r = requests.get(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={parent_token}",
        headers=headers, timeout=30)
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
        json={
            "parent_node_token": parent_token,
            "obj_type": "docx",
            "node_type": "origin",
            "title": title,
        },
        timeout=30,
    )
    cj = cr.json()
    if cr.status_code != 200 or cj.get("code") != 0:
        raise RuntimeError(f"创建节点失败: {cj.get('msg', str(cj))}")
    new_node = cj.get("data", {}).get("node", {})
    node_token = new_node.get("node_token")
    doc_token = new_node.get("obj_token") or node_token
    if not doc_token:
        raise RuntimeError("创建成功但无 doc_token")
    return doc_token, node_token


def _normalize_title(t: str) -> str:
    if not t:
        return ""
    s = t.strip().lower()
    # 去掉常见“括号后缀”（如：最终版/含配图/飞书友好版）
    s = re.sub(r"[（(][^）)]*[）)]\s*$", "", s)
    # 去掉空白与常见分隔符，便于相似匹配
    s = re.sub(r"[\s\-—_·:：]+", "", s)
    return s


def _is_similar_title(a: str, b: str) -> bool:
    na, nb = _normalize_title(a), _normalize_title(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    # 相互包含（避免过短字符串误判）
    if len(na) >= 6 and na in nb:
        return True
    if len(nb) >= 6 and nb in na:
        return True
    return False


def find_existing_node_by_title(parent_token: str, title: str, headers: dict) -> tuple[str | None, str | None, str | None]:
    """在父节点下查找同名/相似标题文档，返回(doc_token,node_token,node_title)"""
    r = requests.get(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={parent_token}",
        headers=headers, timeout=30)
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
            headers=headers, params=params, timeout=30)
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
        headers=headers, timeout=30)
    j = r.json()
    if j.get("code") != 0:
        raise RuntimeError(f"get_node 失败: {j.get('msg')}")
    node = j["data"]["node"]
    return node.get("obj_token") or node_token


def clear_doc_blocks(doc_token: str, headers: dict) -> bool:
    """清空文档根节点下直接子块（按索引区间批量删除，兼容当前租户）"""
    max_rounds = 30
    delete_url = (
        f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks/{doc_token}/children/batch_delete"
    )

    for _ in range(max_rounds):
        # 先统计根节点直系子块数量（分页拉取）
        all_items = []
        page_token = None
        while True:
            params = {"page_size": 200}
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
                print(f"⚠️ 获取 blocks 失败: {j.get('msg')}")
                return False
            data = j.get("data", {}) or {}
            all_items.extend(data.get("items", []) or [])
            page_token = data.get("page_token")
            if not page_token:
                break

        child_count = sum(1 for b in all_items if b.get("parent_id") == doc_token)
        if child_count <= 1:
            # 飞书通常至少保留 1 个占位子块，<=1 即可视为清空
            return True

        end_index = min(199, child_count - 1)
        rd = requests.delete(
            delete_url,
            headers=headers,
            json={"start_index": 0, "end_index": end_index},
            timeout=30,
        )
        jd = rd.json()
        if jd.get("code") != 0:
            print(f"⚠️ 批量清空失败: {jd.get('msg')}")
            return False
        time.sleep(0.2)

    print("⚠️ 清空轮次超限，文档可能未完全清空")
    return False


def replace_image_placeholders(blocks: list, file_tokens: list[str | None], image_paths: list[str]) -> list:
    use = os.environ.get("FEISHU_IMG_BLOCK", "file")  # file | gallery
    out = []
    for b in blocks:
        if not isinstance(b, dict) or b.get("block_type") != 2:
            out.append(b)
            continue
        elements = (b.get("text") or {}).get("elements") or []
        content = ""
        if elements and isinstance(elements[0], dict):
            content = (elements[0].get("text_run") or {}).get("content", "") or ""

        hit = None
        for i in range(1, len(file_tokens) + 1):
            if f"【配图 {i}" in content:
                hit = i
                break
        if not hit:
            out.append(b)
            continue

        ft = file_tokens[hit - 1]
        if not ft:
            out.append(b)
            continue

        filename = f"image_{hit}.png"
        if hit - 1 < len(image_paths):
            try:
                filename = Path(image_paths[hit - 1]).name or filename
            except Exception:
                pass

        if use == "gallery":
            out.append(_make_gallery_block(ft))
        else:
            out.append(_make_file_block(ft, filename))
    return out


def _get_text_content(block: dict) -> str:
    if not isinstance(block, dict) or block.get("block_type") != 2:
        return ""
    elements = (block.get("text") or {}).get("elements") or []
    if not elements:
        return ""
    tr = (elements[0].get("text_run") or {})
    return (tr.get("content") or "")


def sanitize_blocks(blocks: list) -> list:
    """
    飞书 docx blocks 对“空段落/异常结构”会严格校验。
    这里做一次轻量清洗：去掉纯空文本块，避免 invalid param。
    """
    out = []
    for b in blocks:
        if not isinstance(b, dict):
            continue
        if b.get("block_type") == 2:
            c = _get_text_content(b)
            if not c or not c.strip():
                continue
        out.append(b)
    return out


def _post_children(doc_token: str, headers: dict, children: list, index: int | None = None) -> dict:
    payload = {"children": children}
    # 关键点：index 可不传，默认追加到末尾；这对“跳过部分块”场景更稳
    if index is not None:
        payload["index"] = index
    wr = requests.post(
        f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks/{doc_token}/children",
        headers=headers,
        json=payload,
        timeout=30,
    )
    try:
        return wr.json()
    except Exception:
        return {"code": -1, "msg": f"non-json response: {wr.text[:200]}"}


def write_blocks(doc_token: str, headers: dict, blocks: list) -> None:
    valid = sanitize_blocks([b for b in blocks if b is not None])
    for i in range(0, len(valid), 50):
        batch = valid[i : i + 50]
        res = _post_children(doc_token, headers, batch, None)
        if res.get("code") != 0:
            # 含图片块时常见会失败；此处打印详情并降级为“只写文本块”
            debug = res.get("debug", "")
            print(f"⚠️ 写入失败: code={res.get('code')} msg={res.get('msg')} debug={debug}")
            if any(b.get("block_type") in (12, 18) for b in batch):
                safe = [b for b in batch if b.get("block_type") not in (12, 18)]
                if safe:
                    res2 = _post_children(doc_token, headers, safe, None)
                    if res2.get("code") == 0:
                        print("⚠️ 图片块跳过，已写文本（图片已上传到文档素材）")
                        import time
                        time.sleep(0.35)
                        continue

            # 仍失败：逐块写入，跳过坏块，保证整体可落地
            print("⚠️ 进入逐块写入降级模式：定位并跳过非法块")
            for b in batch:
                if b.get("block_type") in (12, 18):
                    # 图片块依然不强行写，避免整批失败
                    continue
                r1 = _post_children(doc_token, headers, [b], None)
                if r1.get("code") == 0:
                    import time
                    time.sleep(0.35)
                    continue
                # 这一个块不合法，跳过
                c = _get_text_content(b)
                preview = (c[:60] + "...") if c and len(c) > 60 else (c or "")
                print(f"⚠️ 跳过非法块: code={r1.get('code')} msg={r1.get('msg')} preview={preview!r}")
                import time
                time.sleep(0.35)
            continue
        if len(valid) > 50:
            import time
            time.sleep(0.35)


def send_webhook(webhook: str, text: str) -> None:
    if not webhook:
        return
    payload = {"msg_type": "text", "content": {"text": text}}
    r = requests.post(webhook, json=payload, timeout=10)
    try:
        j = r.json()
    except Exception:
        j = {}
    if j.get("code", 0) not in (0, None):
        print(f"⚠️ webhook 发送失败: {j.get('msg', r.text[:200])}")
    else:
        print("✅ webhook 已发送")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--parent", required=True, help="Wiki 父节点 token（URL 中 /wiki/<token>）")
    ap.add_argument("--target", default="", help="已有 Wiki 文档 node_token（用于更新；可选）")
    ap.add_argument("--title", required=True, help="文档标题")
    ap.add_argument("--json", required=True, help="blocks JSON 路径（含 children/image_paths）")
    ap.add_argument("--webhook", default="", help="飞书群机器人 webhook（可选）")
    args = ap.parse_args()

    json_path = Path(args.json).expanduser().resolve()
    if not json_path.exists():
        raise SystemExit(f"❌ JSON 不存在: {json_path}")
    base_dir = json_path.parent

    data = json.loads(json_path.read_text(encoding="utf-8"))
    blocks = data.get("children", [])
    image_paths = data.get("image_paths", []) or []

    token = fwd.get_token(args.target or args.parent)
    if not token:
        raise SystemExit("❌ Token 无效，请先运行 auto_log.py 完成飞书授权")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    print("=" * 50)
    print("📤 发布 blocks JSON 到飞书 Wiki（含图片）")
    print(f"父节点: {args.parent}")
    print(f"标题: {args.title}")
    print(f"JSON: {json_path}")
    print("=" * 50)

    if args.target:
        node_token = args.target
        doc_token = resolve_doc_token(node_token, headers)
        print(f"📋 更新已有文档: doc_token={doc_token} node_token={node_token}")
        if clear_doc_blocks(doc_token, headers):
            print("✅ 已清空原内容")
        else:
            print("⚠️ 清空失败，将以追加方式更新（仍不会新建重复文档）")
    else:
        # 默认：先查同名/相似标题，命中则更新，不再新建
        found_doc, found_node, found_title = find_existing_node_by_title(args.parent, args.title, headers)
        if found_doc and found_node:
            doc_token, node_token = found_doc, found_node
            print(f"📋 命中相似标题，改为更新: {found_title}")
            if clear_doc_blocks(doc_token, headers):
                print("✅ 已清空原内容")
            else:
                print("⚠️ 清空失败，将以追加方式更新（仍不会新建重复文档）")
        else:
            doc_token, node_token = create_node(args.parent, args.title, headers)
            print(f"✅ 新建文档: doc_token={doc_token} node_token={node_token}")

    # 上传图片
    file_tokens = []
    for p in image_paths:
        pth = Path(p)
        full = (base_dir / pth) if not pth.is_absolute() else pth
        full = full.resolve()
        ft = upload_image_to_doc(token, doc_token, full)
        file_tokens.append(ft)
        if ft:
            print(f"✅ 图片上传: {full.name}")

    # 替换占位符为图片块
    blocks2 = replace_image_placeholders(blocks, file_tokens, image_paths)
    write_blocks(doc_token, headers, blocks2)

    url = f"https://cunkebao.feishu.cn/wiki/{node_token}"
    print(f"✅ 发布完成: {url}")

    # 发群
    if args.webhook:
        msg = "\n".join([
            "【卡若基因胶囊】文章已发布/更新 ✅",
            f"标题：{args.title}",
            f"链接：{url}",
            "",
            "要点：基因胶囊=策略+环境指纹+审计+资产ID；pack/list/unpack 形成可继承闭环。",
        ])
        send_webhook(args.webhook, msg)


if __name__ == "__main__":
    main()

