"""
OpenAI (Codex) 自动注册 Provider
纯 API 模式 — 模拟 OAuth 2.0 + PKCE 注册流程，不需要浏览器。
参考: github.com/Ethan-W20/openai-auto-register
"""

import json
import time
import secrets
import urllib.parse
import base64
import logging
from typing import Optional

from curl_cffi import requests as cffi_requests

from .base_provider import (
    BaseProvider, AccountResult, EmailService, AccountStorage,
    random_name, random_password, random_birthday, create_pkce_pair,
)

log = logging.getLogger("auto_register")

OAI_AUTH_URL = "https://auth.openai.com/oauth/authorize"
OAI_SENTINEL_URL = "https://sentinel.openai.com/backend-api/sentinel/req"
OAI_SIGNUP_URL = "https://auth.openai.com/api/accounts/authorize/continue"
OAI_SEND_OTP_URL = "https://auth.openai.com/api/accounts/passwordless/send-otp"
OAI_VERIFY_OTP_URL = "https://auth.openai.com/api/accounts/email-otp/validate"
OAI_CREATE_URL = "https://auth.openai.com/api/accounts/create_account"
OAI_WORKSPACE_URL = "https://auth.openai.com/api/accounts/workspace/select"
OAI_TOKEN_URL = "https://auth.openai.com/oauth/token"

OAI_CLIENT_ID = "DRivsnm2Mu42T3KOpqdtwB3NYviHYzwD"
LOCAL_REDIRECT_URI = "http://localhost:1455/auth/callback"

BROWSER_IMPERSONATES = [
    "chrome120", "chrome124", "chrome131",
    "safari17_0", "safari18_0",
]


