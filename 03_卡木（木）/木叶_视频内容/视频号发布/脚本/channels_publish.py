#!/usr/bin/env python3
"""
视频号发布 v3 — headless Playwright + 描述写入修复 + 统一 Cookie
- 默认无头：publish_one(..., headless=True)；有头调试传 headless=False
- 描述与话题：VideoMeta.description(\"视频号\")，与 channels_web_cli / 多平台一致
- API 响应拦截 + 列表验证双重确认
- 描述通过 clipboard/insertText 写入（不依赖 contenteditable.fill）
"""
import asyncio
import json
import os
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "channels_storage_state.json"
VIDEO_DIR = Path("/Users/karuo/Movies/soul视频/soul 派对 120场 20260320_output/成片")

sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))
from publish_result import PublishResult
from video_metadata import VideoMeta

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)
def _light_mode() -> bool:
    return os.environ.get("CHANNELS_LIGHT_MODE", "").strip() in ("1", "true", "yes")

DESC_SUFFIX = " #小程序 #卡若创业派对 #Ai创业 #私域流量"
# 列表 API 验收：描述中必须同时出现以下片段（与 DESC_SUFFIX 一致）
REQUIRED_DESC_FRAGMENTS = ["#小程序", "#卡若创业派对", "#Ai创业", "#私域流量"]

# 标题与话题以多平台脚本 video_metadata.VideoMeta / CURATED_TITLES 为准（本文件不再维护重复映射）

# ---------------------------------------------------------------------------
# API Capture
# ---------------------------------------------------------------------------
@dataclass
class ApiCapture:
    publish_responses: list = field(default_factory=list)
    all_calls: list = field(default_factory=list)
    raw_events_file: str = ""

    @staticmethod
    def _clip(v, n: int = 200000):
        s = "" if v is None else str(v)
        return s if len(s) <= n else s[:n] + "...<truncated>"

    @staticmethod
    def _sanitize_headers(headers: dict) -> dict:
        out = {}
        for k, v in (headers or {}).items():
            lk = (k or "").lower()
            if lk == "cookie":
                out[k] = "<masked-cookie>"
            elif lk == "authorization":
                out[k] = "<masked-auth>"
            else:
                out[k] = v
        return out

    def _append_event(self, payload: dict) -> None:
        if not self.raw_events_file:
            return
        try:
            with open(self.raw_events_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(payload, ensure_ascii=False) + "\n")
        except Exception:
            pass

    def start_network_log(self, video_path: str, *, headless: bool, scheduled_time) -> None:
        if _light_mode():
            self.raw_events_file = ""
            return
        net_dir = Path("/tmp/channels_netlogs")
        net_dir.mkdir(exist_ok=True)
        stem = Path(video_path).stem
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.raw_events_file = str(net_dir / f"{stem}_{ts}.jsonl")
        self._append_event(
            {
                "event": "session_meta",
                "ts": datetime.now().isoformat(),
                "video_path": video_path,
                "headless": headless,
                "scheduled_time": (
                    scheduled_time.strftime("%Y-%m-%d %H:%M:%S")
                    if hasattr(scheduled_time, "strftime")
                    else None
                ),
                "ua": UA,
                "viewport": {"width": 1280, "height": 900},
            }
        )

    async def handle_request(self, request):
        url = request.url
        if "cgi-bin" not in url and "finder-assistant" not in url:
            return
        record = {
            "event": "request",
            "ts": datetime.now().isoformat(),
            "method": request.method,
            "url": url,
            "headers": self._sanitize_headers(request.headers or {}),
            "post_data": self._clip(request.post_data or ""),
            "resource_type": request.resource_type,
        }
        self._append_event(record)

    async def handle(self, response):
        url = response.url
        if "cgi-bin" not in url and "finder-assistant" not in url:
            return
        req = response.request
        record = {
            "event": "response",
            "ts": datetime.now().isoformat(),
            "url": url,
            "status": response.status,
            "method": (req.method if req else ""),
            "req_headers": self._sanitize_headers((req.headers if req else {}) or {}),
            "req_post_data": self._clip((req.post_data if req else "") or ""),
        }
        try:
            body = await response.json()
            record["body"] = body
        except Exception:
            try:
                record["body_text"] = self._clip(await response.text())
            except Exception:
                record["body_text"] = ""
        self.all_calls.append(record)
        self._append_event(record)
        lower = url.lower()
        if any(k in lower for k in ("publish", "post_create", "post_publish", "create_post")):
            self.publish_responses.append(record)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _extract_token(page) -> str | None:
    url = page.url
    if "token=" in url:
        return url.split("token=")[1].split("&")[0]
    try:
        return await page.evaluate(
            "window.__wxConfig && window.__wxConfig.token || ''"
        ) or None
    except Exception:
        return None


def _cookie_str_from_file() -> str:
    if not COOKIE_FILE.exists():
        return ""
    state = json.loads(COOKIE_FILE.read_text(encoding="utf-8"))
    return "; ".join(f"{c['name']}={c['value']}" for c in state.get("cookies", []))


def _post_list_raw(cookie_str: str, page_num: int, page_size: int = 50) -> dict:
    """post_list 原始 JSON，用于预检登录态。"""
    import httpx

    if not (cookie_str or "").strip():
        return {"errCode": -1, "errMsg": "empty cookie"}
    try:
        tmo = httpx.Timeout(12.0, connect=5.0, read=12.0)
        r = httpx.post(
            "https://channels.weixin.qq.com/cgi-bin/mmfinderassistant-bin/post/post_list",
            json={"pageSize": page_size, "pageNum": page_num},
            headers={
                "Cookie": cookie_str,
                "User-Agent": UA,
                "Content-Type": "application/json",
            },
            timeout=tmo,
        )
        return r.json()
    except Exception as e:
        return {"errCode": -2, "errMsg": str(e)[:120]}


def verify_session_cookie() -> tuple[bool, str, int | None]:
    """
    用 post_list 探测 Cookie 是否仍可用（避免 headless 连跑十几条才发现过期）。
    返回 (ok, 说明, errCode)。
    """
    cookie_str = _cookie_str_from_file()
    data = _post_list_raw(cookie_str, 1, 5)
    code = data.get("errCode")
    if code == 0:
        n = len((data.get("data") or {}).get("list") or [])
        return True, f"视频号 API 正常，列表样本 {n} 条", 0
    msg = (data.get("errMsg") or data.get("msg") or json.dumps(data, ensure_ascii=False)[:200]) or "unknown"
    return False, f"errCode={code} {msg}", int(code) if code is not None else None


def _post_list_page(cookie_str: str, page_num: int, page_size: int = 50) -> list:
    data = _post_list_raw(cookie_str, page_num, page_size)
    if data.get("errCode") != 0:
        return []
    return data.get("data", {}).get("list") or []


def _gather_post_list(cookie_str: str, max_pages: int = 18) -> list:
    """一次性拉取多页 post_list，避免轮询时每轮重复深翻页。"""
    out: list = []
    for pn in range(1, max_pages + 1):
        items = _post_list_page(cookie_str, pn)
        print(f"  [5b·页] post_list p={pn} 本页={len(items)} 累计={len(out)+len(items)}", flush=True)
        if not items:
            break
        out.extend(items)
    return out


