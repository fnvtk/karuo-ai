#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
高光识别 - AI 分析视频文字稿，输出高光片段 JSON
级联：Ollama(卡若AI本地) → 规则备用
只用已有能力，不依赖 Gemini/Groq
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

OLLAMA_URL = "http://localhost:11434"
DEFAULT_CTA = "关注我，每天学一招私域干货"
CLIP_COUNT = 8
MIN_DURATION = 60   # 1 分钟起
MAX_DURATION = 180  # 3 分钟


def parse_srt_segments(srt_path: str) -> list:
    """解析 SRT 为 [{start, end, text}, ...]"""
    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read()
    segments = []
    pattern = r"(\d+)\n(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})\n(.*?)(?=\n\n|\Z)"
    for m in re.findall(pattern, content, re.DOTALL):
        sh, sm, ss = int(m[1]), int(m[2]), int(m[3])
        eh, em, es = int(m[5]), int(m[6]), int(m[7])
        start_sec = sh * 3600 + sm * 60 + ss
        end_sec = eh * 3600 + em * 60 + es
        text = m[9].strip().replace("\n", " ")
        if len(text) > 3:
            segments.append({
                "start_sec": start_sec, "end_sec": end_sec,
                "start_time": f"{sh:02d}:{sm:02d}:{ss:02d}",
                "end_time": f"{eh:02d}:{em:02d}:{es:02d}",
                "text": text,
            })
    return segments


def fallback_highlights(transcript_path: str, clip_count: int) -> list:
    """规则备用：按时长均匀切分，每段 60-180 秒"""
    segments = parse_srt_segments(transcript_path)
    if not segments:
        return []
    total = segments[-1]["end_sec"] if segments else 0
    interval = max(120, total / clip_count)  # 每段约 2 分钟
    result = []
    for i in range(clip_count):
        start_sec = int(interval * i + 30)
        end_sec = min(int(start_sec + 120), int(total - 5))  # 约 2 分钟
        if end_sec <= start_sec + 30:
            continue
        # 找该时间段内的字幕
        texts = [s["text"] for s in segments if s["end_sec"] >= start_sec and s["start_sec"] <= end_sec]
        excerpt = (texts[0][:50] + "..." if texts and len(texts[0]) > 50 else (texts[0] if texts else ""))
        hook = (excerpt[:15] + "..." if len(excerpt) > 15 else excerpt) or f"精彩片段{i+1}"
        h, m, s = start_sec // 3600, (start_sec % 3600) // 60, start_sec % 60
        eh, em, es = end_sec // 3600, (end_sec % 3600) // 60, end_sec % 60
        result.append({
            "title": hook[:20],
            "start_time": f"{h:02d}:{m:02d}:{s:02d}",
            "end_time": f"{eh:02d}:{em:02d}:{es:02d}",
            "hook_3sec": hook,
            "cta_ending": DEFAULT_CTA,
            "transcript_excerpt": excerpt,
            "reason": "按时间均匀切分",
        })
    return result


def srt_to_timestamped_text(srt_path: str) -> str:
    """将 SRT 转为带时间戳的纯文本"""
    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read()
    lines = []
    pattern = r"(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n(.*?)(?=\n\n|\Z)"
    for m in re.findall(pattern, content, re.DOTALL):
        start = m[1].replace(",", ".")
        text = m[3].strip().replace("\n", " ")
        lines.append(f"[{start}] {text}")
    return "\n".join(lines)


def _build_prompt(transcript: str, clip_count: int) -> str:
    """构建高光识别 prompt（完整观点+干货，1-3分钟，全中文）"""
    txt = transcript[:18000] if len(transcript) > 18000 else transcript
    return f"""你是资深短视频策划师。请从视频文字稿中识别 {clip_count} 个**完整的核心观点/干货片段**。

【切片原则】
- 每个片段必须是**完整的一个话题/观点**，有头有尾，逻辑闭环，不能截断
- 时长 **60-180 秒（1-3 分钟）**，尽量接近 2 分钟，确保内容完整
- 优先选：金句、完整故事、可操作方法论、反常识观点、情绪高点、成体系讲解
- 相邻片段间隔至少 60 秒

【输出字段】所有内容**必须使用简体中文**，若原文是英文请翻译后填写：
- title: 核心观点标题（15字内，用于文件名）
- start_time: "HH:MM:SS"（从文字稿时间戳精确提取）
- end_time: "HH:MM:SS"
- hook_3sec: 封面 Hook 文案（15字内，吸引点击）
- cta_ending: "{DEFAULT_CTA}"
- transcript_excerpt: 本片段核心内容摘要（50字内，中文）
- reason: 推荐理由（中文）

【强制】title、hook_3sec、transcript_excerpt、reason 必须全部简体中文，禁止英文。
只输出 JSON 数组，不要 ``` 或其他文字。

视频文字稿：
---
{txt}
---"""


