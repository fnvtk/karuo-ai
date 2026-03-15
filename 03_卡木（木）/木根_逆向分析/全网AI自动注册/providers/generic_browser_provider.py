"""
通用浏览器注册 Provider
适用于 Groq / DeepSeek / Mistral / Together / Cohere 等标准注册流程的平台。
流程: 打开注册页 → 填邮箱 → 填密码 → 验证邮箱 → 登录 → 提取 API Key
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

PROVIDER_CONFIGS = {
    "groq": {
        "signup_url": "https://console.groq.com/login",
        "api_key_url": "https://console.groq.com/keys",
        "api_key_page_selector": "button:has-text('Create API Key')",
    },
    "deepseek": {
        "signup_url": "https://platform.deepseek.com/sign_up",
        "api_key_url": "https://platform.deepseek.com/api_keys",
        "api_key_page_selector": "button:has-text('Create')",
    },
    "mistral": {
        "signup_url": "https://console.mistral.ai/register",
        "api_key_url": "https://console.mistral.ai/api-keys",
        "api_key_page_selector": "button:has-text('Create')",
    },
    "together": {
        "signup_url": "https://api.together.xyz/signup",
        "api_key_url": "https://api.together.xyz/settings/api-keys",
        "api_key_page_selector": "",
    },
    "cohere": {
        "signup_url": "https://dashboard.cohere.com/welcome/register",
        "api_key_url": "https://dashboard.cohere.com/api-keys",
        "api_key_page_selector": "",
    },
}


class GenericBrowserProvider(BaseProvider):
    """
    通用浏览器自动注册。
    大多数平台的注册流程相似，差异在 URL 和页面元素选择器上。
    """
    PROVIDER_NAME = "generic"

    def __init__(self, provider_name: str, config: dict, email_service: EmailService, storage: AccountStorage):
        super().__init__(config, email_service, storage)
        self.PROVIDER_NAME = provider_name
        self.provider_config = config.get("providers", {}).get(provider_name, {})
        self.browser_config = config.get("browser", {})
        self.defaults = PROVIDER_CONFIGS.get(provider_name, {})

    def _create_browser(self):
        from DrissionPage import ChromiumPage, ChromiumOptions
        co = ChromiumOptions()
        if self.browser_config.get("headless", True):
            co.set_argument("--headless=new")
        co.set_argument("--disable-blink-features=AutomationControlled")
        co.set_argument("--no-sandbox")
        co.set_argument("--window-size=1920,1080")
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
        name = f"{first} {last}"
        log.info(f"[{self.PROVIDER_NAME}] 开始注册: {email}")

        browser = None
        try:
            browser = self._create_browser()
            tab = browser.latest_tab

            signup_url = self.provider_config.get("signup_url", self.defaults.get("signup_url", ""))
            if not signup_url:
                log.error(f"[{self.PROVIDER_NAME}] 未配置注册 URL")
                return None

            # Step 1: 打开注册页
            tab.get(signup_url)
            time.sleep(3)
            log.info(f"  [1/5] 注册页面已加载")

            # Step 2: 尝试填写注册表单（通用选择器）
            email_selectors = [
                '@type=email', '@name=email', '@placeholder=Email',
                '@autocomplete=email', 'input[type="email"]',
            ]
            for sel in email_selectors:
                el = tab.ele(sel, timeout=2)
                if el:
                    el.clear()
                    el.input(email)
                    break

            name_el = tab.ele('@name=name', timeout=2) or tab.ele('@placeholder=Name', timeout=1)
            if name_el:
                name_el.clear()
                name_el.input(name)

            pwd_selectors = ['@type=password', '@name=password']
            for sel in pwd_selectors:
                el = tab.ele(sel, timeout=2)
                if el:
                    el.clear()
                    el.input(password)
                    break

            submit = tab.ele("@type=submit", timeout=3)
            if submit:
                submit.click()
            time.sleep(3)
            log.info(f"  [2/5] 表单已提交")

            # Step 3: 等待验证码
            code = self.email_service.wait_for_code(
                email, email_ctx,
                timeout=self.config.get("registration", {}).get("otp_timeout", 120),
            )
            if code:
                otp_inputs = tab.eles("@data-index", timeout=5)
                if otp_inputs:
                    for i, digit in enumerate(code):
                        if i < len(otp_inputs):
                            otp_inputs[i].input(digit)
                            time.sleep(0.1)
                else:
                    code_input = (
                        tab.ele('@name=code', timeout=3)
                        or tab.ele('@name=otp', timeout=2)
                        or tab.ele('@placeholder=Code', timeout=2)
                    )
                    if code_input:
                        code_input.clear()
                        code_input.input(code)
                        submit = tab.ele("@type=submit", timeout=3)
                        if submit:
                            submit.click()
                log.info(f"  [3/5] 验证码已提交: {code}")
            else:
                log.warning(f"  [3/5] 未收到验证码，尝试继续...")
            time.sleep(3)

            # Step 4: 导航到 API Key 页面
            api_key_url = self.provider_config.get(
                "api_key_url", self.defaults.get("api_key_url", "")
            )
            if api_key_url:
                tab.get(api_key_url)
                time.sleep(3)

            # Step 5: 尝试提取 API Key
            api_key = self._try_extract_key(tab)
            if api_key:
                log.info(f"  [5/5] API Key 提取成功: {api_key[:16]}...")
                return AccountResult(
                    provider=self.PROVIDER_NAME,
                    email=email,
                    password=password,
                    api_key=api_key,
                    name=name,
                )

            log.warning(f"  [5/5] API Key 提取失败，请检查注册流程")
            return AccountResult(
                provider=self.PROVIDER_NAME,
                email=email,
                password=password,
                api_key="",
                name=name,
                status="registered_no_key",
            )

        except Exception as e:
            log.error(f"[{self.PROVIDER_NAME}] 注册异常: {e}")
            return None
        finally:
            if browser:
                try:
                    browser.quit()
                except Exception:
                    pass

    def _try_extract_key(self, tab) -> Optional[str]:
        """尝试从页面提取 API Key"""
        import re
        page_text = tab.html or ""
        patterns = [
            r'(sk-[a-zA-Z0-9]{32,})',           # OpenAI 风格 sk-xxx
            r'(gsk_[a-zA-Z0-9]{32,})',           # Groq 风格 gsk_xxx
            r'(xai-[a-zA-Z0-9]{32,})',           # xAI 风格
            r'(dsk-[a-zA-Z0-9]{32,})',           # DeepSeek 风格
            r'(AIzaSy[a-zA-Z0-9_-]{33})',        # Google API Key
            r'([a-zA-Z0-9]{32,64})',             # 通用长 token
        ]
        for pattern in patterns:
            match = re.search(pattern, page_text)
            if match:
                return match.group(1)
        return None
