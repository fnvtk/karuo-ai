#!/usr/bin/env python3
"""视频号登录 v7 — 优先 Cursor 内置 Simple Browser 扫码；会话落盘优先 CDP 附着 Cursor，失败再回退 Playwright。"""
import asyncio
import json
import os
import shutil
import subprocess
import sys
import urllib.parse
from pathlib import Path

from playwright.async_api import async_playwright

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "channels_storage_state.json"
TOKEN_FILE = SCRIPT_DIR / "channels_token.json"
LOGIN_URL = "https://channels.weixin.qq.com/login"
QR_SCREENSHOT = Path("/tmp/channels_qr.png")

DEFAULT_CDP = os.environ.get("CHANNELS_CDP_URL", "http://127.0.0.1:9223")

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

REQUIRED_LS_KEYS = [
    "finder_raw", "finder_username", "finder_uin",
    "finder_login_token", "finder_external_key",
]


def open_cursor_simple_browser(url: str) -> None:
    """在 Cursor 编辑器内打开 Simple Browser（不唤起系统默认外部浏览器）。"""
    enc = urllib.parse.quote(url, safe="")
    deeplink = f"cursor://vscode.simple-browser/show?url={enc}"
    try:
        if sys.platform == "darwin":
            subprocess.run(["open", deeplink], check=False)
        elif sys.platform == "win32":
            os.startfile(deeplink)  # type: ignore[attr-defined]
        else:
            subprocess.run(["xdg-open", deeplink], check=False)
        print(f"[✓] 已在 Cursor 内请求打开 Simple Browser（若未弹出：Cmd/Ctrl+Shift+P → Simple Browser: Show → 粘贴 URL）", flush=True)
        print(f"    URL: {url}", flush=True)
    except Exception as e:
        print(f"[!] 打开 Cursor Simple Browser 失败: {e}", flush=True)
        print(f"    请手动在 Cursor 命令面板执行 Simple Browser: Show，粘贴: {url}", flush=True)


def _sync_to_central_cookie_store() -> None:
    try:
        _central = SCRIPT_DIR.parent.parent / "多平台分发" / "cookies" / "视频号_cookies.json"
        _central.parent.mkdir(parents=True, exist_ok=True)
        if COOKIE_FILE.exists():
            shutil.copy2(COOKIE_FILE, _central)
            print(f"[✓] 已同步中央 Cookie: {_central}", flush=True)
    except Exception as e:
        print(f"[!] 同步中央 Cookie 失败: {e}", flush=True)


async def extract_ls(page, keys):
    try:
        return await page.evaluate("""(keys) => {
            const out = {};
            for (const k of keys) {
                const v = localStorage.getItem(k);
                if (v) out[k] = v;
            }
            return out;
        }""", keys)
    except Exception as e:
        print(f"  [!] localStorage 提取异常: {e}", flush=True)
        return {}


async def wait_until_logged_in(page, label: str = "") -> bool:
    prefix = f"[{label}] " if label else ""
    for i in range(120):
        await asyncio.sleep(3)
        try:
            url = page.url
        except Exception:
            break
        if "platform" in url and "login" not in url:
            print(f"{prefix}[✓] 登录成功，已跳转到: {url[:100]}", flush=True)
            return True
        if i % 10 == 0:
            print(f"{prefix}  等待扫码并跳转中... ({i * 3}s)", flush=True)
    print(f"{prefix}[✗] 6 分钟超时。", flush=True)
    return False


