#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
高光识别 - AI 分析视频文字稿，输出高光片段 JSON
级联：环境已配置的 API 队列优先（OPENAI_API_*）→ Ollama → 规则备用。
--api-only：仅 API，禁止 Ollama/规则；未配置任何 API 时直接退出（可选）。
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Optional

OLLAMA_URL = "http://localhost:11434"
DEFAULT_CTA = "关注我，每天学一招私域干货"
CLIP_COUNT = 15
MIN_DURATION = 60   # 最少 1 分钟（长切片默认）
MAX_DURATION = 300  # 最多 5 分钟
# 运营短切片默认：单场产出高密度短视频，便于抖音/热点测试
OPS_SHORT_MIN = 15
OPS_SHORT_MAX = 30
OPS_SHORT_CLIPS = 24
# 飞书/录屏开场常见 ASR 鬼畜循环，运营短切片喂给模型的文字稿从该秒之后开始（约 7:30）
OPS_SHORT_PROMPT_MIN_SEC_DEFAULT = 450.0
# API 默认模型：优先用当前可用最佳（可被 OPENAI_MODEL / OPENAI_MODELS 覆盖）
DEFAULT_API_MODEL = "gpt-4o"


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


def fallback_highlights(
    transcript_path: str,
    clip_count: int,
    min_dur: float = 60,
    max_dur: float = 300,
    start_from_sec: float = 0,
) -> list:
    """规则备用：按 min_dur～max_dur 均匀切分；可从 start_from_sec 起切（运营短切片对齐正片起点）。"""
    segments = parse_srt_segments(transcript_path)
    if not segments:
        return []
    total = segments[-1]["end_sec"] if segments else 0
    start_from_sec = max(0, min(float(start_from_sec), max(0, total - min_dur - 2)))
    usable = max(0, total - start_from_sec - 2)
    target = usable / max(1, clip_count)
    seg_dur = min(max_dur, max(min_dur, target))
    result = []
    for i in range(clip_count):
        start_sec = int(start_from_sec + i * seg_dur)
        end_sec = min(int(start_sec + seg_dur), int(total - 2))
        if end_sec <= start_sec + max(5, min_dur - 1):
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


def srt_text_from_min_sec(srt_path: str, min_start_sec: float) -> str:
    """只保留字幕开始时间 >= min_start_sec 的行，拼成带时间戳文本（削掉开场噪声再送模型）。"""
    segments = parse_srt_segments(srt_path)
    if not segments:
        return ""
    lines = [
        f"[{s['start_time']}] {s['text']}"
        for s in segments
        if s["start_sec"] >= min_start_sec
    ]
    return "\n".join(lines)


def _filter_start_not_before(data: list, min_start_sec: float) -> list:
    """丢弃开始时间早于 min_start_sec 的片段（运营短切片防开场鬼畜）。"""
    out = []
    for item in data:
        if not isinstance(item, dict):
            continue
        st = item.get("start_time") or item.get("start") or "00:00:00"
        if isinstance(st, (int, float)):
            sec = float(st)
        else:
            sec = _parse_time_to_sec(str(st))
        if sec >= min_start_sec:
            out.append(item)
        else:
            print(
                f"  过滤过早片段: {item.get('title', '?')} (起 {sec:.0f}s < {min_start_sec:.0f}s)",
                file=sys.stderr,
            )
    return out


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


def _filter_clips_by_duration(data: list, min_sec: float, max_sec: Optional[float]) -> list:
    """按时长过滤；max_sec 为 None 时不限制上限"""
    result = []
    for item in data:
        if not isinstance(item, dict):
            continue
        st = item.get("start_time") or item.get("start") or "00:00:00"
        et = item.get("end_time") or item.get("end") or "00:01:00"
        dur = _parse_time_to_sec(et) - _parse_time_to_sec(st)
        ok_min = dur >= min_sec
        ok_max = max_sec is None or dur <= max_sec
        if ok_min and ok_max:
            result.append(item)
        else:
            why = []
            if not ok_min:
                why.append(f"短于{min_sec:.0f}秒")
            if not ok_max:
                why.append(f"长于{max_sec:.0f}秒")
            print(
                f"  过滤片段: {item.get('title','?')} ({dur:.0f}秒, {','.join(why)})",
                file=sys.stderr,
            )
    return result


