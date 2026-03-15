"""
Google Gemini API Key 自动注册 Provider
浏览器模式 — Google Cloud Console 创建项目 + 启用 Gemini API + 生成 Key。
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

GOOGLE_SIGNUP_URL = "https://accounts.google.com/signup/v2/createaccount"
AI_STUDIO_URL = "https://aistudio.google.com/app/apikey"


class GeminiProvider(BaseProvider):
    """
    Gemini 注册流程:
    1. 注册 Google 账号（需手机号或直接用已有 Google 邮箱）
    2. 访问 AI Studio → 创建 API Key
    3. 提取 Key

    注意: Google 注册强制手机验证，纯自动化难度极高。
    推荐策略: 手动创建多个 Google 账号 → 本工具自动轮换多 Key。
    """
    PROVIDER_NAME = "gemini"

    def __init__(self, config: dict, email_service: EmailService, storage: AccountStorage):
        super().__init__(config, email_service, storage)
        self.provider_config = config.get("providers", {}).get("gemini", {})

    def register(self) -> Optional[AccountResult]:
        log.warning(
            "[Gemini] Google 注册需要手机号验证，全自动注册受限。\n"
            "  推荐: 手动注册 Google 账号 → 用 add_key 命令添加已有 Key。\n"
            "  或: 使用 Hydra-gemini 项目聚合多 Key 做轮换池。"
        )
        return None

    def add_existing_key(self, api_key: str, email: str = "manual@gemini") -> AccountResult:
        """手动添加已有的 Gemini API Key"""
        result = AccountResult(
            provider="gemini",
            email=email,
            api_key=api_key,
            name="manual_add",
        )
        self.storage.save(result)
        log.info(f"[Gemini] 手动添加 Key: {api_key[:16]}...")
        return result
