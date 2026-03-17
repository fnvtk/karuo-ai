#!/usr/bin/env python3
"""
产研会议纪要 → 苹果毛玻璃白底图片（直接生成，不落HTML文件）

用法：
  python3 generate_meeting_image.py --json data.json --output output.png
  或在代码中直接调用 generate_meeting_image(data_dict, output_path)

五大板块（固定结构）：
  1. 🎯 目标&结果
  2. 📌 过程&问题
  3. 💡 反思&想法
  4. 📝 总结&优化
  5. ▶ 下一步执行
"""

import json, sys, os, tempfile, argparse
from pathlib import Path

TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text",
               "Helvetica Neue", Arial, sans-serif;
  background: #ffffff;
  color: #1d1d1f;
  -webkit-font-smoothing: antialiased;
  padding: 0;
}}
.page {{
  max-width: 1000px;
  margin: 0 auto;
  padding: 36px 40px 32px;
}}

/* Header */
.header {{
  background: rgba(245,245,247,0.72);
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 18px;
  padding: 28px 32px 24px;
  margin-bottom: 24px;
  box-shadow:
    0 1px 3px rgba(0,0,0,0.04),
    0 8px 24px rgba(0,0,0,0.06),
    inset 0 1px 0 rgba(255,255,255,0.8);
}}
.header-label {{
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #0071e3;
  background: rgba(0,113,227,0.08);
  padding: 4px 12px;
  border-radius: 6px;
  margin-bottom: 12px;
}}
.header h1 {{
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.35;
  margin-bottom: 14px;
  color: #1d1d1f;
}}
.header-meta {{
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  font-size: 13px;
  color: #6e6e73;
  font-weight: 500;
}}

/* Section */
.section {{
  background: rgba(245,245,247,0.55);
  backdrop-filter: blur(16px) saturate(1.1);
  -webkit-backdrop-filter: blur(16px) saturate(1.1);
  border: 1px solid rgba(0,0,0,0.05);
  border-radius: 16px;
  padding: 22px 28px 20px;
  margin-bottom: 16px;
  box-shadow:
    0 1px 2px rgba(0,0,0,0.03),
    0 4px 16px rgba(0,0,0,0.04),
    inset 0 1px 0 rgba(255,255,255,0.7);
}}
.section-title {{
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}}
.section-icon {{
  font-size: 18px;
}}
.section-content {{
  font-size: 13.5px;
  line-height: 1.75;
  color: #2c2c2e;
}}
.section-content ul {{
  list-style: none;
  margin: 0;
  padding: 0;
}}
.section-content li {{
  padding: 4px 0 4px 20px;
  position: relative;
}}
.section-content li::before {{
  content: '';
  position: absolute;
  left: 0;
  top: 13px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}}
