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
import time
from pathlib import Path
from datetime import datetime
import requests

# 飞书群发送总开关（默认关闭）
FEISHU_GROUP_SEND_DISABLED = os.environ.get("FEISHU_GROUP_SEND_DISABLED", "1").strip().lower() in {
    "1", "true", "yes", "on"
}

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


def find_existing_node_by_title(
    parent_token: str, title: str, headers: dict
) -> tuple[str | None, str | None, str | None, str | None]:
    """在父节点下查找同名/相似标题文档，返回(doc_token,node_token,node_title,space_id)"""
    r = requests.get(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={parent_token}",
        headers=headers, timeout=30)
    j = r.json()
    if j.get("code") != 0:
        return None, None, None, None
    node = j["data"]["node"]
    space_id = node.get("space_id") or (node.get("space") or {}).get("space_id") or node.get("origin_space_id")
    if not space_id:
        return None, None, None, None

    page_token = None
    best = None
    best_score = -1
    while True:
        params = {"parent_node_token": parent_token, "page_size": 50}
        if page_token:
            params["page_token"] = page_token
        nr = requests.get(
            f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes",
            headers=headers, params=params, timeout=30)
        nj = nr.json()
        if nj.get("code") != 0:
            return None, None, None, None
        data = nj.get("data", {}) or {}
        nodes = data.get("nodes", []) or data.get("items", []) or []
        for n in nodes:
            node_title = n.get("title", "") or n.get("node", {}).get("title", "")
            if not _is_similar_title(node_title, title):
                continue
            obj = n.get("obj_token")
            node_token = n.get("node_token")
            na, nb = _normalize_title(node_title), _normalize_title(title)
            score = 100 if na == nb else 60 + min(len(na), len(nb))
            if score > best_score:
                best_score = score
                best = ((obj or node_token), node_token, node_title, space_id)
        page_token = data.get("page_token")
        if not page_token:
            break
    return best or (None, None, None, space_id)


def rename_node_title(space_id: str, node_token: str, new_title: str, headers: dict) -> bool:
    """命中相似标题后，优先把节点标题改成目标标题。"""
    if not space_id or not node_token or not new_title:
        return False
    r = requests.patch(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes/{node_token}",
        headers=headers,
        json={"title": new_title},
        timeout=30,
    )
    try:
        j = r.json()
    except Exception:
        return False
    return j.get("code") == 0


def resolve_image_full_path(raw_path: str, json_base_dir: Path, source_md_dir: Path | None) -> Path:
    p = Path(raw_path)
    if p.is_absolute() and p.exists():
        return p.resolve()
    candidates = [json_base_dir / p]
    if source_md_dir:
        candidates.append(source_md_dir / p)
    for c in candidates:
        if c.exists():
            return c.resolve()
    return (json_base_dir / p).resolve()


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


def _get_elements_content(elements: list) -> str:
    if not elements:
        return ""
    return (elements[0].get("text_run") or {}).get("content", "") or ""


def sanitize_blocks(blocks: list) -> list:
    """飞书 docx blocks 轻量清洗：去掉空文本/空代码块/空 callout，去掉首尾 callout，避免 invalid param。"""
    out = []
    for b in blocks:
        if not isinstance(b, dict):
            continue
        bt = b.get("block_type")
        if bt == 2:
            if not _get_text_content(b).strip():
                continue
        elif bt == 14:
            elems = (b.get("code") or {}).get("elements") or []
            if not _get_elements_content(elems).strip():
                continue
        elif bt == 19:
            elems = (b.get("callout") or {}).get("elements") or []
            if not _get_elements_content(elems).strip():
                continue
        out.append(b)
    # 去掉首尾 callout（表格上下不挤高亮块）
    while out and isinstance(out[0], dict) and out[0].get("block_type") == 19:
        out.pop(0)
    while out and isinstance(out[-1], dict) and out[-1].get("block_type") == 19:
        out.pop()
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


def _col_letter(n: int) -> str:
    s = ""
    while True:
        s = chr(65 + n % 26) + s
        n = n // 26 - 1
        if n < 0:
            break
    return s


def _cell_px_width(text: str) -> int:
    """估算单元格内容渲染宽度（px）：中文≈20px/字，ASCII≈9px/字，加内边距 24px。"""
    w = 0
    for c in text:
        cp = ord(c)
        if (0x4E00 <= cp <= 0x9FFF or 0x3000 <= cp <= 0x303F or
                0xFF01 <= cp <= 0xFF60 or 0xFE30 <= cp <= 0xFE4F):
            w += 20
        else:
            w += 9
    return w + 24


