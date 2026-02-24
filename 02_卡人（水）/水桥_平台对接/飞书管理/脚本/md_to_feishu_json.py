#!/usr/bin/env python3
"""
将 Markdown 本地转换为飞书文档 JSON 格式。
图片用占位符 __IMAGE:路径__ 标注，上传时替换为 file_token。

用法:
  python3 md_to_feishu_json.py input.md output.json
  python3 md_to_feishu_json.py input.md output.json --images img1.png,img2.png
"""
import re
import sys
import json
import argparse
from pathlib import Path


def _h1(t):
    return {"block_type": 3, "heading1": {"elements": [{"text_run": {"content": t, "text_element_style": {}}}], "style": {}}}


def _h2(t):
    return {"block_type": 4, "heading2": {"elements": [{"text_run": {"content": t, "text_element_style": {}}}], "style": {}}}


def _h3(t):
    return {"block_type": 5, "heading3": {"elements": [{"text_run": {"content": t, "text_element_style": {}}}], "style": {}}}


def _text(t):
    return {"block_type": 2, "text": {"elements": [{"text_run": {"content": t, "text_element_style": {}}}], "style": {}}}


def _image_placeholder(idx: int, path: str) -> dict:
    """图片占位符，上传时由脚本替换为 gallery block"""
    return {"__image__": path, "__index__": idx}


def md_to_blocks(md: str, image_paths: list[str] | None = None) -> list:
    """将 Markdown 转为飞书 blocks"""
    blocks = []
    image_paths = image_paths or []
    img_idx = 0

    in_code = False
    code_lines = []
    for line in md.split("\n"):
        if line.strip().startswith("```"):
            if in_code:
                # 飞书 blocks 常对代码围栏/特殊格式更严格，这里转为普通文本行，提升美观与稳定性
                for cl in code_lines:
                    if cl.strip():
                        blocks.append(_text(f"代码：{cl.strip()}"))
                code_lines = []
            in_code = not in_code
            continue
        if in_code:
            code_lines.append(line)
            continue

        # 图片语法 ![](path)
        img_match = re.match(r"^!\[([^\]]*)\]\(([^)]+)\)\s*$", line.strip())
        if img_match:
            path = img_match.group(2)
            if img_idx < len(image_paths):
                path = image_paths[img_idx]
            blocks.append(_image_placeholder(img_idx, path))
            img_idx += 1
            continue

        # 忽略 Markdown 水平分隔线（避免在飞书出现大量“---”影响观感）
        if line.strip() in {"---", "***", "___"}:
            continue

        # 标题
        if line.startswith("# "):
            blocks.append(_h1(line[2:].strip()))
        elif line.startswith("## "):
            blocks.append(_h2(line[3:].strip()))
        elif line.startswith("### "):
            blocks.append(_h3(line[4:].strip()))
        elif line.lstrip().startswith(">"):
            # 引用块转普通说明行，降低写入失败概率
            blocks.append(_text(line.lstrip()[1:].strip()))
        elif line.strip():
            blocks.append(_text(line.strip()))

    return blocks


def blocks_to_upload_format(blocks: list, base_dir: Path) -> tuple[list, list]:
    """
    将含 __image__ 占位符的 blocks 转为可上传格式。
    返回 (文本 blocks 列表, 图片路径列表，按出现顺序)。
    image_paths 优先存相对路径（相对 base_dir），便于 JSON 移植。
    """
    out = []
    paths = []
    for b in blocks:
        if isinstance(b, dict) and "__image__" in b:
            path = b.get("__image__", "")
            resolved = None
            if path and (base_dir / path).exists():
                resolved = base_dir / path
            elif path and Path(path).exists():
                resolved = Path(path).resolve()
            if resolved:
                try:
                    rel = str(resolved.relative_to(base_dir))
                except ValueError:
                    rel = str(resolved)
                paths.append(rel)
            else:
                paths.append(path if path else "unknown")
            out.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": f"【配图 {len(paths)}：待上传】", "text_element_style": {}}}], "style": {}}})
        else:
            out.append(b)
    return out, paths


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input", help="Markdown 文件")
    ap.add_argument("output", help="输出 JSON 文件")
    ap.add_argument("--images", default="", help="图片路径，逗号分隔（按序对应 ![]()）")
    args = ap.parse_args()

    inp = Path(args.input)
    if not inp.exists():
        print(f"❌ 文件不存在: {inp}")
        sys.exit(1)

    md = inp.read_text(encoding="utf-8")
    image_paths = [p.strip() for p in args.images.split(",") if p.strip()]
    blocks = md_to_blocks(md, image_paths)
    final, img_paths = blocks_to_upload_format(blocks, inp.parent)

    out = {
        "description": f"由 {inp.name} 转换的飞书 docx blocks",
        "source": str(inp),
        "image_paths": img_paths,
        "children": final,
    }
    Path(args.output).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ 已写入 {args.output}")
    if img_paths:
        print(f"   图片占位: {len(img_paths)} 处 → 需在上传时替换为 file_token")


if __name__ == "__main__":
    main()
