#!/usr/bin/env python3
"""
从视频中删除「嗯」等语助词的语音段落
流程：提取音频 → 转录 → 识别纯语助词时段 → ffmpeg 裁剪掉这些段落 → 输出新视频
"""
import argparse
import re
import subprocess
import tempfile
from pathlib import Path

# 纯语助词（整句只有这些时，整段删除）
FILLER_ONLY = [
    '嗯', '啊', '呃', '额', '哦', '噢', '唉', '哎', '诶', '喔',
    '嗯嗯', '啊啊', '呃呃', '嗯啊', '啊嗯',
]


def parse_srt_all(srt_path: str) -> list:
    """解析 SRT，返回所有段落（含短句）"""
    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read()
    segments = []
    pattern = r"(\d+)\n(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})\n(.*?)(?=\n\n|\Z)"
    for m in re.findall(pattern, content, re.DOTALL):
        sh, sm, ss = int(m[1]), int(m[2]), int(m[3])
        eh, em, es = int(m[5]), int(m[6]), int(m[7])
        start_sec = sh * 3600 + sm * 60 + ss + int(m[4]) / 1000
        end_sec = eh * 3600 + em * 60 + es + int(m[8]) / 1000
        text = m[9].strip().replace("\n", " ").strip()
        segments.append({
            "start_sec": start_sec,
            "end_sec": end_sec,
            "text": text,
        })
    return segments


def is_filler_only(text: str) -> bool:
    """判断是否为纯语助词（含标点变体：嗯、嗯。嗯, 等）"""
    t = re.sub(r"[\s，。、,.\-—…]+", "", text.strip())
    if not t:
        return True
    for f in FILLER_ONLY:
        if t == f:
            return True
    # 连续重复的嗯、啊等
    if re.match(r"^[嗯啊呃噢哦]+$", t):
        return True
    # 去掉开头的语助词后，剩余极短（≤2字）则视为 filler
    rest = re.sub(r"^[嗯啊呃噢哦]+", "", t)
    if len(rest) <= 2 and not rest.isalnum():
        return True
    return False


def parse_time(s: str) -> float:
    """解析时间：支持 123.45 或 00:01:23.45 或 01:23"""
    s = s.strip()
    if ":" in s:
        parts = s.split(":")
        if len(parts) == 3:
            h, m, sec = float(parts[0]), float(parts[1]), float(parts[2])
            return h * 3600 + m * 60 + sec
        elif len(parts) == 2:
            return float(parts[0]) * 60 + float(parts[1])
    return float(s)


def parse_remove_list(path: str) -> list:
    """解析手动删除列表，返回 [(start_sec, end_sec), ...]"""
    out = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if len(parts) >= 2:
                out.append((parse_time(parts[0]), parse_time(parts[1])))
    return out


def build_keep_ranges(segments: list, total_duration: float, remove_ranges_override=None) -> list:
    """根据要删除的段落，构建保留的时间区间 [(start, end), ...]"""
    if remove_ranges_override is not None:
        remove_ranges = remove_ranges_override
    else:
        remove_ranges = [
            (s["start_sec"], s["end_sec"])
            for s in segments
            if is_filler_only(s["text"])
        ]
    if not remove_ranges:
        return [(0, total_duration)]

    remove_ranges.sort(key=lambda x: x[0])
    keep = []
    current = 0.0
    for rs, re in remove_ranges:
        if rs > current + 0.1:  # 保留 [current, rs)
            keep.append((current, rs))
        current = max(current, re)
    if current < total_duration - 0.1:
        keep.append((current, total_duration))
    return keep


def run_ffmpeg(args: list) -> bool:
    r = subprocess.run(args, capture_output=True, text=True)
    return r.returncode == 0


