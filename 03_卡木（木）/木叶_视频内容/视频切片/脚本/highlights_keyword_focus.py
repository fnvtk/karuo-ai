#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
无 API/Ollama 时：按「关键词在字幕时间轴上的密度」抽取高光窗口（类似话题峰值），
输出与 identify_highlights 兼容的 JSON。用于派对录屏、MBTI/商业场等主题场。

默认：**单条 1～5 分钟**（60～300s）、窗口再按字幕**收束到首尾人声**（去掉片尾长静音）、
**字幕间隙 ≥12s 视为换话题**时优先在上一句收束，尽量一条成片=一段完整表述。

用法:
  python3 highlights_keyword_focus.py transcript.srt -o highlights.json --clips 12 --theme mbti_business
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# 复用 SRT 解析
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))
from identify_highlights import parse_srt_segments  # noqa: E402

# 派对成片默认 CTA（与 Soul 竖屏场一致）
PARTY_CTA = "关注卡若创业派对，下一条接着聊落地。"


def _sec_to_hhmmss(sec: float) -> str:
    sec = max(0, int(sec))
    h, m, s = sec // 3600, (sec % 3600) // 60, sec % 60
    return f"{h:02d}:{m:02d}:{s:02d}"


# 窗口内字幕含下列词时，给封面/文件名加「热点向短前缀」（观点仍锚在原文 anchor，不编造事实）
VIRAL_PREFIX_RULES: list[tuple[list[str], str]] = [
    (["MBTI", "mbti"], "MBTI风口｜"),
    (["性格", "测试", "测完"], "性格测试｜"),
    (["三十秒", "30秒"], "30秒出结果｜"),
    (["Token", "token", "TOKEN"], "Token降价潮｜"),
    (["白嫖"], "别被白嫖｜"),
    (["引流", "小程序"], "引流小程序｜"),
    (["私域"], "私域算账｜"),
    (["变现"], "变现链路｜"),
    (["超级个体"], "超级个体｜"),
    (["众创"], "众创搭伙｜"),
    (["团队"], "团队配置｜"),
    (["AI", "ai"], "AI落地｜"),
    (["咨询", "心理"], "咨询成交｜"),
]


def _pick_viral_prefix(window_text: str) -> str:
    if not window_text:
        return ""
    for kws, prefix in VIRAL_PREFIX_RULES:
        for kw in kws:
            if len(kw) <= 1:
                continue
            if kw.isascii():
                if kw.lower() in window_text.lower():
                    return prefix
            elif kw in window_text:
                return prefix
    return ""


def _cjk_count(s: str) -> int:
    return sum(1 for c in (s or "") if "\u4e00" <= c <= "\u9fff")


def _compose_viral_hook(anchor_raw: str, joined_window: str, max_cjk: int = 16) -> str:
    """刺激性封面句：热点前缀 + 锚点原文截断，总汉字封顶 max_cjk。（plain 模式或兜底用）"""
    pre = _pick_viral_prefix(joined_window)
    core = (anchor_raw or "").strip()
    if not pre:
        hook_full = _limit_cjk_chars(core, max_cjk)
    else:
        pre_cjk = sum(1 for c in pre if "\u4e00" <= c <= "\u9fff")
        rest = max(4, max_cjk - pre_cjk)
        hook_full = pre + _limit_cjk_chars(core, rest)
        hook_full = _limit_cjk_chars(hook_full, max_cjk)
    hook_17 = _limit_cjk_chars(hook_full, 17)
    if hook_full and hook_17 != hook_full:
        return hook_full + "…"
    return hook_full or _limit_cjk_chars(core, max_cjk) or "精彩片段"


