"""
艾叶 IM Bridge — WhatsApp 通道
对接方式：
  1. WhatsApp Business API (Cloud API) — Webhook 回调
  2. 可扩展对接 OpenClaw/Moltbot Gateway 的 WebSocket

当前实现：WhatsApp Cloud API Webhook 模式

配置项：
  phone_number_id:  WhatsApp Business 电话号码 ID
  access_token:     Meta Graph API 长期令牌
  verify_token:     Webhook 验证令牌（自定义字符串）
  api_version:      Graph API 版本（默认 v21.0）

Webhook: POST /webhook/whatsapp
验证:    GET  /webhook/whatsapp
"""
from __future__ import annotations

import logging
from typing import Any

import httpx
from fastapi import Request, Response

from core.channel_base import ChannelBase, InboundMessage, MessageType, OutboundMessage

logger = logging.getLogger("aiye.channel.whatsapp")


class WhatsAppChannel(ChannelBase):
    """WhatsApp Cloud API 通道"""

    @property
    def platform(self) -> str:
        return "whatsapp"

    async def start(self) -> None:
        logger.info("WhatsApp 通道已就绪，Webhook: /webhook/whatsapp")

    async def stop(self) -> None:
        logger.info("WhatsApp 通道已停止")

    async def send(self, msg: OutboundMessage) -> bool:
        phone_id = self._config.get("phone_number_id", "")
        token = self._config.get("access_token", "")
        api_ver = self._config.get("api_version", "v21.0")
        if not phone_id or not token:
            logger.warning("WhatsApp 未配置 phone_number_id / access_token")
            return False

        url = f"https://graph.facebook.com/{api_ver}/{phone_id}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": msg.chat_id,
            "type": "text",
            "text": {"body": msg.content},
        }
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    url,
                    json=payload,
                    headers={"Authorization": f"Bearer {token}"},
                )
                if resp.status_code == 200:
                    return True
                logger.warning("WhatsApp 发送失败: %d %s", resp.status_code, resp.text[:200])
        except Exception as e:
            logger.error("WhatsApp 发送异常: %s", e)
        return False

    def register_routes(self, app: Any) -> None:
        channel = self

        @app.get("/webhook/whatsapp")
        async def whatsapp_verify(
            request: Request,
        ):
            """Meta Webhook 验证"""
            params = request.query_params
            mode = params.get("hub.mode", "")
            token = params.get("hub.verify_token", "")
            challenge = params.get("hub.challenge", "")
            if mode == "subscribe" and token == channel._config.get("verify_token", ""):
                return Response(content=challenge, media_type="text/plain")
            return Response(content="forbidden", status_code=403)

        @app.post("/webhook/whatsapp")
        async def whatsapp_webhook(request: Request):
            try:
                data = await request.json()
            except Exception:
                return {"status": "error"}

            entries = data.get("entry", [])
            for entry in entries:
                changes = entry.get("changes", [])
                for change in changes:
                    value = change.get("value", {})
                    messages = value.get("messages", [])
                    contacts = value.get("contacts", [])
                    contact_map = {
                        c.get("wa_id", ""): c.get("profile", {}).get("name", "")
                        for c in contacts
                    }

                    for wa_msg in messages:
                        msg_type = wa_msg.get("type", "")
                        from_id = wa_msg.get("from", "")
                        text = ""
                        if msg_type == "text":
                            text = wa_msg.get("text", {}).get("body", "")

                        if not text.strip():
                            continue

                        inbound = InboundMessage(
                            channel_id=channel.channel_id,
                            platform=channel.platform,
                            sender_id=from_id,
                            sender_name=contact_map.get(from_id, ""),
                            chat_id=from_id,
                            content=text,
                            raw=wa_msg,
                        )

                        reply = await channel.dispatch(inbound)
                        if reply:
                            await channel.send(reply)

            return {"status": "ok"}
