#!/usr/bin/env python3
"""
根据第127场 transcript.srt 关键词锚点，生成「单主题、短时长、条数多」的 highlights.json。
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

# (锚点正则, 条目标题, hook_3sec, question)
ANCHORS: list[tuple[str, str, str, str | None]] = [
    (r"三个东西|三样东西|三个指标|招人.*看", "招人三指标总览", "现在招人我看三样", "招人最看重什么？"),
    (r"TOKEN|消耗.*1000|一千块|月消耗", "高薪先看AI消耗", "想两万月薪先看月烧多少", "高薪硬指标是什么？"),
    (r"MBTI|PDP|DISC|盖洛普|性格", "性格测评怎么配团队", "性格不对团队白搭", "性格怎么测？"),
    (r"一面|二面|三面|试岗|简历.*真", "面试三面怎么筛人", "三百简历只要两三个", "面试怎么筛？"),
    (r"三角洲|辅助瞄准|人物识别|闲鱼|五百.*月", "游戏模型怎么变现", "辅助来钱快渠道要狠", "游戏AI能挣多少？"),
    (r"破坏计算机|370万|十八万|定性|收手|虚拟货币", "辅助风险与止损", "高收益是定时炸弹", "辅助最大的坑是什么？"),
    (r"保镖|女保镖|初级.*两万|中级.*三万", "保镖报价与档位", "真赚的不是保镖费", "保镖能赚多少？"),
    (r"后端|中介|投资|拉业务|信任", "保镖钱在后端关系", "高端信任才值钱", "保镖怎么赚大钱？"),
    (r"流量端|交付端|同时做|非常累", "别两头扛流量交付", "流量交付同时扛必崩", "做流量还是交付？"),
    (r"缺.*流量|老师太多", "赛道缺流量不缺交付", "这条赛道缺流量", "现在缺什么？"),
    (r"群主|分钱|排挤", "和群主合作要分钱", "不分钱就被排挤", "群主合作怎么分？"),
    (r"273万|推流|进房|进群|去重", "Soul本场数据复盘", "二百七十万推流从哪来", "派对数据怎么看？"),
    (r"职场|搞钱|MBTI.*共鸣|流量密码", "推流三板斧话题", "流量密码就这几条", "什么话题最好起量？"),
    (r"兴趣群|三十个群|五十人|开播", "新号冲人笨办法", "三十个群堆出五十人", "新号怎么破冷启动？"),
    (r"分他.*挣不到|五千.*八千|给.*一万", "分钱分缺口", "分他靠自己赚不到的那块", "招人怎么分钱？"),
    (r"CTO|链接.*人|前沿信息", "CTO值钱在链接信息", "最大产值不是写代码", "CTO该干什么？"),
    (r"摄影|纪实|职场.*课|All in", "摄影课与个人成长选择", "职场课为什么卖不动", "摄影和成长怎么选？"),
    (r"老茶馆|情绪价值|西西", "老茶馆与情绪价值", "Soul上情绪价值怎么做", "怎么做线上社群？"),
    (r"不学.*AI|学历不重要|实操", "实操碾压学历", "不学AI连班都难上", None),
]


def parse_srt_times(path: Path) -> list[tuple[float, float, str]]:
    raw = path.read_text(encoding="utf-8", errors="ignore")
    blocks = re.split(r"\n\s*\n", raw.strip())
    out: list[tuple[float, float, str]] = []
    ts = re.compile(
        r"(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})"
    )

    def to_sec(h, m, s, ms):
        return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0

    for b in blocks:
        lines = [ln.strip() for ln in b.splitlines() if ln.strip()]
        if len(lines) < 2:
            continue
        cue_line = next((ln for ln in lines if "-->" in ln), "")
        m = ts.match(cue_line)
        if not m:
            continue
        g = m.groups()
        st = to_sec(g[0], g[1], g[2], g[3])
        et = to_sec(g[4], g[5], g[6], g[7])
        idx = lines.index(cue_line)
        text = " ".join(lines[idx + 1 :])
        out.append((st, et, text))
    return out


def fmt_hms(sec: float) -> str:
    sec = max(0, sec)
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def find_anchor_events(subs: list[tuple[float, float, str]]) -> list[tuple[float, str, str, str | None]]:
    """每条字幕至多触发一个锚点；同一锚点类型 90s 内重复忽略。"""
    events: list[tuple[float, str, str, str | None]] = []
    last_idx: int | None = None
    last_t = -999.0
    for st, _et, text in subs:
        t = re.sub(r"\s+", "", text)
        for idx, (pat, title, hook, q) in enumerate(ANCHORS):
            if re.search(pat, t):
                if last_idx == idx and st - last_t < 90:
                    break
                events.append((st, title, hook, q))
                last_idx = idx
                last_t = st
                break
    return events


def main():
    srt = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    out_json = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("highlights.json")
    if not srt or not srt.is_file():
        print("用法: build_127_highlights_from_srt.py <transcript.srt> <out_highlights.json>")
        sys.exit(1)

    subs = parse_srt_times(srt)
    if not subs:
        print("❌ SRT 无有效条目")
        sys.exit(1)

    events = find_anchor_events(subs)
    if len(events) < 4:
        print("❌ 锚点过少，请检查 SRT")
        sys.exit(1)

    video_end = min(subs[-1][1] + 3.0, 8000.0)
    MIN_SEC = 50
    MAX_SEC = 195
    CTA = "今天就到这里，点个关注下次不迷路"

    clips: list[dict] = []
    for i, (st, title, hook, q) in enumerate(events):
        en = events[i + 1][0] if i + 1 < len(events) else video_end
        if en - st > MAX_SEC:
            en = st + MAX_SEC
        if en - st < MIN_SEC:
            if i + 1 < len(events):
                en = min(events[i + 1][0], st + MIN_SEC)
            else:
                en = st + MIN_SEC
        if en <= st:
            continue
        clips.append(
            {
                "title": title,
                "start_time": fmt_hms(st),
                "end_time": fmt_hms(en),
                "hook_3sec": hook,
                "question": q,
                "cta_ending": CTA,
                "transcript_excerpt": "",
                "reason": "srt_anchor_v1",
            }
        )

    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(
        json.dumps(clips, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"✅ {len(clips)} 条 → {out_json}")


if __name__ == "__main__":
    main()
