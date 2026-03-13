#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
视觉增强 v7：苹果毛玻璃风格底部浮层
设计规范来源：卡若AI 前端标准（神射手/毛狐狸）

核心设计原则：
1. 无视频小窗 —— 彻底去掉，全宽用于内容展示
2. 苹果毛玻璃 —— backdrop-blur + rgba深色底 + 白边 + 顶部高光条
3. 图标体系 —— 每类内容有专属 Unicode 图标，可读性强
4. 渐变强调 —— 蓝→紫主渐变，状态色 green/gold/red
5. 两档字体 —— medium 标题，regular 正文，不堆叠字重
6. 大留白 —— 元素少，每个元素有呼吸空间
7. 底部芯片 —— 渐变边框胶囊，不做满色填充
"""
import argparse
import hashlib
import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ImportError:
    sys.exit("pip3 install Pillow")

SCRIPT_DIR = Path(__file__).resolve().parent
FONTS_DIR = SCRIPT_DIR.parent / "fonts"
if not FONTS_DIR.exists():
    FONTS_DIR = Path("/Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/视频切片/fonts")

VW, VH = 498, 1080
PANEL_W, PANEL_H = 428, 330
PANEL_X = (VW - PANEL_W) // 2
PANEL_Y = VH - PANEL_H - 30
FPS = 8
CURRENT_SEED = "default"

# ── 前端规范色板（来自神射手/毛狐狸）────────────────────────────────

# 深色毛玻璃底（模拟 bg-slate-900/88 + backdrop-blur）
GLASS_FILL_TOP    = (14, 16, 28, 222)
GLASS_FILL_BTM    = (10, 12, 22, 232)
GLASS_BORDER      = (255, 255, 255, 30)   # border-white/12
GLASS_INNER_EDGE  = (255, 255, 255, 14)   # inner inset
GLASS_HIGHLIGHT   = (255, 255, 255, 28)   # top highlight strip

# 前端规范色 —— 主渐变蓝→紫
BLUE    = (96,  165, 250, 255)   # blue-400
PURPLE  = (167, 139, 250, 255)   # violet-400
CYAN    = (34,  211, 238, 255)   # cyan-400
GREEN   = (52,  211, 153, 255)   # emerald-400
GOLD    = (251, 191, 36,  255)   # amber-400
ORANGE  = (251, 146, 60,  255)   # orange-400
RED     = (248, 113, 113, 255)   # red-400
PINK    = (244, 114, 182, 255)   # pink-400
WHITE   = (248, 250, 255, 255)

TEXT_PRIMARY = (240, 244, 255, 255)      # near-white, slightly blue tint
TEXT_SECONDARY = (163, 177, 206, 255)    # slate-400 equivalent
TEXT_MUTED   = (100, 116, 145, 255)     # slate-500

# 渐变强调组（每条视频可用不同组）
ACCENT_PALETTES = [
    {"a": BLUE,   "b": PURPLE, "name": "blueprint"},
    {"a": CYAN,   "b": BLUE,   "name": "oceanic"},
    {"a": GREEN,  "b": CYAN,   "name": "emerald"},
    {"a": GOLD,   "b": ORANGE, "name": "solar"},
    {"a": PURPLE, "b": PINK,   "name": "lavender"},
]

# ── 图标系统（Unicode，确保 CJK 字体支持）───────────────────────────
ICONS = {
    "question":    "?",   # question mark – bold rendition
    "data":        "◆",
    "flow":        "▸",
    "compare":     "⇌",
    "mind":        "◎",
    "summary":     "✦",
    "check":       "✓",
    "cross":       "✕",
    "bullet":      "·",
    "arrow_right": "→",
    "star":        "★",
    "spark":       "✦",
    "tag":         "⊕",
    "globe":       "⊙",
    "target":      "◎",
    # 数字圈
    "n1": "①", "n2": "②", "n3": "③", "n4": "④", "n5": "⑤",
    "n6": "⑥", "n7": "⑦", "n8": "⑧",
    # 类别前缀
    "ai":     "A",
    "money":  "¥",
    "time":   "⏱",
    "chart":  "≋",
}

NUMBERED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"]


# ── 字体加载 ─────────────────────────────────────────────────────────

def font(size: int, weight: str = "medium"):
    mapping = {
        "regular": [
            FONTS_DIR / "NotoSansCJK-Regular.ttc",
            FONTS_DIR / "SourceHanSansSC-Medium.otf",
            Path("/System/Library/Fonts/PingFang.ttc"),
        ],
        "medium": [
            FONTS_DIR / "SourceHanSansSC-Medium.otf",
            FONTS_DIR / "NotoSansCJK-Regular.ttc",
            Path("/System/Library/Fonts/PingFang.ttc"),
        ],
        "semibold": [
            FONTS_DIR / "SourceHanSansSC-Bold.otf",
            FONTS_DIR / "NotoSansCJK-Bold.ttc",
            Path("/System/Library/Fonts/PingFang.ttc"),
        ],
        "bold": [
            FONTS_DIR / "SourceHanSansSC-Heavy.otf",
            FONTS_DIR / "SourceHanSansSC-Bold.otf",
            FONTS_DIR / "NotoSansCJK-Bold.ttc",
            Path("/System/Library/Fonts/PingFang.ttc"),
        ],
    }
    for path in mapping.get(weight, mapping["medium"]):
        if path.exists():
            try:
                return ImageFont.truetype(str(path), size)
            except Exception:
                continue
    return ImageFont.load_default()


# ── 工具函数 ──────────────────────────────────────────────────────────

def ease_out(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def ease_in_out(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 3 * t * t - 2 * t * t * t


def blend_color(c1, c2, t: float):
    return tuple(int(a + (b - a) * max(0, min(1, t))) for a, b in zip(c1, c2))


def hash_seed(text: str) -> int:
    return int(hashlib.md5(text.encode()).hexdigest()[:8], 16)


def get_palette(idx: int) -> dict:
    seed = hash_seed(f"{CURRENT_SEED}|{idx}")
    return ACCENT_PALETTES[seed % len(ACCENT_PALETTES)]


def text_bbox(fnt, text: str):
    return fnt.getbbox(text)


def text_width(fnt, text: str) -> int:
    bb = text_bbox(fnt, text)
    return bb[2] - bb[0]


def text_height(fnt, text: str) -> int:
    bb = text_bbox(fnt, text)
    return bb[3] - bb[1]


def draw_center(draw, text: str, fnt, y: int, fill, canvas_w: int = PANEL_W):
    tw = text_width(fnt, text)
    draw.text(((canvas_w - tw) // 2, y), text, font=fnt, fill=fill)


def draw_wrapped(draw, text: str, fnt, max_w: int, x: int, y: int, fill, gap: int = 6) -> int:
    lines, cur = [], ""
    for ch in text:
        test = cur + ch
        if text_width(fnt, test) > max_w and cur:
            lines.append(cur)
            cur = ch
        else:
            cur = test
    if cur:
        lines.append(cur)
    for line in lines:
        draw.text((x, y), line, font=fnt, fill=fill)
        y += text_height(fnt, line) + gap
    return y


def draw_wrapped_center(draw, text: str, fnt, max_w: int, y: int, fill, canvas_w: int = PANEL_W, gap: int = 6) -> int:
    lines, cur = [], ""
    for ch in text:
        test = cur + ch
        if text_width(fnt, test) > max_w and cur:
            lines.append(cur)
            cur = ch
        else:
            cur = test
    if cur:
        lines.append(cur)
    for line in lines:
        draw_center(draw, line, fnt, y, fill, canvas_w)
        y += text_height(fnt, line) + gap
    return y


# ── 面板底座 ─────────────────────────────────────────────────────────

def _make_shadow(blur: int = 22, alpha: int = 145):
    img = Image.new("RGBA", (PANEL_W, PANEL_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((16, 22, PANEL_W - 18, PANEL_H - 4), radius=28, fill=(0, 0, 0, alpha))
    d.rounded_rectangle((32, 40, PANEL_W - 36, PANEL_H - 18), radius=24,
                         fill=(8, 14, 44, int(alpha * 0.22)))
    return img.filter(ImageFilter.GaussianBlur(blur))


def _make_glass_panel():
    """苹果毛玻璃面板：深色渐变 + 顶部高光 + 双层边框"""
    img = Image.new("RGBA", (PANEL_W, PANEL_H), (0, 0, 0, 0))
    grad = Image.new("RGBA", (PANEL_W, PANEL_H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(PANEL_H):
        t = y / max(PANEL_H - 1, 1)
        gd.line([(0, y), (PANEL_W, y)], fill=blend_color(GLASS_FILL_TOP, GLASS_FILL_BTM, t))
    mask = Image.new("L", (PANEL_W, PANEL_H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, PANEL_W - 1, PANEL_H - 1), radius=28, fill=255)
    img = Image.composite(grad, img, mask)
    d = ImageDraw.Draw(img)
    # 外边框
    d.rounded_rectangle((0, 0, PANEL_W - 1, PANEL_H - 1), radius=28,
                         outline=GLASS_BORDER, width=1)
    # 内描边（营造厚度感）
    d.rounded_rectangle((3, 3, PANEL_W - 4, PANEL_H - 4), radius=26,
                         outline=GLASS_INNER_EDGE, width=1)
    # 顶部高光（模拟光泽）
    for y in range(28):
        alpha = int(GLASS_HIGHLIGHT[3] * (1 - y / 28) * 0.9)
        d.line([(22, y + 4), (PANEL_W - 22, y + 4)], fill=(255, 255, 255, alpha))
    return img


# ── 图标方块（inspired by lucide-react 功能入口卡片）────────────────

def _icon_badge(icon: str, color_a, color_b, size: int = 34):
    """渐变圆角图标方块，类似 from-blue-500 to-purple-500"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # 渐变背景
    for x in range(size):
        t = x / max(size - 1, 1)
        col = blend_color(color_a, color_b, t)[:3] + (230,)
        d.line([(x, 0), (x, size)], fill=col)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=10, fill=255)
    img = Image.composite(img, Image.new("RGBA", (size, size), (0, 0, 0, 0)), mask)
    d2 = ImageDraw.Draw(img)
    ff = font(size - 12, "semibold")
    tw = text_width(ff, icon)
    th = text_height(ff, icon)
    d2.text(((size - tw) // 2, (size - th) // 2 - 2), icon, font=ff, fill=WHITE)
    return img


# ── 底部芯片（glassmorphism button 风格）────────────────────────────

def _chip(text: str, palette: dict, active: float = 1.0):
    """渐变描边胶囊，模拟 glass-button 样式"""
    pad_x = 14
    ff = font(13, "medium")
    tw = text_width(ff, text)
    w = max(70, tw + pad_x * 2)
    h = 32
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # 底色（轻度填充）
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=16,
                         fill=(255, 255, 255, int(14 * active)))
    # 渐变描边模拟：先画一个大圆角矩形再稍小覆盖
    for i, col in enumerate([palette["a"], palette["b"]]):
        x_pct = i / 1.0
        bc = blend_color(palette["a"], palette["b"], x_pct)[:3] + (int(160 * active),)
    # 用 a→b 在 x 轴渐变描边
    for x in range(w):
        t = x / max(w - 1, 1)
        col = blend_color(palette["a"], palette["b"], t)[:3] + (int(150 * active),)
        if x == 0 or x == w - 1:
            d.line([(x, 8), (x, h - 8)], fill=col, width=1)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=16,
                         outline=blend_color(palette["a"], palette["b"], 0.5)[:3] + (int(150 * active),),
                         width=1)
    # 文字
    th = text_height(ff, text)
    d.text((pad_x, (h - th) // 2 - 1), text, font=ff,
           fill=(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2], int(255 * active)))
    return img