async def save_session_from_context(context, page, ls_vals: dict) -> bool:
    try:
        state = await context.storage_state()
        # 合并我们显式抓到的 finder keys（防止 storage_state 未含 localStorage）
        origins = list(state.get("origins") or [])
        merged_items = {}
        for origin_block in origins:
            if origin_block.get("origin") == "https://channels.weixin.qq.com":
                for it in origin_block.get("localStorage") or []:
                    merged_items[it["name"]] = it.get("value", "")
        for k, v in ls_vals.items():
            if v:
                merged_items[k] = str(v)
        new_ls = [{"name": k, "value": v} for k, v in merged_items.items()]
        replaced = False
        for ob in origins:
            if ob.get("origin") == "https://channels.weixin.qq.com":
                ob["localStorage"] = new_ls
                replaced = True
                break
        if not replaced and new_ls:
            origins.append({"origin": "https://channels.weixin.qq.com", "localStorage": new_ls})
        state["origins"] = origins
        COOKIE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2))
        _sync_to_central_cookie_store()

        cookies = await context.cookies()
        cookie_dict = {c["name"]: c["value"] for c in cookies}
        token_data = {
            "sessionid": cookie_dict.get("sessionid", ""),
            "wxuin": cookie_dict.get("wxuin", ""),
            "cookie_str": "; ".join(f'{c["name"]}={c["value"]}' for c in cookies),
            "finder_raw": ls_vals.get("finder_raw", ""),
            "finder_username": ls_vals.get("finder_username", ""),
            "finder_uin": ls_vals.get("finder_uin", ""),
            "finder_login_token": ls_vals.get("finder_login_token", ""),
            "url": page.url,
        }
        TOKEN_FILE.write_text(json.dumps(token_data, ensure_ascii=False, indent=2))
        return bool(ls_vals.get("finder_raw"))
    except Exception as e:
        print(f"[!] 保存会话异常: {e}", flush=True)
        return False


async def try_capture_via_cdp(pw, cdp_url: str) -> bool:
    """附着已带 --remote-debugging-port 的 Cursor/Chromium，从 Simple Browser 所在上下文导出。"""
    try:
        browser = await pw.chromium.connect_over_cdp(cdp_url, timeout=8000)
    except Exception as e:
        print(f"[i] CDP 未连接 ({cdp_url}): {e}", flush=True)
        return False

    target_page = None
    for ctx in browser.contexts:
        for page in ctx.pages:
            u = page.url or ""
            if "channels.weixin.qq.com" in u:
                target_page = page
                break
        if target_page:
            break

    if not target_page:
        print("[!] CDP 已连接但未找到 channels.weixin.qq.com 页面（请确认已在 Cursor Simple Browser 打开视频号助手）", flush=True)
        await browser.close()
        return False

    ctx = target_page.context
    print("[i] 已附着 Cursor/内置浏览器上下文，等待进入内容管理页…", flush=True)
    for _ in range(120):
        try:
            u = target_page.url or ""
            if "platform" in u and "login" not in u:
                break
        except Exception:
            pass
        await asyncio.sleep(3)

    print("[i] 等待 rawKeyBuff / localStorage 写入…", flush=True)

    ls_vals = {}
    for attempt in range(120):
        ls_vals = await extract_ls(target_page, REQUIRED_LS_KEYS)
        if ls_vals.get("finder_raw"):
            print(f"[✓] rawKeyBuff 已就绪 (CDP, {attempt}s)", flush=True)
            break
        try:
            u = target_page.url or ""
            if "login" in u and attempt > 20:
                pass
        except Exception:
            pass
        if attempt % 15 == 0 and attempt > 0:
            print(f"  等待 localStorage… ({attempt}s)", flush=True)
        await asyncio.sleep(1)

    if not ls_vals.get("finder_raw"):
        try:
            await target_page.goto(
                "https://channels.weixin.qq.com/platform/post/list",
                timeout=20000,
                wait_until="domcontentloaded",
            )
            await asyncio.sleep(8)
            for _ in range(40):
                ls_vals = await extract_ls(target_page, REQUIRED_LS_KEYS)
                if ls_vals.get("finder_raw"):
                    print("[✓] 导航后 rawKeyBuff 已就绪 (CDP)", flush=True)
                    break
                await asyncio.sleep(1)
        except Exception as e:
            print(f"[!] CDP 导航补全失败: {e}", flush=True)

    ok = await save_session_from_context(ctx, target_page, ls_vals)
    await browser.close()
    return ok


