#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Soul 切片一体化流水线
视频制作（封面/Hook格式）+ 视频切片

流程：转录 → 字幕转简体 → 高光识别(AI) → 批量切片 → 增强(封面+字幕+CTA)
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

# 常见转录错误修正
CORRECTIONS = {
    '私余': '私域', '统安': '同安', '信一下': '线上', '头里': '投入',
    '幅画': '负责', '施育': '私域', '经历论': '净利润', '成于': '乘以',
    '马的': '码的', '猜济': '拆解', '巨圣': '矩阵', '货客': '获客',
}

# 语助词（转录后去除）
FILLER_WORDS = [
    '嗯', '啊', '呃', '额', '哦', '噢', '唉', '哎', '诶', '喔',
    '那个', '就是', '然后', '这个', '所以说', '怎么说', '怎么说呢',
    '对吧', '是吧', '好吧', '行吧', '其实', '那么', '以及', '另外',
]


def transcript_to_simplified(srt_path: Path) -> bool:
    """转录后立即处理：繁转简+修正错误+去语助词+去多余空格"""
    import re
    try:
        from opencc import OpenCC
        cc = OpenCC('t2s')
    except ImportError:
        cc = None
    with open(srt_path, 'r', encoding='utf-8') as f:
        content = f.read()

    def clean_line(line: str) -> str:
        if not line.strip() or line.strip().isdigit() or '-->' in line:
            return line
        s = cc.convert(line) if cc else line
        for w, c in CORRECTIONS.items():
            s = s.replace(w, c)
        for w in sorted(FILLER_WORDS, key=len, reverse=True):
            s = re.sub(rf'^{re.escape(w)}[,，、\s]*', '', s)
            s = re.sub(rf'[,，、\s]*{re.escape(w)}$', '', s)
            s = re.sub(rf'\s+{re.escape(w)}\s+', ' ', s)
        s = re.sub(r'\s+', ' ', s).strip(' ，,')
        return s

    lines = content.split('\n')
    out = []
    for line in lines:
        out.append(clean_line(line))
    with open(srt_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))
    return True


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
    parser.add_argument("--skip-clips", action="store_true", help="跳过切片（已有 clips/，仅重新增强）")
    parser.add_argument("--language", "-l", default="zh", choices=["zh", "en"], help="转录语言（纳瓦尔访谈等英文内容用 en）")
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
                "--language", args.language,
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

    # 1.5 字幕转简体（提取后立即处理，繁转简+修正错误）
    transcript_to_simplified(transcript_path)
    print("  ✓ 字幕已转简体")

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
            "高光识别（Ollama→规则）",
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
    if not args.skip_clips:
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
    elif not list(clips_dir.glob("*.mp4")):
        print("❌ clips/ 为空，请去掉 --skip-clips 或先完成切片")
        sys.exit(1)

    # 4. 增强（封面+字幕+加速）：soul_enhance（Pillow，无需 drawtext）
    enhanced_dir.mkdir(parents=True, exist_ok=True)
    ok = run(
        [
            sys.executable,
            str(SCRIPT_DIR / "soul_enhance.py"),
            "--clips", str(clips_dir),
            "--highlights", str(highlights_path),
            "--transcript", str(transcript_path),
            "--output", str(enhanced_dir),
        ],
        "增强处理（封面+字幕+加速）",
        timeout=900,
        check=False,
    )
    import shutil
    enhanced_count = len(list(enhanced_dir.glob("*.mp4")))
    if enhanced_count == 0 and clips_list:
        print("  （soul_enhance 失败，复制原始切片到 clips_enhanced）")
        for f in sorted(clips_dir.glob("*.mp4")):
            shutil.copy(f, enhanced_dir / f.name)

    print()
    print("=" * 60)
    print("✅ 流水线完成")
    print("=" * 60)
    print(f"  切片: {clips_dir}")
    print(f"  增强: {enhanced_dir}")
    print(f"  清单: {base_dir / 'clips_manifest.json'}")


if __name__ == "__main__":
    main()
