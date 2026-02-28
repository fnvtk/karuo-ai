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
CLIP_COUNT = 15
MIN_DURATION = 60   # 最少 1 分钟
MAX_DURATION = 300  # 最多 5 分钟


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
    """规则备用：每段 60-300 秒（1-5 分钟）"""
    segments = parse_srt_segments(transcript_path)
    if not segments:
        return []
    total = segments[-1]["end_sec"] if segments else 0
    seg_dur = min(300, max(60, total / clip_count))  # 每段 1-5 分钟
    result = []
    for i in range(clip_count):
        start_sec = int(i * seg_dur)
        end_sec = min(int(start_sec + seg_dur), int(total - 5))
        if end_sec <= start_sec + 59:  # 不足 1 分钟跳过
            continue
        # 找该时间段内的字幕
        texts = [s["text"] for s in segments if s["end_sec"] >= start_sec and s["start_sec"] <= end_sec]
        joined = " ".join(texts)[:80] if texts else ""
        excerpt = (joined + "..." if len(joined) > 50 else joined) or f"精彩片段{i+1}"
        hook = (excerpt[:18] + "..." if len(excerpt) > 18 else excerpt) or f"精彩片段{i+1}"
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


def srt_to_timestamped_text(srt_path: str, skip_repetitive_head: int = 150) -> str:
    """将 SRT 转为带时间戳的纯文本。跳过开头重复段落（如「我看你不太好」循环）"""
    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read()
    lines = []
    pattern = r"(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n(.*?)(?=\n\n|\Z)"
    for m in re.findall(pattern, content, re.DOTALL):
        start = m[1].replace(",", ".")
        text = m[3].strip().replace("\n", " ")
        lines.append((start, text))
    # 跳过开头重复段，直到出现连续 3 段不同且长度>=5 的内容
    varied_start = 0
    recent = []
    for i, (s, t) in enumerate(lines):
        if len(t) >= 5:
            recent = (recent + [t])[-3:]
            if len(recent) == 3 and len(set(recent)) >= 2:
                varied_start = max(0, i - 2)
                break
        else:
            recent = []
    if varied_start > 0:
        lines = lines[varied_start:]
    # 过滤单字/短句重复段（如「你」循环），连续 5 次以上则整块跳过
    out = []
    prev, cnt = None, 0
    skip_until = -1
    for i, (s, t) in enumerate(lines):
        if len(t) <= 2 and t == prev:
            cnt += 1
            if cnt >= 5 and skip_until < 0:
                skip_until = i  # 开始跳过
            if skip_until >= 0:
                continue
        else:
            prev, cnt = t, 1
            skip_until = -1
        out.append((s, t))
    return "\n".join(f"[{s}] {t}" for s, t in out)


def _sec_to_hhmmss(sec: float) -> str:
    """秒数转为 HH:MM:SS"""
    s = int(sec)
    h, m = s // 3600, (s % 3600) // 60
    ss = s % 60
    return f"{h:02d}:{m:02d}:{ss:02d}"


def _parse_time_to_sec(t: str) -> float:
    """解析 HH:MM:SS、HH:MM:SS.mmm、HH:MM:SS,mmm 为秒"""
    t = str(t).strip().replace(",", ".")
    parts = re.split(r"[:.]", t)
    if len(parts) >= 3:
        try:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        except (ValueError, TypeError):
            pass
    # 纯数字视为秒
    m = re.match(r"^(\d+(?:\.\d+)?)\s*$", t)
    if m:
        return float(m.group(1))
    return 0


def _filter_short_clips(data: list) -> list:
    """过滤掉时长 < 60 秒的切片"""
    result = []
    for item in data:
        if not isinstance(item, dict):
            continue
        st = item.get("start_time") or item.get("start") or "00:00:00"
        et = item.get("end_time") or item.get("end") or "00:01:00"
        dur = _parse_time_to_sec(et) - _parse_time_to_sec(st)
        if dur >= 60:
            result.append(item)
        else:
            print(f"  过滤短片段: {item.get('title','?')} (仅{dur:.0f}秒)", file=sys.stderr)
    return result


def _build_prompt(transcript: str, clip_count: int) -> str:
    """构建高光识别 prompt（提问→回答：有提问时 question/hook_3sec 用提问问题）"""
    txt = transcript[:5000] if len(transcript) > 5000 else transcript
    return f"""识别视频文字稿中的 {clip_count} 个高光片段，直接输出 JSON 数组，第一个字符必须是 [。

重要：若某片段里有人提问（观众/连麦者问的问题），必须提取提问内容填 question，且 hook_3sec 用该提问。成片前3秒先展示提问，再播回答。

示例（有提问）：
[{{"title":"普通人怎么敢跟ZF搞","start_time":"01:12:30","end_time":"01:15:30","question":"普通人怎么敢跟ZF搞？","hook_3sec":"普通人怎么敢跟ZF搞？","cta_ending":"{DEFAULT_CTA}","transcript_excerpt":"维权起头跑通就成生意","reason":"提问+回答完整"}}]
示例（无提问）：
[{{"title":"起头难","start_time":"00:05:55","end_time":"00:08:00","hook_3sec":"没人起头就起头","cta_ending":"{DEFAULT_CTA}","transcript_excerpt":"起头难跑通就能变成付费服务","reason":"核心观点"}}]

文字稿（从时间戳提取 start_time、end_time，每段 60-300 秒）：
{txt}

直接输出 JSON 数组，以 [ 开头。有提问的片段必须带 question 且 hook_3sec 与 question 一致。"""


