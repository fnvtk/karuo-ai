#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Soul 按图片7主题切片
========================

严格使用「视频剪辑方案」图片中的 7 个主题，不自行创作。
时间节点：通过分析转录找出每个完整主题的起止时间（非固定）。

图片7主题（高峰时刻）：
  1. 引出问题  2. 解决方案  3. 案例分享  4. 未来展望
  5. 痛点强调  6. 福利展示  7. 权威背书

用法：
  python3 soul_slice_by_image_themes.py --video "soul 派对 106场.mp4" --transcript transcript.srt
  python3 soul_slice_by_image_themes.py -v "xxx.mp4" --output-dir ./output --vertical
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
OLLAMA_URL = "http://localhost:11434"
DEFAULT_CTA = "关注我，每天学一招私域干货"

# 热点切片 7 主题（来自「关于soul派对视频切片内容规划及数据评估报告」）
# 不可自行创作，严格使用图片中的主题名
IMAGE_THEMES = [
    "情绪共鸣",    # 引出问题、营造氛围、启发思考
    "深度洞察",    # 提出观点、数据支持、解析原理
    "痛点聚焦",    # 痛点强调、情景代入、加深理解
    "价值输出",    # 解决方案、干货分享、技能传授
    "案例解析",    # 实际案例、成功经验、经验复盘
    "未来趋势",    # 行业展望、发展预测、创新思路
    "行动召唤",    # 福利展示、即刻行动、引导转化
]

# 每个主题的检索关键词（用于在转录中定位完整主题）
THEME_KEYWORDS = {
    "情绪共鸣": ["问题", "共鸣", "氛围", "思考", "你遇到过", "大家有没有", "感受"],
    "深度洞察": ["观点", "数据", "原理", "分析", "洞察", "核心", "本质"],
    "痛点聚焦": ["痛点", "坑", "踩雷", "千万别", "要注意", "难点", "困扰"],
    "价值输出": ["方案", "方法", "干货", "技能", "怎么做", "核心", "关键"],
    "案例解析": ["案例", "实际", "真实", "经验", "复盘", "成功", "数据"],
    "未来趋势": ["未来", "趋势", "展望", "预测", "创新", "发展", "接下来"],
    "行动召唤": ["福利", "行动", "转化", "免费", "领取", "送", "关注", "分享"],
}


def parse_srt_segments(srt_path: Path) -> list:
    """解析 SRT 为 [{start_sec, end_sec, text, start_time, end_time}, ...]"""
    content = srt_path.read_text(encoding="utf-8")
    segments = []
    pattern = r"(\d+)\n(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})\n(.*?)(?=\n\n|\Z)"
    for m in re.findall(pattern, content, re.DOTALL):
        sh, sm, ss = int(m[1]), int(m[2]), int(m[3])
        eh, em, es = int(m[5]), int(m[6]), int(m[7])
        start_sec = sh * 3600 + sm * 60 + ss
        end_sec = eh * 3600 + em * 60 + es
        text = m[9].strip().replace("\n", " ")
        if len(text) > 2:
            segments.append({
                "start_sec": start_sec,
                "end_sec": end_sec,
                "start_time": f"{sh:02d}:{sm:02d}:{ss:02d}",
                "end_time": f"{eh:02d}:{em:02d}:{es:02d}",
                "text": text,
            })
    return segments


