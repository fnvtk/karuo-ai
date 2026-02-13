#!/usr/bin/env python3
"""将总结纪要 Markdown 转为可截图的 HTML（会议图片）"""
import re
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR.parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

HEAD = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>产研纪要 - 总结</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
      min-height: 100vh; color: #1a1a1a; line-height: 1.6;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 32px; }
    .header {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      padding: 24px 32px; margin: -32px -32px 24px -32px; border-radius: 0 0 16px 16px;
    }
    .header h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 8px; }
    .header .meta { font-size: 0.95rem; color: #64748b; }
    h2 { font-size: 1.2rem; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
    p, li { margin-bottom: 8px; font-size: 0.95rem; }
    ul { margin: 8px 0 16px 24px; }
    strong { color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 24px; font-size: 0.9rem; }
    th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    tr:nth-child(even) { background: #fafafa; }
    hr { margin: 20px 0; border: none; border-top: 1px solid #e2e8f0; }
    .foot { font-size: 0.85rem; color: #94a3b8; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{title}}</h1>
      <div class="meta">{{meta}}</div>
    </div>
    <div class="content">
"""

TAIL = """
    </div>
    <p class="foot">{{foot}}</p>
  </div>
</body>
</html>
"""


def md_line_to_html(line: str) -> str:
    """单行 markdown 转 HTML"""
    s = line.strip()
    if not s:
        return ""
    # ## 标题
    if s.startswith("## "):
        return f'<h2>{s[3:]}</h2>'
    if s.startswith("# "):
        return f'<h1>{s[2:]}</h1>'
    # 表格行
    if s.startswith("|") and s.endswith("|"):
        cells = [c.strip() for c in s[1:-1].split("|")]
        return "<tr>" + "".join(f"<td>{c}</td>" for c in cells) + "</tr>"
    # ---
    if re.match(r'^\-+$', s):
        return "<hr/>"
    # - 列表
    if s.startswith("- "):
        inner = s[2:].replace("**", "</strong>").replace("**", "<strong>", 1)
        if "<strong>" in inner and "</strong>" not in inner:
            inner += "</strong>"
        return f"<li>{inner}</li>"
    # 普通段落 **xxx** 加粗
    out = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    return f"<p>{out}</p>"


def md_to_html(md_path: Path, title: str = "产研团队 总结纪要", meta: str = "", foot: str = "") -> str:
    """整篇 md 转 HTML 内容（仅 content 内）"""
    text = md_path.read_text(encoding="utf-8")
    lines = text.split("\n")
    html_parts = []
    in_table = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("# ") and not stripped.startswith("## "):
            continue  # 主标题用 header 展示
        if stripped.startswith("|") and "---" not in stripped:
            if not in_table:
                html_parts.append("<table>")
                in_table = True
            row = md_line_to_html(line)
            if row:
                html_parts.append(row)
            continue
        if in_table and not stripped.startswith("|"):
            html_parts.append("</table>")
            in_table = False
        part = md_line_to_html(line)
        if part:
            html_parts.append(part)
    if in_table:
        html_parts.append("</table>")
    return "\n".join(html_parts)


def _wrap_full_html(content: str, title: str, meta: str, foot: str) -> str:
    """包装成完整 HTML 页面"""
    return HEAD.replace("{{title}}", title).replace("{{meta}}", meta or "总结纪要") + content + TAIL.replace("{{foot}}", foot or "")


def build_summary_html(md_path: Path, output_path: Path = None) -> Path:
    """从总结纪要 md 生成 HTML 文件，返回路径"""
    if output_path is None:
        name = md_path.stem.replace(" ", "_") + ".html"
        output_path = OUTPUT_DIR / name
    title = md_path.stem
    meta = "2026年1月28日 | 产研团队 第20场"
    foot = "（根据会议记录整理）"
    content = md_to_html(md_path, title=title, meta=meta, foot=foot)
    html = _wrap_full_html(content, title=title, meta=meta, foot=foot)
    output_path.write_text(html, encoding="utf-8")
    return output_path


if __name__ == "__main__":
    import sys
    md = Path(sys.argv[1]) if len(sys.argv) > 1 else SCRIPT_DIR.parent / "产研团队 第20场 20260128 总结纪要.md"
    out = build_summary_html(md)
    print(out)