def _place_chips(base: Image.Image, chips: list, palette: dict, anim_t: float):
    """底部芯片行，从左到右居中排列"""
    gap = 10
    images = [_chip(c, palette) for c in chips]
    total_w = sum(im.width for im in images) + gap * (len(images) - 1)
    x = (PANEL_W - total_w) // 2
    y = PANEL_H - 44
    for i, (im, _) in enumerate(zip(images, chips)):
        delay = i * 0.12
        t = ease_out(max(0, min(1, (anim_t - 0.7 - delay) / 0.4)))
        if t > 0:
            offset = int((1 - t) * 10)
            base.alpha_composite(im, (x, y + offset))
        x += im.width + gap


# ── 头部状态行 ───────────────────────────────────────────────────────

def _header_bar(base: Image.Image, label: str, subtitle: str, palette: dict, t: float):
    d = ImageDraw.Draw(base)
    # 左侧图标 badge
    badge = _icon_badge(ICONS["spark"], palette["a"], palette["b"], size=32)
    badge_alpha = ease_out(min(1.0, t * 4))
    if badge_alpha > 0.05:
        bx, by = 20, 20
        base.alpha_composite(badge, (bx, by))

    # 标签文字
    fl = font(12, "medium")
    label_a = ease_out(min(1.0, max(0, (t - 0.1) / 0.5)))
    if label_a > 0:
        d.text((60, 22), label, font=fl, fill=(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2], int(210 * label_a)))

    # 副标题
    fs = font(11, "regular")
    sub_a = ease_out(min(1.0, max(0, (t - 0.2) / 0.5)))
    if sub_a > 0 and subtitle:
        d.text((60, 38), subtitle, font=fs,
               fill=(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2], int(180 * sub_a)))

    # 右侧状态点（脉冲）
    dot_r = 4 + int(1.5 * math.sin(t * 3))
    dot_color = palette["a"][:3] + (200,)
    d.ellipse((PANEL_W - 30 - dot_r, 26 - dot_r,
               PANEL_W - 30 + dot_r, 26 + dot_r), fill=dot_color)
    # 发光圈
    glow_r = dot_r + 4
    d.ellipse((PANEL_W - 30 - glow_r, 26 - glow_r,
               PANEL_W - 30 + glow_r, 26 + glow_r),
              outline=dot_color[:3] + (60,), width=1)


