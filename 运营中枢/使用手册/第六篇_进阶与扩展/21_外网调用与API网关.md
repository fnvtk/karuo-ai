# 第21章 · 外网调用与 API 网关

> 返回 [总目录](../README.md)

---

## 21.1 外网化方案

让卡若AI 可从外网访问，任意终端用「一句话/一个命令」调用卡若AI。

### 架构

```
外部（其他 AI / 用户）
  │  HTTP POST /chat
  ▼
卡若AI 网关（FastAPI）
  · 加载 BOOTSTRAP + SKILL_REGISTRY
  · 匹配技能 → 读 SKILL.md
  · 调用 LLM 生成回复（含复盘）
  │
  ▼ 部署在宝塔服务器
外网域名：https://kr-ai.quwanzhi.com
```

## 21.2 调用方式

### curl 命令

```bash
curl -s -X POST "https://kr-ai.quwanzhi.com/v1/chat" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"你的问题"}' | jq -r '.reply'
```

### 在 Cursor 中集成

```
当用户说「用卡若AI」时：
POST https://kr-ai.quwanzhi.com/v1/chat
Body: {"prompt": "<用户问题>"}
将 reply 字段展示给用户。
```

### 部门 key 认证

| 接口 | 说明 |
|:---|:---|
| `POST /v1/chat` | 带 `X-Karuo-Api-Key` 发送对话 |
| `GET /v1/skills` | 查看当前部门允许的技能 |
| `GET /v1/health` | 健康检查（无需 key） |

## 21.3 网关配置

- 网关代码：`运营中枢/scripts/karuo_ai_gateway/`
- 配置文件：`config/gateway.yaml`
- 新增部门：`python tools/generate_dept_key.py --tenant-id xxx`

### 轮询与故障切换

| 网关 | Base URL |
|:---|:---|
| KaruoGateway | `http://localhost:8000` |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| 智增增 | `https://api.zhizengzeng.com/v1` |

按队列逐个尝试，失败自动切下一个。

---

> 下一章：[第22章 · 多线程并行处理](22_多线程并行处理.md)
