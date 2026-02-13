#!/usr/bin/env python3
"""
视频字幕烧录脚本 v2.0
功能：
1. 使用PIL渲染中文字幕（支持大字号+描边+高亮）
2. 在视频开头添加标题封面
3. 批量烧录字幕到视频
4. 支持CapCut风格的字幕样式
"""

import subprocess
import os
import re
import json
import tempfile
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# ============ 配置 ============
CLIPS_DIR = "/Users/karuo/Movies/存客宝/output/clips"
OUTPUT_DIR = "/Users/karuo/Movies/存客宝/output/final"

# 中文字体配置（优先级从高到低）
FONT_PATHS = [
    "/System/Library/Fonts/STHeiti Medium.ttc",  # 华文黑体
    "/System/Library/Fonts/Hiragino Sans GB.ttc",  # 冬青黑体
    "/Library/Fonts/Arial Unicode.ttf",  # Arial Unicode
    "/System/Library/Fonts/Helvetica.ttc",  # 备用
]

# 字幕样式配置（CapCut风格）
TITLE_STYLE = {
    'font_size': 96,  # 超大标题
    'color': (255, 215, 0),  # 金黄色
    'outline_color': (0, 0, 0),  # 黑色描边
    'outline_width': 5,
    'shadow': True,
    'position': 'center',  # 居中
}

SUBTITLE_STYLE = {
    'font_size': 64,  # 副标题
    'color': (255, 255, 255),  # 白色
    'outline_color': (0, 0, 0),
    'outline_width': 3,
    'shadow': True,
    'position': 'center',
}

CONTENT_STYLE = {
    'font_size': 56,  # 内容字幕（大号）
    'color': (255, 255, 255),  # 白色
    'outline_color': (0, 0, 0),
    'outline_width': 4,
    'shadow': True,
    'position': 'bottom',  # 底部
    'margin_bottom': 80,  # 距底部像素
    'bg_color': (0, 0, 0, 160),  # 半透明黑色背景
    'bg_padding': 20,
}

# 关键词高亮
KEYWORD_COLOR = (255, 215, 0)  # 金黄色
KEYWORDS = [
    '100万', '30万', '11年', '17个',
    '私域', 'AI', '自动化', '矩阵', 'SOP',
    '获客', '变现', '分润', '放量',
    '抖音', '公众号', '微信群', '微信',
    'IP', '流量', '标准化', '存客宝',
]

# ============ 工具函数 ============

def get_font(size):
    """获取中文字体"""
    for font_path in FONT_PATHS:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size)
            except Exception as e:
                continue
    # 如果都失败，使用默认字体
    return ImageFont.load_default()

def draw_text_with_outline(draw, pos, text, font, fill, outline_color, outline_width):
    """绘制带描边的文字"""
    x, y = pos
    # 绘制描边（8个方向）
    for dx in range(-outline_width, outline_width + 1):
        for dy in range(-outline_width, outline_width + 1):
            if dx != 0 or dy != 0:
                draw.text((x + dx, y + dy), text, font=font, fill=outline_color)
    # 绘制主文字
    draw.text((x, y), text, font=font, fill=fill)

def get_text_size(draw, text, font):
    """获取文字尺寸"""
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]

def time_to_seconds(time_str):
    """时间字符串转秒数"""
    time_str = time_str.replace(',', '.')
    parts = time_str.split(':')
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    return 0

