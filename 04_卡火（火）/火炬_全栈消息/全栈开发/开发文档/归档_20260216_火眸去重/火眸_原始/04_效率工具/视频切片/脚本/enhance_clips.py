#!/usr/bin/env python3
"""
切片增强脚本
为切片视频添加前3秒Hook文字和结尾CTA文字
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


def get_video_duration(video_path: str) -> float:
    """获取视频时长"""
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return float(result.stdout.strip())
    except:
        return 60.0


def get_video_dimensions(video_path: str) -> tuple:
    """获取视频尺寸"""
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "csv=p=0",
            video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        width, height = result.stdout.strip().split(",")
        return int(width), int(height)
    except:
        return 1080, 1920


def add_text_overlay(
    input_path: str,
    output_path: str,
    text: str,
    start_time: float,
    duration: float,
    position: str = "top",  # top, bottom, center
    font_size: int = 48,
    font_color: str = "white",
    bg_color: str = "black@0.5",
    font_path: str = None
):
    """
    使用 FFmpeg 添加文字叠加层
    """
    width, height = get_video_dimensions(input_path)
    
    # 计算位置
    if position == "top":
        y_pos = f"h*0.15"
    elif position == "bottom":
        y_pos = f"h*0.85-th"
    else:
        y_pos = f"(h-th)/2"
    
    # 构建 drawtext 滤镜
    # 使用系统中文字体
    if font_path is None:
        # Mac 系统中文字体
        font_candidates = [
            "/System/Library/Fonts/PingFang.ttc",
            "/System/Library/Fonts/STHeiti Light.ttc",
            "/Library/Fonts/Arial Unicode.ttf"
        ]
        for font in font_candidates:
            if os.path.exists(font):
                font_path = font
                break
    
    # 转义文字中的特殊字符
    escaped_text = text.replace("'", "'\\''").replace(":", "\\:")
    
    filter_str = (
        f"drawtext=text='{escaped_text}'"
        f":fontfile='{font_path}'"
        f":fontsize={font_size}"
        f":fontcolor={font_color}"
        f":x=(w-tw)/2"
        f":y={y_pos}"
        f":box=1:boxcolor={bg_color}:boxborderw=10"
        f":enable='between(t,{start_time},{start_time + duration})'"
    )
    
    return filter_str


def enhance_clip(
    input_path: str,
    output_path: str,
    hook_text: str = None,
    hook_duration: float = 3.0,
    cta_text: str = None,
    cta_duration: float = 5.0,
    font_size: int = 48
):
    """
    增强单个切片：添加Hook和CTA
    """
    filters = []
    
    video_duration = get_video_duration(input_path)
    
    # 添加Hook文字（前3秒）
    if hook_text:
        hook_filter = add_text_overlay(
            input_path,
            output_path,
            hook_text,
            start_time=0,
            duration=hook_duration,
            position="top",
            font_size=font_size + 8,  # Hook字体稍大
            font_color="yellow"
        )
        filters.append(hook_filter)
    
    # 添加CTA文字（最后几秒）
    if cta_text:
        cta_start = max(0, video_duration - cta_duration)
        cta_filter = add_text_overlay(
            input_path,
            output_path,
            cta_text,
            start_time=cta_start,
            duration=cta_duration,
            position="bottom",
            font_size=font_size,
            font_color="white"
        )
        filters.append(cta_filter)
    
    if not filters:
        # 没有需要添加的内容，直接复制
        import shutil
        shutil.copy(input_path, output_path)
        return True
    
    # 组合滤镜
    filter_complex = ",".join(filters)
    
    cmd = [
        "ffmpeg",
        "-i", input_path,
        "-vf", filter_complex,
        "-c:a", "copy",
        "-y",
        output_path
    ]
    
    try:
        subprocess.run(cmd, capture_output=True, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"  ❌ FFmpeg 错误: {e.stderr.decode() if e.stderr else str(e)}")
        return False


def main():
    parser = argparse.ArgumentParser(description="切片增强 - 添加Hook和CTA文字")
    parser.add_argument("--clips_dir", "-c", required=True, help="切片视频目录")
    parser.add_argument("--highlights", help="高光片段JSON文件（含Hook/CTA）")
    parser.add_argument("--output_dir", "-o", help="输出目录")
    parser.add_argument("--hook_duration", type=float, default=3.0, help="Hook显示时长（秒）")
    parser.add_argument("--cta_duration", type=float, default=5.0, help="CTA显示时长（秒）")
    parser.add_argument("--default_cta", default="关注我，获取更多干货", help="默认CTA文案")
    parser.add_argument("--font_size", type=int, default=48, help="字体大小")
    
    args = parser.parse_args()
    
    clips_dir = Path(args.clips_dir)
    if not clips_dir.exists():
        print(f"❌ 切片目录不存在: {clips_dir}")
        sys.exit(1)
    
    # 加载高光片段信息
    highlights = []
    if args.highlights:
        highlights_path = Path(args.highlights)
        if highlights_path.exists():
            with open(highlights_path, "r", encoding="utf-8") as f:
                highlights = json.load(f)
    
    # 获取所有切片文件
    clip_files = sorted(clips_dir.glob("*.mp4"))
    if not clip_files:
        print(f"❌ 没有找到切片文件: {clips_dir}")
        sys.exit(1)
    
    # 创建输出目录
    if args.output_dir:
        output_dir = Path(args.output_dir)
    else:
        output_dir = clips_dir.parent / "clips_enhanced"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("="*60)
    print("🎨 切片增强工具")
    print("="*60)
    print(f"输入目录: {clips_dir}")
    print(f"输出目录: {output_dir}")
    print(f"切片数量: {len(clip_files)}")
    print(f"Hook时长: {args.hook_duration}秒")
    print(f"CTA时长: {args.cta_duration}秒")
    print("="*60)
    
    success_count = 0
    
    for i, clip_path in enumerate(clip_files):
        # 获取对应的高光片段信息
        if i < len(highlights):
            hl = highlights[i]
            hook_text = hl.get("hook_3sec", "")
            cta_text = hl.get("cta_ending", args.default_cta)
            title = hl.get("title", clip_path.stem)
        else:
            hook_text = ""
            cta_text = args.default_cta
            title = clip_path.stem
        
        # 生成输出文件名
        output_path = output_dir / f"{clip_path.stem}_enhanced.mp4"
        
        print(f"\n[{i+1}/{len(clip_files)}] {title}")
        if hook_text:
            print(f"  Hook: {hook_text}")
        if cta_text:
            print(f"  CTA: {cta_text}")
        
        # 增强切片
        if enhance_clip(
            str(clip_path),
            str(output_path),
            hook_text=hook_text if hook_text else None,
            hook_duration=args.hook_duration,
            cta_text=cta_text if cta_text else None,
            cta_duration=args.cta_duration,
            font_size=args.font_size
        ):
            print(f"  ✅ 完成: {output_path.name}")
            success_count += 1
        else:
            print(f"  ❌ 失败")
    
    print("\n" + "="*60)
    print(f"✅ 增强完成: {success_count}/{len(clip_files)} 个视频")
    print(f"📂 输出目录: {output_dir}")
    print("="*60)
    
    # 如果全部失败，提示可能的原因
    if success_count == 0:
        print("""
可能的原因：
1. FFmpeg 未安装或版本过低
2. 中文字体路径不正确
3. 视频格式不支持

解决方法：
1. 安装 FFmpeg: brew install ffmpeg
2. 检查字体文件是否存在
3. 使用剪映手动添加文字（更推荐）
""")


if __name__ == "__main__":
    main()
