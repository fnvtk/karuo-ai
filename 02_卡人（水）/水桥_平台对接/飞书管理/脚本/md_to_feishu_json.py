#!/usr/bin/env python3
"""
将 Markdown 本地转换为飞书文档 JSON 格式（v2）。
· 代码围栏 → block_type:14 code block（保留语言标注）
· > 引用   → block_type:19 callout（蓝色背景）
· ---      → block_type:22 divider
· ####     → block_type:6  heading4
· 图片     → __IMAGE__ 占位符，上传时替换为 file_token
· 表格     → block_type:30 sheet（超出 9×9 自动截断）

用法:
  python3 md_to_feishu_json.py input.md output.json
  python3 md_to_feishu_json.py input.md output.json --images img1.png,img2.png
"""
import re
import sys
import json
import argparse
from pathlib import Path


# ── 语言代码映射（飞书 code block style.language） ──────────────────────────
LANG_MAP: dict[str, int] = {
    "python": 2, "py": 2,
    "javascript": 3, "js": 3,
    "typescript": 3, "ts": 3,
    "shell": 6, "bash": 6, "sh": 6,
    "sql": 8,
    "json": 9,
    "html": 11, "xml": 11,
    "go": 16,
    "rust": 22,
}


# ── Block 构造函数 ────────────────────────────────────────────────────────────

def _h1(t: str) -> dict:
    return {"block_type": 3, "heading1": {"elements": [{"text_run": {"content": t, "text_element_style": {}}}], "style": {}}}


def _h2(t: str) -> dict:
    return {"block_type": 4, "heading2": {"elements": [{"text_run": {"content": t, "text_element_style": {}}}], "style": {}}}


def _h3(t: str) -> dict:
    return {"block_type": 5, "heading3": {"elements": [{"text_run": {"content": t, "text_element_style": {}}}], "style": {}}}


def _h4(t: str) -> dict:
    return {"block_type": 6, "heading4": {"elements": [{"text_run": {"content": t, "text_element_style": {}}}], "style": {}}}


def _text(t: str) -> dict:
    return {"block_type": 2, "text": {"elements": [{"text_run": {"content": t, "text_element_style": {}}}], "style": {}}}


def _code(t: str, lang: int = 1) -> dict:
    """block_type:14 代码块，lang 见 LANG_MAP，1=纯文本/流程图"""
    return {
        "block_type": 14,
        "code": {
            "elements": [{"text_run": {"content": t, "text_element_style": {}}}],
            "style": {"language": lang},
        },
    }


def _callout(t: str, bg: int = 2) -> dict:
    """block_type:19 高亮块，bg: 1=白 2=蓝 3=绿 4=橙 5=黄 6=红 7=紫"""
    return {
        "block_type": 19,
        "callout": {
            "emoji_id": "blue_book",
            "background_color": bg,
            "border_color": bg,
            "elements": [{"text_run": {"content": t, "text_element_style": {}}}],
        },
    }


def _divider() -> dict:
    return {"block_type": 22, "divider": {}}


def _image_placeholder(idx: int, path: str) -> dict:
    return {"__image__": path, "__index__": idx}


def _sheet_table(values: list[list[str]]) -> dict:
    rows = len(values)
    cols = max((len(r) for r in values), default=0)
    return {
        "block_type": 30,
        "sheet": {"row_size": rows, "column_size": cols},
        "__sheet_values": values,
    }


# ── 辅助函数 ──────────────────────────────────────────────────────────────────

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
    return bool(parts) and all(re.match(r"^:?-{2,}:?$", p or "") for p in parts)


def _clean_inline_markdown(text: str) -> str:
    """去掉常见行内 Markdown 标记，输出适合飞书的纯文本。"""
    t = text
    # 粗体
    t = re.sub(r"\*\*(.*?)\*\*", r"\1", t)
    t = re.sub(r"__(.*?)__", r"\1", t)
    # 斜体
    t = re.sub(r"\*(.*?)\*", r"\1", t)
    t = re.sub(r"_((?!_).*?)_", r"\1", t)
    # 行内代码（保留内容）
    t = re.sub(r"`([^`]+)`", r"\1", t)
    # 链接 [text](url) → text
    t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", t)
    return t.strip()


# ── 主转换函数 ─────────────────────────────────────────────────────────────────

