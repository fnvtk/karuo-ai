"""
Cerebras 纯 API 自动注册 Provider

Cerebras 注册流程（Stytch magic link）：
1. 用 mail.tm 生成临时邮箱
2. 调用 Cerebras 注册接口（通过 Stytch）发送 magic link
3. 轮询 mail.tm 获取邮件，提取 magic link
4. 访问 magic link 完成注册
5. 调用 Cerebras API 创建 API Key

优点：不需要浏览器、不需要手机验证、不被限制
"""

import re
import time
import json
import random
import string
import logging
from typing import Optional, Tuple, Dict

import httpx

from .base_provider import (
    BaseProvider, AccountResult, EmailService, AccountStorage,
    random_name, random_password,
)

log = logging.getLogger("auto_register")

MAILTM_API = "https://api.mail.tm"
CEREBRAS_CLOUD = "https://cloud.cerebras.ai"


class MailTmService:
    """mail.tm 临时邮箱服务"""

    def __init__(self):
        self.client = httpx.Client(timeout=15)

    def get_domain(self) -> str:
        r = self.client.get(f"{MAILTM_API}/domains")
        domains = r.json().get("hydra:member", [])
        if not domains:
            raise RuntimeError("mail.tm 无可用域名")
        return domains[0]["domain"]

    def create_account(self) -> Tuple[str, str, str, str]:
        """返回 (email, password, account_id, token)"""
        domain = self.get_domain()
        prefix = "".join(random.choices(string.ascii_lowercase + string.digits, k=12))
        email = f"{prefix}@{domain}"
        password = "".join(random.choices(string.ascii_letters + string.digits, k=16))

        r = self.client.post(
            f"{MAILTM_API}/accounts",
            json={"address": email, "password": password},
        )
        if r.status_code not in (200, 201):
            raise RuntimeError(f"mail.tm 创建账号失败: {r.status_code} {r.text[:100]}")

        account_id = r.json().get("id", "")

        r = self.client.post(
            f"{MAILTM_API}/token",
            json={"address": email, "password": password},
        )
        if r.status_code != 200:
            raise RuntimeError(f"mail.tm 获取 token 失败: {r.status_code}")

        token = r.json().get("token", "")
        return email, password, account_id, token

    def wait_for_magic_link(self, token: str, timeout: int = 120) -> Optional[str]:
        """轮询收件箱，提取 Cerebras/Stytch magic link"""
        start = time.time()
        headers = {"Authorization": f"Bearer {token}"}

        while time.time() - start < timeout:
            try:
                r = self.client.get(f"{MAILTM_API}/messages", headers=headers)
                messages = r.json().get("hydra:member", [])

                for msg in messages:
                    msg_id = msg.get("id", "")
                    if not msg_id:
                        continue

                    detail = self.client.get(
                        f"{MAILTM_API}/messages/{msg_id}", headers=headers
                    )
                    data = detail.json()

                    html = ""
                    html_list = data.get("html")
                    if isinstance(html_list, list) and html_list:
                        html = html_list[0]
                    elif isinstance(html_list, str):
                        html = html_list

                    text = data.get("text", "")
                    content = html or text

                    links = re.findall(r'https?://[^\s"<>\']+', content)
                    for link in links:
                        link_lower = link.lower()
                        if any(kw in link_lower for kw in [
                            "authenticate", "magic", "stytch", "token",
                            "login_or_create", "cerebras"
                        ]):
                            clean = link.rstrip("=").rstrip('"').rstrip("'")
                            return clean

            except Exception as e:
                log.warning(f"[mail.tm] 轮询异常: {e}")

            time.sleep(4)

        return None

    def close(self):
        self.client.close()


