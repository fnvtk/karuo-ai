#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
按完整主题切片 - 分析 transcript，找出每个主题的完整起止时间

与 identify_highlights 不同：本脚本按「视频剪辑方案」的 7 个主题类型分析，
时间节点非固定，需结合视频内容分析出每个主题的完整段落。

主题类型（来自剪辑方案图片）：
1. 引出问题 - 建立共鸣，问用户痛点
2. 解决方案 - 核心方法、干货
3. 案例分享 - 真实案例、数据
4. 未来展望 - 接下来怎么做
5. 痛点强调 - 避坑、踩坑警告
6. 福利展示 - 限时福利、福利放送
7. 权威背书 - 专业背书、可信证明

用法：
  python3 identify_theme_segments.py -t transcript.srt -o highlights.json
"""
import argparse
import json
import re
import sys
from pathlib import Path

OLLAMA_URL = "http://localhost:11434"
DEFAULT_CTA = "关注我，每天学一招私域干货"

THEME_DEFINITIONS = """
【主题类型定义，按视频剪辑方案】
1. 引出问题：开场建立共鸣，提出用户普遍遇到的问题或痛点
2. 解决方案：讲解核心方法、干货、具体做法
3. 案例分享：真实案例、数据佐证、用户证言
4. 未来展望：接下来这样做、未来趋势、行动建议
5. 痛点强调：这个坑千万别踩、常见误区、避坑指南
6. 福利展示：限时福利、福利放送、赠送、优惠
7. 权威背书：专业背书、可信证明、资质、成果展示

参考时间顺序（非固定）：引出问题→解决方案→案例分享→未来展望→痛点强调→福利展示→权威背书
"""


def parse_srt_segments(srt_path: str) -> list:
    """解析 SRT 为 [{start_sec, end_sec, start_time, end_time, text}, ...]"""
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
        if len(text) > 2:
            segments.append({
                "start_sec": start_sec, "end_sec": end_sec,
                "start_time": f"{sh:02d}:{sm:02d}:{ss:02d}",
                "end_time": f"{eh:02d}:{em:02d}:{es:02d}",
                "text": text,
            })
    return segments


def srt_to_timestamped_text(srt_path: str) -> str:
    """将 SRT 转为带时间戳的纯文本"""
    segments = parse_srt_segments(srt_path)
    return "\n".join(f"[{s['start_time']}] {s['text']}" for s in segments)


def _build_theme_prompt(transcript: str) -> str:
    txt = transcript[:15000] if len(transcript) > 15000 else transcript
    return f"""你是短视频内容策划师。根据「视频剪辑方案」，分析以下视频文字稿，找出 7 类主题各自的**完整段落**。

{THEME_DEFINITIONS}

【关键】时间节点非固定！需结合视频实际内容分析：
- 每个主题只取一段，且必须是**完整主题**（不中断、语义完整）
- 从文字稿中精确找出该主题开始和结束的时间点
- 若某类主题在视频中未出现，可跳过，不强制凑齐 7 段
- 参考顺序帮助理解，实际顺序按内容出现顺序

【输出格式】严格 JSON 数组，每项含：
- theme: 主题类型名（如"引出问题"）
- title: 简短标题（简体中文）
- start_time: "HH:MM:SS"
- end_time: "HH:MM:SS"
- hook_3sec: 前3秒Hook，15字内
- cta_ending: 结尾CTA（可用"{DEFAULT_CTA}"）
- transcript_excerpt: 该段内容前60字

只输出 JSON 数组，不要```包裹，不要其他文字。所有文字必须简体中文。

视频文字稿：
---
{txt}
---"""


def _parse_ai_json(text: str) -> list:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```\s*$", "", text)
    m = re.search(r"\[[\s\S]*\]", text)
    if m:
        return json.loads(m.group())
    return json.loads(text)


def call_ollama(transcript: str) -> str:
    """调用 Ollama 分析主题"""
    import requests
    prompt = _build_theme_prompt(transcript)
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": "qwen2.5:1.5b",
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.2, "num_predict": 8192},
            },
            timeout=120,
        )
        if r.status_code != 200:
            raise RuntimeError(f"Ollama {r.status_code}")
        return r.json().get("response", "").strip()
    except Exception as e:
        raise RuntimeError(f"Ollama 调用失败: {e}") from e