def _title_keywords_for_list_check(title: str, video_path: str) -> list[str]:
    """列表 API 描述可能被截断：同一标题也会生成 28/18/12/8 等多段前缀依次匹配。"""
    raw = (title or "").split("#")[0].strip()
    stem = Path(video_path).stem.strip()

    def _add_lengths(s: str, out: list[str]) -> None:
        if not s:
            return
        for n in (28, 18, 12, 8):
            c = (s[:n] if len(s) >= n else s).strip()
            if c and c not in out:
                out.append(c)

    chunks: list[str] = []
    _add_lengths(raw, chunks)
    if stem and stem != raw:
        _add_lengths(stem, chunks)
    return chunks


def _find_post_in_cached_items(
    items: list,
    title_kw: str | list[str],
    required_frags: list[str],
) -> tuple[bool, str, dict | None]:
    """在已拉取的列表中查找描述含标题关键词且含必选标签的条目。"""
    from datetime import datetime

    if isinstance(title_kw, str):
        kws = [title_kw]
    else:
        kws = list(title_kw)
    kws = [(k or "").strip()[:28] for k in kws if (k or "").strip()]
    if not kws:
        return False, "标题关键词为空", None

    for title_kw_one in kws:
        for idx, it in enumerate(items):
            desc = (it.get("desc") or {}).get("description") or ""
            if title_kw_one not in desc:
                continue
            desc_lower = desc.lower()
            if any(frag.lower() not in desc_lower for frag in required_frags):
                continue
            tips = it.get("postTipsInfo") or {}
            wording = (tips.get("wording") or "").strip()
            if wording and ("发表失败" in wording or "上传失败" in wording):
                continue
            ct = it.get("createTime")
            ct_s = datetime.fromtimestamp(ct).strftime("%Y-%m-%d %H:%M") if ct else "?"
            return (
                True,
                f"列表第{idx+1}条命中 | kw={title_kw_one} | createTime={ct_s} | {wording or '无tips'}",
                it,
            )
    return (
        False,
        f"未在已拉取的{len(items)}条中找到关键词(已试{len(kws)}个)+完整标签",
        None,
    )


def _find_publish_failure_row(
    items: list,
    title_kw: str | list[str],
    required_frags: list[str],
) -> str | None:
    """
    列表里若已出现「描述匹配 + 必选标签」但 tips 为发表/上传失败，立即判定红字（不再空等到超时）。
    """
    if isinstance(title_kw, str):
        kws = [title_kw]
    else:
        kws = list(title_kw)
    kws = [(k or "").strip()[:28] for k in kws if (k or "").strip()]
    for title_kw_one in kws:
        for idx, it in enumerate(items):
            desc = (it.get("desc") or {}).get("description") or ""
            if title_kw_one not in desc:
                continue
            desc_lower = desc.lower()
            if any(frag.lower() not in desc_lower for frag in required_frags):
                continue
            tips = it.get("postTipsInfo") or {}
            wording = (tips.get("wording") or "").strip()
            if wording and ("发表失败" in wording or "上传失败" in wording):
                return (
                    f"列表第{idx+1}条为失败态 | kw={title_kw_one} | tips={wording}"
                )
    return None


def _quick_check_recent_failure(
    cookie_str: str,
    title_kw: str | list[str],
    required_frags: list[str],
) -> tuple[bool, str]:
    """
    快速红字探测：仅查第一页最近内容，匹配关键词+必选片段后读取 postTipsInfo。
    返回 (is_failure, message)。
    """
    items = _post_list_page(cookie_str, 1, 50)
    hint = _find_publish_failure_row(items, title_kw, required_frags)
    if hint:
        return True, hint
    return False, "recent-page 未发现红字失败态"


async def _poll_post_list_until_visible(
    cookie_str: str,
    title_kw: str | list[str],
    required_frags: list[str],
    *,
    timeout_sec: int = 180,
    interval_sec: int = 6,
) -> tuple[bool, str]:
    deadline = time.time() + timeout_sec
    last_msg = ""
    round_i = 0
    while time.time() < deadline:
        round_i += 1
        print(f"  [5b·轮] 第{round_i}轮拉列表…", flush=True)
        items = await asyncio.to_thread(_gather_post_list, cookie_str, 6)
        fail_hint = _find_publish_failure_row(items, title_kw, required_frags)
        if fail_hint:
            print(f"  [5b·轮] 检测到红字/失败态: {fail_hint}", flush=True)
            return False, fail_hint
        ok, msg, _ = _find_post_in_cached_items(items, title_kw, required_frags)
        last_msg = msg
        print(f"  [5b·轮] 第{round_i}轮结果: {msg}", flush=True)
        if ok:
            return True, msg
        await asyncio.sleep(interval_sec)
    return False, last_msg or "列表API轮询超时"


async def _verify_on_list(page, title_keyword: str) -> tuple[bool, str]:
    """Navigate to content-list page and look for the video."""
    try:
        token = await _extract_token(page)
        list_url = "https://channels.weixin.qq.com/platform/post/list"
        if token:
            list_url += f"?token={token}"
        await page.goto(list_url, timeout=20000, wait_until="domcontentloaded")
        await asyncio.sleep(6)

        body_text = await page.evaluate("document.body.innerText")
        kw = title_keyword[:20]
        if kw in body_text:
            return True, f"标题匹配 ({kw})"

        found = await page.evaluate("""(kw) => {
            const items = document.querySelectorAll('[class*="post-feed"] [class*="desc"], [class*="post-item"] [class*="desc"]');
            for (const el of items) {
                if (el.textContent.includes(kw)) return true;
            }
            return false;
        }""", kw)
        if found:
            return True, f"DOM匹配 ({kw})"

        return False, "未在列表前20条中找到"
    except Exception as e:
        return False, f"验证异常: {str(e)[:60]}"


def _to_schedule_ts(scheduled_time) -> int:
    """datetime/int -> unix ts (s); 过近时间自动顺延 10 分钟。"""
    if scheduled_time is None:
        return 0
    from datetime import datetime
    if isinstance(scheduled_time, datetime):
        ts = int(scheduled_time.timestamp())
    else:
        ts = int(scheduled_time)
    now = int(time.time())
    return max(ts, now + 600)


def _inject_timing_payload(payload: dict, schedule_ts: int) -> dict:
    """给 post_create 请求体注入定时字段，绕过页面控件不可见问题。"""
    if not isinstance(payload, dict) or schedule_ts <= 0:
        return payload
    # 视频号实测关键字段：effectiveTime（unix秒）
    payload["effectiveTime"] = int(schedule_ts)
    # 兼容历史字段（保留）
    payload["postTimingInfo"] = {"timing": 1, "postTime": int(schedule_ts)}
    post_info = payload.get("postInfo")
    if isinstance(post_info, dict):
        post_info["postTime"] = int(schedule_ts)
        post_info["publishType"] = 1
    return payload


