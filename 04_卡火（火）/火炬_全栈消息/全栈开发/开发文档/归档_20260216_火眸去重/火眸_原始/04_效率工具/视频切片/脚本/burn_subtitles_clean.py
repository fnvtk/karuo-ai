#!/usr/bin/env python3
"""
视频字幕烧录 Clean v4.0
特点：
1. 思源黑体（抖音最火字体）
2. 无阴影设计 - 更清爽
3. 关键词高亮（金黄色）
4. 标题贴片（渐变+毛玻璃）
5. 字幕背景条采用渐变效果

使用：
python3 burn_subtitles_clean.py --input video.mp4 --srt subtitle.srt --output output.mp4
"""

import subprocess
import os
import re
import json
import argparse
import tempfile
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ============ 配置 ============

SKILL_DIR = Path(__file__).parent.parent
FONTS_DIR = SKILL_DIR / "fonts"

# 字体配置
FONT_TITLE = str(FONTS_DIR / "SourceHanSansSC-Heavy.otf")
FONT_SUBTITLE = str(FONTS_DIR / "SourceHanSansSC-Bold.otf")
FONT_CONTENT = str(FONTS_DIR / "SourceHanSansSC-Bold.otf")  # 用Bold更醒目

FALLBACK_FONTS = [
    str(FONTS_DIR / "NotoSansCJK-Bold.ttc"),
    "/System/Library/Fonts/STHeiti Medium.ttc",
]

# 样式配置（Clean风格 - 无阴影）
STYLE = {
    'title': {
        'font_size': 80,
        'color': (255, 255, 255),
        'outline_color': (40, 40, 80),  # 深蓝紫描边
        'outline_width': 5,
        'glow_color': (100, 100, 200, 80),  # 柔和光晕
    },
    'subtitle': {
        'font_size': 52,
        'color': (255, 220, 100),  # 暖黄色
        'outline_color': (60, 40, 20),  # 深棕描边
        'outline_width': 3,
    },
    'content': {
        'font_size': 48,  # 适中大小
        'color': (255, 255, 255),
        'outline_color': (30, 30, 30),  # 深灰描边（不是纯黑）
        'outline_width': 3,
        'bg_gradient': [(20, 20, 40, 200), (40, 20, 60, 180)],  # 渐变背景
        'bg_padding': 18,
        'bg_radius': 12,
        'margin_bottom': 80,
    },
    'keyword': {
        'color': (255, 215, 0),  # 金黄色
        'glow': True,
    },
    'title_card': {
        'bg_colors': [(25, 25, 50), (50, 30, 70)],  # 深蓝紫渐变
        'blur_radius': 25,
        'overlay_alpha': 180,
        'duration': 2.5,
        'decoration': True,  # 添加装饰元素
    }
}

# 关键词
KEYWORDS = [
    '100万', '30万', '50万', '10万', '5万', '1万',
    '私域', 'AI', '自动化', '矩阵', 'SOP', 'IP',
    '获客', '变现', '分润', '放量', '转化', '复购',
    '存客宝', '抖音', '公众号', '微信群', '微信',
    '爆款', '裂变', '成交', '引流', '标准化',
    '接口', '对接', '小程序', '分销', '功能',
    '产研', '开发', '迭代', '上线', '测试',
]

# ============ 工具函数 ============

def get_font(font_path, size):
    paths = [font_path] + FALLBACK_FONTS
    for path in paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except:
                continue
    return ImageFont.load_default()

def get_text_bbox(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]

def draw_text_clean(draw, pos, text, font, color, outline_color=None, outline_width=0):
    """绘制清爽风格文字（无阴影）"""
    x, y = pos
    
    # 只绘制描边+主体
    if outline_color and outline_width > 0:
        # 8方向描边
        for angle in range(0, 360, 45):
            import math
            dx = int(outline_width * math.cos(math.radians(angle)))
            dy = int(outline_width * math.sin(math.radians(angle)))
            draw.text((x + dx, y + dy), text, font=font, fill=outline_color)
    
    # 主体文字
    draw.text((x, y), text, font=font, fill=color)

