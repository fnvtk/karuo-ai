#!/usr/bin/env python3
"""
从「派对智能纪要」txt 生成一张长图（PNG），风格与 101 场一致。
仅生成图片，不发群。

用法：
  python3 generate_party_minutes_image.py [纪要txt路径]
  python3 generate_party_minutes_image.py   # 默认使用同目录 106场派对智能纪要_20260221.txt

输出：卡若Ai的文件夹/图片/106场派对智能纪要_20260221.png（或按文件名推导）
依赖：playwright（与智能纪要 screenshot.py 相同）
"""

import re
import sys
from pathlib import Path

# 脚本与智能纪要目录
SCRIPT_DIR = Path(__file__).resolve().parent
# 卡若AI 根目录（脚本在 02_卡人/水桥/飞书管理/脚本，上 4 级为根）
KARUO_AI_ROOT = Path(__file__).resolve().parents[4]
INTELLIGENT_MINUTES_SCRIPT = KARUO_AI_ROOT / "04_卡火（火）/火眼_智能追问/智能纪要/脚本"
OUTPUT_IMAGE_DIR = Path("/Users/karuo/Documents/卡若Ai的文件夹/图片")
OUTPUT_HTML_DIR = Path("/Users/karuo/Documents/卡若Ai的文件夹/报告/智能纪要")


def parse_minutes_txt(content: str) -> tuple[str, list[tuple[str, str]]]:
    """解析纪要：返回 (标题, [(区块标题, 区块正文), ...])"""
    lines = content.strip().split("\n")
    title = ""
    sections = []
    current_title = ""
    current_body: list[str] = []

    def flush():
        nonlocal current_title, current_body
        if current_title or current_body:
            sections.append((current_title, "\n".join(current_body).strip()))
        current_title = ""
        current_body = []

    for line in lines:
        line = line.rstrip()
        # 首行作为总标题（仅在第一行时）
        if not title and line.strip() and not re.match(r"^[一二三四五六七八九十]、", line):
            title = line.strip()
            continue
        m = re.match(r"^([一二三四五六七八九十]、[^\s·]+)(.*)$", line)
        if m:
            flush()
            current_title = m.group(1).strip()
            rest = m.group(2).strip()
            if rest:
                current_body.append(rest)
            continue
        # 正文行：· 条目 或 数据来源 或 任意非空（在已有区块内）
        if current_title or current_body:
            if line.strip():
                current_body.append(line.strip())
    flush()
    if not title and sections:
        title = sections[0][0] if sections[0][0] else "派对智能纪要"
    return title, sections


def escape_html(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")


def build_html(title: str, sections: list[tuple[str, str]]) -> str:
    """生成 101 场风格的整页 HTML"""
    section_colors = ["blue", "orange", "green", "purple", "red", "blue"]
    section_icons = ["👤", "📌", "🔥", "💬", "▶", "📎"]

    sections_html = ""
    for i, (sec_title, body) in enumerate(sections):
        color = section_colors[i % len(section_colors)]
        icon = section_icons[i % len(section_icons)]
        body_esc = escape_html(body)
        sections_html += f"""
    <div class="block">
      <div class="section-head">
        <span class="section-num {color}">{icon}</span>
        <span class="section-title">{escape_html(sec_title)}</span>
      </div>
      <div class="section-body">{body_esc}</div>
    </div>
"""

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{escape_html(title)}</title>
  <style>
    :root {{
      --blue: #2563eb;
      --orange: #ea580c;
      --green: #16a34a;
      --purple: #7c3aed;
      --red: #dc2626;
      --bg-page: #fafafa;
      --text-primary: #1a1a2e;
      --text-secondary: #4b5563;
      --white: #ffffff;
    }}
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
      background: var(--bg-page);
      min-height: 100vh;
      color: var(--text-primary);
      line-height: 1.65;
    }}
    .container {{ max-width: 720px; margin: 0 auto; padding: 28px 24px; }}
    .header {{
      background: var(--white);
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      padding: 28px 32px;
      margin-bottom: 24px;
      border: 1px solid rgba(0,0,0,0.05);
    }}
    .header h1 {{ font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-bottom: 8px; }}
    .header .sub {{ font-size: 0.9rem; color: var(--text-secondary); }}
    .block {{
      background: var(--white);
      border-radius: 14px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      padding: 20px 24px;
      margin-bottom: 20px;
      border: 1px solid rgba(0,0,0,0.05);
    }}
    .section-head {{
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 3px solid #e5e7eb;
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--text-primary);
    }}
    .section-head .section-num {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      color: #fff;
      border-radius: 8px;
      font-size: 0.9rem;
    }}
    .section-head .section-num.blue {{ background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); }}
    .section-head .section-num.orange {{ background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); }}
    .section-head .section-num.green {{ background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); }}
    .section-head .section-num.purple {{ background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); }}
    .section-head .section-num.red {{ background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); }}
    .section-body {{
      font-size: 0.92rem;
      color: var(--text-secondary);
      line-height: 1.7;
    }}
    .section-body br {{ margin: 0.35em 0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{escape_html(title)}</h1>
      <p class="sub">卡若派对智能纪要 · 仅本地生成，不发群</p>
    </div>
{sections_html}
  </div>
</body>
</html>
"""


def main():
    txt_path = (SCRIPT_DIR / "106场派对智能纪要_20260221.txt")
    if len(sys.argv) > 1:
        txt_path = Path(sys.argv[1]).resolve()
    if not txt_path.exists():
        print(f"❌ 纪要文件不存在: {txt_path}")
        sys.exit(1)

    content = txt_path.read_text(encoding="utf-8")
    title, sections = parse_minutes_txt(content)
    if not sections:
        print("❌ 未能解析出有效区块（需要 一、二、三、… 格式）")
        sys.exit(1)

    OUTPUT_HTML_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    stem = txt_path.stem
    html_path = OUTPUT_HTML_DIR / f"{stem}.html"
    image_path = OUTPUT_IMAGE_DIR / f"{stem}.png"

    html = build_html(title, sections)
    html_path.write_text(html, encoding="utf-8")
    print(f"✅ 已生成 HTML: {html_path}")

    # 调用智能纪要目录下的 screenshot.py
    screenshot_py = INTELLIGENT_MINUTES_SCRIPT / "screenshot.py"
    if not screenshot_py.exists():
        print(f"❌ 未找到截图脚本: {screenshot_py}")
        print("   请确认 04_卡火（火）/火眼_智能追问/智能纪要/脚本/screenshot.py 存在")
        sys.exit(1)

    import subprocess
    ret = subprocess.run(
        [sys.executable, str(screenshot_py), str(html_path), "--width", "800", "--output", str(image_path)],
        cwd=str(INTELLIGENT_MINUTES_SCRIPT),
    )
    if ret.returncode != 0:
        print("❌ 截图失败（需安装 playwright: pip install playwright && playwright install chromium）")
        sys.exit(1)

    print(f"✅ 派对智能纪要图片已生成: {image_path}")
    print("   （未发群，仅本地文件）")


if __name__ == "__main__":
    main()
