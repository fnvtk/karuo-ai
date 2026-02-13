#!/usr/bin/env python3
"""
视频字幕烧录 Pro v3.0
功能：
1. 思源黑体（抖音/剪映最火字体）
2. 关键词高亮（金黄色突出）
3. 标题贴片（渐变背景+毛玻璃效果）
4. 专业字幕样式（描边+阴影+背景条）

使用方法：
python3 burn_subtitles_pro.py --input video.mp4 --srt subtitle.srt --output output.mp4
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

# 字体路径（思源黑体 - 抖音最火字体）
SKILL_DIR = Path(__file__).parent.parent
FONTS_DIR = SKILL_DIR / "fonts"

FONT_TITLE = str(FONTS_DIR / "SourceHanSansSC-Heavy.otf")  # 标题用Heavy
FONT_SUBTITLE = str(FONTS_DIR / "SourceHanSansSC-Bold.otf")  # 副标题用Bold
FONT_CONTENT = str(FONTS_DIR / "SourceHanSansSC-Medium.otf")  # 内容用Medium

# 备用字体
FALLBACK_FONTS = [
    str(FONTS_DIR / "NotoSansCJK-Bold.ttc"),
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
]

# 样式配置（抖音爆款风格）
STYLE = {
    'title': {
        'font_size': 88,  # 大标题
        'color': (255, 255, 255),  # 白色
        'outline_color': (0, 0, 0),  # 黑色描边
        'outline_width': 6,
        'shadow_offset': (4, 4),
        'shadow_color': (0, 0, 0, 128),
    },
    'subtitle': {
        'font_size': 56,  # 副标题
        'color': (255, 215, 0),  # 金黄色
        'outline_color': (0, 0, 0),
        'outline_width': 4,
    },
    'content': {
        'font_size': 52,  # 内容字幕
        'color': (255, 255, 255),  # 白色
        'outline_color': (0, 0, 0),
        'outline_width': 4,
        'bg_color': (0, 0, 0, 180),  # 半透明黑色背景
        'bg_padding': 16,
        'bg_radius': 8,
        'margin_bottom': 100,  # 距底部
    },
    'keyword': {
        'color': (255, 215, 0),  # 金黄色高亮
    },
    'title_card': {
        'bg_gradient': [(30, 30, 60), (60, 30, 80)],  # 深蓝紫渐变
        'blur_radius': 20,  # 毛玻璃效果
        'overlay_alpha': 200,  # 叠加层透明度
        'duration': 2.5,  # 显示时长
    }
}

# 关键词列表（会被高亮）
KEYWORDS = [
    # 数字
    '100万', '30万', '11年', '17个', '50万', '10万', '5万', '1万',
    '100%', '50%', '30%', '10%',
    # 核心概念
    '私域', 'AI', '自动化', '矩阵', 'SOP', 'IP',
    '获客', '变现', '分润', '放量', '转化', '复购',
    '存客宝', '抖音', '公众号', '微信群', '微信',
    # 动作词
    '爆款', '裂变', '成交', '引流', '复制', '标准化',
    # 情绪词
    '免费', '赚钱', '涨粉', '爆单', '秒杀', '限时',
]

# ============ 工具函数 ============

def get_font(font_path, size):
    """获取字体，支持fallback"""
    paths_to_try = [font_path] + FALLBACK_FONTS
    for path in paths_to_try:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()

def get_text_bbox(draw, text, font):
    """获取文字边界框"""
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]

def draw_text_with_effects(draw, pos, text, font, color, outline_color=None, 
                           outline_width=0, shadow_offset=None, shadow_color=None):
    """绘制带效果的文字（阴影+描边+主体）"""
    x, y = pos
    
    # 1. 阴影
    if shadow_offset and shadow_color:
        sx, sy = shadow_offset
        draw.text((x + sx, y + sy), text, font=font, fill=shadow_color)
    
    # 2. 描边
    if outline_color and outline_width > 0:
        for dx in range(-outline_width, outline_width + 1):
            for dy in range(-outline_width, outline_width + 1):
                if dx != 0 or dy != 0:
                    draw.text((x + dx, y + dy), text, font=font, fill=outline_color)
    
    # 3. 主体文字
    draw.text((x, y), text, font=font, fill=color)

def highlight_keywords(text, keywords):
    """识别文本中的关键词位置"""
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
            'index': int(match[0]),
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
        '-show_entries', 'stream=width,height,duration',
        '-of', 'json',
        video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    info = json.loads(result.stdout)
    stream = info['streams'][0]
    return {
        'width': int(stream.get('width', 1920)),
        'height': int(stream.get('height', 1080)),
        'duration': float(stream.get('duration', 0))
    }

# ============ 图片生成 ============

def create_title_card(title, subtitle, width, height, output_path, 
                      video_path=None):
    """创建标题贴片（毛玻璃效果+渐变背景）"""
    
    style = STYLE['title_card']
    
    # 基础层：渐变或模糊视频帧
    if video_path and os.path.exists(video_path):
        # 从视频提取第一帧作为背景
        temp_frame = output_path.replace('.png', '_frame.jpg')
        subprocess.run([
            'ffmpeg', '-y', '-ss', '0.5', '-i', video_path,
            '-vframes', '1', '-q:v', '2', temp_frame
        ], capture_output=True)
        
        if os.path.exists(temp_frame):
            bg = Image.open(temp_frame).resize((width, height))
            # 毛玻璃效果
            bg = bg.filter(ImageFilter.GaussianBlur(radius=style['blur_radius']))
            os.remove(temp_frame)
        else:
            bg = Image.new('RGB', (width, height), style['bg_gradient'][0])
    else:
        # 渐变背景
        bg = Image.new('RGB', (width, height), style['bg_gradient'][0])
    
    # 添加半透明叠加层
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, style['overlay_alpha']))
    bg = bg.convert('RGBA')
    img = Image.alpha_composite(bg, overlay)
    
    draw = ImageDraw.Draw(img)
    
    # 标题
    title_style = STYLE['title']
    title_font = get_font(FONT_TITLE, title_style['font_size'])
    title_w, title_h = get_text_bbox(draw, title, title_font)
    title_x = (width - title_w) // 2
    title_y = height // 3
    
    draw_text_with_effects(
        draw, (title_x, title_y), title, title_font,
        color=title_style['color'],
        outline_color=title_style['outline_color'],
        outline_width=title_style['outline_width'],
        shadow_offset=title_style['shadow_offset'],
        shadow_color=title_style['shadow_color']
    )
    
    # 副标题
    sub_style = STYLE['subtitle']
    sub_font = get_font(FONT_SUBTITLE, sub_style['font_size'])
    sub_w, sub_h = get_text_bbox(draw, subtitle, sub_font)
    sub_x = (width - sub_w) // 2
    sub_y = title_y + title_h + 30
    
    draw_text_with_effects(
        draw, (sub_x, sub_y), subtitle, sub_font,
        color=sub_style['color'],
        outline_color=sub_style['outline_color'],
        outline_width=sub_style['outline_width']
    )
    
    # 装饰线
    line_y = sub_y + sub_h + 20
    line_width = max(title_w, sub_w) + 40
    line_x = (width - line_width) // 2
    draw.rectangle([line_x, line_y, line_x + line_width, line_y + 3], 
                   fill=(255, 215, 0, 200))
    
    img.save(output_path, 'PNG')
    return output_path

def create_subtitle_image(text, width, height, output_path):
    """创建单条字幕图片（带关键词高亮）"""
    
    style = STYLE['content']
    keyword_color = STYLE['keyword']['color']
    
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    font = get_font(FONT_CONTENT, style['font_size'])
    
    # 计算完整文本尺寸
    text_w, text_h = get_text_bbox(draw, text, font)
    base_x = (width - text_w) // 2
    base_y = height - text_h - style['margin_bottom']
    
    # 绘制背景条
    padding = style['bg_padding']
    bg_rect = [
        base_x - padding, 
        base_y - padding, 
        base_x + text_w + padding, 
        base_y + text_h + padding
    ]
    
    # 圆角矩形背景
    bg_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg_layer)
    bg_draw.rounded_rectangle(bg_rect, radius=style['bg_radius'], 
                              fill=style['bg_color'])
    img = Image.alpha_composite(img, bg_layer)
    draw = ImageDraw.Draw(img)
    
    # 识别关键词
    highlights = highlight_keywords(text, KEYWORDS)
    
    # 逐字符绘制（支持关键词高亮）
    current_x = base_x
    char_idx = 0
    
    while char_idx < len(text):
        # 检查是否在关键词中
        in_keyword = False
        keyword_end = char_idx
        for start, end, kw in highlights:
            if start <= char_idx < end:
                in_keyword = True
                keyword_end = end
                break
        
        if in_keyword:
            # 绘制关键词（高亮）
            keyword_text = text[char_idx:keyword_end]
            draw_text_with_effects(
                draw, (current_x, base_y), keyword_text, font,
                color=keyword_color,
                outline_color=style['outline_color'],
                outline_width=style['outline_width']
            )
            kw_w, _ = get_text_bbox(draw, keyword_text, font)
            current_x += kw_w
            char_idx = keyword_end
        else:
            # 绘制普通字符
            char = text[char_idx]
            draw_text_with_effects(
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

def burn_subtitles_to_video(video_path, srt_path, output_path, 
                            title=None, subtitle=None):
    """烧录字幕到视频"""
    
    print(f"\n处理视频: {os.path.basename(video_path)}")
    
    # 获取视频信息
    video_info = get_video_info(video_path)
    width, height = video_info['width'], video_info['height']
    
    print(f"  分辨率: {width}x{height}")
    
    # 创建临时目录
    temp_dir = tempfile.mkdtemp(prefix='subtitle_pro_')
    
    try:
        # 解析字幕
        subtitles = parse_srt(srt_path)
        
        # 分离标题和内容
        title_subs = [s for s in subtitles if s['text'].startswith('【')]
        content_subs = [s for s in subtitles 
                       if not s['text'].startswith('【') and s['start'] > 2]
        
        # 提取标题信息
        if not title:
            for sub in subtitles[:3]:
                if sub['text'].startswith('【'):
                    title = sub['text'].strip('【】')
                    break
        if not subtitle:
            for sub in subtitles[:3]:
                if not sub['text'].startswith('【') and sub['start'] < 3:
                    subtitle = sub['text']
                    break
        
        title = title or "精彩内容"
        subtitle = subtitle or ""
        
        print(f"  标题: {title}")
        print(f"  字幕: {len(content_subs)} 条")
        
        # 1. 生成标题贴片
        title_img = os.path.join(temp_dir, 'title_card.png')
        create_title_card(title, subtitle, width, height, title_img, video_path)
        print(f"  ✓ 标题贴片")
        
        # 2. 生成所有字幕图片
        sub_images = []
        for i, sub in enumerate(content_subs):
            img_path = os.path.join(temp_dir, f'sub_{i:04d}.png')
            create_subtitle_image(sub['text'], width, height, img_path)
            sub_images.append({
                'path': img_path,
                'start': sub['start'],
                'end': sub['end']
            })
        print(f"  ✓ 字幕图片 ({len(sub_images)} 张)")
        
        # 3. 分批烧录（避免命令行过长）
        current_video = video_path
        batch_size = 10
        
        # 先烧录标题
        title_output = os.path.join(temp_dir, 'with_title.mp4')
        title_duration = STYLE['title_card']['duration']
        
        cmd = [
            'ffmpeg', '-y',
            '-i', current_video,
            '-i', title_img,
            '-filter_complex', f"[0:v][1:v]overlay=0:0:enable='lt(t,{title_duration})'[v]",
            '-map', '[v]',
            '-map', '0:a',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
            '-c:a', 'copy',
            title_output
        ]
        subprocess.run(cmd, capture_output=True)
        
        if os.path.exists(title_output):
            current_video = title_output
        print(f"  ✓ 标题烧录")
        
        # 分批烧录字幕
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
                current_video = batch_output
            
            progress = min(batch_idx + batch_size, len(sub_images))
            print(f"  ✓ 字幕烧录 {progress}/{len(sub_images)}")
        
        # 复制最终结果
        shutil.copy(current_video, output_path)
        
        if os.path.exists(output_path):
            size_mb = os.path.getsize(output_path) / (1024 * 1024)
            print(f"  ✅ 完成: {os.path.basename(output_path)} ({size_mb:.1f}MB)")
            return True
        else:
            print(f"  ❌ 失败")
            return False
            
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def process_clips_folder(clips_dir, output_dir):
    """批量处理切片目录"""
    
    clips_dir = Path(clips_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("视频字幕烧录 Pro v3.0")
    print("=" * 60)
    print(f"字体: 思源黑体 (抖音最火字体)")
    print(f"样式: 标题{STYLE['title']['font_size']}px / 内容{STYLE['content']['font_size']}px")
    print(f"关键词高亮: {len(KEYWORDS)} 个")
    
    results = []
    
    # 查找所有视频文件
    video_files = sorted(clips_dir.glob('*.mp4'))
    
    for video_path in video_files:
        # 查找对应的SRT文件
        srt_path = video_path.with_suffix('.srt')
        if not srt_path.exists():
            continue
        
        output_name = video_path.stem + '_Pro.mp4'
        output_path = output_dir / output_name
        
        success = burn_subtitles_to_video(
            str(video_path), 
            str(srt_path), 
            str(output_path)
        )
        
        if success:
            results.append(str(output_path))
    
    print("\n" + "=" * 60)
    print(f"处理完成！共生成 {len(results)} 个带字幕视频")
    print("=" * 60)
    
    for f in results:
        print(f"  {os.path.basename(f)}")
    
    return results

def main():
    parser = argparse.ArgumentParser(description='视频字幕烧录 Pro')
    parser.add_argument('--input', '-i', help='输入视频或切片目录')
    parser.add_argument('--srt', '-s', help='SRT字幕文件')
    parser.add_argument('--output', '-o', help='输出文件或目录')
    parser.add_argument('--title', '-t', help='标题文字')
    parser.add_argument('--subtitle', help='副标题文字')
    parser.add_argument('--batch', action='store_true', help='批量处理目录')
    
    args = parser.parse_args()
    
    if args.batch or (args.input and os.path.isdir(args.input)):
        # 批量处理
        clips_dir = args.input or './clips'
        output_dir = args.output or './final'
        process_clips_folder(clips_dir, output_dir)
    elif args.input and args.srt:
        # 单个视频处理
        output = args.output or args.input.replace('.mp4', '_Pro.mp4')
        burn_subtitles_to_video(
            args.input, args.srt, output,
            title=args.title, subtitle=args.subtitle
        )
    else:
        # 默认处理存客宝目录
        clips_dir = '/Users/karuo/Movies/存客宝/output/clips'
        output_dir = '/Users/karuo/Movies/存客宝/output/final_pro'
        process_clips_folder(clips_dir, output_dir)

if __name__ == '__main__':
    main()