def create_gradient_rect(draw, rect, colors, radius=0):
    """创建渐变矩形"""
    x1, y1, x2, y2 = rect
    height = y2 - y1
    
    # 简单的垂直渐变
    for i in range(int(height)):
        ratio = i / height
        r = int(colors[0][0] * (1 - ratio) + colors[1][0] * ratio)
        g = int(colors[0][1] * (1 - ratio) + colors[1][1] * ratio)
        b = int(colors[0][2] * (1 - ratio) + colors[1][2] * ratio)
        a = int(colors[0][3] * (1 - ratio) + colors[1][3] * ratio)
        draw.line([(x1, y1 + i), (x2, y1 + i)], fill=(r, g, b, a))

def highlight_keywords(text, keywords):
    highlights = []
    for keyword in keywords:
        start = 0
        while True:
            pos = text.find(keyword, start)
            if pos == -1:
                break
            highlights.append((pos, pos + len(keyword), keyword))
            start = pos + 1
    return sorted(highlights, key=lambda x: x[0])

def time_to_seconds(time_str):
    time_str = time_str.replace(',', '.')
    parts = time_str.split(':')
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    return 0

def parse_srt(srt_path):
    with open(srt_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    pattern = r'(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n(.*?)(?=\n\n|\Z)'
    matches = re.findall(pattern, content, re.DOTALL)
    
    subtitles = []
    for match in matches:
        subtitles.append({
            'index': int(match[0]),
            'start': time_to_seconds(match[1]),
            'end': time_to_seconds(match[2]),
            'text': match[3].strip()
        })
    return subtitles

def get_video_info(video_path):
    cmd = [
        'ffprobe', '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,duration',
        '-of', 'json', video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    info = json.loads(result.stdout)
    stream = info['streams'][0]
    return {
        'width': int(stream.get('width', 1920)),
        'height': int(stream.get('height', 1080)),
    }

# ============ 图片生成 ============

def create_title_card(title, subtitle, width, height, output_path, video_path=None):
    """创建标题贴片（渐变+毛玻璃+装饰）"""
    
    style = STYLE['title_card']
    
    # 背景
    if video_path and os.path.exists(video_path):
        temp_frame = output_path.replace('.png', '_frame.jpg')
        subprocess.run([
            'ffmpeg', '-y', '-ss', '1', '-i', video_path,
            '-vframes', '1', '-q:v', '2', temp_frame
        ], capture_output=True)
        
        if os.path.exists(temp_frame):
            bg = Image.open(temp_frame).resize((width, height))
            bg = bg.filter(ImageFilter.GaussianBlur(radius=style['blur_radius']))
            os.remove(temp_frame)
        else:
            bg = Image.new('RGB', (width, height), style['bg_colors'][0])
    else:
        bg = Image.new('RGB', (width, height), style['bg_colors'][0])
    
    # 叠加层
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, style['overlay_alpha']))
    bg = bg.convert('RGBA')
    img = Image.alpha_composite(bg, overlay)
    
    draw = ImageDraw.Draw(img)
    
    # 装饰元素（顶部和底部渐变条）
    if style['decoration']:
        # 顶部装饰条
        for i in range(5):
            alpha = 100 - i * 20
            draw.rectangle([0, i*2, width, i*2+2], fill=(255, 215, 0, alpha))
        # 底部装饰条
        for i in range(5):
            alpha = 100 - i * 20
            draw.rectangle([0, height - i*2 - 2, width, height - i*2], fill=(255, 215, 0, alpha))
    
    # 标题
    title_style = STYLE['title']
    title_font = get_font(FONT_TITLE, title_style['font_size'])
    title_w, title_h = get_text_bbox(draw, title, title_font)
    title_x = (width - title_w) // 2
    title_y = height // 3
    
    draw_text_clean(
        draw, (title_x, title_y), title, title_font,
        color=title_style['color'],
        outline_color=title_style['outline_color'],
        outline_width=title_style['outline_width']
    )
    
    # 副标题
    if subtitle:
        sub_style = STYLE['subtitle']
        sub_font = get_font(FONT_SUBTITLE, sub_style['font_size'])
        sub_w, sub_h = get_text_bbox(draw, subtitle, sub_font)
        sub_x = (width - sub_w) // 2
        sub_y = title_y + title_h + 25
        
        draw_text_clean(
            draw, (sub_x, sub_y), subtitle, sub_font,
            color=sub_style['color'],
            outline_color=sub_style['outline_color'],
            outline_width=sub_style['outline_width']
        )
        
        # 装饰线
        line_y = sub_y + sub_h + 20
        line_w = max(title_w, sub_w) // 2
        line_x = (width - line_w) // 2
        
        # 渐变装饰线
        for i, offset in enumerate(range(-2, 3)):
            alpha = 200 - abs(offset) * 50
            draw.rectangle([line_x, line_y + offset, line_x + line_w, line_y + offset + 1], 
                          fill=(255, 215, 0, alpha))
    
    img.save(output_path, 'PNG')
    return output_path