# 抖音向长标题：触发词命中 window 内合并文案则用对应模板；{core} 仅来自本窗字幕（不编故事）
# 排序：更具体的规则在前
DOUYIN_TITLE_TEMPLATES: list[tuple[list[str], str]] = [
    (["白嫖"], "白嫖客户还要不要伺候？这句直接把话说死｜{core}"),
    (["Token", "token", "TOKEN"], "Token便宜到像批发，普通人怎么接住这波？｜{core}"),
    (["小程序", "引流"], "引流进小程序只是第一步，后面这段才是钱｜{core}"),
    (["私域"], "私域不是加好友，算完这笔账你就知道差哪｜{core}"),
    (["变现", "付费"], "光靠工具变不了现？听完这条链路再判断｜{core}"),
    (["MBTI", "mbti"], "MBTI风口还在不在？这条把赚钱逻辑说透｜{core}"),
    (["性格", "测试", "30秒", "三十秒", "测完"], "30秒测性格凭什么赚钱？听完再决定动不动手｜{core}"),
    (["前端", "后端"], "前后端都懂还不够，这条说清谁来收钱｜{core}"),
    (["团队", "销售", "成交"], "团队里缺这一环，成交会一直卡在半路｜{core}"),
    (["AI", "ai"], "AI不是噱头，落到成交差的是哪一步？｜{core}"),
    (["超级个体", "众创"], "超级个体别一个人硬扛，搭伙姿势错了全白干｜{core}"),
    (["咨询", "心理"], "咨询怎么接到成交？流程里这句最关键｜{core}"),
]
DOUYIN_TITLE_DEFAULT = "派对里这句大实话，听完再决定动不动手｜{core}"


def _pick_douyin_template(window_text: str) -> str:
    if not window_text:
        return DOUYIN_TITLE_DEFAULT
    for kws, tmpl in DOUYIN_TITLE_TEMPLATES:
        for kw in kws:
            if len(kw) <= 1:
                continue
            if kw.isascii():
                if kw.lower() in window_text.lower():
                    return tmpl
            elif kw in window_text:
                return tmpl
    return DOUYIN_TITLE_DEFAULT


def _core_phrase_for_title(anchor_raw: str, joined: str, max_cjk: int = 14) -> str:
    """标题后半｜core：优先锚句，过短则拼窗口前文。"""
    a = re.sub(r"\s+", " ", (anchor_raw or "").strip())
    j = re.sub(r"\s+", " ", (joined or "").strip())
    if _cjk_count(a) >= 6:
        return _limit_cjk_chars(a, max_cjk)
    merged = (a + " " + j).strip() if a else j
    merged = re.sub(r"\s+", " ", merged).strip()[:200]
    return _limit_cjk_chars(merged, max_cjk) or _limit_cjk_chars(a or merged, max_cjk) or "干货片段"


def _fill_douyin_title(template: str, core: str, max_total_cjk: int = 30) -> str:
    if "{core}" not in template:
        return _limit_cjk_chars(template, max_total_cjk)
    prefix, _, suffix = template.partition("{core}")
    used = _cjk_count(prefix) + _cjk_count(suffix)
    room = max(4, max_total_cjk - used)
    c = _limit_cjk_chars(core, room)
    out = prefix + c + suffix
    return _limit_cjk_chars(out, max_total_cjk)


def _cover_punch_from_full_title(full_title: str, max_cjk: int = 16) -> str:
    """封面/文件名优先用短 punch：有｜则取左半句（问句/断言），否则截前 max_cjk 汉字。"""
    s = (full_title or "").strip()
    if not s:
        return ""
    if "｜" in s:
        left = s.split("｜", 1)[0].strip()
        base = _limit_cjk_chars(left, max_cjk)
        return base + ("…" if _cjk_count(left) > max_cjk else "")
    base = _limit_cjk_chars(s, max_cjk)
    return base + ("…" if _cjk_count(s) > max_cjk else "")


def _compose_douyin_full_title(anchor_raw: str, joined: str, max_total_cjk: int = 30) -> str:
    tmpl = _pick_douyin_template(joined)
    core = _core_phrase_for_title(anchor_raw, joined, max_cjk=16)
    return _fill_douyin_title(tmpl, core, max_total_cjk=max_total_cjk)


THEMES: dict[str, list[str]] = {
    "mbti_business": [
        "MBTI", "mbti", "性格", "测试", "测完", "三十秒", "30秒", "前端", "后端",
        "引流", "成交", "咨询", "私域", "销售", "团队", "小程序", "神仙团队",
        "变现", "链路", "用户", "付费", "解读", "心理", "流程", "对接", "小林",
        "陈总", "宋总", "四把椅子", "TOKEN", "token", "超级个体", "众创",
    ],
    "soul_party": [
        "Soul", "派对", "上麦", "房主", "流量", "私域", "成交", "项目", "创业",
        "AI", "变现", "团队", "用户", "产品", "运营",
    ],
}