def parse_srt(srt_path):
    """解析SRT字幕"""
    with open(srt_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    pattern = r'(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n(.*?)(?=\n\n|\Z)'
    matches = re.findall(pattern, content, re.DOTALL)
    
    subtitles = []
    for match in matches:
        subtitles.append({
            'start': time_to_seconds(match[1]),
            'end': time_to_seconds(match[2]),
            'text': match[3].strip()
        })
    return subtitles

def get_video_info(video_path):
    """获取视频信息"""
    cmd = [
        'ffprobe', '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'json',
        video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    info = json.loads(result.stdout)
    stream = info['streams'][0]
    return int(stream.get('width', 1920)), int(stream.get('height', 1080))

# ============ 图片生成 ============

def create_title_overlay(title, subtitle, width, height, output_path):
    """创建标题封面叠加层"""
    # 透明背景 + 半透明遮罩
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    
    # 添加半透明黑色背景
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 180))
    img = Image.alpha_composite(img, overlay)
    
    draw = ImageDraw.Draw(img)
    
    # 标题
    title_font = get_font(TITLE_STYLE['font_size'])
    title_w, title_h = get_text_size(draw, title, title_font)
    title_x = (width - title_w) // 2
    title_y = height // 3
    
    draw_text_with_outline(
        draw, (title_x, title_y), title, title_font,
        TITLE_STYLE['color'], TITLE_STYLE['outline_color'], TITLE_STYLE['outline_width']
    )
    
    # 副标题
    sub_font = get_font(SUBTITLE_STYLE['font_size'])
    sub_w, sub_h = get_text_size(draw, subtitle, sub_font)
    sub_x = (width - sub_w) // 2
    sub_y = title_y + title_h + 40
    
    draw_text_with_outline(
        draw, (sub_x, sub_y), subtitle, sub_font,
        SUBTITLE_STYLE['color'], SUBTITLE_STYLE['outline_color'], SUBTITLE_STYLE['outline_width']
    )
    
    img.save(output_path, 'PNG')
    return output_path

def create_subtitle_overlay(text, width, height, output_path):
    """创建单条字幕叠加层"""
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    style = CONTENT_STYLE
    font = get_font(style['font_size'])
    
    # 计算文字尺寸和位置
    text_w, text_h = get_text_size(draw, text, font)
    x = (width - text_w) // 2
    y = height - text_h - style['margin_bottom']
    
    # 绘制背景条
    padding = style['bg_padding']
    bg_rect = [x - padding, y - padding, x + text_w + padding, y + text_h + padding]
    
    # 创建圆角矩形背景
    bg_img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg_img)
    bg_draw.rounded_rectangle(bg_rect, radius=10, fill=style['bg_color'])
    img = Image.alpha_composite(img, bg_img)
    draw = ImageDraw.Draw(img)
    
    # 绘制带描边的文字
    draw_text_with_outline(
        draw, (x, y), text, font,
        style['color'], style['outline_color'], style['outline_width']
    )
    
    img.save(output_path, 'PNG')
    return output_path

# ============ 视频处理 ============