class OpenAIProvider(BaseProvider):
    PROVIDER_NAME = "openai"

    def __init__(self, config: dict, email_service: EmailService, storage: AccountStorage):
        super().__init__(config, email_service, storage)
        self.provider_config = config.get("providers", {}).get("openai", {})

    def _create_session(self) -> cffi_requests.Session:
        impersonate = secrets.choice(BROWSER_IMPERSONATES)
        session = cffi_requests.Session(impersonate=impersonate)
        session.headers.update({
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "User-Agent": f"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        })
        proxy = self.config.get("proxy", {})
        if proxy.get("enabled"):
            proxy_url = f"{proxy['type']}://"
            if proxy.get("username"):
                proxy_url += f"{proxy['username']}:{proxy['password']}@"
            proxy_url += f"{proxy['host']}:{proxy['port']}"
            session.proxies = {"http": proxy_url, "https": proxy_url}
        return session

    def register(self) -> Optional[AccountResult]:
        email, email_ctx = self.email_service.generate_email()
        log.info(f"[OpenAI] 开始注册: {email}")

        session = self._create_session()

        try:
            # Step 1: OAuth 授权
            verifier, challenge = create_pkce_pair()
            state = secrets.token_urlsafe(16)
            query = urllib.parse.urlencode({
                "client_id": self.provider_config.get("client_id", OAI_CLIENT_ID),
                "response_type": "code",
                "redirect_uri": self.provider_config.get("redirect_uri", LOCAL_REDIRECT_URI),
                "scope": "openid email profile offline_access",
                "state": state,
                "code_challenge": challenge,
                "code_challenge_method": "S256",
                "prompt": "login",
                "id_token_add_organizations": "true",
                "codex_cli_simplified_flow": "true",
            })
            auth_url = f"{OAI_AUTH_URL}?{query}"
            resp = session.get(auth_url, allow_redirects=True)
            log.info(f"  [1/9] OAuth 授权: {resp.status_code}")

            device_id = ""
            for cookie in session.cookies:
                if cookie.name == "oai-did":
                    device_id = cookie.value
                    break

            # Step 2: Sentinel 反bot token
            sentinel_body = {"p": "", "id": device_id, "flow": "authorize_continue"}
            resp = session.post(
                OAI_SENTINEL_URL, json=sentinel_body,
                headers={
                    "Origin": "https://sentinel.openai.com",
                    "Referer": "https://sentinel.openai.com/backend-api/sentinel/frame.html",
                },
            )
            sentinel_token = resp.json()["token"]
            sentinel_header = json.dumps({
                "p": "", "t": "", "c": sentinel_token,
                "id": device_id, "flow": "authorize_continue",
            })
            log.info(f"  [2/9] Sentinel token 获取成功")

            # Step 3: 提交邮箱
            resp = session.post(
                OAI_SIGNUP_URL,
                json={"username": {"value": email, "kind": "email"}, "screen_hint": "signup"},
                headers={
                    "Referer": "https://auth.openai.com/create-account",
                    "openai-sentinel-token": sentinel_header,
                },
            )
            step3_data = resp.json()
            page_type = step3_data.get("page", {}).get("type", "")
            is_existing = page_type == "email_otp_verification"
            log.info(f"  [3/9] 提交邮箱: page_type={page_type}")

            # Step 4: 发送 OTP
            if not is_existing:
                resp = session.post(
                    OAI_SEND_OTP_URL, json={},
                    headers={"Referer": "https://auth.openai.com/create-account/password"},
                )
                if resp.status_code != 200:
                    log.error(f"  [4/9] 发送 OTP 失败: {resp.status_code}")
                    return None
            log.info(f"  [4/9] OTP 已发送")

            # Step 5: 等待验证码
            code = self.email_service.wait_for_code(
                email, email_ctx,
                timeout=self.config.get("registration", {}).get("otp_timeout", 120),
            )
            if not code:
                log.error(f"  [5/9] 验证码获取超时")
                return None
            log.info(f"  [5/9] 验证码: {code}")

            # Step 6: 验证 OTP
            resp = session.post(
                OAI_VERIFY_OTP_URL, json={"code": code},
                headers={"Referer": "https://auth.openai.com/email-verification"},
            )
            if resp.status_code != 200:
                log.error(f"  [6/9] OTP 验证失败: {resp.status_code}")
                return None
            log.info(f"  [6/9] OTP 验证通过")

            # Step 7: 创建账号
            first, last = random_name()
            name = f"{first} {last}"
            birthday = random_birthday()
            if not is_existing:
                resp = session.post(
                    OAI_CREATE_URL,
                    json={"name": name, "birthdate": birthday},
                    headers={"Referer": "https://auth.openai.com/about-you"},
                )
                log.info(f"  [7/9] 创建账号: {name}")
            else:
                log.info(f"  [7/9] 跳过（已存在）")

            # Step 8: 选择 Workspace
            auth_cookie = ""
            for cookie in session.cookies:
                if cookie.name == "oai-client-auth-session":
                    auth_cookie = cookie.value
                    break
            workspace_id = None
            if auth_cookie:
                try:
                    b64 = auth_cookie.split(".")[0]
                    padding = "=" * ((4 - len(b64) % 4) % 4)
                    data = json.loads(base64.b64decode(b64 + padding))
                    workspaces = data.get("workspaces", [])
                    if workspaces:
                        workspace_id = workspaces[0]["id"]
                except Exception:
                    pass

            if workspace_id:
                resp = session.post(
                    OAI_WORKSPACE_URL, json={"workspace_id": workspace_id},
                    headers={"Referer": "https://auth.openai.com/sign-in-with-chatgpt/codex/consent"},
                )
                continue_url = resp.json().get("continue_url", "")
                log.info(f"  [8/9] Workspace 选择完成")
            else:
                log.warning(f"  [8/9] 未找到 workspace_id，尝试继续...")
                continue_url = ""

            # Step 9: 跟随重定向 → 获取 code → 兑换 Token
            if continue_url:
                resp = session.get(continue_url, allow_redirects=False)
                redirect_chain = [resp]
                while resp.status_code in (301, 302, 303, 307, 308) and len(redirect_chain) < 12:
                    loc = resp.headers.get("Location", "")
                    if loc.startswith("http://localhost"):
                        callback_url = loc
                        break
                    resp = session.get(loc, allow_redirects=False)
                    redirect_chain.append(resp)
                else:
                    callback_url = resp.headers.get("Location", resp.url)

                parsed = urllib.parse.urlparse(callback_url)
                qs = urllib.parse.parse_qs(parsed.query)
                auth_code = qs.get("code", [""])[0]

                if auth_code:
                    resp = session.post(OAI_TOKEN_URL, data={
                        "grant_type": "authorization_code",
                        "client_id": self.provider_config.get("client_id", OAI_CLIENT_ID),
                        "code": auth_code,
                        "redirect_uri": self.provider_config.get("redirect_uri", LOCAL_REDIRECT_URI),
                        "code_verifier": verifier,
                    })
                    token_data = resp.json()
                    log.info(f"  [9/9] Token 兑换成功!")

                    return AccountResult(
                        provider="openai",
                        email=email,
                        password="",
                        api_key="",
                        access_token=token_data.get("access_token", ""),
                        refresh_token=token_data.get("refresh_token", ""),
                        account_id="",
                        name=name,
                        extra={
                            "id_token": token_data.get("id_token", ""),
                            "workspace_id": workspace_id or "",
                        },
                    )

            log.error(f"  [9/9] Token 兑换失败：无法获取 authorization code")
            return None

        except Exception as e:
            log.error(f"[OpenAI] 注册异常: {e}")
            return None
        finally:
            session.close()
