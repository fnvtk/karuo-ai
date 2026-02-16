#!/usr/bin/env python3
"""
产研团队会议纪要日报：抓取最新产研会议 → 仅当时长≥5分钟 → 生成总结+图片 → 发飞书群

全部命令行，无需打开网页。支持：
  1) 飞书妙记链接（API 拉取）
  2) 本地已导出的文字记录 txt

一键命令：
  python3 daily_chanyan_to_feishu.py "https://cunkebao.feishu.cn/minutes/xxx"
  python3 daily_chanyan_to_feishu.py --file "产研团队 第20场 20260128 许永平.txt"
  python3 daily_chanyan_to_feishu.py   # 从 config/latest_minutes_url.txt 或环境变量 CHANYAN_MINUTES_URL 读取链接
"""

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path
from datetime import datetime

SCRIPT_DIR = Path(__file__).parent
ROOT = SCRIPT_DIR.parent
OUTPUT_DIR = ROOT / "output"
CONFIG_DIR = ROOT / "config"

# 仅当会议时长 ≥ 此值（分钟）才执行发飞书
MIN_DURATION_MINUTES = 5

# 会议纪要飞书群 Webhook
CHANYAN_WEBHOOK = os.environ.get(
    "CHANYAN_FEISHU_WEBHOOK",
    "https://open.feishu.cn/open-apis/bot/v2/hook/14a7e0d3-864d-4709-ad40-0def6edba566"
)


def parse_duration_to_minutes(duration_str: str) -> float:
    """解析时长字符串为分钟数。支持：'1小时 17分钟 3秒'、'01:17:03'、'77分钟'"""
    if not duration_str or not duration_str.strip():
        return 0.0
    s = duration_str.strip()
    total_minutes = 0.0
    # 1小时 17分钟 3秒
    h = re.search(r"(\d+)\s*小时", s)
    if h:
        total_minutes += int(h.group(1)) * 60
    m = re.search(r"(\d+)\s*分钟", s)
    if m:
        total_minutes += int(m.group(1))
    sec = re.search(r"(\d+)\s*秒", s)
    if sec:
        total_minutes += int(sec.group(1)) / 60.0
    # 01:17:03 或 17:03
    if ":" in s and not re.search(r"小时|分钟|秒", s):
        parts = re.findall(r"\d+", s)
        if len(parts) >= 3:
            total_minutes += int(parts[0]) * 60 + int(parts[1]) + int(parts[2]) / 60.0
        elif len(parts) == 2:
            total_minutes += int(parts[0]) * 60 + int(parts[1])
        elif len(parts) == 1:
            total_minutes += int(parts[0])
    return total_minutes


def get_duration_minutes_from_file(txt_path: Path) -> float:
    """从飞书导出的 txt 中解析时长（分钟）"""
    text = txt_path.read_text(encoding="utf-8", errors="ignore")
    # 首行：2026年1月28日 下午 5:22|1小时 17分钟 3秒
    first = text.split("\n")[0]
    if "|" in first:
        duration_str = first.split("|")[-1].strip()
        return parse_duration_to_minutes(duration_str)
    # 或 标题: xxx 下一行 时长: 01:17:03
    for line in text.split("\n")[:20]:
        if line.startswith("时长:") or "时长" in line:
            part = line.split(":", 1)[-1].strip() if ":" in line else line
            return parse_duration_to_minutes(part)
    return 0.0


def get_title_from_file(txt_path: Path) -> str:
    """从 txt 标题行或文件名取标题（首行仅为日期时用文件名）"""
    text = txt_path.read_text(encoding="utf-8", errors="ignore")
    lines = text.split("\n")
    for line in lines[:20]:
        if line.strip().startswith("标题:"):
            return line.split(":", 1)[-1].strip()
    if lines and "|" in lines[0]:
        left = lines[0].split("|")[0].strip()
        # 若仅为日期时间则用文件名
        if re.search(r"^\d{4}年|^\d{1,2}:\d{2}", left) or "下午" in left or "上午" in left:
            return txt_path.stem
        return left
    return txt_path.stem


def transcript_to_summary_md(txt_path: Path, title: str, duration_str: str) -> Path:
    """从文字记录生成简要总结 md（用于截图）"""
    text = txt_path.read_text(encoding="utf-8", errors="ignore")
    # 取「文字记录」之后的前 1200 字作为摘要
    if "文字记录" in text:
        body = text.split("文字记录", 1)[-1].strip()
    else:
        body = text
    body = re.sub(r"\n{3,}", "\n\n", body)
    summary_text = body[:1200] + ("…" if len(body) > 1200 else "")
    date_str = datetime.now().strftime("%Y年%m月%d日")
    md_content = f"""# 产研团队 会议纪要

**时间**：{date_str} | **时长**：{duration_str}

---

## 摘要

{summary_text}

---

*（根据会议记录整理，完整版见本地导出）*
"""
    safe_name = re.sub(r'[\\/*?:"<>|]', "_", title) + "_总结纪要.md"
    md_path = OUTPUT_DIR / safe_name
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    md_path.write_text(md_content, encoding="utf-8")
    return md_path


def run_cmd(cmd: list, cwd: Path = None) -> bool:
    """执行命令，返回是否成功"""
    r = subprocess.run(cmd, cwd=cwd or ROOT, capture_output=True, text=True, timeout=120)
    if r.returncode != 0 and r.stderr:
        print(r.stderr[:500])
    return r.returncode == 0


