#!/usr/bin/env python3
"""
飞书统一认证工具 — 一个脚本搞定所有飞书 Token / Cookie

功能：
  1. tenant_access_token（APP_ID + APP_SECRET，适用 Open API）
  2. user_access_token（OAuth 授权码换取，适用用户资源如妙记）
  3. Cookie 自动获取链（5 级 fallback，适用妙记 Web API）
  4. 一键刷新 cookie_minutes.txt

用法：
  # 获取 tenant_access_token
  python3 feishu_auth_helper.py tenant

  # 生成用户授权链接（需在浏览器打开授权后取 code）
  python3 feishu_auth_helper.py auth-url

  # 用授权码换取 user_access_token
  python3 feishu_auth_helper.py exchange --code AUTH_CODE_HERE

  # 自动获取最佳可用 Cookie（5 级 fallback）
  python3 feishu_auth_helper.py cookie

  # 刷新 cookie_minutes.txt（从 Cursor 浏览器提取）
  python3 feishu_auth_helper.py refresh-cookie

  # 测试当前 Cookie 是否有效
  python3 feishu_auth_helper.py test --token obcnc53697q9mj6h1go6v25e

2026-03-11 created
"""
from __future__ import annotations
import argparse, json, os, re, sys, time
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("请安装 requests: pip3 install requests")

SCRIPT_DIR = Path(__file__).resolve().parent
COOKIE_FILE = SCRIPT_DIR / "cookie_minutes.txt"

APP_ID = "cli_a48818290ef8100d"
APP_SECRET = "dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4"
REDIRECT_URI = "https://open.feishu.cn"

# ─── 1. tenant_access_token ───

def get_tenant_token() -> str:
    r = requests.post("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
                      json={"app_id": APP_ID, "app_secret": APP_SECRET}, timeout=10)
    data = r.json()
    if data.get("code") == 0:
        return data["tenant_access_token"]
    print(f"获取 tenant_token 失败: {data}", file=sys.stderr)
    return ""

# ─── 2. user_access_token (OAuth) ───

def build_auth_url(scope: str = "") -> str:
    base = f"https://accounts.feishu.cn/open-apis/authen/v1/authorize?app_id={APP_ID}&redirect_uri={REDIRECT_URI}&response_type=code&state=karuo_ai_{int(time.time())}"
    if scope:
        base += f"&scope={scope}"
    return base

def exchange_code_for_token(code: str) -> dict:
    tenant = get_tenant_token()
    if not tenant:
        return {"error": "无法获取 tenant_token"}
    r = requests.post("https://open.feishu.cn/open-apis/authen/v1/oidc/access_token",
                      headers={"Authorization": f"Bearer {tenant}", "Content-Type": "application/json"},
                      json={"grant_type": "authorization_code", "code": code}, timeout=10)
    return r.json()

def refresh_user_token(refresh_token: str) -> dict:
    tenant = get_tenant_token()
    if not tenant:
        return {"error": "无法获取 tenant_token"}
    r = requests.post("https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token",
                      headers={"Authorization": f"Bearer {tenant}", "Content-Type": "application/json"},
                      json={"grant_type": "refresh_token", "refresh_token": refresh_token}, timeout=10)
    return r.json()

# ─── 3. Cookie 5 级 fallback ───

def get_cookie_from_file() -> str:
    if COOKIE_FILE.exists():
        for line in COOKIE_FILE.read_text(encoding="utf-8", errors="ignore").strip().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "PASTE_YOUR" not in line and len(line) > 100:
                return line
    return ""

def get_cookie_from_env() -> str:
    c = os.environ.get("FEISHU_MINUTES_COOKIE", "").strip()
    return c if c and len(c) > 100 and "PASTE_YOUR" not in c else ""

def get_cookie_from_browser() -> str:
    try:
        import browser_cookie3
        for domain in ("cunkebao.feishu.cn", "feishu.cn", ".feishu.cn"):
            for loader in (browser_cookie3.safari, browser_cookie3.chrome, browser_cookie3.edge, browser_cookie3.firefox):
                try:
                    cj = loader(domain_name=domain)
                    s = "; ".join([f"{c.name}={c.value}" for c in cj])
                    if len(s) > 100:
                        return s
                except Exception:
                    continue
    except ImportError:
        pass
    return ""

def get_cookie_from_cursor() -> str:
    """从 Cursor 内置浏览器 SQLite 提取飞书 Cookie（明文，无需解密）"""
    try:
        import sqlite3, shutil, tempfile
        cookie_path = Path.home() / "Library/Application Support/Cursor/Partitions/cursor-browser/Cookies"
        if not cookie_path.exists():
            return ""
        tmp = tempfile.mktemp(suffix=".db")
        shutil.copy2(cookie_path, tmp)
        conn = sqlite3.connect(tmp)
        cur = conn.cursor()
        cur.execute("SELECT name, value FROM cookies WHERE (host_key LIKE '%feishu%' OR host_key LIKE '%cunkebao%') AND value != ''")
        rows = cur.fetchall()
        conn.close()
        Path(tmp).unlink(missing_ok=True)
        if rows:
            s = "; ".join([f"{n}={v}" for n, v in rows])
            if len(s) > 100:
                return s
    except Exception:
        pass
    return ""