def _ops_short_ai_plausible(
    data: list,
    min_dur: float,
    max_dur: float,
    min_start_sec: float,
    min_count: int = 5,
) -> bool:
    """运营短切片：AI 必须给出足够条数，且每条时长与起点符合窗口，否则走规则均匀切。"""
    if not data or not isinstance(data, list) or len(data) < min_count:
        return False
    tol = 1.5
    for item in data:
        if not isinstance(item, dict):
            return False
        st = item.get("start_time") or item.get("start") or "00:00:00"
        et = item.get("end_time") or item.get("end") or "00:01:00"
        if isinstance(st, (int, float)):
            st = _sec_to_hhmmss(float(st))
        if isinstance(et, (int, float)):
            et = _sec_to_hhmmss(float(et))
        try:
            ssec = _parse_time_to_sec(str(st))
            esec = _parse_time_to_sec(str(et))
        except Exception:
            return False
        dur = esec - ssec
        if dur < min_dur - tol or dur > max_dur + tol:
            return False
        if min_start_sec > 0 and ssec < min_start_sec - tol:
            return False
    return True


def _transcript_for_prompt(transcript: str, clip_count: int, min_dur: float) -> str:
    """长视频多短切片时需要更大上下文，避免高光只落在开头"""
    if min_dur < 45 or clip_count > 12:
        cap = 120000
    else:
        cap = 5000
    return transcript[:cap] if len(transcript) > cap else transcript


