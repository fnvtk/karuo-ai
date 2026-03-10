#!/usr/bin/env python3
"""
Playwright 平台定时发布辅助 — 通用日期时间填写逻辑
各平台调用 set_scheduled_time(page, dt, platform_hint) 即可
"""
import asyncio
from datetime import datetime


async def set_scheduled_time(page, scheduled_time: datetime, platform: str = "") -> bool:
    """
    在 Playwright 页面上设置定时发布时间。
    返回 True 表示成功设置，False 表示失败（降级为立即发布）。
    """
    if not scheduled_time:
        return False

    date_str = scheduled_time.strftime("%Y-%m-%d")
    time_str = scheduled_time.strftime("%H:%M")
    print(f"  [定时] 设置定时发布: {date_str} {time_str}", flush=True)

    try:
        found = await _click_schedule_toggle(page)
        if not found:
            print(f"  [定时] 未找到定时发布选项，降级为立即发布", flush=True)
            return False

        await asyncio.sleep(1)

        ok = await _fill_datetime(page, scheduled_time, date_str, time_str)
        if ok:
            print(f"  [定时] 已设置定时: {date_str} {time_str}", flush=True)
        else:
            print(f"  [定时] 日期时间填写失败，降级为立即发布", flush=True)
        return ok

    except Exception as e:
        print(f"  [定时] 异常: {str(e)[:60]}，降级为立即发布", flush=True)
        return False


async def _click_schedule_toggle(page) -> bool:
    """找到并点击定时发布开关/单选按钮"""
    selectors = [
        'label:has-text("定时发布")',
        'span:has-text("定时发布")',
        'div:has-text("定时发布"):not(:has(div:has-text("定时发布")))',
        'input[value="schedule"] + label',
        'input[value="schedule"]',
        'text=定时发布',
        '[class*="schedule"]',
        '[class*="timing"]',
    ]

    for sel in selectors:
        loc = page.locator(sel).first
        try:
            if await loc.count() > 0:
                await loc.scroll_into_view_if_needed()
                await asyncio.sleep(0.3)
                await loc.click(force=True)
                return True
        except Exception:
            continue

    clicked = await page.evaluate("""() => {
        const texts = ['定时发布', '定时', '预约发布', '选择时间发布'];
        const all = document.querySelectorAll('label, span, div, li, a, button, input[type="radio"]');
        for (const el of all) {
            const t = el.textContent?.trim();
            if (t && texts.some(k => t === k || t.startsWith(k)) && el.offsetParent !== null) {
                el.click();
                return true;
            }
        }
        return false;
    }""")
    return clicked


async def _fill_datetime(page, dt: datetime, date_str: str, time_str: str) -> bool:
    """填写日期和时间（处理各种 datepicker 形式）"""
    date_filled = await _try_fill_date(page, dt, date_str)
    time_filled = await _try_fill_time(page, dt, time_str)

    if not date_filled and not time_filled:
        return await _try_fill_combined(page, dt, date_str, time_str)

    return date_filled or time_filled


async def _try_fill_date(page, dt: datetime, date_str: str) -> bool:
    """尝试填写日期"""
    date_selectors = [
        'input[type="date"]',
        'input[placeholder*="日期"]',
        'input[placeholder*="年"]',
        'input[class*="date"]',
    ]

    for sel in date_selectors:
        loc = page.locator(sel).first
        try:
            if await loc.count() > 0:
                await loc.click(force=True)
                await loc.fill(date_str)
                await asyncio.sleep(0.3)
                return True
        except Exception:
            continue

    filled = await page.evaluate("""(dateStr) => {
        const inputs = document.querySelectorAll('input');
        for (const inp of inputs) {
            const ph = (inp.placeholder || '').toLowerCase();
            const cls = (inp.className || '').toLowerCase();
            if ((ph.includes('日期') || ph.includes('date') || cls.includes('date'))
                && inp.offsetParent !== null) {
                const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
                nativeSet.call(inp, dateStr);
                inp.dispatchEvent(new Event('input', {bubbles: true}));
                inp.dispatchEvent(new Event('change', {bubbles: true}));
                return true;
            }
        }
        return false;
    }""", date_str)
    return filled


async def _try_fill_time(page, dt: datetime, time_str: str) -> bool:
    """尝试填写时间"""
    time_selectors = [
        'input[type="time"]',
        'input[placeholder*="时间"]',
        'input[placeholder*="时"]',
        'input[class*="time"]:not([class*="timestamp"])',
    ]

    for sel in time_selectors:
        loc = page.locator(sel).first
        try:
            if await loc.count() > 0:
                await loc.click(force=True)
                await loc.fill(time_str)
                await asyncio.sleep(0.3)
                return True
        except Exception:
            continue

    filled = await page.evaluate("""(timeStr) => {
        const inputs = document.querySelectorAll('input');
        for (const inp of inputs) {
            const ph = (inp.placeholder || '').toLowerCase();
            const cls = (inp.className || '').toLowerCase();
            if ((ph.includes('时间') || ph.includes('time') || cls.includes('time'))
                && !cls.includes('timestamp') && inp.offsetParent !== null) {
                const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
                nativeSet.call(inp, timeStr);
                inp.dispatchEvent(new Event('input', {bubbles: true}));
                inp.dispatchEvent(new Event('change', {bubbles: true}));
                return true;
            }
        }
        return false;
    }""", time_str)
    return filled


async def _try_fill_combined(page, dt: datetime, date_str: str, time_str: str) -> bool:
    """尝试一体式 datetime 输入"""
    combined = f"{date_str} {time_str}"

    loc = page.locator('input[type="datetime-local"]').first
    try:
        if await loc.count() > 0:
            await loc.fill(f"{date_str}T{time_str}")
            return True
    except Exception:
        pass

    filled = await page.evaluate("""(combined) => {
        const inputs = document.querySelectorAll('input');
        for (const inp of inputs) {
            const ph = (inp.placeholder || '');
            if ((ph.includes('发布时间') || ph.includes('选择时间'))
                && inp.offsetParent !== null) {
                const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
                nativeSet.call(inp, combined);
                inp.dispatchEvent(new Event('input', {bubbles: true}));
                inp.dispatchEvent(new Event('change', {bubbles: true}));
                return true;
            }
        }
        return false;
    }""", combined)
    return filled
