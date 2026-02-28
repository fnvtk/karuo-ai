#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
按章节正文提取主题片段
========================
以「第9章单场文章」的 .md 正文为来源，提取核心主题，再用本地最佳模型（Ollama）
在转录稿中匹配每段主题的起止时间，输出 highlights.json，供 batch_clip + soul_enhance 使用。

- 主题来源：章节 .md，按 --- 或段落拆成若干核心主题
- 不限 5 分钟：每段按内容完整度定时长，可 1～5 分钟或更长
- 文件名：由 batch_clip 按「前缀_序号_标题」生成，标题来自 title，仅保留中文与安全字符
"""

import argparse
import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
OLLAMA_URL = "http://localhost:11434"
DEFAULT_CTA = "关注我，每天学一招私域干货"
# 本地优先用 7b，失败则回退 1.5b
OLLAMA_MODELS = ["qwen2.5:7b", "qwen2.5:1.5b"]


def parse_chapter_themes(md_path: Path) -> list[dict]:
    """
    从章节 .md 拆出主题列表。
    每个主题：{"title": "简短标题", "text": "该段正文摘要或全文"}
    按 --- 分块，第一块视为开篇/场次信息可跳过，其余每块为一个主题。
    """
    text = md_path.read_text(encoding="utf-8")
    # 按 --- 分块（兼容 --- 前后换行）
    blocks = re.split(r"\n---+\s*\n", text.strip())
    themes = []
    for idx, block in enumerate(blocks):
        block = block.strip()
        # 跳过过短或纯元信息的块（如仅「第112场，135分钟」）
        if not block or len(block) < 25:
            continue
        # 去掉首行的 # 标题、日期、场次
        lines = [ln.strip() for ln in block.split("\n") if ln.strip()]
        first_line = lines[0] if lines else ""
        if idx == 0 and (re.match(r"^#\s+", first_line) or re.match(r"^\d{4}年", first_line) or re.match(r"^第\s*\d+\s*场", first_line)):
            # 第一块若只是标题/日期/场次，取第二行起或整块
            content_lines = lines[1:] if len(lines) > 1 else lines
            if not content_lines:
                continue
            first_line = content_lines[0]
        # 主题标题：首句或前 22 字
        if len(first_line) > 25:
            title = first_line[:22] + "…"
        else:
            title = first_line or "片段"
        excerpt = re.sub(r"\*\*[^*]+\*\*：?", "", block)[:500]
        themes.append({"title": title, "text": excerpt})
    return themes


def parse_srt_segments(srt_path: Path) -> list[dict]:
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
                "start_sec": start_sec, "end_sec": end_sec,
                "start_time": f"{sh:02d}:{sm:02d}:{ss:02d}",
                "end_time": f"{eh:02d}:{em:02d}:{es:02d}",
                "text": text,
            })
    return segments


def fallback_highlights_from_themes(transcript_path: Path, themes: list[dict], min_sec: int = 90, max_sec: int = 300) -> list[dict]:
    """
    规则兜底：用主题关键词在转录稿中定位每段起止时间。
    每个主题取标题/正文前 80 字中的关键词，在 segments 中找首次出现位置，再扩展为 min_sec～max_sec 的完整段。
    """
    segments = parse_srt_segments(transcript_path)
    if not segments:
        return []
    total_sec = segments[-1]["end_sec"]
    used_ranges: list[tuple[float, float]] = []
    result = []

    def _keywords(t: dict) -> list[str]:
        raw = (t.get("title", "") + " " + t.get("text", ""))[:200]
        # 去掉标点，取 2 字以上的词
        words = re.findall(r"[\u4e00-\u9fff]{2,}", raw)
        return list(dict.fromkeys(words))[:8]

    for theme in themes:
        title = theme.get("title", "片段")[:20]
        kws = _keywords(theme)
        if not kws:
            result.append({"title": title, "start_time": "00:00:00", "end_time": "00:01:30", "hook_3sec": title, "cta_ending": DEFAULT_CTA, "transcript_excerpt": title, "reason": "无关键词"})
            continue
        # 找第一个包含任一关键词的 segment 索引
        best_idx = None
        for i, seg in enumerate(segments):
            t = seg["text"]
            if any(kw in t for kw in kws):
                best_idx = i
                break
        if best_idx is None:
            continue
        seg = segments[best_idx]
        start_sec = max(0, seg["start_sec"] - 15)
        end_sec = min(total_sec, seg["end_sec"] + max_sec)
        # 向后扩展至至少 min_sec，最多 max_sec
        end_sec = min(end_sec, start_sec + max_sec)
        if end_sec - start_sec < min_sec:
            end_sec = min(total_sec, start_sec + min_sec)
        overlap = any(not (end_sec <= a or start_sec >= b) for a, b in used_ranges)
        if overlap:
            continue
        used_ranges.append((start_sec, end_sec))
        texts = [s["text"] for s in segments if s["end_sec"] >= start_sec and s["start_sec"] <= end_sec]
        excerpt = (" ".join(texts)[:50] + "…") if texts else title
        result.append({
            "title": title,
            "start_time": _sec_to_hhmmss(start_sec),
            "end_time": _sec_to_hhmmss(end_sec),
            "hook_3sec": (title[:15] + "…") if len(title) > 15 else title,
            "cta_ending": DEFAULT_CTA,
            "transcript_excerpt": excerpt,
            "reason": "按章节主题关键词定位",
        })
    return result


def srt_to_timestamped_text(srt_path: Path) -> str:
    """SRT 转为带时间戳的纯文本，供模型阅读"""
    content = srt_path.read_text(encoding="utf-8")
    lines = []
    pattern = r"(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n(.*?)(?=\n\n|\Z)"
    for m in re.findall(pattern, content, re.DOTALL):
        start = m[1].replace(",", ".")
        text = m[3].strip().replace("\n", " ")
        lines.append(f"[{start}] {text}")
    return "\n".join(lines)


def _sec_to_hhmmss(sec: float) -> str:
    s = int(sec)
    h, m = s // 3600, (s % 3600) // 60
    ss = s % 60
    return f"{h:02d}:{m:02d}:{ss:02d}"


def _parse_time_to_sec(t: str) -> float:
    """解析 HH:MM:SS 或秒数为秒"""
    t = str(t).strip().replace(",", ".")
    parts = re.split(r"[:.]", t)
    if len(parts) >= 3:
        try:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        except (ValueError, TypeError):
            pass
    try:
        return float(t)
    except ValueError:
        return 0


def _filter_short_clips(data: list[dict], min_sec: float = 60) -> list[dict]:
    """过滤时长小于 min_sec 的片段"""
    result = []
    for item in data:
        if not isinstance(item, dict):
            continue
        st = item.get("start_time") or item.get("start") or "00:00:00"
        et = item.get("end_time") or item.get("end") or "00:01:00"
        dur = _parse_time_to_sec(et) - _parse_time_to_sec(st)
        if dur >= min_sec:
            result.append(item)
        else:
            print(f"  过滤短片段: {item.get('title','?')} (仅{dur:.0f}秒)", file=sys.stderr)
    return result


def call_ollama_chapter_themes(transcript_text: str, themes: list[dict], model: str, max_tokens: int = 8192) -> list[dict]:
    """
    用 Ollama 根据「章节主题」在转录稿中定位每段起止时间。
    返回 list[dict]，每项含 start_time, end_time, title, hook_3sec, cta_ending, transcript_excerpt, reason。
    """
    import requests

    themes_desc = "\n".join([f"- {t['title']}: {t['text'][:200]}…" for t in themes])
    transcript_trim = transcript_text[:22000] if len(transcript_text) > 22000 else transcript_text

    prompt = f"""你是短视频策划。下面是一篇「第9章单场文章」拆出的核心主题，以及该场派对视频的带时间戳文字稿。
