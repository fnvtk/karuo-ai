#!/usr/bin/env python3
"""
将本地目录下所有 JSON 文件按目录结构批量上传到指定飞书 Wiki 节点下。
- 先按目录层级创建子节点（子目录），再在每个目录下上传对应 JSON 为子文档/多维表格。
- 格式与单文件上传一致：先根据 JSON 判断文档/多维表格，再创建对应类型；多维表格会建独立多维表格并在 Wiki 下建一篇带链接的文档。

用法:
  python3 batch_upload_json_to_feishu_wiki.py /Users/karuo/Downloads/__20260301_180628 --wiki-parent G6rVwQO22imFzmk7nXCckCsmnRh
"""
import json
import sys
import time
import argparse
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from feishu_wiki_create_doc import get_token, create_wiki_doc, create_wiki_node
from upload_json_to_feishu_doc import (
    detect_export_type,
    blocks_from_export_json,
    resolve_bitable_placeholders,
    create_bitable_app,
    FEISHU_BASE_URL,
)


def collect_dirs_and_files(root_dir: Path) -> tuple[list[str], list[str]]:
    """返回 (相对路径目录列表, 相对路径 JSON 文件列表)，目录按父在前排序。"""
    root_dir = root_dir.resolve()
    dirs = set()
    files = []
    for f in root_dir.rglob("*.json"):
        try:
            rel = f.relative_to(root_dir)
            rel_str = str(rel)
            files.append(rel_str)
            parent = Path(rel_str).parent
            while parent != Path("."):
                dirs.add(str(parent))
                parent = parent.parent
            if rel_str.count("/") == 0:
                pass  # 根目录文件
            else:
                dirs.add(str(Path(rel_str).parent))
        except ValueError:
            continue
    dirs = sorted(dirs, key=lambda x: (x.count("/"), x))
    return dirs, sorted(files)


def ensure_dir_nodes(wiki_parent: str, root_dir: Path, dirs: list[str], token_map: dict) -> bool:
    """按顺序创建目录节点，token_map 会写入 rel_path -> node_token。"""
    token = get_token(wiki_parent)
    if not token:
        print("❌ 无法获取飞书 Token")
        return False
    token_map[""] = wiki_parent
    for rel in dirs:
        parent_rel = str(Path(rel).parent) if Path(rel).parent != Path(".") else ""
        parent_token = token_map.get(parent_rel)
        if not parent_token:
            print(f"⚠️ 跳过目录 {rel}：未找到父节点")
            continue
        name = Path(rel).name
        ok, result = create_wiki_node(parent_token, name)
        if not ok:
            print(f"❌ 创建目录节点「{name}」失败：{result}")
            return False
        token_map[rel] = result
        print(f"  📁 已创建子目录：{rel}")
        time.sleep(0.35)
    return True


def upload_one_json(
    json_path: Path,
    parent_token: str,
    access_token: str,
    fallback_only: bool = False,
) -> tuple[bool, str]:
    """上传单个 JSON 到指定父节点下。fallback_only=True 时仅用「标题+全文」建文档。返回 (成功, url或信息)。"""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    export_type, name = detect_export_type(data)
    title = (data.get("content") or name or "未命名").split("\n")[0].strip() or name or "未命名"

    def fallback_doc():
        raw = (data.get("content") or "").strip() or title
        return [
            {"block_type": 3, "heading1": {"elements": [{"text_run": {"content": title, "text_element_style": {}}}], "style": {}}},
            {"block_type": 2, "text": {"elements": [{"text_run": {"content": raw[:50000], "text_element_style": {}}}], "style": {}}},
        ]

    if fallback_only:
        ok, result = create_wiki_doc(parent_token, title, fallback_doc())
        return ok, result

    if export_type == "bitable":
        app_token, err = create_bitable_app(access_token, name)
        if not app_token:
            return False, f"多维表格创建失败：{err}"
        url = f"{FEISHU_BASE_URL}/{app_token}"
        blocks = [
            {"block_type": 3, "heading1": {"elements": [{"text_run": {"content": name, "text_element_style": {}}}], "style": {}}},
            {"block_type": 2, "text": {"elements": [{"text_run": {"content": f"多维表格链接：{url}", "text_element_style": {}}}], "style": {}}},
        ]
        ok, result = create_wiki_doc(parent_token, name, blocks)
        return ok, result if ok else result
    title, children = blocks_from_export_json(data)
    children = resolve_bitable_placeholders(children, access_token, default_name=name or "多维表格")
    ok, result = create_wiki_doc(parent_token, title, children)
    if ok:
        return ok, result
    # 失败时回退：用「标题 + 全文」建一篇文档，保证内容不丢
    if "invalid param" in result or "block not support" in result.lower():
        ok2, result2 = create_wiki_doc(parent_token, title, fallback_doc())
        return ok2, result2
    return ok, result