def create_subtitle_image(text, width, height, output_path):
    """创建字幕图片（渐变背景+关键词高亮+无阴影）"""
    
    style = STYLE['content']
    
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    font = get_font(FONT_CONTENT, style['font_size'])
    text_w, text_h = get_text_bbox(draw, text, font)
    base_x = (width - text_w) // 2
    base_y = height - text_h - style['margin_bottom']
    
    # 渐变背景条
    padding = style['bg_padding']
    bg_rect = [
        base_x - padding - 10,
        base_y - padding,
        base_x + text_w + padding + 10,
        base_y + text_h + padding
    ]
    
    # 圆角渐变背景
    bg_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg_layer)
    bg_draw.rounded_rectangle(bg_rect, radius=style['bg_radius'], 
                              fill=style['bg_gradient'][0])
    img = Image.alpha_composite(img, bg_layer)
    draw = ImageDraw.Draw(img)
    
    # 识别关键词
    highlights = highlight_keywords(text, KEYWORDS)
    
    # 逐字符绘制
    current_x = base_x
    char_idx = 0
    
    while char_idx < len(text):
        in_keyword = False
        keyword_end = char_idx
        for start, end, kw in highlights:
            if start <= char_idx < end:
                in_keyword = True
                keyword_end = end
                break
        
        if in_keyword:
            keyword_text = text[char_idx:keyword_end]
            draw_text_clean(
                draw, (current_x, base_y), keyword_text, font,
                color=STYLE['keyword']['color'],
                outline_color=style['outline_color'],
                outline_width=style['outline_width']
            )
            kw_w, _ = get_text_bbox(draw, keyword_text, font)
            current_x += kw_w
            char_idx = keyword_end
        else:
            char = text[char_idx]
            draw_text_clean(
                draw, (current_x, base_y), char, font,
                color=style['color'],
                outline_color=style['outline_color'],
                outline_width=style['outline_width']
            )
            char_w, _ = get_text_bbox(draw, char, font)
            current_x += char_w
            char_idx += 1
    
    img.save(output_path, 'PNG')
    return output_path

# ============ 视频处理 ============

