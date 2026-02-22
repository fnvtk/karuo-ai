#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
飞书妙记 · 按剪辑方案图片切片
============================

按「视频剪辑方案」图片中的 高峰时刻 + 想象的内容 整理切片，
去语助词、去空格、关键词高亮、加速10%。

用法：
  1. 先手动在飞书妙记页点击下载视频
  2. python3 feishu_image_slice.py --video "下载的视频.mp4"

或指定飞书链接（会打开链接，待你下载后监控 ~/Downloads）：
  python3 feishu_image_slice.py --url "https://cunkebao.feishu.cn/minutes/xxx"
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

# 图片方案：高峰时刻（7段，约10分钟内）
# 来源：视频剪辑方案 | 智能剪辑 - 提取高峰时刻
PEAK_MOMENTS = [
    {"start": "00:00:05", "end": "00:00:30", "title": "引出问题建立共鸣", "hook_3sec": "这个问题你遇到过吗？", "cta_ending": "关注我，每天学一招"},
    {"start": "00:01:15", "end": "00:02:00", "title": "解决方案核心价值", "hook_3sec": "核心方法来了", "cta_ending": "想学更多？评论区扣1"},
    {"start": "00:03:40", "end": "00:04:20", "title": "案例分享增加信任", "hook_3sec": "真实案例告诉你", "cta_ending": "关注获取完整案例"},
    {"start": "00:05:00", "end": "00:05:45", "title": "未来展望激发行动", "hook_3sec": "接下来这样做", "cta_ending": "行动起来，评论区见"},
    {"start": "00:06:30", "end": "00:07:10", "title": "痛点强调促成转化", "hook_3sec": "这个坑千万别踩", "cta_ending": "收藏避坑"},
    {"start": "00:08:00", "end": "00:08:50", "title": "福利展示刺激购买", "hook_3sec": "福利限时放送", "cta_ending": "私信领取"},
    {"start": "00:09:30", "end": "00:10:15", "title": "权威背书打消疑虑", "hook_3sec": "专业背书可信", "cta_ending": "关注我，每天学一招私域干货"},
]

# 想象的内容：用于 AI 识别时的关键词（若用转录）
IMAGINED_KEYWORDS = ["痛点", "解决方案", "场景", "案例", "数据", "情感", "号召"]

SCRIPT_DIR = Path(__file__).resolve().parent
SOUL_SLICE = Path("/Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/视频切片/脚本")
OUTPUT_BASE = Path.home() / "Downloads" / "feishu_image_clips"


def get_video_duration(path: Path) -> float:
    """获取视频时长（秒）"""
    cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration",
           "-of", "default=noprint_wrappers=1:nokey=1", str(path)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return float(r.stdout.strip()) if r.returncode == 0 else 0


def parse_time(s: str) -> float:
    """HH:MM:SS 或 MM:SS -> 秒"""
    parts = s.strip().split(":")
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    if len(parts) == 2:
        return int(parts[0]) * 60 + float(parts[1])
    return float(parts[0]) if parts else 0


def format_time(sec: float) -> str:
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def scale_highlights(highlights: list, duration_sec: float, template_end_sec: float = 615) -> list:
    """按视频时长缩放高峰时刻"""
    if duration_sec >= template_end_sec:
        return [{**h, "start_time": h["start"], "end_time": h["end"]}
                for h in highlights if parse_time(h["end"]) <= duration_sec]
    scale = duration_sec / template_end_sec
    out = []
    for h in highlights:
        start_sec = parse_time(h["start"]) * scale
        end_sec = parse_time(h["end"]) * scale
        if end_sec - start_sec < 15:
            continue
        out.append({
            **h,
            "start_time": format_time(start_sec),
            "end_time": format_time(end_sec),
        })
    return out


def find_recent_video(after_time: float) -> Path | None:
    down = Path.home() / "Downloads"
    cands = []
    for f in list(down.glob("*.mp4")) + list(down.glob("*.mov")):
        if f.stat().st_mtime > after_time:
            cands.append((f, f.stat().st_mtime))
    return max(cands, key=lambda x: x[1])[0] if cands else None


