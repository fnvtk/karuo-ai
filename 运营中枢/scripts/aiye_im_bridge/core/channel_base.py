"""
艾叶 IM Bridge — Channel 基类
每个通道（微信/飞书/WhatsApp等）继承此类，实现统一的消息收发接口。
参考 OpenClaw Channel Layer 设计：平台差异在适配器内部消化，对外暴露统一结构。
"""
from __future__ import annotations

import abc
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Coroutine, Optional


class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VOICE = "voice"
    VIDEO = "video"
    FILE = "file"
    LOCATION = "location"
    LINK = "link"
    SYSTEM = "system"


@dataclass
class InboundMessage:
    """从平台收到的标准化消息（Channel → Router）"""

    channel_id: str
    platform: str
    sender_id: str
    sender_name: str = ""
    chat_id: str = ""
    chat_name: str = ""
    content: str = ""
    msg_type: MessageType = MessageType.TEXT
    media_url: str = ""
    raw: dict = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)


@dataclass
class OutboundMessage:
    """发往平台的标准化回复（Router → Channel）"""

    channel_id: str
    platform: str
    chat_id: str
    content: str = ""
    msg_type: MessageType = MessageType.TEXT
    media_url: str = ""
    extra: dict = field(default_factory=dict)


MessageHandler = Callable[[InboundMessage], Coroutine[Any, Any, Optional[OutboundMessage]]]


class ChannelBase(abc.ABC):
    """
    通道抽象基类。

    生命周期：
      configure(cfg) → start() → [运行中: on_message 回调] → stop()

    子类必须实现：
      - platform   (属性) 平台标识
      - start()    启动连接 / 注册 webhook
      - stop()     断开
      - send()     发送消息
      - register_routes(app)  注册 FastAPI 路由（webhook 回调）
    """

    def __init__(self, channel_id: str):
        self.channel_id = channel_id
        self._handler: Optional[MessageHandler] = None
        self._config: dict = {}

    @property
    @abc.abstractmethod
    def platform(self) -> str:
        ...

    def configure(self, cfg: dict) -> None:
        self._config = cfg

    def on_message(self, handler: MessageHandler) -> None:
        self._handler = handler

    async def dispatch(self, msg: InboundMessage) -> Optional[OutboundMessage]:
        if self._handler:
            return await self._handler(msg)
        return None

    @abc.abstractmethod
    async def start(self) -> None:
        ...

    @abc.abstractmethod
    async def stop(self) -> None:
        ...

    @abc.abstractmethod
    async def send(self, msg: OutboundMessage) -> bool:
        ...

    def register_routes(self, app: Any) -> None:
        """子类可覆盖，向 FastAPI app 注册 webhook 路由。"""
        pass

    @property
    def status(self) -> dict:
        return {
            "channel_id": self.channel_id,
            "platform": self.platform,
            "configured": bool(self._config),
        }
