# 卡若AI 网关

外网可访问的 API，按卡若AI 思考逻辑生成回复。其他 AI 或终端通过 POST /v1/chat 调用。

## 运行

```bash
cd /Users/karuo/Documents/个人/卡若AI/运营中枢/scripts/karuo_ai_gateway
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

可选环境变量：

- `OPENAI_API_KEY`：OpenAI 或兼容 API 的密钥，配置后使用真实 LLM 生成回复。
- `OPENAI_API_BASE`：兼容接口地址，默认 `https://api.openai.com/v1`。
- `OPENAI_MODEL`：模型名，默认 `gpt-4o-mini`。

## 外网暴露

- **本机 + ngrok**：`ngrok http 8000`，用给出的 https 地址作为 YOUR_DOMAIN。
- **宝塔服务器**：将本服务部署到服务器，Nginx 反代 8000 端口，配置域名即 YOUR_DOMAIN。

## 执行命令（给 Cursor / 其他 AI）

将 `YOUR_DOMAIN` 换成实际域名或 ngrok 地址后执行：

```bash
curl -s -X POST "https://YOUR_DOMAIN/v1/chat" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"你的问题"}' | jq -r '.reply'
```

方案说明：`运营中枢/参考资料/卡若AI外网化与外部调用方案.md`。