# ── 内容区域渲染器 ────────────────────────────────────────────────────

def _section_title(draw, title: str, icon: str, palette: dict, y: int, t: float) -> int:
    ta = ease_out(min(1.0, max(0, (t - 0.1) / 0.5)))
    if ta <= 0:
        return y
    ff = font(14, "medium")
    fi = font(14, "semibold")
    # 图标（渐变色）
    draw.text((20, y), icon, font=fi, fill=blend_color(palette["a"], palette["b"], 0.4)[:3] + (int(255 * ta),))
    draw.text((42, y), title, font=ff, fill=(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2], int(240 * ta)))
    return y + text_height(ff, title) + 10


def _render_title_card(base, params, t, palette):
    d = ImageDraw.Draw(base)
    question = params.get("question", "")
    subtitle = params.get("subtitle", "")

    y = 80
    # 问号图标
    fi = font(32, "bold")
    badge = _icon_badge("?", palette["a"], palette["b"], size=40)
    base.alpha_composite(badge, (20, y - 4))

    # 主问句（打字机效果）
    ff = font(22, "medium")
    type_t = ease_out(min(1.0, t / 2.0))
    chars = max(1, int(len(question) * type_t))
    shown = question[:chars]
    cursor = "▍" if type_t < 0.95 else ""
    draw_wrapped(d, shown + cursor, ff, PANEL_W - 80, 72, y, TEXT_PRIMARY)

    # 副标题
    if subtitle and t > 1.2:
        sub_a = ease_out(min(1.0, (t - 1.2) / 0.7))
        fs = font(13, "regular")
        y_sub = y + 56
        d.text((70, y_sub), subtitle, font=fs,
               fill=(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2], int(200 * sub_a)))

    # 芯片
    chips = params.get("chips", ["AI 工具", "副业赛道", "立即可做"])
    _place_chips(base, chips, palette, t)


