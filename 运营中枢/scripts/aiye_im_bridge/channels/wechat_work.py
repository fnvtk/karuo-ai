"""
艾叶 IM Bridge — 企业微信通道
对接方式：企业微信应用消息回调（接收消息事件 + 被动回复 / 主动发消息 API）

配置项：
  corp_id:     企业 ID
  agent_id:    应用 AgentId
  secret:      应用 Secret
  token:       回调 Token（用于验签）
  encoding_aes_key: 回调 EncodingAESKey（用于解密）

Webhook: POST /webhook/wechat_work
验证:    GET  /webhook/wechat_work?echostr=xxx&msg_signature=xxx&timestamp=xxx&nonce=xxx
"""
from __future__ import annotations

import hashlib
import logging
import time
from typing import Any, Optional
from xml.etree import ElementTree

import httpx
from fastapi import Request, Response

from core.channel_base import ChannelBase, InboundMessage, MessageType, OutboundMessage

logger = logging.getLogger("aiye.channel.wechat_work")


class WeChatWorkChannel(ChannelBase):
    """企业微信通道"""

    _access_token: str = ""
    _token_expires: float = 0

    @property
    def platform(self) -> str:
        return "wechat_work"

    async def start(self) -> None:
        logger.info("企业微信通道已就绪，Webhook: /webhook/wechat_work")

    async def stop(self) -> None:
        logger.info("企业微信通道已停止")

    async def _get_access_token(self) -> str:
        if self._access_token and time.time() < self._token_expires:
            return self._access_token
        corp_id = self._config.get("corp_id", "")
        secret = self._config.get("secret", "")
        if not corp_id or not secret:
            return ""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "https://qyapi.weixin.qq.com/cgi-bin/gettoken",
                    params={"corpid": corp_id, "corpsecret": secret},
                )
                data = resp.json()
                if data.get("errcode", 0) == 0:
                    self._access_token = data["access_token"]
                    self._token_expires = time.time() + data.get("expires_in", 7200) - 300
                    return self._access_token
                logger.warning("获取企业微信 access_token 失败: %s", data)
        except Exception as e:
            logger.error("获取企业微信 access_token 异常: %s", e)
        return ""

    async def send(self, msg: OutboundMessage) -> bool:
        token = await self._get_access_token()
        if not token:
            logger.warning("企业微信无 access_token，无法发送")
            return False
        agent_id = self._config.get("agent_id", "")
        payload = {
            "touser": msg.chat_id,
            "msgtype": "text",
            "agentid": agent_id,
            "text": {"content": msg.content},
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token={token}",
                    json=payload,
                )
                data = resp.json()
                if data.get("errcode", 0) == 0:
                    return True
                logger.warning("企业微信发送失败: %s", data)
        except Exception as e:
            logger.error("企业微信发送异常: %s", e)
        return False

    def _verify_signature(self, token: str, timestamp: str, nonce: str, signature: str) -> bool:
        cfg_token = self._config.get("token", "")
        if not cfg_token:
            return True
        items = sorted([cfg_token, timestamp, nonce])
        sha1 = hashlib.sha1("".join(items).encode("utf-8")).hexdigest()
        return sha1 == signature

    def register_routes(self, app: Any) -> None:
        channel = self

        @app.get("/webhook/wechat_work")
        async def wechat_work_verify(
            msg_signature: str = "",
            timestamp: str = "",
            nonce: str = "",
            echostr: str = "",
        ):
            """URL 验证（企业微信后台配置回调时调用）"""
            if channel._verify_signature(
                channel._config.get("token", ""), timestamp, nonce, msg_signature
            ):
                return Response(content=echostr, media_type="text/plain")
            return Response(content="forbidden", status_code=403)

        @app.post("/webhook/wechat_work")
        async def wechat_work_webhook(request: Request):
            """接收企业微信消息事件"""
            body = await request.body()
            try:
                root = ElementTree.fromstring(body)
                msg_type = (root.findtext("MsgType") or "").strip()
                from_user = (root.findtext("FromUserName") or "").strip()
                content = (root.findtext("Content") or "").strip()
            except Exception:
                try:
                    data = await request.json()
                    msg_type = data.get("MsgType", "text")
                    from_user = data.get("FromUserName", "")
                    content = data.get("Content", "")
                except Exception:
                    return Response(content="", media_type="text/xml")

            if msg_type != "text" or not content:
                return Response(content="", media_type="text/xml")

            inbound = InboundMessage(
                channel_id=channel.channel_id,
                platform=channel.platform,
                sender_id=from_user,
                chat_id=from_user,
                content=content,
                raw={"body": body.decode("utf-8", errors="replace")},
            )

            reply = await channel.dispatch(inbound)
            if reply:
                await channel.send(reply)
            return Response(content="", media_type="text/xml")
