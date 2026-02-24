#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为《纳瓦尔访谈》毛玻璃 PPT 补齐配图（程序化生成，统一风格）

输出目录（强制）：/Users/karuo/Documents/卡若Ai的文件夹/图片/
生成文件：
  - naval_09_methods.png
  - naval_10_qa1.png
  - naval_11_qa2.png
  - naval_13_flow.png
  - naval_14_action.png
  - naval_15_end.png
"""

from __future__ import annotations

from pathlib import Path
import math

from PIL import Image, ImageDraw, ImageFont, ImageFilter


OUT_DIR = Path("/Users/karuo/Documents/卡若Ai的文件夹/图片")
W, H = 1280, 720

FONT_CANDIDATES = [
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/视频切片/fonts/SourceHanSansSC-Heavy.otf",
    "/Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/视频切片/fonts/SourceHanSansSC-Bold.otf",
]


def _font(size: int) -> ImageFont.FreeTypeFont:
    for p in FONT_CANDIDATES:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()


def _lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def gradient_bg(c1: tuple[int, int, int], c2: tuple[int, int, int]) -> Image.Image:
    """竖向渐变背景"""
    img = Image.new("RGB", (W, H), c1)
    px = img.load()
    for y in range(H):
        t = y / (H - 1)
        r = _lerp(c1[0], c2[0], t)
        g = _lerp(c1[1], c2[1], t)
        b = _lerp(c1[2], c2[2], t)
        for x in range(W):
            px[x, y] = (r, g, b)
    return img


def glass_overlay(img: Image.Image, alpha: int = 170) -> Image.Image:
    """轻毛玻璃：暗层 + 轻模糊 + 颗粒感"""
    base = img.filter(ImageFilter.GaussianBlur(radius=12)).convert("RGBA")
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, alpha))
    out = Image.alpha_composite(base, overlay)
    return out


def draw_orb(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int, color: tuple[int, int, int, int]):
    """抽象光球"""
    for i in range(r, 0, -3):
        a = int(color[3] * (i / r) ** 1.6)
        draw.ellipse([cx - i, cy - i, cx + i, cy + i], fill=(color[0], color[1], color[2], a))


def card(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, fill=(255, 255, 255, 20), outline=(255, 255, 255, 40)):
    draw.rounded_rectangle([x, y, x + w, y + h], radius=22, fill=fill, outline=outline, width=2)


def title_block(img: Image.Image, icon: str, title: str, subtitle: str):
    draw = ImageDraw.Draw(img)
    t_font = _font(54)
    s_font = _font(26)
    i_font = _font(64)

    draw.text((92, 88), icon, font=i_font, fill=(255, 255, 255, 220))
    draw.text((92, 170), title, font=t_font, fill=(255, 255, 255, 245))
    draw.text((92, 242), subtitle, font=s_font, fill=(255, 255, 255, 190))


def bullets(img: Image.Image, items: list[str], x: int, y: int, line_h: int = 46):
    draw = ImageDraw.Draw(img)
    f = _font(30)
    for i, it in enumerate(items):
        draw.text((x, y + i * line_h), f"• {it}", font=f, fill=(255, 255, 255, 230))


def make_one(name: str, icon: str, title: str, subtitle: str, items: list[str], colors: tuple[tuple[int, int, int], tuple[int, int, int]]):
    bg = gradient_bg(colors[0], colors[1])
    img = glass_overlay(bg, alpha=120)
    draw = ImageDraw.Draw(img)

    # 抽象装饰
    draw_orb(draw, 980, 170, 180, (255, 215, 0, 85))
    draw_orb(draw, 1120, 540, 240, (120, 200, 255, 65))
    draw_orb(draw, 260, 560, 220, (255, 120, 160, 55))

    # 卡片区
    card(draw, 72, 340, 1136, 300, fill=(255, 255, 255, 18), outline=(255, 255, 255, 35))

    title_block(img, icon, title, subtitle)
    bullets(img, items, 110, 380, line_h=52)

    out = OUT_DIR / name
    img.convert("RGB").save(out, "PNG")
    print("OK:", out)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    make_one(
        "naval_09_methods.png",
        "🌱",
        "方法清单（去重版）",
        "把抽象变成可训练的动作",
        [
            "先选问题：问题质量决定杠杆",
            "可逆小行动：用反馈替代脑内争论",
            "秘书定理：并行方案→快速淘汰",
            "产品化灵感：模板/系统/流程",
            "信息降噪：新闻热点降权",
        ],
        ((20, 40, 30), (10, 20, 18)),
    )

    make_one(
        "naval_10_qa1.png",
        "❓",
        "问答（1/2）",
        "把访谈变成可照抄回答",
        [
            "等条件好了再快乐？→ 先解绑幸福与条件",
            "追财富还是地位？→ 先选自由 or 认可",
            "别人评价影响我？→ 用可控指标替换评分",
            "直觉不靠谱？→ 当作提醒：补证据",
            "信息太多？→ 过滤输入，保留长期增益",
        ],
        ((40, 30, 60), (18, 14, 28)),
    )

    make_one(
        "naval_11_qa2.png",
        "❓",
        "问答（2/2）",
        "长期主义的落地方式",
        [
            "灵感多但落不了地？→ 给灵感找容器",
            "想得多做得少？→ 24小时内做可逆动作",
            "焦虑上来就失控？→ 先观察再决策",
            "人生意义摇摆？→ 统一评估尺度（1年/3年）",
            "长期主义如何系统化？→ 复利资产清单净增",
        ],
        ((60, 30, 30), (26, 12, 12)),
    )

    make_one(
        "naval_13_flow.png",
        "🔁",
        "核心流程图",
        "追自由：从选择到复利系统",
        [
            "区分：追财富 or 追地位",
            "选高质量问题→行动采样反馈",
            "并行迭代→产品化成果",
            "复利资产净增→边界与过滤",
            "心智卫生→更少痛苦更高行动",
        ],
        ((15, 25, 50), (8, 12, 22)),
    )

    make_one(
        "naval_14_action.png",
        "📌",
        "7 天行动清单",
        "把这套认知变成习惯",
        [
            "Day1：写下你的“欲望合约”",
            "Day2：挑 1 个可逆小行动（≤30分钟）",
            "Day3：建立输入过滤（禁新闻1天）",
            "Day4：并行 2 个方案，做真实反馈",
            "Day5：把一次灵感做成模板",
        ],
        ((30, 45, 65), (12, 18, 28)),
    )

    make_one(
        "naval_15_end.png",
        "✨",
        "结尾：一句话带走",
        "幸福不是终点，是系统的副产品",
        [
            "把幸福从条件里解绑",
            "把财富当技能训练",
            "把长期当系统经营",
            "把焦虑当信号而非命令",
            "从今天开始做可逆的小动作",
        ],
        ((12, 12, 12), (35, 35, 35)),
    )


if __name__ == "__main__":
    main()