async def _setup_post_create_timing_route(page, scheduled_time):
    """拦截 post_create 请求并注入定时参数；返回注入状态对象。"""
    schedule_ts = _to_schedule_ts(scheduled_time)
    if schedule_ts <= 0:
        return {"enabled": False, "schedule_ts": 0, "injected_hits": 0}

    route_state = {"enabled": True, "schedule_ts": schedule_ts, "injected_hits": 0, "payload_hits": 0}

    async def _handler(route, request):
        try:
            if request.method.upper() != "POST":
                await route.continue_()
                return
            raw = request.post_data or ""
            data = None
            try:
                data = json.loads(raw) if raw else None
            except Exception:
                try:
                    data = request.post_data_json
                except Exception:
                    data = None
            if not isinstance(data, dict):
                await route.continue_()
                return
            patched = _inject_timing_payload(data, schedule_ts)
            route_state["injected_hits"] += 1
            ptxt = json.dumps(patched, ensure_ascii=False)
            if isinstance(patched, dict) and ("postTimingInfo" in patched or "postTime" in ptxt or "effectiveTime" in patched):
                route_state["payload_hits"] += 1
            try:
                Path('/tmp/channels_last_patched_post_create.json').write_text(ptxt, encoding='utf-8')
            except Exception:
                pass
            await route.continue_(post_data=ptxt)
        except Exception:
            await route.continue_()

    await page.route("**/post/post_create**", _handler)
    return route_state


def _iter_surfaces(page):
    """按优先级返回可操作 surface：先 page，再 micro/content 子 frame。"""
    surfaces = [page]
    for fr in page.frames:
        u = (fr.url or "").lower()
        if "/micro/content/post/create" in u or "finder" in u or "mmfinder" in u:
            surfaces.append(fr)
    # 去重但保序
    seen = set()
    out = []
    for s in surfaces:
        sid = id(s)
        if sid not in seen:
            seen.add(sid)
            out.append(s)
    return out


_ORIGINAL_VERIFY_JS = """() => {
    const vis = (el) => !!el && el.offsetParent !== null;
    const isChecked = (el) => {
        if (!el) return false;
        if (el.checked === true) return true;
        const aria = el.getAttribute && el.getAttribute('aria-checked');
        if (aria === 'true') return true;
        const cls = (el.className || '').toString();
        return /\\bchecked\\b|is-checked|weui-desktop-form__checkbox_checked/.test(cls);
    };
    const nodes = Array.from(document.querySelectorAll('label, span, div, p, li'));
    for (const n of nodes) {
        const t = (n.textContent || '').trim();
        if (!t || !vis(n) || !t.includes('声明原创')) continue;
        const row = n.closest('label,div,li,section,form') || n.parentElement;
        if (!row) continue;
        const controls = row.querySelectorAll(
            'input[type="checkbox"], [role="checkbox"], .el-checkbox__original, .ant-checkbox-input, input[type="radio"]'
        );
        for (const c of controls) {
            if (isChecked(c)) return true;
        }
    }
    return false;
}"""

_ORIGINAL_TOGGLE_JS = """() => {
    const vis = (el) => !!el && el.offsetParent !== null;
    const isChecked = (el) => {
        if (!el) return false;
        if (el.checked === true) return true;
        const aria = el.getAttribute && el.getAttribute('aria-checked');
        if (aria === 'true') return true;
        const cls = (el.className || '').toString();
        return /\\bchecked\\b|is-checked|weui-desktop-form__checkbox_checked/.test(cls);
    };
    const nodes = Array.from(document.querySelectorAll('label, span, div, p, li'));
    for (const n of nodes) {
        const t = (n.textContent || '').trim();
        if (!t || !vis(n) || !t.includes('声明原创')) continue;
        const row = n.closest('label,div,li,section,form') || n.parentElement;
        if (!row) continue;
        const controls = row.querySelectorAll(
            'input[type="checkbox"], [role="checkbox"], .el-checkbox__original, .ant-checkbox-input'
        );
        for (const c of controls) {
            if (isChecked(c)) return true;
            try { c.click(); } catch (e) {}
            if (isChecked(c)) return true;
        }
        const wrappers = row.querySelectorAll('.weui-desktop-form__checkbox, .el-checkbox, .ant-checkbox, [class*="checkbox"]');
        for (const w of wrappers) {
            try { w.click(); } catch (e) {}
        }
        try { n.click(); } catch (e) {}
        for (const c of row.querySelectorAll('input[type="checkbox"], [role="checkbox"]')) {
            if (isChecked(c)) return true;
        }
    }
    return false;
}"""


async def _is_original_verified(page) -> bool:
    """页面级：是否已勾选「声明原创」（任一 surface）。"""
    for surface in _iter_surfaces(page):
        try:
            if await surface.evaluate(_ORIGINAL_VERIFY_JS):
                return True
        except Exception:
            continue
    return False


async def _ensure_original_checked(page) -> bool:
    """尝试勾选「声明原创」；返回 True 表示执行了切换且当前已勾选（已验证）。"""
    for surface in _iter_surfaces(page):
        try:
            await surface.evaluate(_ORIGINAL_TOGGLE_JS)
        except Exception:
            continue
    return await _is_original_verified(page)


async def _ensure_original_with_retries(page, *, rounds: int = 4) -> bool:
    """多轮滚动 + 勾选 + 校验，避免假成功。"""
    for r in range(rounds):
        await _ensure_original_checked(page)
        if await _is_original_verified(page):
            return True
        try:
            await page.evaluate(
                "window.scrollTo(0, Math.min(document.body.scrollHeight, (document.body.scrollHeight||900)*0.35))"
            )
        except Exception:
            pass
        await asyncio.sleep(0.45 + r * 0.15)
    return await _is_original_verified(page)


async def _fill_short_title(page, short_text: str) -> None:
    """短标题（可选）：降低空短标题导致的审核/发表异常。"""
    t = (short_text or "").strip().replace("\n", " ")[:16]
    if not t:
        return
    selectors = [
        'input[placeholder*="短标题"]',
        'input[placeholder*="填写短标题"]',
        'input[maxlength="16"]',
    ]
    for surface in _iter_surfaces(page):
        for sel in selectors:
            loc = surface.locator(sel).first
            try:
                if await loc.count() > 0 and await loc.is_visible():
                    await loc.fill(t)
                    return
            except Exception:
                continue


async def _locate_original_target(page) -> dict | None:
    """定位“声明原创”所在区域，供截图和点击前校验使用。"""
    js = """() => {
        const vis = (el) => !!el && el.offsetParent !== null;
        const pickRect = (el) => {
            const r = el.getBoundingClientRect();
            return {
                x: Math.round(r.x),
                y: Math.round(r.y),
                width: Math.round(r.width),
                height: Math.round(r.height),
            };
        };
        const nodes = Array.from(document.querySelectorAll('label, span, div, p, li'));
        for (const n of nodes) {
            const t = (n.textContent || '').trim();
            if (!t || !vis(n) || !t.includes('声明原创')) continue;
            const row = n.closest('label,div,li,section,form') || n.parentElement || n;
            return {
                text: t.slice(0, 80),
                rect: pickRect(row),
            };
        }
        return null;
    }"""
    for surface in _iter_surfaces(page):
        try:
            found = await surface.evaluate(js)
            if found:
                found["surface"] = str(getattr(surface, "url", "") or "page")
                return found
        except Exception:
            continue
    return None


