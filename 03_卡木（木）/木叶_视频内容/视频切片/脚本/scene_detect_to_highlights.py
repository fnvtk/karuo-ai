#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
镜头/场景切分 → highlights.json
基于 PySceneDetect 做镜头边界检测，输出与 batch_clip / soul_slice_pipeline 兼容的 highlights 格式。
参考剪映专业版智能片段分割思路：帧级特征 + 切点检测 + 后处理阈值（见 参考资料/剪映_智能剪口播与智能片段分割_逆向分析.md）。
"""
import argparse
import json
import sys
from pathlib import Path


def format_timestamp(seconds: float) -> str:
    """秒 → HH:MM:SS"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h:02d}:{m:02d}:{int(s):02d}.{int((s % 1) * 100):02d}"


def detect_scenes(video_path: str, threshold: float = 27.0, min_scene_len: int = 15) -> list:
    """
    使用 PySceneDetect 检测场景切点。
    threshold: 内容变化阈值，越大切点越少（剪映参考约 0.35 后处理阈值，此处为 ContentDetector 的 0-255 档位）。
    min_scene_len: 最小场景长度（帧数），避免过碎。
    """
    try:
        from scenedetect import detect, ContentDetector
    except ImportError:
        print("请安装: pip install scenedetect[opencv]")
        sys.exit(1)

    detector = ContentDetector(threshold=threshold, min_scene_len=min_scene_len)
    scene_list = detect(video_path, detector)
    if not scene_list:
        return []
    # scene_list: list of (start FrameTimecode, end FrameTimecode)
    out = []
    for start_tc, end_tc in scene_list:
        start_sec = start_tc.get_seconds()
        end_sec = end_tc.get_seconds()
        out.append((start_sec, end_sec))
    return out


def main():
    parser = argparse.ArgumentParser(description="镜头检测 → highlights.json（供 batch_clip 使用）")
    parser.add_argument("--video", "-i", required=True, help="输入视频路径")
    parser.add_argument("--output", "-o", required=True, help="输出 highlights.json 路径")
    parser.add_argument("--threshold", "-t", type=float, default=27.0,
                        help="ContentDetector 阈值，越大切点越少（默认 27）")
    parser.add_argument("--min-scene-len", type=int, default=15,
                        help="最小场景长度（帧），默认 15")
    parser.add_argument("--max-clips", "-n", type=int, default=0,
                        help="最多保留片段数，0 表示不限制")
    parser.add_argument("--min-duration", type=float, default=0,
                        help="过滤掉时长小于此值的片段（秒），默认 0")
    args = parser.parse_args()

    video_path = Path(args.video)
    if not video_path.exists():
        print(f"❌ 视频不存在: {video_path}")
        sys.exit(1)

    scene_list = detect_scenes(
        str(video_path),
        threshold=args.threshold,
        min_scene_len=args.min_scene_len,
    )
    if not scene_list:
        print("未检测到场景切点，可尝试降低 --threshold")
        sys.exit(1)

    clips = []
    for i, (start_sec, end_sec) in enumerate(scene_list, 1):
        duration = end_sec - start_sec
        if args.min_duration and duration < args.min_duration:
            continue
        clips.append({
            "start_time": format_timestamp(start_sec),
            "end_time": format_timestamp(end_sec),
            "title": f"镜头{i}",
        })
        if args.max_clips and len(clips) >= args.max_clips:
            break

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"clips": clips}, f, ensure_ascii=False, indent=2)
    print(f"✓ 已写入 {len(clips)} 个镜头 → {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
