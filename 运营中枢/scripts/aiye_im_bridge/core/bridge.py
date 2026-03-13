"""
艾叶 IM Bridge — 网关桥接
将用户消息通过 HTTP 转发到卡若AI 网关 (/v1/chat)，拿到 AI 回复。
支持带会话上下文的多轮对话。
"""
from __future__ import annotations

import logging
import os
from typing import Optional

import httpx

from .session import Session

logger = logging.getLogger("aiye.bridge")

DEFAULT_GATEWAY_URL = "http://127.0.0.1:18080"
DEFAULT_TIMEOUT = 60


class KaruoGatewayBridge:
    """调用卡若AI网关获取 AI 回复。"""

    def __init__(self, gateway_url: str = "", api_key: str = "", timeout: int = 0):
        self.gateway_url = (
            gateway_url
            or os.environ.get("AIYE_GATEWAY_URL", "").strip()
            or DEFAULT_GATEWAY_URL
        ).rstrip("/")
        self.api_key = api_key or os.environ.get("AIYE_GATEWAY_KEY", "").strip()
        self.timeout = timeout or int(os.environ.get("AIYE_GATEWAY_TIMEOUT", str(DEFAULT_TIMEOUT)))

    async def ask(self, prompt: str, session: Optional[Session] = None) -> str:
        full_prompt = self._build_prompt(prompt, session)
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-Karuo-Api-Key"] = self.api_key

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    f"{self.gateway_url}/v1/chat",
                    json={"prompt": full_prompt},
                    headers=headers,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    reply = data.get("reply", "")
                    if reply and session:
                        session.add_turn(prompt, reply)
                    return reply or "抱歉，我暂时无法处理你的问题，请稍后再试。"
                logger.warning("Gateway returned %d: %s", resp.status_code, resp.text[:200])
                return f"网关返回异常（{resp.status_code}），请稍后重试。"
        except httpx.TimeoutException:
            logger.error("Gateway timeout after %ds", self.timeout)
            return "AI 处理超时，请稍后再试或缩短你的问题。"
        except Exception as e:
            logger.error("Gateway error: %s", e)
            return "连接 AI 网关失败，请检查网关是否运行中。"

    @staticmethod
    def _build_prompt(user_msg: str, session: Optional[Session]) -> str:
        if not session or not session.history:
            return user_msg
        ctx = session.context_summary()
        return f"[对话上下文]\n{ctx}\n\n[当前问题]\n{user_msg}"
