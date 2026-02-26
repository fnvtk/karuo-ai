#!/usr/bin/env python3
"""
从飞书 Wiki 页面下载所有图片（命令行 + 飞书 Token）。

用法：
  # 方式一：环境变量传入 Token（推荐）
  export FEISHU_TOKEN="t-xxx"   # 或 user_access_token: u-xxx
  python3 feishu_wiki_download_images.py "https://scnr5b9fypdq.feishu.cn/wiki/NAMUwdbuFiAy2GkmMZ3clXynnwc"

  # 方式二：使用同目录下 .feishu_tokens.json（与 feishu_wiki_create_doc 一致）
  python3 feishu_wiki_download_images.py "https://scnr5b9fypdq.feishu.cn/wiki/NAMUwdbuFiAy2GkmMZ3clXynnwc"

  # 指定保存目录
  python3 feishu_wiki_download_images.py "URL" -o ./wiki_images

依赖：requests（pip install requests）
"""

import os
import re
import sys
import json
import argparse
import time
from pathlib import Path
from urllib.parse import urlparse
from datetime import datetime

import requests

SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG = {
    "APP_ID": "cli_a48818290ef8100d",
    "APP_SECRET": "dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4",
    "TOKEN_FILE": SCRIPT_DIR / ".feishu_tokens.json",
}


def load_tokens():
    if CONFIG["TOKEN_FILE"].exists():
        with open(CONFIG["TOKEN_FILE"], encoding="utf-8") as f:
            return json.load(f)
    return {}


def get_app_token():
    r = requests.post(
        "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal",
        json={"app_id": CONFIG["APP_ID"], "app_secret": CONFIG["APP_SECRET"]},
        timeout=10,
    )
    data = r.json()
    return data.get("app_access_token") if data.get("code") == 0 else None


def refresh_user_token(tokens):
    if not tokens.get("refresh_token"):
        return None
    app_token = get_app_token()
    if not app_token:
        return None
    r = requests.post(
        "https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token",
        headers={"Authorization": f"Bearer {app_token}", "Content-Type": "application/json"},
        json={"grant_type": "refresh_token", "refresh_token": tokens["refresh_token"]},
        timeout=10,
    )
    result = r.json()
    if result.get("code") == 0:
        data = result.get("data", {})
        tokens["access_token"] = data.get("access_token")
        tokens["refresh_token"] = data.get("refresh_token", tokens["refresh_token"])
        tokens["auth_time"] = datetime.now().isoformat()
        with open(CONFIG["TOKEN_FILE"], "w", encoding="utf-8") as f:
            json.dump(tokens, f, ensure_ascii=False, indent=2)
        return tokens["access_token"]
    return None


def get_token(node_token: str) -> str | None:
    """优先 FEISHU_TOKEN，否则用 .feishu_tokens.json 的 user access_token（必要时刷新）。"""
    env_token = os.environ.get("FEISHU_TOKEN", "").strip()
    if env_token:
        return env_token
    tokens = load_tokens()
    access = tokens.get("access_token")
    if access:
        # 简单校验：能访问 get_node 即认为有效
        try:
            r = requests.get(
                f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={node_token}",
                headers={"Authorization": f"Bearer {access}"},
                timeout=10,
            )
            if r.json().get("code") == 0:
                return access
        except Exception:
            pass
    new_token = refresh_user_token(tokens)
    if new_token:
        try:
            r = requests.get(
                f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={node_token}",
                headers={"Authorization": f"Bearer {new_token}"},
                timeout=10,
            )
            if r.json().get("code") == 0:
                return new_token
        except Exception:
            pass
    return None


def wiki_url_to_node_token(url: str) -> str | None:
    """从 Wiki 页面 URL 解析 node_token。"""
    # .../wiki/NAMUwdbuFiAy2GkmMZ3clXynnwc 或 .../wiki/xxx?...
    m = re.search(r"/wiki/([A-Za-z0-9_-]+)", url)
    return m.group(1) if m else None


