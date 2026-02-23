#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
毛玻璃风格 HTML → 截图 → 组装 PPT
依赖：playwright（pip install playwright && playwright install chromium）
"""
import subprocess
import sys
from pathlib import Path

# 尝试 playwright，若无则退回「仅组装」模式
try:
    from playwright.sync_api import sync_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False

from pptx import Presentation
from pptx.util import Inches

BASE = Path(__file__).resolve().parent
HTML = BASE / "复盘PPT_毛玻璃.html"
OUT_SLIDES = BASE.parent.parent.parent.parent.parent / "卡若Ai的文件夹" / "报告" / "复盘_毛玻璃_slides"
OUT_PPT = Path("/Users/karuo/Documents/卡若Ai的文件夹/报告/复盘_2026-02-23_毛玻璃.pptx")


def screenshot_slides():
    """用 playwright 截取每页"""
    if not HAS_PLAYWRIGHT:
        print("⚠️ playwright 未安装，跳过截图。运行: pip install playwright && playwright install chromium")
        return []
    OUT_SLIDES.mkdir(parents=True, exist_ok=True)
    imgs = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.goto(f"file://{HTML}")
        for i in range(1, 6):
            sel = f"#slide-{i}"
            el = page.locator(sel)
            if el.count() > 0:
                path = OUT_SLIDES / f"slide_{i:02d}.png"
                el.screenshot(path=path)
                imgs.append(str(path))
        browser.close()
    return imgs


def build_ppt(imgs):
    """将图片组装成 PPT"""
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    layout = prs.slide_layouts[6]
    for p in imgs:
        if Path(p).exists():
            s = prs.slides.add_slide(layout)
            s.shapes.add_picture(p, Inches(0), Inches(0), width=prs.slide_width)
    OUT_PPT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(OUT_PPT)
    return OUT_PPT


def main():
    if HAS_PLAYWRIGHT:
        imgs = screenshot_slides()
    else:
        imgs = list(OUT_SLIDES.glob("slide_*.png"))
        imgs = sorted([str(p) for p in imgs])
    if not imgs:
        print("❌ 无截图可用。请先手动打开 HTML 截图，或安装 playwright。")
        print("   HTML 路径:", HTML)
        sys.exit(1)
    build_ppt(imgs)
    print("✅ PPT 已生成:", OUT_PPT)


if __name__ == "__main__":
    main()
