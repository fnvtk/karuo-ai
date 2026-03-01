#!/usr/bin/env python3
"""
将飞书导出的 JSON 文件（含 content + blocks）按**原有类型**上传：先根据 JSON 判断是文档还是多维表格，再创建对应类型。
- 若 JSON 表示的是多维表格（根为 board/block_type 43，或文档内唯一实质内容为一块多维表格）→ 只创建飞书多维表格，不创建文档。
- 若 JSON 表示的是文档 → 创建 Wiki 文档并写入块（其中 block_type 43 会新建多维表格并嵌入）。
用法: python3 upload_json_to_feishu_doc.py /path/to/xxx.json
可选: --parent <wiki_node_token>  --title "文档标题"
"""
import json
import sys
import time
import argparse
import requests
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from feishu_wiki_create_doc import create_wiki_doc, get_token, CONFIG

# 默认 Wiki 父节点（与 SKILL 中「日记分享/新研究」一致）
DEFAULT_PARENT = "KNf7wA8Rki1NSdkkSIqcdFtTnWb"
# 飞书多维表格 base URL（独立应用）
FEISHU_BASE_URL = "https://cunkebao.feishu.cn/base"


def detect_export_type(data: dict) -> tuple[str, str]:
    """
    根据 JSON 结构判断导出类型：多维表格 or 文档。
    返回 ( "bitable" | "docx", 用于命名的 title )。
    规则：根为 block_type 43 → 多维表格；根为 page(1) 且直接子块中唯一实质内容为一块 43 → 多维表格；否则为文档。
    """
    blocks = data.get("blocks") or []
    if not blocks:
        return "docx", (data.get("content") or "未命名").split("\n")[0].strip() or "未命名"

    by_id = {b.get("block_id"): b for b in blocks}
    root = None
    for b in blocks:
        if b.get("block_type") == 43 and b.get("parent_id") == "":
            # 根节点本身就是多维表格
            name = (data.get("content") or "多维表格").split("\n")[0].strip() or "多维表格"
            return "bitable", name
        if b.get("block_type") == 1 or b.get("parent_id") == "":
            root = b
            break

    if not root:
        return "docx", (data.get("content") or "未命名").split("\n")[0].strip() or "未命名"

    # 根为 page(1)：看直接子块是否「仅一块多维表格 + 至多一条短文本（标题/标签）」
    child_ids = root.get("children") or []
    has_board = False
    name_from_page = ""
    if root.get("page") and root["page"].get("elements"):
        for el in root["page"]["elements"]:
            c = el.get("text_run", {}).get("content", "").strip()
            if c:
                name_from_page = c
                break
    if not name_from_page and data.get("content"):
        name_from_page = data["content"].split("\n")[0].strip() or "多维表格"

    non_empty_text_count = 0
    board_count = 0
    name_from_text = ""
    for bid in child_ids:
        b = by_id.get(bid)
        if not b:
            continue
        if b.get("block_type") == 43:
            board_count += 1
        elif b.get("block_type") == 2 and b.get("text"):
            content = "".join(el.get("text_run", {}).get("content", "") for el in (b["text"].get("elements") or [])).strip()
            if content and not content.startswith("http"):
                non_empty_text_count += 1
                if not name_from_text:
                    name_from_text = content[:50]

    # 若直接子块里有一块多维表格，且其余至多一条非链接文本（标题/标签）→ 视为「以多维表格为主」，创建多维表格
    if board_count >= 1 and non_empty_text_count <= 1:
        return "bitable", name_from_text or name_from_page or "多维表格"
    return "docx", name_from_page or "未命名"


def _to_api_block(b: dict) -> dict | None:
    """将导出块转为 API 可用的块（去掉 block_id、parent_id，保留 block_type 与类型字段）。"""
    bt = b.get("block_type")
    out = {"block_type": bt}
    if bt == 2 and b.get("text"):
        out["text"] = b["text"]
    elif bt == 3 and b.get("heading1"):
        out["heading1"] = b["heading1"]
    elif bt == 4 and b.get("heading2"):
        out["heading2"] = b["heading2"]
    elif bt == 6 and b.get("heading4"):
        out["heading4"] = b["heading4"]
    elif bt == 17 and b.get("todo"):
        out["todo"] = b["todo"]
    elif bt == 19 and b.get("callout"):
        out["callout"] = b["callout"]
    elif bt == 43:
        # 多维表格：导出为 board.token，API 为 bitable.token；占位，后续用新建的 app_token 替换
        token = (b.get("board") or b.get("bitable") or {}).get("token", "")
        out["_bitable_placeholder"] = True
        out["_bitable_token"] = token  # 可能为原文档 token（同租户可尝试直接嵌）
        out["bitable"] = {"token": token or "PLACEHOLDER"}
    else:
        # 其他类型尽量透传类型字段
        for key in ("page", "board", "bitable", "sheet", "mindnote", "poll"):
            if key in b and not key.startswith("_"):
                out[key] = b[key]
                break
        if "_bitable_placeholder" not in out and "bitable" not in out and "board" in b:
            out["_bitable_placeholder"] = True
            out["bitable"] = {"token": (b.get("board") or {}).get("token", "PLACEHOLDER")}
    return out


