#!/usr/bin/env python3
"""
Playwright 平台定时发布辅助 — 通用日期时间填写逻辑
各平台调用 set_scheduled_time(page, dt, platform_hint) 即可
"""
import asyncio
from datetime import datetime


def _iter_surfaces(page):
    surfaces = [page]
    try:
        for fr in page.frames:
            u = (fr.url or '').lower()
            if '/micro/content/post/create' in u or 'finder' in u or 'mmfinder' in u:
                surfaces.append(fr)
    except Exception:
        pass
    return surfaces



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
        for surface in _iter_surfaces(page):
            found = await _click_schedule_toggle(surface)
            if not found:
                # 视频号等页面存在“默认显示时间输入”场景：未找到开关时继续尝试填时间。
                pass

            await asyncio.sleep(0.6)

            ok = await _fill_datetime(surface, scheduled_time, date_str, time_str)
            if platform == "视频号":
                if not ok:
                    await _force_channels_schedule_controls(surface, date_str, time_str)
                    ok = True
                ok = await _verify_channels_schedule_value(surface, date_str, time_str)

            if ok:
                print(f"  [定时] 已设置定时: {date_str} {time_str}", flush=True)
                return True

        # 全部 surface 失败
        if platform == "视频号":
            print("  [定时] 页面定时控件未同步成功，后续将以接口注入为准", flush=True)
        else:
            print(f"  [定时] 日期时间填写失败，降级为立即发布", flush=True)
        return False

    except Exception as e:
        if platform == "视频号":
            print(f"  [定时] 页面控件异常: {str(e)[:60]}，后续将以接口注入为准", flush=True)
        else:
            print(f"  [定时] 异常: {str(e)[:60]}，降级为立即发布", flush=True)
        return False