# 表格列宽：首列 max 400px；第二列及以后（定性/说明等）max 1000px，内容多则更宽
SHEET_COL_MIN_PX = 150
SHEET_COL_MAX_PX = 1000


def _auto_resize_sheet_columns(
    headers: dict, spreadsheet_token: str, sheet_id: str, values: list[list[str]]
) -> None:
    """根据内容宽度自动设置每列的列宽（调用飞书 Sheets dimension_range API）。"""
    if not values or not spreadsheet_token or not sheet_id:
        return
    cols = max(len(r) for r in values) if values else 0
    url = (
        f"https://open.feishu.cn/open-apis/sheets/v2/spreadsheets"
        f"/{spreadsheet_token}/dimension_range"
    )
    for j in range(cols):
        max_w = max(
            (_cell_px_width(row[j]) for row in values if j < len(row)),
            default=SHEET_COL_MIN_PX,
        )
        # 第二列及以后（定性/说明/做法等）内容多，放宽到 1000px
        cap = SHEET_COL_MAX_PX if j >= 1 else 380
        width = max(SHEET_COL_MIN_PX, min(max_w, cap))
        payload = {
            "dimension": {
                "sheetId": sheet_id,
                "majorDimension": "COLUMNS",
                "startIndex": j,
                "endIndex": j + 1,
            },
            "dimensionProperties": {"pixelSize": width},
        }
        try:
            requests.put(url, headers=headers, json=payload, timeout=10)
        except Exception:
            pass


def _apply_sheet_bold_style(
    headers: dict, spreadsheet_token: str, sheet_id: str, values: list[list[str]]
) -> None:
    """表头行(0)和首列加粗。调用飞书 Sheets style API。失败静默跳过。"""
    if not values or not spreadsheet_token or not sheet_id:
        return
    rows, cols = len(values), max(len(r) for r in values)
    if rows <= 0 or cols <= 0:
        return
    end_col = _col_letter(cols - 1)
    url = f"https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{spreadsheet_token}/styles"
    try:
        requests.put(
            url, headers=headers,
            json={"appendStyle": {"range": f"{sheet_id}!A1:{end_col}1", "style": {"font": {"bold": True}}}},
            timeout=10,
        )
        if rows > 1:
            requests.put(
                url, headers=headers,
                json={"appendStyle": {"range": f"{sheet_id}!A2:A{rows}", "style": {"font": {"bold": True}}}},
                timeout=10,
            )
    except Exception:
        pass


def _fill_sheet_block_values(headers: dict, sheet_block_token: str, values: list[list[str]]) -> bool:
    if not sheet_block_token or "_" not in sheet_block_token or not values:
        return False
    spreadsheet_token, sheet_id = sheet_block_token.rsplit("_", 1)
    rows = len(values)
    cols = max((len(r) for r in values), default=0)
    if rows <= 0 or cols <= 0:
        return False
    norm = [list(r) + [""] * (cols - len(r)) for r in values]
    end_col = _col_letter(cols - 1)
    range_str = f"{sheet_id}!A1:{end_col}{rows}"
    url = f"https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{spreadsheet_token}/values"
    payload = {"valueRange": {"range": range_str, "values": norm}}
    r = requests.put(url, headers=headers, params={"valueInputOption": "RAW"}, json=payload, timeout=30)
    try:
        j = r.json()
    except Exception:
        j = {"code": -1, "msg": r.text[:160]}
    if j.get("code") != 0:
        print(f"⚠️ 表格数据写入失败: {j.get('msg')} range={range_str}")
        return False
    # 写完数据后自动适配列宽 + 表头/首列加粗
    _auto_resize_sheet_columns(headers, spreadsheet_token, sheet_id, values)
    _apply_sheet_bold_style(headers, spreadsheet_token, sheet_id, values)
    return True