def get_wiki_node(token: str, node_token: str) -> dict | None:
    """获取 wiki 节点信息，返回 node 字典（含 obj_token, obj_type）。"""
    r = requests.get(
        f"https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token={node_token}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    j = r.json()
    if j.get("code") != 0:
        return None
    return j.get("data", {}).get("node")


def get_wiki_child_nodes(token: str, space_id: str, parent_node_token: str) -> list[dict]:
    """获取知识空间下某节点的子节点列表（分页拉全）。返回 [{node_token, obj_token, obj_type, title}, ...]。"""
    headers = {"Authorization": f"Bearer {token}"}
    out = []
    page_token = None
    while True:
        params = {"parent_node_token": parent_node_token, "page_size": 50}
        if page_token:
            params["page_token"] = page_token
        r = requests.get(
            f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes",
            headers=headers,
            params=params,
            timeout=30,
        )
        j = r.json()
        if j.get("code") != 0:
            break
        data = j.get("data") or {}
        items = data.get("items") or []
        for n in items:
            out.append({
                "node_token": n.get("node_token"),
                "obj_token": n.get("obj_token"),
                "obj_type": (n.get("obj_type") or "").lower(),
                "title": (n.get("title") or "未命名").strip() or "未命名",
            })
        page_token = data.get("page_token")
        if not page_token:
            break
        time.sleep(0.2)
    return out


def collect_file_tokens_from_sheet(token: str, spreadsheet_token: str) -> list[str]:
    """从电子表格中收集浮动图片的 file_token / float_image_token。"""
    headers = {"Authorization": f"Bearer {token}"}
    file_tokens = []

    # 1. 获取表格元数据（含所有 sheet_id）
    r = requests.get(
        f"https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/{spreadsheet_token}",
        headers=headers,
        params={"ext": "true"},
        timeout=30,
    )
    j = r.json()
    if j.get("code") != 0:
        return []
    sheets = (j.get("data") or {}).get("spreadsheet", {}).get("sheets") or []
    if not sheets:
        return []

    # 2. 每个 sheet 查询浮动图片（部分版本 API 支持 list）
    for sh in sheets:
        sheet_id = sh.get("sheet_id")
        if not sheet_id:
            continue
        list_r = requests.get(
            f"https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/{spreadsheet_token}/sheets/{sheet_id}/float_images",
            headers=headers,
            timeout=30,
        )
        list_j = list_r.json()
        if list_j.get("code") == 0:
            items = (list_j.get("data") or {}).get("items") or []
            for item in items:
                ft = item.get("file_token") or item.get("float_image_token")
                if ft:
                    file_tokens.append(ft)
        time.sleep(0.2)

    # 3. 若没有浮动图片，尝试从单元格取值中解析附件 file_token（公式计算值/格式化值）
    if not file_tokens:
        for sh in sheets:
            sheet_id = sh.get("sheet_id")
            if not sheet_id:
                continue
            range_str = f"{sheet_id}!A1:ZZ300"
            vr = requests.get(
                "https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{}/values_batch_get".format(
                    spreadsheet_token
                ),
                headers=headers,
                params={"ranges": range_str, "valueRenderOption": "FormattedValue"},
                timeout=30,
            )
            vj = vr.json()
            if vj.get("code") != 0:
                continue
            value_ranges = (vj.get("data") or {}).get("valueRanges") or (vj.get("data") or {}).get("valueRange") or []
            if not isinstance(value_ranges, list):
                value_ranges = [value_ranges] if value_ranges else []
            for tab in value_ranges:
                vals = tab.get("values") or []
                for row in vals:
                    for cell in row if isinstance(row, (list, tuple)) else [row]:
                        _extract_file_tokens(cell, file_tokens)
            time.sleep(0.2)

    return file_tokens


def _extract_file_tokens(obj, out: list):
    """从单元格值（可能为嵌套 list/dict）中递归提取 file_token/fileToken。"""
    if isinstance(obj, dict):
        ft = obj.get("file_token") or obj.get("fileToken")
        if ft and isinstance(ft, str):
            out.append(ft)
        for v in obj.values():
            _extract_file_tokens(v, out)
    elif isinstance(obj, (list, tuple)):
        for x in obj:
            _extract_file_tokens(x, out)


def collect_file_tokens_from_docx(token: str, document_id: str) -> list[str]:
    """从 docx 文档拉取全部 blocks，收集图片/文件的 file_token。"""
    headers = {"Authorization": f"Bearer {token}"}
    file_tokens = []
    page_token = None
    while True:
        params = {"page_size": 200}
        if page_token:
            params["page_token"] = page_token
        r = requests.get(
            f"https://open.feishu.cn/open-apis/docx/v1/documents/{document_id}/blocks",
            headers=headers,
            params=params,
            timeout=30,
        )
        j = r.json()
        if j.get("code") != 0:
            break
        data = j.get("data", {}) or {}
        items = data.get("items", []) or []
        for block in items:
            bt = block.get("block_type")
            # 12 = file, 18 = gallery
            if bt == 12:
                ft = (block.get("file") or {}).get("file_token")
                if ft:
                    file_tokens.append(ft)
            elif bt == 18:
                gal = block.get("gallery") or {}
                image_list = gal.get("image_list") or gal.get("imageList") or []
                for img in image_list:
                    ft = (img if isinstance(img, dict) else {}).get("file_token")
                    if ft:
                        file_tokens.append(ft)
        page_token = data.get("page_token")
        if not page_token:
            break
        time.sleep(0.25)
    return file_tokens


def get_tmp_download_urls(token: str, file_tokens: list[str]) -> dict[str, str]:
    """批量获取临时下载链接。返回 file_token -> url。"""
    if not file_tokens:
        return {}
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    # 接口单次最多 100 个
    out = {}
    for i in range(0, len(file_tokens), 100):
        chunk = file_tokens[i : i + 100]
        r = requests.post(
            "https://open.feishu.cn/open-apis/drive/v1/medias/batch_get_tmp_download_url",
            headers=headers,
            json={"file_tokens": chunk},
            timeout=30,
        )
        j = r.json()
        if j.get("code") != 0:
            continue
        for item in (j.get("data") or {}).get("tmp_download_urls", []) or []:
            ft = item.get("file_token")
            url = item.get("tmp_download_url")
            if ft and url:
                out[ft] = url
        time.sleep(0.25)
    return out


def download_file(url: str, save_path: Path, token: str) -> bool:
    """用 curl 下载（带 Authorization）到 save_path。"""
    save_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "curl",
        "-sS",
        "-L",
        "-H",
        f"Authorization: Bearer {token}",
        "-o",
        str(save_path),
        url,
    ]
    ret = os.system(" ".join(cmd))
    return ret == 0


