#!/usr/bin/env python3
"""
全自动：从本机浏览器读取飞书 Cookie，写入 cookie_minutes.txt，并执行妙记导出。
流程：1) 用系统默认浏览器打开妙记页 2) 等待登录 3) 从 Chrome/Safari 读取 Cookie 4) 验证无 401 后导出。
"""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
COOKIE_FILE = SCRIPT_DIR / "cookie_minutes.txt"
LIST_URL = "https://cunkebao.feishu.cn/minutes/api/space/list"
EXPORT_URL = "https://cunkebao.feishu.cn/minutes/api/export"
MINUTES_URL = "https://cunkebao.feishu.cn/minutes/home"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
TEST_TOKEN = "obcnyg5nj2l8q281v32de6qz"  # 104场，用于验证


def verify_cookie(cookie: str) -> bool:
    """验证 Cookie 能否成功调用导出接口（无 401）。"""
    try:
        import requests
        h = {
            "User-Agent": USER_AGENT,
            "cookie": cookie,
            "referer": "https://cunkebao.feishu.cn/minutes/",
            "origin": "https://cunkebao.feishu.cn",
            "content-type": "application/x-www-form-urlencoded",
        }
        # 先调 list 激活会话，再 export（试 cunkebao 和 meetings 两域）
        session = requests.Session()
        session.headers.update(h)
        session.get(f"{LIST_URL}?size=5&space_name=1", timeout=10)
        time.sleep(0.5)
        for export_base in (EXPORT_URL, "https://meetings.feishu.cn/minutes/api/export"):
            ref = "https://meetings.feishu.cn/minutes/" if "meetings" in export_base else "https://cunkebao.feishu.cn/minutes/"
            h["referer"] = ref
            r = session.post(
                export_base,
                params={"object_token": TEST_TOKEN, "add_speaker": "true", "add_timestamp": "false", "format": 2},
                headers=h,
                timeout=15,
            )
            if r.status_code != 200:
                continue
            text = (r.text or "").strip()
            if len(text) < 200:
                continue
            if text.startswith("{"):
                try:
                    j = r.json()
                    if j.get("code") not in (0, None) or "please log in" in (j.get("msg") or "").lower():
                        continue
                    return True
                except Exception:
                    continue
            return True  # 纯文本正文 = 成功
        return False
    except Exception:
        return False


def collect_cookie_via_default_browser() -> str:
    """用 Chrome 打开妙记页，等待登录后从 Chrome 读取 Cookie。"""
    for app in ["Google Chrome", "Chromium", "Safari"]:
        try:
            subprocess.run(["open", "-a", app, MINUTES_URL], capture_output=True, timeout=5)
            print(f"   已用 {app} 打开妙记页。")
            break
        except Exception:
            continue
    print("   ⏳ 请在此浏览器中完成登录（看到妙记列表即可），等待 90 秒…")
    time.sleep(90)
    return collect_cookie_from_browsers()


SOUL_ITEMS = [
    (100, "soul 派对 100场 20260214", "obcnu1rfr452595c6l51a7e1", "20260214"),
    (104, "soul 派对 104场 20260219", "obcnyg5nj2l8q281v32de6qz", "20260219"),
    (105, "soul 派对 105场 20260220", "obcny5sux74w123q3pmt8xg7", "20260220"),
]
OUT_DIR = Path("/Users/karuo/Documents/聊天记录/soul")


