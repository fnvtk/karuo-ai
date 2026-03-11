#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
视觉增强 v6：非固定结构的立体苹果毛玻璃舞台

设计原则：
1. 原视频完全不变，仅底部叠加动态舞台。
2. 每条视频自动派生独立风格：配色、窗口位置、芯片布局、信息结构都不同。
3. 强化黑色高级感、阴影、悬浮、玻璃高光与动态小视频窗。
4. 所有信息模块与文字均为动态生成，不使用固定平面模板。
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
    sys.exit('需要 Pillow: pip3 install Pillow')

SCRIPT_DIR = Path(__file__).resolve().parent
FONTS_DIR = SCRIPT_DIR.parent / 'fonts'
if not FONTS_DIR.exists():
    FONTS_DIR = Path('/Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/视频切片/fonts')

VW, VH = 498, 1080
PANEL_W, PANEL_H = 422, 340
PANEL_X = (VW - PANEL_W) // 2
PANEL_Y = VH - PANEL_H - 26
FPS = 8
CURRENT_VIDEO_SEED = 'default'
WHITE = (248, 250, 255, 255)
BLUE = (96, 165, 250, 255)
PURPLE = (167, 139, 250, 255)
GREEN = (52, 211, 153, 255)
GOLD = (251, 191, 36, 255)
ORANGE = (251, 146, 60, 255)
RED = (248, 113, 113, 255)
CYAN = (34, 211, 238, 255)

PALETTES = [
    {
        'name': 'obsidian-cyan',
        'glass_top': (18, 25, 40, 212),
        'glass_bottom': (10, 14, 28, 226),
        'back_a': (35, 58, 120, 92),
        'back_b': (24, 112, 168, 70),
        'title': (246, 249, 255, 255),
        'text': (223, 231, 244, 255),
        'sub': (160, 178, 205, 255),
        'muted': (103, 119, 148, 255),
        'accents': [(98, 182, 255, 255), (46, 211, 238, 255), (139, 92, 246, 255), (250, 204, 21, 255)]
    },
    {
        'name': 'midnight-violet',
        'glass_top': (28, 22, 46, 214),
        'glass_bottom': (14, 10, 26, 228),
        'back_a': (88, 54, 156, 90),
        'back_b': (44, 63, 113, 76),
        'title': (248, 247, 255, 255),
        'text': (233, 229, 248, 255),
        'sub': (184, 169, 214, 255),
        'muted': (118, 107, 144, 255),
        'accents': [(167, 139, 250, 255), (96, 165, 250, 255), (244, 114, 182, 255), (251, 191, 36, 255)]
    },
    {
        'name': 'graphite-gold',
        'glass_top': (24, 24, 30, 212),
        'glass_bottom': (10, 11, 16, 228),
        'back_a': (92, 71, 29, 86),
        'back_b': (46, 70, 115, 70),
        'title': (250, 249, 245, 255),
        'text': (235, 233, 225, 255),
        'sub': (187, 180, 160, 255),
        'muted': (123, 118, 102, 255),
        'accents': [(251, 191, 36, 255), (245, 158, 11, 255), (96, 165, 250, 255), (52, 211, 153, 255)]
    },
    {
        'name': 'ink-emerald',
        'glass_top': (16, 30, 28, 212),
        'glass_bottom': (9, 16, 18, 226),
        'back_a': (26, 95, 78, 90),
        'back_b': (34, 84, 131, 72),
        'title': (244, 252, 249, 255),
        'text': (218, 243, 236, 255),
        'sub': (151, 194, 183, 255),
        'muted': (103, 144, 136, 255),
        'accents': [(52, 211, 153, 255), (45, 212, 191, 255), (96, 165, 250, 255), (251, 191, 36, 255)]
    },
]


