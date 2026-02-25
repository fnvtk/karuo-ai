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


def _sheet_table(values: list[list[str]]) -> dict:
    rows = len(values)
    cols = max((len(r) for r in values), default=0)
    return {
        "block_type": 30,
        "sheet": {"row_size": rows, "column_size": cols},
        "__sheet_values": values,
    }


def _parse_md_row(line: str) -> list[str]:
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|"):
        s = s[:-1]
    return [c.strip() for c in s.split("|")]


def _is_md_table_sep(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|"):
        s = s[:-1]
    parts = [p.strip() for p in s.split("|")]
    if not parts:
        return False
    return all(re.match(r"^:?-{3,}:?$", p or "") for p in parts)


def _clean_inline_markdown(text: str) -> str:
    """清理常见行内 markdown 标记，输出更适合飞书阅读的纯文本。"""
    t = text
    # 粗体/斜体标记
    t = re.sub(r"\*\*(.*?)\*\*", r"\1", t)
    t = re.sub(r"__(.*?)__", r"\1", t)
    t = re.sub(r"\*(.*?)\*", r"\1", t)
    t = re.sub(r"_(.*?)_", r"\1", t)
    # 行内代码保留内容，去掉反引号
    t = re.sub(r"`([^`]+)`", r"\1", t)
    return t.strip()


def md_to_blocks(md: str, image_paths: list[str] | None = None) -> list:
    """将 Markdown 转为飞书 blocks"""
    blocks = []
    image_paths = image_paths or []
    img_idx = 0
    first_h1_consumed = False

    in_code = False
    code_lines = []
    lines = md.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.strip().startswith("```"):
            if in_code:
                # 飞书 blocks 常对代码围栏/特殊格式更严格，这里转为普通文本行，提升美观与稳定性
                for cl in code_lines:
                    if cl.strip():
                        blocks.append(_text(f"代码：{cl.strip()}"))
                code_lines = []
            in_code = not in_code
            i += 1
            continue
        if in_code:
            code_lines.append(line)
            i += 1
            continue

        # 图片语法 ![](path)
        img_match = re.match(r"^!\[([^\]]*)\]\(([^)]+)\)\s*$", line.strip())
        if img_match:
            path = img_match.group(2)
            if img_idx < len(image_paths):
                path = image_paths[img_idx]
            blocks.append(_image_placeholder(img_idx, path))
            img_idx += 1
            i += 1
            continue

        # Markdown 表格：表头 + 分隔行 + 数据行
        if "|" in line and i + 1 < len(lines) and _is_md_table_sep(lines[i + 1]):
            table_lines = [line]
            j = i + 2
            while j < len(lines):
                raw = lines[j].strip()
                if not raw or "|" not in raw:
                    break
                if raw.startswith("#") or raw.startswith(">") or raw.startswith("```"):
                    break
                table_lines.append(lines[j])
                j += 1

            rows = [_parse_md_row(x) for x in table_lines]
            col_size = max((len(r) for r in rows), default=0)
            if col_size > 0:
                clean_rows: list[list[str]] = []
                for r in rows:
                    rr = [_clean_inline_markdown(c) for c in r]
                    if len(rr) < col_size:
                        rr.extend([""] * (col_size - len(rr)))
                    clean_rows.append(rr[:col_size])

                # 飞书空 sheet 创建限制：行列最大 9，超出时截断并提示
                max_rows, max_cols = 9, 9
                if len(clean_rows) > max_rows or col_size > max_cols:
                    blocks.append(_text("提示：原表格超出飞书单块上限，已自动截断为 9x9。"))
                clipped = [r[:max_cols] for r in clean_rows[:max_rows]]
                blocks.append(_sheet_table(clipped))

            i = j
            continue

        # 忽略 Markdown 水平分隔线（避免在飞书出现大量“---”影响观感）
        if line.strip() in {"---", "***", "___"}:
            i += 1
            continue

        # 标题
        if line.startswith("# "):
            # 避免正文和文档标题重复：默认跳过第一行 H1
            if first_h1_consumed:
                blocks.append(_h1(_clean_inline_markdown(line[2:].strip())))
            else:
                first_h1_consumed = True
        elif line.startswith("## "):
            blocks.append(_h2(_clean_inline_markdown(line[3:].strip())))
        elif line.startswith("### "):
            blocks.append(_h3(_clean_inline_markdown(line[4:].strip())))
        elif line.lstrip().startswith(">"):
            # 引用块转普通说明行，降低写入失败概率
            quote = line.lstrip()
            while quote.startswith(">"):
                quote = quote[1:].lstrip()
            quote = _clean_inline_markdown(quote)
            if quote:
                blocks.append(_text(quote))
        elif line.strip():
            raw = line.strip()
            # 无序列表统一成 •，减少 markdown 观感噪音
            if re.match(r"^[-*]\s+", raw):
                raw = "• " + re.sub(r"^[-*]\s+", "", raw)
            # 有序列表统一成 1）2）样式
            raw = re.sub(r"^(\d+)\.\s+", r"\1）", raw)
            cleaned = _clean_inline_markdown(raw)
            if cleaned:
                blocks.append(_text(cleaned))

        i += 1

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