def _collect_from_node(token: str, obj_token: str, obj_type: str) -> list[str]:
    """从单个节点（docx/sheet）收集 file_tokens。"""
    if obj_type == "sheet":
        return collect_file_tokens_from_sheet(token, obj_token)
    if obj_type == "docx":
        return collect_file_tokens_from_docx(token, obj_token)
    return []


def main():
    ap = argparse.ArgumentParser(description="从飞书 Wiki 页面下载所有图片（命令行 + Token）")
    ap.add_argument("url", help="Wiki 页面 URL，如 https://xxx.feishu.cn/wiki/NAMUwdbuFiAy2GkmMZ3clXynnwc")
    ap.add_argument("-o", "--output", default="./feishu_wiki_images", help="图片保存目录，默认 ./feishu_wiki_images")
    ap.add_argument("--all-pages", action="store_true", help="遍历当前节点下所有子页面（docx/sheet），汇总下载图片")
    args = ap.parse_args()

    node_token = wiki_url_to_node_token(args.url)
    if not node_token:
        print("无法从 URL 解析 wiki node_token")
        sys.exit(1)

    token = get_token(node_token)
    if not token:
        print("未设置 FEISHU_TOKEN 且无法从 .feishu_tokens.json 获取有效 Token，请先授权或 export FEISHU_TOKEN=xxx")
        sys.exit(1)

    node = get_wiki_node(token, node_token)
    if not node:
        print("获取 Wiki 节点失败，请检查链接与权限")
        sys.exit(1)

    space_id = node.get("space_id") or (node.get("space") or {}).get("space_id") or node.get("origin_space_id")
    obj_token = node.get("obj_token")
    obj_type = (node.get("obj_type") or "").lower()

    file_tokens = []
    if args.all_pages:
        if not space_id:
            print("无法获取知识空间 space_id，无法遍历子节点；将仅处理当前节点。")
        else:
            # 遍历子节点，从每个 docx/sheet 收集图片
            children = get_wiki_child_nodes(token, space_id, node_token)
            docx_sheet = [c for c in children if (c.get("obj_type") or "") in ("docx", "sheet") and c.get("obj_token")]
            print(f"当前节点下共 {len(children)} 个子节点，其中 docx/sheet: {len(docx_sheet)} 个")
            for ch in docx_sheet:
                ct = ch.get("obj_type") or ""
                co = ch.get("obj_token")
                title = ch.get("title") or "未命名"
                tokens = _collect_from_node(token, co, ct)
                if tokens:
                    print(f"  子页「{title}」: {len(tokens)} 个资源")
                    file_tokens.extend(tokens)
                time.sleep(0.2)
            # 若子页无图，且当前节点本身是 docx/sheet，则从当前节点再收一次
            if not file_tokens and obj_token and obj_type in ("docx", "sheet"):
                file_tokens = _collect_from_node(token, obj_token, obj_type)
                if file_tokens:
                    print(f"  当前节点（{obj_type}）: {len(file_tokens)} 个资源")
    else:
        # 仅当前节点
        if not obj_token:
            print("该节点无关联文档（obj_token 为空）。可尝试加上 --all-pages 遍历子页面。")
            sys.exit(1)
        if obj_type not in ("docx", "doc", "sheet"):
            print(f"当前仅支持 docx/doc/sheet，该节点类型为: {obj_type}。可尝试加上 --all-pages 遍历子页面。")
            sys.exit(1)
        if obj_type == "doc":
            print("旧版 doc 的图片需通过 doc/v2 接口解析，本脚本暂仅支持 docx；可先在飞书内将页面另存为新版文档再试。")
            sys.exit(1)
        file_tokens = _collect_from_node(token, obj_token, obj_type)

    if not file_tokens:
        print("未发现任何图片或文件块。若为目录/表格，请使用 --all-pages 遍历子页面。")
        sys.exit(0)

    # 去重保持顺序
    seen = set()
    unique_tokens = []
    for ft in file_tokens:
        if ft not in seen:
            seen.add(ft)
            unique_tokens.append(ft)

    urls = get_tmp_download_urls(token, unique_tokens)
    out_dir = Path(args.output).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    for i, ft in enumerate(unique_tokens):
        url = urls.get(ft)
        if not url:
            print(f"跳过 {ft}（无临时链接）")
            continue
        ext = "png"
        save_path = out_dir / f"image_{i+1:04d}.{ext}"
        if download_file(url, save_path, token):
            print(f"已保存: {save_path}")
        else:
            print(f"下载失败: {save_path}")

    print(f"完成，共 {len(unique_tokens)} 个资源，已保存到: {out_dir}")


if __name__ == "__main__":
    main()
