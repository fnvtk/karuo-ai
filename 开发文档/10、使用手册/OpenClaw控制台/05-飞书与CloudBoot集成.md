## 05 飞书与 Cloud Boot 集成

> [OpenClaw 控制台使用手册](README.md) > 飞书与 Cloud Boot 集成

---

## 5.1 集成目标

本部分说明 Cloud Boot/飞书 发送的一条消息，如何通过本机的 OpenClaw 网关与 Ollama 模型完成应答：

> 飞书/Cloud Boot → `feishu_openclaw_bridge.py` → OpenClaw 网关（18789）→ Provider（Ollama/qwen2.5:3b 或其他）→ 返回结果 → 飞书/Cloud Boot 展示

这样，外部看到的是 Cloud Boot/飞书机器人，实际「大脑」运行在本机 OpenClaw + Ollama 上。

---

## 5.2 关键组件与文件

| 组件 | 位置 | 作用 |
|------|------|------|
| 飞书桥接脚本 | `开发/8、小工具/clawdbot/feishu_openclaw_bridge.py` | 接收飞书回调，转发到 OpenClaw 网关。 |
| 一键启动脚本 | `开发/8、小工具/clawdbot/start_feishu_frpc.sh` | 启动飞书桥接服务与 frpc。 |
| frpc 配置 | `开发/8、小工具/clawdbot/frp_tunnel/client/frpc.toml` | 配置内网穿透，将本机服务暴露给 Cloud Boot/外网。 |
| OpenClaw 网关 | `http://127.0.0.1:18789/` | 统一对接 Provider 的网关。 |

---

## 5.3 启动飞书桥接与 frpc

在本机终端执行：

```bash
cd /Users/karuo/Documents/开发/8、小工具/clawdbot
./start_feishu_frpc.sh
```

脚本会完成：

1. 启动一个 FastAPI/Uvicorn 服务，运行 `feishu_openclaw_bridge.py`；
2. 启动 `frpc`，根据 `frpc.toml` 将本机端口映射到外网，以便 Cloud Boot/飞书可以访问。

> 注意：首次使用前需要根据你的服务器与域名情况，正确填写 `frpc.toml` 与飞书应用配置（回调 URL 等）。

---

## 5.4 消息流转示意

以一条来自飞书的消息为例：

1. 用户在飞书/Cloud Boot 中发送消息；
2. 飞书服务器将消息 POST 到你配置的回调 URL；
3. 该 URL 实际指向 `feishu_openclaw_bridge.py` 提供的 HTTP 接口；
4. 桥接脚本将消息转换为 OpenClaw 支持的请求格式（会话 ID、角色、文本等）；
5. 请求发送到本机 `http://127.0.0.1:18789` 的 OpenClaw 网关；
6. 网关根据当前模型配置，将请求路由到 Provider（默认是 `ollama/qwen2.5:3b`）；
7. 得到回复后，网关将结果返回给桥接脚本，再由桥接脚本回传给飞书；
8. 最终，用户在 Cloud Boot/飞书中看到 AI 的回复。

---

## 5.5 常见问题与排查建议

| 症状 | 可能原因 | 排查建议 |
|------|----------|----------|
| 飞书回调 500 或超时 | 桥接服务未启动或端口被防火墙拦截 | 确认 `start_feishu_frpc.sh` 是否运行；检查本机 8888 端口和 frpc 日志。 |
| 飞书提示签名错误 | 飞书应用密钥或校验 Token 配置不一致 | 对照飞书开发者后台，检查 `feishu_openclaw_bridge.py` 中的配置。 |
| Cloud Boot 能打开界面但无回复 | OpenClaw 18789 未运行或 Provider 报错 | 访问 `http://127.0.0.1:18789/health`；查看 OpenClaw 日志与模型配置。 |

---

上一篇：[04 模型与 Provider 配置](04-模型与Provider配置.md) | 下一篇：[06 常见问题（FAQ）](06-常见问题.md)

返回 [章节目录](README.md)