class CerebrasProvider(BaseProvider):
    """
    Cerebras 自动注册 Provider（纯 API 模式，无需浏览器）

    注册流程：
    1. mail.tm 创建临时邮箱
    2. Cerebras 发送 magic link
    3. 点击 magic link 完成注册
    4. 获取 session → 创建 API Key
    """

    PROVIDER_NAME = "cerebras"
    CEREBRAS_MODELS = ["qwen-3-235b-a22b-instruct-2507", "llama3.1-8b"]

    def __init__(self, config: dict, email_service: EmailService, storage: AccountStorage):
        super().__init__(config, email_service, storage)
        self.provider_config = config.get("providers", {}).get("cerebras", {})

    def register(self) -> Optional[AccountResult]:
        mail_svc = MailTmService()

        try:
            email, mail_pwd, account_id, mail_token = mail_svc.create_account()
            log.info(f"[cerebras] 临时邮箱: {email}")

            if not self._send_magic_link(email):
                log.error(f"[cerebras] 发送 magic link 失败")
                return None

            log.info(f"[cerebras] magic link 已发送，等待邮件...")
            magic_link = mail_svc.wait_for_magic_link(mail_token, timeout=90)
            if not magic_link:
                log.error(f"[cerebras] 未收到 magic link")
                return None

            log.info(f"[cerebras] 收到 magic link: {magic_link[:60]}...")

            session = self._authenticate_magic_link(magic_link)
            if not session:
                log.error(f"[cerebras] magic link 认证失败")
                return None

            log.info(f"[cerebras] 认证成功，创建 API Key...")
            api_key = self._create_api_key(session)
            if not api_key:
                log.error(f"[cerebras] API Key 创建失败")
                return None

            log.info(f"[cerebras] ✅ API Key: {api_key[:16]}...")
            return AccountResult(
                provider="cerebras",
                email=email,
                password=mail_pwd,
                api_key=api_key,
                extra={"mail_token": mail_token, "models": self.CEREBRAS_MODELS},
            )

        except Exception as e:
            log.error(f"[cerebras] 注册异常: {e}")
            return None
        finally:
            mail_svc.close()

    def _send_magic_link(self, email: str) -> bool:
        """通过 Cerebras 登录页发送 magic link（Stytch）"""
        try:
            client = httpx.Client(timeout=20, follow_redirects=True)

            r = client.post(
                "https://stytch.cerebras.ai/v1/magic_links/email/login_or_create",
                json={
                    "email": email,
                    "login_magic_link_url": f"{CEREBRAS_CLOUD}/authn/verify",
                    "signup_magic_link_url": f"{CEREBRAS_CLOUD}/authn/verify",
                    "login_expiration_minutes": 60,
                    "signup_expiration_minutes": 60,
                },
                headers={
                    "Content-Type": "application/json",
                    "Origin": CEREBRAS_CLOUD,
                    "Referer": f"{CEREBRAS_CLOUD}/",
                },
            )
            client.close()

            if r.status_code in (200, 201):
                return True

            log.warning(f"[cerebras] Stytch 返回 {r.status_code}: {r.text[:200]}")

            client2 = httpx.Client(timeout=20, follow_redirects=True)
            r2 = client2.get(f"{CEREBRAS_CLOUD}/api/auth/send-magic-link?email={email}")
            client2.close()
            return r2.status_code in (200, 201, 204)

        except Exception as e:
            log.error(f"[cerebras] 发送 magic link 异常: {e}")
            return False

    def _authenticate_magic_link(self, magic_link: str) -> Optional[Dict]:
        """访问 magic link，完成认证，获取 session"""
        try:
            client = httpx.Client(timeout=30, follow_redirects=True)
            r = client.get(magic_link)
            cookies = dict(client.cookies)
            headers_out = dict(r.headers)
            client.close()

            session_token = cookies.get("stytch_session") or cookies.get("session")
            if session_token:
                return {"session_token": session_token, "cookies": cookies}

            for cookie_name, cookie_val in cookies.items():
                if "session" in cookie_name.lower() or "token" in cookie_name.lower():
                    return {"session_token": cookie_val, "cookies": cookies}

            if r.status_code in (200, 302):
                return {"cookies": cookies, "session_token": "from_redirect"}

            return None

        except Exception as e:
            log.error(f"[cerebras] magic link 认证异常: {e}")
            return None

    def _create_api_key(self, session: Dict) -> Optional[str]:
        """使用 session 创建 Cerebras API Key"""
        cookies = session.get("cookies", {})

        try:
            client = httpx.Client(timeout=20, cookies=cookies, follow_redirects=True)

            key_name = f"karuo-auto-{int(time.time())}"
            r = client.post(
                f"{CEREBRAS_CLOUD}/api/api-keys",
                json={"name": key_name},
                headers={
                    "Content-Type": "application/json",
                    "Origin": CEREBRAS_CLOUD,
                    "Referer": f"{CEREBRAS_CLOUD}/api-keys",
                },
            )

            if r.status_code in (200, 201):
                data = r.json()
                api_key = data.get("key") or data.get("api_key") or data.get("secret")
                if api_key:
                    client.close()
                    return api_key

            r2 = client.get(f"{CEREBRAS_CLOUD}/api/api-keys")
            if r2.status_code == 200:
                keys_data = r2.json()
                if isinstance(keys_data, list) and keys_data:
                    for k in keys_data:
                        key_val = k.get("key") or k.get("api_key") or k.get("secret")
                        if key_val and key_val.startswith("csk-"):
                            client.close()
                            return key_val

            client.close()
            return None

        except Exception as e:
            log.error(f"[cerebras] 创建 API Key 异常: {e}")
            return None

    @staticmethod
    def verify_key(api_key: str, model: str = "llama3.1-8b") -> Tuple[bool, str, float]:
        """验证 Cerebras Key 是否可用"""
        t0 = time.time()
        try:
            r = httpx.post(
                "https://api.cerebras.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Hi, reply ok"}],
                    "max_tokens": 5,
                },
                timeout=15,
            )
            elapsed = (time.time() - t0) * 1000
            if r.status_code == 200:
                reply = r.json()["choices"][0]["message"]["content"].strip()[:20]
                return True, reply, elapsed
            return False, f"HTTP {r.status_code}: {r.text[:80]}", elapsed
        except Exception as e:
            return False, str(e)[:80], (time.time() - t0) * 1000
