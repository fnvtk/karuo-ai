# 公司 NAS 千问小模型 API 配置说明

> 部署位置：公司 NAS Docker（ollama-nas 容器）  
> 模型：qwen2.5:1.5b  
> 内网/外网均可调用，无需 API Key

---

## 一、接口地址

| 环境 | 基础 URL | 说明 |
|------|----------|------|
| **内网** | `http://192.168.1.201:11434` | 与 NAS 同网（如公司 WiFi） |
| **外网** | `http://open.quwanzhi.com:11401` | 任意网络，经 frp 转发 |

外网需确保 **frp 服务端（42.194.245.239）已开放 11401 端口**；若无法访问，请在宝塔/安全组中放行 `11401/TCP`。

---

## 二、常用 API 端点

| 用途 | 方法 | 路径 |
|------|------|------|
| 模型列表 | GET | `/api/tags` |
| 生成（流式/非流式） | POST | `/api/generate` |
| 对话（OpenAI 兼容） | POST | `/v1/chat/completions` |

---

## 三、简单调用示例

### 1. 查看已安装模型

```bash
# 外网
curl -s http://open.quwanzhi.com:11401/api/tags | jq .

# 内网
curl -s http://192.168.1.201:11434/api/tags | jq .
```

### 2. 文本生成（curl）

```bash
# 外网示例（qwen2.5:1.5b）
curl -s http://open.quwanzhi.com:11401/api/generate -d '{
  "model": "qwen2.5:1.5b",
  "prompt": "用一句话介绍厦门",
  "stream": false
}' | jq .
```

### 3. 对话格式（OpenAI 兼容，便于接入各类客户端）

```bash
curl -s http://open.quwanzhi.com:11401/v1/chat/completions -d '{
  "model": "qwen2.5:1.5b",
  "messages": [{"role": "user", "content": "你好，请简短回复"}],
  "stream": false
}' | jq .
```

---

## 四、环境变量配置（代码里使用）

在应用或脚本中配置 base URL，外网用 11401，内网用 11434：

```bash
# 外网（默认）
export OLLAMA_BASE_URL="http://open.quwanzhi.com:11401"

# 内网（与 NAS 同网时改用）
# export OLLAMA_BASE_URL="http://192.168.1.201:11434"
```

---

## 五、Python 简单配置

```python
import os
import requests

# 外网
OLLAMA_BASE = os.environ.get("OLLAMA_BASE_URL", "http://open.quwanzhi.com:11401")

def chat(text: str, model: str = "qwen2.5:1.5b") -> str:
    r = requests.post(
        f"{OLLAMA_BASE}/api/generate",
        json={"model": model, "prompt": text, "stream": False},
        timeout=60,
    )
    r.raise_for_status()
    return r.json().get("response", "")

# 使用
print(chat("用一句话介绍厦门"))
```

若用 OpenAI 兼容接口（如 openai 库）：

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://open.quwanzhi.com:11401/v1",
    api_key="ollama",  # Ollama 不校验，可随意
)
r = client.chat.completions.create(
    model="qwen2.5:1.5b",
    messages=[{"role": "user", "content": "你好"}],
)
print(r.choices[0].message.content)
```

---

## 六、Docker 部署与维护

- **一键部署（本机执行）**：  
  `bash 群晖NAS管理/scripts/ollama/deploy_ollama_nas.sh`  
  会完成：创建目录、上传 compose、启动容器、拉取 qwen2.5:1.5b、配置 frp 并重启 frpc。

- **NAS 上手动操作**：  
  - 编排目录：`/volume1/docker/ollama/`  
  - 启动：`sudo docker compose -f /volume1/docker/ollama/docker-compose.yml up -d`  
  - 拉取其他模型：`sudo docker exec ollama-nas ollama pull qwen2.5:3b`  
  - 查看日志：`sudo docker logs -f ollama-nas`

- **外网端口**：frp 将 **11401** → NAS **11434**，代理名 `nas-ollama`。若未生效，检查 frpc 配置并重启 `nas-frpc`，以及 frps 是否开放 11401。

---

## 七、接口速查

| 项目 | 值 |
|------|-----|
| 外网 Base URL | `http://open.quwanzhi.com:11401` |
| 内网 Base URL | `http://192.168.1.201:11434` |
| 默认模型 | `qwen2.5:1.5b` |
| 认证 | 无（内网服务，外网经 frp 暴露，按需在 frp 或上层加鉴权） |
