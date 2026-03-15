"""
Cursor 自动注册 Provider
浏览器模式 — 使用 DrissionPage 自动填表 + Turnstile 绕过。
参考: github.com/ddCat-main/cursor-auto-register
"""

import time
import random
import logging
from typing import Optional

from .base_provider import (
    BaseProvider, AccountResult, EmailService, AccountStorage,
    random_name, random_password,
)

log = logging.getLogger("auto_register")

SIGNUP_URL = "https://authenticator.cursor.sh/sign-up"
SETTINGS_URL = "https://www.cursor.com/settings"


def _handle_turnstile(tab):
    """处理 Cloudflare Turnstile CAPTCHA"""
    try:
        cf_el = tab.ele("@id=cf-turnstile", timeout=3)
        if cf_el:
            shadow = cf_el.child().shadow_root
            iframe = shadow.ele("tag:iframe")
            body = iframe.ele("tag:body")
            input_el = body.sr("tag:input")
            if input_el:
                input_el.click()
                log.info("  [Turnstile] 已点击验证")
                time.sleep(2)
    except Exception:
        pass


def _type_slowly(tab, selector: str, text: str, delay: float = 0.05):
    """模拟真人逐字输入"""
    el = tab.ele(selector, timeout=10)
    if el:
        el.click()
        time.sleep(0.2)
        for char in text:
            el.input(char)
            time.sleep(delay + random.uniform(0, 0.03))


class CursorProvider(BaseProvider):
    PROVIDER_NAME = "cursor"

    def __init__(self, config: dict, email_service: EmailService, storage: AccountStorage):
        super().__init__(config, email_service, storage)
        self.provider_config = config.get("providers", {}).get("cursor", {})
        self.browser_config = config.get("browser", {})

    def _create_browser(self):
        from DrissionPage import ChromiumPage, ChromiumOptions
        co = ChromiumOptions()
        if self.browser_config.get("headless", True):
            co.set_argument("--headless=new")
        co.set_argument("--disable-blink-features=AutomationControlled")
        co.set_argument("--disable-features=AutomationControlled")
        co.set_argument("--no-sandbox")
        co.set_argument("--disable-gpu")
        co.set_argument("--window-size=1920,1080")
        co.set_pref("webgl.vendor", "NVIDIA Corporation")
        co.set_pref("webgl.renderer", "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)")
        if self.browser_config.get("chrome_path"):
            co.set_browser_path(self.browser_config["chrome_path"])
        proxy = self.config.get("proxy", {})
        if proxy.get("enabled"):
            co.set_proxy(f"{proxy['type']}://{proxy['host']}:{proxy['port']}")
        return ChromiumPage(co)

    def register(self) -> Optional[AccountResult]:
        email, email_ctx = self.email_service.generate_email()
        password = random_password()
        first, last = random_name()
        log.info(f"[Cursor] 开始注册: {email}")

        browser = None
        try:
            browser = self._create_browser()
            tab = browser.latest_tab

            # Step 1: 打开注册页面
            signup_url = self.provider_config.get("signup_url", SIGNUP_URL)
            tab.get(signup_url)
            time.sleep(2)
            tab.run_js("try { turnstile.reset() } catch(e) {}")
            log.info(f"  [1/6] 打开注册页面")

            # Step 2: 填写基本信息
            _type_slowly(tab, '@name=first_name', first)
            _type_slowly(tab, '@name=last_name', last)
            _type_slowly(tab, '@name=email', email)
            time.sleep(0.5)

            submit = tab.ele("@type=submit", timeout=5)
            if submit:
                submit.click()
            log.info(f"  [2/6] 填写基本信息: {first} {last}")
            time.sleep(2)

            # Step 3: 处理 Turnstile
            _handle_turnstile(tab)
            log.info(f"  [3/6] Turnstile 处理")
            time.sleep(2)

            # Step 4: 填写密码
            pwd_el = tab.ele('@name=password', timeout=10)
            if pwd_el:
                _type_slowly(tab, '@name=password', password)
                time.sleep(0.3)
                submit = tab.ele("@type=submit", timeout=5)
                if submit:
                    submit.click()
                log.info(f"  [4/6] 密码已填写")
                time.sleep(2)
                _handle_turnstile(tab)

            # Step 5: 获取并输入验证码
            otp_el = tab.ele("@data-index=0", timeout=15)
            if otp_el:
                code = self.email_service.wait_for_code(
                    email, email_ctx,
                    timeout=self.config.get("registration", {}).get("otp_timeout", 120),
                )
                if not code:
                    log.error(f"  [5/6] 验证码获取超时")
                    return None

                for i, digit in enumerate(code):
                    el = tab.ele(f"@data-index={i}", timeout=5)
                    if el:
                        el.input(digit)
                        time.sleep(0.1)
                log.info(f"  [5/6] 验证码已输入: {code}")
                time.sleep(3)
            else:
                log.warning(f"  [5/6] 未检测到验证码输入框，可能已自动跳过")

            # Step 6: 提取 Token
            settings_url = self.provider_config.get("settings_url", SETTINGS_URL)
            tab.get(settings_url)
            time.sleep(3)

            token = ""
            user = ""
            for cookie in tab.cookies():
                if cookie.get("name") == "WorkosCursorSessionToken":
                    value = cookie["value"]
                    parts = value.split("%3A%3A")
                    if len(parts) >= 2:
                        user = parts[0]
                        token = parts[1]
                    break

            if token:
                log.info(f"  [6/6] Token 提取成功! user={user[:16]}...")
                return AccountResult(
                    provider="cursor",
                    email=email,
                    password=password,
                    api_key="",
                    access_token=token,
                    refresh_token="",
                    account_id=user,
                    name=f"{first} {last}",
                    extra={"cookie_value": f"{user}%3A%3A{token}"},
                )
            else:
                log.error(f"  [6/6] Token 提取失败")
                return None

        except Exception as e:
            log.error(f"[Cursor] 注册异常: {e}")
            return None
        finally:
            if browser:
                try:
                    browser.quit()
                except Exception:
                    pass