def run_playwright_page_export(from_num: int, to_num: int) -> int:
    """在 Playwright 页面内直接请求导出，绕过 Cookie，保证成功。"""
    import re
    items = [(n, t, tok, d) for n, t, tok, d in SOUL_ITEMS if from_num <= n <= to_num]
    if not items:
        return 0
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("❌ 需安装 playwright: pip install playwright && playwright install chromium", file=sys.stderr)
        return 1
    import tempfile
    ud = tempfile.mkdtemp(prefix="feishu_export_")
    try:
        with sync_playwright() as p:
            ctx = p.chromium.launch_persistent_context(ud, headless=False, timeout=15000)
            pg = ctx.pages[0] if ctx.pages else ctx.new_page()
            pg.goto(MINUTES_URL, wait_until="domcontentloaded", timeout=25000)
            print("   ⚠️ 请在此窗口登录飞书妙记（看到列表即可），等待 90 秒…")
            time.sleep(90)
            saved = 0
            for num, topic, token, date_str in items:
                print(f"   导出 {topic}…")
                try:
                    js = f"""
                    async () => {{
                        const r = await fetch('https://cunkebao.feishu.cn/minutes/api/export?object_token={token}&add_speaker=true&add_timestamp=false&format=2', {{method:'POST', credentials:'include'}});
                        return await r.text();
                    }}
                    """
                    text = pg.evaluate(js)
                    if not text or len(str(text)) < 500 or "please log in" in str(text).lower():
                        print(f"   ❌ 失败: {topic}")
                        continue
                    safe = re.sub(r'[\\/*?:"<>|]', "_", topic)
                    path = OUT_DIR / f"{safe}_{date_str}.txt"
                    OUT_DIR.mkdir(parents=True, exist_ok=True)
                    path.write_text(f"日期: {date_str}\n标题: {topic}\n\n文字记录:\n\n{text.strip()}", encoding="utf-8")
                    print(f"   ✅ {topic} -> {path.name}")
                    saved += 1
                except Exception as e:
                    print(f"   ❌ {topic}: {e}")
                time.sleep(1)
            ctx.close()
        print(f"✅ 页面内导出完成 {saved}/{len(items)} 场，目录: {OUT_DIR}")
        return 0
    finally:
        import shutil
        shutil.rmtree(ud, ignore_errors=True)


def collect_cookie_via_playwright_standalone() -> str:
    """Playwright 启动独立 Chromium，用户登录后抓 Cookie。"""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return ""
    import tempfile
    ud = tempfile.mkdtemp(prefix="feishu_cookie_")
    cookie_str = ""
    try:
        with sync_playwright() as p:
            ctx = p.chromium.launch_persistent_context(
                user_data_dir=ud,
                headless=False,
                args=["--start-maximized"],
                viewport={"width": 1280, "height": 900},
                timeout=15000,
            )
            try:
                pg = ctx.pages[0] if ctx.pages else ctx.new_page()
                pg.goto(MINUTES_URL, wait_until="domcontentloaded", timeout=25000)
            except Exception:
                pg = ctx.new_page() if not ctx.pages else ctx.pages[0]
                try:
                    pg.goto(MINUTES_URL, wait_until="domcontentloaded", timeout=25000)
                except Exception:
                    pass
            print("   ⚠️ 请在此窗口完成飞书妙记登录（输入账号密码直到看到列表），等待 120 秒…")
            time.sleep(120)
            cookies = ctx.cookies("https://cunkebao.feishu.cn")
            if not cookies:
                cookies = ctx.cookies()
            ctx.close()
            seen = set()
            parts = []
            for c in cookies:
                if c["name"] not in seen:
                    seen.add(c["name"])
                    parts.append(f"{c['name']}={c.get('value','')}")
            cookie_str = "; ".join(parts)
    finally:
        import shutil
        try:
            shutil.rmtree(ud, ignore_errors=True)
        except Exception:
            pass
    return cookie_str if len(cookie_str) > 200 else ""


def collect_cookie_from_browsers() -> str:
    """从本机所有浏览器收集飞书相关 Cookie，合并为最完整的字符串。"""
    cookies_by_name = {}
    domains = ("cunkebao.feishu.cn", "feishu.cn", ".feishu.cn")
    loaders = []
    
    try:
        import browser_cookie3
        loaders = [
            ("Safari", browser_cookie3.safari),
            ("Chrome", browser_cookie3.chrome),
            ("Chromium", browser_cookie3.chromium),
            ("Firefox", browser_cookie3.firefox),
            ("Edge", browser_cookie3.edge),
        ]
    except ImportError:
        print("提示: pip install browser_cookie3 可自动读取浏览器 Cookie", file=sys.stderr)
        return ""

    for domain in domains:
        for name, loader in loaders:
            try:
                cj = loader(domain_name=domain)
                for c in cj:
                    cookies_by_name[c.name] = c.value
            except Exception:
                continue

    if not cookies_by_name:
        return ""
    return "; ".join(f"{k}={v}" for k, v in cookies_by_name.items())