.section-content li.blue::before {{ background: #0071e3; }}
.section-content li.green::before {{ background: #34c759; }}
.section-content li.orange::before {{ background: #ff9f0a; }}
.section-content li.red::before {{ background: #ff3b30; }}
.section-content li.purple::before {{ background: #af52de; }}
.section-content li.gray::before {{ background: #aeaeb2; }}
.section-content li.teal::before {{ background: #30b0c7; }}

.tag {{
  display: inline-block;
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 5px;
  margin-left: 6px;
  vertical-align: middle;
}}
.t-green {{ background: rgba(52,199,89,0.12); color: #248a3d; }}
.t-red {{ background: rgba(255,59,48,0.1); color: #d70015; }}
.t-yellow {{ background: rgba(255,159,10,0.12); color: #c93400; }}
.t-blue {{ background: rgba(0,113,227,0.1); color: #0071e3; }}
.t-gray {{ background: rgba(142,142,147,0.12); color: #636366; }}
.t-purple {{ background: rgba(175,82,222,0.1); color: #8944ab; }}

.sub-section {{
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(0,0,0,0.04);
}}
.sub-title {{
  font-size: 12.5px;
  font-weight: 700;
  color: #6e6e73;
  margin-bottom: 6px;
}}

/* Two-col grid inside section */
.two-col {{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 8px;
}}
.col-card {{
  background: rgba(255,255,255,0.6);
  border: 1px solid rgba(0,0,0,0.04);
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}}
.col-card h4 {{
  font-size: 13px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 8px;
}}

/* Footer */
.footer {{
  text-align: center;
  padding: 20px 0 8px;
  font-size: 11.5px;
  color: #aeaeb2;
  font-weight: 500;
}}
.footer .brand {{ color: #0071e3; font-weight: 600; }}
</style>
</head>
<body>
<div class="page">
{header_html}
{sections_html}
<div class="footer">
  <span class="brand">卡若AI</span> · 产研会议纪要 · {generate_date} · 自动生成
</div>
</div>
</body>
</html>"""


def build_header(data: dict) -> str:
    label = data.get("label", "产研组会 · 产品团队")
    title = data.get("title", "会议纪要")
    date = data.get("date", "")
    duration = data.get("duration", "")
    participants = data.get("participants", "")

    meta_items = []
    if date:
        meta_items.append(f"<span>📅 {date}</span>")
    if duration:
        meta_items.append(f"<span>⏱ {duration}</span>")
    if participants:
        meta_items.append(f"<span>👥 {participants}</span>")

    return f"""<div class="header">
  <div class="header-label">{label}</div>
  <h1>{title}</h1>
  <div class="header-meta">{''.join(meta_items)}</div>
</div>"""


def build_section(icon: str, title: str, items: list) -> str:
    li_html = ""
    for item in items:
        if isinstance(item, dict):
            text = item.get("text", "")
            color = item.get("color", "gray")
            tag = item.get("tag", "")
            tag_color = item.get("tag_color", "gray")
            tag_html = f' <span class="tag t-{tag_color}">{tag}</span>' if tag else ""
            li_html += f'<li class="{color}">{text}{tag_html}</li>\n'
        else:
            li_html += f'<li class="gray">{item}</li>\n'

    return f"""<div class="section">
  <div class="section-title"><span class="section-icon">{icon}</span> {title}</div>
  <div class="section-content"><ul>{li_html}</ul></div>
</div>"""


def generate_meeting_image(data: dict, output_path: str):
    from playwright.sync_api import sync_playwright

    header_html = build_header(data)

    sections = [
        ("🎯", "目标 & 结果", data.get("goals", [])),
        ("📌", "过程 & 问题", data.get("process", [])),
        ("💡", "反思 & 想法", data.get("reflection", [])),
        ("📝", "总结 & 优化", data.get("summary", [])),
        ("▶", "下一步执行", data.get("next_steps", [])),
    ]

    sections_html = "\n".join(
        build_section(icon, title, items)
        for icon, title, items in sections
        if items
    )

    from datetime import datetime
    gen_date = datetime.now().strftime("%Y-%m-%d")

    full_html = TEMPLATE.format(
        header_html=header_html,
        sections_html=sections_html,
        generate_date=gen_date,
    )

    tmp = tempfile.NamedTemporaryFile(suffix=".html", delete=False, mode="w", encoding="utf-8")
    tmp.write(full_html)
    tmp.close()

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1000, "height": 800})
            page.goto(f"file://{tmp.name}")
            page.wait_for_timeout(500)
            page.screenshot(path=output_path, full_page=True)
            browser.close()
    finally:
        os.unlink(tmp.name)

    print(f"✅ 已生成: {output_path} ({os.path.getsize(output_path)} bytes)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="产研会议纪要 → 毛玻璃白底图片")
    parser.add_argument("--json", required=True, help="JSON 数据文件路径")
    parser.add_argument("--output", "-o", required=True, help="输出 PNG 路径")
    args = parser.parse_args()

    with open(args.json, "r", encoding="utf-8") as f:
        data = json.load(f)

    generate_meeting_image(data, args.output)
