"""
艾叶 IM Bridge — 会话管理
维护每个用户/群组的对话历史，支持上下文续接与过期清理。
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Dict, List, Tuple

# 会话默认 30 分钟过期（无消息则重置上下文）
SESSION_TTL_SECONDS = 1800
MAX_HISTORY_TURNS = 20


@dataclass
class Session:
    session_id: str
    channel_id: str
    platform: str
    chat_id: str
    user_id: str
    user_name: str = ""
    history: List[Tuple[str, str]] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    last_active: float = field(default_factory=time.time)

    @property
    def is_expired(self) -> bool:
        return (time.time() - self.last_active) > SESSION_TTL_SECONDS

    def add_turn(self, user_msg: str, ai_reply: str) -> None:
        self.history.append((user_msg, ai_reply))
        if len(self.history) > MAX_HISTORY_TURNS:
            self.history = self.history[-MAX_HISTORY_TURNS:]
        self.last_active = time.time()

    def reset(self) -> None:
        self.history.clear()
        self.last_active = time.time()

    def context_summary(self) -> str:
        if not self.history:
            return ""
        lines = []
        for user_msg, ai_reply in self.history[-5:]:
            lines.append(f"用户: {user_msg}")
            lines.append(f"AI: {ai_reply}")
        return "\n".join(lines)


class SessionManager:
    """内存级会话池，按 session_id 索引。"""

    def __init__(self) -> None:
        self._sessions: Dict[str, Session] = {}

    def _make_id(self, platform: str, chat_id: str, user_id: str) -> str:
        return f"{platform}:{chat_id}:{user_id}"

    def get_or_create(
        self,
        channel_id: str,
        platform: str,
        chat_id: str,
        user_id: str,
        user_name: str = "",
    ) -> Session:
        sid = self._make_id(platform, chat_id, user_id)
        session = self._sessions.get(sid)
        if session and session.is_expired:
            session.reset()
        if not session:
            session = Session(
                session_id=sid,
                channel_id=channel_id,
                platform=platform,
                chat_id=chat_id,
                user_id=user_id,
                user_name=user_name,
            )
            self._sessions[sid] = session
        return session

    def cleanup_expired(self) -> int:
        expired = [k for k, v in self._sessions.items() if v.is_expired]
        for k in expired:
            del self._sessions[k]
        return len(expired)

    @property
    def active_count(self) -> int:
        return sum(1 for v in self._sessions.values() if not v.is_expired)