def main():
    ap = argparse.ArgumentParser(description="删除视频中「嗯」等语助词的语音段落")
    ap.add_argument("video", help="输入视频路径")
    ap.add_argument("-o", "--output", help="输出路径（默认：原文件名_去嗯.mp4）")
    ap.add_argument("--transcript", "-t", help="已有 transcript.srt（若不提供则先转录）")
    ap.add_argument("--dry-run", action="store_true", help="仅打印要删除的段落，不处理视频")
    ap.add_argument("--debug", action="store_true", help="打印所有含「嗯」的段落便于调试")
    ap.add_argument("--save-transcript", help="保存转录 SRT 到指定路径便于检查")
    ap.add_argument("--remove-list", metavar="FILE", help="手动指定要删除的时间段文件，每行: 开始秒 结束秒 或 00:01:23 00:01:25")
    args = ap.parse_args()

    video_path = Path(args.video).resolve()
    if not video_path.exists():
        print(f"❌ 视频不存在: {video_path}")
        return 1

    output_path = Path(args.output) if args.output else video_path.parent / f"{video_path.stem}_去嗯.mp4"

    # 1. 获取视频时长
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(video_path)],
        capture_output=True, text=True
    )
    total_duration = float(r.stdout.strip()) if r.returncode == 0 else 0
    if total_duration <= 0:
        print("❌ 无法获取视频时长")
        return 1

    transcript_path = Path(args.transcript) if args.transcript else None

    # 2. 若指定了 --remove-list，直接使用，跳过转录
    remove_list_ranges = None
    if args.remove_list:
        rlp = Path(args.remove_list)
        if rlp.exists():
            remove_list_ranges = parse_remove_list(str(rlp))
            print(f"从 {args.remove_list} 读取 {len(remove_list_ranges)} 个待删除时间段")
        else:
            print(f"❌ --remove-list 文件不存在: {args.remove_list}")
            return 1

    # 3. 若无 transcript 且无 remove-list，则转录
    if (not transcript_path or not transcript_path.exists()) and not remove_list_ranges:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpp = Path(tmpdir)
            audio_path = tmpp / "audio.wav"
            print("提取音频...")
            if not run_ffmpeg([
                "ffmpeg", "-y", "-i", str(video_path), "-vn", "-acodec", "pcm_s16le", "-ar", "16000", str(audio_path)
            ]):
                print("❌ 提取音频失败")
                return 1
            transcript_path = tmpp / "transcript.srt"
            print("MLX Whisper 转录（需 conda mlx-whisper）...")
            r = subprocess.run([
                "mlx_whisper", str(audio_path),
                "--model", "mlx-community/whisper-small-mlx",
                "--language", "zh",
                "--output-format", "srt",
                "--output-name", "transcript"
            ], capture_output=True, text=True, cwd=tmpdir)
            if r.returncode != 0:
                print("❌ 转录失败，请先: conda activate mlx-whisper")
                print(r.stderr[:500] if r.stderr else "")
                return 1
            if args.save_transcript:
                import shutil
                shutil.copy(str(transcript_path), args.save_transcript)
                print(f"  转录已保存: {args.save_transcript}")
            segments = parse_srt_all(str(transcript_path))
    else:
        segments = parse_srt_all(str(transcript_path)) if (transcript_path and transcript_path.exists()) else []

    # 4. 确定要删除的段落
    if remove_list_ranges:
        filler_segments = [{"start_sec": a, "end_sec": b} for a, b in remove_list_ranges]
        print(f"将删除 {len(filler_segments)} 个手动指定的时间段")
        for s in filler_segments:
            print(f"  删除: {s['start_sec']:.2f}s - {s['end_sec']:.2f}s")
        keep_ranges = build_keep_ranges(segments, total_duration, remove_list_ranges)
    else:
        filler_segments = [s for s in segments if is_filler_only(s["text"])]
        contain_ng = [s for s in segments if "嗯" in s["text"]]
        print(f"共 {len(segments)} 段字幕，其中 {len(filler_segments)} 段为纯语助词（将删除）")
        if getattr(args, "debug", False) and contain_ng:
            print(f"  含「嗯」的段落共 {len(contain_ng)} 个：")
            for s in contain_ng:
                print(f"    {s['start_sec']:.2f}s-{s['end_sec']:.2f}s 「{s['text']}」 is_filler={is_filler_only(s['text'])}")
        for s in filler_segments:
            print(f"  删除: {s['start_sec']:.2f}s - {s['end_sec']:.2f}s 「{s['text']}」")
        keep_ranges = build_keep_ranges(segments, total_duration)

    if args.dry_run:
        print("--dry-run 模式，未处理视频")
        return 0
    if len(keep_ranges) == 1 and keep_ranges[0][0] == 0 and keep_ranges[0][1] >= total_duration - 0.5:
        print("无需要删除的语助词段落，跳过处理")
        return 0

    # 4. ffmpeg 截取保留片段并拼接
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpp = Path(tmpdir)
        seg_files = []
        for i, (start, end) in enumerate(keep_ranges):
            dur = end - start
            if dur < 0.1:
                continue
            seg = tmpp / f"seg_{i:04d}.mp4"
            ok = run_ffmpeg([
                "ffmpeg", "-y", "-ss", str(start), "-t", str(dur),
                "-i", str(video_path), "-c", "copy", str(seg)
            ])
            if ok and seg.exists():
                seg_files.append(seg)

        if not seg_files:
            print("❌ 未能生成有效片段")
            return 1

        # concat list
        list_path = tmpp / "list.txt"
        with open(list_path, "w") as f:
            for seg in seg_files:
                f.write(f"file '{seg}'\n")

        print(f"拼接 {len(seg_files)} 个片段...")
        ok = run_ffmpeg([
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_path),
            "-c", "copy", str(output_path)
        ])
        if not ok:
            print("❌ 拼接失败")
            return 1

    print(f"✅ 已输出: {output_path}")
    return 0


if __name__ == "__main__":
    exit(main())