def burn_subtitles(video_path, srt_path, output_path, title=None, subtitle=None):
    """烧录字幕到视频"""
    
    print(f"\n处理: {os.path.basename(video_path)}")
    
    video_info = get_video_info(video_path)
    width, height = video_info['width'], video_info['height']
    print(f"  分辨率: {width}x{height}")
    
    temp_dir = tempfile.mkdtemp(prefix='sub_clean_')
    
    try:
        subtitles = parse_srt(srt_path)
        
        # 过滤无效字幕
        valid_subs = [s for s in subtitles 
                     if len(s['text']) > 1 
                     and not s['text'].startswith('字幕')
                     and s['text'] not in ['我們在這段時間中', '希望大家能夠在這段時間中', '好好地享受一下']]
        
        title_subs = [s for s in valid_subs if s['text'].startswith('【')]
        content_subs = [s for s in valid_subs 
                       if not s['text'].startswith('【') and s['start'] > 2.5]
        
        # 提取标题
        if not title:
            for sub in valid_subs[:5]:
                if sub['text'].startswith('【'):
                    title = sub['text'].strip('【】')
                    break
            if not title:
                title = "产研团队会议"
        
        if not subtitle:
            subtitle = "2026年1月21日"
        
        print(f"  标题: {title}")
        print(f"  有效字幕: {len(content_subs)} 条")
        
        # 生成标题贴片
        title_img = os.path.join(temp_dir, 'title.png')
        create_title_card(title, subtitle, width, height, title_img, video_path)
        print(f"  ✓ 标题贴片")
        
        # 生成字幕图片
        sub_images = []
        for i, sub in enumerate(content_subs[:100]):  # 限制100条
            img_path = os.path.join(temp_dir, f'sub_{i:04d}.png')
            create_subtitle_image(sub['text'], width, height, img_path)
            sub_images.append({
                'path': img_path,
                'start': sub['start'],
                'end': sub['end']
            })
        print(f"  ✓ 字幕图片 ({len(sub_images)} 张)")
        
        # 烧录
        current_video = video_path
        
        # 标题
        title_output = os.path.join(temp_dir, 'with_title.mp4')
        title_duration = STYLE['title_card']['duration']
        
        cmd = [
            'ffmpeg', '-y',
            '-i', current_video, '-i', title_img,
            '-filter_complex', f"[0:v][1:v]overlay=0:0:enable='lt(t,{title_duration})'[v]",
            '-map', '[v]', '-map', '0:a',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
            '-c:a', 'copy', title_output
        ]
        subprocess.run(cmd, capture_output=True)
        
        if os.path.exists(title_output):
            current_video = title_output
        print(f"  ✓ 标题烧录")
        
        # 分批烧录字幕
        batch_size = 10
        for batch_idx in range(0, len(sub_images), batch_size):
            batch = sub_images[batch_idx:batch_idx + batch_size]
            
            inputs = ['-i', current_video]
            for img in batch:
                inputs.extend(['-i', img['path']])
            
            filters = []
            last_output = '0:v'
            
            for i, img in enumerate(batch):
                input_idx = i + 1
                output_name = f'v{i}'
                enable = f"between(t,{img['start']:.3f},{img['end']:.3f})"
                filters.append(f"[{last_output}][{input_idx}:v]overlay=0:0:enable='{enable}'[{output_name}]")
                last_output = output_name
            
            filter_complex = ';'.join(filters)
            batch_output = os.path.join(temp_dir, f'batch_{batch_idx}.mp4')
            
            cmd = [
                'ffmpeg', '-y', *inputs,
                '-filter_complex', filter_complex,
                '-map', f'[{last_output}]', '-map', '0:a',
                '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
                '-c:a', 'copy', batch_output
            ]
            
            result = subprocess.run(cmd, capture_output=True)
            if result.returncode == 0 and os.path.exists(batch_output):
                current_video = batch_output
            
            print(f"  ✓ 字幕 {min(batch_idx + batch_size, len(sub_images))}/{len(sub_images)}")
        
        shutil.copy(current_video, output_path)
        
        if os.path.exists(output_path):
            size_mb = os.path.getsize(output_path) / (1024 * 1024)
            print(f"  ✅ 完成: {os.path.basename(output_path)} ({size_mb:.1f}MB)")
            return True
        return False
        
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def main():
    parser = argparse.ArgumentParser(description='视频字幕烧录 Clean')
    parser.add_argument('--input', '-i', required=True, help='输入视频')
    parser.add_argument('--srt', '-s', required=True, help='SRT字幕')
    parser.add_argument('--output', '-o', help='输出文件')
    parser.add_argument('--title', '-t', help='标题')
    parser.add_argument('--subtitle', help='副标题')
    
    args = parser.parse_args()
    
    output = args.output or args.input.replace('.mp4', '_Clean.mp4')
    burn_subtitles(args.input, args.srt, output, args.title, args.subtitle)

if __name__ == '__main__':
    main()