def _parse_ai_json(text: str) -> list:
    """从 AI 输出中提取 JSON 数组"""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```\s*$", "", text)
    # 尝试找到 [...]
    m = re.search(r"\[[\s\S]*\]", text)
    if m:
        return json.loads(m.group())
    return json.loads(text)


def _is_mostly_chinese(text: str) -> bool:
    """判断文本是否主要为中文"""
    if not text or not isinstance(text, str):
        return True
    chinese = sum(1 for c in text if "\u4e00" <= c <= "\u9fff")
    return chinese / max(1, len(text.strip())) > 0.3


def _translate_to_chinese(text: str) -> str:
    """用 Ollama 将英文翻译为中文"""
    if not text or _is_mostly_chinese(text):
        return text
    import requests
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": "qwen2.5:1.5b",
                "prompt": f"将以下英文翻译成简体中文，只输出中文翻译结果，不要其他内容：\n{text[:200]}",
                "stream": False,
                "options": {"temperature": 0.1, "num_predict": 100},
            },
            timeout=30,
        )
        if r.status_code == 200:
            out = r.json().get("response", "").strip()
            if out and _is_mostly_chinese(out):
                return out.split("\n")[0][:50]
    except Exception:
        pass
    return text


def _ensure_chinese_highlights(data: list) -> list:
    """确保 title、hook_3sec、transcript_excerpt 全为中文，无英文"""
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            continue
        for key in ["title", "hook_3sec", "transcript_excerpt"]:
            val = item.get(key)
            if val and not _is_mostly_chinese(str(val)):
                translated = _translate_to_chinese(str(val))
                item[key] = (translated if translated else f"片段{i+1}")[:20 if key != "transcript_excerpt" else 50]
        if item.get("cta_ending") and not _is_mostly_chinese(str(item["cta_ending"])):
            item["cta_ending"] = DEFAULT_CTA
        if item.get("reason") and not _is_mostly_chinese(str(item.get("reason", ""))):
            item["reason"] = _translate_to_chinese(str(item["reason"]))[:80] or "干货观点"
    return data


def call_ollama(transcript: str, clip_count: int = CLIP_COUNT) -> str:
    """调用卡若AI本地模型（Ollama）"""
    import requests
    prompt = _build_prompt(transcript, clip_count)
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": "qwen2.5:1.5b",
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.3, "num_predict": 4096},
            },
            timeout=90,
        )
        if r.status_code != 200:
            raise RuntimeError(f"Ollama {r.status_code}")
        return r.json().get("response", "").strip()
    except Exception as e:
        raise RuntimeError(f"Ollama 调用失败: {e}") from e


def main():
    parser = argparse.ArgumentParser(description="高光识别 - AI 分析文字稿输出 highlights.json")
    parser.add_argument("--transcript", "-t", required=True, help="transcript.srt 路径")
    parser.add_argument("--output", "-o", required=True, help="highlights.json 输出路径")
    parser.add_argument("--clips", "-n", type=int, default=CLIP_COUNT, help="切片数量")
    args = parser.parse_args()
    transcript_path = Path(args.transcript)
    if not transcript_path.exists():
        print(f"❌ 文字稿不存在: {transcript_path}", file=sys.stderr)
        sys.exit(1)
    text = srt_to_timestamped_text(str(transcript_path))
    if len(text) < 100:
        print("❌ 文字稿过短，请检查 SRT 格式", file=sys.stderr)
        sys.exit(1)
    # 级联：Ollama(卡若AI本地) → 规则备用
    data = None
    for name, fn in [
        ("Ollama (卡若AI本地)", call_ollama),
    ]:
        try:
            print(f"正在调用 {name} 分析高光片段...")
            raw = fn(text, args.clips)
            data = _parse_ai_json(raw)
            if data and isinstance(data, list) and len(data) > 0:
                break
        except Exception as e:
            print(f"{name} 调用失败 ({e})", file=sys.stderr)
    if not data or not isinstance(data, list):
        print("使用规则备用切分", file=sys.stderr)
        data = fallback_highlights(str(transcript_path), args.clips)
    if not data:
        data = fallback_highlights(str(transcript_path), args.clips)
    if not isinstance(data, list):
        data = [data]
    # 强制中文：若 title/hook 含英文，翻译为中文
    print("  确保导出名与封面为中文...")
    data = _ensure_chinese_highlights(data)
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ 已输出 {len(data)} 个高光片段: {out_path}")


if __name__ == "__main__":
    main()
