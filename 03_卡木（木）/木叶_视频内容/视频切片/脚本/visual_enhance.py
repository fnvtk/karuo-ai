#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
视觉增强 v5：立体双层苹果毛玻璃舞台

特性：
1. 原视频完全不变，仅在底部叠加一块立体舞台。
2. 舞台包含：后层底座、中层玻璃板、前层信息芯片、右上动态小视频窗。
3. 参考卡若AI 前端的蓝/紫/青/金配色与苹果毛玻璃层级感。
4. 全动态：缩放、漂浮、光扫、数字增长、节点扩散、图表生长、小视频窗持续动态。
"""
import argparse
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
    sys.exit('需要 Pillow: pip3 install Pillow')

SCRIPT_DIR = Path(__file__).resolve().parent
FONTS_DIR = SCRIPT_DIR.parent / 'fonts'
if not FONTS_DIR.exists():
    FONTS_DIR = Path('/Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/视频切片/fonts')

VW, VH = 498, 1080
PANEL_W, PANEL_H = 418, 336
PANEL_X = (VW - PANEL_W) // 2
PANEL_Y = VH - PANEL_H - 28
FPS = 8

GLASS_TOP = (26, 33, 52, 214)
GLASS_BOTTOM = (18, 24, 40, 224)
GLASS_BORDER = (255, 255, 255, 70)
GLASS_EDGE = (255, 255, 255, 28)
BASE_BACK = (44, 63, 113, 90)
BASE_BACK_2 = (94, 54, 146, 80)
WHITE = (248, 250, 255, 255)
TEXT = (225, 232, 245, 255)
TEXT_SUB = (163, 176, 198, 255)
TEXT_MUTED = (104, 118, 144, 255)
BLUE = (96, 165, 250, 255)
PURPLE = (167, 139, 250, 255)
GREEN = (52, 211, 153, 255)
GOLD = (251, 191, 36, 255)
ORANGE = (251, 146, 60, 255)
RED = (248, 113, 113, 255)
CYAN = (34, 211, 238, 255)
ACCENTS = [BLUE, PURPLE, GREEN, GOLD, ORANGE, RED, CYAN]


def font(size: int, weight='medium'):
    if isinstance(weight, bool):
        weight = 'bold' if weight else 'medium'
    font_map = {
        'regular': [
            FONTS_DIR / 'NotoSansCJK-Regular.ttc',
            FONTS_DIR / 'SourceHanSansSC-Medium.otf',
            Path('/System/Library/Fonts/PingFang.ttc'),
        ],
        'medium': [
            FONTS_DIR / 'SourceHanSansSC-Medium.otf',
            FONTS_DIR / 'NotoSansCJK-Regular.ttc',
            Path('/System/Library/Fonts/PingFang.ttc'),
        ],
        'semibold': [
            FONTS_DIR / 'SourceHanSansSC-Bold.otf',
            FONTS_DIR / 'NotoSansCJK-Bold.ttc',
            Path('/System/Library/Fonts/PingFang.ttc'),
        ],
        'bold': [
            FONTS_DIR / 'SourceHanSansSC-Heavy.otf',
            FONTS_DIR / 'SourceHanSansSC-Bold.otf',
            FONTS_DIR / 'NotoSansCJK-Bold.ttc',
            Path('/System/Library/Fonts/PingFang.ttc'),
        ],
    }
    candidates = font_map.get(weight, font_map['medium'])
    for path in candidates:
        if path.exists():
            try:
                return ImageFont.truetype(str(path), size)
            except Exception:
                continue
    return ImageFont.load_default()


def ease_out_cubic(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 1 - pow(1 - t, 3)


def blend(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def rounded(draw, xy, radius, **kwargs):
    draw.rounded_rectangle(xy, radius=radius, **kwargs)


def draw_center(draw, text, fnt, y, fill, width):
    bbox = fnt.getbbox(text)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, y), text, font=fnt, fill=fill)


def draw_wrap(draw, text, fnt, max_w, x, y, fill, line_gap=6):
    lines, cur = [], ''
    for ch in text:
        candidate = cur + ch
        bbox = fnt.getbbox(candidate)
        if bbox[2] - bbox[0] > max_w and cur:
            lines.append(cur)
            cur = ch
        else:
            cur = candidate
    if cur:
        lines.append(cur)
    for line in lines:
        draw.text((x, y), line, font=fnt, fill=fill)
        bbox = fnt.getbbox(line)
        y += (bbox[3] - bbox[1]) + line_gap
    return y


def draw_wrap_center(draw, text, fnt, max_w, y, fill, width, line_gap=6):
    lines, cur = [], ''
    for ch in text:
        candidate = cur + ch
        bbox = fnt.getbbox(candidate)
        if bbox[2] - bbox[0] > max_w and cur:
            lines.append(cur)
            cur = ch
        else:
            cur = candidate
    if cur:
        lines.append(cur)
    for line in lines:
        bbox = fnt.getbbox(line)
        tw = bbox[2] - bbox[0]
        draw.text(((width - tw) // 2, y), line, font=fnt, fill=fill)
        y += (bbox[3] - bbox[1]) + line_gap
    return y


def create_shadow(size, blur_radius=18, alpha=125):
    w, h = size
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((12, 18, w - 18, h - 4), radius=28, fill=(0, 0, 0, alpha))
    return img.filter(ImageFilter.GaussianBlur(blur_radius))


def create_back_plate(progress: float):
    img = Image.new('RGBA', (PANEL_W, PANEL_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pulse = 0.78 + 0.22 * math.sin(progress * math.pi * 2.0)
    c1 = tuple(int(v * pulse) for v in BASE_BACK[:3]) + (BASE_BACK[3],)
    c2 = tuple(int(v * pulse) for v in BASE_BACK_2[:3]) + (BASE_BACK_2[3],)
    rounded(d, (18, 14, PANEL_W - 10, PANEL_H - 8), 28, fill=c1)
    rounded(d, (8, 26, PANEL_W - 24, PANEL_H - 22), 24, fill=c2)
    return img.filter(ImageFilter.GaussianBlur(1.2))


def create_glass_panel():
    img = Image.new('RGBA', (PANEL_W, PANEL_H), (0, 0, 0, 0))
    grad = Image.new('RGBA', (PANEL_W, PANEL_H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(PANEL_H):
        t = y / max(PANEL_H - 1, 1)
        col = blend(GLASS_TOP, GLASS_BOTTOM, t)
        gd.line([(0, y), (PANEL_W, y)], fill=col)
    mask = Image.new('L', (PANEL_W, PANEL_H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, PANEL_W - 1, PANEL_H - 1), radius=30, fill=255)
    img = Image.composite(grad, img, mask)
    d = ImageDraw.Draw(img)
    rounded(d, (0, 0, PANEL_W - 1, PANEL_H - 1), 30, outline=GLASS_BORDER, width=1)
    for y in range(24):
        alpha = int(34 * (1 - y / 24))
        d.line([(28, y + 2), (PANEL_W - 28, y + 2)], fill=(255, 255, 255, alpha))
    rounded(d, (10, 12, PANEL_W - 10, PANEL_H - 10), 24, outline=GLASS_EDGE, width=1)
    return img


def create_chip(text, accent, active=1.0):
    w = max(66, 20 + len(text) * 14)
    h = 34
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    fill = (22, 28, 45, int(185 * active))
    border = accent[:3] + (int(155 * active),)
    rounded(d, (0, 0, w - 1, h - 1), 17, fill=fill, outline=border, width=1)
    ff = font(14, 'medium')
    bbox = ff.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    d.text(((w - tw) // 2, (h - th) // 2 - 1), text, font=ff, fill=(245, 248, 255, int(255 * active)))
    return img


def create_metric_card(title, value, subtitle, accent, progress):
    w, h = 118, 84
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    fill = (18, 24, 38, 215)
    rounded(d, (0, 0, w - 1, h - 1), 18, fill=fill, outline=accent[:3] + (120,), width=1)
    d.rounded_rectangle((12, 14, 16, h - 14), radius=2, fill=accent[:3] + (220,))
    d.text((24, 12), title, font=font(11, 'medium'), fill=TEXT_SUB)
    d.text((24, 34), value, font=font(21, 'medium'), fill=accent)
    d.text((24, 60), subtitle, font=font(10, 'regular'), fill=TEXT_MUTED)
    dot_r = 5 + int(2 * math.sin(progress * math.pi * 2))
    d.ellipse((w - 20 - dot_r, 12 - dot_r // 2, w - 20 + dot_r, 12 + dot_r), fill=accent[:3] + (200,))
    return img


def create_video_window(scene_type: str, t: float):
    w, h = 142, 100
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    base = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    bd = ImageDraw.Draw(base)
    for y in range(h):
        ratio = y / max(h - 1, 1)
        color = blend((7, 16, 32, 255), (15, 27, 55, 255), ratio)
        bd.line([(0, y), (w, y)], fill=color)
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius=18, fill=255)
    img = Image.composite(base, img, mask)
    d = ImageDraw.Draw(img)
    rounded(d, (0, 0, w - 1, h - 1), 18, outline=(255, 255, 255, 64), width=1)

    scan_x = int((math.sin(t * 1.8) * 0.5 + 0.5) * (w + 40)) - 20
    for i in range(-6, 7):
        alpha = max(0, 35 - abs(i) * 5)
        d.line([(scan_x + i, 6), (scan_x + i - 18, h - 6)], fill=(255, 255, 255, alpha))

    for idx in range(14):
        phase = t * 1.4 + idx * 0.6
        px = int((math.sin(phase * 1.2) * 0.45 + 0.5) * (w - 20)) + 10
        py = int((math.cos(phase * 0.9 + idx) * 0.35 + 0.5) * (h - 24)) + 12
        r = 2 + (idx % 2)
        color = ACCENTS[idx % len(ACCENTS)][:3] + (160,)
        d.ellipse((px - r, py - r, px + r, py + r), fill=color)

    if scene_type == 'title_card':
        cx, cy = 48, 52
        for ring in [18, 30, 42]:
            rr = ring + math.sin(t * 2.5 + ring) * 2.5
            d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), outline=(96, 165, 250, 110), width=1)
        d.line((86, 26, 128, 44), fill=(167, 139, 250, 160), width=2)
        d.line((86, 46, 126, 58), fill=(52, 211, 153, 160), width=2)
        d.line((86, 66, 118, 80), fill=(251, 191, 36, 160), width=2)
    elif scene_type == 'comparison_card':
        for i in range(5):
            bh = 12 + int((math.sin(t * 2 + i) * 0.5 + 0.5) * 28)
            x = 16 + i * 22
            d.rounded_rectangle((x, h - 16 - bh, x + 12, h - 16), radius=4, fill=(248, 113, 113, 180))
        for i in range(5):
            bh = 14 + int((math.cos(t * 2.1 + i) * 0.5 + 0.5) * 30)
            x = 88 + i * 10
            d.rounded_rectangle((x, h - 18 - bh, x + 8, h - 18), radius=4, fill=(52, 211, 153, 180))
    elif scene_type == 'data_card':
        for i in range(24):
            x = 8 + i * 6
            base_y = 58 + math.sin(t * 2.2 + i * 0.4) * 8
            d.line((x, base_y, x, h - 10), fill=(96, 165, 250, 120), width=1)
        d.line((10, 70, 40, 58, 70, 62, 102, 36, 130, 28), fill=(52, 211, 153, 210), width=3)
    elif scene_type == 'flow_chart':
        pts = [(20, 22), (42, 40), (68, 32), (92, 58), (116, 46)]
        visible = 2 + int((math.sin(t * 1.2) * 0.5 + 0.5) * 3)
        for i in range(len(pts) - 1):
            color = (96, 165, 250, 180 if i < visible else 60)
            d.line((pts[i], pts[i + 1]), fill=color, width=3)
        for i, (px, py) in enumerate(pts):
            r = 5 + int(1.5 * math.sin(t * 2 + i))
            color = (52, 211, 153, 220 if i < visible + 1 else 90)
            d.ellipse((px - r, py - r, px + r, py + r), fill=color)
    elif scene_type == 'mindmap_card':
        cx, cy = 72, 52
        d.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), fill=(52, 211, 153, 220))
        for i in range(6):
            ang = math.radians(i * 60 + t * 18)
            px = cx + math.cos(ang) * 32
            py = cy + math.sin(ang) * 24
            d.line((cx, cy, px, py), fill=(167, 139, 250, 120), width=2)
            d.ellipse((px - 5, py - 5, px + 5, py + 5), fill=ACCENTS[i][:3] + (210,))
    else:
        bar_w = 16
        for i in range(6):
            level = 18 + int((math.sin(t * 2.1 + i * 0.8) * 0.5 + 0.5) * 42)
            x = 16 + i * 20
            d.rounded_rectangle((x, h - 14 - level, x + bar_w, h - 14), radius=6, fill=ACCENTS[i][:3] + (180,))

    d.ellipse((12, 10, 18, 16), fill=(255, 95, 86, 220))
    d.ellipse((22, 10, 28, 16), fill=(255, 189, 46, 220))
    d.ellipse((32, 10, 38, 16), fill=(39, 201, 63, 220))
    return img


def compose_panel(scene, scene_type, local_t, scene_progress):
    base = Image.new('RGBA', (PANEL_W, PANEL_H), (0, 0, 0, 0))
    base.alpha_composite(create_shadow((PANEL_W, PANEL_H), blur_radius=24, alpha=120), (0, 0))
    base.alpha_composite(create_back_plate(scene_progress), (0, 0))
    base.alpha_composite(create_glass_panel(), (0, 0))
    d = ImageDraw.Draw(base)

    rounded(d, (18, 16, 76, 40), 12, fill=(52, 211, 153, 210))
    d.text((30, 22), 'AI', font=font(12, 'medium'), fill=WHITE)
    d.text((90, 22), '卡若式视频增强', font=font(12, 'medium'), fill=TEXT_SUB)
    base.alpha_composite(create_video_window(scene_type, local_t), (PANEL_W - 158, 18))

    if scene_type == 'title_card':
        question = scene['params']['question']
        subtitle = scene['params'].get('subtitle', '')
        typed_ratio = ease_out_cubic(min(1.0, local_t / 1.9))
        chars = max(1, int(len(question) * typed_ratio))
        q_text = question[:chars]
        draw_wrap(d, q_text, font(21, 'medium'), 230, 24, 74, WHITE)
        if typed_ratio < 1:
            cursor_x = 24 + min(230, int(typed_ratio * 230))
            d.text((cursor_x, 108), '▍', font=font(18, 'regular'), fill=BLUE)
        if local_t > 1.0:
            alpha = ease_out_cubic(min(1.0, (local_t - 1.0) / 1.0))
            d.text((24, 144), subtitle, font=font(14, 'regular'), fill=(TEXT_SUB[0], TEXT_SUB[1], TEXT_SUB[2], int(255 * alpha)))
        chip_texts = ['传统行业', '远程安装', '副业服务']
        for i, txt in enumerate(chip_texts):
            ct = max(0.0, min(1.0, (local_t - 1.4 - i * 0.18) / 0.5))
            if ct > 0:
                chip = create_chip(txt, ACCENTS[i], ct)
                base.alpha_composite(chip, (24 + i * 96, 270 - int((1 - ct) * 14)))
    elif scene_type == 'comparison_card':
        params = scene['params']
        d.text((22, 70), params['title'], font=font(15, 'medium'), fill=WHITE)
        rounded(d, (22, 102, 193, 286), 18, fill=(39, 19, 28, 200), outline=(248, 113, 113, 120), width=1)
        rounded(d, (205, 102, 396, 286), 18, fill=(18, 42, 31, 200), outline=(52, 211, 153, 120), width=1)
        d.text((36, 116), params['left_title'], font=font(13, 'medium'), fill=RED)
        d.text((220, 116), params['right_title'], font=font(13, 'medium'), fill=GREEN)
        for i, item in enumerate(params['left_items']):
            alpha = ease_out_cubic(min(1.0, max(0.0, (local_t - 0.4 - i * 0.15) / 0.5)))
            if alpha > 0:
                d.text((34 - int((1 - alpha) * 14), 148 + i * 34), f'✕ {item}', font=font(13, 'regular'), fill=(248, 113, 113, int(220 * alpha)))
        for i, item in enumerate(params['right_items']):
            alpha = ease_out_cubic(min(1.0, max(0.0, (local_t - 0.7 - i * 0.15) / 0.5)))
            if alpha > 0:
                d.text((220 + int((1 - alpha) * 14), 148 + i * 34), f'✓ {item}', font=font(13, 'regular'), fill=(52, 211, 153, int(220 * alpha)))
    elif scene_type == 'data_card':
        params = scene['params']
        d.text((22, 70), params['title'], font=font(15, 'medium'), fill=WHITE)
        positions = [(22, 102), (148, 102), (22, 196), (148, 196)]
        for i, item in enumerate(params['items']):
            card_t = ease_out_cubic(min(1.0, max(0.0, (local_t - 0.25 - i * 0.14) / 0.55)))
            if card_t <= 0:
                continue
            raw = str(item['number'])
            value = raw
            if '~' in raw:
                try:
                    lo, hi = raw.split('~')
                    lo_i, hi_i = int(lo), int(hi)
                    value = f"{int(lo_i * card_t)}~{int(hi_i * card_t)}"
                except Exception:
                    pass
            elif raw.endswith('万+'):
                try:
                    num = int(raw[:-2])
                    value = f"{max(1, int(num * card_t))}万+"
                except Exception:
                    pass
            elif raw.endswith('分钟'):
                try:
                    num = int(raw[:-2])
                    value = f"{max(1, int(num * card_t))}分钟"
                except Exception:
                    pass
            metric = create_metric_card(item['label'], value, item['desc'], ACCENTS[i], local_t)
            mx, my = positions[i]
            base.alpha_composite(metric, (mx, my - int((1 - card_t) * 10)))
    elif scene_type == 'flow_chart':
        params = scene['params']
        d.text((22, 70), params['title'], font=font(15, 'medium'), fill=WHITE)
        start_y = 112
        for i, step in enumerate(params['steps']):
            st = ease_out_cubic(min(1.0, max(0.0, (local_t - 0.18 - i * 0.18) / 0.55)))
            if st <= 0:
                continue
            y = start_y + i * 42
            accent = ACCENTS[i]
            cx = 38
            cy = y + 12
            d.ellipse((cx - 12, cy - 12, cx + 12, cy + 12), fill=(accent[0], accent[1], accent[2], 220))
            d.text((cx - 4, cy - 8), str(i + 1), font=font(12, 'medium'), fill=(255, 255, 255, int(255 * st)))
            d.text((64 + int((1 - st) * 18), y), step, font=font(14, 'regular'), fill=(TEXT[0], TEXT[1], TEXT[2], int(255 * st)))
            if i < len(params['steps']) - 1:
                for dy in range(22, 40, 5):
                    d.ellipse((37, y + dy, 39, y + dy + 2), fill=(255, 255, 255, 45))
    elif scene_type == 'mindmap_card':
        params = scene['params']
        cx, cy = 136, 192
        center_t = ease_out_cubic(min(1.0, local_t / 0.8))
        r = 34 + int(3 * math.sin(local_t * 2))
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(52, 211, 153, int(220 * center_t)))
        bb = font(14, 'medium').getbbox(params['center'])
        d.text((cx - (bb[2] - bb[0]) // 2, cy - 8), params['center'], font=font(14, 'medium'), fill=WHITE)
        branches = params['branches']
        for i, br in enumerate(branches):
            bt = ease_out_cubic(min(1.0, max(0.0, (local_t - 0.4 - i * 0.12) / 0.6)))
            if bt <= 0:
                continue
            ang = math.radians(-100 + i * 36)
            dist = 92 * bt
            bx = cx + int(math.cos(ang) * dist)
            by = cy + int(math.sin(ang) * dist)
            accent = ACCENTS[i]
            d.line((cx, cy, bx, by), fill=(accent[0], accent[1], accent[2], int(130 * bt)), width=2)
            ff = font(11, 'medium')
            bbox = ff.getbbox(br)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            rounded(d, (bx - tw // 2 - 8, by - th // 2 - 6, bx + tw // 2 + 8, by + th // 2 + 6), 10,
                    fill=(accent[0], accent[1], accent[2], 40), outline=(accent[0], accent[1], accent[2], 120), width=1)
            d.text((bx - tw // 2, by - th // 2), br, font=ff, fill=(accent[0], accent[1], accent[2], 255))
    else:
        params = scene['params']
        rounded(d, (22, 60, PANEL_W - 22, 114), 22, fill=(18, 27, 44, 220), outline=(96, 165, 250, 110), width=1)
        draw_wrap_center(d, params['headline'], font(21, 'medium'), PANEL_W - 80, 74, WHITE, PANEL_W)
        y = 132
        for i, item in enumerate(params['points']):
            alpha = ease_out_cubic(min(1.0, max(0.0, (local_t - 0.4 - i * 0.14) / 0.5)))
            if alpha <= 0:
                continue
            accent = ACCENTS[i]
            d.ellipse((30, y + i * 34 + 6, 38, y + i * 34 + 14), fill=(accent[0], accent[1], accent[2], int(220 * alpha)))
            d.text((48 + int((1 - alpha) * 12), y + i * 34), item, font=font(14, 'regular'), fill=(TEXT[0], TEXT[1], TEXT[2], int(255 * alpha)))
        cta_t = ease_out_cubic(min(1.0, max(0.0, (local_t - 1.2) / 0.5)))
        if cta_t > 0:
            rounded(d, (42, 286 - int((1 - cta_t) * 8), PANEL_W - 42, 316 - int((1 - cta_t) * 8)), 16,
                    fill=(52, 211, 153, int(220 * cta_t)))
            draw_center(d, params['cta'], font(13, 'medium'), 293 - int((1 - cta_t) * 8), WHITE, PANEL_W)

    chips = [('AI安装', BLUE), ('远程交付', PURPLE), ('可变现', GREEN)]
    for i, (txt, accent) in enumerate(chips):
        ct = create_chip(txt, accent, 0.96)
        base.alpha_composite(ct, (PANEL_W - 86 - i * 94, PANEL_H - 44))
    return base


def render_overlay_frame(scene, local_t):
    scene_progress = (local_t % 6.0) / 6.0
    panel = compose_panel(scene, scene['type'], local_t, scene_progress)
    intro = ease_out_cubic(min(1.0, local_t / 0.7))
    breath = 1 + math.sin(local_t * 1.4) * 0.012
    scale = (0.94 + intro * 0.06) * breath
    y_offset = int((1 - intro) * 20 + math.sin(local_t * 1.1) * 4)
    x_offset = int(math.sin(local_t * 0.7) * 2)
    panel_resized = panel.resize((int(PANEL_W * scale), int(PANEL_H * scale)), Image.LANCZOS)
    frame = Image.new('RGBA', (VW, VH), (0, 0, 0, 0))
    px = (VW - panel_resized.width) // 2 + x_offset
    py = PANEL_Y - (panel_resized.height - PANEL_H) // 2 + y_offset
    frame.alpha_composite(panel_resized, (px, py))
    return frame


DEFAULT_SCENES = [
    {'start': 0, 'end': 30, 'type': 'title_card',
     'params': {'question': '帮别人装AI，一单能挣多少钱？', 'subtitle': '传统行业也能做的AI副业'}},
    {'start': 30, 'end': 70, 'type': 'comparison_card',
     'params': {'title': '营销号 vs 真实情况',
                'left_title': '营销号', 'left_items': ['AI暴富神话', '零成本躺赚', '一夜翻身'],
                'right_title': '真实可做', 'right_items': ['帮装AI工具', '卖API接口', '远程安装服务']}},
    {'start': 70, 'end': 130, 'type': 'data_card',
     'params': {'title': '装AI服务 · 核心数据', 'items': [
         {'number': '300~1000', 'label': '元/单', 'desc': '远程安装AI工具'},
         {'number': '170万+', 'label': '淘宝月销最高', 'desc': '帮别人装AI的店铺'},
         {'number': '30分钟', 'label': '单次耗时', 'desc': '远程操作即可完成'},
         {'number': '全平台', 'label': '淘宝/闲鱼/Soul', 'desc': '多渠道接单'}]}},
    {'start': 130, 'end': 190, 'type': 'flow_chart',
     'params': {'title': '装AI赚钱 · 操作步骤',
                'steps': ['开淘宝/闲鱼店铺', '标题写清：AI安装服务', '客户下单 远程连接', '30分钟完成安装', '收款300~1000元']}},
    {'start': 190, 'end': 230, 'type': 'mindmap_card',
     'params': {'center': '装AI副业', 'branches': ['淘宝开店', '闲鱼挂单', 'Soul接客', '远程安装', 'Mac工具', '月入可观']}},
    {'start': 230, 'end': 245, 'type': 'summary_card',
     'params': {'headline': '赚钱没那么复杂',
                'points': ['帮人装AI 一单300~1000', '淘宝最高店月销170万+', '30分钟远程安装搞定', '开店+接单+装机=副业'],
                'cta': '关注了解更多AI副业'}},
]


def render_scene_video(scene, tmp_dir, idx):
    duration = float(scene['end'] - scene['start'])
    scene_dir = os.path.join(tmp_dir, f'scene_{idx:03d}')
    os.makedirs(scene_dir, exist_ok=True)
    frames = max(1, int(duration * FPS))
    concat_lines = []
    print(f"  [{idx+1}] {scene['type']} {scene['start']:.0f}s-{scene['end']:.0f}s ({frames} 帧)...", end='', flush=True)
    last_fp = None
    for i in range(frames):
        local_t = i / FPS
        frame = render_overlay_frame(scene, local_t)
        fp = os.path.join(scene_dir, f'f_{i:04d}.png')
        frame.save(fp, 'PNG')
        concat_lines.append(f"file '{fp}'")
        concat_lines.append(f'duration {1.0 / FPS:.4f}')
        last_fp = fp
    concat_lines.append(f"file '{last_fp}'")
    concat_path = os.path.join(scene_dir, 'concat.txt')
    with open(concat_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(concat_lines))
    mov_path = os.path.join(scene_dir, 'scene.mov')
    cmd = ['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_path, '-vf', 'fps=25,format=rgba', '-c:v', 'png', '-t', f'{duration:.3f}', mov_path]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f" ERR {result.stderr[-600:]}", flush=True)
        return None
    print(' ✓', flush=True)
    return {'path': mov_path, 'start': scene['start'], 'end': scene['end']}


def build_full_overlay(scene_videos, duration, tmp_dir):
    blank = Image.new('RGBA', (VW, VH), (0, 0, 0, 0))
    blank_path = os.path.join(tmp_dir, 'blank.png')
    blank.save(blank_path, 'PNG')
    concat_lines = []
    prev = 0.0
    for sv in scene_videos:
        if sv['start'] > prev + 0.04:
            gap = sv['start'] - prev
            concat_lines.append(f"file '{blank_path}'")
            concat_lines.append(f'duration {gap:.3f}')
        concat_lines.append(f"file '{sv['path']}'")
        prev = sv['end']
    if prev < duration:
        concat_lines.append(f"file '{blank_path}'")
        concat_lines.append(f'duration {duration - prev:.3f}')
    concat_lines.append(f"file '{blank_path}'")
    concat_path = os.path.join(tmp_dir, 'overlay_concat.txt')
    with open(concat_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(concat_lines))
    out_path = os.path.join(tmp_dir, 'overlay_full.mov')
    cmd = ['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_path, '-vf', 'fps=25,format=rgba', '-c:v', 'png', '-t', f'{duration:.3f}', out_path]
    print('  拼接完整叠加流...', end='', flush=True)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f" ERR {result.stderr[-800:]}", flush=True)
        return None
    mb = os.path.getsize(out_path) / 1024 / 1024
    print(f' ✓ ({mb:.0f}MB)', flush=True)
    return out_path


def compose_final(input_video, overlay_video, output_path, duration):
    cmd = [
        'ffmpeg', '-y', '-i', input_video, '-i', overlay_video,
        '-filter_complex', '[1:v]format=rgba[ov];[0:v][ov]overlay=0:0:format=auto:shortest=1[v]',
        '-map', '[v]', '-map', '0:a?',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
        '-c:a', 'aac', '-b:a', '128k', '-t', f'{duration:.3f}', '-movflags', '+faststart', output_path,
    ]
    print('  合成最终视频...', end='', flush=True)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f" ERR {result.stderr[-1200:]}", flush=True)
        return False
    mb = os.path.getsize(output_path) / 1024 / 1024
    print(f' ✓ ({mb:.1f}MB)', flush=True)
    return True


def get_duration(video_path):
    result = subprocess.run(['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', video_path], capture_output=True, text=True)
    return float(json.loads(result.stdout)['format']['duration'])


def main():
    parser = argparse.ArgumentParser(description='视觉增强 v5：立体苹果毛玻璃舞台')
    parser.add_argument('-i', '--input', required=True)
    parser.add_argument('-o', '--output', required=True)
    parser.add_argument('--scenes')
    args = parser.parse_args()
    scenes = DEFAULT_SCENES
    if args.scenes and os.path.exists(args.scenes):
        with open(args.scenes, 'r', encoding='utf-8') as f:
            scenes = json.load(f)
    duration = get_duration(args.input)
    for scene in scenes:
        scene['end'] = min(scene['end'], duration)
    os.makedirs(os.path.dirname(args.output) or '.', exist_ok=True)
    print(f"输入: {os.path.basename(args.input)} ({duration:.0f}s)")
    print(f"场景: {len(scenes)} · 立体双层毛玻璃舞台 · 全动态\n")
    with tempfile.TemporaryDirectory(prefix='ve5_') as tmp_dir:
        print('【1/3】生成每段动态舞台...', flush=True)
        scene_videos = []
        for idx, scene in enumerate(scenes):
            scene_video = render_scene_video(scene, tmp_dir, idx)
            if scene_video:
                scene_videos.append(scene_video)
        print(f"\n【2/3】拼接叠加流 ({len(scene_videos)} 段)...", flush=True)
        overlay = build_full_overlay(scene_videos, duration, tmp_dir)
        if not overlay:
            sys.exit(1)
        print('\n【3/3】合成最终视频...', flush=True)
        if not compose_final(args.input, overlay, args.output, duration):
            sys.exit(1)
    print(f"\n✅ 完成: {args.output}")


if __name__ == '__main__':
    main()
