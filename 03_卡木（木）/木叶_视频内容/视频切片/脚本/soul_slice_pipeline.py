#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Soul 切片一体化流水线
视频制作（封面/Hook格式）+ 视频切片

流程：转录 → 字幕转简体 → 高光识别(AI) → 批量切片 → 增强(封面+字幕+CTA) → 快速混剪（可选）
"""
import argparse
import atexit
import json
import os
import subprocess
import sys
from pathlib import Path


def _kill_child_ffmpeg_on_exit():
    """脚本退出时（含 Ctrl+C）杀死本进程启动的 ffmpeg 子进程。"""
    try:
        subprocess.run(
            ["pkill", "-P", str(os.getpid()), "ffmpeg"],
            capture_output=True,
            timeout=2,
        )
    except Exception:
        pass


atexit.register(_kill_child_ffmpeg_on_exit)

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
    parser.add_argument("--clips", "-n", type=int, default=8, help="切片数量（--ops-short 且未改 -n 时默认 24）")
    parser.add_argument(
        "--highlight-preset",
        choices=["long", "ops-short"],
        default="long",
        help="高光识别 preset：long=60～300 秒深度切片；ops-short=15～30 秒运营密度切片",
    )
    parser.add_argument(
        "--ops-short",
        action="store_true",
        help="运营短切片一键：preset=ops-short，未指定 -n 时用 24 条",
    )
    parser.add_argument("--min-clip-sec", type=float, default=None, help="传给 identify_highlights --min-duration")
    parser.add_argument("--max-clip-sec", type=float, default=None, help="传给 identify_highlights --max-duration")
    parser.add_argument(
        "--ops-jingju-hotspot",
        action="store_true",
        help="高光 prompt 强调京剧梗+热点（可与 ops-short 同用）",
    )
    parser.add_argument(
        "--prompt-min-sec",
        type=float,
        default=None,
        help="传给 identify_highlights：送模型的 SRT 从该秒之后截取（ops-short 默认 450）",
    )
    parser.add_argument("--skip-transcribe", action="store_true", help="跳过转录（已有 transcript.srt）")
    parser.add_argument("--skip-highlights", action="store_true", help="跳过高光识别（已有 highlights.json）")
    parser.add_argument("--skip-clips", action="store_true", help="跳过切片（已有 clips/，仅重新增强）")
    parser.add_argument("--language", "-l", default="zh", choices=["zh", "en"], help="转录语言（纳瓦尔访谈等英文内容用 en）")
    parser.add_argument("--skip-subs", action="store_true", help="跳过字幕烧录（原片已有字幕时用）")
    parser.add_argument("--force-burn-subs", action="store_true", help="强制烧录字幕（忽略检测）")
    parser.add_argument("--force-transcribe", action="store_true", help="强制重新转录（删除旧 transcript 并重跑）")
    parser.add_argument("--two-folders", action="store_true", help="仅用两文件夹：切片、成片（默认 clips、clips_enhanced）")
    parser.add_argument("--slices-only", action="store_true", help="只做到切片（MLX 转录→高光→批量切片），不跑成片增强")
    parser.add_argument("--prefix", default="", help="切片文件名前缀，如 soul112")
    parser.add_argument("--quick-montage", action="store_true", help="额外生成一条快速混剪视频")
    parser.add_argument("--montage-source", choices=["auto", "clips", "finals"], default="auto", help="快速混剪使用切片还是成片")
    parser.add_argument("--montage-max-clips", type=int, default=8, help="快速混剪最多取多少条片段")
    parser.add_argument("--montage-seconds", type=float, default=4.0, help="快速混剪每条截取秒数")
    args = parser.parse_args()

    if getattr(args, "ops_short", False):
        args.highlight_preset = "ops-short"
        if args.clips == 8:
            args.clips = 24

    video_path = Path(args.video).resolve()
    if not video_path.exists():
        print(f"❌ 视频不存在: {video_path}")
        sys.exit(1)

    if args.output:
        base_dir = Path(args.output).resolve()
    else:
        base_dir = video_path.parent / (video_path.stem + "_output")
    base_dir.mkdir(parents=True, exist_ok=True)

    use_two_folders = getattr(args, "two_folders", False)
    clips_dir_name = "切片" if use_two_folders else "clips"
    enhanced_dir_name = "成片" if use_two_folders else "clips_enhanced"

    audio_path = base_dir / "audio.wav"
    transcript_path = base_dir / "transcript.srt"
    highlights_path = base_dir / "highlights.json"
    clips_dir = base_dir / clips_dir_name
    enhanced_dir = base_dir / enhanced_dir_name

    print("=" * 60)
    print("🎬 Soul 切片流水线：视频制作 + 视频切片")
    print("=" * 60)
    print(f"输入视频: {video_path}")
    print(f"输出目录: {base_dir}")
    print(f"切片数量: {args.clips} ｜ 高光 preset: {args.highlight_preset}")
    print("=" * 60)

    # 0. 强制重转录时删除旧产物（含 audio 以重提完整音频）
    if getattr(args, "force_transcribe", False):
        for p in [audio_path, transcript_path, highlights_path]:
            if p.exists():
                p.unlink()
                print(f"  已删除旧文件: {p.name}")
        for d in [clips_dir, enhanced_dir]:
            if d.exists():
                import shutil
                shutil.rmtree(d, ignore_errors=True)
                print(f"  已清空: {d.name}/")

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
            # 3 小时视频约需 20–40 分钟，超时 2 小时
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
                subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=7200)
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
        hl_cmd = [
            sys.executable,
            str(SCRIPT_DIR / "identify_highlights.py"),
            "--transcript", str(transcript_path),
            "--output", str(highlights_path),
            "--clips", str(args.clips),
            "--preset", str(args.highlight_preset),
        ]
        if args.min_clip_sec is not None:
            hl_cmd.extend(["--min-duration", str(args.min_clip_sec)])
        if args.max_clip_sec is not None:
            hl_cmd.extend(["--max-duration", str(args.max_clip_sec)])
        if getattr(args, "ops_jingju_hotspot", False):
            hl_cmd.append("--ops-jingju-hotspot")
        if getattr(args, "prompt_min_sec", None) is not None:
            hl_cmd.extend(["--prompt-min-sec", str(args.prompt_min_sec)])
        run(
            hl_cmd,
            "高光识别（API→Ollama→规则）",
            timeout=600,
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
    clip_prefix = getattr(args, "prefix", None) or "soul"
    if not args.skip_clips:
        run(
            [
                sys.executable,
                str(SCRIPT_DIR / "batch_clip.py"),
                "--input", str(video_path),
                "--highlights", str(highlights_path),
                "--output", str(clips_dir),
                "--prefix", clip_prefix,
            ],
            "批量切片",
            timeout=300,
        )
    elif not list(clips_dir.glob("*.mp4")):
        print(f"❌ {clips_dir_name}/ 为空，请去掉 --skip-clips 或先完成切片")
        sys.exit(1)

    if getattr(args, "slices_only", False):
        if getattr(args, "quick_montage", False):
            montage_output = base_dir / "快速混剪.mp4"
            montage_cmd = [
                sys.executable,
                str(SCRIPT_DIR / "quick_montage.py"),
                "--input-dir", str(clips_dir),
                "--output", str(montage_output),
                "--highlights", str(highlights_path),
                "--source-kind", "clip",
                "--max-clips", str(args.montage_max_clips),
                "--seconds-per-clip", str(args.montage_seconds),
            ]
            run(montage_cmd, "生成快速混剪", timeout=600, check=False)
        print()
        print("=" * 60)
        print("✅ 切片阶段完成（--slices-only）")
        print("=" * 60)
        print(f"  切片: {clips_dir}")
        print(f"  转录: {transcript_path}")
        print(f"  高光: {highlights_path}")
        return

    # 4. 增强（封面+字幕+加速）：soul_enhance（Pillow，无需 drawtext）
    enhanced_dir.mkdir(parents=True, exist_ok=True)
    enhance_cmd = [
        sys.executable,
        str(SCRIPT_DIR / "soul_enhance.py"),
        "--clips", str(clips_dir),
        "--highlights", str(highlights_path),
        "--transcript", str(transcript_path),
        "--output", str(enhanced_dir),
    ]
    if getattr(args, "skip_subs", False):
        enhance_cmd.append("--skip-subs")
    if use_two_folders:
        enhance_cmd.extend(["--vertical", "--title-only"])
    if (getattr(args, "force_burn_subs", False) or use_two_folders) and not getattr(
        args, "skip_subs", False
    ):
        enhance_cmd.append("--force-burn-subs")
    enhance_timeout = max(900, 600 + len(clips_list) * 90)  # 约 90 秒/片
    ok = run(enhance_cmd, "增强处理（封面+字幕+加速）", timeout=enhance_timeout, check=False)
    import shutil
    enhanced_count = len(list(enhanced_dir.glob("*.mp4")))
    if enhanced_count == 0 and clips_list:
        print(f"  （soul_enhance 失败，复制原始切片到 {enhanced_dir_name}/）")
        for f in sorted(clips_dir.glob("*.mp4")):
            shutil.copy(f, enhanced_dir / f.name)

    if getattr(args, "quick_montage", False):
        montage_output = base_dir / "快速混剪.mp4"
        if args.montage_source == "clips":
            montage_input = clips_dir
            montage_kind = "clip"
        elif args.montage_source == "finals":
            montage_input = enhanced_dir
            montage_kind = "final"
        else:
            montage_input = enhanced_dir if enhanced_count > 0 else clips_dir
            montage_kind = "final" if enhanced_count > 0 else "clip"
        montage_cmd = [
            sys.executable,
            str(SCRIPT_DIR / "quick_montage.py"),
            "--input-dir", str(montage_input),
            "--output", str(montage_output),
            "--highlights", str(highlights_path),
            "--source-kind", montage_kind,
            "--max-clips", str(args.montage_max_clips),
            "--seconds-per-clip", str(args.montage_seconds),
        ]
        run(montage_cmd, "生成快速混剪", timeout=600, check=False)

    print()
    print("=" * 60)
    print("✅ 流水线完成")
    print("=" * 60)
    print(f"  切片: {clips_dir}")
    print(f"  成片: {enhanced_dir}")
    if getattr(args, "quick_montage", False):
        print(f"  混剪: {base_dir / '快速混剪.mp4'}")
    print(f"  清单: {base_dir / 'clips_manifest.json'}")


if __name__ == "__main__":
    main()
