#!/usr/bin/env python3
"""
去语助词（最佳方案）：用 FunASR Paraformer 中文词级时间戳识别 嗯/啊/呃，再 ffmpeg 裁剪。
若未安装 FunASR 则回退到 whisper-timestamped。
"""
import argparse
import re
import subprocess
import tempfile
from pathlib import Path

FILLER_RE = re.compile(r"^[嗯啊呃额哦噢唉哎诶喔]+$")


def get_duration(path: str) -> float:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True
    )
    return float(r.stdout.strip()) if r.returncode == 0 else 0


def extract_audio(video: str, wav: str) -> bool:
    return subprocess.run(
        ["ffmpeg", "-y", "-i", video, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", wav],
        capture_output=True
    ).returncode == 0


def transcribe_funasr(audio_path: str):
    """FunASR 中文词级时间戳，返回 [(word, start_sec, end_sec), ...]"""
    from funasr import AutoModel
    model = AutoModel(
        model="iic/speech_paraformer-large-vad-punc_asr_nat-zh-cn-16k-common-vocab8404-pytorch",
        vad_model="iic/speech_fsmn_vad_zh-cn-16k-common-pytorch",
        punc_model="iic/punc_ct-transformer_zh-cn-common-vocab272727-pytorch",
        device="cpu",
    )
    result = model.generate(input=audio_path, batch_size_s=300)
    words_with_ts = []
    if not result or len(result) == 0:
        return words_with_ts
    for item in result:
        if not item:
            continue
        text = (item.get("text") or "").strip()
        ts = item.get("timestamp") or item.get("timestamps") or []
        # 格式1: timestamp = [[start_ms, end_ms], ...] 与字符逐对
        if isinstance(ts, list) and ts and isinstance(ts[0], (list, tuple)):
            for i, pair in enumerate(ts):
                if len(pair) >= 2:
                    s_ms, e_ms = float(pair[0]), float(pair[1])
                    word = text[i] if i < len(text) else ""
                    words_with_ts.append((word, s_ms / 1000, e_ms / 1000))
            continue
        if isinstance(ts, list) and ts and isinstance(ts[0], dict):
            for w in ts:
                word = w.get("word", w.get("text", ""))
                s = w.get("start", w.get("start_time", 0))
                e = w.get("end", w.get("end_time", 0))
                if s is not None and e is not None:
                    s, e = float(s), float(e)
                    if s > 1000:
                        s, e = s / 1000, e / 1000
                    words_with_ts.append((str(word), s, e))
            continue
        # 整句
        start = item.get("start", item.get("start_time"))
        end = item.get("end", item.get("end_time"))
        if start is not None and end is not None:
            s, e = float(start), float(end)
            if s > 1000:
                s, e = s / 1000, e / 1000
            words_with_ts.append((text, s, e))
    return words_with_ts


def transcribe_whisper_ts(audio_path: str):
    """回退：whisper-timestamped 词级，返回 [(word, start_sec, end_sec), ...]"""
    import whisper_timestamped as whisper
    audio = whisper.load_audio(audio_path)
    model = whisper.load_model("base", device="cpu")
    result = whisper.transcribe(model, audio, language="zh", detect_disfluencies=True)
    words_with_ts = []
    for seg in result.get("segments", []):
        for w in seg.get("words", []):
            text = (w.get("text") or "").strip()
            s, e = w.get("start"), w.get("end")
            if s is not None and e is not None:
                words_with_ts.append((text, float(s), float(e)))
    return words_with_ts


def find_filler_ranges(words_with_ts: list) -> list:
    """从 (word, start, end) 中筛出语助词时间段 [(start_sec, end_sec), ...]"""
    out = []
    for word, s, e in words_with_ts:
        t = re.sub(r"[\s，。、,.\-—…]+", "", str(word).strip())
        if t and FILLER_RE.match(t) and e - s > 0.05:
            out.append((s, e))
    return sorted(out, key=lambda x: x[0])


def build_keep_ranges(remove_ranges: list, total_duration: float) -> list:
    keep = []
    current = 0.0
    for rs, re in sorted(remove_ranges, key=lambda x: x[0]):
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
        print("1. 提取音频 16k...")
        if not extract_audio(str(video_path), str(audio_path)):
            print("❌ 提取音频失败")
            return 1

        words_with_ts = []
        try:
            from funasr import AutoModel
            print("2. FunASR Paraformer 词级转录（中文）...")
            words_with_ts = transcribe_funasr(str(audio_path))
        except ImportError:
            print("2. FunASR 未安装，回退 whisper-timestamped...")
            try:
                words_with_ts = transcribe_whisper_ts(str(audio_path))
            except Exception as e:
                print(f"❌ 转录失败: {e}")
                return 1

        if not words_with_ts:
            print("   未获取到词级时间戳，尝试句子级...")
            try:
                from funasr import AutoModel
                model = AutoModel(model="iic/speech_paraformer-large-vad-punc_asr_nat-zh-cn-16k-common-vocab8404-pytorch", device="cpu")
                result = model.generate(input=str(audio_path), batch_size_s=300)
                for item in (result or []):
                    if not item:
                        continue
                    text = (item.get("text") or "").strip()
                    ts = item.get("timestamp") or []
                    if isinstance(ts, list) and len(ts) >= 2 and isinstance(ts[0], (list, tuple)):
                        for pair in ts:
                            if len(pair) >= 2:
                                s, e = float(pair[0]) / 1000, float(pair[1]) / 1000
                                words_with_ts.append((text, s, e))
                                break
                    start, end = item.get("start"), item.get("end")
                    if start is not None and end is not None:
                        words_with_ts.append((text, float(start) if start < 1000 else start / 1000, float(end) if end < 1000 else end / 1000))
            except Exception as e:
                print(f"   句子级也失败: {e}")

        remove_ranges = find_filler_ranges(words_with_ts)
        print(f"   检测到 {len(remove_ranges)} 处语助词（嗯/啊/呃等）")
        for s, e in remove_ranges[:15]:
            print(f"     {s:.2f}s - {e:.2f}s")
        if len(remove_ranges) > 15:
            print(f"     ... 共 {len(remove_ranges)} 处")

        if not remove_ranges:
            print("   无语助词，复制原视频")
            import shutil
            shutil.copy(str(video_path), str(output_path))
            print(f"✅ 已输出: {output_path}")
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