def _score_text(text: str, keywords: list[str]) -> float:
    if not text:
        return 0.0
    s = 0.0
    for kw in keywords:
        if len(kw) <= 1:
            continue
        if kw.lower() in text.lower() if kw.isascii() else kw in text:
            s += 1.2 if len(kw) >= 3 else 0.6
    return s


def _limit_cjk_chars(text: str, max_cjk: int) -> str:
    """与 soul_enhance 封面逻辑一致：按汉字个数截断（ASCII 不占汉字额度）。"""
    if not text or max_cjk <= 0:
        return (text or "").strip()
    out: list[str] = []
    n = 0
    for ch in text:
        if "\u4e00" <= ch <= "\u9fff":
            n += 1
            if n > max_cjk:
                break
        out.append(ch)
    return "".join(out).strip()


def _last_sub_before_long_gap(subs: list[dict], gap_sec: float):
    """同一段连续发言中，遇到下一条字幕间隔 > gap_sec 则视为换话题，返回换话题前最后一条。"""
    if not subs:
        return None
    if len(subs) == 1:
        return subs[0]
    for i in range(len(subs) - 1):
        g = float(subs[i + 1]["start_sec"]) - float(subs[i]["end_sec"])
        if g > gap_sec:
            return subs[i]
    return subs[-1]


def _extend_end_for_min_duration(
    segments: list[dict],
    s_out: int,
    e_out: int,
    min_dur: float,
    max_dur: float,
    cap_end: int,
    gap_sec: float,
    tail_pad: float,
) -> int:
    """当前 [s_out,e_out] 短于 min_dur 时，沿全局字幕轴向后接龙（间隔≤gap 视为同段），直到够长或触顶。"""
    if e_out - s_out >= min_dur:
        return min(e_out, s_out + int(max_dur))
    segs = sorted(segments, key=lambda x: float(x["start_sec"]))
    last_sp_end = max(0.0, float(e_out) - tail_pad)
    cur_e = e_out
    started = False
    for s in segs:
        st, en = float(s["start_sec"]), float(s["end_sec"])
        if en <= last_sp_end + 0.05 and not started:
            continue
        if not started:
            if st - last_sp_end <= gap_sec or st <= float(cur_e) + 0.5:
                started = True
                cur_e = int(min(cap_end, en + tail_pad))
                last_sp_end = en
                if cur_e - s_out >= min_dur:
                    return min(cur_e, s_out + int(max_dur))
            else:
                break
        else:
            if st - last_sp_end > gap_sec:
                break
            cur_e = int(min(cap_end, en + tail_pad))
            last_sp_end = en
            if cur_e - s_out >= min_dur:
                return min(cur_e, s_out + int(max_dur))
    return min(max(cur_e, e_out), s_out + int(max_dur), cap_end)


def _refine_window_to_speech_bounds(
    segments: list[dict],
    start_sec: int,
    end_sec: int,
    min_dur: float,
    max_dur: float,
    total_end: float,
    *,
    topic_break_gap_sec: float = 12.0,
    tail_pad_sec: float = 0.45,
) -> tuple[int, int]:
    """粗窗口 → 对齐首条字幕起点、在「自然话题尾」或最后一条字幕收束，去掉片尾无对白；再卡 1～5 分钟。"""
    cap = max(start_sec + 1, int(total_end) - 1)
    subs = [
        s
        for s in segments
        if float(s["end_sec"]) >= start_sec and float(s["start_sec"]) <= end_sec
    ]
    subs.sort(key=lambda x: float(x["start_sec"]))
    if not subs:
        return start_sec, min(end_sec, cap)

    s1 = int(max(start_sec, float(subs[0]["start_sec"])))
    natural_last = _last_sub_before_long_gap(subs, topic_break_gap_sec) or subs[-1]
    e_nat = int(min(end_sec, cap, float(natural_last["end_sec"]) + tail_pad_sec))
    e_full = int(min(end_sec, cap, float(subs[-1]["end_sec"]) + tail_pad_sec))

    # 自然断点够长则用「一整段业务」收束；否则用本窗全部字幕收束（至少去掉尾静音）
    if e_nat - s1 >= max(35.0, min_dur * 0.72):
        e1 = e_nat
    else:
        e1 = e_full

    if e1 - s1 > max_dur:
        s1 = int(max(start_sec, e1 - int(max_dur)))
        subs2 = [x for x in subs if float(x["end_sec"]) > s1]
        if subs2:
            s1 = int(max(s1, float(subs2[0]["start_sec"])))

    if e1 - s1 < min_dur:
        e1 = _extend_end_for_min_duration(
            segments, s1, e1, min_dur, max_dur, cap, topic_break_gap_sec, tail_pad_sec
        )
    if e1 - s1 < min_dur:
        e1 = _extend_end_for_min_duration(
            segments,
            s1,
            max(e1, s1),
            min_dur,
            max_dur,
            cap,
            max(topic_break_gap_sec, 22.0),
            tail_pad_sec,
        )
    if e1 - s1 < min_dur:
        t_end = min(cap, int(end_sec))
        s1 = int(max(start_sec, t_end - int(min_dur)))
        e1 = t_end
    if e1 - s1 < min_dur:
        s1 = int(start_sec)
        e1 = min(cap, int(start_sec + int(min_dur)))

    if e1 - s1 > max_dur:
        e1 = s1 + int(max_dur)

    if e1 <= s1:
        return start_sec, min(end_sec, cap)
    return s1, e1