def main():
    parser = argparse.ArgumentParser(description="产研会议纪要日报：≥5分钟则生成总结+图并发飞书")
    parser.add_argument("url", nargs="?", type=str, help="飞书妙记链接（可选）")
    parser.add_argument("--file", "-f", type=str, help="本地文字记录 txt 路径")
    parser.add_argument("--webhook", "-w", type=str, default=CHANYAN_WEBHOOK, help="飞书群 Webhook")
    parser.add_argument("--min-minutes", type=float, default=MIN_DURATION_MINUTES, help="最少时长(分钟)，低于则跳过")
    args = parser.parse_args()

    transcript_path = None
    title = "产研团队会议"
    duration_str = ""
    duration_minutes = 0.0

    # 1) 确定输入：URL 或 --file 或 config/环境变量
    if args.file:
        transcript_path = Path(args.file)
        if not transcript_path.is_absolute():
            transcript_path = (ROOT / args.file).resolve()
        if not transcript_path.exists():
            print(f"❌ 文件不存在: {transcript_path}")
            sys.exit(1)
        title = get_title_from_file(transcript_path)
        duration_minutes = get_duration_minutes_from_file(transcript_path)
        # 从文件内容解析时长字符串用于展示
        text = transcript_path.read_text(encoding="utf-8", errors="ignore")
        first = text.split("\n")[0]
        duration_str = first.split("|")[-1].strip() if "|" in first else f"{int(duration_minutes)}分钟"
        print(f"📄 本地文件: {transcript_path.name} | 时长: {duration_str} ({duration_minutes:.1f} 分钟)")
    else:
        url = args.url
        if not url:
            config_file = CONFIG_DIR / "latest_minutes_url.txt"
            if config_file.exists():
                url = config_file.read_text(encoding="utf-8").strip()
            if not url:
                url = os.environ.get("CHANYAN_MINUTES_URL", "")
        if url:
            print(f"📝 从飞书妙记拉取: {url[:60]}...")
            ok = run_cmd([
                sys.executable,
                str(SCRIPT_DIR / "fetch_feishu_minutes.py"),
                url,
                "--output", str(OUTPUT_DIR)
            ])
            if not ok:
                print("❌ 拉取妙记失败，请检查链接或改用 --file 传入本地导出 txt")
                sys.exit(1)
            txts = list(OUTPUT_DIR.glob("*.txt"))
            if not txts:
                print("❌ 未生成 txt，可能无文字记录权限，请用 --file 传入本地导出")
                sys.exit(1)
            transcript_path = max(txts, key=lambda p: p.stat().st_mtime)
            title = get_title_from_file(transcript_path)
            duration_minutes = get_duration_minutes_from_file(transcript_path)
            text = transcript_path.read_text(encoding="utf-8", errors="ignore")
            duration_str = ""
            for line in text.split("\n")[:20]:
                if "时长" in line and ":" in line:
                    duration_str = line.split(":", 1)[-1].strip()
                    break
            if not duration_str:
                duration_str = f"{int(duration_minutes)}分钟"
            print(f"   ✅ 已保存: {transcript_path.name} | 时长: {duration_str} ({duration_minutes:.1f} 分钟)")
        else:
            print("❌ 请提供妙记链接或 --file 本地 txt；或设置 CHANYAN_MINUTES_URL / config/latest_minutes_url.txt")
            parser.print_help()
            sys.exit(1)

    # 2) 时长校验：不足 5 分钟则跳过
    if duration_minutes < args.min_minutes:
        print(f"⏭️ 时长 {duration_minutes:.1f} 分钟 < {args.min_minutes} 分钟，跳过发飞书")
        sys.exit(0)

    # 3) 生成总结 md → HTML → 截图 PNG
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    md_path = transcript_to_summary_md(transcript_path, title, duration_str)
    print(f"📋 总结 md: {md_path.name}")

    if not run_cmd([sys.executable, str(SCRIPT_DIR / "md_to_summary_html.py"), str(md_path)]):
        print("❌ 生成 HTML 失败")
        sys.exit(1)
    html_path = OUTPUT_DIR / (md_path.stem + ".html")
    if not html_path.exists():
        html_path = next(OUTPUT_DIR.glob(md_path.stem.replace(" ", "_") + "*.html"), None)
    if not html_path or not html_path.exists():
        print("❌ 未找到生成的 HTML")
        sys.exit(1)

    if not run_cmd([sys.executable, str(SCRIPT_DIR / "screenshot.py"), str(html_path), "--width", "900"]):
        print("❌ 截图失败")
        sys.exit(1)
    png_path = html_path.with_suffix(".png")
    if not png_path.exists():
        print("❌ 未生成 PNG")
        sys.exit(1)
    print(f"🖼️ 图片: {png_path.name}")

    # 4) 发飞书：先发文字摘要，再发图片
    short_summary = f"【产研会议纪要】{title}\n时长：{duration_str}\n\n（已生成会议总结图，见下图）"
    ok_text = run_cmd([
        sys.executable, str(SCRIPT_DIR / "send_to_feishu.py"),
        "--webhook", args.webhook,
        "--text", short_summary
    ])
    # 发图需要传 --image，send_to_feishu 内部会上传再发
    ok_img = run_cmd([
        sys.executable, str(SCRIPT_DIR / "send_to_feishu.py"),
        "--webhook", args.webhook,
        "--image", str(png_path)
    ])
    if ok_text:
        print("✅ 文字已发飞书群")
    if ok_img:
        print("✅ 图片已发飞书群")
    if not ok_text and not ok_img:
        print("❌ 发送飞书失败")
        sys.exit(1)
    print("✅ 产研会议纪要日报完成")


if __name__ == "__main__":
    main()
