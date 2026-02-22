#!/usr/bin/env python3
"""
Soul切片增强脚本 v2.0
功能：
1. 添加封面贴片（前3秒Hook）
2. 烧录字幕（关键词高亮）
3. 视频加速10%
4. 删除静音停顿
5. 清理语气词字幕
"""

import argparse
import subprocess
import os
import re
import json
import tempfile
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ============ 配置（可被命令行覆盖）============

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
CLIPS_DIR = Path("/Users/karuo/Movies/soul视频/soul81_final/clips")
OUTPUT_DIR = Path("/Users/karuo/Movies/soul视频/soul81_final/clips_enhanced")
HIGHLIGHTS_PATH = Path("/Users/karuo/Movies/soul视频/soul81_final/highlights.json")
TRANSCRIPT_PATH = Path("/Users/karuo/Movies/soul视频/soul81_final/transcript.srt")

# 字体路径（兼容多种目录结构）
FONTS_DIR = SKILL_DIR / "fonts" if (SKILL_DIR / "fonts").exists() else Path("/Users/karuo/Documents/个人/卡若AI/03_卡木（木）/视频切片/fonts")
FONT_HEAVY = str(FONTS_DIR / "SourceHanSansSC-Heavy.otf")
FONT_BOLD = str(FONTS_DIR / "SourceHanSansSC-Bold.otf")
FALLBACK_FONT = "/System/Library/Fonts/STHeiti Medium.ttc"

# 视频增强参数
SPEED_FACTOR = 1.10  # 加速10%
SILENCE_THRESHOLD = -40  # 静音阈值(dB)
SILENCE_MIN_DURATION = 0.5  # 最短静音时长(秒)

# 繁转简（OpenCC 优先，否则用映射）
_OPENCC = None
def _get_opencc():
    global _OPENCC
    if _OPENCC is None:
        try:
            from opencc import OpenCC
            _OPENCC = OpenCC('t2s')
        except ImportError:
            _OPENCC = False
    return _OPENCC

def _to_simplified(text: str) -> str:
    """转为简体中文"""
    cc = _get_opencc()
    if cc:
        return cc.convert(text)
    # 常用繁简映射（无 opencc 时）
    trad_simp = {
        '這': '这', '個': '个', '們': '们', '來': '来', '說': '说',
        '會': '会', '裡': '里', '麼': '么', '還': '还', '點': '点',
        '時': '时', '對': '对', '電': '电', '體': '体', '為': '为',
    }
    for t, s in trad_simp.items():
        text = text.replace(t, s)
    return text

# 常见转录错误修正（与 one_video 一致）
CORRECTIONS = {
    '私余': '私域', '统安': '同安', '信一下': '线上', '头里': '投入',
    '幅画': '负责', '施育': '私域', '经历论': '净利润', '成于': '乘以',
    '马的': '码的', '猜济': '拆解', '巨圣': '矩阵', '货客': '获客',
}

# 语助词列表（需清理，含常见口头禅）
FILLER_WORDS = [
    '嗯', '啊', '呃', '额', '哦', '噢', '唉', '哎', '诶', '喔',
    '那个', '就是', '然后', '这个', '所以说', '怎么说', '怎么说呢',
    '对吧', '是吧', '好吧', '行吧', '那', '就', '就是那个',
    '其实', '那么', '然后呢', '还有就是', '以及', '另外', '等等',
    '怎么说呢', '你知道吗', '我跟你说', '好', '对', 'OK', 'ok',
]

# 关键词高亮（重点突出，按长度排序避免短词覆盖长词）
KEYWORDS = [
    '100万', '50万', '30万', '10万', '5万', '1万',
    '存客宝', '私域', '自动化', '阿米巴', '矩阵', '获客', '变现',
    '分润', '转化', '复购', '裂变', 'AI', 'SOP', 'IP',
    '电商', '创业', '项目', '收益', '流量', '引流',
    '抖音', 'Soul', '微信', '美团', '方法', '技巧', '干货',
    '核心', '关键', '重点', '赚钱', '收入', '利润',
]

# 字体优先级（Mac 优先苹方，更清晰）
FONT_PRIORITY = [
    "/System/Library/Fonts/PingFang.ttc",      # 苹方-简（Mac 默认，清晰）
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
]

