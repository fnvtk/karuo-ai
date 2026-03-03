#!/usr/bin/env python3
"""
检测系统默认浏览器，并用该浏览器启动 Playwright，优先使用其用户数据目录以保留登录/Cookie。
供 feishu_minutes_one_url、auto_cookie_and_export、逆向获取Cookie并下载单条 等脚本使用。
"""
from __future__ import annotations

import platform
import subprocess
import sys
from pathlib import Path


def get_system_default_browser():
    """
    检测系统当前使用的默认浏览器。
    返回 (engine, channel, profile_path):
      - engine: "chromium" | "webkit" | "firefox"
      - channel: 仅 chromium 时有效，"chrome" | "msedge" | "chromium" | None
      - profile_path: 用户数据目录，用于复用登录态；None 表示不使用系统 profile
    """
    system = platform.system()
    home = Path.home()

    if system == "Darwin":  # macOS
        # 优先读取系统默认 HTTP/HTTPS 处理程序
        try:
            out = subprocess.run(
                ["defaults", "read", "com.apple.LaunchServices/com.apple.launchservices.secure", "LSHandlers"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if out.returncode == 0 and out.stdout:
                for line in out.stdout.splitlines():
                    if "https" in line.lower() or "http" in line.lower():
                        continue
                # 解析 LSHandlers 较复杂，改为按应用存在性检测
        except Exception:
            pass

        # 按优先级检测已安装的浏览器（与多数用户习惯一致：Chrome/Edge 常用）
        apps = [
            ("Google Chrome", "chromium", "chrome", home / "Library/Application Support/Google/Chrome"),
            ("Microsoft Edge", "chromium", "msedge", home / "Library/Application Support/Microsoft Edge"),
            ("Chromium", "chromium", "chromium", home / "Library/Application Support/Chromium"),
            ("Safari", "webkit", None, None),
            ("Firefox", "firefox", None, home / "Library/Application Support/Firefox"),
        ]
        for app_name, engine, channel, profile in apps:
            app_path = Path(f"/Applications/{app_name}.app")
            if app_path.exists():
                if engine == "firefox" and profile:
                    # Firefox 使用 Profiles/xxx.default 子目录
                    profiles = profile / "Profiles"
                    if profiles.exists():
                        for d in profiles.iterdir():
                            if d.is_dir() and (d / "prefs.js").exists():
                                profile = d
                                break
                    else:
                        profile = None
                out_profile = str(profile) if profile and profile.exists() else None
                return (engine, channel, out_profile)
        # 若都未找到，退回 Chromium（Playwright 自带）
        return ("chromium", None, None)

    if system == "Windows":
        try:
            out = subprocess.run(
                ["reg", "query", "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice", "/v", "ProgId"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if out.returncode == 0 and "chrome" in out.stdout.lower():
                return ("chromium", "chrome", None)
            if out.returncode == 0 and "edge" in out.stdout.lower():
                return ("chromium", "msedge", None)
        except Exception:
            pass
        return ("chromium", None, None)

    return ("chromium", None, None)


def launch_playwright_with_default_browser(sync_playwright, headless: bool = False, timeout: int = 15000):
    """
    使用系统默认浏览器启动 Playwright，返回 (context_or_browser, page_getter, cleanup)。
    page_getter 用于获取当前 page（可能是 context.pages[0] 或 new_page）。
    cleanup 用于关闭 context/browser。
    若使用持久 context，则尽量复用系统 profile，避免 Cookie 无法登录。
    """
    import tempfile
    p = sync_playwright
    engine, channel, profile_path = get_system_default_browser()

    if engine == "chromium":
        channel_info = f" (channel={channel})" if channel else ""
        print(f"   使用系统浏览器: Chromium 系{channel_info}，profile={profile_path or '临时目录'}")

        # 优先尝试用系统 profile 启动（已登录则直接用）
        if profile_path and channel:
            try:
                ctx = p.chromium.launch_persistent_context(
                    profile_path,
                    channel=channel,
                    headless=headless,
                    timeout=timeout,
                    args=["--no-first-run"],
                )
                page = ctx.pages[0] if ctx.pages else ctx.new_page()

                def cleanup():
                    try:
                        ctx.close()
                    except Exception:
                        pass

                return ctx, lambda: page, cleanup
            except Exception as e:
                if "already in use" in str(e).lower() or "User data directory" in str(e):
                    print(f"   系统浏览器正在使用中，改用临时目录（请在新窗口内登录一次）: {e}")
                else:
                    print(f"   使用系统 profile 失败，改用临时目录: {e}")

        # 使用临时目录 + 指定 channel（仍为系统安装的 Chrome/Edge）
        user_data = tempfile.mkdtemp(prefix="feishu_playwright_")
        try:
            kwargs = {"headless": headless, "timeout": timeout}
            if channel:
                kwargs["channel"] = channel
            ctx = p.chromium.launch_persistent_context(user_data, **kwargs)
            page = ctx.pages[0] if ctx.pages else ctx.new_page()

            def cleanup():
                try:
                    ctx.close()
                except Exception:
                    pass
                import shutil
                shutil.rmtree(user_data, ignore_errors=True)

            return ctx, lambda: page, cleanup
        except Exception:
            import shutil
            shutil.rmtree(user_data, ignore_errors=True)
            raise

    if engine == "webkit":
        print("   使用系统浏览器: Safari (WebKit)")
        browser = p.webkit.launch(headless=headless)
        ctx = browser
        page = browser.new_page()

        def cleanup():
            try:
                browser.close()
            except Exception:
                pass

        return ctx, lambda: page, cleanup

    if engine == "firefox":
        print("   使用系统浏览器: Firefox")
        browser = p.firefox.launch(headless=headless)
        ctx = browser
        page = browser.new_page()

        def cleanup():
            try:
                browser.close()
            except Exception:
                pass

        return ctx, lambda: page, cleanup

    # 默认
    print("   使用 Playwright 自带 Chromium")
    user_data = tempfile.mkdtemp(prefix="feishu_playwright_")
    ctx = p.chromium.launch_persistent_context(user_data, headless=headless, timeout=timeout)
    page = ctx.pages[0] if ctx.pages else ctx.new_page()

    def cleanup():
        try:
            ctx.close()
        except Exception:
            pass
        import shutil
        shutil.rmtree(user_data, ignore_errors=True)

    return ctx, lambda: page, cleanup
