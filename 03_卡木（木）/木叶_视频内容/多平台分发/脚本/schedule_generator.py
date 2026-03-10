#!/usr/bin/env python3
"""
定时排期生成器 — 为 N 条视频生成发布时间表
规则：
1. 相邻视频间隔 30-120 分钟（随机）
2. 若总时长 > max_hours，按比例压缩至 max_hours 内
3. 第一条视频在 first_delay 分钟后发布
"""
import random
from datetime import datetime, timedelta


def generate_schedule(
    n: int,
    min_gap: int = 30,
    max_gap: int = 120,
    max_hours: float = 24.0,
    first_delay: int = 5,
    start_time: datetime = None,
) -> list[datetime]:
    """
    返回 n 个 datetime，每个对应一条视频的定时发布时间。
    """
    if n <= 0:
        return []

    base = start_time or datetime.now()
    if n == 1:
        return [base + timedelta(minutes=first_delay)]

    gaps = [random.randint(min_gap, max_gap) for _ in range(n - 1)]
    total_min = first_delay + sum(gaps)
    max_min = max_hours * 60

    if total_min > max_min:
        ratio = max_min / total_min
        first_delay = int(first_delay * ratio)
        gaps = [max(1, int(g * ratio)) for g in gaps]

    times = []
    cur = base + timedelta(minutes=first_delay)
    times.append(cur)
    for g in gaps:
        cur = cur + timedelta(minutes=g)
        times.append(cur)

    return times


def format_schedule(videos: list[str], times: list[datetime]) -> str:
    """格式化排期表用于打印"""
    lines = ["  序号 | 发布时间             | 间隔    | 视频"]
    lines.append("  " + "-" * 70)
    for i, (v, t) in enumerate(zip(videos, times)):
        gap = ""
        if i > 0:
            delta = (t - times[i - 1]).total_seconds() / 60
            gap = f"{delta:.0f}min"
        name = v[:40] if len(v) > 40 else v
        lines.append(f"  {i+1:>4} | {t.strftime('%Y-%m-%d %H:%M')} | {gap:>7} | {name}")

    total = (times[-1] - times[0]).total_seconds() / 3600 if len(times) > 1 else 0
    lines.append("  " + "-" * 70)
    lines.append(f"  总跨度: {total:.1f}h | 首条: {times[0].strftime('%H:%M')} | 末条: {times[-1].strftime('%H:%M')}")
    return "\n".join(lines)


if __name__ == "__main__":
    schedule = generate_schedule(15)
    names = [f"视频_{i+1}.mp4" for i in range(15)]
    print(format_schedule(names, schedule))
