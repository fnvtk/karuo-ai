#!/usr/bin/env python3
"""
批量切片脚本
根据高光片段JSON批量导出视频切片
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


def parse_timestamp(time_str: str) -> float:
    """解析时间戳字符串为秒数"""
    time_str = str(time_str).strip()
    
    # 处理纯数字（秒数）
    try:
        return float(time_str)
    except ValueError:
        pass
    
    # 处理 HH:MM:SS 或 MM:SS 格式
    parts = time_str.split(":")
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    elif len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    else:
        raise ValueError(f"无法解析时间戳: {time_str}")


def format_timestamp(seconds: float) -> str:
    """格式化秒数为 HH:MM:SS"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def _to_simplified(text: str) -> str:
    """转为简体中文（用于文件名/标题）"""
    try:
        from opencc import OpenCC
        return OpenCC("t2s").convert(str(text))
    except ImportError:
        return str(text)


def sanitize_filename(name: str, max_length: int = 50) -> str:
    """清理文件名，移除非法字符，标题统一简体"""
    name = _to_simplified(str(name))
    # 保留字母、数字、中文、空格、下划线、连字符
    safe_chars = []
    for c in name:
        if c.isalnum() or c in " _-" or '\u4e00' <= c <= '\u9fff':
            safe_chars.append(c)
    
    result = "".join(safe_chars).strip()
    if len(result) > max_length:
        result = result[:max_length]
    
    return result or "clip"


def clip_video(input_path: str, start_time: str, end_time: str, output_path: str, 
               fast_mode: bool = False):
    """
    切片单个视频
    
    Args:
        input_path: 输入视频路径
        start_time: 开始时间
        end_time: 结束时间
        output_path: 输出路径
        fast_mode: 快速模式（使用copy编码，可能不精确）
    """
    if fast_mode:
        # 快速模式：使用copy编码，速度快但可能不精确
        cmd = [
            "ffmpeg",
            "-ss", start_time,
            "-i", input_path,
            "-to", end_time,
            "-c", "copy",
            "-avoid_negative_ts", "1",
            "-y",
            output_path
        ]
    else:
        # 精确模式：重新编码，速度慢但精确
        cmd = [
            "ffmpeg",
            "-i", input_path,
            "-ss", start_time,
            "-to", end_time,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            "-y",
            output_path
        ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg错误: {result.stderr}")


def batch_clip(input_video: str, highlights_json: str, output_dir: str = None,
               fast_mode: bool = False, prefix: str = ""):
    """
    批量切片
    
    Args:
        input_video: 输入视频路径
        highlights_json: 高光片段JSON文件路径
        output_dir: 输出目录
        fast_mode: 快速模式
        prefix: 输出文件前缀
    """
    input_path = Path(input_video)
    if not input_path.exists():
        print(f"❌ 视频文件不存在: {input_path}")
        sys.exit(1)
    
    # 读取高光片段JSON
    with open(highlights_json, "r", encoding="utf-8") as f:
        highlights = json.load(f)
    
    # 支持不同的JSON格式
    if isinstance(highlights, dict) and "clips" in highlights:
        highlights = highlights["clips"]
    
    if not highlights:
        print("❌ 高光片段列表为空")
        sys.exit(1)
    
    # 确定输出目录
    if output_dir:
        output_dir = Path(output_dir)
    else:
        output_dir = input_path.parent / "clips"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("="*60)
    print("✂️  批量切片")
    print("="*60)
    print(f"输入视频: {input_path}")
    print(f"切片数量: {len(highlights)}")
    print(f"输出目录: {output_dir}")
    print(f"模式: {'快速' if fast_mode else '精确'}")
    print("="*60)
    print()
    
    # 统计
    success_count = 0
    fail_count = 0
    
    for i, clip in enumerate(highlights, 1):
        # 获取时间信息
        start_time = clip.get("start_time") or clip.get("start")
        end_time = clip.get("end_time") or clip.get("end")
        
        if not start_time or not end_time:
            print(f"   [{i}] ⚠️  跳过：缺少时间信息")
            fail_count += 1
            continue
        
        # 获取标题
        title = clip.get("title") or clip.get("name") or f"clip_{i}"
        safe_title = sanitize_filename(title)
        
        # 计算时长
        try:
            start_sec = parse_timestamp(start_time)
            end_sec = parse_timestamp(end_time)
            duration = end_sec - start_sec
        except ValueError as e:
            print(f"   [{i}] ⚠️  跳过：{e}")
            fail_count += 1
            continue
        
        # 输出文件名
        if prefix:
            filename = f"{prefix}_{i:02d}_{safe_title}.mp4"
        else:
            filename = f"{i:02d}_{safe_title}.mp4"
        output_path = output_dir / filename
        
        print(f"   [{i}/{len(highlights)}] {safe_title}")
        print(f"       时间: {start_time} → {end_time} ({duration:.1f}秒)")
        
        try:
            clip_video(str(input_path), str(start_time), str(end_time), 
                      str(output_path), fast_mode)
            print(f"       ✅ 完成: {output_path.name}")
            success_count += 1
        except Exception as e:
            print(f"       ❌ 失败: {e}")
            fail_count += 1
    
    print()
    print("="*60)
    print(f"📊 切片完成")
    print("="*60)
    print(f"   成功: {success_count}")
    print(f"   失败: {fail_count}")
    print(f"   输出目录: {output_dir}")
    print("="*60)
    
    # 生成切片清单
    manifest_path = output_dir / "clips_manifest.json"
    manifest = {
        "source_video": str(input_path),
        "total_clips": len(highlights),
        "success": success_count,
        "failed": fail_count,
        "clips": []
    }
    
    for i, clip in enumerate(highlights, 1):
        title = clip.get("title") or clip.get("name") or f"clip_{i}"
        safe_title = sanitize_filename(title)
        if prefix:
            filename = f"{prefix}_{i:02d}_{safe_title}.mp4"
        else:
            filename = f"{i:02d}_{safe_title}.mp4"
        
        manifest["clips"].append({
            "index": i,
            "filename": filename,
            "title": title,
            "start_time": clip.get("start_time") or clip.get("start"),
            "end_time": clip.get("end_time") or clip.get("end"),
            "hook": clip.get("hook", ""),
            "virality_score": clip.get("virality_score", 0)
        })
    
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    
    print(f"\n📋 切片清单已保存: {manifest_path}")


def main():
    parser = argparse.ArgumentParser(description="批量视频切片工具")
    parser.add_argument("--input", "-i", required=True, help="输入视频路径")
    parser.add_argument("--highlights", "-l", required=True, help="高光片段JSON文件")
    parser.add_argument("--output", "-o", help="输出目录")
    parser.add_argument("--fast", "-f", action="store_true", help="快速模式（使用copy编码）")
    parser.add_argument("--prefix", "-p", default="", help="输出文件前缀")
    
    args = parser.parse_args()
    
    batch_clip(args.input, args.highlights, args.output, args.fast, args.prefix)


if __name__ == "__main__":
    main()
