"""
Cursor 自动注册 Provider
优先 DrissionPage，失败时回退到 Playwright（兼容 Chromium 148+ / ARM Mac）。
参考: github.com/ddCat-main/cursor-auto-register
"""

import os
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

    def _effective_headless(self) -> bool:
        """CURSOR_HEADLESS=0|false|no 时强制有界面，利于 Turnstile。"""
        v = os.environ.get("CURSOR_HEADLESS", "").strip().lower()
        if v in ("0", "false", "no", "off"):
            return False
        return self.browser_config.get("headless", True)

    def _create_browser(self):
        # 参考 ddCat-main/cursor-auto-register browser_utils：auto_port() + headless()
        from DrissionPage import ChromiumPage, ChromiumOptions
        co = ChromiumOptions()
        co.set_argument("--disable-blink-features=AutomationControlled")
        co.set_argument("--disable-features=AutomationControlled")
        co.set_argument("--no-sandbox")
        co.set_argument("--disable-gpu")
        co.set_argument("--disable-dev-shm-usage")
        co.set_argument("--remote-allow-origins=*")
        co.set_argument("--window-size=1920,1080")
        co.auto_port()
        use_headless = self._effective_headless()
        if use_headless:
            co.set_argument("--headless=new")
        co.headless(use_headless)
        co.set_pref("webgl.vendor", "NVIDIA Corporation")
        co.set_pref("webgl.renderer", "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)")
        if self.browser_config.get("chrome_path"):
            co.set_browser_path(self.browser_config["chrome_path"])
        proxy = self.config.get("proxy", {})
        if proxy.get("enabled"):
            co.set_proxy(f"{proxy['type']}://{proxy['host']}:{proxy['port']}")
        co.set_retry(15, 2)
        return ChromiumPage(co)

    def _register_with_playwright(
        self, email: str, email_ctx: dict, password: str, first: str, last: str
    ) -> Optional[AccountResult]:
        """Playwright 备用路径（Chromium 148+ / ARM Mac 兼容）"""
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            log.warning("[Cursor] 未安装 playwright，跳过 Playwright 回退")
            return None
        signup_url = self.provider_config.get("signup_url", SIGNUP_URL)
        settings_url = self.provider_config.get("settings_url", SETTINGS_URL)
        headless = self._effective_headless()
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=headless, args=["--no-sandbox"])
            try:
                page = browser.new_page()
                page.goto(signup_url, wait_until="domcontentloaded", timeout=45000)
                time.sleep(5)
                log.info(f"  [1/6] 打开注册页面 (Playwright)")
                # 勿用裸 input，否则会命中 type=hidden（如 signals）
                fn = page.locator(
                    'input[name="first_name"], input[name="firstName"], input[autocomplete="given-name"]'
                ).first
                fn.wait_for(state="visible", timeout=45000)
                time.sleep(0.5)
                fn.fill(first)
                time.sleep(0.15)
                page.locator(
                    'input[name="last_name"], input[name="lastName"], input[autocomplete="family-name"]'
                ).first.fill(last)
                time.sleep(0.15)
                page.locator(
                    'input[name="email"], input[type="email"], input[autocomplete="email"]'
                ).first.fill(email)
                time.sleep(0.5)
                page.locator('button[type="submit"], input[type="submit"], [type="submit"]').first.click()
                time.sleep(3)
                log.info(f"  [2/6] 已提交基本信息 (Playwright)")
                try:
                    cf = page.frame_locator("iframe[src*='turnstile'], iframe[title*='Widget']").first
                    cf.locator("input").click(timeout=5000)
                    time.sleep(2)
                except Exception:
                    pass
                log.info(f"  [3/6] Turnstile 处理 (Playwright)")
                pwd_el = page.locator('input[name="password"]')
                if pwd_el.count() > 0:
                    pwd_el.fill(password)
                    time.sleep(0.5)
                    page.click('button[type="submit"]')
                    time.sleep(2)
                    try:
                        cf.locator("input").click(timeout=3000)
                    except Exception:
                        pass
                log.info(f"  [4/6] 密码已填写 (Playwright)")
                otp_selector = (
                    'input[data-index="0"], [data-index="0"], '
                    'input[maxlength="1"], input[inputmode="numeric"]'
                )
                try:
                    page.wait_for_selector(otp_selector, state="visible", timeout=60000)
                except Exception:
                    pass
                code = self.email_service.wait_for_code(
                    email, email_ctx,
                    timeout=self.config.get("registration", {}).get("otp_timeout", 120),
                )
                if not code:
                    log.error(f"  [5/6] 验证码获取超时")
                    return None
                otp_inputs = page.locator(
                    'input[data-index], input[maxlength="1"], input[inputmode="numeric"]'
                )
                for i, digit in enumerate(str(code)):
                    try:
                        otp_inputs.nth(i).fill(digit, timeout=5000)
                    except Exception:
                        page.locator(f'input[data-index="{i}"]').first.fill(digit, timeout=5000)
                    time.sleep(0.15)
                log.info(f"  [5/6] 验证码已输入: {code} (Playwright)")
                time.sleep(4)
                page.goto(settings_url, wait_until="domcontentloaded", timeout=20000)
                time.sleep(3)
                cookies = page.context.cookies()
                token, user = "", ""
                for c in cookies:
                    if c.get("name") == "WorkosCursorSessionToken":
                        val = c.get("value", "")
                        parts = val.split("%3A%3A")
                        if len(parts) >= 2:
                            user, token = parts[0], parts[1]
                        break
                if token:
                    log.info(f"  [6/6] Token 提取成功 (Playwright)! user={user[:16]}...")
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
            finally:
                browser.close()
        return None

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

            # Step 5: 等待验证码输入框出现后拉取邮件并输入（多种选择器兼容）
            time.sleep(8)
            otp_el = None
            for _ in range(12):
                otp_el = (
                    tab.ele("@data-index=0", timeout=3)
                    or tab.ele("input[data-index='0']", timeout=2)
                    or tab.ele("input[maxlength='1']", timeout=2)
                    or tab.ele("input[inputmode='numeric']", timeout=2)
                )
                if otp_el:
                    break
                time.sleep(2)
            if otp_el:
                code = self.email_service.wait_for_code(
                    email, email_ctx,
                    timeout=self.config.get("registration", {}).get("otp_timeout", 120),
                )
                if not code:
                    log.error(f"  [5/6] 验证码获取超时")
                    return None

                inputs = tab.eles("input[data-index]") or tab.eles("input[maxlength='1']") or tab.eles("input[inputmode='numeric']")
                for i, digit in enumerate(str(code)):
                    if i < len(inputs):
                        inputs[i].input(digit)
                    else:
                        el = tab.ele(f"@data-index={i}", timeout=2) or tab.ele(f"input[data-index='{i}']", timeout=2)
                        if el:
                            el.input(digit)
                    time.sleep(0.1)
                log.info(f"  [5/6] 验证码已输入: {code}")
                time.sleep(5)
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
            err_msg = str(e)
            if any(x in err_msg for x in ("连接失败", "404", "Handshake", "timeout", "getFrameTree")):
                log.warning(f"[Cursor] DrissionPage 连接失败，尝试 Playwright 回退: {err_msg[:80]}")
                try:
                    return self._register_with_playwright(
                        email, email_ctx, password, first, last
                    )
                except Exception as pw_e:
                    log.error(f"[Cursor] Playwright 回退失败: {pw_e}")
            else:
                log.error(f"[Cursor] 注册异常: {e}")
            return None
        finally:
            if browser:
                try:
                    browser.quit()
                except Exception:
                    pass