def md_to_blocks(md: str, image_paths: list[str] | None = None) -> list:
    """将 Markdown 字符串转为飞书 blocks 列表。"""
    blocks: list[dict] = []
    image_paths = image_paths or []
    img_idx = 0
    first_h1_consumed = False

    in_code = False
    code_lines: list[str] = []
    code_lang = 1

    lines = md.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # ── 代码围栏 ───────────────────────────────────────────────────────────
        if stripped.startswith("```"):
            if in_code:
                # 结束代码块 → 生成单个 block_type:14
                code_content = "\n".join(code_lines)
                if code_content.strip():
                    blocks.append(_code(code_content, code_lang))
                code_lines = []
                code_lang = 1
                in_code = False
            else:
                # 开始代码块 → 识别语言
                lang_match = re.match(r"```(\w+)?", stripped)
                code_lang = 1
                if lang_match and lang_match.group(1):
                    code_lang = LANG_MAP.get(lang_match.group(1).lower(), 1)
                in_code = True
            i += 1
            continue

        if in_code:
            code_lines.append(line)
            i += 1
            continue

        # ── 图片 ──────────────────────────────────────────────────────────────
        img_match = re.match(r"^!\[([^\]]*)\]\(([^)]+)\)\s*$", stripped)
        if img_match:
            path = img_match.group(2)
            if img_idx < len(image_paths):
                path = image_paths[img_idx]
            blocks.append(_image_placeholder(img_idx, path))
            img_idx += 1
            i += 1
            continue

        # ── Markdown 表格 ─────────────────────────────────────────────────────
        if "|" in line and i + 1 < len(lines) and _is_md_table_sep(lines[i + 1]):
            table_lines = [line]
            j = i + 2
            while j < len(lines):
                raw = lines[j].strip()
                if not raw or "|" not in raw:
                    break
                if raw.startswith(("#", ">", "```")):
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

                max_rows, max_cols = 9, 9
                if len(clean_rows) > max_rows or col_size > max_cols:
                    blocks.append(_text("（注：原表格超出飞书单块上限，已自动截断为 9×9 显示）"))
                clipped = [r[:max_cols] for r in clean_rows[:max_rows]]
                blocks.append(_sheet_table(clipped))

            i = j
            continue

        # ── 分割线 → block_type:22 ────────────────────────────────────────────
        if stripped in {"---", "***", "___"}:
            blocks.append(_divider())
            i += 1
            continue

        # ── 标题 ──────────────────────────────────────────────────────────────
        if line.startswith("#### "):
            blocks.append(_h4(_clean_inline_markdown(line[5:].strip())))
        elif line.startswith("### "):
            blocks.append(_h3(_clean_inline_markdown(line[4:].strip())))
        elif line.startswith("## "):
            blocks.append(_h2(_clean_inline_markdown(line[3:].strip())))
        elif line.startswith("# "):
            if first_h1_consumed:
                blocks.append(_h1(_clean_inline_markdown(line[2:].strip())))
            else:
                first_h1_consumed = True

        # ── 引用 → block_type:19 callout ─────────────────────────────────────
        elif stripped.startswith(">"):
            quote = stripped
            while quote.startswith(">"):
                quote = quote[1:].lstrip()
            quote = _clean_inline_markdown(quote)
            if quote:
                blocks.append(_callout(quote))

        # ── 正文、列表 ────────────────────────────────────────────────────────
        elif stripped:
            raw = stripped
            # 无序列表 → •
            if re.match(r"^[-*]\s+", raw):
                raw = "• " + re.sub(r"^[-*]\s+", "", raw)
            # 有序列表 → 1）2）
            raw = re.sub(r"^(\d+)\.\s+", r"\1）", raw)
            cleaned = _clean_inline_markdown(raw)
            if cleaned:
                blocks.append(_text(cleaned))

        i += 1

    return blocks


def blocks_to_upload_format(blocks: list, base_dir: Path) -> tuple[list, list]:
    """将含 __image__ 占位符的 blocks 转为可上传格式，返回 (blocks, image_paths)。"""
    out: list = []
    paths: list[str] = []
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
                paths.append(path or "unknown")
            out.append(
                _text(f"【配图 {len(paths)}：待上传】")
            )
        else:
            out.append(b)
    return out, paths


def main() -> None:
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
        "description": f"由 {inp.name} 转换的飞书 docx blocks（v2）",
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
