#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速混剪：从切片/成片目录中抽取高密度片段，快速拼成一条预告混剪。

默认策略：
1. 优先读取 highlights.json 的 virality_score / rank 决定顺序
2. 若输入是成片目录，自动跳过前 2.6 秒封面
3. 每条取 3~5 秒高密度片段，统一分辨率后拼接
"""

import argparse
import json
import os
import random
import shutil
import subprocess
import tempfile
from pathlib import Path


def run(cmd: list[str], desc: str = "", check: bool = True) -> subprocess.CompletedProcess:
    if desc:
        print(f"  {desc}...", flush=True)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if check and result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"{desc or '命令'} 执行失败")
    if desc:
        print("    ✓", flush=True)
    return result


def ffprobe_json(video_path: Path) -> dict:
    result = run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "stream=index,codec_type,width,height:format=duration",
            "-of",
            "json",
            str(video_path),
        ],
        check=True,
    )
    return json.loads(result.stdout or "{}")


def get_video_info(video_path: Path) -> dict:
    info = ffprobe_json(video_path)
    streams = info.get("streams", [])
    video_stream = next((s for s in streams if s.get("codec_type") == "video"), {})
    has_audio = any(s.get("codec_type") == "audio" for s in streams)
    duration = float(info.get("format", {}).get("duration", 0) or 0)
    return {
        "path": video_path,
        "width": int(video_stream.get("width", 0) or 0),
        "height": int(video_stream.get("height", 0) or 0),
        "duration": duration,
        "has_audio": has_audio,
    }


def parse_clip_index(filename: str) -> int:
    import re

    matches = re.findall(r"_(\d+)_", filename)
    if matches:
        return min(int(m) for m in matches)
    fallback = re.search(r"(\d+)", filename)
    return int(fallback.group(1)) if fallback else 0


def load_highlights(highlights_path: Path | None) -> list[dict]:
    if not highlights_path or not highlights_path.exists():
        return []
    with open(highlights_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict) and "clips" in data:
        data = data["clips"]
    return data if isinstance(data, list) else []


def detect_source_kind(input_dir: Path, source_kind: str) -> str:
    if source_kind != "auto":
        return source_kind
    name = input_dir.name
    if name in {"成片", "clips_enhanced", "clips_enhanced_vertical"}:
        return "final"
    return "clip"


def choose_window(info: dict, source_kind: str, seconds_per_clip: float, skip_cover_sec: float, tail_guard_sec: float) -> tuple[float, float]:
    duration = max(0.0, float(info["duration"]))
    if duration <= 0.2:
        return 0.0, 0.0

    if source_kind == "final":
        start_sec = min(skip_cover_sec, max(0.0, duration - seconds_per_clip - tail_guard_sec))
    else:
        lead_in = min(1.2, duration * 0.12)
        start_sec = min(lead_in, max(0.0, duration - seconds_per_clip - tail_guard_sec))

    usable = max(0.0, duration - start_sec - tail_guard_sec)
    clip_sec = min(seconds_per_clip, usable)

    if clip_sec < 1.2:
        clip_sec = max(0.8, min(duration, seconds_per_clip))
        start_sec = max(0.0, (duration - clip_sec) / 2)

    end_sec = min(duration, start_sec + clip_sec)
    return round(start_sec, 3), round(end_sec, 3)


def scale_pad_filter(target_w: int, target_h: int, speed_factor: float) -> str:
    return (
        f"scale={target_w}:{target_h}:force_original_aspect_ratio=decrease,"
        f"pad={target_w}:{target_h}:(ow-iw)/2:(oh-ih)/2:black,"
        f"setsar=1,fps=30,setpts=PTS/{speed_factor}"
    )


def build_candidates(videos: list[Path], highlights: list[dict]) -> list[dict]:
    results = []
    for video in videos:
        info = get_video_info(video)
        clip_index = parse_clip_index(video.name)
        highlight = highlights[clip_index - 1] if 0 < clip_index <= len(highlights) else {}
        virality = highlight.get("virality_score", 0) if isinstance(highlight, dict) else 0
        rank = highlight.get("rank", clip_index or 999) if isinstance(highlight, dict) else clip_index or 999
        title = (
            (highlight.get("title") if isinstance(highlight, dict) else None)
            or video.stem
        )
        results.append(
            {
                "video": video,
                "info": info,
                "highlight": highlight if isinstance(highlight, dict) else {},
                "clip_index": clip_index,
                "virality_score": float(virality or 0),
                "rank": int(rank or 999),
                "title": str(title),
            }
        )
    return results


def order_candidates(candidates: list[dict], order: str, seed: int) -> list[dict]:
    ordered = list(candidates)
    if order == "shuffle":
        random.Random(seed).shuffle(ordered)
        return ordered
    if order == "viral":
        has_score = any(item.get("virality_score", 0) > 0 for item in ordered)
        if has_score:
            return sorted(
                ordered,
                key=lambda item: (
                    -item.get("virality_score", 0),
                    item.get("rank", 999),
                    item["video"].name,
                ),
            )
    return sorted(
        ordered,
        key=lambda item: (
            item.get("clip_index", 999) or 999,
            item["video"].name,
        ),
    )


def render_segment(
    source: Path,
    output: Path,
    start_sec: float,
    end_sec: float,
    target_w: int,
    target_h: int,
    has_audio: bool,
    speed_factor: float,
) -> None:
    duration = max(0.1, end_sec - start_sec)
    cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        f"{start_sec:.3f}",
        "-i",
        str(source),
        "-t",
        f"{duration:.3f}",
        "-vf",
        scale_pad_filter(target_w, target_h, speed_factor),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
    ]
    if has_audio:
        cmd += ["-af", f"atempo={speed_factor}", "-c:a", "aac", "-b:a", "128k"]
    else:
        cmd += ["-an"]
    cmd.append(str(output))
    run(cmd, check=True)


def concat_segments(segment_paths: list[Path], output_path: Path) -> None:
    concat_list = output_path.with_suffix(".txt")
    with open(concat_list, "w", encoding="utf-8") as f:
        for path in segment_paths:
            f.write(f"file '{path}'\n")

    result = subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_list),
            "-c",
            "copy",
            str(output_path),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode == 0 and output_path.exists():
        return

    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_list),
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "22",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            str(output_path),
        ],
        desc="拼接混剪视频",
        check=True,
    )


def write_manifest(output_path: Path, items: list[dict], source_kind: str, seconds_per_clip: float) -> None:
    manifest = {
        "output": str(output_path),
        "source_kind": source_kind,
        "seconds_per_clip": seconds_per_clip,
        "clips": items,
    }
    with open(output_path.with_suffix(".json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)


def main() -> None:
    parser = argparse.ArgumentParser(description="快速混剪：从切片/成片目录一键生成节奏版预告")
    parser.add_argument("--input-dir", "-i", required=True, help="输入目录（切片/成片）")
    parser.add_argument("--output", "-o", required=True, help="输出混剪视频路径")
    parser.add_argument("--highlights", "-l", help="highlights.json 路径，用于按热度排序")
    parser.add_argument("--source-kind", choices=["auto", "clip", "final"], default="auto", help="输入目录类型")
    parser.add_argument("--order", choices=["viral", "chronological", "shuffle"], default="viral", help="混剪顺序")
    parser.add_argument("--max-clips", "-n", type=int, default=8, help="最多取多少条视频")
    parser.add_argument("--seconds-per-clip", "-s", type=float, default=4.0, help="每条混剪截取秒数")
    parser.add_argument("--skip-cover-sec", type=float, default=2.6, help="成片目录默认跳过前几秒封面")
    parser.add_argument("--tail-guard-sec", type=float, default=0.6, help="片尾预留秒数，避免切到收尾黑屏")
    parser.add_argument("--speed-factor", type=float, default=1.05, help="混剪整体加速倍数")
    parser.add_argument("--seed", type=int, default=42, help="shuffle 时的随机种子")
    args = parser.parse_args()

    input_dir = Path(args.input_dir).resolve()
    output_path = Path(args.output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if not input_dir.exists():
        raise SystemExit(f"❌ 输入目录不存在: {input_dir}")

    videos = sorted([p for p in input_dir.glob("*.mp4") if p.is_file()])
    if not videos:
        raise SystemExit(f"❌ 目录下没有 mp4: {input_dir}")

    source_kind = detect_source_kind(input_dir, args.source_kind)
    highlights = load_highlights(Path(args.highlights).resolve()) if args.highlights else []
    candidates = build_candidates(videos, highlights)
    ordered = order_candidates(candidates, args.order, args.seed)

    if args.max_clips > 0:
        ordered = ordered[: args.max_clips]

    if not ordered:
        raise SystemExit("❌ 没有可用视频用于混剪")

    target_w = ordered[0]["info"]["width"] or 498
    target_h = ordered[0]["info"]["height"] or 1080

    print("=" * 60)
    print("⚡ 快速混剪")
    print("=" * 60)
    print(f"输入目录: {input_dir}")
    print(f"目录类型: {source_kind}")
    print(f"选取数量: {len(ordered)}")
    print(f"每条秒数: {args.seconds_per_clip}")
    print(f"输出视频: {output_path}")
    print("=" * 60)

    manifest_items = []
    temp_dir = Path(tempfile.mkdtemp(prefix="quick_montage_"))
    segment_paths: list[Path] = []
    try:
        for idx, item in enumerate(ordered, 1):
            info = item["info"]
            start_sec, end_sec = choose_window(
                info,
                source_kind,
                args.seconds_per_clip,
                args.skip_cover_sec,
                args.tail_guard_sec,
            )
            if end_sec - start_sec < 0.8:
                print(f"  跳过过短视频: {item['video'].name}", flush=True)
                continue
            segment_path = temp_dir / f"segment_{idx:02d}.mp4"
            print(
                f"  [{idx}/{len(ordered)}] {item['title']}  {start_sec:.1f}s -> {end_sec:.1f}s",
                flush=True,
            )
            render_segment(
                item["video"],
                segment_path,
                start_sec,
                end_sec,
                target_w,
                target_h,
                info["has_audio"],
                args.speed_factor,
            )
            segment_paths.append(segment_path)
            manifest_items.append(
                {
                    "index": idx,
                    "file": item["video"].name,
                    "title": item["title"],
                    "start_sec": start_sec,
                    "end_sec": end_sec,
                    "virality_score": item.get("virality_score", 0),
                }
            )

        if not segment_paths:
            raise SystemExit("❌ 没有成功生成任何混剪片段")

        concat_segments(segment_paths, output_path)
        write_manifest(output_path, manifest_items, source_kind, args.seconds_per_clip)

        size_mb = output_path.stat().st_size / (1024 * 1024)
        print()
        print("=" * 60)
        print("✅ 快速混剪完成")
        print("=" * 60)
        print(f"输出: {output_path}")
        print(f"大小: {size_mb:.1f}MB")
        print(f"清单: {output_path.with_suffix('.json')}")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