def _anchor_segment(
    segments: list[dict],
    start_sec: int,
    end_sec: int,
    keywords: list[str],
) -> dict | None:
    """窗口内按时间第一条字幕；优先含关键词的条，便于封面 hook 与首条烧录字幕同源。"""
    in_win = [
        s
        for s in segments
        if s.get("end_sec", 0) >= start_sec and s.get("start_sec", 0) <= end_sec
    ]
    if not in_win:
        return None
    in_win.sort(key=lambda x: float(x.get("start_sec", 0)))
    scored = [s for s in in_win if _score_text(s.get("text") or "", keywords) > 0]
    return scored[0] if scored else in_win[0]


def _windows_non_overlap(
    chosen_bins: list[int],
    clip_count: int,
    min_dur: float,
    max_dur: float,
    total_end: float,
    bin_sec: float,
    min_gap_sec: float = 72.0,
) -> list[tuple[int, int]]:
    """峰值 bin → 时间窗，按时间排序并强制窗与窗之间至少 min_gap_sec（减少重叠切段）。"""
    half = max_dur / 2.0
    raw: list[tuple[int, int, int]] = []
    for bi in chosen_bins:
        center = (bi + 0.5) * bin_sec
        s = int(max(0, center - half))
        e = int(min(total_end - 2, s + int(max_dur)))
        if e - s < min_dur:
            e = int(min(total_end - 2, s + int(min_dur)))
        if e - s > max_dur:
            e = s + int(max_dur)
        raw.append((s, e, bi))
    raw.sort(key=lambda x: (x[0], x[1]))
    resolved: list[tuple[int, int]] = []
    last_e = -10**9
    for s, e, _ in raw:
        if s < last_e + min_gap_sec:
            s = int(last_e + min_gap_sec)
            e = int(min(total_end - 2, s + int(max_dur)))
        if e - s < min_dur:
            e = int(min(total_end - 2, s + int(min_dur)))
        if s >= total_end - 5 or (e - s) < min_dur * 0.85:
            continue
        resolved.append((s, e))
        last_e = e
        if len(resolved) >= clip_count:
            break

    # 不足时用时间轴均匀补窗（与已有窗保留 min_gap_sec 间隔）
    def _gap_conflict(a: tuple[int, int], b: tuple[int, int]) -> bool:
        s, e = a
        rs, re = b
        return not (e + min_gap_sec <= rs or s >= re + min_gap_sec)

    if len(resolved) < clip_count and total_end > min_dur + min_gap_sec:
        step = max(int(min_dur + min_gap_sec), int((total_end - min_dur) / max(1, clip_count + 2)))
        # 仅从「最后一段结束之后」向前扫，避免在已选峰值之后又插回 00:00 导致顺序与叙事错乱
        cursor = float(max((r[1] + min_gap_sec for r in resolved), default=0))
        safety = 0
        while len(resolved) < clip_count and safety < clip_count * 16:
            safety += 1
            if cursor > total_end - min_dur:
                break
            s = int(cursor)
            e = int(min(total_end - 2, s + int(min(max_dur, max(min_dur, 90.0)))))
            if e - s < min_dur * 0.85:
                cursor += step
                continue
            cand = (s, e)
            if any(_gap_conflict(cand, x) for x in resolved):
                cursor += step
                continue
            resolved.append(cand)
            cursor = float(e + min_gap_sec)

    resolved.sort(key=lambda x: (x[0], x[1]))
    return resolved[:clip_count]


