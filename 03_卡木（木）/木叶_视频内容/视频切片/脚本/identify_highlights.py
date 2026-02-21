#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
高光识别 - 用 Gemini 分析视频文字稿，输出高光片段 JSON
用于 Soul 派对等长视频切片前的 AI 识别步骤
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

# Gemini API
GEMINI_KEY = os.environ.get("GEMINI_API_KEY") or "AIzaSyCPARryq8o6MKptLoT4STAvCsRB7uZuOK8"
DEFAULT_CTA = "关注我，每天学一招私域干货"
CLIP_COUNT = 8
MIN_DURATION = 45
MAX_DURATION = 150


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


def call_gemini(transcript: str, clip_count: int = CLIP_COUNT) -> str:
    """调用 Gemini 分析并返回 JSON（REST API，无额外依赖）"""
    import urllib.request
    import urllib.error
    # gemini-pro 兼容性最好
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={GEMINI_KEY}"
    prompt = f"""你是一个专业的短视频内容策划师，擅长从长视频中找出最有传播力的片段。

分析以下视频文字稿，找出 {clip_count} 个最适合做短视频的「高光片段」。
为每个片段设计：
1. 前3秒Hook：15字以内，让用户停下来
2. 结尾CTA：20字以内，引导关注/进群

判断标准：金句观点(30%)、故事案例(25%)、情绪高点(20%)、实操干货(15%)、悬念钩子(10%)
时长要求：每个片段 {MIN_DURATION}-{MAX_DURATION} 秒
时间戳必须精确到秒，从文字稿中提取
相邻片段至少间隔30秒

输出严格 JSON 数组，不要其他文字。每个对象必须包含：
- title: 简短标题
- start_time: "HH:MM:SS"
- end_time: "HH:MM:SS"
- hook_3sec: 前3秒Hook
- cta_ending: 结尾CTA（默认可填 "{DEFAULT_CTA}"）
- transcript_excerpt: 片段内容前50字
- reason: 推荐理由

视频文字稿：
---
{transcript[:25000]}
---

只输出JSON数组，不要```json包裹。"""

    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 8192},
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode() if e.fp else ""
        print(f"Gemini API 错误: {e.code} {err_body[:500]}", file=sys.stderr)
        sys.exit(1)
    candidates = data.get("candidates", [])
    if not candidates:
        print("Gemini 未返回内容", file=sys.stderr)
        sys.exit(1)
    text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text


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
    print("正在调用 Gemini 分析高光片段...")
    raw = call_gemini(text, args.clips)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"JSON 解析失败: {e}", file=sys.stderr)
        print("原始输出:", raw[:500], file=sys.stderr)
        sys.exit(1)
    if not isinstance(data, list):
        data = [data]
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ 已输出 {len(data)} 个高光片段: {out_path}")


if __name__ == "__main__":
    main()
