#!/usr/bin/env python3
"""
Gemini API Key 自动注册脚本
1. 通过 Clash 代理打开 Google AI Studio（非无头模式，你手动登录 Google）
2. 登录完成后脚本自动创建指定数量的 API Key
3. Key 存入本地 SQLite + JSON

用法: python3 register_gemini_keys.py --count 3
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from datetime import datetime, timezone

PROXY_SERVER = "http://127.0.0.1:7897"
AI_STUDIO_URL = "https://aistudio.google.com/app/apikey"
DB_PATH = Path(__file__).parent / "accounts.db"
JSON_DIR = Path(__file__).parent / "tokens"


def save_key(provider, email, api_key, project_name=""):
    """保存到 SQLite + JSON"""
    import sqlite3
    JSON_DIR.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(str(DB_PATH)) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider TEXT NOT NULL,
                email TEXT NOT NULL,
                password TEXT DEFAULT '',
                api_key TEXT DEFAULT '',
                access_token TEXT DEFAULT '',
                refresh_token TEXT DEFAULT '',
                account_id TEXT DEFAULT '',
                name TEXT DEFAULT '',
                extra TEXT DEFAULT '{}',
                registered_at TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                UNIQUE(provider, email)
            )
        """)
        now = datetime.now(timezone.utc).isoformat()
        conn.execute("""
            INSERT OR REPLACE INTO accounts
            (provider, email, api_key, name, extra, registered_at, status)
            VALUES (?, ?, ?, ?, ?, ?, 'active')
        """, (provider, email, api_key, project_name, json.dumps({"project": project_name}), now))
        conn.commit()

    safe_email = email.replace("@", "_at_")
    json_file = JSON_DIR / f"gemini_{safe_email}_{int(time.time())}.json"
    json_file.write_text(json.dumps({
        "provider": "gemini",
        "email": email,
        "api_key": api_key,
        "project": project_name,
        "registered_at": datetime.now(timezone.utc).isoformat(),
    }, indent=2, ensure_ascii=False))
    print(f"  [保存] {json_file.name}")


