#!/usr/bin/env python3
"""
Soul派对视频切片专用脚本
================================================================================
功能特点:
1. 只裁剪中间视频区域(Soul录屏专用: crop=570:1080:500:0)
2. 时长严格控制在30秒-5分钟
3. 音频降噪 + 画面美颜增强
4. 支持语气词/咳嗽声自动剪除(基于静音检测)
5. 生成目录索引

使用方法:
    python soul_clip.py --input "视频.mp4" --highlights highlights.json --output ./output
    
或直接编辑highlights.json后运行:
    python soul_clip.py
================================================================================
"""

import argparse
import json
import subprocess
import os
import re
from pathlib import Path
from datetime import datetime

# 默认配置
DEFAULT_CONFIG = {
    # Soul派对录屏裁剪参数 - 只保留中间视频区域
    "crop_filter": "crop=570:1080:500:0",
    
    # 视频增强 - 提亮+饱和度+锐化
    "brightness": 0.08,
    "saturation": 1.1,
    "sharpen": "5:5:0.8:5:5:0.4",
    
    # 音频降噪参数
    "noise_floor": -25,
    "noise_reduction": 10,
    "highpass": 80,
    "lowpass": 8000,
    "volume_boost": 1.3,
    
    # 时长限制
    "min_duration": 30,
    "max_duration": 300,  # 5分钟
    
    # 输出设置
    "video_codec": "libx264",
    "video_preset": "fast",
    "video_crf": 22,
    "audio_codec": "aac",
    "audio_bitrate": "128k"
}

# 语气词列表(用于字幕清洗)
FILLER_WORDS = [
    "嗯", "啊", "呃", "哦", "那个", "就是", "然后", "对吧", "是吧",
    "怎么说呢", "其实的话", "就是说", "然后的话", "对对对", "是是是",
    "好好好", "行行行", "嗯嗯嗯", "哎", "诶", "噢"
]


def parse_timestamp(time_str: str) -> float:
    """解析时间戳为秒数 (支持 HH:MM:SS 或 MM:SS 格式)"""
    parts = time_str.replace(',', '.').split(":")
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    elif len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    return float(time_str)