def _render_data_card(base, params, t, palette):
    d = ImageDraw.Draw(base)
    items = params.get("items", [])
    section_t = ease_out(min(1.0, t * 3))
    y = _section_title(d, params.get("title", ""), ICONS["data"], palette, 78, t)

    col_w = (PANEL_W - 30) // 2
    for i, item in enumerate(items[:4]):
        delay = 0.2 + i * 0.12
        card_t = ease_out(min(1.0, max(0, (t - delay) / 0.55)))
        if card_t <= 0:
            continue
        row, col = i // 2, i % 2
        cx = 16 + col * (col_w + 8)
        cy = y + row * 78 - int((1 - card_t) * 12)

        # 卡片背景（轻度毛玻璃）
        d.rounded_rectangle((cx, cy, cx + col_w, cy + 68), radius=14,
                             fill=(255, 255, 255, int(12 * card_t)))
        d.rounded_rectangle((cx, cy, cx + col_w, cy + 68), radius=14,
                             outline=blend_color(palette["a"], palette["b"], i / 3)[:3] + (int(100 * card_t),),
                             width=1)
        # 侧色带
        ac = blend_color(palette["a"], palette["b"], i / 3)
        d.rounded_rectangle((cx, cy, cx + 3, cy + 68), radius=2, fill=ac[:3] + (int(220 * card_t),))

        # 数值（动态增长）
        raw = str(item.get("number", ""))
        value = raw
        try:
            if "~" in raw:
                lo, hi = raw.split("~")
                value = f"{int(int(lo) * card_t)}~{int(int(hi) * card_t)}"
            elif raw.endswith("万+"):
                num = int(raw[:-2])
                value = f"{max(1, int(num * card_t))}万+"
            elif raw.endswith("分钟"):
                num = int(raw[:-2])
                value = f"{max(1, int(num * card_t))}分"
        except Exception:
            pass
        fv = font(20, "medium")
        fc = ac[:3] + (int(255 * card_t),)
        d.text((cx + 10, cy + 6), value, font=fv, fill=fc)
        fl = font(11, "regular")
        d.text((cx + 10, cy + 32), item.get("label", ""), font=fl,
               fill=(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2], int(200 * card_t)))
        fd = font(10, "regular")
        d.text((cx + 10, cy + 50), item.get("desc", ""), font=fd,
               fill=(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2], int(170 * card_t)))

    _place_chips(base, params.get("chips", []), palette, t)


