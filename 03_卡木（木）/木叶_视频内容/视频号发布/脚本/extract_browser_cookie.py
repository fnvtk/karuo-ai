#!/usr/bin/env python3
"""从系统浏览器提取 channels.weixin.qq.com 的 Cookie → 写入 Playwright storage_state 格式"""
import json
import sys
from pathlib import Path

COOKIE_FILE = Path(__file__).parent / "channels_storage_state.json"
DOMAIN = "channels.weixin.qq.com"


def try_chrome():
    try:
        import browser_cookie3
        cj = browser_cookie3.chrome(domain_name=DOMAIN)
        return list(cj)
    except Exception as e:
        print(f"Chrome: {e}", flush=True)
        return []


def try_safari():
    try:
        import browser_cookie3
        cj = browser_cookie3.safari(domain_name=DOMAIN)
        return list(cj)
    except Exception as e:
        print(f"Safari: {e}", flush=True)
        return []


def try_edge():
    try:
        import browser_cookie3
        cj = browser_cookie3.edge(domain_name=DOMAIN)
        return list(cj)
    except Exception as e:
        print(f"Edge: {e}", flush=True)
        return []


def to_playwright_state(cookies):
    pw_cookies = []
    for c in cookies:
        pw_cookies.append({
            "name": c.name,
            "value": c.value,
            "domain": c.domain or DOMAIN,
            "path": c.path or "/",
            "expires": c.expires or -1,
            "httpOnly": bool(getattr(c, "_rest", {}).get("HttpOnly", False)),
            "secure": c.secure,
            "sameSite": "None",
        })
    return {"cookies": pw_cookies, "origins": []}


def main():
    print("尝试从系统浏览器提取 Cookie...", flush=True)

    all_cookies = []
    for name, fn in [("Chrome", try_chrome), ("Safari", try_safari), ("Edge", try_edge)]:
        cookies = fn()
        if cookies:
            print(f"  {name}: 找到 {len(cookies)} 个 Cookie", flush=True)
            for c in cookies:
                print(f"    {c.name} = {c.value[:20]}...", flush=True)
            all_cookies.extend(cookies)
            break

    if not all_cookies:
        print("[✗] 未能从任何浏览器提取到 Cookie。", flush=True)
        print("    请确认已在浏览器中登录 channels.weixin.qq.com", flush=True)
        return 1

    has_session = any(c.name == "sessionid" for c in all_cookies)
    if not has_session:
        print("[⚠] 未找到 sessionid Cookie，可能未登录或登录过期", flush=True)
        print(f"    找到的 Cookie: {[c.name for c in all_cookies]}", flush=True)
        return 1

    state = to_playwright_state(all_cookies)
    COOKIE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2))

    print(f"\n[✓] Cookie 已保存: {COOKIE_FILE}", flush=True)
    print(f"    Cookie 数量: {len(state['cookies'])}", flush=True)
    session = [c for c in all_cookies if c.name == "sessionid"]
    if session:
        import datetime
        exp = datetime.datetime.fromtimestamp(session[0].expires) if session[0].expires else "未知"
        print(f"    sessionid 过期: {exp}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
