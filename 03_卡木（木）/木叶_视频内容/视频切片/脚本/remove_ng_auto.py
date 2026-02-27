#!/usr/bin/env python3
"""
全自动删除视频中「嗯」的语音段落
使用 whisper-timestamped 词级时间戳检测 嗯，ffmpeg 裁剪输出
"""
import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path

# 语助词（词级匹配）
FILLER_CHARS = "嗯啊呃额哦噢唉哎诶喔"


def extract_audio(video_path: str, out_path: str) -> bool:
    r = subprocess.run([
        "ffmpeg", "-y", "-i", video_path, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", out_path
    ], capture_output=True)
    return r.returncode == 0


def get_duration(video_path: str) -> float:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", video_path],
        capture_output=True, text=True
    )
    return float(r.stdout.strip()) if r.returncode == 0 else 0


def transcribe_word_level(audio_path: str, language: str = "zh") -> dict:
    import whisper_timestamped as whisper
    audio = whisper.load_audio(audio_path)
    model = whisper.load_model("small", device="cpu")  # small 更准，易识别语助词
    # 用 initial_prompt 提示模型保留 嗯 等语助词
    return whisper.transcribe(
        model, audio, language=language, detect_disfluencies=True,
        initial_prompt="嗯 啊 呃 然后 就是 那个 所以说。这是一段中文语音转写，请保留说话人发出的嗯、啊等语气词。"
    )


def find_filler_ranges(result: dict) -> list:
    """从词级转录结果中找出语助词（嗯等）的时间段：词级 + 段级兜底"""
    ranges = []
    for seg in result.get("segments", []):
        for w in seg.get("words", []):
            text = (w.get("text") or "").strip()
            t_clean = re.sub(r"[\s，。、,.\-—…]+", "", text)
            if not t_clean:
                continue
            if re.match(r"^[嗯啊呃噢哦额唉哎诶喔]+$", t_clean):
                s, e = w.get("start"), w.get("end")
                if s is not None and e is not None and e - s > 0.05:
                    ranges.append((float(s), float(e)))
        # 段级兜底：整段仅为语助词
        seg_text = re.sub(r"[\s，。、,.\-—…]+", "", (seg.get("text") or "").strip())
        if seg_text and re.match(r"^[嗯啊呃噢哦额唉哎诶喔]+$", seg_text):
            ss, se = seg.get("start"), seg.get("end")
            if ss is not None and se is not None:
                r = (float(ss), float(se))
                if r not in ranges and all(r[0] >= x[1] or r[1] <= x[0] for x in ranges):
                    ranges.append(r)
    return sorted(ranges, key=lambda x: x[0])


def build_keep_ranges(remove_ranges: list, total_duration: float) -> list:
    remove_ranges = sorted(remove_ranges, key=lambda x: x[0])
    keep = []
    current = 0.0
    for rs, re in remove_ranges:
        if rs > current + 0.05:
            keep.append((current, rs))
        current = max(current, re)
    if current < total_duration - 0.05:
        keep.append((current, total_duration))
    return keep


def run_ffmpeg(args: list) -> bool:
    return subprocess.run(args, capture_output=True).returncode == 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video", help="输入视频")
    ap.add_argument("-o", "--output", help="输出路径")
    args = ap.parse_args()

    video_path = Path(args.video).resolve()
    if not video_path.exists():
        print("❌ 视频不存在")
        return 1

    output_path = Path(args.output) if args.output else video_path.parent / f"{video_path.stem}_去嗯.mp4"
    total_duration = get_duration(str(video_path))
    if total_duration <= 0:
        print("❌ 无法获取时长")
        return 1

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        audio_path = tmp / "audio.wav"
        print("1. 提取音频...")
        if not extract_audio(str(video_path), str(audio_path)):
            print("❌ 提取音频失败")
            return 1

        print("2. whisper-timestamped 词级转录（检测语助词）...")
        try:
            result = transcribe_word_level(str(audio_path))
        except Exception as e:
            print(f"❌ 转录失败: {e}")
            return 1

        remove_ranges = find_filler_ranges(result)
        print(f"   检测到 {len(remove_ranges)} 处语助词（嗯等）")
        for s, e in remove_ranges[:10]:
            print(f"     {s:.2f}s - {e:.2f}s")
        if len(remove_ranges) > 10:
            print(f"     ... 共 {len(remove_ranges)} 处")

        if not remove_ranges:
            print("   无检测到语助词，复制原视频作为输出")
            import shutil
            shutil.copy(str(video_path), str(output_path))
            print(f"✅ 已复制: {output_path}")
            return 0

        keep_ranges = build_keep_ranges(remove_ranges, total_duration)

        print("3. ffmpeg 裁剪并拼接...")
        seg_files = []
        for i, (start, end) in enumerate(keep_ranges):
            dur = end - start
            if dur < 0.1:
                continue
            seg = tmp / f"seg_{i:04d}.mp4"
            if run_ffmpeg(["ffmpeg", "-y", "-ss", str(start), "-t", str(dur), "-i", str(video_path), "-c", "copy", str(seg)]):
                seg_files.append(seg)

        if not seg_files:
            print("❌ 片段生成失败")
            return 1

        list_path = tmp / "list.txt"
        with open(list_path, "w") as f:
            for seg in seg_files:
                f.write(f"file '{seg}'\n")

        if not run_ffmpeg(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_path), "-c", "copy", str(output_path)]):
            print("❌ 拼接失败")
            return 1

    print(f"✅ 已输出: {output_path}")
    return 0


if __name__ == "__main__":
    exit(main())