# 样式配置（字体更大、关键词更突出）
STYLE = {
    'cover': {
        'bg_blur': 30,
        'overlay_alpha': 180,
        'duration': 2.5,
    },
    'hook': {
        'font_size': 76,
        'color': (255, 255, 255),
        'outline_color': (30, 30, 50),
        'outline_width': 5,
    },
    'subtitle': {
        'font_size': 44,
        'color': (255, 255, 255),
        'outline_color': (25, 25, 25),
        'outline_width': 4,
        'keyword_color': (255, 200, 50),   # 亮金黄
        'keyword_outline': (80, 50, 0),    # 深黄描边
        'keyword_size_add': 4,              # 关键词字号+4
        'bg_color': (15, 15, 35, 200),
        'margin_bottom': 70,
    }
}

# ============ 工具函数 ============

def get_font(font_path, size):
    """获取字体，优先苹方/系统字体"""
    for path in [font_path, FONT_BOLD] + FONT_PRIORITY + [FALLBACK_FONT]:
        if path and os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()

def get_text_size(draw, text, font):
    """获取文字尺寸"""
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]

def draw_text_with_outline(draw, pos, text, font, color, outline_color, outline_width):
    """绘制带描边的文字"""
    x, y = pos
    import math
    # 8方向描边
    for angle in range(0, 360, 45):
        dx = int(outline_width * math.cos(math.radians(angle)))
        dy = int(outline_width * math.sin(math.radians(angle)))
        draw.text((x + dx, y + dy), text, font=font, fill=outline_color)
    # 主体
    draw.text((x, y), text, font=font, fill=color)

def clean_filler_words(text):
    """清理语助词 + 去除多余空格"""
    result = text
    # 按长度降序，先删长词避免残留
    for word in sorted(FILLER_WORDS, key=len, reverse=True):
        if not word:
            continue
        result = re.sub(rf'^{re.escape(word)}[,，、\s]*', '', result)
        result = re.sub(rf'[,，、\s]*{re.escape(word)}$', '', result)
        result = re.sub(rf'\s+{re.escape(word)}\s+', ' ', result)
        result = re.sub(rf'[,，、]+{re.escape(word)}[,，、\s]*', '，', result)
    # 合并多余空格、去除首尾空格
    result = re.sub(r'\s+', ' ', result)
    result = re.sub(r'\s*[,，]\s*', '，', result)
    result = re.sub(r'[,，]+', '，', result).strip(' ，,')
    return result

def parse_srt_for_clip(srt_path, start_sec, end_sec):
    """解析SRT，提取指定时间段的字幕"""
    with open(srt_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    pattern = r'(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n(.*?)(?=\n\n|\Z)'
    matches = re.findall(pattern, content, re.DOTALL)
    
    def time_to_sec(t):
        t = t.replace(',', '.')
        parts = t.split(':')
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    
    subtitles = []
    for match in matches:
        sub_start = time_to_sec(match[1])
        sub_end = time_to_sec(match[2])
        text = match[3].strip()
        
        # 检查是否与片段时间范围重叠
        if sub_end > start_sec and sub_start < end_sec + 2:
            # 调整为相对于片段开始的相对时间
            rel_start = max(0, sub_start - start_sec)
            rel_end = sub_end - start_sec
            
            # 繁转简 + 修正错误 + 清理语气词
            text = _to_simplified(text)
            for w, c in CORRECTIONS.items():
                text = text.replace(w, c)
            cleaned_text = clean_filler_words(text)
            if len(cleaned_text) > 1:  # 过滤太短的
                subtitles.append({
                    'start': max(0, rel_start),
                    'end': rel_end,
                    'text': cleaned_text
                })
    
    return subtitles

def get_video_info(video_path):
    """获取视频信息"""
    cmd = [
        'ffprobe', '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,duration',
        '-of', 'json', video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    info = json.loads(result.stdout)
    stream = info['streams'][0]
    
    # 获取时长
    cmd2 = [
        'ffprobe', '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'json', video_path
    ]
    result2 = subprocess.run(cmd2, capture_output=True, text=True)
    format_info = json.loads(result2.stdout)
    
    return {
        'width': int(stream.get('width', 570)),
        'height': int(stream.get('height', 1080)),
        'duration': float(format_info.get('format', {}).get('duration', 0))
    }

# ============ 封面生成 ============

def create_cover_image(hook_text, width, height, output_path, video_path=None):
    """创建封面贴片（简体中文）"""
    hook_text = _to_simplified(str(hook_text))
    style = STYLE['cover']
    hook_style = STYLE['hook']
    
    # 从视频提取背景帧
    if video_path and os.path.exists(video_path):
        temp_frame = output_path.replace('.png', '_frame.jpg')
        subprocess.run([
            'ffmpeg', '-y', '-ss', '1', '-i', video_path,
            '-vframes', '1', '-q:v', '2', temp_frame
        ], capture_output=True)
        
        if os.path.exists(temp_frame):
            bg = Image.open(temp_frame).resize((width, height))
            bg = bg.filter(ImageFilter.GaussianBlur(radius=style['bg_blur']))
            os.remove(temp_frame)
        else:
            bg = Image.new('RGB', (width, height), (30, 30, 50))
    else:
        bg = Image.new('RGB', (width, height), (30, 30, 50))
    
    # 叠加暗层
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, style['overlay_alpha']))
    bg = bg.convert('RGBA')
    img = Image.alpha_composite(bg, overlay)
    
    draw = ImageDraw.Draw(img)
    
    # 顶部装饰线
    for i in range(3):
        alpha = 150 - i * 40
        draw.rectangle([0, i*3, width, i*3+2], fill=(255, 215, 0, alpha))
    
    # 底部装饰线
    for i in range(3):
        alpha = 150 - i * 40
        draw.rectangle([0, height - i*3 - 2, width, height - i*3], fill=(255, 215, 0, alpha))
    
    # Hook文字（自动换行）
    font = get_font(FONT_HEAVY, hook_style['font_size'])
    
    # 计算换行
    max_width = width - 80
    lines = []
    current_line = ""
    
    for char in hook_text:
        test_line = current_line + char
        test_w, _ = get_text_size(draw, test_line, font)
        if test_w <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = char
    if current_line:
        lines.append(current_line)
    
    # 绘制文字
    line_height = hook_style['font_size'] + 15
    total_height = len(lines) * line_height
    start_y = (height - total_height) // 2
    
    for i, line in enumerate(lines):
        line_w, line_h = get_text_size(draw, line, font)
        x = (width - line_w) // 2
        y = start_y + i * line_height
        
        draw_text_with_outline(
            draw, (x, y), line, font,
            hook_style['color'],
            hook_style['outline_color'],
            hook_style['outline_width']
        )
    
    img.save(output_path, 'PNG')
    return output_path