def main():
    parser = argparse.ArgumentParser(description="Gemini API Key 自动注册")
    parser.add_argument("--count", "-n", type=int, default=3, help="要创建的 Key 数量")
    parser.add_argument("--proxy", default=PROXY_SERVER, help="代理地址")
    args = parser.parse_args()

    from playwright.sync_api import sync_playwright

    print(f"🚀 启动浏览器（代理: {args.proxy}）")
    print(f"📋 目标: 创建 {args.count} 个 Gemini API Key\n")

    pw = sync_playwright().start()
    browser = pw.chromium.launch(
        headless=False,
        proxy={"server": args.proxy},
        args=["--window-size=1280,900"],
    )
    context = browser.new_context(
        viewport={"width": 1280, "height": 900},
        locale="en-US",
    )
    page = context.new_page()

    print("📂 打开 Google AI Studio...")
    page.goto(AI_STUDIO_URL, timeout=30000)
    time.sleep(2)

    if "accounts.google.com" in page.url:
        print("\n" + "=" * 60)
        print("⚠️  请在弹出的浏览器窗口中登录你的 Google 账号")
        print("   登录完成后脚本会自动继续...")
        print("=" * 60 + "\n")

        for i in range(300):
            time.sleep(2)
            current = page.url
            # 必须是真正到达 aistudio，而非 accounts.google.com 里的 continue 参数
            if current.startswith("https://aistudio.google.com"):
                print("✅ 登录成功！已进入 AI Studio")
                break
            if i % 15 == 0 and i > 0:
                print(f"  等待登录中... ({i*2}秒)")
        else:
            print("❌ 登录超时（10分钟），请重试")
            browser.close()
            pw.stop()
            return

    time.sleep(3)
    print(f"\n当前页面: {page.url}")

    if "/apikey" not in page.url:
        page.goto(AI_STUDIO_URL, timeout=20000)
        time.sleep(3)

    keys_created = []

    for i in range(args.count):
        print(f"\n--- 创建第 {i+1}/{args.count} 个 Key ---")

        try:
            page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass

        create_btn = None
        for selector in [
            "button:has-text('Create API key')",
            "button:has-text('Create API Key')",
            "button:has-text('创建 API 密钥')",
            "[aria-label='Create API key']",
            "button:has-text('Get API key')",
            "button:has-text('获取 API 密钥')",
        ]:
            try:
                btn = page.locator(selector).first
                if btn.is_visible(timeout=3000):
                    create_btn = btn
                    break
            except Exception:
                continue

        if not create_btn:
            print("  ⚠️  未找到 Create API Key 按钮，尝试截图诊断...")
            page.screenshot(path=str(JSON_DIR / f"debug_step_{i+1}.png"))
            snapshot = page.content()
            if "Create" in snapshot or "创建" in snapshot:
                print("  页面包含创建按钮文字，尝试通用点击...")
                try:
                    page.locator("button").filter(has_text=re.compile(r"Create|创建|Get|获取")).first.click()
                except Exception as e:
                    print(f"  点击失败: {e}")
                    continue
            else:
                print(f"  页面 URL: {page.url}")
                continue
        else:
            create_btn.click()

        time.sleep(2)

        new_project_btn = None
        for selector in [
            "button:has-text('Create API key in new project')",
            "button:has-text('在新项目中创建 API 密钥')",
            "text='Create API key in new project'",
            "button:has-text('new project')",
        ]:
            try:
                btn = page.locator(selector).first
                if btn.is_visible(timeout=3000):
                    new_project_btn = btn
                    break
            except Exception:
                continue

        if new_project_btn:
            new_project_btn.click()
            print("  点击了 'Create in new project'")
        else:
            existing_btns = page.locator("button:has-text('Create')").all()
            for btn in existing_btns:
                try:
                    if btn.is_visible():
                        btn.click()
                        break
                except Exception:
                    continue

        time.sleep(5)

        api_key = None
        for attempt in range(10):
            page_text = page.content()
            matches = re.findall(r'AIzaSy[A-Za-z0-9_-]{33}', page_text)
            if matches:
                api_key = matches[0]
                break

            try:
                code_el = page.locator("code, .api-key, [data-testid*='key'], pre").first
                if code_el.is_visible(timeout=1000):
                    text = code_el.inner_text()
                    m = re.search(r'AIzaSy[A-Za-z0-9_-]{33}', text)
                    if m:
                        api_key = m.group(0)
                        break
            except Exception:
                pass

            copy_btns = page.locator("button:has-text('Copy')").all()
            if not copy_btns:
                copy_btns = page.locator("button:has-text('复制')").all()
            for btn in copy_btns:
                try:
                    if btn.is_visible():
                        btn.click()
                        time.sleep(0.5)
                        break
                except Exception:
                    pass

            time.sleep(1)
            if attempt % 3 == 2:
                print(f"  等待 Key 生成... (尝试 {attempt+1})")

        if api_key:
            print(f"  ✅ Key {i+1}: {api_key[:20]}...")
            keys_created.append(api_key)
            save_key("gemini", f"gemini_project_{i+1}@google.com", api_key, f"project_{i+1}")
        else:
            print(f"  ❌ 未能提取到 API Key，请检查浏览器窗口")
            page.screenshot(path=str(JSON_DIR / f"failed_key_{i+1}.png"))

        close_btns = page.locator("button:has-text('Done'), button:has-text('Close'), button:has-text('完成'), button:has-text('关闭')").all()
        for btn in close_btns:
            try:
                if btn.is_visible():
                    btn.click()
                    break
            except Exception:
                pass
        time.sleep(2)

        if "/apikey" not in page.url:
            page.goto(AI_STUDIO_URL, timeout=15000)
            time.sleep(3)

    print(f"\n{'='*60}")
    print(f"🎉 完成! 成功创建 {len(keys_created)}/{args.count} 个 Gemini API Key")
    for idx, key in enumerate(keys_created, 1):
        print(f"  Key {idx}: {key}")
    print(f"\n存储位置: {DB_PATH}")
    print(f"JSON 目录: {JSON_DIR}")
    print(f"{'='*60}")

    input("\n按 Enter 关闭浏览器...")
    browser.close()
    pw.stop()


if __name__ == "__main__":
    main()
