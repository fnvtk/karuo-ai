#!/usr/bin/env python3
"""
批量切片脚本
根据高光片段JSON批量导出视频切片
"""

import argparse
import atexit
import json
import os
import re
import subprocess
import sys
from pathlib import Path


def _kill_child_ffmpeg_on_exit():
    """脚本退出时（含 Ctrl+C）杀死本进程启动的 ffmpeg 子进程，避免剪辑结束后仍占用 CPU。"""
    try:
        subprocess.run(
            ["pkill", "-P", str(os.getpid()), "ffmpeg"],
            capture_output=True,
            timeout=2,
        )
    except Exception:
        pass


atexit.register(_kill_child_ffmpeg_on_exit)


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


def _is_mostly_chinese(text: str) -> bool:
    """判断是否主要为中文"""
    if not text or not isinstance(text, str):
        return False
    chinese = sum(1 for c in text if "\u4e00" <= c <= "\u9fff")
    return chinese / max(1, len(text.strip())) > 0.3


def _title_no_slash(s: str) -> str:
    """标题去杠：：｜、—、/ 等替换为空格，与 soul_enhance 一致"""
    if not s:
        return s
    s = str(s).strip()
    for c in "：:｜|—－-/、":
        s = s.replace(c, " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


_SAFE_CJK_PUNCT = set("，。？！；：·、…（）【】「」《》～—·+")


def sanitize_filename(name: str, max_length: int = 50, chinese_only: bool = False) -> str:
    """清理文件名：去杠去下划线，保留中文、ASCII字母数字（MBTI/AI/ENFJ等）、安全标点与空格"""
    name = _title_no_slash(name) or _to_simplified(str(name))
    safe_chars = []
    for c in name:
        if (c == " "
                or "\u4e00" <= c <= "\u9fff"
                or c.isalnum()
                or c in _SAFE_CJK_PUNCT):
            safe_chars.append(c)
    result = "".join(safe_chars).strip()
    result = __import__('re').sub(r"\s+", " ", result).strip()
    if len(result) > max_length:
        result = result[:max_length]
    return result.strip(" _-") or "片段"


# 精确切片：-ss 在 -i 之前会落在关键帧上，输出起点常比 highlights.start 早 0～3s，
# transcript 按绝对时间裁切 → 字幕会整体偏早/偏晚。先粗 seek 再在 -i 之后细 -ss（重编码）可对齐口播。
_PRESEEK_MARGIN_SEC = 120.0


def clip_video(input_path: str, start_time: str, end_time: str, output_path: str, 
               fast_mode: bool = False):
    """
    切片单个视频
    
    Args:
        input_path: 输入视频路径
        start_time: 开始时间
        end_time: 结束时间
        output_path: 输出路径
        fast_mode: 快速模式（使用 copy 编码，可能不精确）
    """
    # 使用 -t duration 避免 -to 在 ffmpeg 中的歧义（-to 可能被解释为输出时长）
    start_sec = parse_timestamp(start_time)
    end_sec = parse_timestamp(end_time)
    duration_sec = end_sec - start_sec

    if fast_mode:
        # 快速模式：stream copy + input 侧 -ss，起点可能早于 start_time（关键帧），
        # 与整场 transcript 对齐烧录时易出现「声对字不对」。成片要求对齐时请用默认精确模式。
        cmd = [
            "ffmpeg",
            "-ss", start_time,
            "-i", input_path,
            "-t", str(duration_sec),
            "-c", "copy",
            "-avoid_negative_ts", "make_zero",
            "-y",
            output_path
        ]
    else:
        # 精确模式：粗 seek + 解码后细裁，起点与 highlights 一致，字幕与声音可对齐
        preseek = max(0.0, start_sec - _PRESEEK_MARGIN_SEC)
        inner_ss = start_sec - preseek
        cmd = [
            "ffmpeg",
            "-y",
            "-ss", str(preseek),
            "-i", input_path,
            "-ss", str(inner_ss),
            "-t", str(duration_sec),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-b:v", "3M",
            "-maxrate", "4M",
            "-c:a", "aac",
            "-b:a", "128k",
            "-avoid_negative_ts", "make_zero",
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
    # 清空已有切片，避免重复
    for f in output_dir.glob("*.mp4"):
        f.unlink()
    
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
        
        # 获取标题：优先 file_stem（成片短文件名/抽象主题），否则 title/name
        title = (
            (clip.get("file_stem") or "").strip()
            or clip.get("title")
            or clip.get("name")
            or f"clip_{i}"
        )
        safe_title = sanitize_filename(title, max_length=12)
        
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
        title = (
            (clip.get("file_stem") or "").strip()
            or clip.get("title")
            or clip.get("name")
            or f"clip_{i}"
        )
        safe_title = sanitize_filename(title, max_length=12)
        if prefix:
            filename = f"{prefix}_{i:02d}_{safe_title}.mp4"
        else:
            filename = f"{i:02d}_{safe_title}.mp4"
        
        manifest["clips"].append({
            "index": i,
            "filename": filename,
            "title": clip.get("title") or "",
            "file_stem": clip.get("file_stem") or "",
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
