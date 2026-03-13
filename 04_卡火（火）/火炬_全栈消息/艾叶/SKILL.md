---
name: 艾叶 IM Bridge
description: 多平台 IM 消息网关。将个人微信、企业微信、飞书、WhatsApp、网页聊天等平台的消息桥接到卡若AI，实现跨平台 AI 对话。使用本技能当需要：(1) 配置/启动 IM 桥接 (2) 新增聊天通道 (3) 排查 IM 通道问题 (4) 对接新的消息平台
triggers: 艾叶、IM、聊天对接、消息网关、微信对接、企业微信对接、飞书对接、WhatsApp对接、网页聊天、IM桥接、通道配置、艾叶IM
owner: 火炬
group: 火
version: "1.0"
updated: "2026-03-13"
---

# 艾叶 IM Bridge

## 概述

艾叶是卡若AI的多平台 IM 消息网关，参考 OpenClaw 三层架构设计（Gateway → Channel → LLM），让任何聊天平台的消息都能路由到卡若AI进行对话，然后把 AI 回复推回对应平台。

**核心理念**：一个网关，任何平台，同一个 AI。

## 架构

```
  个人微信 / 企业微信 / 飞书 / WhatsApp / 网页
                    │
          ┌─────────▼─────────┐
          │   艾叶 IM Bridge   │  ← Channel Layer（通道适配）
          │   (FastAPI:18900)  │
          └─────────┬─────────┘
                    │ HTTP POST /v1/chat
          ┌─────────▼─────────┐
          │  卡若AI 网关       │  ← LLM Layer（AI 推理）
          │  (FastAPI:18080)   │
          └───────────────────┘
```

## 源代码位置

```
/Users/karuo/Documents/个人/卡若AI/运营中枢/scripts/aiye_im_bridge/
```

## 支持的通道

| 通道 | 对接方式 | Webhook 路径 | 状态 |
|:---|:---|:---|:---|
| 个人微信 | 中间件 Webhook（兼容存客宝/WeChatFerry/ComWeChatBot） | `/webhook/wechat_personal` | ✅ 就绪 |
| 企业微信 | 官方 API 回调 | `/webhook/wechat_work` | ✅ 就绪 |
| 飞书 | 事件订阅回调 | `/webhook/feishu` | ✅ 就绪 |
| WhatsApp | Cloud API Webhook | `/webhook/whatsapp` | ✅ 就绪 |
| 网页聊天 | REST + WebSocket | `/api/web/chat` `/ws/web/chat` `/chat` | ✅ 就绪 |

## 快速开始

### 1. 启动

```bash
cd 运营中枢/scripts/aiye_im_bridge
bash start.sh          # 默认端口 18900
bash start.sh 19000    # 指定端口
```

### 2. 配置通道

编辑 `config/channels.yaml`，按需启用通道并填入对应平台的凭证。首次运行会自动从 `channels.example.yaml` 复制一份。

### 3. 验证

- 访问 `http://localhost:18900` 查看欢迎页
- 访问 `http://localhost:18900/chat` 打开网页聊天
- 访问 `http://localhost:18900/status` 查看通道状态

## 各通道配置说明

### 个人微信

需要一个微信协议中间件（存客宝、WeChatFerry、ComWeChatBot 等），中间件负责微信登录和消息抓取，艾叶只做 HTTP 桥接：
1. 中间件将消息 POST 到 `http://艾叶地址/webhook/wechat_personal`
2. 艾叶处理后通过 `callback_url` 回调中间件发送回复

### 企业微信

1. 在企业微信管理后台创建自建应用
2. 设置回调 URL 为 `http(s)://你的域名/webhook/wechat_work`
3. 在 `channels.yaml` 填入 `corp_id`、`agent_id`、`secret`、`token`、`encoding_aes_key`

### 飞书

1. 在飞书开放平台创建应用
2. 开启「机器人」能力
3. 事件订阅地址设为 `http(s)://你的域名/webhook/feishu`
4. 订阅事件 `im.message.receive_v1`
5. 在 `channels.yaml` 填入 `app_id`、`app_secret`、`verification_token`

### WhatsApp

1. 在 Meta 开发者后台配置 WhatsApp Business API
2. Webhook URL 设为 `http(s)://你的域名/webhook/whatsapp`
3. 在 `channels.yaml` 填入 `phone_number_id`、`access_token`、`verify_token`

### 网页聊天

默认启用。访问 `/chat` 即可使用内置聊天界面，也可通过 REST API 或 WebSocket 集成到自己的系统。

## 扩展新通道

继承 `core/channel_base.py` 的 `ChannelBase`，实现以下方法：

```python
class MyChannel(ChannelBase):
    @property
    def platform(self) -> str:
        return "my_platform"

    async def start(self) -> None: ...
    async def stop(self) -> None: ...
    async def send(self, msg: OutboundMessage) -> bool: ...
    def register_routes(self, app) -> None: ...
```

然后在 `main.py` 的 `_register_channels()` 中注册即可。

## 聊天命令

在任何通道中发送：
- `/reset` — 重置对话上下文
- `/status` — 查看当前会话状态
- `/help` — 查看可用命令

## 管理接口

| 路径 | 方法 | 说明 |
|:---|:---|:---|
| `/` | GET | 欢迎页 |
| `/status` | GET | 通道状态 |
| `/health` | GET | 健康检查 |
| `/chat` | GET | 网页聊天界面 |
| `/docs` | GET | API 文档（Swagger） |

## 目录结构

```
aiye_im_bridge/
├── main.py                  # 主入口
├── start.sh                 # 启动脚本
├── requirements.txt         # 依赖
├── config/
│   ├── channels.yaml        # 通道配置（不入库）
│   └── channels.example.yaml # 配置示例
├── core/
│   ├── channel_base.py      # Channel 基类
│   ├── router.py            # 消息路由
│   ├── session.py           # 会话管理
│   └── bridge.py            # 网关桥接
└── channels/
    ├── wechat_personal.py   # 个人微信
    ├── wechat_work.py       # 企业微信
    ├── feishu.py            # 飞书
    ├── whatsapp.py          # WhatsApp
    └── web.py               # 网页聊天
```

## 依赖

- Python 3.10+
- fastapi、uvicorn、httpx、pyyaml、websockets
- 卡若AI 网关运行中（默认 `http://127.0.0.1:18080`）

## 与消息中枢的关系

- **消息中枢**（Clawdbot/Moltbot）：TypeScript，OpenClaw 框架，重型多通道 AI 助手
- **艾叶**：Python，轻量 Webhook 桥接，专注于把消息接到卡若AI网关

两者可共存，艾叶更适合快速对接新平台、轻量部署。
