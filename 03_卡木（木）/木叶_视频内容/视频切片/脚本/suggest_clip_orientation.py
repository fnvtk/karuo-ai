#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Soul / 飞书录屏：在剪辑前判断更适合 **竖屏塑形** 还是 **横屏全幅（无黑边）**。

依据：与 analyze_feishu_ui_crop 相同的「深色主内容区包络」宽度占整幅比例、左右留白比例。
输出：终端摘要 + 可选 --save-dir 下的标注截图与 Markdown 报告（含建议 soul_enhance 参数）。

用法:
  python3 suggest_clip_orientation.py /path/to/原片或切片.mp4
  python3 suggest_clip_orientation.py /path/to/原片.mp4 --at 0.15 --at 0.35 --at 0.5 --save-dir ./裁剪检查
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from analyze_feishu_ui_crop import compute_feishu_band, load_frame


def _recommend_one(r: float, ml: float, mr: float) -> tuple[str, str]:
    """
    r = W_band/w, ml = L/w, mr = (w-L-W_band)/w
    返回 (标签, 理由短句)
    """
    side_margin = ml + mr
    if r < 0.40 and side_margin > 0.18:
        return "竖屏优先", f"主内容宽约{r:.0%}，左右留白合计约{side_margin:.0%}，适合裁竖条发抖音等"
    if r < 0.44:
        return "竖屏优先", f"主内容宽约{r:.0%}，偏窄条布局，竖屏信息密度更高"
    if r >= 0.68 and ml < 0.12 and mr < 0.12:
        return "横屏全幅优先", f"主内容宽约{r:.0%}，左右边窄，全幅 16:9 无黑边更合适"
    if r >= 0.62:
        return "横屏全幅优先", f"主内容宽约{r:.0%}，接近满宽，建议横屏全幅成片"
    if 0.44 <= r < 0.52 and side_margin > 0.28:
        return "竖屏倾向", f"中等宽度但留白仍明显（{side_margin:.0%}），可竖屏；若更在意界面全貌则横屏"
    return "灰区·请对照截图", f"主内容宽约{r:.0%}，建议对比标注图后人工定竖屏/横屏"


def _draw_overlay(arr_f, L: int, W_band: int, caption: str) -> Image.Image:
    u8 = np.clip(arr_f, 0, 255).astype(np.uint8)
    im = Image.fromarray(u8).convert("RGB")
    dr = ImageDraw.Draw(im)
    y0, y1 = 0, im.height - 1
    x0, x1 = L, L + W_band - 1
    for off in range(3):
        dr.rectangle([x0 - off, y0 - off, x1 + off, y1 + off], outline=(0, 220, 90), width=2)
    bar_h = 36
    dr.rectangle([0, 0, im.width, bar_h], fill=(16, 16, 16))
    try:
        font = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 22)
    except Exception:
        font = ImageFont.load_default()
    dr.text((8, 6), caption[:80], fill=(255, 255, 255), font=font)
    return im


