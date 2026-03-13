"""
艾叶 IM Bridge — 个人网页通道
对接方式：
  1. REST API  — POST /api/web/chat
  2. WebSocket — ws://host:port/ws/web/chat

提供即开即用的网页聊天入口，也可作为第三方系统接入的通用 API。

配置项：
  allowed_origins: ["*"]   # CORS 白名单
"""
from __future__ import annotations

import json
import logging
import uuid
from typing import Any, Dict, Set

from fastapi import Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

from core.channel_base import ChannelBase, InboundMessage, MessageType, OutboundMessage

logger = logging.getLogger("aiye.channel.web")


class WebChannel(ChannelBase):
    """个人网页通道（REST + WebSocket）"""

    _ws_connections: Dict[str, WebSocket] = {}

    @property
    def platform(self) -> str:
        return "web"

    async def start(self) -> None:
        logger.info("网页通道已就绪，API: /api/web/chat | WS: /ws/web/chat")

    async def stop(self) -> None:
        for ws in self._ws_connections.values():
            try:
                await ws.close()
            except Exception:
                pass
        self._ws_connections.clear()
        logger.info("网页通道已停止")

    async def send(self, msg: OutboundMessage) -> bool:
        ws = self._ws_connections.get(msg.chat_id)
        if ws:
            try:
                await ws.send_json({"type": "reply", "content": msg.content})
                return True
            except Exception as e:
                logger.warning("WebSocket 发送失败: %s", e)
        return True

    def register_routes(self, app: Any) -> None:
        channel = self

        @app.post("/api/web/chat")
        async def web_chat_api(request: Request):
            """REST 聊天接口：{"message": "你好", "session_id": "可选"}"""
            try:
                data = await request.json()
            except Exception:
                return {"code": 400, "msg": "invalid json"}

            message = data.get("message", "").strip()
            session_id = data.get("session_id", "") or str(uuid.uuid4())[:8]
            if not message:
                return {"code": 400, "msg": "empty message"}

            inbound = InboundMessage(
                channel_id=channel.channel_id,
                platform=channel.platform,
                sender_id=session_id,
                sender_name=data.get("name", "网页用户"),
                chat_id=session_id,
                content=message,
            )

            reply = await channel.dispatch(inbound)
            return {
                "code": 0,
                "reply": reply.content if reply else "",
                "session_id": session_id,
            }

        @app.websocket("/ws/web/chat")
        async def web_chat_ws(websocket: WebSocket):
            """WebSocket 聊天接口"""
            await websocket.accept()
            ws_id = str(uuid.uuid4())[:8]
            channel._ws_connections[ws_id] = websocket
            await websocket.send_json({"type": "connected", "session_id": ws_id})
            logger.info("WebSocket 连接: %s", ws_id)

            try:
                while True:
                    raw = await websocket.receive_text()
                    try:
                        data = json.loads(raw)
                        message = data.get("message", "").strip()
                    except Exception:
                        message = raw.strip()

                    if not message:
                        continue

                    inbound = InboundMessage(
                        channel_id=channel.channel_id,
                        platform=channel.platform,
                        sender_id=ws_id,
                        sender_name="网页用户",
                        chat_id=ws_id,
                        content=message,
                    )

                    reply = await channel.dispatch(inbound)
                    if reply:
                        await websocket.send_json({
                            "type": "reply",
                            "content": reply.content,
                        })
            except WebSocketDisconnect:
                logger.info("WebSocket 断开: %s", ws_id)
            except Exception as e:
                logger.warning("WebSocket 异常: %s", e)
            finally:
                channel._ws_connections.pop(ws_id, None)

        @app.get("/chat", response_class=HTMLResponse)
        async def web_chat_page():
            """内嵌网页聊天界面"""
            html_path = channel._config.get("html_path", "")
            if html_path:
                try:
                    from pathlib import Path

                    return Path(html_path).read_text(encoding="utf-8")
                except Exception:
                    pass
            return _DEFAULT_CHAT_HTML


_DEFAULT_CHAT_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>艾叶 · 卡若AI 聊天</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f0f2f5;height:100vh;display:flex;flex-direction:column}
.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:16px 20px;font-size:18px;font-weight:600;text-align:center}
.chat-box{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:12px}
.msg{max-width:80%;padding:10px 14px;border-radius:16px;font-size:15px;line-height:1.5;word-break:break-word;animation:fadeIn .3s}
.msg.user{align-self:flex-end;background:#667eea;color:#fff;border-bottom-right-radius:4px}
.msg.ai{align-self:flex-start;background:#fff;color:#333;border-bottom-left-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.msg.ai pre{background:#f5f5f5;padding:8px;border-radius:6px;overflow-x:auto;font-size:13px;margin:6px 0}
.input-area{display:flex;gap:8px;padding:12px 20px;background:#fff;border-top:1px solid #e0e0e0}
.input-area input{flex:1;border:1px solid #ddd;border-radius:20px;padding:10px 16px;font-size:15px;outline:none}
.input-area input:focus{border-color:#667eea}
.input-area button{background:#667eea;color:#fff;border:none;border-radius:20px;padding:10px 20px;font-size:15px;cursor:pointer}
.input-area button:hover{background:#5a6fd6}
.typing{align-self:flex-start;color:#999;font-size:13px;padding:4px 14px}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
</style>
</head>
<body>
<div class="header">艾叶 · 卡若AI</div>
<div class="chat-box" id="chatBox">
  <div class="msg ai">你好！我是卡若AI，通过艾叶 IM 为你服务。有什么可以帮你的？</div>
</div>
<div class="input-area">
  <input id="msgInput" placeholder="输入消息..." autocomplete="off">
  <button onclick="sendMsg()">发送</button>
</div>
<script>
const chatBox=document.getElementById('chatBox'),input=document.getElementById('msgInput');
let ws,sessionId='';
function connect(){
  const proto=location.protocol==='https:'?'wss:':'ws:';
  ws=new WebSocket(`${proto}//${location.host}/ws/web/chat`);
  ws.onopen=()=>console.log('connected');
  ws.onmessage=e=>{
    const d=JSON.parse(e.data);
    if(d.type==='connected'){sessionId=d.session_id;return}
    if(d.type==='reply'){removeTyping();addMsg(d.content,'ai')}
  };
  ws.onclose=()=>setTimeout(connect,3000);
}
function addMsg(text,who){
  const d=document.createElement('div');d.className='msg '+who;
  d.innerHTML=who==='ai'?text.replace(/\\n/g,'<br>'):escHtml(text);
  chatBox.appendChild(d);chatBox.scrollTop=chatBox.scrollHeight;
}
function showTyping(){
  if(document.getElementById('typing'))return;
  const d=document.createElement('div');d.id='typing';d.className='typing';d.textContent='卡若AI 正在思考...';
  chatBox.appendChild(d);chatBox.scrollTop=chatBox.scrollHeight;
}
function removeTyping(){const t=document.getElementById('typing');if(t)t.remove()}
function escHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function sendMsg(){
  const m=input.value.trim();if(!m||!ws||ws.readyState!==1)return;
  addMsg(m,'user');ws.send(JSON.stringify({message:m}));input.value='';showTyping();
}
input.addEventListener('keydown',e=>{if(e.key==='Enter')sendMsg()});
connect();
</script>
</body>
</html>"""