def get_best_cookie(verbose: bool = False) -> str:
    """5 级 fallback 获取最佳可用 Cookie"""
    sources = [
        ("cookie_minutes.txt", get_cookie_from_file),
        ("环境变量", get_cookie_from_env),
        ("本机浏览器", get_cookie_from_browser),
        ("Cursor 浏览器", get_cookie_from_cursor),
    ]
    for name, fn in sources:
        c = fn()
        if c:
            if verbose:
                print(f"✅ Cookie 来源: {name} ({len(c)} chars)")
            return c
        elif verbose:
            print(f"  ❌ {name}: 无有效 Cookie")
    return ""

def extract_bv_csrf(cookie: str) -> str:
    for key in ("bv_csrf_token=", "minutes_csrf_token="):
        i = cookie.find(key)
        if i != -1:
            start = i + len(key)
            end = cookie.find(";", start)
            if end == -1:
                end = len(cookie)
            val = cookie[start:end].strip()
            if len(val) == 36:
                return val
    return ""

# ─── 4. 测试 ───

def test_cookie(cookie: str, object_token: str) -> bool:
    bv = extract_bv_csrf(cookie)
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Cookie": cookie,
        "Referer": "https://cunkebao.feishu.cn/minutes/",
    }
    if bv:
        headers["bv-csrf-token"] = bv
    r = requests.get(
        f"https://cunkebao.feishu.cn/minutes/api/status?object_token={object_token}&language=zh_cn&_t={int(time.time()*1000)}",
        headers=headers, timeout=15)
    if r.status_code == 200:
        data = r.json()
        if data.get("code") == 0:
            topic = data.get("data", {}).get("topic", "")
            video = bool(data.get("data", {}).get("video_info", {}).get("video_download_url"))
            print(f"✅ Cookie 有效 | 标题: {topic} | 视频: {'有' if video else '无'}")
            return True
        print(f"❌ API 返回错误: code={data.get('code')}, msg={data.get('msg')}")
    else:
        print(f"❌ HTTP {r.status_code}: {r.text[:200]}")
    return False

def test_tenant(object_token: str) -> bool:
    token = get_tenant_token()
    if not token:
        return False
    r = requests.get(f"https://open.feishu.cn/open-apis/minutes/v1/minutes/{object_token}",
                     headers={"Authorization": f"Bearer {token}"}, timeout=10)
    data = r.json()
    if data.get("code") == 0:
        print(f"✅ tenant_token 可访问妙记")
        return True
    print(f"❌ tenant_token: code={data.get('code')}, msg={data.get('msg')}")
    return False

# ─── CLI ───

def main():
    parser = argparse.ArgumentParser(description="飞书统一认证工具")
    sub = parser.add_subparsers(dest="cmd")

    sub.add_parser("tenant", help="获取 tenant_access_token")
    sub.add_parser("auth-url", help="生成用户授权链接")

    p_ex = sub.add_parser("exchange", help="授权码换 user_access_token")
    p_ex.add_argument("--code", required=True)

    p_rf = sub.add_parser("refresh", help="刷新 user_access_token")
    p_rf.add_argument("--token", required=True, help="refresh_token")

    sub.add_parser("cookie", help="自动获取最佳 Cookie（5 级 fallback）")
    sub.add_parser("refresh-cookie", help="从 Cursor 浏览器刷新 cookie_minutes.txt")

    p_test = sub.add_parser("test", help="测试 Cookie / tenant_token 是否有效")
    p_test.add_argument("--token", default="obcnc53697q9mj6h1go6v25e", help="妙记 object_token")

    args = parser.parse_args()

    if args.cmd == "tenant":
        t = get_tenant_token()
        if t:
            print(f"✅ tenant_access_token: {t}")
        return

    if args.cmd == "auth-url":
        url = build_auth_url()
        print(f"请在浏览器中打开以下链接授权：\n{url}")
        print(f"\n授权后，从重定向 URL 中提取 code 参数，执行：")
        print(f"  python3 {Path(__file__).name} exchange --code <CODE>")
        return

    if args.cmd == "exchange":
        result = exchange_code_for_token(args.code)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        data = result.get("data", {})
        if data.get("access_token"):
            print(f"\n✅ user_access_token: {data['access_token']}")
            print(f"   refresh_token: {data.get('refresh_token', 'N/A')}")
            print(f"   expires_in: {data.get('expires_in', 'N/A')}s")
        return

    if args.cmd == "refresh":
        result = refresh_user_token(args.token)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    if args.cmd == "cookie":
        c = get_best_cookie(verbose=True)
        if c:
            print(f"\nCookie 长度: {len(c)} chars")
            print(f"bv_csrf_token: {extract_bv_csrf(c) or '未找到'}")
        else:
            print("❌ 所有 Cookie 来源均无有效 Cookie")
        return

    if args.cmd == "refresh-cookie":
        c = get_cookie_from_cursor()
        if c:
            COOKIE_FILE.write_text(c + f"\n# Cursor 浏览器自动提取 {time.strftime('%Y-%m-%d %H:%M:%S')}\n", encoding="utf-8")
            print(f"✅ cookie_minutes.txt 已更新 ({len(c)} chars)")
        else:
            print("❌ Cursor 浏览器中无飞书 Cookie")
        return

    if args.cmd == "test":
        print("=== 测试 tenant_access_token ===")
        test_tenant(args.token)
        print("\n=== 测试 Cookie ===")
        c = get_best_cookie(verbose=True)
        if c:
            test_cookie(c, args.token)
        return

    parser.print_help()

if __name__ == "__main__":
    main()
