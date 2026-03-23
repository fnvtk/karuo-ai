#!/usr/bin/env python3
"""
定时排期生成器 v3
- v2：固定 30~120min 随机间隔
- v3：generate_smart_schedule — 按视频条数自适应间隔/总跨度，并可选避开本地凌晨低活跃时段（适合视频号等多条错峰发）
"""
import os
import random
from datetime import datetime, timedelta


def suggest_stagger_params(n: int) -> tuple[int, int, float]:
    """
    根据待发布条数给出建议：min_gap, max_gap(分钟), max_hours。
    条数越多，略缩短间隔、允许更长总跨度，避免全挤在 24h 内过密。
    """
    if n <= 1:
        return 30, 120, 24.0
    if n <= 4:
        return 45, 150, 28.0
    if n <= 8:
        return 38, 125, max(28.0, min(48.0, n * 3.2))
    if n <= 15:
        return 32, 105, max(36.0, min(60.0, n * 2.8))
    if n <= 25:
        return 28, 95, max(48.0, min(72.0, n * 2.4))
    return 25, 85, min(96.0, max(56.0, n * 2.0))


def refine_avoid_late_night(
    times: list[datetime],
    min_after_prev: int = 25,
) -> list[datetime]:
    """
    将落在 **本机本地时间** 00:00–07:59 的排期顺延到当日/次日 12:xx，
    并保持与上一条至少 min_after_prev 分钟（请把系统时区设为发布面向地区，如中国用北京时间）。
    关闭：环境变量 SCHEDULE_NO_NIGHT_REFINE=1（在 generate_smart_schedule 层已读）。
    """
    if len(times) <= 1:
        return list(times)

    def strip_tz(t: datetime) -> datetime:
        return t.replace(tzinfo=None) if t.tzinfo else t

    out = [strip_tz(times[0])]
    for raw in times[1:]:
        t = max(strip_tz(raw), out[-1] + timedelta(minutes=min_after_prev))
        if 0 <= t.hour < 8:
            minute_slot = random.randint(0, 50)
            candidate = t.replace(hour=12, minute=minute_slot, second=0, microsecond=0)
            if candidate <= out[-1] + timedelta(minutes=min_after_prev):
                nd = out[-1].date() + timedelta(days=1)
                candidate = datetime(nd.year, nd.month, nd.day, 12, random.randint(0, 50), 0)
            t = candidate
        while t <= out[-1] + timedelta(minutes=min_after_prev):
            t += timedelta(minutes=30)
        out.append(t)
    return out


def generate_smart_schedule(
    n: int,
    start_time: datetime | None = None,
    avoid_late_night: bool | None = None,
) -> list[datetime]:
    """
    推荐默认：按条数自适应间隔 + 总跨度，并避开凌晨。
    avoid_late_night 默认 True；SCHEDULE_NO_NIGHT_REFINE=1 可关闭。
    """
    if n <= 0:
        return []
    if avoid_late_night is None:
        avoid_late_night = os.environ.get("SCHEDULE_NO_NIGHT_REFINE", "").strip() not in (
            "1",
            "true",
            "yes",
        )
    min_gap, max_gap, max_hours = suggest_stagger_params(n)
    times = generate_schedule(
        n,
        min_gap=min_gap,
        max_gap=max_gap,
        max_hours=max_hours,
        first_delay=0,
        start_time=start_time,
    )
    if avoid_late_night and n > 1:
        times = refine_avoid_late_night(times)
    return times


def generate_schedule(
    n: int,
    min_gap: int = 30,
    max_gap: int = 120,
    max_hours: float = 24.0,
    first_delay: int = 0,
    start_time: datetime = None,
) -> list[datetime]:
    """
    返回 n 个 datetime：
    - times[0] = now + first_delay（默认 0 = 立即）
    - times[1..] = 前一条 + random(min_gap, max_gap) 分钟
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
        first_delay = max(0, int(first_delay * ratio))
        gaps = [max(5, int(g * ratio)) for g in gaps]

    times = []
    cur = base + timedelta(minutes=first_delay)
    times.append(cur)
    for g in gaps:
        cur = cur + timedelta(minutes=g)
        times.append(cur)

    return times


def format_schedule(videos: list[str], times: list[datetime]) -> str:
    """格式化排期表"""
    lines = ["  序号 | 发布时间             | 间隔    | 视频"]
    lines.append("  " + "-" * 70)
    for i, (v, t) in enumerate(zip(videos, times)):
        gap = "立即" if i == 0 else ""
        if i > 0:
            delta = (t - times[i - 1]).total_seconds() / 60
            gap = f"{delta:.0f}min"
        name = v[:40] if len(v) > 40 else v
        lines.append(f"  {i+1:>4} | {t.strftime('%Y-%m-%d %H:%M')} | {gap:>7} | {name}")

    total = (times[-1] - times[0]).total_seconds() / 3600 if len(times) > 1 else 0
    lines.append("  " + "-" * 70)
    lines.append(f"  总跨度: {total:.1f}h | 首条: {times[0].strftime('%H:%M')}(立即) | 末条: {times[-1].strftime('%H:%M')}")
    return "\n".join(lines)


if __name__ == "__main__":
    schedule = generate_schedule(12)
    names = [f"视频_{i+1}.mp4" for i in range(12)]
    print(format_schedule(names, schedule))
