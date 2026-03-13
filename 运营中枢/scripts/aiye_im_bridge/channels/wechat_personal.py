"""
艾叶 IM Bridge — 个人微信通道
对接方式：通过 Webhook 回调接收消息（兼容存客宝、WeChatFerry、ComWeChatBot 等中间件）。
中间件负责微信协议层，艾叶只做消息收发的 HTTP 桥接。

接口约定：
  - POST /webhook/wechat_personal  接收消息推送
  - 中间件需将消息 POST 到此地址，格式见下方
  - 回复通过中间件的回调 URL 发送

消息推送格式（JSON）：
{
    "msg_id": "xxx",
    "from_user": "wxid_xxx",
    "from_name": "昵称",
    "to_user": "wxid_yyy",
    "room_id": "",             // 群聊为群 ID，私聊为空
    "room_name": "",
    "content": "你好",
    "msg_type": 1,             // 1=文本, 3=图片, 34=语音, 43=视频, 49=链接
    "timestamp": 1710000000
}
"""
from __future__ import annotations

import logging
from typing import Any

import httpx
from fastapi import Request

from core.channel_base import ChannelBase, InboundMessage, MessageType, OutboundMessage

logger = logging.getLogger("aiye.channel.wechat_personal")


class WeChatPersonalChannel(ChannelBase):
    """个人微信通道（Webhook 模式）"""

    @property
    def platform(self) -> str:
        return "wechat_personal"

    async def start(self) -> None:
        logger.info("个人微信通道已就绪，等待中间件推送消息到 /webhook/wechat_personal")

    async def stop(self) -> None:
        logger.info("个人微信通道已停止")

    async def send(self, msg: OutboundMessage) -> bool:
        callback_url = self._config.get("callback_url", "")
        if not callback_url:
            logger.warning("个人微信通道未配置 callback_url，无法发送回复")
            return False

        payload = {
            "to_user": msg.chat_id,
            "content": msg.content,
            "msg_type": "text",
        }
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(callback_url, json=payload)
                if resp.status_code == 200:
                    return True
                logger.warning("微信回复发送失败: %d %s", resp.status_code, resp.text[:100])
        except Exception as e:
            logger.error("微信回复发送异常: %s", e)
        return False

    def register_routes(self, app: Any) -> None:
        channel = self

        @app.post("/webhook/wechat_personal")
        async def wechat_personal_webhook(request: Request):
            try:
                data = await request.json()
            except Exception:
                return {"code": 400, "msg": "invalid json"}

            msg_type_map = {1: MessageType.TEXT, 3: MessageType.IMAGE, 34: MessageType.VOICE}
            wx_msg_type = data.get("msg_type", 1)

            inbound = InboundMessage(
                channel_id=channel.channel_id,
                platform=channel.platform,
                sender_id=data.get("from_user", ""),
                sender_name=data.get("from_name", ""),
                chat_id=data.get("room_id") or data.get("from_user", ""),
                chat_name=data.get("room_name", ""),
                content=data.get("content", ""),
                msg_type=msg_type_map.get(wx_msg_type, MessageType.TEXT),
                raw=data,
            )

            reply = await channel.dispatch(inbound)
            if reply:
                await channel.send(reply)
                return {"code": 0, "msg": "ok", "reply": reply.content}
            return {"code": 0, "msg": "no reply"}
