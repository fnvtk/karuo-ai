#!/usr/bin/env python3
"""
一键视频处理 - 只输出一个带字幕的最终成片
用法: python3 one_video.py -i video.mp4 [-o output.mp4] [--title "标题"]

流程：
1. 提取音频
2. MLX Whisper转录
3. 繁转简+字幕清洗
4. 视频增强（降噪+美颜）
5. 烧录字幕
6. 输出单个成片
"""

import argparse
import os
import re
import subprocess
import sys
import tempfile
import shutil
from pathlib import Path

# ============ 配置 ============

SKILL_DIR = Path(__file__).parent.parent
FONTS_DIR = SKILL_DIR / "fonts"

# 字幕清洗：语气词
FILLER_WORDS = ['嗯,', '嗯，', '啊,', '啊，', '呃,', '呃，', '哦,', '哦，', '那个,', '那个，', '就是,', '就是说,']

# 字幕清洗：常见转录错误
CORRECTIONS = {
    '私余': '私域', '统安': '同安', '信一下': '线上', '头里': '投入',
    '幅画': '负责', '施育': '私域', '经历论': '净利润', '成于': '乘以',
    '马的': '码的', '猜济': '拆解', '巨圣': '矩阵', '货客': '获客',
}


def run_cmd(cmd, desc=None, timeout=300, check=True):
    """运行命令并显示进度"""
    if desc:
        print(f"  {desc}...", end=" ", flush=True)
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        if check and result.returncode != 0:
            print("❌")
            print(f"    错误: {result.stderr[:200]}")
            return False
        if desc:
            print("✓")
        return True
    except subprocess.TimeoutExpired:
        print("⏰ 超时")
        return False
    except Exception as e:
        print(f"❌ {e}")
        return False