def _build_prompt(
    transcript: str,
    clip_count: int,
    min_dur: float = 60,
    max_dur: float = 300,
    ops_jingju_hotspot: bool = False,
) -> str:
    """构建高光识别 prompt（提问→回答：有提问时 question/hook_3sec 用提问问题）"""
    txt = _transcript_for_prompt(transcript, clip_count, min_dur)
    dur_rule = f"每段时长必须严格在 {int(min_dur)}～{int(max_dur)} 秒之间（看时间戳相减），不要输出低于 {int(min_dur)} 秒或超过 {int(max_dur)} 秒的区间。"
    extra = ""
    if ops_jingju_hotspot:
        extra = """
## 运营短切片选题（优先）
- 优先剪：说话人用**京剧、戏曲、唱腔、行当、锣鼓**等做的比喻或梗（有趣、反差、易传播）。
- 其次：当场**热点词**（平台规则、搞钱案例、AI/职场/流量等强刺激观点），一句话能当标题。
- 仍遵守提问→回答：有提问时 question + hook_3sec 一致。
- 标题 **4～10 个汉字**，要像抖音封面，忌长句。
"""
    return f"""识别视频文字稿中的 {clip_count} 个高光片段，直接输出 JSON 数组，第一个字符必须是 [。

重要：每个话题均优先提问→回答。若某片段里有人提问（观众/连麦者问的问题），必须提取提问内容填 question，且 hook_3sec 用该提问；成片前3秒先展示提问，再播回答。
{dur_rule}
{extra}
示例（有提问）：
[{{"title":"普通人怎么敢跟ZF搞","start_time":"01:12:30","end_time":"01:15:30","question":"普通人怎么敢跟ZF搞？","hook_3sec":"普通人怎么敢跟ZF搞？","cta_ending":"{DEFAULT_CTA}","transcript_excerpt":"维权起头跑通就成生意","reason":"提问+回答完整"}}]
示例（无提问）：
[{{"title":"起头难","start_time":"00:05:55","end_time":"00:08:00","hook_3sec":"没人起头就起头","cta_ending":"{DEFAULT_CTA}","transcript_excerpt":"起头难跑通就能变成付费服务","reason":"核心观点"}}]

文字稿（从时间戳提取 start_time、end_time；整场均匀覆盖，不要扎堆在同一分钟）：
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


def _ensure_chinese_highlights(data: list, api_only: bool = False) -> list:
    """确保 title、hook_3sec、transcript_excerpt 全为中文，无英文。
    api_only=True 时禁止调用本地 Ollama 翻译，非中文字段改为简体占位文案。"""
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            continue
        for key in ["title", "hook_3sec", "question", "transcript_excerpt"]:
            val = item.get(key)
            if val and not _is_mostly_chinese(str(val)):
                if api_only:
                    lim = 20 if key != "transcript_excerpt" else 50
                    item[key] = (f"干货片段{i + 1}" if key != "transcript_excerpt" else f"精彩片段{i + 1}摘要")[:lim]
                else:
                    translated = _translate_to_chinese(str(val))
                    item[key] = (translated if translated else f"片段{i+1}")[:20 if key != "transcript_excerpt" else 50]
        if item.get("cta_ending") and not _is_mostly_chinese(str(item["cta_ending"])):
            item["cta_ending"] = DEFAULT_CTA
        if item.get("reason") and not _is_mostly_chinese(str(item.get("reason", ""))):
            if api_only:
                item["reason"] = "核心观点"
            else:
                item["reason"] = _translate_to_chinese(str(item["reason"]))[:80] or "干货观点"
    return data


OLLAMA_MODELS = ["qwen2.5:3b", "qwen2.5:1.5b"]  # 优先 3b，能力更强


def _split_csv(s: str) -> list:
    return [x.strip() for x in (s or "").split(",") if x.strip()]


def _build_api_provider_queue() -> list:
    """
    构建 API 接口队列：OPENAI_API_BASES/KEYS/MODELS 或单接口 OPENAI_API_BASE/KEY/MODEL。
    返回 [{"base_url", "api_key", "model"}, ...]，无配置时返回空列表。
    """
    bases = _split_csv(os.environ.get("OPENAI_API_BASES", ""))
    keys = _split_csv(os.environ.get("OPENAI_API_KEYS", ""))
    models = _split_csv(os.environ.get("OPENAI_MODELS", ""))
    single_base = (os.environ.get("OPENAI_API_BASE") or "https://api.openai.com/v1").strip()
    single_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    single_model = (os.environ.get("OPENAI_MODEL") or DEFAULT_API_MODEL).strip() or DEFAULT_API_MODEL
    queue = []
    if bases:
        for i, b in enumerate(bases):
            key = keys[i] if i < len(keys) and keys[i] else single_key
            model = models[i] if i < len(models) and models[i] else single_model
            if b and key:
                queue.append({"base_url": b.rstrip("/"), "api_key": key, "model": model})
    elif single_key:
        queue.append({"base_url": single_base.rstrip("/"), "api_key": single_key, "model": single_model})
    return queue


def call_openai_api(
    transcript: str,
    clip_count: int,
    provider: dict,
    min_dur: float = 60,
    max_dur: float = 300,
    ops_jingju_hotspot: bool = False,
) -> str:
    """调用 OpenAI 兼容 API（Chat Completion），使用指定 base_url / api_key / model。"""
    try:
        from openai import OpenAI
    except ImportError:
        raise RuntimeError("未安装 openai 库，请执行: pip install openai")
    prompt = _build_prompt(
        transcript, clip_count, min_dur, max_dur, ops_jingju_hotspot=ops_jingju_hotspot
    )
    system = (
        "你是短视频策划师。用户会提供视频文字稿，你只输出一个 JSON 数组。"
        "若某片段内有人提问（观众/连麦者问的问题），必须提取提问原文填 question，且 hook_3sec 用该提问（前3秒先展示提问再回答）；无提问则 hook_3sec 用金句/悬念。"
        "格式含 title, start_time, end_time, hook_3sec, cta_ending, transcript_excerpt, reason；有提问时加 question。"
        "必须严格遵守用户给出的单段时长区间（秒）。禁止输出任何非 JSON 内容。"
    )
    client = OpenAI(api_key=provider["api_key"], base_url=provider["base_url"])
    resp = client.chat.completions.create(
        model=provider["model"],
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=8192,
    )
    content = (resp.choices[0].message.content or "").strip()
    if not content:
        raise RuntimeError("API 返回空内容")
    return content


def call_ollama(
    transcript: str,
    clip_count: int = CLIP_COUNT,
    model: str = "qwen2.5:3b",
    min_dur: float = 60,
    max_dur: float = 300,
    ops_jingju_hotspot: bool = False,
) -> str:
    """调用卡若AI本地模型（Ollama），使用 chat 接口避免对话式误判"""
    import requests
    prompt = _build_prompt(
        transcript, clip_count, min_dur, max_dur, ops_jingju_hotspot=ops_jingju_hotspot
    )
    system = (
        "你是短视频策划师。用户会提供视频文字稿，你只输出一个 JSON 数组。"
        "若某片段内有人提问（观众/连麦者问的问题），必须提取提问原文填 question，且 hook_3sec 用该提问（前3秒先展示提问再回答）；无提问则 hook_3sec 用金句/悬念。"
        "格式含 title, start_time, end_time, hook_3sec, cta_ending, transcript_excerpt, reason；有提问时加 question。"
        "必须严格遵守用户给出的单段时长区间（秒）。禁止输出任何非 JSON 内容。"
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
    parser.add_argument("--clips", "-n", type=int, default=None, help="切片数量（默认随 preset）")
    parser.add_argument(
        "--preset",
        choices=["long", "ops-short"],
        default="long",
        help="long=单场深度切片 60～300 秒；ops-short=运营短切片 15～30 秒×约24条，京剧梗+热点优先",
    )
    parser.add_argument(
        "--min-duration",
        type=float,
        default=None,
        help="单段最小时长（秒），默认随 preset",
    )
    parser.add_argument(
        "--max-duration",
        type=float,
        default=None,
        help="单段最大时长（秒），默认随 preset；长切片模式可不限制上限则传极大值",
    )
    parser.add_argument(
        "--ops-jingju-hotspot",
        action="store_true",
        help="在 prompt 中强调京剧比喻/唱腔梗 + 热点选题（可与 ops-short 同用）",
    )
    parser.add_argument(
        "--prompt-min-sec",
        type=float,
        default=None,
        help="送模型的 SRT 从该秒之后截取；ops-short 默认 450（约7:30），long 默认 0",
    )
    parser.add_argument("--require-ai", action="store_true", help="必须用 AI 识别，失败则退出不兜底")
    parser.add_argument(
        "--api-only",
        action="store_true",
        help="仅使用 OpenAI 兼容 API 队列（OPENAI_API_*），禁止 Ollama、禁止规则均匀切分兜底；未配置 API 时直接退出",
    )
    args = parser.parse_args()

    if args.preset == "ops-short":
        min_dur = float(args.min_duration if args.min_duration is not None else OPS_SHORT_MIN)
        max_dur = float(args.max_duration if args.max_duration is not None else OPS_SHORT_MAX)
        clip_n = int(args.clips if args.clips is not None else OPS_SHORT_CLIPS)
        ops_focus = True  # 运营短切片默认强调京剧梗+热点
        filter_max_sec = max_dur  # 严格卡上限
    else:
        min_dur = float(args.min_duration if args.min_duration is not None else MIN_DURATION)
        max_dur = float(args.max_duration if args.max_duration is not None else MAX_DURATION)
        clip_n = int(args.clips if args.clips is not None else CLIP_COUNT)
        ops_focus = bool(args.ops_jingju_hotspot)
        filter_max_sec = None  # 与历史一致：只滤掉过短，不因略超 300 秒丢片
    prompt_min_sec = (
        float(args.prompt_min_sec)
        if args.prompt_min_sec is not None
        else (
            OPS_SHORT_PROMPT_MIN_SEC_DEFAULT
            if args.preset == "ops-short"
            else 0.0
        )
    )
    transcript_path = Path(args.transcript)
    if not transcript_path.exists():
        print(f"❌ 文字稿不存在: {transcript_path}", file=sys.stderr)
        sys.exit(1)
    if prompt_min_sec > 0:
        text = srt_text_from_min_sec(str(transcript_path), prompt_min_sec)
        if len(text) < 400:
            print(
                "⚠️ 截断后文字稿过短，回退 srt_to_timestamped_text 全长",
                file=sys.stderr,
            )
            text = srt_to_timestamped_text(str(transcript_path))
        else:
            print(
                f"  运营短切片：送模型文字稿已从 {prompt_min_sec:.0f}s 之后截取（约 {len(text)} 字）",
                flush=True,
            )
    else:
        text = srt_to_timestamped_text(str(transcript_path))
    fb_start = float(prompt_min_sec) if args.preset == "ops-short" else 0.0
    if len(text) < 100:
        print("❌ 文字稿过短，请检查 SRT 格式", file=sys.stderr)
        sys.exit(1)
    api_only = bool(getattr(args, "api_only", False))
    if api_only and not _build_api_provider_queue():
        print(
            "❌ --api-only 已开启但未配置 API：请设置 OPENAI_API_KEY，或 OPENAI_API_BASES + OPENAI_API_KEYS（及可选 OPENAI_MODELS）",
            file=sys.stderr,
        )
        sys.exit(1)
    # 级联：API 优先（当前可用最佳模型）→ Ollama → 规则备用（--api-only 或 --require-ai 时不用后两者）
    data = None
    raw = ""
    api_queue = _build_api_provider_queue()
    for provider in api_queue:
        try:
            print(f"正在调用 API {provider.get('model', '?')} 分析高光片段...")
            raw = call_openai_api(
                text,
                clip_n,
                provider,
                min_dur=min_dur,
                max_dur=max_dur,
                ops_jingju_hotspot=ops_focus,
            )
            if not raw:
                raise ValueError("API 返回空")
            data = _parse_ai_json(raw)
            if data and isinstance(data, list) and len(data) > 0:
                if args.preset == "ops-short" and not _ops_short_ai_plausible(
                    data, min_dur, max_dur, prompt_min_sec
                ):
                    print(
                        "  API 结果不符合运营短切片规则，丢弃并尝试下一通道",
                        file=sys.stderr,
                    )
                    data = None
                else:
                    print(f"  ✓ API ({provider.get('model', '?')}) 成功，识别 {len(data)} 段")
                    break
        except Exception as e:
            print(f"  API ({provider.get('model', '?')}) 失败: {e}", file=sys.stderr)
            if raw:
                print(f"  返回预览: {str(raw)[:400]}...", file=sys.stderr)
            data = None
    if (not data or not isinstance(data, list)) and not api_queue:
        pass  # 未配置 API，继续尝试 Ollama
    elif data and isinstance(data, list) and len(data) > 0:
        pass  # API 已成功，保持 data
    else:
        data = None
    if (not data or not isinstance(data, list)) and not api_only:
        for model in OLLAMA_MODELS:
            try:
                print(f"正在调用 Ollama {model} 分析高光片段...")
                raw = call_ollama(
                    text,
                    clip_n,
                    model,
                    min_dur=min_dur,
                    max_dur=max_dur,
                    ops_jingju_hotspot=ops_focus,
                )
                if not raw:
                    raise ValueError("模型返回空")
                data = _parse_ai_json(raw)
                if data and isinstance(data, list) and len(data) > 0:
                    if args.preset == "ops-short" and not _ops_short_ai_plausible(
                        data, min_dur, max_dur, prompt_min_sec
                    ):
                        print(
                            f"  {model} 结果不符合运营短切片规则，尝试下一模型",
                            file=sys.stderr,
                        )
                        data = None
                    else:
                        print(f"  ✓ {model} 成功，识别 {len(data)} 段")
                        break
            except Exception as e:
                print(f"  {model} 失败: {e}", file=sys.stderr)
                if raw:
                    print(f"  返回预览: {str(raw)[:400]}...", file=sys.stderr)
                data = None
    if not data or not isinstance(data, list):
        if getattr(args, "require_ai", False) or api_only:
            print(
                "❌ 高光识别失败：API 无可用结果（--api-only / --require-ai 下不使用 Ollama 与规则切分）",
                file=sys.stderr,
            )
            sys.exit(1)
        print("使用规则备用切分", file=sys.stderr)
        data = fallback_highlights(
            str(transcript_path), clip_n, min_dur, max_dur, start_from_sec=fb_start
        )
    if not api_only and not data:
        data = fallback_highlights(
            str(transcript_path), clip_n, min_dur, max_dur, start_from_sec=fb_start
        )
    if not isinstance(data, list):
        data = [data]
    # 先统一时间为 HH:MM:SS，再按时长过滤（兼容模型返回数值秒）
    for item in data:
        if not isinstance(item, dict):
            continue
        st = item.get("start_time") or item.get("start")
        if isinstance(st, (int, float)):
            item["start_time"] = _sec_to_hhmmss(st)
        et = item.get("end_time") or item.get("end")
        if isinstance(et, (int, float)):
            item["end_time"] = _sec_to_hhmmss(et)
    if args.preset == "ops-short" and prompt_min_sec > 0:
        data = _filter_start_not_before(data, prompt_min_sec)
    data = _filter_clips_by_duration(data, min_dur, filter_max_sec)
    # 若 AI 返回的片段全被过滤，用规则备用
    if not data and transcript_path.exists():
        if api_only:
            print("❌ API 返回的片段经时长过滤后为空（--api-only 下不启用规则切分）", file=sys.stderr)
            sys.exit(1)
        print("  AI 片段时长无效，改用规则切分", file=sys.stderr)
        data = fallback_highlights(
            str(transcript_path), clip_n, min_dur, max_dur, start_from_sec=fb_start
        )
    # 强制中文
    print("  确保导出名与封面为简体中文...")
    data = _ensure_chinese_highlights(data, api_only=api_only)
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ 已输出 {len(data)} 个高光片段: {out_path}")


if __name__ == "__main__":
    main()
