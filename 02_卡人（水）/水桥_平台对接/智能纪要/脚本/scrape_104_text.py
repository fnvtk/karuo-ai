#!/usr/bin/env python3
"""从 104 场妙记页面抓取「文字记录」或用同页 Cookie 调导出接口，保存到 soul 目录，格式与 103 场一致。"""
import re
import sys
from pathlib import Path

OUT_DIR = Path("/Users/karuo/Documents/聊天记录/soul")
URL_104 = "https://cunkebao.feishu.cn/minutes/obcnyg5nj2l8q281v32de6qz"
OBJECT_TOKEN = "obcnyg5nj2l8q281v32de6qz"
EXPORT_URL = "https://cunkebao.feishu.cn/minutes/api/export"
TITLE = "soul 派对 第104场 20260219"
PROFILE_SRC = Path.home() / "Library/Application Support/Doubao/Profile 2"
PROFILE_COPY = Path("/tmp/feishu_scrape_profile")


def main():
    import shutil
    if PROFILE_COPY.exists():
        shutil.rmtree(PROFILE_COPY, ignore_errors=True)
    PROFILE_COPY.mkdir(parents=True, exist_ok=True)
    for name in ["Cookies", "Local State", "Preferences"]:
        src = PROFILE_SRC / name
        if src.exists():
            try:
                shutil.copy2(src, PROFILE_COPY / name)
            except Exception:
                pass
    (PROFILE_COPY / "LOCK").unlink(missing_ok=True)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("NO_PLAYWRIGHT", file=sys.stderr)
        return 2

    cookies = []
    body_text = ""
    with sync_playwright() as p:
        try:
            ctx = p.chromium.launch_persistent_context(
                user_data_dir=str(PROFILE_COPY),
                headless=True,
                channel="chromium",
                timeout=30000,
                args=["--no-sandbox"],
            )
        except Exception as e:
            print("LAUNCH_ERR", str(e), file=sys.stderr)
            return 3
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto(URL_104, wait_until="domcontentloaded", timeout=25000)
        page.wait_for_timeout(10000)
        cookies = ctx.cookies()
        cookie_str = "; ".join([f"{c['name']}={c['value']}" for c in cookies])
        bv = next((c["value"] for c in cookies if c.get("name") == "bv_csrf_token" and len(c.get("value", "")) == 36), None)
        # 备用：从页面抓取正文（导出失败时用）
        try:
            body_text = page.evaluate("() => document.body ? document.body.innerText : ''") or ""
        except Exception:
            body_text = ""
        ctx.close()

    if cookie_str and len(cookie_str) > 100:
        import requests
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Cookie": cookie_str,
            "Referer": "https://cunkebao.feishu.cn/minutes/",
        }
        if bv:
            headers["bv-csrf-token"] = bv
        export_ok = False
        try:
            r = requests.post(EXPORT_URL, params={"object_token": OBJECT_TOKEN, "format": 2, "add_speaker": "true", "add_timestamp": "false"}, headers=headers, timeout=20)
            r.encoding = "utf-8"
            if r.status_code == 200 and len(r.text) > 500 and "说话人" in r.text[:4000]:
                body_text = r.text.strip()
                export_ok = True
        except Exception:
            pass
        if not export_ok and (not body_text or len(body_text) < 300):
            body_text = ""  # 下面会用备用 body_text

    if not body_text or len(body_text) < 200:
        print("NO_TEXT", file=sys.stderr)
        return 4
    # 与 103 场一致：日期行 | 时长 + 关键词 + 文字记录
    if not body_text.lstrip().startswith("2") and "文字记录" not in body_text[:200]:
        header = "2026年2月19日 上午 7:35|2小时 22分钟 18秒\n\n关键词:\n社群、派对、目标、灰产、超级个体\n\n文字记录:\n"
        full = header + body_text
    else:
        full = body_text
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r'[\\/*?:"<>|]', "_", TITLE)
    out_path = OUT_DIR / f"{safe}.txt"
    out_path.write_text(full, encoding="utf-8")
    print("OK", str(out_path))
    return 0


if __name__ == "__main__":
    sys.exit(main())