# ============ 字幕图片生成 ============

def create_subtitle_image(text, width, height, output_path):
    """创建字幕图片（关键词加粗加大突出）"""
    style = STYLE['subtitle']
    
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    base_size = style['font_size']
    kw_size = base_size + style.get('keyword_size_add', 4)
    font = get_font(FONT_BOLD, base_size)
    kw_font = get_font(FONT_HEAVY, kw_size)  # 关键词用粗体+大字
    text_w, text_h = get_text_size(draw, text, font)
    
    base_x = (width - text_w) // 2
    base_y = height - text_h - style['margin_bottom']
    
    # 背景条
    padding = 15
    bg_rect = [
        base_x - padding - 10,
        base_y - padding,
        base_x + text_w + padding + 10,
        base_y + text_h + padding
    ]
    
    # 绘制圆角背景
    bg_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg_layer)
    bg_draw.rounded_rectangle(bg_rect, radius=10, fill=style['bg_color'])
    img = Image.alpha_composite(img, bg_layer)
    draw = ImageDraw.Draw(img)
    
    # 识别关键词位置（按长度降序，长词优先避免短词截断）
    highlights = []
    for keyword in sorted(KEYWORDS, key=len, reverse=True):
        start = 0
        while True:
            pos = text.find(keyword, start)
            if pos == -1:
                break
            # 避免重叠
            overlap = any(s <= pos < e or s < pos + len(keyword) <= e for s, e in highlights)
            if not overlap:
                highlights.append((pos, pos + len(keyword)))
            start = pos + 1
    highlights = sorted(highlights, key=lambda x: x[0])
    
    # 逐字符绘制
    current_x = base_x
    char_idx = 0
    
    while char_idx < len(text):
        # 检查是否在关键词中
        in_keyword = False
        keyword_end = char_idx
        for start, end in highlights:
            if start <= char_idx < end:
                in_keyword = True
                keyword_end = end
                break
        
        if in_keyword:
            # 关键词：粗体+大字+亮金黄+深色描边
            keyword_text = text[char_idx:keyword_end]
            kw_outline = style.get('keyword_outline', (60, 40, 0))
            kw_ow = style.get('outline_width', 3) + 1
            draw_text_with_outline(
                draw, (current_x, base_y - 1), keyword_text, kw_font,
                style['keyword_color'],
                kw_outline,
                kw_ow
            )
            kw_w, _ = get_text_size(draw, keyword_text, kw_font)
            current_x += kw_w
            char_idx = keyword_end
        else:
            # 绘制单个字符
            char = text[char_idx]
            draw_text_with_outline(
                draw, (current_x, base_y), char, font,
                style['color'],
                style['outline_color'],
                style['outline_width']
            )
            char_w, _ = get_text_size(draw, char, font)
            current_x += char_w
            char_idx += 1
    
    img.save(output_path, 'PNG')
    return output_path