def build_keyword_highlights(
    transcript_path: str,
    clip_count: int,
    min_dur: float,
    max_dur: float,
    theme: str,
    bin_sec: float = 25.0,
    viral: bool = True,
    title_max_cjk: int = 30,
    topic_break_gap_sec: float = 12.0,
    tail_pad_sec: float = 0.45,
) -> list[dict]:
    min_dur = max(45.0, float(min_dur))
    max_dur = float(max_dur)
    if max_dur < min_dur:
        min_dur, max_dur = max_dur, min_dur
    max_dur = max(min_dur, min(max_dur, 600.0))

    keywords = THEMES.get(theme) or THEMES["soul_party"]
    segments = parse_srt_segments(transcript_path)
    if not segments:
        return []
    total_end = float(segments[-1]["end_sec"])
    nb = int(total_end / bin_sec) + 2
    bins = [0.0] * nb
    for seg in segments:
        sc = _score_text(seg.get("text") or "", keywords)
        if sc <= 0:
            continue
        b0 = max(0, int(seg["start_sec"] / bin_sec))
        b1 = min(nb - 1, int(seg["end_sec"] / bin_sec) + 1)
        for bi in range(b0, b1 + 1):
            bins[bi] += sc

    # 找局部峰值
    peaks: list[tuple[int, float]] = []
    for i in range(1, len(bins) - 1):
        if bins[i] < 0.8:
            continue
        if bins[i] >= bins[i - 1] and bins[i] >= bins[i + 1]:
            peaks.append((i, bins[i]))
    peaks.sort(key=lambda x: -x[1])

    min_bins_between = int(max(45, min_dur * 0.35) / bin_sec)
    chosen: list[int] = []
    for i, _ in peaks:
        if all(abs(i - c) >= min_bins_between for c in chosen):
            chosen.append(i)
        if len(chosen) >= clip_count:
            break

    if len(chosen) < clip_count:
        for i in range(len(bins)):
            if i not in chosen and bins[i] >= 0.5:
                if all(abs(i - c) >= min_bins_between // 2 or min_bins_between < 2 for c in chosen):
                    chosen.append(i)
            if len(chosen) >= clip_count:
                break

    chosen.sort()
    # 合并过近的峰值，减少「同一段话切三条」
    min_gap_bins = max(min_bins_between, int(120 / bin_sec))
    merged: list[int] = []
    for bi in chosen:
        if not merged or bi - merged[-1] >= min_gap_bins:
            merged.append(bi)
    chosen = merged[:clip_count]
    if not chosen:
        # 全片均匀兜底
        step = max(min_dur, (total_end - min_dur) / max(1, clip_count))
        chosen = [int((j + 0.5) * step / bin_sec) for j in range(clip_count)]

    windows = _windows_non_overlap(
        chosen[: max(clip_count * 3, clip_count + 6)],
        clip_count,
        min_dur,
        max_dur,
        total_end,
        bin_sec,
        min_gap_sec=max(90.0, min_dur * 0.55),
    )

    out: list[dict] = []
    # soul_enhance: COVER_HOOK_MAX_CJK = 16，标题文件名用序号前缀保证唯一
    for idx, (rs, re) in enumerate(windows):
        start_sec, end_sec = _refine_window_to_speech_bounds(
            segments,
            rs,
            re,
            min_dur,
            max_dur,
            total_end,
            topic_break_gap_sec=topic_break_gap_sec,
            tail_pad_sec=tail_pad_sec,
        )
        texts = [
            s["text"]
            for s in segments
            if s["end_sec"] >= start_sec and s["start_sec"] <= end_sec and _score_text(s["text"], keywords) > 0
        ]
        if not texts:
            texts = [
                s["text"]
                for s in segments
                if s["end_sec"] >= start_sec and s["start_sec"] <= end_sec
            ]
        joined = " ".join(texts)[:160] if texts else f"精彩片段{idx+1}"
        excerpt = joined[:120] + ("…" if len(joined) > 120 else "")

        anchor = _anchor_segment(segments, start_sec, end_sec, keywords)
        anchor_raw = (anchor.get("text") or "").strip() if anchor else ""
        if not anchor_raw:
            anchor_raw = (texts[0] if texts else joined)[:80]

        # 封面 hook 与首条字幕同源（16 汉字封顶，与 soul_enhance COVER_HOOK 一致）
        hook_full = _limit_cjk_chars(anchor_raw, 16)
        hook_17 = _limit_cjk_chars(anchor_raw, 17)
        hook_display = (
            (hook_full + "…")
            if (hook_full and hook_17 != hook_full)
            else (hook_full or f"第{idx+1}段")
        )

        title_body = _limit_cjk_chars(anchor_raw, 12)
        span_sec = end_sec - start_sec

        viral_hook = ""
        if viral:
            # 完整抖音向长标题（文件名/batch_clip 用）；封面/成片 title-only 仍走 viral_hook 短 punch
            full_title = _compose_douyin_full_title(
                anchor_raw, joined, max_total_cjk=max(18, min(title_max_cjk, 36))
            )
            title = full_title.strip() or f"第{idx+1:02d}段 {title_body}".strip()
            viral_hook = _cover_punch_from_full_title(full_title, 16) or _compose_viral_hook(
                anchor_raw, joined, 16
            )
        else:
            title = f"第{idx+1:02d}段 {title_body}".strip() if title_body else f"第{idx+1:02d}段 话题"

        row: dict = {
            "title": title,
            "start_time": _sec_to_hhmmss(start_sec),
            "end_time": _sec_to_hhmmss(end_sec),
            "hook_3sec": hook_display,
            "cta_ending": PARTY_CTA,
            "transcript_excerpt": excerpt,
            "reason": (
                f"关键词密度峰值 theme={theme} non_overlap viral={viral} "
                f"douyin_title=1 speech_bounds gap={topic_break_gap_sec}s tail_pad={tail_pad_sec}s"
            ),
            "source_span_sec": int(span_sec),
        }
        if viral and viral_hook:
            row["viral_hook"] = viral_hook
        out.append(row)
    return out


def main():
    ap = argparse.ArgumentParser(description="关键词密度高光（无 LLM）")
    ap.add_argument("transcript", type=Path, help="transcript.srt")
    ap.add_argument("-o", "--output", type=Path, required=True)
    ap.add_argument("--clips", type=int, default=12)
    ap.add_argument(
        "--min-duration",
        type=float,
        default=60.0,
        help="单条最短秒数（默认 60=1 分钟）",
    )
    ap.add_argument(
        "--max-duration",
        type=float,
        default=300.0,
        help="单条最长秒数（默认 300=5 分钟）",
    )
    ap.add_argument(
        "--theme",
        choices=list(THEMES.keys()),
        default="mbti_business",
        help="关键词表",
    )
    ap.add_argument("--bin-sec", type=float, default=25.0, help="时间箱宽度（秒）")
    ap.add_argument(
        "--plain-hooks",
        action="store_true",
        help="关闭 viral_hook/抖音长标题，仅用语义锚点 hook（封面更贴首句字幕）",
    )
    ap.add_argument(
        "--title-max-cjk",
        type=int,
        default=30,
        help="抖音向完整标题汉字上限（默认 30，约一条短视频标题长度）",
    )
    ap.add_argument(
        "--topic-break-gap",
        type=float,
        default=12.0,
        help="相邻字幕间隔超过此秒数视为换话题，优先在上一句收束（默认 12）",
    )
    ap.add_argument(
        "--tail-pad",
        type=float,
        default=0.45,
        help="最后一条字幕后保留的片尾余量秒数（默认 0.45，避免切太紧）",
    )
    args = ap.parse_args()

    if not args.transcript.exists():
        print(f"❌ 不存在: {args.transcript}", file=sys.stderr)
        sys.exit(1)
    data = build_keyword_highlights(
        str(args.transcript),
        args.clips,
        args.min_duration,
        args.max_duration,
        args.theme,
        bin_sec=args.bin_sec,
        viral=not args.plain_hooks,
        title_max_cjk=max(18, min(args.title_max_cjk, 40)),
        topic_break_gap_sec=max(5.0, float(args.topic_break_gap)),
        tail_pad_sec=max(0.1, min(float(args.tail_pad), 2.0)),
    )
    if not data:
        print("❌ 未生成任何片段", file=sys.stderr)
        sys.exit(1)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ 关键词高光 {len(data)} 条 → {args.output}")


if __name__ == "__main__":
    main()
