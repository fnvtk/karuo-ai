# 公司 NAS 千问小模型 API 配置说明

> 部署位置：公司 NAS Docker（ollama-nas 容器）  
> 内网/外网均可调用，无需 API Key

---

## 公司 NAS 配置与推荐模型

| 项目 | 说明 |
|------|------|
| **型号** | Synology DS1825+ |
| **CPU** | AMD Ryzen Embedded V1500B（4 核 8 线程） |
| **内存** | 8GB；Ollama 容器限制 5GB |
| **推荐模型** | **qwen2.5:3b**（效果更好，约 2GB，适合 5GB 内存） |
| **备选模型** | qwen2.5:1.5b（更省内存，约 1GB） |

已在 NAS 上安装 **qwen2.5:3b** 作为默认推荐，其他终端/应用直接选用该模型即可。

---

## 零、配置到其他地方的速查（复制即用）

| 配置项 | 外网（推荐） | 内网（与 NAS 同网时） |
|--------|--------------|------------------------|
| **BASE URL** | `http://open.quwanzhi.com:11401` | `http://192.168.1.201:11434` |
| **OpenAI 兼容 Base URL** | `http://open.quwanzhi.com:11401/v1` | `http://192.168.1.201:11434/v1` |
| **API Key** | 无需，可填 `ollama` 占位 | 同上 |
| **推荐模型** | `qwen2.5:3b` | 同上 |
| **备选模型** | `qwen2.5:1.5b` | 同上 |

- **进程**：Docker 容器名 `ollama-nas`，镜像 `ollama/ollama:latest`，端口 11434。
- **编排路径**：`/volume1/docker/ollama/docker-compose.yml`。
- **启动/重启**：NAS 上 `sudo docker compose -f /volume1/docker/ollama/docker-compose.yml up -d` 或 `sudo docker start ollama-nas`。

### 在 OpenAI 兼容客户端中填写示例

- **Base URL**：`http://open.quwanzhi.com:11401/v1`
- **API Key**：`ollama`（或不填，Ollama 不校验）
- **Model**：`qwen2.5:3b`（推荐）或 `qwen2.5:1.5b`

### 环境变量（脚本/应用）

```bash
# 外网
export OLLAMA_BASE_URL="http://open.quwanzhi.com:11401"

# 内网
export OLLAMA_BASE_URL="http://192.168.1.201:11434"
```

---

## 一、接口地址

| 环境 | 基础 URL | 说明 |
|------|----------|------|
| **内网** | `http://192.168.1.201:11434` | 与 NAS 同网（如公司 WiFi） |
| **外网** | `http://open.quwanzhi.com:11401` | 任意网络，经 frp 转发 |

外网需确保 **frp 服务端（kr 宝塔 43.139.27.93）已开放 11401 端口**；若无法访问，请在 **kr 宝塔** 与 **腾讯云 kr 实例安全组**放行 `11401/TCP`。全站解析与迁机顺序见 `服务器管理/references/FRP与阿里云DNS统一至kr宝塔_迁移与验收.md`。

**OpenClaw（如阿猫 Mac）使用千问**：已配置主模型为 `nas-qwen/qwen2.5:3b`，备选 `qwen2.5:1.5b` → `v0/v0-1.5-lg`。若该终端 **DNS 解析超时**（访问 `open.quwanzhi.com` 报 Resolving timed out），可改为 **IP 直连**：在 OpenClaw 的 nas-qwen 里将 `baseUrl` 设为 `http://43.139.27.93:11401/v1`（与当前 frps 所在公网 IP 一致），改完后重启网关即可连通千问。

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
# 外网示例（推荐 qwen2.5:3b，也可用 qwen2.5:1.5b）
curl -s http://open.quwanzhi.com:11401/api/generate -d '{
  "model": "qwen2.5:3b",
  "prompt": "用一句话介绍厦门",
  "stream": false
}' | jq .
```

### 3. 对话格式（OpenAI 兼容，便于接入各类客户端）

```bash
curl -s http://open.quwanzhi.com:11401/v1/chat/completions -d '{
  "model": "qwen2.5:3b",
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

def chat(text: str, model: str = "qwen2.5:3b") -> str:
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
    model="qwen2.5:3b",
    messages=[{"role": "user", "content": "你好"}],
)
print(r.choices[0].message.content)
```

---

## 六、Docker 部署与维护

- **一键部署（本机执行）**：  
  `bash 群晖NAS管理/scripts/ollama/deploy_ollama_nas.sh`  
  会完成：创建目录、上传 compose、启动容器、拉取 qwen2.5:1.5b（及推荐 qwen2.5:3b）、配置 frp 并重启 frpc。

- **NAS 上手动操作**：  
  - 编排目录：`/volume1/docker/ollama/`  
  - 启动：`sudo docker compose -f /volume1/docker/ollama/docker-compose.yml up -d`  
  - 拉取其他模型：`sudo docker exec ollama-nas ollama pull qwen2.5:3b`  
  - 查看日志：`sudo docker logs -f ollama-nas`

- **外网端口**：frp 将 **11401** → NAS **11434**，代理名 `nas-ollama`。若未生效，检查 frpc 的 `server_addr` 是否指向 **43.139.27.93**、重启 `nas-frpc`，以及 **kr 上 frps** 与安全组是否开放 11401。

---

## 七、接口速查

| 项目 | 值 |
|------|-----|
| 外网 Base URL | `http://open.quwanzhi.com:11401` |
| 内网 Base URL | `http://192.168.1.201:11434` |
| 推荐模型 | `qwen2.5:3b` |
| 备选模型 | `qwen2.5:1.5b` |
| 认证 | 无（内网服务，外网经 frp 暴露，按需在 frp 或上层加鉴权） |