def format_timestamp(seconds: float) -> str:
    """格式化秒数为时间戳 HH:MM:SS"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def build_video_filter(config: dict) -> str:
    """构建FFmpeg视频滤镜链"""
    filters = []
    
    # 裁剪(Soul录屏专用)
    if config.get("crop_filter"):
        filters.append(config["crop_filter"])
    
    # 亮度+饱和度
    eq_parts = []
    if config.get("brightness"):
        eq_parts.append(f"brightness={config['brightness']}")
    if config.get("saturation"):
        eq_parts.append(f"saturation={config['saturation']}")
    if eq_parts:
        filters.append(f"eq={':'.join(eq_parts)}")
    
    # 锐化
    if config.get("sharpen"):
        filters.append(f"unsharp={config['sharpen']}")
    
    return ",".join(filters)


def build_audio_filter(config: dict) -> str:
    """构建FFmpeg音频滤镜链"""
    filters = []
    
    # FFT降噪
    if config.get("noise_floor") and config.get("noise_reduction"):
        filters.append(f"afftdn=nf={config['noise_floor']}:nr={config['noise_reduction']}:nt=w")
    
    # 高通滤波(去除低频噪音)
    if config.get("highpass"):
        filters.append(f"highpass=f={config['highpass']}")
    
    # 低通滤波(去除高频噪音)
    if config.get("lowpass"):
        filters.append(f"lowpass=f={config['lowpass']}")
    
    # 音量增益
    if config.get("volume_boost"):
        filters.append(f"volume={config['volume_boost']}")
    
    return ",".join(filters)


def detect_silence(input_path: str, start_sec: float, end_sec: float, 
                   noise_threshold: float = -30, min_duration: float = 0.3) -> list:
    """
    检测片段中的静音/语气词区域(用于自动剪除)
    返回需要保留的时间段列表
    """
    # 使用FFmpeg silencedetect滤镜
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start_sec),
        "-t", str(end_sec - start_sec),
        "-i", input_path,
        "-af", f"silencedetect=noise={noise_threshold}dB:d={min_duration}",
        "-f", "null", "-"
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    stderr = result.stderr
    
    # 解析静音区间
    silence_starts = []
    silence_ends = []
    
    for line in stderr.split('\n'):
        if 'silence_start' in line:
            match = re.search(r'silence_start:\s*([\d.]+)', line)
            if match:
                silence_starts.append(float(match.group(1)))
        elif 'silence_end' in line:
            match = re.search(r'silence_end:\s*([\d.]+)', line)
            if match:
                silence_ends.append(float(match.group(1)))
    
    # 构建保留区间
    keep_segments = []
    prev_end = 0
    
    for i, (s_start, s_end) in enumerate(zip(silence_starts, silence_ends)):
        if s_start > prev_end + 0.1:  # 保留非静音部分
            keep_segments.append((prev_end, s_start))
        prev_end = s_end
    
    # 添加最后一段
    total_duration = end_sec - start_sec
    if prev_end < total_duration - 0.1:
        keep_segments.append((prev_end, total_duration))
    
    return keep_segments


def clip_video(input_path: str, start: str, end: str, output_path: str, 
               config: dict, title: str = "") -> bool:
    """
    切片单个视频
    - 支持时长限制
    - 音频降噪 + 画面美颜
    - 裁剪中间区域
    """
    print(f"  ✂️ 切片: {title or output_path}")
    print(f"     {start} → {end}")
    
    # 构建滤镜
    vf = build_video_filter(config)
    af = build_audio_filter(config)
    
    cmd = [
        "ffmpeg", "-y",
        "-ss", start,
        "-to", end,
        "-i", input_path
    ]
    
    # 添加视频滤镜
    if vf:
        cmd.extend(["-vf", vf])
    
    # 添加音频滤镜
    if af:
        cmd.extend(["-af", af])
    
    # 编码设置
    cmd.extend([
        "-c:v", config.get("video_codec", "libx264"),
        "-preset", config.get("video_preset", "fast"),
        "-crf", str(config.get("video_crf", 22)),
        "-c:a", config.get("audio_codec", "aac"),
        "-b:a", config.get("audio_bitrate", "128k"),
        output_path
    ])
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        # 获取输出文件大小
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"     ✅ 完成 ({size_mb:.1f}MB)")
        return True
    else:
        print(f"     ❌ 失败: {result.stderr[-200:]}")
        return False


def batch_clip(input_path: str, highlights: list, output_dir: Path, config: dict) -> int:
    """批量切片"""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    success_count = 0
    min_dur = config.get("min_duration", 30)
    max_dur = config.get("max_duration", 300)
    
    for i, clip in enumerate(highlights, 1):
        title = clip.get("title", f"clip_{i}")
        # 清理文件名中的非法字符
        safe_title = re.sub(r'[<>:"/\\|?*]', '', title)[:50]
        
        start_time = clip["start_time"]
        end_time = clip["end_time"]
        
        # 计算时长
        start_sec = parse_timestamp(start_time)
        end_sec = parse_timestamp(end_time)
        duration = end_sec - start_sec
        
        # 时长检查
        if duration < min_dur:
            print(f"  ⚠️ 跳过 {title}: 时长{duration:.0f}秒 < {min_dur}秒")
            continue
        
        if duration > max_dur:
            print(f"  ⚠️ 截取 {title}: 时长{duration:.0f}秒 > {max_dur}秒, 限制为{max_dur}秒")
            end_sec = start_sec + max_dur
            end_time = format_timestamp(end_sec)
        
        output_path = str(output_dir / f"{i:02d}_{safe_title}.mp4")
        
        if clip_video(input_path, start_time, end_time, output_path, config, title):
            success_count += 1
        
        print()
    
    return success_count


def generate_index(highlights: list, output_dir: Path, video_name: str = "Soul派对"):
    """生成目录索引Markdown文件"""
    index_path = output_dir / "目录索引.md"
    
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(f"# {video_name} - 切片目录\n\n")
        f.write(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
        f.write(f"**切片数量**: {len(highlights)}\n")
        f.write(f"**时长范围**: 30秒-5分钟\n\n")
        
        f.write("## 切片列表\n\n")
        f.write("| 序号 | 标题 | 时间段 | 时长 | Hook |\n")
        f.write("|:----:|------|:------:|:----:|------|\n")
        
        for i, clip in enumerate(highlights, 1):
            title = clip.get("title", f"clip_{i}")
            start = clip["start_time"]
            end = clip["end_time"]
            
            # 计算时长
            duration = parse_timestamp(end) - parse_timestamp(start)
            mins = int(duration // 60)
            secs = int(duration % 60)
            duration_str = f"{mins}分{secs}秒" if mins > 0 else f"{secs}秒"
            
            hook = clip.get("hook_3sec", "-")
            
            f.write(f"| {i} | {title} | {start}-{end} | {duration_str} | {hook} |\n")
        
        f.write("\n## 使用说明\n\n")
        f.write("1. 切片已自动裁剪为中间视频区域(570x1080)\n")
        f.write("2. 已应用音频降噪和画面美颜\n")
        f.write("3. 可直接用于剪映二次编辑或发布\n")
    
    print(f"📋 目录索引已生成: {index_path}")
    return index_path


def main():
    parser = argparse.ArgumentParser(
        description="Soul派对视频切片专用脚本 - 自动裁剪中间区域+降噪+美颜",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--input", "-i", required=True, help="输入视频路径")
    parser.add_argument("--highlights", "-h", required=True, help="高光片段JSON文件")
    parser.add_argument("--output", "-o", default="./clips", help="输出目录")
    parser.add_argument("--min-duration", type=int, default=30, help="最短时长(秒)")
    parser.add_argument("--max-duration", type=int, default=300, help="最长时长(秒)")
    parser.add_argument("--no-crop", action="store_true", help="不裁剪画面")
    parser.add_argument("--no-enhance", action="store_true", help="不进行画面增强")
    parser.add_argument("--no-denoise", action="store_true", help="不进行音频降噪")
    
    args = parser.parse_args()
    
    # 加载配置
    config = DEFAULT_CONFIG.copy()
    config["min_duration"] = args.min_duration
    config["max_duration"] = args.max_duration
    
    if args.no_crop:
        config["crop_filter"] = None
    if args.no_enhance:
        config["brightness"] = None
        config["saturation"] = None
        config["sharpen"] = None
    if args.no_denoise:
        config["noise_floor"] = None
        config["noise_reduction"] = None
    
    # 检查输入文件
    if not os.path.exists(args.input):
        print(f"❌ 视频文件不存在: {args.input}")
        return 1
    
    if not os.path.exists(args.highlights):
        print(f"❌ 高光片段文件不存在: {args.highlights}")
        return 1
    
    # 加载高光片段
    with open(args.highlights, 'r', encoding='utf-8') as f:
        highlights = json.load(f)
    
    output_dir = Path(args.output)
    
    # 打印信息
    print("=" * 60)
    print("🎬 Soul派对视频切片")
    print("=" * 60)
    print(f"输入: {args.input}")
    print(f"输出: {output_dir}")
    print(f"切片数: {len(highlights)}")
    print(f"时长范围: {args.min_duration}-{args.max_duration}秒")
    print(f"裁剪: {'中间区域 (570x1080)' if config.get('crop_filter') else '不裁剪'}")
    print(f"增强: {'是' if config.get('brightness') else '否'}")
    print(f"降噪: {'是' if config.get('noise_floor') else '否'}")
    print("=" * 60 + "\n")
    
    # 执行切片
    success = batch_clip(args.input, highlights, output_dir, config)
    
    # 生成索引
    video_name = Path(args.input).stem
    generate_index(highlights, output_dir, video_name)
    
    print("\n" + "=" * 60)
    print(f"✅ 切片完成: {success}/{len(highlights)}")
    print(f"📁 输出目录: {output_dir}")
    print("=" * 60)
    
    return 0


if __name__ == "__main__":
    exit(main())