def _write_block_with_sheet_data(doc_token: str, headers: dict, block: dict) -> bool:
    values = block.get("__sheet_values")
    post_block = dict(block)
    post_block.pop("__sheet_values", None)
    res = _post_children(doc_token, headers, [post_block], None)
    if res.get("code") != 0:
        print(f"⚠️ 表格块写入失败: code={res.get('code')} msg={res.get('msg')}")
        return False
    children = ((res.get("data") or {}).get("children") or [])
    if not children:
        print("⚠️ 表格块写入成功但未返回 children，无法回填单元格")
        return False
    sheet_token = ((children[0].get("sheet") or {}).get("token") or "")
    if not sheet_token:
        print("⚠️ 未拿到 sheet token，无法写入表格内容")
        return False
    ok = _fill_sheet_block_values(headers, sheet_token, values or [])
    if ok:
        print("✅ 表格块已写入并回填数据")
    return ok


def _write_batch_with_fallback(doc_token: str, headers: dict, batch: list, total_valid_len: int) -> None:
    res = _post_children(doc_token, headers, batch, None)
    if res.get("code") != 0:
        debug = res.get("debug", "")
        print(f"⚠️ 写入失败: code={res.get('code')} msg={res.get('msg')} debug={debug}")
        if any(b.get("block_type") in (12, 18) for b in batch):
            safe = [b for b in batch if b.get("block_type") not in (12, 18)]
            if safe:
                res2 = _post_children(doc_token, headers, safe, None)
                if res2.get("code") == 0:
                    print("⚠️ 图片块跳过，已写文本（图片已上传到文档素材）")
                    time.sleep(0.35)
                    return

        print("⚠️ 进入逐块写入降级模式：定位并跳过非法块")
        for b in batch:
            if b.get("block_type") in (12, 18):
                continue
            r1 = _post_children(doc_token, headers, [b], None)
            if r1.get("code") == 0:
                time.sleep(0.35)
                continue
            bt = b.get("block_type")
            # code(14) 和 callout(19) 失败时降级为文本块
            fallback_content = ""
            if bt == 14:
                elems = (b.get("code") or {}).get("elements") or []
                fallback_content = _get_elements_content(elems)
            elif bt == 19:
                elems = (b.get("callout") or {}).get("elements") or []
                fallback_content = _get_elements_content(elems)
            if fallback_content:
                r2 = _post_children(doc_token, headers, [{"block_type": 2, "text": {"elements": [{"text_run": {"content": fallback_content, "text_element_style": {}}}], "style": {}}}], None)
                if r2.get("code") == 0:
                    print(f"⚠️ block_type={bt} 降级为文本块写入")
                    time.sleep(0.35)
                    continue
            c = _get_text_content(b)
            preview = (c[:60] + "...") if c and len(c) > 60 else (c or "")
            print(f"⚠️ 跳过非法块: code={r1.get('code')} msg={r1.get('msg')} preview={preview!r}")
            time.sleep(0.35)
        return
    if total_valid_len > 50:
        time.sleep(0.35)


def write_blocks(doc_token: str, headers: dict, blocks: list) -> None:
    valid = sanitize_blocks([b for b in blocks if b is not None])
    pending = []

    def flush_pending():
        nonlocal pending
        for i in range(0, len(pending), 50):
            batch = pending[i : i + 50]
            _write_batch_with_fallback(doc_token, headers, batch, len(valid))
        pending = []

    for b in valid:
        if isinstance(b, dict) and "__sheet_values" in b and b.get("block_type") == 30:
            flush_pending()
            _write_block_with_sheet_data(doc_token, headers, b)
            time.sleep(0.35)
            continue
        pending.append(b)
    flush_pending()


def send_webhook(webhook: str, text: str) -> None:
    if not webhook:
        return
    if FEISHU_GROUP_SEND_DISABLED:
        print("⛔ 已拦截：FEISHU_GROUP_SEND_DISABLED=1，跳过飞书群 webhook 推送")
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
    source_md = (data.get("source") or "").strip()
    source_md_dir = Path(source_md).expanduser().resolve().parent if source_md else None

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
        found_doc, found_node, found_title, found_space = find_existing_node_by_title(args.parent, args.title, headers)
        if found_doc and found_node:
            doc_token, node_token = found_doc, found_node
            print(f"📋 命中相似标题，改为更新: {found_title}")
            if found_title != args.title and found_space:
                if rename_node_title(found_space, node_token, args.title, headers):
                    print(f"✅ 已将文档重命名为：{args.title}")
                else:
                    print("⚠️ 文档重命名失败，继续按原文档更新内容")
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
        full = resolve_image_full_path(p, base_dir, source_md_dir)
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