def main():
    ap = argparse.ArgumentParser(description="判断 Soul 录屏更适合竖屏还是横屏成片")
    ap.add_argument("input", type=Path, help="mp4 或静态图")
    ap.add_argument(
        "--at",
        type=float,
        action="append",
        dest="at_list",
        help="视频取样时刻比例，可多次指定；默认 [0.12, 0.22, 0.35, 0.5]",
    )
    ap.add_argument("--strict-core", action="store_true", help="与 analyze 同义，仅用深色核心")
    ap.add_argument(
        "--save-dir",
        type=Path,
        default=None,
        help="写入标注 PNG + 取向分析报告.md",
    )
    args = ap.parse_args()

    at_list = args.at_list if args.at_list else [0.12, 0.22, 0.35, 0.5]
    rows = []
    labels = []

    for ratio in at_list:
        try:
            arr = load_frame(args.input, ratio)
            geo = compute_feishu_band(arr, strict_core=args.strict_core)
        except ValueError as e:
            print(f"  ⚠️ t≈{ratio:.0%}：{e}", file=sys.stderr)
            continue
        w, h = geo["w"], geo["h"]
        L, Wb = geo["L"], geo["W_band"]
        r = Wb / w
        ml = L / w
        mr = (w - L - Wb) / w
        tag, reason = _recommend_one(r, ml, mr)
        labels.append(tag)
        rows.append(
            {
                "at": ratio,
                "w": w,
                "h": h,
                "L": L,
                "W_band": Wb,
                "r": r,
                "ml": ml,
                "mr": mr,
                "tag": tag,
                "reason": reason,
                "arr": geo["arr"],
            }
        )
        print(
            f"  t≈{ratio:.0%}  包络宽={Wb}px ({r:.1%})  左留白={ml:.1%} 右留白={mr:.1%}  → {tag}"
        )

    if not rows:
        print("❌ 所有取样均失败，无法判断", file=sys.stderr)
        sys.exit(1)

    # 综合：数票 + 看最小 r（保守：若任一刻强烈竖屏则提示）
    from collections import Counter

    c = Counter(labels)
    majority = c.most_common(1)[0][0]
    min_r_row = min(rows, key=lambda x: x["r"])
    max_r_row = max(rows, key=lambda x: x["r"])

    if "竖屏优先" in c or "竖屏倾向" in c:
        if c["竖屏优先"] + c.get("竖屏倾向", 0) >= len(rows) * 0.5:
            final = "竖屏塑形（Soul竖屏切片 Skill）"
        elif min_r_row["r"] < 0.38:
            final = "竖屏塑形（存在明显窄条帧，建议竖屏）"
        else:
            final = f"综合偏 {majority}，但样本有分歧，请对照截图"
    elif "横屏全幅优先" in c:
        if c["横屏全幅优先"] >= len(rows) * 0.5:
            final = "横屏全幅（Soul横屏全幅高光 Skill，无左右黑边）"
        else:
            final = f"综合偏 {majority}，请对照截图"
    else:
        final = "灰区：请对照 save-dir 标注图人工选择"

    print("\n──────── 综合建议 ────────")
    print(final)
    print("──────────────────────────")

    vf = f"crop={rows[0]['W_band']}:1080:{rows[0]['L']}:0"
    ox = rows[0]["L"]
    print("\n若选竖屏（示例参数，请以 analyze_feishu_ui_crop --save-dir 为准）：")
    print(f'  --vertical --title-only --crop-vf "{vf}" --overlay-x {ox}')

    print("\n若选横屏全幅（无黑边，整幅 1920×1080 叠字幕）：")
    print("  --horizontal-full --title-only")
    print("  （不要带 --crop-vf / --vertical）")

    if args.save_dir:
        sd = args.save_dir.resolve()
        sd.mkdir(parents=True, exist_ok=True)
        stem = args.input.stem.replace(" ", "_")[:36]
        md_lines = [
            "# 剪辑取向分析报告\n",
            f"- 源文件: `{args.input.name}`\n",
            f"- 取样点: {at_list}\n",
            f"- **综合建议**: {final}\n",
            "\n## 各取样点\n",
            "| t | 包络宽 | 占幅 | 左留白 | 右留白 | 判断 |\n",
            "|---|--------|------|--------|--------|------|\n",
        ]
        for row in rows:
            caption = f"{row['tag']} 包络{row['W_band']}px={row['r']:.0%}"
            im = _draw_overlay(row["arr"], row["L"], row["W_band"], caption)
            png_name = f"{stem}_取向标注_t{int(row['at']*100)}.png"
            p = sd / png_name
            im.save(p, optimize=True)
            md_lines.append(
                f"| {row['at']:.0%} | {row['W_band']} | {row['r']:.1%} | {row['ml']:.1%} | {row['mr']:.1%} | {row['tag']} |\n"
            )
            md_lines.append(f"![t{row['at']:.0%}]({png_name})\n\n")

        md_lines.extend(
            [
                "## 成片命令模板\n",
                "### 竖屏\n",
                "```bash\n",
                'python3 soul_enhance.py -c .../切片 -l .../highlights.json -t .../transcript.srt -o .../成片 \\\n',
                f'  --vertical --title-only --crop-vf "{vf}" --overlay-x {ox} \\\n',
                "  --no-trim-silence --force-burn-subs --typewriter-subs\n",
                "```\n",
                "### 横屏全幅（无黑边）\n",
                "```bash\n",
                "python3 soul_enhance.py -c .../切片 -l .../highlights.json -t .../transcript.srt -o .../成片_横屏全幅 \\\n",
                "  --horizontal-full --title-only \\\n",
                "  --no-trim-silence --force-burn-subs --typewriter-subs\n",
                "```\n",
            ]
        )
        report = sd / f"{stem}_剪辑取向分析.md"
        report.write_text("".join(md_lines), encoding="utf-8")
        print(f"\n📁 已写: {report}")


if __name__ == "__main__":
    main()