def fetch_csrf_from_list_api(cookie: str) -> str:
    """访问妙记 list API，从响应中获取并合并 bv_csrf_token（若存在）。"""
    try:
        import requests
        session = requests.Session()
        session.headers.update({
            "User-Agent": USER_AGENT,
            "cookie": cookie,
            "referer": "https://cunkebao.feishu.cn/minutes/",
        })
        r = session.get(f"{LIST_URL}?size=5&space_name=1", timeout=15)
        # 从响应头获取新设置的 cookie
        for c in session.cookies:
            if "csrf" in c.name.lower() or "bv" in c.name.lower():
                return f"{cookie}; {c.name}={c.value}"
        # 若 API 返回 data 中含 token 也尝试
        if r.status_code == 200 and r.headers.get("content-type", "").startswith("application/json"):
            j = r.json()
            if j.get("code") == 0:
                token = (j.get("data") or {}).get("csrf_token") or (j.get("data") or {}).get("bv_csrf_token")
                if token:
                    return f"{cookie}; bv_csrf_token={token}"
    except Exception:
        pass
    return cookie


def main() -> int:
    parser = __import__("argparse").ArgumentParser()
    parser.add_argument("--from", "-f", type=int, default=100, dest="from_num")
    parser.add_argument("--to", "-t", type=int, default=105, dest="to_num")
    args = parser.parse_args()

    print("🔄 获取飞书妙记 Cookie（确保导出无 401）…")
    for attempt in range(3):
        if attempt == 0:
            print("   [方式1] 用 Chrome 打开妙记页…")
            cookie = collect_cookie_via_default_browser()
        elif attempt == 1:
            print("   [方式2] 用 Playwright 弹出登录窗口…")
            cookie = collect_cookie_via_playwright_standalone()
        else:
            print("   [重试] 再次从浏览器读取…")
            time.sleep(5)
            cookie = collect_cookie_from_browsers()
        if not cookie or len(cookie) < 100:
            continue
        cookie = fetch_csrf_from_list_api(cookie)
        print("   Cookie 长度:", len(cookie))
        print("   验证导出接口…")
        if verify_cookie(cookie):
            print("   ✅ Cookie 验证通过，可正常导出")
            break
        print("   ❌ 验证失败（401），请确保已在浏览器中登录妙记")
        if attempt < 2:
            print("   60 秒后重试，请完成登录…")
            time.sleep(60)
    else:
        print("⚠️ Cookie 验证未通过，改用「页面内直接导出」模式…")
        return run_playwright_page_export(args.from_num, args.to_num)

    if not verify_cookie(cookie):
        print("❌ Cookie 验证仍失败，改用「页面内直接导出」模式…")
        return run_playwright_page_export(args.from_num, args.to_num)

    backup = COOKIE_FILE.with_suffix(".txt.bak") if COOKIE_FILE.exists() else None
    if backup:
        backup.write_text(COOKIE_FILE.read_text(encoding="utf-8"), encoding="utf-8")
    COOKIE_FILE.write_text(
        cookie + "\n# 自动从浏览器提取，可手动覆盖",
        encoding="utf-8",
    )
    print("✅ 已写入 cookie_minutes.txt")

    cmd = [
        sys.executable,
        str(SCRIPT_DIR / "download_soul_minutes_101_to_103.py"),
        "--from", str(args.from_num),
        "--to", str(args.to_num),
    ]
    print("🔄 执行导出…")
    return subprocess.call(cmd, cwd=str(SCRIPT_DIR))


if __name__ == "__main__":
    sys.exit(main())