def main():
    ap = argparse.ArgumentParser(description="批量上传目录下 JSON 到飞书 Wiki，保持目录结构")
    ap.add_argument("root_dir", type=Path, help="本地根目录（含子目录和 JSON）")
    ap.add_argument("--wiki-parent", default="G6rVwQO22imFzmk7nXCckCsmnRh", help="Wiki 父节点 token（链接 wiki/ 后面的部分）")
    ap.add_argument("--dry-run", action="store_true", help="仅列出将要上传的文件，不执行")
    args = ap.parse_args()

    root_dir = args.root_dir.resolve()
    if not root_dir.is_dir():
        print(f"❌ 目录不存在：{root_dir}")
        sys.exit(1)

    dirs, files = collect_dirs_and_files(root_dir)
    print("=" * 60)
    print(f"📂 根目录：{root_dir}")
    print(f"📎 Wiki 父节点：{args.wiki_parent}")
    print(f"📁 将创建子目录数：{len(dirs)}")
    print(f"📄 将上传 JSON 数：{len(files)}")
    print("=" * 60)

    if args.dry_run:
        for d in dirs:
            print(f"  目录：{d}")
        for f in files:
            print(f"  文件：{f}")
        return

    token_map = {}
    if not ensure_dir_nodes(args.wiki_parent, root_dir, dirs, token_map):
        sys.exit(1)

    token = get_token(args.wiki_parent)
    if not token:
        print("❌ 无法获取飞书 Token")
        sys.exit(1)

    failed = []
    for i, rel in enumerate(files):
        parent_rel = str(Path(rel).parent) if Path(rel).parent != Path(".") else ""
        parent_token = token_map.get(parent_rel, args.wiki_parent)
        path = root_dir / rel
        print(f"[{i+1}/{len(files)}] {rel} -> 父节点 {parent_rel or '(根)'}")
        ok, result = upload_one_json(path, parent_token, token)
        if ok:
            print(f"  ✅ {result[:60]}...")
        else:
            print(f"  ❌ {result}")
            failed.append((rel, result))
        time.sleep(0.4)

    # 对非「多维表格权限」的失败项用「标题+全文」再试一次，尽量保证每文件都有文档
    retried = []
    for rel, msg in failed[:]:
        if "多维表格创建失败" in msg:
            continue
        parent_rel = str(Path(rel).parent) if Path(rel).parent != Path(".") else ""
        parent_token = token_map.get(parent_rel, args.wiki_parent)
        path = root_dir / rel
        ok, result = upload_one_json(path, parent_token, token, fallback_only=True)
        if ok:
            retried.append(rel)
            failed.remove((rel, msg))
        time.sleep(0.3)
    if retried:
        print(f"🔄 回退上传成功 {len(retried)} 个：{retried[:5]}{'...' if len(retried) > 5 else ''}")

    print("=" * 60)
    success_count = len(files) - len(failed)
    print(f"📊 合计：成功 {success_count}/{len(files)}，失败 {len(failed)}")
    if failed:
        print(f"⚠️ 仍失败 {len(failed)} 个（多为多维表格需用户身份权限）：")
        for rel, msg in failed:
            print(f"   {rel}: {msg}")
    else:
        print("✅ 全部上传完成")
    print(f"📎 打开 Wiki：https://cunkebao.feishu.cn/wiki/{args.wiki_parent}")
    print("=" * 60)


if __name__ == "__main__":
    main()
