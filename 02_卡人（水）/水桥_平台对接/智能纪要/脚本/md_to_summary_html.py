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
      font-family: "PingFang SC", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 20% -10%, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0) 45%),
        radial-gradient(circle at 90% 0%, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0) 42%),
        linear-gradient(180deg, #f5f7fb 0%, #eef2f9 100%);
      min-height: 100vh;
      color: #0f172a;
      line-height: 1.65;
    }
    .container {
      max-width: 960px;
      margin: 28px auto;
      padding: 24px 28px 30px;
      border-radius: 24px;
      background: rgba(255,255,255,0.68);
      border: 1px solid rgba(255,255,255,0.66);
      box-shadow: 0 6px 20px rgba(15,23,42,0.06), 0 18px 48px rgba(15,23,42,0.09), inset 0 1px 0 rgba(255,255,255,0.9);
      backdrop-filter: blur(14px) saturate(118%);
      -webkit-backdrop-filter: blur(14px) saturate(118%);
    }
    .header {
      background: linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.88) 55%, rgba(30,64,175,0.84) 100%);
      padding: 24px 26px;
      margin: -24px -28px 22px -28px;
      border-radius: 24px 24px 18px 18px;
      color: #f8fafc;
    }
    .header h1 {
      font-size: 1.72rem;
      font-weight: 760;
      margin-bottom: 8px;
      letter-spacing: .2px;
    }
    .header .meta {
      font-size: 0.92rem;
      color: rgba(248,250,252,0.82);
    }
    h2 {
      display: inline-flex;
      align-items: center;
      font-size: 1.04rem;
      margin: 20px 0 10px;
      padding: 6px 12px;
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(30,64,175,0.1) 0%, rgba(99,102,241,0.08) 100%);
      border: 1px solid rgba(59,130,246,0.2);
      color: #1e3a8a;
      font-weight: 700;
    }
    p, li {
      margin-bottom: 8px;
      font-size: 0.95rem;
      color: #0f172a;
    }
    ul {
      margin: 8px 0 14px 18px;
      list-style: none;
      padding-left: 0;
    }
    li {
      position: relative;
      padding-left: 18px;
    }
    li::before {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      position: absolute;
      left: 0;
      top: 9px;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
    }
    strong {
      color: #0b3a9a;
      font-weight: 760;
      background: linear-gradient(transparent 62%, rgba(59,130,246,0.18) 62%);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 20px;
      font-size: 0.9rem;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 6px 16px rgba(15,23,42,0.05);
    }
    th, td { border: 1px solid #dbe3f0; padding: 10px 12px; text-align: left; }
    th {
      background: linear-gradient(180deg, #eef4ff 0%, #e7efff 100%);
      font-weight: 700;
      color: #1e3a8a;
    }
    tr:nth-child(even) { background: #f8fbff; }
    hr {
      margin: 18px 0;
      border: none;
      border-top: 1px dashed rgba(51,65,85,0.24);
    }
    .foot {
      font-size: 0.84rem;
      color: #64748b;
      margin-top: 18px;
      border-top: 1px solid rgba(148,163,184,0.32);
      padding-top: 10px;
    }
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
    meta = "智能纪要图片 | 高级重点版"
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
