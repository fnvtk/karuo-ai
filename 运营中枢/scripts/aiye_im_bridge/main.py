"""
艾叶 IM Bridge — 主入口
多平台 IM 消息网关，通过卡若AI网关为所有接入平台提供 AI 对话能力。

架构（参考 OpenClaw 三层设计）：
  个人微信 / 企业微信 / 飞书 / WhatsApp / 网页
                    │
          ┌─────────▼─────────┐
          │   艾叶 IM Bridge   │  ← Channel Layer
          │   (FastAPI:18900)  │
          └─────────┬─────────┘
                    │ HTTP
          ┌─────────▼─────────┐
          │  卡若AI 网关       │  ← LLM Layer
          │  (FastAPI:18080)   │
          └───────────────────┘

启动：
  python main.py
  # 或
  uvicorn main:app --host 0.0.0.0 --port 18900
"""
from __future__ import annotations

import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List

import yaml
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from core.bridge import KaruoGatewayBridge
from core.channel_base import ChannelBase
from core.router import MessageRouter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("aiye")

CONFIG_PATH = Path(__file__).parent / "config" / "channels.yaml"
DEFAULT_PORT = 18900

# ── Channel 注册表 ──────────────────────────────────────────
CHANNEL_REGISTRY: Dict[str, type] = {}


def _register_channels() -> None:
    from channels.wechat_personal import WeChatPersonalChannel
    from channels.wechat_work import WeChatWorkChannel
    from channels.feishu import FeishuChannel
    from channels.whatsapp import WhatsAppChannel
    from channels.web import WebChannel

    CHANNEL_REGISTRY["wechat_personal"] = WeChatPersonalChannel
    CHANNEL_REGISTRY["wechat_work"] = WeChatWorkChannel
    CHANNEL_REGISTRY["feishu"] = FeishuChannel
    CHANNEL_REGISTRY["whatsapp"] = WhatsAppChannel
    CHANNEL_REGISTRY["web"] = WebChannel


def _load_config() -> Dict[str, Any]:
    env_path = os.environ.get("AIYE_CONFIG", "").strip()
    p = Path(env_path) if env_path else CONFIG_PATH
    if not p.exists():
        logger.warning("配置文件不存在: %s，使用默认配置（仅网页通道）", p)
        return {"channels": {"web": {"enabled": True}}}
    return yaml.safe_load(p.read_text(encoding="utf-8")) or {}


# ── 全局状态 ────────────────────────────────────────────────
active_channels: List[ChannelBase] = []
router: MessageRouter | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global router
    _register_channels()
    cfg = _load_config()

    gateway_cfg = cfg.get("gateway", {})
    bridge = KaruoGatewayBridge(
        gateway_url=gateway_cfg.get("url", ""),
        api_key=gateway_cfg.get("api_key", ""),
        timeout=gateway_cfg.get("timeout", 0),
    )
    router = MessageRouter(bridge)

    channels_cfg = cfg.get("channels", {})
    for ch_key, ch_cfg in channels_cfg.items():
        if not isinstance(ch_cfg, dict):
            continue
        if not ch_cfg.get("enabled", True):
            continue
        cls = CHANNEL_REGISTRY.get(ch_key)
        if not cls:
            logger.warning("未知通道: %s，跳过", ch_key)
            continue

        channel = cls(channel_id=ch_key)
        channel.configure(ch_cfg)
        channel.on_message(router.handle)
        channel.register_routes(app)
        await channel.start()
        active_channels.append(channel)
        logger.info("✓ 通道已启动: %s (%s)", ch_key, channel.platform)

    logger.info("艾叶 IM Bridge 启动完成，%d 个通道就绪", len(active_channels))
    yield

    for ch in active_channels:
        try:
            await ch.stop()
        except Exception as e:
            logger.warning("通道停止异常 %s: %s", ch.channel_id, e)
    active_channels.clear()
    logger.info("艾叶 IM Bridge 已停止")


app = FastAPI(
    title="艾叶 IM Bridge",
    description="卡若AI 多平台 IM 消息网关 — 让任何聊天平台都能与卡若AI对话",
    version="1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 管理接口 ────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
def index():
    return """<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>艾叶 IM Bridge</title>
<style>
body{font-family:-apple-system,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#333}
h1{background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
.badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:13px;margin:2px}
.on{background:#e6f7e6;color:#2d8c2d} .off{background:#f5f5f5;color:#999}
a{color:#667eea;text-decoration:none}
</style></head><body>
<h1>艾叶 IM Bridge</h1>
<p>卡若AI 多平台 IM 消息网关 — 让任何聊天平台都能与卡若AI对话</p>
<p><a href="/status">→ 查看通道状态</a> | <a href="/chat">→ 网页聊天</a> | <a href="/docs">→ API 文档</a></p>
</body></html>"""


@app.get("/status")
def status():
    return {
        "service": "aiye_im_bridge",
        "version": "1.0",
        "active_channels": [ch.status for ch in active_channels],
        "sessions_active": router.sessions.active_count if router else 0,
    }


@app.get("/health")
def health():
    return {"ok": True, "channels": len(active_channels)}


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("AIYE_PORT", str(DEFAULT_PORT)))
    uvicorn.run(app, host="0.0.0.0", port=port)