async def _locate_publish_target(page) -> dict | None:
    """定位“发表”按钮区域，供点击前截图与日志使用。"""
    js = """() => {
        const vis = (el) => !!el && el.offsetParent !== null;
        const pickRect = (el) => {
            const r = el.getBoundingClientRect();
            return {
                x: Math.round(r.x),
                y: Math.round(r.y),
                width: Math.round(r.width),
                height: Math.round(r.height),
            };
        };
        const btns = Array.from(document.querySelectorAll('button'));
        for (const b of btns) {
            const t = (b.textContent || '').trim();
            if (!vis(b) || !t.includes('发表')) continue;
            return {
                text: t,
                rect: pickRect(b),
            };
        }
        return null;
    }"""
    for surface in _iter_surfaces(page):
        try:
            found = await surface.evaluate(js)
            if found:
                found["surface"] = str(getattr(surface, "url", "") or "page")
                return found
        except Exception:
            continue
    return None


async def _ensure_original_modal_checkbox(page) -> bool:
    """
    原创确认弹窗里经常还有一个必须先勾选的复选框/协议项。
    这里在点击“声明原创”按钮前先把勾打上，并返回是否已勾选成功。
    """
    js = """() => {
        const vis = (el) => !!el && el.offsetParent !== null;
        const isChecked = (el) => {
            if (!el) return false;
            if (el.checked === true) return true;
            const aria = el.getAttribute && el.getAttribute('aria-checked');
            if (aria === 'true') return true;
            const cls = (el.className || '').toString();
            return /\\bchecked\\b|is-checked|active|selected|weui-desktop-form__checkbox_checked|checkbox_checked/.test(cls);
        };
        const clickNode = (n) => {
            if (!n || !vis(n)) return false;
            try { n.scrollIntoView({block: 'center', inline: 'center'}); } catch (e) {}
            try { n.click(); return true; } catch (e) {}
            return false;
        };
        const dialogs = Array.from(document.querySelectorAll('div,section,form')).filter(vis);
        for (const root of dialogs) {
            const txt = (root.innerText || root.textContent || '').trim();
            // 命中“原创权益/声明原创”弹窗
            if (!txt || (!txt.includes('声明原创') && !txt.includes('原创权益'))) continue;
            const boxes = Array.from(root.querySelectorAll(
                'input[type="checkbox"], [role="checkbox"], .weui-desktop-form__checkbox, .el-checkbox, .ant-checkbox, .weui-desktop-form__check-label'
            )).filter(vis);

            // 优先找“我已阅读并同意”这行，先点它左侧/邻近的勾选控件
            const agreeHints = Array.from(root.querySelectorAll('label,span,div,p,li')).filter(vis).filter((n) => {
                const t = (n.textContent || '').trim();
                return !!t && (
                    t.includes('我已阅读并同意') ||
                    (t.includes('已阅读') && t.includes('同意')) ||
                    (t.includes('原创声明须知') && t.includes('使用条款'))
                );
            });
            for (const hint of agreeHints) {
                const parent = hint.closest('label,div,p,li') || hint.parentElement;
                const scoped = Array.from((parent || root).querySelectorAll(
                    'input[type="checkbox"], [role="checkbox"], .weui-desktop-form__checkbox, .el-checkbox, .ant-checkbox'
                )).filter(vis);
                for (const b of scoped) {
                    if (isChecked(b)) return true;
                    clickNode(b);
                    if (isChecked(b)) return true;
                }
                // 某些页面是“文本容器点击=勾选”
                clickNode(hint);
                for (const b of scoped) {
                    if (isChecked(b)) return true;
                }
            }

            // 兜底：遍历弹窗内可见复选框依次点击直到真勾选
            if (!boxes.length) continue;
            for (const b of boxes) {
                if (isChecked(b)) return true;
            }
            for (const b of boxes) {
                clickNode(b);
                if (isChecked(b)) return true;
            }
            const labels = Array.from(root.querySelectorAll('label,span,div,p,li')).filter(vis);
            for (const n of labels) {
                const t = (n.textContent || '').trim();
                if (!t) continue;
                if (
                    t.includes('我已') || t.includes('已阅读') || t.includes('同意') ||
                    t.includes('原创') || t.includes('承诺')
                ) {
                    clickNode(n);
                    for (const b of boxes) {
                        if (isChecked(b)) return true;
                    }
                }
            }
            return false;
        }
        return true; // 没有额外复选框要求时直接放行
    }"""
    for surface in _iter_surfaces(page):
        try:
            ok = await surface.evaluate(js)
            if ok:
                return True
        except Exception:
            continue
    return False


async def _dismiss_blocking_overlays(page) -> None:
    """关闭可能拦截点击事件的遮罩/弹窗。"""
    await page.evaluate("""() => {
        const closeSelectors = [
          '.weui-desktop-dialog__close',
          '.weui-desktop-icon-btn.weui-desktop-icon-btn__close',
          '.weui-desktop-dialog [aria-label="关闭"]',
          '.weui-desktop-dialog .close',
          '.ant-modal-close',
        ];
        for (const sel of closeSelectors) {
          for (const el of document.querySelectorAll(sel)) {
            if (el && el.offsetParent !== null) el.click();
          }
        }
        const masks = document.querySelectorAll('.weui-desktop-dialog__wrp, .weui-desktop-mask, .ant-modal-mask');
        for (const m of masks) {
          if (m && m.offsetParent !== null) {
            m.style.pointerEvents = 'none';
          }
        }
    }""")


async def _dismiss_keep_edit_dialog(page) -> bool:
    """
    关闭“将此次编辑保留?/不保存/保存”拦截弹窗。
    这类弹窗会吞掉“发表”点击，导致一直重试却不发 post_create。
    """
    js = """() => {
        const vis = (el) => !!el && el.offsetParent !== null;
        const roots = Array.from(document.querySelectorAll('div,section,form')).filter(vis);
        for (const root of roots) {
            const txt = (root.innerText || root.textContent || '').trim();
            if (!txt) continue;
            const hit = txt.includes('将此次编辑保留') || txt.includes('无法保存草稿') || txt.includes('若要保存草稿');
            if (!hit) continue;
            const btns = Array.from(root.querySelectorAll('button')).filter(vis);
            for (const b of btns) {
                const t = (b.textContent || '').trim();
                if (t.includes('不保存')) {
                    try { b.click(); return true; } catch (e) {}
                }
            }
            for (const b of btns) {
                const t = (b.textContent || '').trim();
                if (t.includes('取消') || t.includes('关闭')) {
                    try { b.click(); return true; } catch (e) {}
                }
            }
        }
        return false;
    }"""
    for surface in _iter_surfaces(page):
        try:
            done = await surface.evaluate(js)
            if done:
                return True
        except Exception:
            continue
    return False


async def _click_visible_button_by_text(page, text: str) -> bool:
    """跨 page/iframe 点击可见按钮（按文案包含匹配）。"""
    js = f"""() => {{
        const vis = (el) => !!el && el.offsetParent !== null;
        const btns = Array.from(document.querySelectorAll('button'));
        for (const b of btns) {{
            const t = (b.textContent || '').trim();
            if (!vis(b) || !t.includes({text!r})) continue;
            if (b.disabled) continue;
            try {{
                b.scrollIntoView({{block:'center', inline:'center'}});
                b.click();
                return true;
            }} catch (e) {{}}
        }}
        return false;
    }}"""
    for surface in _iter_surfaces(page):
        try:
            ok = await surface.evaluate(js)
            if ok:
                return True
        except Exception:
            continue
    return False