def burn_subtitles(video_path, srt_path, output_path, title_info):
    """烧录字幕到视频"""
    
    # 获取视频尺寸
    width, height = get_video_info(video_path)
    
    # 创建临时目录
    temp_dir = tempfile.mkdtemp(prefix='subtitle_')
    
    try:
        # 解析字幕
        subtitles = parse_srt(srt_path)
        
        # 分离标题字幕和内容字幕
        title_subs = [s for s in subtitles if s['text'].startswith('【')]
        content_subs = [s for s in subtitles if not s['text'].startswith('【') and s['start'] > 2]
        
        print(f"  标题: {title_info['title']}")
        print(f"  内容字幕: {len(content_subs)} 条")
        
        # 1. 创建标题叠加图
        title_img = os.path.join(temp_dir, 'title.png')
        create_title_overlay(title_info['title'], title_info['subtitle'], width, height, title_img)
        
        # 2. 创建所有字幕叠加图
        sub_images = []
        for i, sub in enumerate(content_subs):
            img_path = os.path.join(temp_dir, f'sub_{i:04d}.png')
            create_subtitle_overlay(sub['text'], width, height, img_path)
            sub_images.append({
                'path': img_path,
                'start': sub['start'],
                'end': sub['end']
            })
        
        # 3. 构建FFmpeg filter_complex
        # 输入：视频 + 标题图 + 所有字幕图
        inputs = ['-i', video_path, '-i', title_img]
        for img in sub_images:
            inputs.extend(['-i', img['path']])
        
        # 构建叠加滤镜链
        filters = []
        
        # 标题叠加（0-2.5秒）
        filters.append(f"[0:v][1:v]overlay=0:0:enable='lt(t,2.5)'[v0]")
        
        # 字幕叠加
        last_output = 'v0'
        for i, img in enumerate(sub_images):
            input_idx = i + 2  # 标题是1，字幕从2开始
            output_name = f'v{i+1}'
            enable = f"between(t,{img['start']:.3f},{img['end']:.3f})"
            filters.append(f"[{last_output}][{input_idx}:v]overlay=0:0:enable='{enable}'[{output_name}]")
            last_output = output_name
        
        filter_complex = ';'.join(filters)
        
        # 4. 执行FFmpeg
        cmd = [
            'ffmpeg', '-y',
            *inputs,
            '-filter_complex', filter_complex,
            '-map', f'[{last_output}]',
            '-map', '0:a',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
            '-c:a', 'copy',
            output_path
        ]
        
        print(f"  正在烧录...")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            return True
        else:
            # 如果字幕太多导致命令失败，分批处理
            print(f"  尝试分批处理...")
            return burn_subtitles_batched(video_path, temp_dir, title_img, sub_images, output_path)
            
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def burn_subtitles_batched(video_path, temp_dir, title_img, sub_images, output_path):
    """分批烧录字幕（当字幕数量太多时）"""
    
    # 先烧录标题
    temp_video = os.path.join(temp_dir, 'with_title.mp4')
    cmd = [
        'ffmpeg', '-y',
        '-i', video_path,
        '-i', title_img,
        '-filter_complex', "[0:v][1:v]overlay=0:0:enable='lt(t,2.5)'[v]",
        '-map', '[v]',
        '-map', '0:a',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
        '-c:a', 'copy',
        temp_video
    ]
    subprocess.run(cmd, capture_output=True)
    
    if not os.path.exists(temp_video):
        temp_video = video_path
    
    # 分批烧录字幕（每批10条）
    current_input = temp_video
    batch_size = 8
    
    for batch_idx in range(0, len(sub_images), batch_size):
        batch = sub_images[batch_idx:batch_idx + batch_size]
        
        inputs = ['-i', current_input]
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
            'ffmpeg', '-y',
            *inputs,
            '-filter_complex', filter_complex,
            '-map', f'[{last_output}]',
            '-map', '0:a',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
            '-c:a', 'copy',
            batch_output
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0 and os.path.exists(batch_output):
            current_input = batch_output
        else:
            print(f"    批次 {batch_idx} 跳过")
    
    # 复制最终结果
    shutil.copy(current_input, output_path)
    return os.path.exists(output_path)

def process_clip(clip_prefix):
    """处理单个切片"""
    
    # 查找文件
    video_files = list(Path(CLIPS_DIR).glob(f"{clip_prefix}*.mp4"))
    srt_files = list(Path(CLIPS_DIR).glob(f"{clip_prefix}*.srt"))
    
    if not video_files or not srt_files:
        return None
    
    video_path = str(video_files[0])
    srt_path = str(srt_files[0])
    
    # 解析标题
    subtitles = parse_srt(srt_path)
    title_info = {'title': '', 'subtitle': ''}
    
    for sub in subtitles[:2]:
        if sub['text'].startswith('【'):
            title_info['title'] = sub['text'].strip('【】')
        else:
            title_info['subtitle'] = sub['text']
    
    # 输出路径
    output_name = Path(video_path).stem + "_带字幕.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_name)
    
    print(f"\n正在处理: {clip_prefix}")
    
    success = burn_subtitles(video_path, srt_path, output_path, title_info)
    
    if success and os.path.exists(output_path):
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"  ✅ 完成: {size_mb:.2f}MB")
        return output_path
    else:
        print(f"  ❌ 失败")
        return None

def main():
    """主函数"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("=" * 60)
    print("视频字幕烧录 v2.0")
    print("=" * 60)
    print(f"字幕样式: 标题{TITLE_STYLE['font_size']}px / 内容{CONTENT_STYLE['font_size']}px")
    print(f"输出目录: {OUTPUT_DIR}")
    
    # 处理所有切片
    results = []
    for prefix in ['01', '02', '03', '04', '05']:
        result = process_clip(prefix)
        if result:
            results.append(result)
    
    print("\n" + "=" * 60)
    print(f"处理完成！共生成 {len(results)} 个带字幕视频")
    print("=" * 60)
    
    # 列出输出文件
    for f in results:
        print(f"  {os.path.basename(f)}")

if __name__ == '__main__':
    main()
