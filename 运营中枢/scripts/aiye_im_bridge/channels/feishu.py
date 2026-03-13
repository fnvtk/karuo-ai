"""
艾叶 IM Bridge — 飞书通道
对接方式：飞书应用事件订阅（接收 im.message.receive_v1 事件）

配置项：
  app_id:            飞书应用 App ID
  app_secret:        飞书应用 App Secret
  verification_token: 事件订阅验证 Token
  encrypt_key:       事件加密密钥（可选）

Webhook: POST /webhook/feishu
"""
from __future__ import annotations

import json
import logging
import time
from typing import Any

import httpx
from fastapi import Request

from core.channel_base import ChannelBase, InboundMessage, MessageType, OutboundMessage

logger = logging.getLogger("aiye.channel.feishu")


class FeishuChannel(ChannelBase):
    """飞书通道"""

    _tenant_access_token: str = ""
    _token_expires: float = 0

    @property
    def platform(self) -> str:
        return "feishu"

    async def start(self) -> None:
        logger.info("飞书通道已就绪，Webhook: /webhook/feishu")

    async def stop(self) -> None:
        logger.info("飞书通道已停止")

    async def _get_tenant_token(self) -> str:
        if self._tenant_access_token and time.time() < self._token_expires:
            return self._tenant_access_token
        app_id = self._config.get("app_id", "")
        app_secret = self._config.get("app_secret", "")
        if not app_id or not app_secret:
            return ""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
                    json={"app_id": app_id, "app_secret": app_secret},
                )
                data = resp.json()
                if data.get("code") == 0:
                    self._tenant_access_token = data["tenant_access_token"]
                    self._token_expires = time.time() + data.get("expire", 7200) - 300
                    return self._tenant_access_token
                logger.warning("飞书 token 获取失败: %s", data)
        except Exception as e:
            logger.error("飞书 token 异常: %s", e)
        return ""

    async def send(self, msg: OutboundMessage) -> bool:
        token = await self._get_tenant_token()
        if not token:
            logger.warning("飞书无 tenant_access_token，无法发送")
            return False

        receive_id_type = msg.extra.get("receive_id_type", "open_id")
        payload = {
            "receive_id": msg.chat_id,
            "msg_type": "text",
            "content": json.dumps({"text": msg.content}, ensure_ascii=False),
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type={receive_id_type}",
                    json=payload,
                    headers={"Authorization": f"Bearer {token}"},
                )
                data = resp.json()
                if data.get("code") == 0:
                    return True
                logger.warning("飞书发送失败: %s", data)
        except Exception as e:
            logger.error("飞书发送异常: %s", e)
        return False

    def register_routes(self, app: Any) -> None:
        channel = self
        _processed_ids: set = set()

        @app.post("/webhook/feishu")
        async def feishu_webhook(request: Request):
            try:
                data = await request.json()
            except Exception:
                return {"code": 400}

            # URL 验证（飞书后台配置回调时调用）
            if data.get("type") == "url_verification":
                return {"challenge": data.get("challenge", "")}

            # 事件回调
            header = data.get("header", {})
            event = data.get("event", {})
            event_type = header.get("event_type", "")

            if event_type != "im.message.receive_v1":
                return {"code": 0}

            message = event.get("message", {})
            msg_id = message.get("message_id", "")
            if msg_id in _processed_ids:
                return {"code": 0}
            _processed_ids.add(msg_id)
            if len(_processed_ids) > 1000:
                _processed_ids.clear()

            msg_type = message.get("message_type", "")
            sender = event.get("sender", {}).get("sender_id", {})
            open_id = sender.get("open_id", "")
            chat_id = message.get("chat_id", "") or open_id

            content_str = message.get("content", "{}")
            try:
                content_obj = json.loads(content_str)
                text = content_obj.get("text", "")
            except Exception:
                text = content_str

            if msg_type != "text" or not text.strip():
                return {"code": 0}

            # 去掉 @bot 的 mention
            mentions = message.get("mentions", [])
            for m in mentions:
                key = m.get("key", "")
                if key:
                    text = text.replace(key, "").strip()

            inbound = InboundMessage(
                channel_id=channel.channel_id,
                platform=channel.platform,
                sender_id=open_id,
                chat_id=chat_id,
                content=text,
                raw=data,
            )

            reply = await channel.dispatch(inbound)
            if reply:
                reply.extra["receive_id_type"] = (
                    "chat_id" if message.get("chat_type") == "group" else "open_id"
                )
                await channel.send(reply)
            return {"code": 0}