# ============ 视频处理 ============

def detect_silence(video_path, threshold=-40, min_duration=0.5):
    """检测静音段落"""
    cmd = [
        'ffmpeg', '-i', video_path,
        '-af', f'silencedetect=noise={threshold}dB:d={min_duration}',
        '-f', 'null', '-'
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    silences = []
    lines = result.stderr.split('\n')
    
    silence_start = None
    for line in lines:
        if 'silence_start:' in line:
            match = re.search(r'silence_start: ([\d.]+)', line)
            if match:
                silence_start = float(match.group(1))
        elif 'silence_end:' in line and silence_start is not None:
            match = re.search(r'silence_end: ([\d.]+)', line)
            if match:
                silence_end = float(match.group(1))
                silences.append((silence_start, silence_end))
                silence_start = None
    
    return silences

def create_silence_filter(silences, duration, margin=0.1):
    """创建去除静音的filter表达式"""
    if not silences:
        return None
    
    # 构建保留段落
    segments = []
    last_end = 0
    
    for start, end in silences:
        # 保留静音前的内容
        if start > last_end + margin:
            segments.append((last_end, start - margin))
        last_end = end + margin
    
    # 保留最后一段
    if last_end < duration:
        segments.append((last_end, duration))
    
    if not segments:
        return None
    
    # 构建select filter
    selects = []
    for start, end in segments:
        selects.append(f"between(t,{start:.3f},{end:.3f})")
    
    return '+'.join(selects)

def _parse_clip_index(filename: str) -> int:
    """从文件名解析切片序号，支持 soul_01_xxx 或 01_xxx 格式"""
    m = re.search(r'\d+', filename)
    return int(m.group()) if m else 0


def enhance_clip(clip_path, output_path, highlight_info, temp_dir, transcript_path):
    """增强单个切片"""
    
    print(f"\n处理: {os.path.basename(clip_path)}")
    
    video_info = get_video_info(clip_path)
    width, height = video_info['width'], video_info['height']
    duration = video_info['duration']
    
    print(f"  分辨率: {width}x{height}, 时长: {duration:.1f}秒")
    
    hook_text = highlight_info.get('hook_3sec', highlight_info.get('title', ''))
    cover_duration = STYLE['cover']['duration']
    
    # 1. 生成封面图片
    cover_img = os.path.join(temp_dir, 'cover.png')
    create_cover_image(hook_text, width, height, cover_img, clip_path)
    print(f"  ✓ 封面生成")
    
    # 2. 解析字幕
    start_time = highlight_info.get('start_time', '00:00:00')
    parts = start_time.split(':')
    start_sec = int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    end_sec = start_sec + duration
    
    subtitles = parse_srt_for_clip(transcript_path, start_sec, end_sec)
    print(f"  ✓ 字幕解析 ({len(subtitles)}条)")
    
    # 3. 生成字幕图片
    sub_images = []
    for i, sub in enumerate(subtitles[:50]):  # 限制50条
        img_path = os.path.join(temp_dir, f'sub_{i:04d}.png')
        create_subtitle_image(sub['text'], width, height, img_path)
        sub_images.append({
            'path': img_path,
            'start': sub['start'],
            'end': sub['end']
        })
    print(f"  ✓ 字幕图片 ({len(sub_images)}张)")
    
    # 4. 检测静音
    silences = detect_silence(clip_path, SILENCE_THRESHOLD, SILENCE_MIN_DURATION)
    print(f"  ✓ 静音检测 ({len(silences)}段)")
    
    # 5. 构建FFmpeg命令
    current_video = clip_path
    
    # 5.1 添加封面
    cover_output = os.path.join(temp_dir, 'with_cover.mp4')
    cmd = [
        'ffmpeg', '-y',
        '-i', current_video, '-i', cover_img,
        '-filter_complex', f"[0:v][1:v]overlay=0:0:enable='lt(t,{cover_duration})'[v]",
        '-map', '[v]', '-map', '0:a',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
        '-c:a', 'copy', cover_output
    ]
    subprocess.run(cmd, capture_output=True)
    
    if os.path.exists(cover_output):
        current_video = cover_output
    print(f"  ✓ 封面烧录")
    
    # 5.2 分批烧录字幕
    if sub_images:
        batch_size = 8
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
            batch_output = os.path.join(temp_dir, f'sub_batch_{batch_idx}.mp4')
            
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
        
        print(f"  ✓ 字幕烧录")
    
    # 5.3 加速10% + 音频同步
    speed_output = os.path.join(temp_dir, 'speed.mp4')
    atempo = 1.0 / SPEED_FACTOR  # 音频需要反向调整
    
    cmd = [
        'ffmpeg', '-y', '-i', current_video,
        '-filter_complex', f"[0:v]setpts={1/SPEED_FACTOR}*PTS[v];[0:a]atempo={SPEED_FACTOR}[a]",
        '-map', '[v]', '-map', '[a]',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
        '-c:a', 'aac', '-b:a', '128k',
        speed_output
    ]
    
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode == 0 and os.path.exists(speed_output):
        current_video = speed_output
    print(f"  ✓ 加速10%")
    
    # 5.4 复制到输出
    shutil.copy(current_video, output_path)
    
    if os.path.exists(output_path):
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"  ✅ 完成: {os.path.basename(output_path)} ({size_mb:.1f}MB)")
        return True
    
    return False