def main():
    parser = argparse.ArgumentParser(description="飞书妙记 · 按剪辑方案图片切片")
    parser.add_argument("--video", "-v", help="视频文件路径")
    parser.add_argument("--url", "-u", help="飞书妙记链接（会打开，待手动下载）")
    parser.add_argument("--output", "-o", help="输出目录")
    args = parser.parse_args()

    video_path = None
    if args.video:
        video_path = Path(args.video).resolve()
    elif args.url:
        print("📌 正在打开飞书链接，请在页面中点击【下载】按钮")
        subprocess.run(["open", args.url], check=True)
        start = time.time()
        print("⏳ 监控 ~/Downloads，检测到新视频后自动继续...")
        for _ in range(120):
            time.sleep(3)
            v = find_recent_video(start)
            if v and v.stat().st_size > 1_000_000:
                video_path = v
                print(f"✅ 检测到: {v.name}")
                break
        if not video_path:
            print("❌ 10分钟内未检测到新视频，请下载后使用 --video 指定路径")
            return

    if not video_path or not video_path.exists():
        print("❌ 请提供 --video 路径，或使用 --url 并完成下载")
        return

    duration = get_video_duration(video_path)
    print(f"📹 视频: {video_path.name}")
    print(f"   时长: {duration/60:.1f} 分钟")

    # 高峰时刻（按需缩放）
    template_end = parse_time(PEAK_MOMENTS[-1]["end"])
    highlights = scale_highlights(PEAK_MOMENTS, duration, template_end)
    for h in highlights:
        h["start_time"] = h.get("start_time") or h["start"]
        h["end_time"] = h.get("end_time") or h["end"]
    highlights = [h for h in highlights if parse_time(h["end_time"]) <= duration + 5]

    print(f"   切片: {len(highlights)} 段（高峰时刻方案）")

    # 输出目录
    out_dir = Path(args.output) if args.output else OUTPUT_BASE / video_path.stem
    out_dir.mkdir(parents=True, exist_ok=True)
    base_dir = out_dir / (video_path.stem + "_output")
    base_dir.mkdir(parents=True, exist_ok=True)

    transcript_path = base_dir / "transcript.srt"
    highlights_path = base_dir / "highlights.json"
    clips_dir = base_dir / "clips"
    enhanced_dir = base_dir / "clips_enhanced"

    # 保存 highlights
    with open(highlights_path, "w", encoding="utf-8") as f:
        json.dump(highlights, f, ensure_ascii=False, indent=2)

    # 1. 转录（可选，用于 soul_enhance 字幕；无则跳过增强的字幕烧录）
    if not transcript_path.exists():
        print("\n📝 提取音频 + MLX 转录...")
        audio_path = base_dir / "audio.wav"
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(video_path), "-vn", "-ar", "16000", "-ac", "1", str(audio_path)],
            capture_output=True, check=True
        )
        try:
            subprocess.run([
                "mlx_whisper", str(audio_path),
                "--model", "mlx-community/whisper-small-mlx", "--language", "zh",
                "--output-format", "srt", "--output-dir", str(base_dir), "--output-name", "transcript"
            ], capture_output=True, text=True, timeout=900)
        except Exception as e:
            print(f"   ⚠ 转录跳过: {e}")

    # 2. 批量切片
    print("\n✂️ 批量切片...")
    clips_dir.mkdir(parents=True, exist_ok=True)
    batch_clip = SOUL_SLICE / "batch_clip.py"
    subprocess.run([
        sys.executable, str(batch_clip),
        "--input", str(video_path),
        "--highlights", str(highlights_path),
        "--output", str(clips_dir),
        "--prefix", "peak",
    ], check=True)

    # 3. 增强（封面+字幕+加速10%）— 需 transcript
    if transcript_path.exists():
        soul_enhance = SOUL_SLICE / "soul_enhance.py"
        enhanced_dir.mkdir(parents=True, exist_ok=True)
        print("\n🎨 增强（加速10%+字幕+关键词高亮）...")
        subprocess.run([
            sys.executable, str(soul_enhance),
            "--clips", str(clips_dir),
            "--highlights", str(highlights_path),
            "--transcript", str(transcript_path),
            "--output", str(enhanced_dir),
        ], capture_output=True)
        result_dir = enhanced_dir
    else:
        # 仅加速10%（无字幕）
        print("\n⚡ 加速10%（无转录，跳过字幕）...")
        enhanced_dir.mkdir(parents=True, exist_ok=True)
        for f in sorted(clips_dir.glob("*.mp4")):
            out_f = enhanced_dir / f.name.replace(".mp4", "_enhanced.mp4")
            subprocess.run([
                "ffmpeg", "-y", "-i", str(f),
                "-filter_complex", "[0:v]setpts=0.909*PTS[v];[0:a]atempo=1.1[a]",
                "-map", "[v]", "-map", "[a]",
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "aac", "-b:a", "128k", str(out_f)
            ], capture_output=True)
        result_dir = enhanced_dir

    print("\n" + "=" * 50)
    print("✅ 完成")
    print("=" * 50)
    print(f"📂 切片: {clips_dir}")
    print(f"📂 增强: {result_dir}")
    print(f"📋 方案: {highlights_path}")


if __name__ == "__main__":
    main()