async def capture_via_playwright_external() -> bool:
    """回退：独立 Chromium 窗口（仅当 CDP 不可用时）。"""
    print("\n[i] 未使用 CDP → 将打开本机 Chromium 窗口仅用于写入 Cookie 文件（可扫码后尽快关闭）\n", flush=True)
    ls_vals = {}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=False)
        context = await browser.new_context(user_agent=UA, viewport={"width": 1280, "height": 720})
        await context.add_init_script(
            "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
        )
        page = await context.new_page()
        await page.goto(LOGIN_URL, timeout=60000)
        await asyncio.sleep(3)
        await page.screenshot(path=str(QR_SCREENSHOT))
        print(f"[QR] 二维码截图: {QR_SCREENSHOT}", flush=True)

        if not await wait_until_logged_in(page, "Playwright"):
            await browser.close()
            return False

        print("[i] 等待平台 JS 加载完成...", flush=True)
        await asyncio.sleep(10)

        for attempt in range(60):
            ls_vals = await extract_ls(page, REQUIRED_LS_KEYS)
            if ls_vals.get("finder_raw"):
                print(f"[✓] rawKeyBuff 已就绪 (等待 {attempt}s)", flush=True)
                break
            await asyncio.sleep(1)
            if attempt % 15 == 14:
                print(f"  等待 localStorage 写入... ({attempt + 1}s)", flush=True)

        if not ls_vals.get("finder_raw"):
            print("[i] rawKeyBuff 未出现，尝试访问内容列表页...", flush=True)
            try:
                await page.goto(
                    "https://channels.weixin.qq.com/platform/post/list",
                    timeout=15000,
                    wait_until="domcontentloaded",
                )
                await asyncio.sleep(8)
                for _ in range(30):
                    ls_vals = await extract_ls(page, REQUIRED_LS_KEYS)
                    if ls_vals.get("finder_raw"):
                        print("[✓] 导航后 rawKeyBuff 已就绪", flush=True)
                        break
                    await asyncio.sleep(1)
            except Exception as e:
                print(f"[!] 导航异常: {e}", flush=True)

        print("\n[i] localStorage 提取结果:", flush=True)
        for k in REQUIRED_LS_KEYS:
            v = ls_vals.get(k, "")
            status = "✓" if v else "✗"
            display = f"{v[:60]}..." if len(v) > 60 else (v or "(空)")
            print(f"    {status} {k}: {display}", flush=True)

        ok = await save_session_from_context(context, page, ls_vals)
        await browser.close()
        return ok


async def main() -> int:
    force_pw = "--playwright-only" in sys.argv or os.environ.get("CHANNELS_LOGIN_PLAYWRIGHT_ONLY")
    skip_cursor_tab = "--no-cursor-tab" in sys.argv
    cdp_url = DEFAULT_CDP

    if not force_pw:
        if not skip_cursor_tab:
            print("→ 优先在 Cursor 内置 Simple Browser 打开视频号登录页（不打开系统默认浏览器）。\n", flush=True)
            open_cursor_simple_browser(LOGIN_URL)
        print(
            "\n请在上一步打开的 **Cursor 编辑器内** Simple Browser 中用微信扫码并进入「内容管理」。\n"
            f"若要让脚本**不弹额外 Chromium**：请用带远程调试端口的方式启动 Cursor，例如 macOS：\n"
            f"  /Applications/Cursor.app/Contents/MacOS/Cursor --remote-debugging-port=9223\n"
            f"然后本脚本会通过 CDP ({cdp_url}) 读取会话并写入 Cookie。\n",
            flush=True,
        )
        if sys.stdin.isatty():
            try:
                input("登录完成并进入内容管理后，按回车继续拉取 Cookie…\n")
            except EOFError:
                pass
        else:
            print("[i] 非交互终端：将轮询 CDP 最多约 6 分钟…", flush=True)
            await asyncio.sleep(5)

    async with async_playwright() as pw:
        if not force_pw:
            if await try_capture_via_cdp(pw, cdp_url):
                print(f"\n[✓] Cookie 已保存: {COOKIE_FILE}", flush=True)
                return 0

        ok = await capture_via_playwright_external()
        print(f"\n[{'✓' if ok else '✗'}] Cookie 保存: {COOKIE_FILE}", flush=True)
        return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