请为【每一个主题】在文字稿中找出最匹配的【一段连续内容】，给出精确的 start_time 和 end_time。
每段时长 60 秒～5 分钟均可，以「主题完整、有头有尾」为准，不限于 5 分钟。

【章节主题】
{themes_desc}

【输出要求】
- 只输出一个 JSON 数组，不要 ``` 或其它说明
- 每个元素必须包含：title, start_time, end_time, hook_3sec, cta_ending, transcript_excerpt, reason
- start_time / end_time 格式为 HH:MM:SS，且必须来自下面文字稿中的时间戳
- title 用该主题的简短标题（15 字内），hook_3sec 用该段前 3 秒可用的金句（15 字内）
- cta_ending 统一用：「{DEFAULT_CTA}」
- transcript_excerpt：该段内容 50 字内摘要
- reason：为何这段对应该主题（一句话）

【视频文字稿】
---
{transcript_trim}
---"""

    r = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.2, "num_predict": max_tokens},
        },
        timeout=180,
    )
    if r.status_code != 200:
        raise RuntimeError(f"Ollama {r.status_code}")
    raw = r.json().get("response", "").strip()

    # 解析 JSON 数组
    m = re.search(r"\[[\s\S]*\]", raw)
    if not m:
        raise ValueError("模型未返回合法 JSON 数组")
    data = json.loads(m.group())

    out = []
    for item in data:
        if not isinstance(item, dict):
            continue
        st = item.get("start_time") or item.get("start")
        et = item.get("end_time") or item.get("end")
        if isinstance(st, (int, float)):
            item["start_time"] = _sec_to_hhmmss(st)
        if isinstance(et, (int, float)):
            item["end_time"] = _sec_to_hhmmss(et)
        item.setdefault("cta_ending", DEFAULT_CTA)
        item.setdefault("title", item.get("theme", "片段"))
        out.append(item)
    return out


def main():
    parser = argparse.ArgumentParser(description="按章节正文提取主题片段 → highlights.json")
    parser.add_argument("--chapter", "-c", required=True, help="章节 .md 路径（第9章单场文章）")
    parser.add_argument("--transcript", "-t", required=True, help="transcript.srt 路径")
    parser.add_argument("--output", "-o", required=True, help="highlights.json 输出路径")
    parser.add_argument("--model", "-m", default="", help="Ollama 模型，默认优先 7b 再 1.5b")
    args = parser.parse_args()

    models_to_try = [args.model] if args.model else OLLAMA_MODELS

    chapter_path = Path(args.chapter).resolve()
    transcript_path = Path(args.transcript).resolve()
    if not chapter_path.exists():
        print(f"❌ 章节不存在: {chapter_path}", file=sys.stderr)
        sys.exit(1)
    if not transcript_path.exists():
        print(f"❌ 转录稿不存在: {transcript_path}", file=sys.stderr)
        sys.exit(1)

    print("1. 从章节正文提取核心主题...")
    themes = parse_chapter_themes(chapter_path)
    print(f"   共 {len(themes)} 个主题")
    for i, t in enumerate(themes[:10], 1):
        print(f"   - {i}. {t['title']}")
    if len(themes) > 10:
        print(f"   ... 等共 {len(themes)} 个")

    print("2. 转录稿转带时间戳文本...")
    transcript_text = srt_to_timestamped_text(transcript_path)

    print("3. 调用本地模型匹配主题与时间...")
    highlights = None
    for model in models_to_try:
        try:
            print(f"   尝试 {model} ...")
            highlights = call_ollama_chapter_themes(transcript_text, themes, model)
            break
        except Exception as e:
            print(f"   {model} 失败: {e}", file=sys.stderr)
    if not highlights:
        print("   使用规则兜底：按主题关键词在转录稿中定位时间段...", file=sys.stderr)
        highlights = fallback_highlights_from_themes(transcript_path, themes)
    if not highlights:
        print("❌ 无法生成 highlights（模型失败且规则兜底无匹配）", file=sys.stderr)
        sys.exit(1)
    highlights = _filter_short_clips(highlights)

    out_path = Path(args.output).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(highlights, f, ensure_ascii=False, indent=2)
    print(f"✅ 已输出 {len(highlights)} 个主题片段: {out_path}")
    print("   后续：batch_clip -i 视频 -l 本文件 -o clips/ -p soul112 → soul_enhance 带封面与字幕")


if __name__ == "__main__":
    main()
