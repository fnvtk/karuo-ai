"""
艾叶 IM Bridge — 消息路由
接收所有通道的标准化消息 → 查/建会话 → 调用网关 → 构造回复。
"""
from __future__ import annotations

import logging
from typing import Optional

from .bridge import KaruoGatewayBridge
from .channel_base import InboundMessage, MessageType, OutboundMessage
from .session import SessionManager

logger = logging.getLogger("aiye.router")

COMMANDS = {
    "/reset": "重置当前对话上下文",
    "/status": "查看当前会话状态",
    "/help": "查看可用命令",
}


class MessageRouter:
    """统一消息路由器：Channel → Session → Gateway → Reply"""

    def __init__(self, bridge: KaruoGatewayBridge):
        self.sessions = SessionManager()
        self.bridge = bridge

    async def handle(self, msg: InboundMessage) -> Optional[OutboundMessage]:
        if msg.msg_type != MessageType.TEXT or not msg.content.strip():
            return None

        text = msg.content.strip()
        session = self.sessions.get_or_create(
            channel_id=msg.channel_id,
            platform=msg.platform,
            chat_id=msg.chat_id or msg.sender_id,
            user_id=msg.sender_id,
            user_name=msg.sender_name,
        )

        if text.startswith("/"):
            reply = self._handle_command(text, session)
        else:
            logger.info(
                "[%s:%s] %s: %s",
                msg.platform,
                msg.chat_id or msg.sender_id,
                msg.sender_name or msg.sender_id,
                text[:80],
            )
            reply = await self.bridge.ask(text, session)

        return OutboundMessage(
            channel_id=msg.channel_id,
            platform=msg.platform,
            chat_id=msg.chat_id or msg.sender_id,
            content=reply,
        )

    @staticmethod
    def _handle_command(text: str, session) -> str:
        cmd = text.split()[0].lower()
        if cmd == "/reset":
            session.reset()
            return "对话已重置，可以开始新话题了。"
        if cmd == "/status":
            return (
                f"平台: {session.platform}\n"
                f"会话: {session.session_id}\n"
                f"历史轮数: {len(session.history)}\n"
                f"用户: {session.user_name or session.user_id}"
            )
        if cmd == "/help":
            lines = ["艾叶 IM 可用命令："]
            for c, desc in COMMANDS.items():
                lines.append(f"  {c} — {desc}")
            return "\n".join(lines)
        return f"未知命令: {cmd}。输入 /help 查看可用命令。"
