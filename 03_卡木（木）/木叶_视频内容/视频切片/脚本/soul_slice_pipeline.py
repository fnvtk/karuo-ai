#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Soul 切片一体化流水线
视频制作（封面/Hook格式）+ 视频切片

流程：转录 → 高光识别(AI) → 批量切片 → 增强(封面+Hook+CTA)
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

# 脚本所在目录
SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
FONTS_DIR = SKILL_DIR / "fonts"


def run(cmd: list, desc: str = "", check: bool = True, timeout: int = 600) -> bool:
    if desc:
        print(f"  {desc}...", flush=True)
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        if check and r.returncode != 0:
            print(f"    ❌ 错误: {r.stderr[:300]}")
            return False
        if desc:
            print("    ✓")
        return True
    except subprocess.TimeoutExpired:
        print("    ⏰ 超时")
        return False
    except Exception as e:
        print(f"    ❌ {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Soul 切片一体化流水线")
    parser.add_argument("--video", "-v", required=True, help="输入视频路径")
    parser.add_argument("--output", "-o", help="输出目录（默认：视频同目录下 视频名_output）")
    parser.add_argument("--clips", "-n", type=int, default=8, help="切片数量")
    parser.add_argument("--skip-transcribe", action="store_true", help="跳过转录（已有 transcript.srt）")
    parser.add_argument("--skip-highlights", action="store_true", help="跳过高光识别（已有 highlights.json）")
    args = parser.parse_args()

    video_path = Path(args.video).resolve()
    if not video_path.exists():
        print(f"❌ 视频不存在: {video_path}")
        sys.exit(1)

    if args.output:
        base_dir = Path(args.output).resolve()
    else:
        base_dir = video_path.parent / (video_path.stem + "_output")
    base_dir.mkdir(parents=True, exist_ok=True)

    audio_path = base_dir / "audio.wav"
    transcript_path = base_dir / "transcript.srt"
    highlights_path = base_dir / "highlights.json"
    clips_dir = base_dir / "clips"
    enhanced_dir = base_dir / "clips_enhanced"

    print("=" * 60)
    print("🎬 Soul 切片流水线：视频制作 + 视频切片")
    print("=" * 60)
    print(f"输入视频: {video_path}")
    print(f"输出目录: {base_dir}")
    print(f"切片数量: {args.clips}")
    print("=" * 60)

    # 1. 提取音频 + 转录
    if not args.skip_transcribe:
        if not audio_path.exists():
            run(
                ["ffmpeg", "-y", "-i", str(video_path), "-vn", "-ar", "16000", "-ac", "1", str(audio_path)],
                "提取音频",
                timeout=120,
            )
        if not transcript_path.exists() and audio_path.exists():
            print("  MLX Whisper 转录（需 conda mlx-whisper）...")
            cmd = [
                "mlx_whisper",
                str(audio_path),
                "--model", "mlx-community/whisper-small-mlx",
                "--language", "zh",
                "--output-format", "srt",
                "--output-dir", str(base_dir),
                "--output-name", "transcript",
            ]
            try:
                subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=900)
                print("    ✓")
            except Exception as e:
                print(f"    若未安装 mlx_whisper，请先:")
                print("      conda activate mlx-whisper")
                print("      再运行本脚本")
                sys.exit(1)
    if not transcript_path.exists():
        print(f"❌ 需要 transcript.srt，请先完成转录: {transcript_path}")
        sys.exit(1)

    # 2. 高光识别
    if not args.skip_highlights:
        run(
            [
                sys.executable,
                str(SCRIPT_DIR / "identify_highlights.py"),
                "--transcript", str(transcript_path),
                "--output", str(highlights_path),
                "--clips", str(args.clips),
            ],
            "高光识别（Gemini）",
            timeout=60,
        )
    if not highlights_path.exists():
        print(f"❌ 需要 highlights.json: {highlights_path}")
        sys.exit(1)

    # 检查 highlights 格式（支持 {"clips": [...]} 或 [...]）
    with open(highlights_path, "r", encoding="utf-8") as f:
        hl = json.load(f)
    if isinstance(hl, dict) and "clips" in hl:
        clips_list = hl["clips"]
    else:
        clips_list = hl if isinstance(hl, list) else []

    if not clips_list:
        print("❌ highlights.json 为空")
        sys.exit(1)

    # 3. 批量切片
    clips_dir.mkdir(parents=True, exist_ok=True)
    run(
        [
            sys.executable,
            str(SCRIPT_DIR / "batch_clip.py"),
            "--input", str(video_path),
            "--highlights", str(highlights_path),
            "--output", str(clips_dir),
            "--prefix", "soul",
        ],
        "批量切片",
        timeout=300,
    )

    # 4. 增强（封面 + Hook + CTA）
    enhanced_dir.mkdir(parents=True, exist_ok=True)
    run(
        [
            sys.executable,
            str(SCRIPT_DIR / "enhance_clips.py"),
            "--clips_dir", str(clips_dir),
            "--highlights", str(highlights_path),
            "--output_dir", str(enhanced_dir),
            "--hook_duration", "2.5",
            "--cta_duration", "4",
            "--default_cta", "关注我，每天学一招私域干货",
        ],
        "增强处理（Hook+CTA）",
        timeout=600,
    )

    print()
    print("=" * 60)
    print("✅ 流水线完成")
    print("=" * 60)
    print(f"  切片: {clips_dir}")
    print(f"  增强: {enhanced_dir}")
    print(f"  清单: {base_dir / 'clips_manifest.json'}")


if __name__ == "__main__":
    main()