def find_theme_segment(segments: list, theme: str, duration_sec: float) -> dict | None:
    """
    在转录中找该主题的完整段落。
    策略：找包含关键词的连续段落，取前后扩展成 60–120 秒。
    """
    keywords = THEME_KEYWORDS.get(theme, [theme])
    candidates = []
    for i, s in enumerate(segments):
        t = s["text"]
        for kw in keywords:
            if kw in t:
                candidates.append((i, s, kw))
                break

    if not candidates:
        return None

    # 取第一个匹配，扩展为完整段落（前后各扩展若干句）
    idx, seg, _ = candidates[0]
    start_sec = seg["start_sec"]
    end_sec = seg["end_sec"]
    # 向前扩展 30 秒或到前一个主题
    extend_before = 30
    extend_after = 90
    start_sec = max(0, start_sec - extend_before)
    end_sec = min(duration_sec, end_sec + extend_after)
    # 限制单段 60–150 秒
    if end_sec - start_sec > 150:
        end_sec = start_sec + 120
    if end_sec - start_sec < 45:
        end_sec = min(duration_sec, start_sec + 90)

    h1, m1, s1 = int(start_sec // 3600), int((start_sec % 3600) // 60), int(start_sec % 60)
    h2, m2, s2 = int(end_sec // 3600), int((end_sec % 3600) // 60), int(end_sec % 60)
    excerpt = seg["text"][:60] + "..." if len(seg["text"]) > 60 else seg["text"]

    return {
        "theme": theme,
        "title": theme,
        "start_time": f"{h1:02d}:{m1:02d}:{s1:02d}",
        "end_time": f"{h2:02d}:{m2:02d}:{s2:02d}",
        "hook_3sec": theme[:12] if len(theme) > 4 else theme,
        "cta_ending": DEFAULT_CTA,
        "transcript_excerpt": excerpt,
    }


def analyze_by_ollama(transcript_path: Path, duration_sec: float) -> list:
    """用 Ollama 分析转录，输出7主题的时间节点"""
    try:
        import requests
    except ImportError:
        return []

    segments = parse_srt_segments(transcript_path)
    with open(transcript_path, "r", encoding="utf-8") as f:
        raw = f.read()
    txt = raw[:15000] if len(raw) > 15000 else raw

    themes_str = "、".join(IMAGE_THEMES)
    prompt = f"""你分析视频文字稿，为以下7个主题各找出【一段完整表述】的起止时间。只输出JSON数组，不要其他文字。
7个主题（必须全部输出）：{themes_str}

每个元素格式：
{{"theme":"主题名","title":"主题名","start_time":"HH:MM:SS","end_time":"HH:MM:SS","hook_3sec":"前3秒文案","cta_ending":"关注我，每天学一招私域干货"}}

要求：
- 每个主题对应视频中实际讲该内容的完整段落
- 时长 60–120 秒
- 相邻段落间隔至少20秒
- 时间从文字稿中提取，必须真实存在

文字稿：
---
{txt[:12000]}
---"""

    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": "qwen2.5:7b", "prompt": prompt, "stream": False},
            timeout=120,
        )
        if r.status_code != 200:
            return []
        out = r.json().get("response", "")
        m = re.search(r"\[[\s\S]*?\]", out)
        if m:
            arr = json.loads(m.group())
            out_list = []
            for h in arr:
                if h.get("theme") in IMAGE_THEMES or h.get("title") in IMAGE_THEMES:
                    theme = h.get("theme") or h.get("title")
                    if theme not in [x.get("theme") for x in out_list]:
                        out_list.append({
                            "theme": theme,
                            "title": theme,
                            "start_time": h.get("start_time", "00:00:00"),
                            "end_time": h.get("end_time", "00:01:00"),
                            "hook_3sec": h.get("hook_3sec", f"精彩{theme}"),
                            "cta_ending": h.get("cta_ending", DEFAULT_CTA),
                        })
            if len(out_list) >= 5:
                return out_list
    except Exception as e:
        print(f"  ⚠ Ollama 分析失败: {e}", flush=True)
    return []


def analyze_by_keywords(transcript_path: Path, duration_sec: float) -> list:
    """按关键词在转录中定位7主题（规则兜底）"""
    segments = parse_srt_segments(transcript_path)
    result = []
    used_ranges = []
    for theme in IMAGE_THEMES:
        h = find_theme_segment(segments, theme, duration_sec)
        if h:
            start_sec = int(h["start_time"][:2]) * 3600 + int(h["start_time"][3:5]) * 60 + int(h["start_time"][6:8])
            end_sec = int(h["end_time"][:2]) * 3600 + int(h["end_time"][3:5]) * 60 + int(h["end_time"][6:8])
            # 避免与前一段重叠
            overlap = any(s <= start_sec < e or s < end_sec <= e for s, e in used_ranges)
            if not overlap and end_sec - start_sec >= 40:
                used_ranges.append((start_sec, end_sec))
                result.append(h)
    return result


def get_video_duration(path: Path) -> float:
    cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration",
           "-of", "default=noprint_wrappers=1:nokey=1", str(path)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return float(r.stdout.strip()) if r.returncode == 0 else 0


def main():
    parser = argparse.ArgumentParser(description="Soul 按图片7主题切片")
    parser.add_argument("--video", "-v", required=True, help="输入视频")
    parser.add_argument("--transcript", "-t", help="transcript.srt（默认：同目录或 output 目录）")
    parser.add_argument("--output-dir", "-o", help="输出目录")
    parser.add_argument("--vertical", action="store_true", help="输出竖屏 9:16")
    parser.add_argument("--skip-clips", action="store_true", help="跳过切片（仅重新增强）")
    args = parser.parse_args()

    video_path = Path(args.video).resolve()
    if not video_path.exists():
        print(f"❌ 视频不存在: {video_path}")
        sys.exit(1)

    duration = get_video_duration(video_path)
    print(f"📹 视频: {video_path.name} ({duration/60:.1f} 分钟)")

    base = video_path.parent / (video_path.stem + "_output")
    if args.output_dir:
        base = Path(args.output_dir).resolve()
    base.mkdir(parents=True, exist_ok=True)

    transcript_path = None
    if args.transcript:
        transcript_path = Path(args.transcript).resolve()
    else:
        for p in [base / "transcript.srt", video_path.parent / (video_path.stem + "_output") / "transcript.srt"]:
            if p.exists():
                transcript_path = p
                break
    if not transcript_path or not transcript_path.exists():
        print("❌ 未找到 transcript.srt，请先完成转录")
        sys.exit(1)

    # 分析：优先 Ollama，失败则用关键词
    print("🔍 分析转录，提取图片7主题的时间节点...")
    highlights = analyze_by_ollama(transcript_path, duration)
    if len(highlights) < 5:
        print("  使用关键词规则兜底...")
        highlights = analyze_by_keywords(transcript_path, duration)

    # 确保7个主题都有（缺失的用均匀补位）
    have_themes = {h["theme"] for h in highlights}
    for theme in IMAGE_THEMES:
        if theme not in have_themes:
            interval = duration / (len(IMAGE_THEMES) + 1)
            idx = IMAGE_THEMES.index(theme) + 1
            start_sec = int(interval * idx)
            end_sec = min(int(start_sec + 90), int(duration) - 5)
            h = int(start_sec // 3600)
            m = int((start_sec % 3600) // 60)
            s = int(start_sec % 60)
            eh = int(end_sec // 3600)
            em = int((end_sec % 3600) // 60)
            es = int(end_sec % 60)
            highlights.append({
                "theme": theme,
                "title": theme,
                "start_time": f"{h:02d}:{m:02d}:{s:02d}",
                "end_time": f"{eh:02d}:{em:02d}:{es:02d}",
                "hook_3sec": f"精彩{theme}",
                "cta_ending": DEFAULT_CTA,
            })
    highlights = sorted(highlights, key=lambda x: IMAGE_THEMES.index(x["theme"]) if x["theme"] in IMAGE_THEMES else 99)

    # 去重，保证顺序
    seen = set()
    unique = []
    for h in highlights:
        if h["theme"] not in seen and h["theme"] in IMAGE_THEMES:
            seen.add(h["theme"])
            unique.append(h)
    highlights = unique[:7]

    highlights_path = base / "highlights_image7.json"
    with open(highlights_path, "w", encoding="utf-8") as f:
        json.dump(highlights, f, ensure_ascii=False, indent=2)
    print(f"  ✓ 已保存: {highlights_path}")
    for i, h in enumerate(highlights, 1):
        print(f"    {i}. {h['title']} {h['start_time']} → {h['end_time']}")

    if args.skip_clips:
        print("⏭ 跳过切片（--skip-clips）")
        clips_dir = base / "clips"
        if clips_dir.exists():
            enhanced_dir = base / "clips_enhanced_vertical" if args.vertical else base / "clips_enhanced"
            soul_enhance = SCRIPT_DIR / "soul_enhance.py"
            subprocess.run([
                sys.executable, str(soul_enhance),
                "--clips", str(clips_dir),
                "--highlights", str(highlights_path),
                "--transcript", str(transcript_path),
                "--output", str(enhanced_dir),
            ], check=True)
        sys.exit(0)

    clips_dir = base / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)

    batch_clip = SCRIPT_DIR / "batch_clip.py"
    prefix = "soul106" if "106" in video_path.name else "soul"
    subprocess.run([
        sys.executable, str(batch_clip),
        "--input", str(video_path),
        "--highlights", str(highlights_path),
        "--output", str(clips_dir),
        "--prefix", prefix,
    ], check=True)

    if args.vertical:
        # 转为竖屏 9:16 (1080x1920)
        vertical_dir = base / "clips_vertical"
        vertical_dir.mkdir(parents=True, exist_ok=True)
        for f in sorted(clips_dir.glob("*.mp4")):
            out_f = vertical_dir / f.name
            cmd = [
                "ffmpeg", "-y", "-i", str(f),
                "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "aac", "-b:a", "128k", str(out_f)
            ]
            subprocess.run(cmd, capture_output=True)
        print(f"  ✓ 竖屏切片: {vertical_dir}")
        clips_dir = vertical_dir

    enhanced_dir = base / "clips_enhanced"
    if args.vertical:
        enhanced_dir = base / "clips_enhanced_vertical"
    enhanced_dir.mkdir(parents=True, exist_ok=True)

    soul_enhance = SCRIPT_DIR / "soul_enhance.py"
    subprocess.run([
        sys.executable, str(soul_enhance),
        "--clips", str(clips_dir),
        "--highlights", str(highlights_path),
        "--transcript", str(transcript_path),
        "--output", str(enhanced_dir),
    ], check=True)

    print("\n✅ 完成")
    print(f"📂 切片: {clips_dir}")
    print(f"📂 增强: {enhanced_dir}")
    print(f"📋 方案: {highlights_path}")


if __name__ == "__main__":
    main()