def _parse_ai_json(text: str) -> list:
    """从 AI 输出中提取 JSON 数组"""
    if not text or not text.strip():
        raise ValueError("AI 返回为空")
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```\s*$", "", text)
    # 优先匹配完整 [...]，若模型只返回单个对象则包成数组
    m = re.search(r"\[[\s\S]*\]", text)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            pass
    # 尝试解析为单个对象后包成数组
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        try:
            return [json.loads(m.group())]
        except json.JSONDecodeError:
            pass
    raise ValueError("未找到合法 JSON 数组或对象")


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
        for key in ["title", "hook_3sec", "question", "transcript_excerpt"]:
            val = item.get(key)
            if val and not _is_mostly_chinese(str(val)):
                translated = _translate_to_chinese(str(val))
                item[key] = (translated if translated else f"片段{i+1}")[:20 if key != "transcript_excerpt" else 50]
        if item.get("cta_ending") and not _is_mostly_chinese(str(item["cta_ending"])):
            item["cta_ending"] = DEFAULT_CTA
        if item.get("reason") and not _is_mostly_chinese(str(item.get("reason", ""))):
            item["reason"] = _translate_to_chinese(str(item["reason"]))[:80] or "干货观点"
    return data


OLLAMA_MODELS = ["qwen2.5:3b", "qwen2.5:1.5b"]  # 优先 3b，能力更强


def call_ollama(transcript: str, clip_count: int = CLIP_COUNT, model: str = "qwen2.5:3b") -> str:
    """调用卡若AI本地模型（Ollama），使用 chat 接口避免对话式误判"""
    import requests
    prompt = _build_prompt(transcript, clip_count)
    system = (
        "你是短视频策划师。用户会提供视频文字稿，你只输出一个 JSON 数组。"
        "若某片段内有人提问（观众/连麦者问的问题），必须提取提问原文填 question，且 hook_3sec 用该提问（前3秒先展示提问再回答）；无提问则 hook_3sec 用金句/悬念。"
        "格式含 title, start_time, end_time, hook_3sec, cta_ending, transcript_excerpt, reason；有提问时加 question。"
        "禁止输出任何非 JSON 内容。"
    )
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                "stream": False,
                "options": {"temperature": 0.2, "num_predict": 8192},
            },
            timeout=300,
        )
        if r.status_code != 200:
            raise RuntimeError(f"Ollama {r.status_code}")
        body = r.json()
        msg = body.get("message", {})
        resp = (msg.get("content") or "").strip()
        if not resp:
            raise RuntimeError("Ollama 返回空响应")
        return resp
    except Exception as e:
        raise RuntimeError(f"Ollama 调用失败: {e}") from e


def main():
    parser = argparse.ArgumentParser(description="高光识别 - AI 分析文字稿输出 highlights.json")
    parser.add_argument("--transcript", "-t", required=True, help="transcript.srt 路径")
    parser.add_argument("--output", "-o", required=True, help="highlights.json 输出路径")
    parser.add_argument("--clips", "-n", type=int, default=CLIP_COUNT, help="切片数量")
    parser.add_argument("--require-ai", action="store_true", help="必须用 AI 识别，失败则退出不兜底")
    args = parser.parse_args()
    transcript_path = Path(args.transcript)
    if not transcript_path.exists():
        print(f"❌ 文字稿不存在: {transcript_path}", file=sys.stderr)
        sys.exit(1)
    text = srt_to_timestamped_text(str(transcript_path))
    if len(text) < 100:
        print("❌ 文字稿过短，请检查 SRT 格式", file=sys.stderr)
        sys.exit(1)
    # 级联：Ollama 3b → 1.5b → 规则备用（--require-ai 时不用规则）
    data = None
    raw = ""
    for model in OLLAMA_MODELS:
        try:
            print(f"正在调用 Ollama {model} 分析高光片段...")
            raw = call_ollama(text, args.clips, model)
            if not raw:
                raise ValueError("模型返回空")
            data = _parse_ai_json(raw)
            if data and isinstance(data, list) and len(data) > 0:
                print(f"  ✓ {model} 成功，识别 {len(data)} 段")
                break
        except Exception as e:
            print(f"  {model} 失败: {e}", file=sys.stderr)
            if raw:
                print(f"  返回预览: {str(raw)[:400]}...", file=sys.stderr)
    if not data or not isinstance(data, list):
        if getattr(args, "require_ai", False):
            print("❌ 必须用 AI 识别，当前无可用模型或解析失败", file=sys.stderr)
            sys.exit(1)
        print("使用规则备用切分", file=sys.stderr)
        data = fallback_highlights(str(transcript_path), args.clips)
    if not data:
        data = fallback_highlights(str(transcript_path), args.clips)
    if not isinstance(data, list):
        data = [data]
    # 过滤短于 1 分钟的切片
    data = _filter_short_clips(data)
    # 统一 start_time/end_time 为 HH:MM:SS（兼容 Ollama 返回秒数）
    for item in data:
        if not isinstance(item, dict):
            continue
        st = item.get("start_time") or item.get("start")
        if isinstance(st, (int, float)):
            item["start_time"] = _sec_to_hhmmss(st)
        et = item.get("end_time") or item.get("end")
        if isinstance(et, (int, float)):
            item["end_time"] = _sec_to_hhmmss(et)
    # 若 AI 返回的片段全被过滤，用规则备用
    if not data and transcript_path.exists():
        print("  AI 片段时长无效，改用规则切分（1-5 分钟）", file=sys.stderr)
        data = fallback_highlights(str(transcript_path), args.clips)
    # 强制中文
    print("  确保导出名与封面为简体中文...")
    data = _ensure_chinese_highlights(data)
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ 已输出 {len(data)} 个高光片段: {out_path}")


if __name__ == "__main__":
    main()