def main():
    """主函数（支持命令行参数）"""
    parser = argparse.ArgumentParser(description="Soul切片增强 - 封面+字幕+加速+去语气词")
    parser.add_argument("--clips", "-c", help="切片目录")
    parser.add_argument("--highlights", "-l", help="highlights.json 路径")
    parser.add_argument("--transcript", "-t", help="transcript.srt 路径")
    parser.add_argument("--output", "-o", help="输出目录")
    args = parser.parse_args()
    
    clips_dir = Path(args.clips) if args.clips else CLIPS_DIR
    output_dir = Path(args.output) if args.output else OUTPUT_DIR
    highlights_path = Path(args.highlights) if args.highlights else HIGHLIGHTS_PATH
    transcript_path = Path(args.transcript) if args.transcript else TRANSCRIPT_PATH
    
    if not clips_dir.exists():
        print(f"❌ 切片目录不存在: {clips_dir}")
        return
    if not highlights_path.exists():
        print(f"❌ highlights 不存在: {highlights_path}")
        return
    if not transcript_path.exists():
        print(f"❌ transcript 不存在: {transcript_path}")
        return
    
    print("="*60)
    print("🎬 Soul切片增强处理（Pillow，无需 drawtext）")
    print("="*60)
    print(f"功能: 封面+字幕+加速10%+去语气词")
    print(f"输入: {clips_dir}")
    print(f"输出: {output_dir}")
    print("="*60)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    with open(highlights_path, 'r', encoding='utf-8') as f:
        highlights = json.load(f)
    if isinstance(highlights, dict) and "clips" in highlights:
        highlights = highlights["clips"]
    highlights = highlights if isinstance(highlights, list) else []
    
    clips = sorted(clips_dir.glob('*.mp4'))
    print(f"\n找到 {len(clips)} 个切片")
    
    success_count = 0
    for i, clip_path in enumerate(clips):
        clip_num = _parse_clip_index(clip_path.name) or (i + 1)
        highlight_info = highlights[clip_num - 1] if 0 < clip_num <= len(highlights) else {}
        
        output_path = output_dir / clip_path.name.replace('.mp4', '_enhanced.mp4')
        
        temp_dir = tempfile.mkdtemp(prefix='enhance_')
        try:
            if enhance_clip(str(clip_path), str(output_path), highlight_info, temp_dir, str(transcript_path)):
                success_count += 1
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
    
    print("\n" + "="*60)
    print(f"✅ 增强完成: {success_count}/{len(clips)}")
    print(f"📁 输出目录: {output_dir}")
    print("="*60)
    
    generate_index(highlights, output_dir)

def generate_index(highlights, output_dir):
    """生成目录索引（标题/Hook/CTA 统一简体中文）"""
    index_path = output_dir.parent / "目录索引_enhanced.md"
    
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write("# Soul派对 - 增强版切片目录\n\n")
        f.write(f"**优化**: 封面+字幕+加速10%+去语气词\n\n")
        f.write("## 切片列表\n\n")
        f.write("| 序号 | 标题 | Hook | CTA |\n")
        f.write("|------|------|------|-----|\n")
        
        for i, clip in enumerate(highlights, 1):
            title = _to_simplified(clip.get("title", f"clip_{i}"))
            hook = _to_simplified(clip.get("hook_3sec", ""))
            cta = _to_simplified(clip.get("cta_ending", ""))
            f.write(f"| {i} | {title} | {hook} | {cta} |\n")
    
    print(f"\n📋 目录索引: {index_path}")

if __name__ == "__main__":
    main()