def create_bitable_app(access_token: str, name: str, folder_token: str | None = None) -> tuple[str | None, str]:
    """在飞书云空间创建多维表格。返回 (app_token, error_msg)。"""
    url = "https://open.feishu.cn/open-apis/bitable/v1/apps"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    payload = {"name": name or "多维表格"}
    if folder_token:
        payload["folder_token"] = folder_token
    r = requests.post(url, headers=headers, json=payload, timeout=30)
    data = r.json()
    if data.get("code") == 0:
        return data.get("data", {}).get("app_token"), ""
    msg = data.get("msg", str(data))
    return None, msg


def blocks_from_export_json(data: dict) -> tuple[str, list]:
    """
    从飞书导出格式（content + blocks）解析出标题和可写入的 children 列表。
    多维表格（block_type 43/board）会产出占位块，需在获得 token 后调用 resolve_bitable_placeholders 替换。
    返回 (title, children)。
    """
    blocks = data.get("blocks") or []
    if not blocks:
        title = (data.get("content") or "未命名").split("\n")[0].strip() or "未命名"
        return title, [{"block_type": 3, "heading1": {"elements": [{"text_run": {"content": title, "text_element_style": {}}}], "style": {}}}]

    root = None
    by_id = {}
    for b in blocks:
        by_id[b.get("block_id")] = b
        if b.get("block_type") == 1 or b.get("parent_id") == "":
            root = b

    if not root:
        title = (data.get("content") or "未命名").split("\n")[0].strip() or "未命名"
        return title, [{"block_type": 3, "heading1": {"elements": [{"text_run": {"content": title, "text_element_style": {}}}], "style": {}}}]

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
    children.append({"block_type": 3, "heading1": {"elements": [{"text_run": {"content": title, "text_element_style": {}}}], "style": {}}})

    for bid in child_ids:
        b = by_id.get(bid)
        if not b:
            continue
        bt = b.get("block_type")
        if bt == 2 and b.get("text"):
            els = b["text"].get("elements") or []
            content = "".join(el.get("text_run", {}).get("content", "") for el in els).strip()
            if not content:
                continue
            style = b["text"].get("style", {})
            el_style = (b["text"].get("elements") or [{}])[0].get("text_element_style", {})
            children.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": content, "text_element_style": el_style}}], "style": style}})
        elif bt == 43 and (b.get("board") or b.get("bitable")):
            token = (b.get("board") or b.get("bitable") or {}).get("token", "")
            children.append({"_bitable_placeholder": True, "block_type": 43, "bitable": {"token": token}, "name": "流量来源"})
        elif bt not in (2, 43):
            api_block = _to_api_block(b)
            if api_block and not api_block.get("_bitable_placeholder"):
                children.append(api_block)

    return title, children


def resolve_bitable_placeholders(children: list, access_token: str, default_name: str = "多维表格") -> list:
    """将 children 中的 _bitable_placeholder 替换为新建的多维表格块（block_type 43 + bitable.token）。"""
    out = []
    for i, c in enumerate(children):
        if isinstance(c, dict) and c.get("_bitable_placeholder") and c.get("block_type") == 43:
            name = c.get("name") or default_name
            app_token, _ = create_bitable_app(access_token, name)
            if app_token:
                out.append({"block_type": 43, "bitable": {"token": app_token}})
                time.sleep(0.4)
            else:
                out.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": "（多维表格创建失败，请手动插入）", "text_element_style": {}}}], "style": {}}})
        else:
            c_copy = {k: v for k, v in (c or {}).items() if not k.startswith("_")}
            if c_copy:
                out.append(c_copy)
    return out


def main():
    ap = argparse.ArgumentParser(description="将飞书导出 JSON 按类型上传：先判断文档/多维表格，再创建对应类型")
    ap.add_argument("json_path", help="JSON 文件路径（含 content + blocks）")
    ap.add_argument("--parent", default=DEFAULT_PARENT, help="Wiki 父节点 token（仅创建文档时使用）")
    ap.add_argument("--title", default=None, help="覆盖标题/名称（默认从 JSON 解析）")
    args = ap.parse_args()

    path = Path(args.json_path)
    if not path.exists():
        print(f"❌ 文件不存在: {path}")
        sys.exit(1)

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    export_type, name = detect_export_type(data)
    if args.title:
        name = args.title

    token = get_token(args.parent)
    if not token:
        print("❌ 无法获取飞书 Token")
        sys.exit(1)

    # 先根据 JSON 类型决定创建什么
    if export_type == "bitable":
        print("=" * 50)
        print(f"📤 检测为多维表格，创建飞书多维表格：{name}")
        print("=" * 50)
        app_token, err = create_bitable_app(token, name)
        if app_token:
            result = f"{FEISHU_BASE_URL}/{app_token}"
            print("✅ 创建成功（多维表格）")
            print(f"📎 {result}")
            try:
                import subprocess
                subprocess.run(["open", result], capture_output=True)
            except Exception:
                pass
        else:
            print(f"❌ 多维表格创建失败：{err or '未知错误'}")
            print("   请检查应用是否具备「创建多维表格」权限（飞书开放平台 → 权限配置）")
            sys.exit(1)
        print("=" * 50)
        return

    # 文档：创建 Wiki 文档并写入块
    title, children = blocks_from_export_json(data)
    if args.title:
        title = args.title
    children = resolve_bitable_placeholders(children, token, default_name=name or "多维表格")

    print("=" * 50)
    print(f"📤 检测为文档，上传为飞书文档：{title}")
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