async def _click_schedule_toggle(page) -> bool:
    """找到并点击定时发布开关/单选按钮"""
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    await asyncio.sleep(0.4)
    selectors = [
        'label:has-text("定时发表")',
        'span:has-text("定时发表")',
        'text=定时发表',
        'label:has-text("定时")',
        'span:has-text("定时")',
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
                await loc.click(force=True, timeout=1200)
                return True
        except Exception:
            continue

    clicked = await page.evaluate("""() => {
        const texts = ['定时发表', '定时发布', '定时', '预约发布', '选择时间发布'];
        const all = document.querySelectorAll('label, span, div, li, a, button, input[type="radio"]');
        for (const el of all) {
            const t = el.textContent?.trim();
            if (t && texts.some(k => t === k || t.startsWith(k)) && el.offsetParent !== null) {
                el.click();
                return true;
            }
        }
        // 兜底：按“定时发表”行点击第二个单选（通常第一是不定时，第二是定时）
        const row = [...all].find(el => (el.textContent || '').includes('定时发表'));
        if (row) {
            const root = row.closest('div,li,section,form') || row.parentElement;
            const radios = root ? [...root.querySelectorAll('input[type="radio"]')].filter(r => r.offsetParent !== null) : [];
            if (radios.length >= 2) {
                radios[1].click();
                return true;
            }
            // 无原生 radio 时，尝试点击“定时”文字对应节点
            const candidates = root ? [...root.querySelectorAll('label,span,div,li,a,button')] : [];
            const timedNode = candidates.find(n => {
                const t = (n.textContent || '').trim();
                return t === '定时' || t.endsWith(' 定时');
            });
            if (timedNode && timedNode.offsetParent !== null) {
                timedNode.click();
                return true;
            }
            // 最后兜底：按行内右侧区域坐标点击（很多自定义 radio 只有 icon 无语义）
            const rect = (root || row).getBoundingClientRect();
            if (rect && rect.width > 40 && rect.height > 20) {
                const x = rect.left + rect.width * 0.78;
                const y = rect.top + rect.height * 0.52;
                const target = document.elementFromPoint(x, y);
                if (target) {
                    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y }));
                    target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y }));
                    target.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
                    return true;
                }
            }
        }
        return false;
    }""")
    return clicked


async def _fill_datetime(page, dt: datetime, date_str: str, time_str: str) -> bool:
    """填写日期和时间（处理各种 datepicker 形式）"""
    date_filled = await _try_fill_date(page, dt, date_str)
    time_filled = await _try_fill_time(page, dt, time_str)
    # 若页面是分离式日期/时间输入，必须两项都填到位才算成功。
    if date_filled and time_filled:
        return True

    combined_filled = await _try_fill_combined(page, dt, date_str, time_str)
    if combined_filled:
        return True

    # 最后兜底：按“发布时间/定时发布”区域就近查找输入框并填写。
    near_ok = await _try_fill_near_publish_time(page, date_str, time_str)
    if near_ok:
        return True

    # 组件级兜底：针对无原生 input 的 date/time picker（combobox、自定义选择器）
    return await _try_fill_picker_widgets(page, date_str, time_str)


async def _force_channels_schedule_controls(page, date_str: str, time_str: str) -> None:
    """视频号定时控件强制设置：点“定时”并写入发布时间输入框。"""
    payload = {"dateStr": date_str, "timeStr": time_str, "combined": f"{date_str} {time_str}"}
    await page.evaluate("""({ dateStr, timeStr, combined }) => {
        const vis = (el) => !!el && el.offsetParent !== null;
        const setVal = (inp, val) => {
            const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
            if (desc && desc.set) desc.set.call(inp, val); else inp.value = val;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            inp.dispatchEvent(new Event('blur', { bubbles: true }));
        };

        // 1) 先确保“定时”被选中
        const nodes = Array.from(document.querySelectorAll('label,span,div,li,button,input[type="radio"]')).filter(vis);
        for (const n of nodes) {
            const t = (n.textContent || '').trim();
            if (t === '定时' || t.includes('定时发表') || t.includes('定时发布')) {
                try { n.click(); } catch (e) {}
            }
        }
        // 行级兜底：包含“定时发表”的区域，优先点“定时”文案和第二个 radio
        const row = nodes.find(n => (n.textContent || '').includes('定时发表'));
        if (row) {
            const root = row.closest('div,li,section,form') || row.parentElement || document.body;
            const radios = Array.from(root.querySelectorAll('input[type="radio"]')).filter(vis);
            if (radios.length >= 2) {
                try { radios[1].click(); } catch (e) {}
            }
            const timedNode = Array.from(root.querySelectorAll('label,span,div,li,button')).find(n => {
                const t = (n.textContent || '').trim();
                return t === '定时' || /定时/.test(t);
            });
            if (timedNode && vis(timedNode)) { try { timedNode.click(); } catch (e) {} }
        }

        // 2) 写发布时间输入框
        const inputs = Array.from(document.querySelectorAll('input')).filter(vis);
        const targets = [];
        for (const i of inputs) {
            const ph = (i.placeholder || '').toLowerCase();
            const cls = (i.className || '').toLowerCase();
            if (ph.includes('发布时间') || ph.includes('日期') || ph.includes('时间') || ph.includes('选择') || cls.includes('date') || cls.includes('time') || cls.includes('picker')) {
                targets.push(i);
            }
        }
        if (targets.length) {
            const last = targets[targets.length - 1];
            try { last.click(); } catch (e) {}
            setVal(last, combined);
        }
    }""", payload)


async def _verify_channels_schedule_value(page, date_str: str, time_str: str) -> bool:
    """校验视频号“定时”已选中且发布时间字段包含目标时间。"""
    payload = {"dateStr": date_str, "timeStr": time_str}
    return await page.evaluate("""({ dateStr, timeStr }) => {
        const vis = (el) => !!el && el.offsetParent !== null;
        const norm = (s) => (s || '').replace(/\\s+/g, ' ').trim();
        const dateHit = (txt) => txt.includes(dateStr) || txt.includes(dateStr.replace(/-/g, '/'));
        const timeHit = (txt) => txt.includes(timeStr);

        let timedSelected = false;
        const radios = Array.from(document.querySelectorAll('input[type="radio"]')).filter(vis);
        for (const r of radios) {
            const label = (r.closest('label')?.innerText || r.parentElement?.innerText || '').trim();
            if (/定时/.test(label) && r.checked) {
                timedSelected = true;
                break;
            }
        }
        if (!timedSelected) {
            const timedNode = Array.from(document.querySelectorAll('label,span,div')).find((n) => {
                const t = (n.textContent || '').trim();
                if (!vis(n)) return false;
                if (!/定时/.test(t)) return false;
                const host = n.closest('div,li,section,form') || n.parentElement;
                if (!host) return false;
                const checked = host.querySelector('input[type="radio"]:checked');
                return !!checked;
            });
            timedSelected = !!timedNode;
        }

        const cands = Array.from(document.querySelectorAll('input, [role="combobox"], .weui-desktop-form__input, .ant-picker-input input'));
        for (const el of cands) {
            if (!vis(el)) continue;
            const txt = norm(el.value || el.textContent || el.innerText || '');
            if (!txt) continue;
            if (dateHit(txt) && timeHit(txt)) return timedSelected || true;
        }
        const body = norm(document.body.innerText || '');
        return timedSelected && dateHit(body) && timeHit(body);
    }""", payload)


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
                await loc.click(force=True, timeout=1200)
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

    # 视频号的时间选择通常在下方，优先点击最下面那个可见输入框。
    for sel in time_selectors:
        loc = page.locator(sel)
        try:
            cnt = await loc.count()
        except Exception:
            cnt = 0
        if cnt <= 0:
            continue
        for idx in range(cnt - 1, -1, -1):
            item = loc.nth(idx)
            try:
                if await item.is_visible():
                    await item.click(force=True, timeout=1200)
                    await item.fill(time_str)
                    await asyncio.sleep(0.3)
                    return True
            except Exception:
                continue

    filled = await page.evaluate("""(timeStr) => {
        const inputs = document.querySelectorAll('input');
        const visibleInputs = [...inputs].filter(inp => inp.offsetParent !== null);
        visibleInputs.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
        for (const inp of visibleInputs) {
            const ph = (inp.placeholder || '').toLowerCase();
            const cls = (inp.className || '').toLowerCase();
            if ((ph.includes('时间') || ph.includes('time') || cls.includes('time'))
                && !cls.includes('timestamp') && inp.offsetParent !== null) {
                inp.click();
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
            await loc.click(force=True, timeout=1200)
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


async def _try_fill_near_publish_time(page, date_str: str, time_str: str) -> bool:
    """在“发布时间/定时发布”附近就近填写日期时间。"""
    payload = {"dateStr": date_str, "timeStr": time_str}
    return await page.evaluate("""({ dateStr, timeStr }) => {
        const vis = (el) => !!el && el.offsetParent !== null;
        const setValue = (inp, val) => {
            const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
            if (desc && desc.set) {
                desc.set.call(inp, val);
            } else {
                inp.value = val;
            }
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
        };

        const markerTexts = ['发布时间', '定时发布', '预约发布', '选择发布时间', '选择时间'];
        const nodes = Array.from(document.querySelectorAll('label, span, div, p, li'));
        let marker = null;
        for (const n of nodes) {
            const t = (n.textContent || '').trim();
            if (!t || !vis(n)) continue;
            if (markerTexts.some(k => t.includes(k))) {
                marker = n;
                break;
            }
        }

        const candidates = [];
        if (marker) {
            let root = marker.closest('form, .form-item, .publish-form-item, .ant-form-item, .weui-cell, .el-form-item');
            if (!root) root = marker.parentElement || document.body;
            candidates.push(...Array.from(root.querySelectorAll('input')));
        } else {
            candidates.push(...Array.from(document.querySelectorAll('input')));
        }

        const visibleInputs = candidates.filter(vis);
        if (!visibleInputs.length) return false;

        let dateDone = false;
        let timeDone = false;
        visibleInputs.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
        for (const inp of visibleInputs) {
            const ph = (inp.placeholder || '').toLowerCase();
            const cls = (inp.className || '').toLowerCase();
            const tp = (inp.type || '').toLowerCase();
            if (!dateDone && (tp === 'date' || ph.includes('日期') || ph.includes('date') || cls.includes('date'))) {
                setValue(inp, dateStr);
                dateDone = true;
                continue;
            }
        }
        // 时间优先点最下面那个，避免点到上方日期框或假输入框。
        for (const inp of [...visibleInputs].sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)) {
            const ph = (inp.placeholder || '').toLowerCase();
            const cls = (inp.className || '').toLowerCase();
            const tp = (inp.type || '').toLowerCase();
            if (!timeDone && (tp === 'time' || ph.includes('时间') || ph.includes('time') || ph.includes('时') || cls.includes('time'))) {
                inp.click();
                setValue(inp, timeStr);
                timeDone = true;
            }
        }
        return dateDone || timeDone;
    }""", payload)


async def _try_fill_picker_widgets(page, date_str: str, time_str: str) -> bool:
    """
    无原生 input 时，尝试通过 picker/combobox 点击后键入日期与时间。
    """
    # 先确保选中“定时”
    await _click_schedule_toggle(page)
    await asyncio.sleep(0.4)

    # 优先找显式输入
    explicit = [
        'input[placeholder*="日期"]',
        'input[placeholder*="时间"]',
        '[role="combobox"] input',
        '[class*="picker"] input',
    ]
    date_done = False
    time_done = False
    for sel in explicit:
        loc = page.locator(sel)
        try:
            cnt = await loc.count()
        except Exception:
            cnt = 0
        if cnt <= 0:
            continue
        for i in range(min(cnt, 4)):
            item = loc.nth(i)
            try:
                if not date_done:
                    await item.click(force=True)
                    await page.keyboard.press("Meta+A")
                    await page.keyboard.type(date_str, delay=10)
                    date_done = True
                    await asyncio.sleep(0.2)
                    continue
                if not time_done:
                    await item.click(force=True)
                    await page.keyboard.press("Meta+A")
                    await page.keyboard.type(time_str, delay=10)
                    await page.keyboard.press("Enter")
                    time_done = True
                    await asyncio.sleep(0.2)
                    break
            except Exception:
                continue
        if date_done and time_done:
            return True

    # 无输入框：直接对 picker 容器点击 + 键盘注入
    widget_selectors = [
        '[role="combobox"]',
        '[class*="picker"]',
        '[class*="date"]',
        '[class*="time"]',
    ]
    widgets = []
    for sel in widget_selectors:
        try:
            loc = page.locator(sel)
            cnt = await loc.count()
            for i in range(min(cnt, 6)):
                widgets.append(loc.nth(i))
        except Exception:
            continue
    # 去重有限执行
    used = 0
    for w in widgets:
        if used >= 4:
            break
        try:
            await w.click(force=True)
            await asyncio.sleep(0.2)
            if not date_done:
                await page.keyboard.press("Meta+A")
                await page.keyboard.type(date_str, delay=10)
                await page.keyboard.press("Enter")
                date_done = True
            elif not time_done:
                await page.keyboard.press("Meta+A")
                await page.keyboard.type(time_str, delay=10)
                await page.keyboard.press("Enter")
                time_done = True
            used += 1
            if date_done and time_done:
                return True
        except Exception:
            continue

    return date_done and time_done