def _render_flow_chart(base, params, t, palette):
    d = ImageDraw.Draw(base)
    steps = params.get("steps", [])
    y = _section_title(d, params.get("title", ""), ICONS["flow"], palette, 78, t)
    step_h = min(40, (PANEL_H - y - 54) // max(len(steps), 1))

    for i, step in enumerate(steps):
        delay = 0.15 + i * 0.14
        st = ease_out(min(1.0, max(0, (t - delay) / 0.5)))
        if st <= 0:
            continue
        sy = y + i * step_h

        # 圆点（渐入弹出）
        cx_dot = 32
        ac = blend_color(palette["a"], palette["b"], i / max(len(steps) - 1, 1))
        dot_r = int(12 * ease_out(min(1.0, (t - delay) / 0.3)))
        if dot_r > 2:
            d.ellipse((cx_dot - dot_r, sy + step_h // 2 - dot_r,
                       cx_dot + dot_r, sy + step_h // 2 + dot_r),
                      fill=ac[:3] + (220,))
            # 数字
            ni = NUMBERED[i] if i < len(NUMBERED) else str(i + 1)
            fn = font(11, "semibold")
            nw = text_width(fn, ni)
            d.text((cx_dot - nw // 2 - 1, sy + step_h // 2 - 8), ni, font=fn,
                   fill=(255, 255, 255, int(255 * st)))

        # 步骤文字（右滑入）
        slide_x = int((1 - st) * 20)
        fs = font(14, "regular")
        d.text((56 + slide_x, sy + step_h // 2 - 9), step, font=fs,
               fill=(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2], int(250 * st)))

        # 虚线连接
        if i < len(steps) - 1:
            for dy in range(step_h // 2 + 10, step_h - 2, 5):
                dc = ac[:3] + (int(55 * st),)
                d.ellipse((cx_dot - 1, sy + dy, cx_dot + 1, sy + dy + 2), fill=dc)

    _place_chips(base, params.get("chips", []), palette, t)


def _render_comparison(base, params, t, palette):
    d = ImageDraw.Draw(base)
    y = _section_title(d, params.get("title", ""), ICONS["compare"], palette, 78, t)

    mid = PANEL_W // 2
    mx = 16
    gap = 8

    # 左侧框
    la = ease_out(min(1.0, max(0, (t - 0.1) / 0.6)))
    if la > 0:
        d.rounded_rectangle((mx, y, mid - gap, PANEL_H - 54), radius=16,
                             fill=(248, 113, 113, int(14 * la)),
                             outline=(248, 113, 113, int(80 * la)), width=1)
    # 右侧框
    ra = ease_out(min(1.0, max(0, (t - 0.2) / 0.6)))
    if ra > 0:
        d.rounded_rectangle((mid + gap, y, PANEL_W - mx, PANEL_H - 54), radius=16,
                             fill=(52, 211, 153, int(14 * ra)),
                             outline=(52, 211, 153, int(80 * ra)), width=1)

    # 标题行
    fh = font(13, "medium")
    if la > 0.2:
        d.text((mx + 12, y + 10), ICONS["cross"] + " " + params.get("left_title", ""), font=fh,
               fill=(248, 113, 113, int(220 * la)))
    if ra > 0.2:
        d.text((mid + gap + 12, y + 10), ICONS["check"] + " " + params.get("right_title", ""), font=fh,
               fill=(52, 211, 153, int(220 * ra)))

    fl = font(13, "regular")
    iy = y + 36
    for j, item in enumerate(params.get("left_items", [])):
        ia = ease_out(min(1.0, max(0, (t - 0.3 - j * 0.1) / 0.45)))
        if ia > 0:
            d.text((mx + 10 - int((1 - ia) * 12), iy + j * 28), item, font=fl,
                   fill=(248, 113, 113, int(200 * ia)))
    iy = y + 36
    for j, item in enumerate(params.get("right_items", [])):
        ia = ease_out(min(1.0, max(0, (t - 0.5 - j * 0.1) / 0.45)))
        if ia > 0:
            d.text((mid + gap + 10 + int((1 - ia) * 12), iy + j * 28), item, font=fl,
                   fill=(52, 211, 153, int(200 * ia)))

    _place_chips(base, params.get("chips", []), palette, t)


def _render_mindmap(base, params, t, palette):
    d = ImageDraw.Draw(base)
    center = params.get("center", "核心")
    branches = params.get("branches", [])
    cx, cy = PANEL_W // 2, (PANEL_H - 54) // 2 + 40

    # 中心节点（缩放入场）
    ct = ease_out(min(1.0, t / 0.7))
    cr = int(36 * ct) + int(3 * math.sin(t * 2))
    if cr > 3:
        # 渐变圆背景
        for r in range(cr, 0, -2):
            tf = r / cr
            col = blend_color(palette["a"], palette["b"], 1 - tf)[:3] + (int(200 * tf * ct),)
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=col)
        fc = font(13, "semibold")
        cw = text_width(fc, center)
        d.text((cx - cw // 2, cy - 9), center, font=fc, fill=WHITE)

    # 分支
    n = len(branches)
    for i, br in enumerate(branches):
        bt = ease_out(min(1.0, max(0, (t - 0.3 - i * 0.1) / 0.55)))
        if bt <= 0:
            continue
        ang = math.radians(-90 + i * (360 / n))
        dist = 90 * bt
        bx = cx + int(math.cos(ang) * dist)
        by = cy + int(math.sin(ang) * dist)
        ac = blend_color(palette["a"], palette["b"], i / max(n - 1, 1))

        # 连线
        d.line([(cx, cy), (bx, by)], fill=ac[:3] + (int(100 * bt),), width=1)

        # 分支节点背景
        fb = font(11, "medium")
        bw = text_width(fb, br) + 16
        bh = 22
        d.rounded_rectangle((bx - bw // 2, by - bh // 2, bx + bw // 2, by + bh // 2), radius=11,
                             fill=ac[:3] + (int(35 * bt),), outline=ac[:3] + (int(120 * bt),), width=1)
        d.text((bx - bw // 2 + 8, by - bh // 2 + 4), br, font=fb, fill=ac[:3] + (int(245 * bt),))

    _place_chips(base, params.get("chips", []), palette, t)


def _render_summary(base, params, t, palette):
    d = ImageDraw.Draw(base)
    headline = params.get("headline", "")
    points = params.get("points", [])
    cta = params.get("cta", "")

    # 顶部标题框
    ha = ease_out(min(1.0, max(0, (t - 0.05) / 0.55)))
    if ha > 0:
        d.rounded_rectangle((18, 74, PANEL_W - 18, 116), radius=20,
                             fill=blend_color(palette["a"], palette["b"], 0.5)[:3] + (int(25 * ha),),
                             outline=blend_color(palette["a"], palette["b"], 0.5)[:3] + (int(100 * ha),),
                             width=1)
        fh = font(20, "medium")
        draw_wrapped_center(d, headline, fh, PANEL_W - 60, 82, TEXT_PRIMARY)

    # 要点列表
    y = 128
    for i, pt in enumerate(points):
        ia = ease_out(min(1.0, max(0, (t - 0.3 - i * 0.12) / 0.5)))
        if ia <= 0:
            continue
        ac = blend_color(palette["a"], palette["b"], i / max(len(points) - 1, 1))
        # 颜色点
        d.ellipse((22, y + i * 32 + 5, 30, y + i * 32 + 13),
                  fill=ac[:3] + (int(240 * ia),))
        fp = font(14, "regular")
        d.text((38 + int((1 - ia) * 14), y + i * 32), pt, font=fp,
               fill=(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2], int(250 * ia)))

    # CTA 按钮（渐变填充）
    if cta:
        ca = ease_out(min(1.0, max(0, (t - 1.0) / 0.45)))
        if ca > 0:
            by = PANEL_H - 54 - int((1 - ca) * 8)
            for x in range(44, PANEL_W - 44):
                tf = (x - 44) / max(PANEL_W - 88, 1)
                col = blend_color(palette["a"], palette["b"], tf)[:3] + (int(210 * ca),)
                d.line([(x, by), (x, by + 28)], fill=col)
            d.rounded_rectangle((44, by, PANEL_W - 44, by + 28), radius=14,
                                 outline=(255, 255, 255, int(40 * ca)), width=1)
            fc = font(13, "medium")
            draw_center(d, cta, fc, by + 6, WHITE)


# ── 场景渲染调度 ──────────────────────────────────────────────────────

RENDERERS = {
    "title_card":     _render_title_card,
    "data_card":      _render_data_card,
    "flow_chart":     _render_flow_chart,
    "comparison_card": _render_comparison,
    "mindmap_card":   _render_mindmap,
    "summary_card":   _render_summary,
}


def compose_frame(scene: dict, local_t: float, palette: dict) -> Image.Image:
    scene_type = scene.get("type", "title_card")
    params = scene.get("params", {})
    scene_progress = (local_t % 5.0) / 5.0

    base = Image.new("RGBA", (PANEL_W, PANEL_H), (0, 0, 0, 0))
    base.alpha_composite(_make_shadow(), (0, 0))
    base.alpha_composite(_make_glass_panel(), (0, 0))

    renderer = RENDERERS.get(scene_type)
    if renderer:
        renderer(base, params, local_t, palette)

    # 头部标签
    label = scene.get("label", "卡若 · 精华")
    sub_label = scene.get("sub_label", "")
    _header_bar(base, label, sub_label, palette, local_t)

    return base


def render_overlay_frame(scene: dict, local_t: float, scene_idx: int) -> Image.Image:
    palette = get_palette(scene_idx)
    panel = compose_frame(scene, local_t, palette)

    # 整体漂浮 + 呼吸缩放
    intro = ease_out(min(1.0, local_t / 0.6))
    breath = 1 + math.sin(local_t * 1.3) * 0.011
    scale = (0.94 + intro * 0.06) * breath
    y_drift = int((1 - intro) * 18 + math.sin(local_t * 1.0) * 4)
    x_drift = int(math.sin(local_t * 0.65) * 2)

    panel_s = panel.resize((int(PANEL_W * scale), int(PANEL_H * scale)), Image.LANCZOS)
    frame = Image.new("RGBA", (VW, VH), (0, 0, 0, 0))
    px = (VW - panel_s.width) // 2 + x_drift
    py = PANEL_Y - (panel_s.height - PANEL_H) // 2 + y_drift
    frame.alpha_composite(panel_s, (max(0, px), max(0, py)))
    return frame


# ── 默认场景（用于测试）──────────────────────────────────────────────

DEFAULT_SCENES = [
    {
        "start": 0, "end": 30,
        "type": "title_card",
        "label": "卡若 · 精华",
        "sub_label": "AI 工具真实评测",
        "params": {
            "question": "哪个AI模型才是真正意义上的AI？",
            "subtitle": "深度AI模型对比：不是语言模型",
            "chips": ["深度AI", "语言模型", "真实评测"],
        },
    },
    {
        "start": 30, "end": 90,
        "type": "comparison_card",
        "label": "卡若 · 对比",
        "sub_label": "工具性能差异分析",
        "params": {
            "title": "语言模型 vs 真正的AI",
            "left_title": "语言模型",
            "left_items": ["只回答文字", "无法执行动作", "不学习记忆"],
            "right_title": "深度AI",
            "right_items": ["理解并执行", "动态调整策略", "持续学习反馈"],
            "chips": ["能力差异", "使用场景", "选型建议"],
        },
    },
    {
        "start": 90, "end": 150,
        "type": "flow_chart",
        "label": "卡若 · 方法论",
        "sub_label": "评测流程",
        "params": {
            "title": "怎么判断一个AI是否真正有用",
            "steps": ["提一个具体任务", "看它会不会主动拆解", "看执行后有没有反馈", "反复迭代才是真AI"],
            "chips": ["判断标准", "实操方法", "避坑指南"],
        },
    },
    {
        "start": 150, "end": 190,
        "type": "summary_card",
        "label": "卡若 · 总结",
        "sub_label": "你可以直接用",
        "params": {
            "headline": "选AI就选能执行的那个",
            "points": ["语言模型≠真正的AI", "执行力是核心判断标准", "先用深度AI跑一遍再说"],
            "cta": "关注 · 了解更多AI工具",
        },
    },
]


# ── 渲染引擎 ─────────────────────────────────────────────────────────

def render_scene_clip(scene: dict, scene_idx: int, tmp_dir: str) -> dict | None:
    dur = float(scene["end"] - scene["start"])
    sdir = os.path.join(tmp_dir, f"sc_{scene_idx:03d}")
    os.makedirs(sdir, exist_ok=True)
    n_frames = max(1, int(dur * FPS))
    concat = []
    last_fp = None
    tp = scene.get("type", "?")
    pal_name = get_palette(scene_idx)["name"]
    print(f"  [{scene_idx+1}] {tp} {scene['start']:.0f}s–{scene['end']:.0f}s ({n_frames}f, {pal_name})...", end="", flush=True)
    for i in range(n_frames):
        lt = i / FPS
        frame = render_overlay_frame(scene, lt, scene_idx)
        fp = os.path.join(sdir, f"f{i:04d}.png")
        frame.save(fp, "PNG")
        concat.append(f"file '{fp}'")
        concat.append(f"duration {1.0/FPS:.4f}")
        last_fp = fp
    concat.append(f"file '{last_fp}'")
    cf = os.path.join(sdir, "concat.txt")
    with open(cf, "w") as f:
        f.write("\n".join(concat))
    mov = os.path.join(sdir, "sc.mov")
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", cf,
           "-vf", "fps=25,format=rgba", "-c:v", "png", "-t", f"{dur:.3f}", mov]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f" ERR", flush=True)
        return None
    print(" ✓", flush=True)
    return {"path": mov, "start": scene["start"], "end": scene["end"]}


def build_overlay_stream(clips: list, duration: float, tmp_dir: str) -> str | None:
    blank = Image.new("RGBA", (VW, VH), (0, 0, 0, 0))
    bp = os.path.join(tmp_dir, "blank.png")
    blank.save(bp, "PNG")
    concat = []
    prev = 0.0
    for c in clips:
        if c["start"] > prev + 0.05:
            concat += [f"file '{bp}'", f"duration {c['start']-prev:.3f}"]
        concat.append(f"file '{c['path']}'")
        prev = c["end"]
    if prev < duration:
        concat += [f"file '{bp}'", f"duration {duration-prev:.3f}"]
    concat.append(f"file '{bp}'")
    cf = os.path.join(tmp_dir, "ov_concat.txt")
    with open(cf, "w") as f:
        f.write("\n".join(concat))
    out = os.path.join(tmp_dir, "overlay.mov")
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", cf,
           "-vf", "fps=25,format=rgba", "-c:v", "png", "-t", f"{duration:.3f}", out]
    print("  合并叠加流...", end="", flush=True)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f" ERR", flush=True)
        return None
    mb = os.path.getsize(out) / 1024 / 1024
    print(f" ✓ ({mb:.0f}MB)", flush=True)
    return out


def compose_final(input_video: str, overlay: str, output: str, duration: float) -> bool:
    cmd = [
        "ffmpeg", "-y", "-i", input_video, "-i", overlay,
        "-filter_complex", "[1:v]format=rgba[ov];[0:v][ov]overlay=0:0:format=auto:shortest=1[v]",
        "-map", "[v]", "-map", "0:a?",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k",
        "-t", f"{duration:.3f}", "-movflags", "+faststart", output,
    ]
    print("  最终合成...", end="", flush=True)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f" ERR", flush=True)
        return False
    mb = os.path.getsize(output) / 1024 / 1024
    print(f" ✓ ({mb:.1f}MB)", flush=True)
    return True


def get_dur(v: str) -> float:
    r = subprocess.run(["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", v],
                       capture_output=True, text=True)
    return float(json.loads(r.stdout)["format"]["duration"])


def main():
    global CURRENT_SEED
    ap = argparse.ArgumentParser(description="视觉增强 v7 苹果毛玻璃浮层")
    ap.add_argument("-i", "--input", required=True)
    ap.add_argument("-o", "--output", required=True)
    ap.add_argument("--scenes")
    args = ap.parse_args()

    CURRENT_SEED = Path(args.input).stem

    scenes = DEFAULT_SCENES
    if args.scenes and os.path.exists(args.scenes):
        with open(args.scenes, "r", encoding="utf-8") as f:
            scenes = json.load(f)

    duration = get_dur(args.input)
    for sc in scenes:
        sc["end"] = min(sc["end"], duration)

    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    print(f"输入: {Path(args.input).name} ({duration:.0f}s)")
    print(f"场景: {len(scenes)} 段 · 苹果毛玻璃 v7\n")

    with tempfile.TemporaryDirectory(prefix="ve7_") as tmp:
        print("【1/3】生成动态帧...", flush=True)
        clips = [c for c in (render_scene_clip(sc, i, tmp) for i, sc in enumerate(scenes)) if c]
        if not clips:
            sys.exit(1)
        print(f"\n【2/3】构建叠加流 ({len(clips)} 段)...", flush=True)
        ov = build_overlay_stream(clips, duration, tmp)
        if not ov:
            sys.exit(1)
        print("\n【3/3】合成成片...", flush=True)
        if not compose_final(args.input, ov, args.output, duration):
            sys.exit(1)
    print(f"\n✅ 完成: {args.output}")


if __name__ == "__main__":
    main()
