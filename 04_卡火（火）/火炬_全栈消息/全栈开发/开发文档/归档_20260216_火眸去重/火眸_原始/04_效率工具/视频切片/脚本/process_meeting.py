#!/usr/bin/env python3
"""
会议视频智能处理 v1.0
功能：
1. 音频降噪 + 音量标准化（loudnorm）
2. 繁体转简体字幕
3. 智能切片（2-10分钟，保证完整度）
4. 无阴影清爽字幕烧录
5. 关键词高亮

使用：
python3 process_meeting.py --input meeting.mp4 --output ./output
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

# 繁简转换
try:
    from opencc import OpenCC
    cc = OpenCC('t2s')  # 繁体转简体
except:
    cc = None
    print("警告: opencc未安装，跳过繁简转换")

# ============ 配置 ============

SKILL_DIR = Path(__file__).parent.parent
FONTS_DIR = SKILL_DIR / "fonts"

FONT_TITLE = str(FONTS_DIR / "SourceHanSansSC-Heavy.otf")
FONT_SUBTITLE = str(FONTS_DIR / "SourceHanSansSC-Bold.otf")
FONT_CONTENT = str(FONTS_DIR / "SourceHanSansSC-Bold.otf")

FALLBACK_FONTS = [
    str(FONTS_DIR / "NotoSansCJK-Bold.ttc"),
    "/System/Library/Fonts/STHeiti Medium.ttc",
]

# 样式（无阴影）
STYLE = {
    'title': {
        'font_size': 76,
        'color': (255, 255, 255),
        'outline_color': (40, 40, 80),
        'outline_width': 5,
    },
    'subtitle': {
        'font_size': 48,
        'color': (255, 220, 100),
        'outline_color': (60, 40, 20),
        'outline_width': 3,
    },
    'content': {
        'font_size': 46,
        'color': (255, 255, 255),
        'outline_color': (30, 30, 30),
        'outline_width': 3,
        'bg_color': (20, 20, 40, 190),
        'bg_padding': 16,
        'bg_radius': 10,
        'margin_bottom': 70,
    },
    'keyword': {
        'color': (255, 215, 0),
    },
    'title_card': {
        'blur_radius': 25,
        'overlay_alpha': 180,
        'duration': 2.5,
    }
}

# 关键词
KEYWORDS = [
    '100万', '30万', '50万', '10万', '5万', '1万',
    '私域', 'AI', '自动化', '矩阵', 'SOP', 'IP',
    '获客', '变现', '分润', '放量', '转化', '复购',
    '存客宝', '抖音', '公众号', '微信群', '微信',
    '接口', '对接', '小程序', '分销', '功能', '迭代',
    '产研', '开发', '上线', '测试', '优化', '效率',
]

# 无效字幕关键词
INVALID_PATTERNS = [
    '字幕', '索兰娅', '希望大家', '好好地享受', '我們在這段時間中',
    '然後我一天吃幾碗', '謝謝觀看', '感谢收看',
]

# ============ 音频处理 ============

def enhance_audio(input_video, output_video):
    """
    音频增强：降噪 + 音量标准化
    - afftdn: 自适应FFT降噪
    - highpass: 去除低频杂音（<80Hz）
    - lowpass: 去除高频噪音（>8000Hz）
    - loudnorm: EBU R128标准音量
    - compand: 动态压缩，平衡音量
    """
    print("  🔊 音频增强处理...")
    
    # 音频滤镜链
    audio_filter = (
        "highpass=f=80,"  # 去除80Hz以下低频
        "lowpass=f=8000,"  # 去除8000Hz以上高频
        "afftdn=nf=-25:nr=10:nt=w,"  # FFT降噪
        "acompressor=threshold=-20dB:ratio=4:attack=5:release=50,"  # 压缩动态范围
        "loudnorm=I=-16:TP=-1.5:LRA=11"  # EBU R128标准化
    )
    
    cmd = [
        'ffmpeg', '-y',
        '-i', input_video,
        '-af', audio_filter,
        '-c:v', 'copy',  # 视频不重编码
        '-c:a', 'aac', '-b:a', '128k',
        output_video
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        print("  ✓ 音频增强完成")
        return True
    else:
        print(f"  ⚠ 音频增强失败: {result.stderr[:200]}")
        return False

# ============ 字幕处理 ============

def convert_to_simplified(text):
    """繁体转简体"""
    if cc:
        return cc.convert(text)
    return text

def is_valid_subtitle(text):
    """检查字幕是否有效"""
    if len(text) < 2:
        return False
    for pattern in INVALID_PATTERNS:
        if pattern in text:
            return False
    return True

def time_to_seconds(time_str):
    time_str = time_str.replace(',', '.')
    parts = time_str.split(':')
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    return 0

def seconds_to_time(s):
    h = int(s // 3600)
    m = int((s % 3600) // 60)
    sec = s % 60
    return f"{h:02d}:{m:02d}:{sec:06.3f}".replace('.', ',')

def parse_srt(srt_path, convert_simplified=True):
    """解析SRT并转换为简体"""
    with open(srt_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    pattern = r'(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n(.*?)(?=\n\n|\Z)'
    matches = re.findall(pattern, content, re.DOTALL)
    
    subtitles = []
    for match in matches:
        text = match[3].strip()
        
        if not is_valid_subtitle(text):
            continue
        
        if convert_simplified:
            text = convert_to_simplified(text)
        
        subtitles.append({
            'index': int(match[0]),
            'start': time_to_seconds(match[1]),
            'end': time_to_seconds(match[2]),
            'text': text
        })
    
    return subtitles

# ============ 智能切片 ============

def find_natural_breaks(subtitles, min_duration=120, max_duration=600):
    """
    找到自然断点（2-10分钟）
    规则：
    1. 寻找较长的静音间隔（>3秒）
    2. 保证每段2-10分钟
    3. 优先在主题转换点切割
    """
    if not subtitles:
        return []
    
    breaks = []
    current_start = 0
    last_end = 0
    
    for i, sub in enumerate(subtitles):
        # 计算当前片段时长
        current_duration = sub['end'] - current_start
        
        # 检查是否有较长间隔（可能是主题切换）
        gap = sub['start'] - last_end if last_end > 0 else 0
        
        # 满足最小时长且有间隔，或超过最大时长
        if current_duration >= min_duration:
            if gap > 3 or current_duration >= max_duration:
                # 在这里切割
                breaks.append({
                    'start': current_start,
                    'end': last_end,
                    'duration': last_end - current_start
                })
                current_start = sub['start']
        
        last_end = sub['end']
    
    # 添加最后一段
    if last_end > current_start and (last_end - current_start) >= min_duration:
        breaks.append({
            'start': current_start,
            'end': last_end,
            'duration': last_end - current_start
        })
    
    return breaks

def extract_clip_subtitles(subtitles, start_time, end_time, title):
    """提取片段字幕并调整时间"""
    clip_subs = []
    
    # 添加标题
    clip_subs.append({
        'index': 1,
        'start': 0,
        'end': 2.5,
        'text': f'【{title}】'
    })
    
    idx = 2
    for sub in subtitles:
        if sub['start'] >= start_time and sub['end'] <= end_time:
            new_sub = {
                'index': idx,
                'start': sub['start'] - start_time,
                'end': sub['end'] - start_time,
                'text': sub['text']
            }
            clip_subs.append(new_sub)
            idx += 1
    
    return clip_subs

def save_srt(subtitles, output_path):
    """保存SRT文件"""
    content = []
    for sub in subtitles:
        content.append(f"{sub['index']}")
        content.append(f"{seconds_to_time(sub['start'])} --> {seconds_to_time(sub['end'])}")
        content.append(sub['text'])
        content.append("")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(content))

# ============ 图片生成 ============

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

def draw_text_no_shadow(draw, pos, text, font, color, outline_color=None, outline_width=0):
    """绘制文字（无阴影）"""
    x, y = pos
    
    if outline_color and outline_width > 0:
        import math
        for angle in range(0, 360, 45):
            dx = int(outline_width * math.cos(math.radians(angle)))
            dy = int(outline_width * math.sin(math.radians(angle)))
            draw.text((x + dx, y + dy), text, font=font, fill=outline_color)
    
    draw.text((x, y), text, font=font, fill=color)

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

def create_title_card(title, subtitle, width, height, output_path, video_path=None):
    """创建标题贴片"""
    style = STYLE['title_card']
    
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
            bg = Image.new('RGB', (width, height), (25, 25, 50))
    else:
        bg = Image.new('RGB', (width, height), (25, 25, 50))
    
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, style['overlay_alpha']))
    bg = bg.convert('RGBA')
    img = Image.alpha_composite(bg, overlay)
    
    draw = ImageDraw.Draw(img)
    
    # 装饰
    for i in range(4):
        alpha = 120 - i * 30
        draw.rectangle([0, i*2, width, i*2+2], fill=(255, 215, 0, alpha))
        draw.rectangle([0, height - i*2 - 2, width, height - i*2], fill=(255, 215, 0, alpha))
    
    # 标题
    title_style = STYLE['title']
    title_font = get_font(FONT_TITLE, title_style['font_size'])
    title_w, title_h = get_text_bbox(draw, title, title_font)
    title_x = (width - title_w) // 2
    title_y = height // 3
    
    draw_text_no_shadow(
        draw, (title_x, title_y), title, title_font,
        color=title_style['color'],
        outline_color=title_style['outline_color'],
        outline_width=title_style['outline_width']
    )
    
    if subtitle:
        sub_style = STYLE['subtitle']
        sub_font = get_font(FONT_SUBTITLE, sub_style['font_size'])
        sub_w, sub_h = get_text_bbox(draw, subtitle, sub_font)
        sub_x = (width - sub_w) // 2
        sub_y = title_y + title_h + 20
        
        draw_text_no_shadow(
            draw, (sub_x, sub_y), subtitle, sub_font,
            color=sub_style['color'],
            outline_color=sub_style['outline_color'],
            outline_width=sub_style['outline_width']
        )
    
    img.save(output_path, 'PNG')
    return output_path

def create_subtitle_image(text, width, height, output_path):
    """创建字幕图片（无阴影）"""
    style = STYLE['content']
    
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    font = get_font(FONT_CONTENT, style['font_size'])
    text_w, text_h = get_text_bbox(draw, text, font)
    base_x = (width - text_w) // 2
    base_y = height - text_h - style['margin_bottom']
    
    # 背景
    padding = style['bg_padding']
    bg_rect = [
        base_x - padding - 8,
        base_y - padding,
        base_x + text_w + padding + 8,
        base_y + text_h + padding
    ]
    
    bg_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg_layer)
    bg_draw.rounded_rectangle(bg_rect, radius=style['bg_radius'], fill=style['bg_color'])
    img = Image.alpha_composite(img, bg_layer)
    draw = ImageDraw.Draw(img)
    
    # 关键词高亮
    highlights = highlight_keywords(text, KEYWORDS)
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
            draw_text_no_shadow(
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
            draw_text_no_shadow(
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

def burn_subtitles(video_path, subtitles, output_path, title, subtitle_text):
    """烧录字幕"""
    
    video_info = get_video_info(video_path)
    width, height = video_info['width'], video_info['height']
    
    temp_dir = tempfile.mkdtemp(prefix='meeting_')
    
    try:
        content_subs = [s for s in subtitles if not s['text'].startswith('【') and s['start'] > 2.5]
        
        print(f"    字幕: {len(content_subs)} 条")
        
        # 标题贴片
        title_img = os.path.join(temp_dir, 'title.png')
        create_title_card(title, subtitle_text, width, height, title_img, video_path)
        
        # 字幕图片
        sub_images = []
        for i, sub in enumerate(content_subs[:80]):
            img_path = os.path.join(temp_dir, f'sub_{i:04d}.png')
            create_subtitle_image(sub['text'], width, height, img_path)
            sub_images.append({
                'path': img_path,
                'start': sub['start'],
                'end': sub['end']
            })
        
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
        
        shutil.copy(current_video, output_path)
        return os.path.exists(output_path)
        
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def process_meeting_video(input_video, output_dir, meeting_date=None):
    """处理完整会议视频"""
    
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    clips_dir = output_dir / "clips"
    final_dir = output_dir / "final"
    clips_dir.mkdir(exist_ok=True)
    final_dir.mkdir(exist_ok=True)
    
    print("=" * 60)
    print("会议视频智能处理 v1.0")
    print("=" * 60)
    print(f"输入: {input_video}")
    
    # 1. 音频增强
    print("\n[1/4] 音频增强...")
    enhanced_video = str(output_dir / "enhanced.mp4")
    if not enhance_audio(input_video, enhanced_video):
        enhanced_video = input_video
    
    # 2. 提取音频转录
    print("\n[2/4] 转录视频...")
    audio_path = str(output_dir / "audio.wav")
    subprocess.run([
        'ffmpeg', '-y', '-i', enhanced_video,
        '-vn', '-ar', '16000', '-ac', '1', audio_path
    ], capture_output=True)
    
    # MLX Whisper转录
    srt_path = str(output_dir / "transcript.srt")
    print("  使用MLX Whisper转录...")
    
    # 尝试使用mlx_whisper
    try:
        result = subprocess.run([
            'bash', '-c',
            f'eval "$(~/miniforge3/bin/conda shell.zsh hook)" && '
            f'conda activate mlx-whisper && '
            f'mlx_whisper "{audio_path}" --model mlx-community/whisper-medium-mlx '
            f'--language zh --output-format srt --output-dir "{output_dir}" --output-name transcript'
        ], capture_output=True, text=True, timeout=600)
        print("  ✓ 转录完成")
    except Exception as e:
        print(f"  ⚠ 转录失败: {e}")
        return []
    
    # 3. 解析字幕并转简体
    print("\n[3/4] 处理字幕...")
    subtitles = parse_srt(srt_path, convert_simplified=True)
    print(f"  有效字幕: {len(subtitles)} 条")
    
    # 4. 智能切片
    print("\n[4/4] 智能切片...")
    breaks = find_natural_breaks(subtitles, min_duration=120, max_duration=600)
    print(f"  识别到 {len(breaks)} 个片段")
    
    if not breaks:
        # 如果没有自然断点，按5分钟均匀切
        video_duration = subtitles[-1]['end'] if subtitles else 0
        breaks = []
        for i in range(0, int(video_duration), 300):
            end = min(i + 300, video_duration)
            if end - i >= 120:
                breaks.append({'start': i, 'end': end, 'duration': end - i})
    
    # 处理每个片段
    results = []
    for i, clip in enumerate(breaks):
        clip_num = i + 1
        duration_min = clip['duration'] / 60
        
        # 生成标题（从字幕中提取关键词）
        clip_subs = [s for s in subtitles if s['start'] >= clip['start'] and s['end'] <= clip['end']]
        title = f"会议片段{clip_num}"
        
        # 尝试从字幕提取主题
        for sub in clip_subs[:5]:
            for kw in KEYWORDS:
                if kw in sub['text']:
                    title = kw
                    break
        
        print(f"\n  片段 {clip_num}: {title} ({duration_min:.1f}分钟)")
        
        # 切割视频
        clip_video = str(clips_dir / f"{clip_num:02d}_{title}.mp4")
        subprocess.run([
            'ffmpeg', '-y',
            '-ss', str(clip['start']),
            '-i', enhanced_video,
            '-t', str(clip['duration']),
            '-c', 'copy',
            clip_video
        ], capture_output=True)
        
        # 提取字幕
        clip_subtitles = extract_clip_subtitles(subtitles, clip['start'], clip['end'], title)
        
        # 保存字幕
        clip_srt = str(clips_dir / f"{clip_num:02d}_{title}.srt")
        save_srt(clip_subtitles, clip_srt)
        
        # 烧录字幕
        final_video = str(final_dir / f"{clip_num:02d}_{title}_成片.mp4")
        subtitle_text = meeting_date or "会议记录"
        
        if burn_subtitles(clip_video, clip_subtitles, final_video, title, subtitle_text):
            size_mb = os.path.getsize(final_video) / (1024 * 1024)
            print(f"    ✅ {os.path.basename(final_video)} ({size_mb:.1f}MB)")
            results.append(final_video)
    
    print("\n" + "=" * 60)
    print(f"处理完成！共生成 {len(results)} 个成片")
    print("=" * 60)
    
    return results

def main():
    parser = argparse.ArgumentParser(description='会议视频智能处理')
    parser.add_argument('--input', '-i', required=True, help='输入视频')
    parser.add_argument('--output', '-o', default='./output', help='输出目录')
    parser.add_argument('--date', '-d', help='会议日期')
    
    args = parser.parse_args()
    
    process_meeting_video(args.input, args.output, args.date)

if __name__ == '__main__':
    main()