async def _set_video_file_once(page, video_path: str) -> None:
    """单次尝试：直写 file input 或 filechooser。"""
    for surface in _iter_surfaces(page):
        fl = surface.locator('input[type="file"][accept*="video"]').first
        if await fl.count() == 0:
            fl = surface.locator('input[type="file"]').first
        if await fl.count() > 0:
            await fl.set_input_files(video_path)
            return

    trigger_candidates = [
        'text=上传视频',
        'text=发表视频',
        'button:has-text("上传")',
        'button:has-text("添加视频")',
        '[class*="upload"]',
    ]
    for surface in _iter_surfaces(page):
        for sel in trigger_candidates:
            trg = surface.locator(sel).first
            try:
                if await trg.count() > 0:
                    async with page.expect_file_chooser(timeout=8000) as fc_info:
                        await trg.click(force=True)
                    fc = await fc_info.value
                    await fc.set_files(video_path)
                    return
            except Exception:
                continue

    raise RuntimeError("未找到可用的视频上传控件（input/filechooser）")


async def _set_video_file(page, video_path: str) -> None:
    """上传视频（带重试：遮罩/上一页残留时常见第一次找不到 input）。"""
    last: Exception | None = None
    for attempt in range(1, 5):
        try:
            await _set_video_file_once(page, video_path)
            return
        except Exception as e:
            last = e
            print(f"  [2w] 上传控件重试 {attempt}/4: {str(e)[:80]}", flush=True)
            await _dismiss_blocking_overlays(page)
            try:
                await page.goto(
                    "https://channels.weixin.qq.com/platform/post/create",
                    timeout=30000,
                    wait_until="domcontentloaded",
                )
            except Exception:
                pass
            await asyncio.sleep(2 + attempt)
    raise last or RuntimeError("上传控件不可用")