def get_video_info(video_path):
    """获取视频信息"""
    cmd = [
        'ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,duration',
        '-show_entries', 'format=duration',
        '-of', 'json', video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    import json
    data = json.loads(result.stdout)
    
    width = height = duration = 0
    if 'streams' in data and data['streams']:
        width = int(data['streams'][0].get('width', 1920))
        height = int(data['streams'][0].get('height', 1080))
    if 'format' in data:
        duration = float(data['format'].get('duration', 0))
    
    return {'width': width, 'height': height, 'duration': duration}


def extract_audio(video_path, audio_path):
    """提取音频"""
    cmd = ['ffmpeg', '-y', '-i', video_path, '-vn', '-ar', '16000', '-ac', '1', audio_path]
    return run_cmd(cmd, "提取音频")


def transcribe_mlx(audio_path, output_dir):
    """MLX Whisper转录"""
    print("  MLX Whisper转录...", end=" ", flush=True)
    
    # 构建mlx_whisper命令
    cmd = [
        'mlx_whisper', audio_path,
        '--model', 'mlx-community/whisper-small-mlx',
        '--language', 'zh',
        '--output-format', 'srt',
        '--output-dir', str(output_dir),
        '--output-name', 'transcript'
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode == 0:
            print("✓")
            return True
        else:
            print("❌")
            print(f"    {result.stderr[:200]}")
            return False
    except Exception as e:
        print(f"❌ {e}")
        return False


def clean_subtitles(srt_path, output_path):
    """清洗字幕：繁转简+去语气词+修正错误"""
    print("  字幕清洗...", end=" ", flush=True)
    
    try:
        from opencc import OpenCC
        cc = OpenCC('t2s')
    except ImportError:
        cc = None
    
    with open(srt_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 繁转简
    if cc:
        content = cc.convert(content)
    
    # 去语气词
    for word in FILLER_WORDS:
        content = content.replace(word, '')
    
    # 修正错误
    for wrong, correct in CORRECTIONS.items():
        content = content.replace(wrong, correct)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✓")
    return True


def enhance_video(video_path, output_path):
    """视频增强：降噪+美颜+音量标准化"""
    cmd = [
        'ffmpeg', '-y', '-i', video_path,
        '-vf', 'eq=brightness=0.05:saturation=1.1',
        '-af', 'afftdn=nf=-25:nr=10:nt=w,highpass=f=80,lowpass=f=8000,volume=1.2',
        '-c:v', 'h264_videotoolbox', '-b:v', '5M',
        '-c:a', 'aac', '-b:a', '128k',
        output_path
    ]
    return run_cmd(cmd, "视频增强（降噪+美颜）", timeout=600)


def burn_subtitles_moviepy(video_path, srt_path, output_path, max_subs=80):
    """使用moviepy烧录字幕"""
    print("  烧录字幕...", end=" ", flush=True)
    
    try:
        from moviepy import VideoFileClip, TextClip, CompositeVideoClip
    except ImportError:
        print("❌ 缺少moviepy")
        return False
    
    # 解析SRT
    def parse_srt(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        pattern = r'(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n(.*?)(?=\n\n|\Z)'
        matches = re.findall(pattern, content, re.DOTALL)
        subs = []
        for m in matches:
            text = m[3].strip().replace('\n', ' ')
            if len(text) > 3:
                start = sum(float(x) * 60 ** i for i, x in enumerate(reversed(m[1].replace(',', '.').split(':'))))
                end = sum(float(x) * 60 ** i for i, x in enumerate(reversed(m[2].replace(',', '.').split(':'))))
                subs.append({'start': start, 'end': end, 'text': text})
        return subs
    
    try:
        video = VideoFileClip(video_path)
        subs = parse_srt(srt_path)[:max_subs]
        
        # 计算合适的字体大小（竖屏用大字，横屏用小字）
        is_vertical = video.size[1] > video.size[0]
        font_size = 42 if is_vertical else 36
        margin_bottom = 120 if is_vertical else 80
        
        subtitle_clips = []
        for sub in subs:
            try:
                txt_clip = TextClip(
                    text=sub['text'],
                    font='/System/Library/Fonts/STHeiti Medium.ttc',
                    font_size=font_size,
                    color='white',
                    stroke_color='black',
                    stroke_width=2,
                    method='caption',
                    size=(video.size[0] - 60, None)
                )
                txt_clip = txt_clip.with_position(('center', video.size[1] - margin_bottom))
                txt_clip = txt_clip.with_start(sub['start']).with_end(sub['end'])
                subtitle_clips.append(txt_clip)
            except:
                continue
        
        final = CompositeVideoClip([video] + subtitle_clips)
        final.write_videofile(
            output_path,
            codec='libx264',
            audio_codec='aac',
            fps=30,
            preset='fast',
            threads=4,
            logger=None
        )
        print("✓")
        return True
    except Exception as e:
        print(f"❌ {e}")
        return False


def process_video(input_path, output_path=None, title=None):
    """主处理流程"""
    
    input_path = os.path.abspath(input_path)
    if not os.path.exists(input_path):
        print(f"❌ 文件不存在: {input_path}")
        return False
    
    # 输出路径
    if not output_path:
        base = os.path.splitext(input_path)[0]
        output_path = f"{base}_带字幕.mp4"
    output_path = os.path.abspath(output_path)
    
    # 视频信息
    info = get_video_info(input_path)
    duration_min = info['duration'] / 60
    
    print("=" * 50)
    print("🎬 一键视频处理")
    print("=" * 50)
    print(f"输入: {os.path.basename(input_path)}")
    print(f"时长: {duration_min:.1f}分钟")
    print(f"分辨率: {info['width']}x{info['height']}")
    print(f"输出: {os.path.basename(output_path)}")
    print("-" * 50)
    
    # 创建临时目录
    temp_dir = tempfile.mkdtemp(prefix='video_process_')
    
    try:
        # 1. 提取音频
        audio_path = os.path.join(temp_dir, 'audio.wav')
        if not extract_audio(input_path, audio_path):
            return False
        
        # 2. 转录
        if not transcribe_mlx(audio_path, temp_dir):
            return False
        
        # 3. 字幕清洗
        srt_raw = os.path.join(temp_dir, 'transcript.srt')
        srt_clean = os.path.join(temp_dir, 'transcript_clean.srt')
        if os.path.exists(srt_raw):
            clean_subtitles(srt_raw, srt_clean)
        else:
            print(f"  ⚠️ 未找到字幕文件")
            return False
        
        # 4. 视频增强
        enhanced_path = os.path.join(temp_dir, 'enhanced.mp4')
        if not enhance_video(input_path, enhanced_path):
            # 增强失败则使用原视频
            enhanced_path = input_path
        
        # 5. 烧录字幕
        if not burn_subtitles_moviepy(enhanced_path, srt_clean, output_path):
            return False
        
        # 完成
        print("-" * 50)
        if os.path.exists(output_path):
            size_mb = os.path.getsize(output_path) / (1024 * 1024)
            print(f"✅ 完成: {os.path.basename(output_path)} ({size_mb:.1f}MB)")
            return True
        else:
            print("❌ 输出文件生成失败")
            return False
    
    finally:
        # 清理临时文件
        shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(
        description='一键视频处理 - 只输出一个带字幕的成片',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python3 one_video.py -i video.mp4
  python3 one_video.py -i video.mp4 -o output.mp4
  python3 one_video.py -i video.mp4 --title "会议标题"
        """
    )
    parser.add_argument('-i', '--input', required=True, help='输入视频路径')
    parser.add_argument('-o', '--output', help='输出视频路径（默认: 原文件名_带字幕.mp4）')
    parser.add_argument('--title', help='视频标题（可选）')
    
    args = parser.parse_args()
    
    success = process_video(args.input, args.output, args.title)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