def fallback_by_keywords(transcript_path: str) -> list:
    """规则备用：按关键词粗分主题段，每段限制 45-120 秒"""
    segments = parse_srt_segments(transcript_path)
    if not segments:
        return []
    total_duration = segments[-1]["end_sec"] if segments else 0
    theme_keywords = {
        "引出问题": ["问题", "遇到", "痛点", "为什么", "困惑", "难题"],
        "解决方案": ["方法", "解决", "怎么做", "技巧", "核心", "干货"],
        "案例分享": ["案例", "例子", "数据", "客户", "赚了", "做了"],
        "未来展望": ["接下来", "未来", "行动", "去做", "试试"],
        "痛点强调": ["坑", "避坑", "千万别", "误区", "踩雷"],
        "福利展示": ["福利", "限时", "赠送", "优惠", "免费"],
        "权威背书": ["专业", "背书", "资质", "成果", "证明"],
    }
    MIN_SEG = 45
    MAX_SEG = 120
    result = []
    used_until = 0  # 已使用到的时间点，避免重叠
    for theme, kws in theme_keywords.items():
        cands = [s for s in segments if s["start_sec"] >= used_until and any(kw in s["text"] for kw in kws)]
        if not cands:
            continue
        first = cands[0]
        start_sec = first["start_sec"]
        # 合并相邻字幕，但限制在 MAX_SEG 秒内
        end_sec = first["end_sec"]
        for s in segments:
            if s["start_sec"] < start_sec:
                continue
            if s["start_sec"] > start_sec + MAX_SEG:
                break
            if s["end_sec"] <= end_sec + 15:  # 连续/接近
                end_sec = max(end_sec, s["end_sec"])
            elif s["start_sec"] <= end_sec + 5:  # 间隙小于5秒
                end_sec = min(s["end_sec"], start_sec + MAX_SEG)
        end_sec = min(end_sec, start_sec + MAX_SEG)
        if end_sec - start_sec < MIN_SEG:
            end_sec = min(start_sec + MIN_SEG, total_duration)
        used_until = end_sec + 10  # 下一段至少间隔10秒
        h, m, s_ = int(start_sec // 3600), int((start_sec % 3600) // 60), int(start_sec % 60)
        eh, em, es = int(end_sec // 3600), int((end_sec % 3600) // 60), int(end_sec % 60)
        result.append({
            "theme": theme,
            "title": theme,
            "start_time": f"{h:02d}:{m:02d}:{s_:02d}",
            "end_time": f"{eh:02d}:{em:02d}:{es:02d}",
            "hook_3sec": f"精彩{theme}",
            "cta_ending": DEFAULT_CTA,
            "transcript_excerpt": first["text"][:60],
        })
    return result


def main():
    parser = argparse.ArgumentParser(description="按完整主题分析 transcript")
    parser.add_argument("--transcript", "-t", required=True, help="transcript.srt")
    parser.add_argument("--output", "-o", required=True, help="highlights.json")
    args = parser.parse_args()
    transcript_path = Path(args.transcript)
    if not transcript_path.exists():
        print(f"❌ 不存在: {transcript_path}", file=sys.stderr)
        sys.exit(1)
    text = srt_to_timestamped_text(str(transcript_path))
    if len(text) < 100:
        print("❌ 文字稿过短", file=sys.stderr)
        sys.exit(1)

    data = None
    try:
        print("正在分析完整主题（Ollama）...")
        raw = call_ollama(text)
        data = _parse_ai_json(raw)
        if data and isinstance(data, list):
            # 校验时间格式
            for i, h in enumerate(data):
                if isinstance(h, dict):
                    if "start" in h and "start_time" not in h:
                        h["start_time"] = h.pop("start", "")
                    if "end" in h and "end_time" not in h:
                        h["end_time"] = h.pop("end", "")
                    h.setdefault("title", h.get("theme", f"主题{i+1}"))
                    h.setdefault("hook_3sec", h.get("title", "")[:15])
                    h.setdefault("cta_ending", DEFAULT_CTA)
            data = [h for h in data if isinstance(h, dict) and h.get("start_time") and h.get("end_time")]
    except Exception as e:
        print(f"Ollama 失败 ({e})，使用规则备用", file=sys.stderr)

    if not data or not isinstance(data, list):
        print("使用规则备用（按关键词）", file=sys.stderr)
        data = fallback_by_keywords(str(transcript_path))

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ 已输出 {len(data)} 个完整主题: {out_path}")


if __name__ == "__main__":
    main()