# ---------------------------------------------------------------------------
# Core publish
# ---------------------------------------------------------------------------
async def publish_one(
    video_path: str,
    title: str,
    idx: int = 1,
    total: int = 1,
    skip_dedup: bool = False,
    scheduled_time=None,
    *,
    skip_list_verify: bool = False,
    headless: bool = True,
) -> PublishResult:
    from playwright.async_api import async_playwright
    from publish_result import is_published

    vp = Path(video_path)
    fname = vp.name
    meta = VideoMeta.from_filename(fname)
    display_title = meta.title("视频号")
    if not vp.is_file():
        print(f"\n[{idx}/{total}] {fname} — [✗] 文件不存在（成片可能被其它任务改写，请先停切片再发）", flush=True)
        return PublishResult(
            platform="视频号",
            video_path=video_path,
            title=display_title,
            success=False,
            status="error",
            message="源视频文件不存在，已跳过（避免重试崩溃）",
            error_code="FILE_NOT_FOUND",
            elapsed_sec=0.0,
        )
    fsize = vp.stat().st_size
    t0 = time.time()
    from datetime import datetime as _dt
    time_hint = ""
    if scheduled_time and isinstance(scheduled_time, _dt):
        time_hint = f" → 定时 {scheduled_time.strftime('%H:%M')}"
    print(f"\n[{idx}/{total}] {fname} ({fsize / 1024 / 1024:.1f}MB){time_hint}", flush=True)
    print(f"  标题: {display_title[:60]}", flush=True)

    if not skip_dedup and is_published("视频号", video_path):
        print("  [跳过] 该视频已发布到视频号", flush=True)
        return PublishResult(
            platform="视频号", video_path=video_path, title=display_title,
            success=True, status="skipped", message="去重跳过（已发布）",
        )

    if not COOKIE_FILE.exists():
        return PublishResult(
            platform="视频号", video_path=video_path, title=display_title,
            success=False, status="error", message="Cookie 不存在",
        )

    cookie_str = _cookie_str_from_file()

    capture = ApiCapture()
    ss_dir = Path("/tmp/channels_ss")
    if not _light_mode():
        ss_dir.mkdir(exist_ok=True)
    ss = lambda n: str(ss_dir / f"{Path(video_path).stem}_{n}.png")
    step_no = 0

    async def _step_checkpoint(name: str, ok: bool = True, detail: str = "") -> str:
        """每个动作完成后：截图 + 打印校验结果。"""
        nonlocal step_no
        step_no += 1
        tag = f"s{step_no:02d}_{name}"
        snap = ""
        if not _light_mode():
            snap = ss(tag)
            try:
                await page.screenshot(path=snap)
            except Exception:
                pass
        status = "通过" if ok else "失败"
        extra = f" | {detail}" if detail else ""
        print(f"  [检查-{step_no:02d}] {name}: {status}{extra}", flush=True)
        return snap

    async def _safe_shot(name: str) -> str:
        """容错截图：截图失败不应中断发布流程。"""
        if _light_mode():
            return ""
        snap = ss(name)
        try:
            await page.screenshot(path=snap)
        except Exception as e:
            print(f"  [截图容错] {name}: {str(e)[:80]}", flush=True)
        return snap

    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=headless,
                args=["--disable-blink-features=AutomationControlled"],
            )
            ctx = await browser.new_context(
                storage_state=str(COOKIE_FILE),
                user_agent=UA,
                viewport={"width": 1280, "height": 900},
                locale="zh-CN",
            )
            await ctx.add_init_script(
                "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
            )
            page = await ctx.new_page()
            capture.start_network_log(video_path, headless=headless, scheduled_time=scheduled_time)
            if capture.raw_events_file:
                print(f"  [网络抓包] {capture.raw_events_file}", flush=True)
            else:
                print("  [网络抓包] 轻量模式已关闭抓包落盘", flush=True)
            page.on("request", capture.handle_request)
            page.on("response", capture.handle)
            timing_state = await _setup_post_create_timing_route(page, scheduled_time)

            # --- Step 1: open publish page ---
            print("  [1] 打开发表页...", flush=True)
            await page.goto(
                "https://channels.weixin.qq.com/platform/post/create",
                timeout=30000,
                wait_until="domcontentloaded",
            )
            await asyncio.sleep(5)
            body_text = await page.evaluate("document.body.innerText")
            if "扫码" in body_text or "login" in page.url.lower():
                await _safe_shot("login")
                await browser.close()
                r = PublishResult(
                    platform="视频号", video_path=video_path, title=display_title,
                    success=False, status="error",
                    message="Cookie 已过期（需重新扫码登录）",
                    screenshot=ss("login"),
                    elapsed_sec=time.time() - t0,
                )
                print(f"  {r.log_line()}", flush=True)
                return r

            await _step_checkpoint("open_publish_page", ok=True, detail="已进入发表页")
            if await _dismiss_keep_edit_dialog(page):
                await asyncio.sleep(0.5)
                await _step_checkpoint("dismiss_keep_edit_dialog_after_open", ok=True, detail="已点击不保存并清除拦截弹窗")

            # --- Step 2: upload video ---
            print("  [2] 上传视频...", flush=True)
            await _set_video_file(page, video_path)
            print("  [2] 文件已选择", flush=True)
            await _step_checkpoint("video_file_selected", ok=True, detail="文件控件已写入")

            upload_ok = False
            for i in range(90):
                has_cover = await page.locator("text=封面预览").count() > 0
                has_delete = await page.locator("text=删除").count() > 0
                if has_cover or has_delete:
                    print(f"  [2] 上传完成 ({i * 2}s)", flush=True)
                    upload_ok = True
                    break
                await asyncio.sleep(2)

            if not upload_ok:
                await _safe_shot("upload_timeout")
                await browser.close()
                r = PublishResult(
                    platform="视频号", video_path=video_path, title=display_title,
                    success=False, status="error",
                    message="视频上传超时 (3 min)",
                    screenshot=ss("upload_timeout"),
                    elapsed_sec=time.time() - t0,
                )
                print(f"  {r.log_line()}", flush=True)
                return r

            await asyncio.sleep(3)
            await _step_checkpoint("video_uploaded", ok=True, detail="检测到封面/删除控件")

            # --- Step 3: fill description（与多平台 video_metadata 一致：标题+话题+#小程序 等）---
            from datetime import datetime as _dt2
            # 计划发布时间只走“计划发布控件+post_create 注入”，不再写入描述文本。
            full_desc = meta.description("视频号")[:500]
            missing = [f for f in REQUIRED_DESC_FRAGMENTS if f not in full_desc]
            if missing:
                print(f"  [3] ⚠ 描述缺固定话题片段: {missing}，已追加 DESC_SUFFIX", flush=True)
                full_desc = (full_desc.rstrip() + DESC_SUFFIX)[:500]
            print(f"  [3] 填写描述: {full_desc[:60]}...", flush=True)
            editor = page.locator('.input-editor').first
            if await editor.count() == 0:
                editor = page.locator('[data-placeholder="添加描述"]').first
            if await editor.count() == 0:
                for surface in _iter_surfaces(page):
                    editor = surface.locator('.input-editor').first
                    if await editor.count() > 0:
                        break
                    editor = surface.locator('[data-placeholder="添加描述"]').first
                    if await editor.count() > 0:
                        break

            if await editor.count() > 0:
                await editor.fill(full_desc)
                await asyncio.sleep(0.5)
                written = await editor.inner_text()
                if full_desc[:15] in written:
                    print(f"  [3] 描述已确认: {written[:50]}...", flush=True)
                else:
                    print(f"  [3] fill() 后验证失败, 尝试 click+type...", flush=True)
                    await editor.click()
                    await asyncio.sleep(0.3)
                    await page.keyboard.press("Meta+A")
                    await page.keyboard.press("Backspace")
                    await page.keyboard.type(full_desc, delay=8)
                    await asyncio.sleep(0.5)
                    written = await editor.inner_text()
            else:
                print("  [3] ⚠ 未找到描述编辑器 (.input-editor)", flush=True)

            await asyncio.sleep(1)
            desc_ok = False
            desc_detail = "未找到描述编辑器"
            if await editor.count() > 0:
                written2 = await editor.inner_text()
                desc_ok = full_desc[:15] in written2
                desc_detail = f"描述长度={len((written2 or '').strip())}"
            desc_snap = await _step_checkpoint("description_filled", ok=desc_ok, detail=desc_detail)
            if not desc_ok:
                await browser.close()
                return PublishResult(
                    platform="视频号",
                    video_path=video_path,
                    title=display_title,
                    success=False,
                    status="error",
                    message="描述写入校验失败（含定时文案）",
                    error_code="DESC_VERIFY_FAILED",
                    screenshot=desc_snap,
                    elapsed_sec=time.time() - t0,
                )

            await _fill_short_title(page, meta.title_short(20))

            # --- Step 3.2: 先截图并定位“声明原创”，再点击校验 ---
            if await _dismiss_keep_edit_dialog(page):
                await asyncio.sleep(0.5)
                await _step_checkpoint("dismiss_keep_edit_dialog_before_original", ok=True, detail="已点击不保存并清除拦截弹窗")
            original_target = await _locate_original_target(page)
            await _safe_shot("3a_before_original_click")
            if original_target:
                print(
                    f"  [3.2a] 声明原创位置: {original_target.get('rect')} | {original_target.get('text')}",
                    flush=True,
                )
            else:
                print("  [3.2a] 未预先定位到声明原创区域，继续按兜底策略查找", flush=True)

            # --- Step 3.2: 声明原创（必须校验到真勾选，禁止假成功）---
            original_ok = await _ensure_original_with_retries(page)
            if not original_ok:
                await _safe_shot("3_original_missing")
                await browser.close()
                return PublishResult(
                    platform="视频号",
                    video_path=video_path,
                    title=display_title,
                    success=False,
                    status="error",
                    message="未能勾选并校验「声明原创」，已拦截发布（请 --show 看页面或查截图）",
                    error_code="ORIGINAL_NOT_SET",
                    screenshot=ss("3_original_missing"),
                    elapsed_sec=time.time() - t0,
                )
            print("  [3.2] 已校验「声明原创」为勾选状态", flush=True)
            original_verified = await _is_original_verified(page)
            original_snap = await _step_checkpoint(
                "original_checked",
                ok=original_verified,
                detail="声明原创状态已回读"
            )
            if not original_verified:
                await browser.close()
                return PublishResult(
                    platform="视频号",
                    video_path=video_path,
                    title=display_title,
                    success=False,
                    status="error",
                    message="声明原创回读失败，已拦截",
                    error_code="ORIGINAL_VERIFY_FAILED",
                    screenshot=original_snap,
                    elapsed_sec=time.time() - t0,
                )

            # --- Step 3.5: scheduled publish (video channels = API injection first) ---
            if scheduled_time:
                if timing_state.get("enabled"):
                    print("  [3.5] 视频号定时采用 post_create 注入为主，页面控件仅做同步尝试", flush=True)
                    try:
                        # 调试：落盘“定时发表”相关可见输入/单选信息，便于定位页面结构变化
                        try:
                            dbg = await page.evaluate("""() => {
                                const vis = (el) => !!el && el.offsetParent !== null;
                                const radios = Array.from(document.querySelectorAll('input[type="radio"]')).map(r => ({
                                    checked: !!r.checked,
                                    name: r.name || '',
                                    value: r.value || '',
                                    text: (r.closest('label')?.innerText || r.parentElement?.innerText || '').slice(0,60),
                                }));
                                const inputs = Array.from(document.querySelectorAll('input')).filter(vis).map(i => ({
                                    type: i.type || '',
                                    placeholder: i.placeholder || '',
                                    name: i.name || '',
                                    className: (i.className || '').toString().slice(0,120),
                                    value: i.value || '',
                                }));
                                const body = (document.body.innerText || '').slice(0,4000);
                                return { radios, inputs, body };
                            }""")
                            Path('/tmp/channels_timing_debug.json').write_text(json.dumps(dbg, ensure_ascii=False, indent=2), encoding='utf-8')
                        except Exception:
                            pass
                        from schedule_helper import set_scheduled_time
                        sch_ok = await asyncio.wait_for(
                            set_scheduled_time(page, scheduled_time, "视频号"),
                            timeout=12,
                        )
                        if sch_ok:
                            print("  [3.5] 页面定时控件同步成功", flush=True)
                        else:
                            print("  [3.5] 页面定时控件未同步成功，继续以接口注入(effectiveTime)为准", flush=True)
                    except Exception as e:
                        print(f"  [3.5] 页面定时控件异常，拦截本条: {str(e)[:80]}", flush=True)
                        await browser.close()
                        return PublishResult(
                            platform="视频号",
                            video_path=video_path,
                            title=display_title,
                            success=False,
                            status="error",
                            message=f"页面定时控件异常: {str(e)[:80]}",
                            error_code="SCHEDULE_SET_ERROR",
                            elapsed_sec=time.time() - t0,
                        )
                else:
                    print("  [3.5] 未启用定时注入，终止本条发布（避免误发为立即）", flush=True)
                    await browser.close()
                    return PublishResult(
                        platform="视频号",
                        video_path=video_path,
                        title=display_title,
                        success=False,
                        status="error",
                        message="定时注入未启用，已拦截本条发布",
                        error_code="SCHEDULE_NOT_SET",
                        elapsed_sec=time.time() - t0,
                    )

            # --- Step 4: publish ---
            if await _dismiss_keep_edit_dialog(page):
                await asyncio.sleep(0.5)
                await _step_checkpoint("dismiss_keep_edit_dialog_before_publish", ok=True, detail="已点击不保存并清除拦截弹窗")
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(1)

            if not await _ensure_original_with_retries(page, rounds=2):
                await _safe_shot("4_original_lost_before_publish")
                await browser.close()
                return PublishResult(
                    platform="视频号",
                    video_path=video_path,
                    title=display_title,
                    success=False,
                    status="error",
                    message="发表前「声明原创」校验失败，已拦截",
                    error_code="ORIGINAL_NOT_SET",
                    screenshot=ss("4_original_lost_before_publish"),
                    elapsed_sec=time.time() - t0,
                )

            # --- Step 4: 先截图并定位“发表”，确认原创后再点发表 ---
            publish_target = await _locate_publish_target(page)
            await _safe_shot("4a_before_publish_click")
            if publish_target:
                print(
                    f"  [4a] 发表按钮位置: {publish_target.get('rect')} | {publish_target.get('text')}",
                    flush=True,
                )
            else:
                print("  [4a] 未预先定位到发表按钮，继续按按钮查找逻辑执行", flush=True)

            print("  [4] 点击发表...", flush=True)
            await _dismiss_blocking_overlays(page)
            pub_btn = page.locator('button:has-text("发表")').first
            if await pub_btn.count() > 0:
                try:
                    await pub_btn.click(timeout=3000)
                except Exception:
                    await _dismiss_blocking_overlays(page)
                    await pub_btn.click(force=True, timeout=4000)
            else:
                await page.evaluate(
                    """() => {
                    const b = [...document.querySelectorAll('button')];
                    const p = b.find(e => e.textContent.includes('发表'));
                    if (p) p.click();
                }"""
                )
            await _step_checkpoint("publish_clicked", ok=True, detail="已触发表发表动作")

            # Wait for possible dialog（主页面 + 子 frame）
            for _ in range(10):
                await asyncio.sleep(1)
                await _dismiss_keep_edit_dialog(page)
                clicked_origin = False
                for surface in _iter_surfaces(page):
                    origin_btn = surface.locator('button:has-text("声明原创")').first
                    if await origin_btn.count() > 0:
                        await _safe_shot("4b_before_original_modal_confirm")
                        modal_checkbox_ok = await _ensure_original_modal_checkbox(page)
                        if modal_checkbox_ok:
                            print("  [4b] 已检查并勾选原创弹窗复选框", flush=True)
                        else:
                            print("  [4b] 原创弹窗复选框未确认勾选，继续尝试点击按钮", flush=True)
                        print("  [4b] 原创弹窗 → 声明原创并发表", flush=True)
                        try:
                            await origin_btn.click(force=True, timeout=3000)
                        except Exception:
                            try:
                                await surface.evaluate(
                                    """() => {
                                    const btns = [...document.querySelectorAll('button')];
                                    const b = btns.find(e => (e.textContent||'').includes('声明原创'));
                                    if (b) b.click();
                                }"""
                                )
                            except Exception:
                                pass
                        clicked_origin = True
                        await _step_checkpoint(
                            "original_modal_confirmed",
                            ok=modal_checkbox_ok,
                            detail="弹窗内已执行勾选+确认"
                        )
                        # 新版页面有时“声明原创”只关闭弹窗，不会立刻触发发布。
                        # 这里强制再点一次“发表”，确保真正触发 post_create。
                        await asyncio.sleep(0.6)
                        pub_btn2 = page.locator('button:has-text("发表")').first
                        if await pub_btn2.count() > 0:
                            try:
                                await pub_btn2.click(timeout=2500)
                            except Exception:
                                try:
                                    await pub_btn2.click(force=True, timeout=3500)
                                except Exception:
                                    pass
                        else:
                            try:
                                await page.evaluate(
                                    """() => {
                                    const btns = [...document.querySelectorAll('button')];
                                    const b = btns.find(e => (e.textContent||'').trim().includes('发表'));
                                    if (b) b.click();
                                }"""
                                )
                            except Exception:
                                pass
                        await _step_checkpoint(
                            "publish_reclick_after_original_confirm",
                            ok=True,
                            detail="声明原创后再次触发表发表"
                        )
                        break
                if clicked_origin:
                    break
                dp = page.locator('button:has-text("直接发表")').first
                if await dp.count() > 0:
                    print("  [4b] 检测到“直接发表”弹窗，按原创强制规则拦截本条", flush=True)
                    await _safe_shot("4_direct_publish_blocked")
                    await browser.close()
                    return PublishResult(
                        platform="视频号",
                        video_path=video_path,
                        title=display_title,
                        success=False,
                        status="error",
                        message="弹窗仅出现“直接发表”，已拦截避免未声明原创",
                        error_code="ORIGINAL_CONFIRM_REQUIRED",
                        screenshot=ss("4_direct_publish_blocked"),
                        elapsed_sec=time.time() - t0,
                    )

            # Wait for publish to process
            await asyncio.sleep(8)
            # 若仍未出现发布接口回执，执行一次自愈补点击，避免空点导致一直重试。
            if len(capture.publish_responses) == 0:
                healed = False
                if await _dismiss_keep_edit_dialog(page):
                    healed = True
                if await _click_visible_button_by_text(page, "声明原创"):
                    healed = True
                await asyncio.sleep(0.5)
                if await _click_visible_button_by_text(page, "发表"):
                    healed = True
                if healed:
                    await _step_checkpoint(
                        "publish_self_heal_retry_click",
                        ok=True,
                        detail="未捕获发布回执，已执行补点击自愈"
                    )
                    await asyncio.sleep(4)
            await _step_checkpoint("after_publish_wait", ok=True, detail="已等待发表结果回流")

            # 定时强校验：必须命中 post_create 注入，且请求体出现定时字段，否则判失败。
            if scheduled_time and timing_state.get("enabled"):
                injected_hits = int(timing_state.get("injected_hits") or 0)
                payload_hits = int(timing_state.get("payload_hits") or 0)
                if injected_hits <= 0:
                    await browser.close()
                    return PublishResult(
                        platform="视频号",
                        video_path=video_path,
                        title=display_title,
                        success=False,
                        status="error",
                        message="定时注入未命中 post_create，请重试本条",
                        error_code="SCHEDULE_INJECT_MISS",
                        screenshot=ss("4_after_publish"),
                        elapsed_sec=time.time() - t0,
                    )
                if payload_hits <= 0:
                    await browser.close()
                    return PublishResult(
                        platform="视频号",
                        video_path=video_path,
                        title=display_title,
                        success=False,
                        status="error",
                        message="post_create 请求体未带定时字段（postTimingInfo/postTime），已拦截",
                        error_code="SCHEDULE_PAYLOAD_MISSING",
                        screenshot=ss("4_after_publish"),
                        elapsed_sec=time.time() - t0,
                    )

            # --- Step 5: analyse API responses ---
            print(f"  [API] 捕获 {len(capture.all_calls)} 个调用", flush=True)
            api_ok: bool | None = None
            api_msg = ""
            for call in capture.publish_responses:
                body = call.get("body", {})
                code = body.get("errCode", body.get("errcode", body.get("ret", -999)))
                print(f"    PUBLISH → status={call['status']} errCode={code}", flush=True)
                if code == 0 or (isinstance(code, int) and code == 200):
                    api_ok = True
                else:
                    api_ok = False
                    api_msg = json.dumps(body, ensure_ascii=False)[:120]

            if api_ok is None:
                url_now = page.url
                text_now = await page.evaluate("document.body.innerText")
                if "/post/list" in url_now or "内容管理" in text_now:
                    api_ok = True
                    api_msg = "页面已跳转到内容管理"
                else:
                    api_msg = f"未捕获publish响应 (url={url_now[:60]})"

            if scheduled_time:
                ts_inj = _to_schedule_ts(scheduled_time)
                from datetime import datetime as _dt3
                print(
                    f"  [API] 定时目标(注入): {_dt3.fromtimestamp(ts_inj).strftime('%Y-%m-%d %H:%M')}",
                    flush=True,
                )
                print(
                    f"  [API] 定时注入命中次数: {int(timing_state.get('injected_hits') or 0)}",
                    flush=True,
                )
                print(
                    f"  [API] 定时字段写入命中: {int(timing_state.get('payload_hits') or 0)}",
                    flush=True,
                )

            # --- Step 6: 先落盘会话并关闭浏览器，再拉 post_list（避免与 Playwright 并发拖死）---
            kw_for_check = _title_keywords_for_list_check(display_title, video_path)
            await _safe_shot("5_before_close")
            await ctx.storage_state(path=str(COOKIE_FILE))
            await browser.close()

            cookie_str = _cookie_str_from_file()
            # publish 回执兜底：有些场景抓不到 post_create，但实际已入队。
            # 先做一轮短列表轮询确认，避免第1条无效重试。
            if api_ok is None and cookie_str:
                print("  [5a] 未捕获 publish 回执，执行短列表轮询兜底确认...", flush=True)
                fb_ok, fb_msg = await _poll_post_list_until_visible(
                    cookie_str,
                    kw_for_check,
                    list(REQUIRED_DESC_FRAGMENTS),
                    timeout_sec=45,
                    interval_sec=5,
                )
                if fb_ok:
                    api_ok = True
                    api_msg = f"fallback列表确认: {fb_msg}"
                    print(f"  [5a] 兜底命中：{fb_msg}", flush=True)
                else:
                    api_msg = f"{api_msg}; fallback未命中: {fb_msg}" if api_msg else f"fallback未命中: {fb_msg}"
                    print(f"  [5a] 兜底未命中：{fb_msg}", flush=True)

            api_list_ok, api_list_msg = False, "无Cookie"
            if skip_list_verify and api_ok is True:
                api_list_ok, api_list_msg = True, "已跳过列表API核验（仅以PUBLISH接口成功为准）"
                print("  [5b] 跳过列表API核验（--skip-list-verify）", flush=True)
            else:
                print("  [5b] 列表API轮询（按标题关键词+固定话题）...", flush=True)
                print(f"  [5b] 关键词候选: {kw_for_check}", flush=True)
                req_frags = list(REQUIRED_DESC_FRAGMENTS)
                if cookie_str:
                    api_list_ok, api_list_msg = await _poll_post_list_until_visible(
                        cookie_str,
                        kw_for_check,
                        req_frags,
                        timeout_sec=240,
                        interval_sec=5,
                    )

            # 即便跳过完整列表核验，也做“最近页红字快速探测”。
            red_fail = False
            red_msg = ""
            if cookie_str:
                req_frags_fast = list(REQUIRED_DESC_FRAGMENTS)
                red_fail, red_msg = await asyncio.to_thread(
                    _quick_check_recent_failure, cookie_str, kw_for_check, req_frags_fast
                )
                if red_fail:
                    print(f"  [5c] 红字探测命中: {red_msg}", flush=True)
            print(f"  [5b] {api_list_msg}", flush=True)

            elapsed = time.time() - t0

            if api_ok is not True:
                success, status = False, "error"
                msg = f"发布失败 — API: {api_msg}; 列表API: {api_list_msg}"
            elif red_fail:
                success, status = False, "error"
                msg = f"检测到红字失败态: {red_msg}"
            elif not api_list_ok:
                success, status = False, "error"
                msg = f"API成功但列表API未核验通过: {api_list_msg}"
            else:
                success, status, msg = (
                    True,
                    "published",
                    f"✓ API+列表API ({api_list_msg})",
                )

            result = PublishResult(
                platform="视频号",
                video_path=video_path,
                title=display_title,
                success=success,
                status=status,
                message=msg,
                screenshot=ss("5_before_close"),
                elapsed_sec=elapsed,
            )
            print(f"  {result.log_line()}", flush=True)
            return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        return PublishResult(
            platform="视频号",
            video_path=video_path,
            title=display_title,
            success=False,
            status="error",
            message=f"异常: {str(e)[:80]}",
            elapsed_sec=time.time() - t0,
        )


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
async def main():
    from publish_result import print_summary, save_results
    from cookie_manager import check_cookie_valid

    print("=== 账号预检 ===", flush=True)
    if not COOKIE_FILE.exists():
        print("[✗] Cookie 文件不存在，请先运行 channels_login.py 扫码", flush=True)
        return 1
    import os, time as _t
    age_h = (_t.time() - os.path.getmtime(str(COOKIE_FILE))) / 3600
    print(f"  视频号: Cookie 文件存在 (更新于 {age_h:.1f}h 前)", flush=True)
    if age_h > 48:
        print("[⚠] Cookie 超过 48h，可能已过期", flush=True)
    print()

    videos = sorted(VIDEO_DIR.glob("*.mp4"))
    if not videos:
        print("[✗] 未找到视频")
        return 1
    print(f"共 {len(videos)} 条视频\n")

    results = []
    for i, vp in enumerate(videos):
        t = VideoMeta.from_filename(vp.name).title("视频号")
        # 默认无头 Playwright；需看浏览器时改 headless=False
        r = await publish_one(str(vp), t, i + 1, len(videos), headless=True)
        results.append(r)
        # 即时保存（防止中途崩溃丢失记录）
        if r.status != "skipped":
            save_results([r])
        if i < len(videos) - 1:
            await asyncio.sleep(8)

    actual = [r for r in results if r.status != "skipped"]
    print_summary(actual)
    ok = sum(1 for r in actual if r.success)
    print(
        f"\n=== 本批结果（channels_publish 直连）=== 条数={len(actual)} 成功={ok} 失败={len(actual) - ok}",
        flush=True,
    )
    return 0 if ok == len(actual) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