def font(size: int, weight='medium'):
    if isinstance(weight, bool):
        weight = 'bold' if weight else 'medium'
    mapping = {
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
    for path in mapping.get(weight, mapping['medium']):
        if path.exists():
            try:
                return ImageFont.truetype(str(path), size)
            except Exception:
                continue
    return ImageFont.load_default()


def ease_out(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def blend(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def hash_int(text: str) -> int:
    return int(hashlib.md5(text.encode('utf-8')).hexdigest()[:8], 16)


def build_profile(scene, idx: int):
    key = CURRENT_VIDEO_SEED + '|' + scene.get('type', '') + '|' + str(idx)
    seed = hash_int(key)
    palette = PALETTES[seed % len(PALETTES)]
    return {
        'seed': seed,
        'palette': palette,
        'window_variant': seed % 4,
        'chip_variant': (seed // 7) % 4,
        'content_variant': (seed // 13) % 3,
        'tag_variant': (seed // 17) % 3,
    }


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


def create_shadow(size, blur_radius=24, alpha=138):
    w, h = size
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((14, 20, w - 18, h - 4), radius=30, fill=(0, 0, 0, alpha))
    d.rounded_rectangle((30, 36, w - 34, h - 16), radius=26, fill=(10, 20, 40, int(alpha * 0.25)))
    return img.filter(ImageFilter.GaussianBlur(blur_radius))


def create_back_plate(profile, progress: float):
    pal = profile['palette']
    img = Image.new('RGBA', (PANEL_W, PANEL_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pulse = 0.78 + 0.22 * math.sin(progress * math.pi * 2.0)
    c1 = tuple(int(v * pulse) for v in pal['back_a'][:3]) + (pal['back_a'][3],)
    c2 = tuple(int(v * pulse) for v in pal['back_b'][:3]) + (pal['back_b'][3],)
    rounded(d, (18, 12, PANEL_W - 8, PANEL_H - 8), 30, fill=c1)
    rounded(d, (10, 26, PANEL_W - 24, PANEL_H - 20), 26, fill=c2)
    return img.filter(ImageFilter.GaussianBlur(1.5))


def create_glass_panel(profile):
    pal = profile['palette']
    img = Image.new('RGBA', (PANEL_W, PANEL_H), (0, 0, 0, 0))
    grad = Image.new('RGBA', (PANEL_W, PANEL_H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(PANEL_H):
        t = y / max(PANEL_H - 1, 1)
        gd.line([(0, y), (PANEL_W, y)], fill=blend(pal['glass_top'], pal['glass_bottom'], t))
    mask = Image.new('L', (PANEL_W, PANEL_H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, PANEL_W - 1, PANEL_H - 1), radius=30, fill=255)
    img = Image.composite(grad, img, mask)
    d = ImageDraw.Draw(img)
    rounded(d, (0, 0, PANEL_W - 1, PANEL_H - 1), 30, outline=(255, 255, 255, 72), width=1)
    rounded(d, (10, 12, PANEL_W - 10, PANEL_H - 10), 24, outline=(255, 255, 255, 24), width=1)
    for y in range(26):
        alpha = int(32 * (1 - y / 26))
        d.line([(24, y + 4), (PANEL_W - 24, y + 4)], fill=(255, 255, 255, alpha))
    return img


def create_chip(text, accent, fg, active=1.0):
    w = max(68, 22 + len(text) * 14)
    h = 34
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rounded(d, (0, 0, w - 1, h - 1), 17, fill=(20, 24, 38, int(192 * active)), outline=accent[:3] + (int(150 * active),), width=1)
    ff = font(13, 'medium')
    bbox = ff.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    d.text(((w - tw) // 2, (h - th) // 2 - 1), text, font=ff, fill=fg[:3] + (int(255 * active),))
    return img


def create_metric_card(title, value, subtitle, accent, profile, progress):
    pal = profile['palette']
    w, h = 118, 84
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rounded(d, (0, 0, w - 1, h - 1), 18, fill=(18, 24, 38, 220), outline=accent[:3] + (125,), width=1)
    d.rounded_rectangle((12, 14, 16, h - 14), radius=2, fill=accent[:3] + (230,))
    d.text((24, 12), title, font=font(11, 'medium'), fill=pal['sub'])
    d.text((24, 34), value, font=font(21, 'medium'), fill=accent)
    d.text((24, 60), subtitle, font=font(10, 'regular'), fill=pal['muted'])
    dot_r = 5 + int(2 * math.sin(progress * math.pi * 2))
    d.ellipse((w - 20 - dot_r, 12 - dot_r // 2, w - 20 + dot_r, 12 + dot_r), fill=accent[:3] + (200,))
    return img


def create_video_window(scene_type: str, t: float, profile):
    w, h = 142, 100
    pal = profile['palette']
    accents = pal['accents']
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    base = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    bd = ImageDraw.Draw(base)
    top_bg = tuple(max(0, c - 12) for c in pal['glass_top'][:3]) + (255,)
    bottom_bg = tuple(max(0, c - 8) for c in pal['glass_bottom'][:3]) + (255,)
    for y in range(h):
        ratio = y / max(h - 1, 1)
        bd.line([(0, y), (w, y)], fill=blend(top_bg, bottom_bg, ratio))
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius=18, fill=255)
    img = Image.composite(base, img, mask)
    d = ImageDraw.Draw(img)
    rounded(d, (0, 0, w - 1, h - 1), 18, outline=(255, 255, 255, 64), width=1)

    scan_x = int((math.sin(t * 1.7) * 0.5 + 0.5) * (w + 44)) - 22
    for i in range(-6, 7):
        alpha = max(0, 34 - abs(i) * 5)
        d.line([(scan_x + i, 6), (scan_x + i - 18, h - 6)], fill=(255, 255, 255, alpha))

    variant = profile['window_variant']
    if variant == 0:
        for idx in range(14):
            phase = t * 1.4 + idx * 0.6
            px = int((math.sin(phase * 1.2) * 0.45 + 0.5) * (w - 20)) + 10
            py = int((math.cos(phase * 0.9 + idx) * 0.35 + 0.5) * (h - 24)) + 12
            r = 2 + (idx % 2)
            color = accents[idx % len(accents)][:3] + (160,)
            d.ellipse((px - r, py - r, px + r, py + r), fill=color)
    elif variant == 1:
        for i in range(5):
            bh = 10 + int((math.sin(t * 2 + i) * 0.5 + 0.5) * 30)
            x = 16 + i * 22
            d.rounded_rectangle((x, h - 16 - bh, x + 12, h - 16), radius=4, fill=accents[i % len(accents)][:3] + (190,))
        d.line((12, 68, 42, 54, 70, 60, 100, 32, 132, 24), fill=accents[1][:3] + (220,), width=3)
    elif variant == 2:
        pts = [(20, 22), (42, 40), (68, 32), (92, 58), (116, 46)]
        visible = 2 + int((math.sin(t * 1.1) * 0.5 + 0.5) * 3)
        for i in range(len(pts) - 1):
            c = accents[i % len(accents)][:3] + (180 if i < visible else 60,)
            d.line((pts[i], pts[i + 1]), fill=c, width=3)
        for i, (px, py) in enumerate(pts):
            r = 5 + int(1.4 * math.sin(t * 2 + i))
            color = accents[(i + 1) % len(accents)][:3] + (220 if i < visible + 1 else 90,)
            d.ellipse((px - r, py - r, px + r, py + r), fill=color)
    else:
        cx, cy = 72, 52
        d.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), fill=accents[0][:3] + (220,))
        for i in range(6):
            ang = math.radians(i * 60 + t * 18)
            px = cx + math.cos(ang) * 32
            py = cy + math.sin(ang) * 24
            d.line((cx, cy, px, py), fill=accents[(i + 1) % len(accents)][:3] + (120,), width=2)
            d.ellipse((px - 5, py - 5, px + 5, py + 5), fill=accents[i % len(accents)][:3] + (210,))

    d.ellipse((12, 10, 18, 16), fill=(255, 95, 86, 220))
    d.ellipse((22, 10, 28, 16), fill=(255, 189, 46, 220))
    d.ellipse((32, 10, 38, 16), fill=(39, 201, 63, 220))
    return img


def place_video_window(base, window_img, profile):
    positions = [
        (PANEL_W - 158, 18),
        (22, 44),
        (PANEL_W - 158, 124),
        (140, 18),
    ]
    base.alpha_composite(window_img, positions[profile['window_variant'] % len(positions)])


def place_chips(base, profile, chip_specs):
    variant = profile['chip_variant']
    if variant == 0:
        coords = [(PANEL_W - 88 - i * 92, PANEL_H - 44) for i in range(len(chip_specs))]
    elif variant == 1:
        coords = [(22 + i * 94, PANEL_H - 44) for i in range(len(chip_specs))]
    elif variant == 2:
        coords = [(PANEL_W - 110, PANEL_H - 46 - i * 40) for i in range(len(chip_specs))]
    else:
        coords = [(24 + i * 82, PANEL_H - 50 - (i % 2) * 12) for i in range(len(chip_specs))]
    for (txt, accent, fg), (x, y) in zip(chip_specs, coords):
        chip = create_chip(txt, accent, fg, 0.96)
        base.alpha_composite(chip, (x, y))


def compose_panel(scene, scene_type, local_t, scene_progress, profile):
    pal = profile['palette']
    accents = pal['accents']
    base = Image.new('RGBA', (PANEL_W, PANEL_H), (0, 0, 0, 0))
    base.alpha_composite(create_shadow((PANEL_W, PANEL_H), blur_radius=26, alpha=142), (0, 0))
    base.alpha_composite(create_back_plate(profile, scene_progress), (0, 0))
    base.alpha_composite(create_glass_panel(profile), (0, 0))
    d = ImageDraw.Draw(base)

    # 顶部标签结构变化
    tag_mode = profile['tag_variant']
    if tag_mode == 0:
        rounded(d, (18, 16, 76, 40), 12, fill=accents[2][:3] + (210,))
        d.text((30, 22), 'AI', font=font(12, 'medium'), fill=WHITE)
        d.text((90, 22), '卡若式视频增强', font=font(12, 'regular'), fill=pal['sub'])
    elif tag_mode == 1:
        rounded(d, (18, 16, 108, 40), 12, fill=(255, 255, 255, 20), outline=accents[0][:3] + (120,), width=1)
        d.text((30, 22), 'DYNAMIC UI', font=font(11, 'medium'), fill=pal['text'])
        d.text((130, 22), pal['name'], font=font(11, 'regular'), fill=pal['muted'])
    else:
        rounded(d, (18, 16, 84, 40), 12, fill=(20, 24, 38, 190), outline=accents[1][:3] + (120,), width=1)
        d.text((28, 22), 'FLOW', font=font(12, 'medium'), fill=pal['text'])
        rounded(d, (94, 16, 152, 40), 12, fill=(255, 255, 255, 15), outline=(255, 255, 255, 30), width=1)
        d.text((109, 22), 'AUTO', font=font(12, 'medium'), fill=pal['sub'])

    place_video_window(base, create_video_window(scene_type, local_t, profile), profile)

    variant = profile['content_variant']
    if scene_type == 'title_card':
        question = scene['params']['question']
        subtitle = scene['params'].get('subtitle', '')
        typed_ratio = ease_out(min(1.0, local_t / 1.8))
        chars = max(1, int(len(question) * typed_ratio))
        q_text = question[:chars]
        qx = 24 if variant != 1 else 34
        qy = 74 if variant == 0 else 86
        draw_wrap(d, q_text, font(21, 'medium'), 238, qx, qy, pal['title'])
        if typed_ratio < 1:
            cursor_x = qx + min(238, int(typed_ratio * 220))
            d.text((cursor_x, qy + 36), '▍', font=font(16, 'regular'), fill=accents[0])
        if local_t > 1.0:
            alpha = ease_out(min(1.0, (local_t - 1.0) / 0.9))
            d.text((qx, qy + 72), subtitle, font=font(13, 'regular'), fill=(pal['sub'][0], pal['sub'][1], pal['sub'][2], int(255 * alpha)))
        chip_texts = ['全平台', '自动承接', '后端变现'] if '发视频' in subtitle or '全链路' in subtitle else ['传统行业', '远程安装', '副业服务']
        chip_specs = [(txt, accents[i % len(accents)], pal['title']) for i, txt in enumerate(chip_texts)]
        place_chips(base, profile, chip_specs)
    elif scene_type == 'comparison_card':
        params = scene['params']
        d.text((22, 70), params['title'], font=font(15, 'medium'), fill=pal['title'])
        if variant == 0:
            left_box, right_box = (22, 102, 193, 286), (205, 102, 396, 286)
        elif variant == 1:
            left_box, right_box = (22, 118, 188, 292), (194, 94, 396, 278)
        else:
            left_box, right_box = (22, 104, 210, 270), (186, 128, 396, 294)
        rounded(d, left_box, 18, fill=(39, 19, 28, 200), outline=(248, 113, 113, 120), width=1)
        rounded(d, right_box, 18, fill=(18, 42, 31, 200), outline=(52, 211, 153, 120), width=1)
        d.text((left_box[0] + 14, left_box[1] + 14), params['left_title'], font=font(13, 'medium'), fill=RED)
        d.text((right_box[0] + 14, right_box[1] + 14), params['right_title'], font=font(13, 'medium'), fill=GREEN)
        for i, item in enumerate(params['left_items']):
            alpha = ease_out(min(1.0, max(0.0, (local_t - 0.35 - i * 0.15) / 0.5)))
            if alpha > 0:
                y = left_box[1] + 46 + i * 34
                d.text((left_box[0] + 14 - int((1 - alpha) * 14), y), f'✕ {item}', font=font(13, 'regular'), fill=(248, 113, 113, int(220 * alpha)))
        for i, item in enumerate(params['right_items']):
            alpha = ease_out(min(1.0, max(0.0, (local_t - 0.65 - i * 0.15) / 0.5)))
            if alpha > 0:
                y = right_box[1] + 46 + i * 34
                d.text((right_box[0] + 14 + int((1 - alpha) * 14), y), f'✓ {item}', font=font(13, 'regular'), fill=(52, 211, 153, int(220 * alpha)))
    elif scene_type == 'data_card':
        params = scene['params']
        d.text((22, 70), params['title'], font=font(15, 'medium'), fill=pal['title'])
        if variant == 0:
            positions = [(22, 102), (148, 102), (22, 196), (148, 196)]
        elif variant == 1:
            positions = [(22, 110), (148, 94), (22, 204), (148, 188)]
        else:
            positions = [(30, 104), (164, 112), (22, 202), (156, 194)]
        for i, item in enumerate(params['items']):
            card_t = ease_out(min(1.0, max(0.0, (local_t - 0.22 - i * 0.12) / 0.52)))
            if card_t <= 0:
                continue
            raw = str(item['number'])
            value = raw
            if '~' in raw:
                try:
                    lo, hi = raw.split('~')
                    value = f"{int(int(lo) * card_t)}~{int(int(hi) * card_t)}"
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
            metric = create_metric_card(item['label'], value, item['desc'], accents[i % len(accents)], profile, local_t)
            mx, my = positions[i]
            base.alpha_composite(metric, (mx, my - int((1 - card_t) * 10)))
    elif scene_type == 'flow_chart':
        params = scene['params']
        d.text((22, 70), params['title'], font=font(15, 'medium'), fill=pal['title'])
        start_y = 112 if variant != 2 else 102
        step_gap = 42 if variant == 0 else 38
        for i, step in enumerate(params['steps']):
            st = ease_out(min(1.0, max(0.0, (local_t - 0.16 - i * 0.17) / 0.52)))
            if st <= 0:
                continue
            y = start_y + i * step_gap
            accent = accents[i % len(accents)]
            cx = 38 if variant != 1 else 54
            cy = y + 12
            d.ellipse((cx - 12, cy - 12, cx + 12, cy + 12), fill=accent[:3] + (220,))
            d.text((cx - 4, cy - 8), str(i + 1), font=font(12, 'medium'), fill=(255, 255, 255, int(255 * st)))
            d.text((cx + 26 + int((1 - st) * 16), y), step, font=font(14, 'regular'), fill=(pal['text'][0], pal['text'][1], pal['text'][2], int(255 * st)))
            if i < len(params['steps']) - 1:
                for dy in range(22, step_gap - 2, 5):
                    d.ellipse((cx - 1, y + dy, cx + 1, y + dy + 2), fill=(255, 255, 255, 46))
    elif scene_type == 'mindmap_card':
        params = scene['params']
        cx, cy = (150, 188) if variant == 0 else ((124, 200) if variant == 1 else (140, 178))
        center_t = ease_out(min(1.0, local_t / 0.8))
        r = 32 + int(4 * math.sin(local_t * 2))
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=accents[2][:3] + (int(220 * center_t),))
        bb = font(14, 'medium').getbbox(params['center'])
        d.text((cx - (bb[2] - bb[0]) // 2, cy - 8), params['center'], font=font(14, 'medium'), fill=WHITE)
        branches = params['branches']
        angle_step = 42 if variant == 0 else (34 if variant == 1 else 48)
        start_angle = -100 if variant != 2 else -120
        for i, br in enumerate(branches):
            bt = ease_out(min(1.0, max(0.0, (local_t - 0.36 - i * 0.11) / 0.56)))
            if bt <= 0:
                continue
            ang = math.radians(start_angle + i * angle_step)
            dist = 92 * bt
            bx = cx + int(math.cos(ang) * dist)
            by = cy + int(math.sin(ang) * dist)
            accent = accents[i % len(accents)]
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
        rounded(d, (22, 60, PANEL_W - 22, 114), 22, fill=(18, 27, 44, 220), outline=accents[0][:3] + (110,), width=1)
        draw_wrap_center(d, params['headline'], font(21, 'medium'), PANEL_W - 80, 74, pal['title'], PANEL_W)
        y = 132
        for i, item in enumerate(params['points']):
            alpha = ease_out(min(1.0, max(0.0, (local_t - 0.35 - i * 0.13) / 0.48)))
            if alpha <= 0:
                continue
            accent = accents[i % len(accents)]
            d.ellipse((30, y + i * 34 + 6, 38, y + i * 34 + 14), fill=(accent[0], accent[1], accent[2], int(220 * alpha)))
            d.text((48 + int((1 - alpha) * 12), y + i * 34), item, font=font(14, 'regular'), fill=(pal['text'][0], pal['text'][1], pal['text'][2], int(255 * alpha)))
        cta_t = ease_out(min(1.0, max(0.0, (local_t - 1.1) / 0.45)))
        if cta_t > 0:
            rounded(d, (42, 286 - int((1 - cta_t) * 8), PANEL_W - 42, 316 - int((1 - cta_t) * 8)), 16, fill=accents[2][:3] + (int(220 * cta_t),))
            draw_center(d, params['cta'], font(13, 'medium'), 293 - int((1 - cta_t) * 8), WHITE, PANEL_W)

    chip_specs = [
        ('内容引擎', accents[0], pal['title']),
        ('自动分发', accents[1], pal['title']),
        ('后端承接', accents[2], pal['title']),
    ]
    if '全链路' in json.dumps(scene.get('params', {}), ensure_ascii=False):
        chip_specs = [('全平台', accents[0], pal['title']), ('小程序', accents[1], pal['title']), ('变现链路', accents[2], pal['title'])]
    place_chips(base, profile, chip_specs)
    return base


def render_overlay_frame(scene, local_t, profile):
    scene_progress = (local_t % 6.0) / 6.0
    panel = compose_panel(scene, scene['type'], local_t, scene_progress, profile)
    intro = ease_out(min(1.0, local_t / 0.65))
    breath = 1 + math.sin(local_t * 1.35) * 0.013
    scale = (0.935 + intro * 0.07) * breath
    y_offset = int((1 - intro) * 18 + math.sin(local_t * 1.05) * 5)
    x_offset = int(math.sin(local_t * 0.75) * 3)
    panel_resized = panel.resize((int(PANEL_W * scale), int(PANEL_H * scale)), Image.LANCZOS)
    frame = Image.new('RGBA', (VW, VH), (0, 0, 0, 0))
    px = (VW - panel_resized.width) // 2 + x_offset
    py = PANEL_Y - (panel_resized.height - PANEL_H) // 2 + y_offset
    frame.alpha_composite(panel_resized, (px, py))
    return frame


DEFAULT_SCENES = [
    {'start': 0, 'end': 30, 'type': 'title_card', 'params': {'question': '帮别人装AI，一单能挣多少钱？', 'subtitle': '传统行业也能做的AI副业'}},
    {'start': 30, 'end': 70, 'type': 'comparison_card', 'params': {'title': '营销号 vs 真实情况', 'left_title': '营销号', 'left_items': ['AI暴富神话', '零成本躺赚', '一夜翻身'], 'right_title': '真实可做', 'right_items': ['帮装AI工具', '卖API接口', '远程安装服务']}},
    {'start': 70, 'end': 130, 'type': 'data_card', 'params': {'title': '装AI服务 · 核心数据', 'items': [{'number': '300~1000', 'label': '元/单', 'desc': '远程安装AI工具'}, {'number': '170万+', 'label': '淘宝月销最高', 'desc': '帮别人装AI的店铺'}, {'number': '30分钟', 'label': '单次耗时', 'desc': '远程操作即可完成'}, {'number': '全平台', 'label': '淘宝/闲鱼/Soul', 'desc': '多渠道接单'}]}},
    {'start': 130, 'end': 190, 'type': 'flow_chart', 'params': {'title': '装AI赚钱 · 操作步骤', 'steps': ['开淘宝/闲鱼店铺', '标题写清：AI安装服务', '客户下单 远程连接', '30分钟完成安装', '收款300~1000元']}},
    {'start': 190, 'end': 230, 'type': 'mindmap_card', 'params': {'center': '装AI副业', 'branches': ['淘宝开店', '闲鱼挂单', 'Soul接客', '远程安装', 'Mac工具', '月入可观']}},
    {'start': 230, 'end': 245, 'type': 'summary_card', 'params': {'headline': '赚钱没那么复杂', 'points': ['帮人装AI 一单300~1000', '淘宝最高店月销170万+', '30分钟远程安装搞定', '开店+接单+装机=副业'], 'cta': '关注了解更多AI副业'}},
]


def render_scene_video(scene, tmp_dir, idx):
    duration = float(scene['end'] - scene['start'])
    scene_dir = os.path.join(tmp_dir, f'scene_{idx:03d}')
    os.makedirs(scene_dir, exist_ok=True)
    frames = max(1, int(duration * FPS))
    concat_lines = []
    profile = build_profile(scene, idx)
    print(f"  [{idx+1}] {scene['type']} {scene['start']:.0f}s-{scene['end']:.0f}s ({frames} 帧, {profile['palette']['name']})...", end='', flush=True)
    last_fp = None
    for i in range(frames):
        local_t = i / FPS
        frame = render_overlay_frame(scene, local_t, profile)
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
    cmd = ['ffmpeg', '-y', '-i', input_video, '-i', overlay_video, '-filter_complex', '[1:v]format=rgba[ov];[0:v][ov]overlay=0:0:format=auto:shortest=1[v]', '-map', '[v]', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-c:a', 'aac', '-b:a', '128k', '-t', f'{duration:.3f}', '-movflags', '+faststart', output_path]
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
    global CURRENT_VIDEO_SEED
    parser = argparse.ArgumentParser(description='视觉增强 v6：非固定结构高级玻璃舞台')
    parser.add_argument('-i', '--input', required=True)
    parser.add_argument('-o', '--output', required=True)
    parser.add_argument('--scenes')
    args = parser.parse_args()
    CURRENT_VIDEO_SEED = Path(args.input).stem
    scenes = DEFAULT_SCENES
    if args.scenes and os.path.exists(args.scenes):
        with open(args.scenes, 'r', encoding='utf-8') as f:
            scenes = json.load(f)
    duration = get_duration(args.input)
    for scene in scenes:
        scene['end'] = min(scene['end'], duration)
    os.makedirs(os.path.dirname(args.output) or '.', exist_ok=True)
    print(f"输入: {os.path.basename(args.input)} ({duration:.0f}s)")
    print(f"场景: {len(scenes)} · 非固定结构 · 每视频独立风格\n")
    with tempfile.TemporaryDirectory(prefix='ve6_') as tmp_dir:
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
