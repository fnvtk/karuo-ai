# 卡若AI 接口全链路使用说明书（部署 + 配置 + 调用 + 运维）

> 适用对象：卡若AI 内部团队、科室/部门调用方、外部技术合作方  
> 目标：把卡若AI网关以标准 API 形式稳定对外，支持 Cursor/OpenAI 兼容客户端与脚本调用  
> 版本：2.0 | 更新：2026-02-24

---

## 1. 总览（先看这个）

当前生产链路为：

1. 客户端（Cursor/脚本/系统）请求域名 `kr-ai.quwanzhi.com`
2. 存客宝宝塔 Nginx 接收请求（80/443）
3. Nginx 反代到本机 `127.0.0.1:18080`（frps 端口）
4. frps 将 `18080` 转发到 CKB NAS 的 `127.0.0.1:8000`
5. NAS 上 `karuo-ai-gateway` 返回 OpenAI 兼容结果

对外统一入口：

- `https://kr-ai.quwanzhi.com`

---

## 2. 架构与职责

### 2.1 组件职责

- `karuo-ai-gateway`（FastAPI）：核心业务网关，负责鉴权、技能匹配、LLM 调用、日志
- `frpc`（NAS）：把 NAS 本地 8000 暴露到公网中转服务器
- `frps`（存客宝）：开放公网转发口（18080）
- `Nginx`（存客宝宝塔）：域名入口、HTTPS、路径兼容、反代转发
- `Aliyun DNS`：`kr-ai.quwanzhi.com -> 42.194.245.239`

### 2.2 OpenAI 兼容接口

网关提供以下标准接口：

- `GET /v1/health`
- `GET /v1/models`
- `POST /v1/chat/completions`
- `POST /v1/chat`（内部简化接口）

已在 Nginx 层做兼容映射（防止部分客户端不带 `/v1`）：

- `/models -> /v1/models`
- `/chat/completions -> /v1/chat/completions`
- `/health -> /v1/health`

---

## 3. 目录与关键文件

网关代码目录：

- `运营中枢/scripts/karuo_ai_gateway/main.py`
- `运营中枢/scripts/karuo_ai_gateway/requirements.txt`
- `运营中枢/scripts/karuo_ai_gateway/config/gateway.yaml`
- `运营中枢/scripts/karuo_ai_gateway/config/gateway.example.yaml`
- `运营中枢/scripts/karuo_ai_gateway/tools/generate_dept_key.py`

NAS 部署目录（生产）：

- `/volume1/docker/karuo-ai-deploy/karuo-ai/运营中枢/scripts/karuo_ai_gateway/`

---

## 4. 首次部署步骤（全链路）

## 4.1 NAS 部署网关（业务服务）

1. 准备代码目录（推荐从 NAS 本机 Gitea 拉取）
2. 进入网关目录，准备 `.env`：

```bash
KARUO_GATEWAY_SALT=请填随机长串
OPENAI_API_KEY=请填模型服务Key
OPENAI_API_BASE=请填兼容地址（如 https://api.openai.com/v1）
OPENAI_MODEL=请填模型名
```

3. 启动容器（建议 compose）：

- 对外监听：`127.0.0.1:8000`
- 容器内启动：`uvicorn main:app --host 0.0.0.0 --port 8000`

4. 本机验证：

```bash
curl http://127.0.0.1:8000/v1/health
```

返回 `{"ok":true}` 即通过。

## 4.2 NAS 启动 frpc（转发到存客宝）

frpc 配置核心：

- `serverAddr = 42.194.245.239`
- `serverPort = 7000`
- `localIP = 127.0.0.1`
- `localPort = 8000`
- `remotePort = 18080`

验证：

- 存客宝上 `ss -tlnp | grep 18080` 有 frps 监听
- 外网 `http://42.194.245.239:18080/v1/health` 返回 `{"ok":true}`

## 4.3 存客宝 Nginx 配置域名入口

站点：`kr-ai.quwanzhi.com`  
反代目标：`http://127.0.0.1:18080`

必须项：

- 80/443 双 server
- 证书（Let’s Encrypt）
- 转发 `Authorization`、`X-Karuo-Api-Key`
- 路径兼容（/models、/chat/completions、/health）

## 4.4 DNS 配置

阿里云 DNS：

- 记录类型：A
- 主机记录：`kr-ai`
- 记录值：`42.194.245.239`

---

## 5. 配置说明（gateway.yaml）

示例结构：

```yaml
version: 1
auth:
  header_name: X-Karuo-Api-Key
  salt_env: KARUO_GATEWAY_SALT
tenants:
  - id: your_tenant
    name: 你的部门
    api_key_sha256: "sha256(明文key + salt)"
    allowed_skills: []
    limits:
      rpm: 600
      max_prompt_chars: 50000
skills:
  registry_path: SKILL_REGISTRY.md
  match_strategy: trigger_contains
  on_no_match: allow_general
llm:
  provider: openai_compatible
  api_key_env: OPENAI_API_KEY
  api_base_env: OPENAI_API_BASE
  model_env: OPENAI_MODEL
  timeout_seconds: 60
  max_tokens: 2000
logging:
  enabled: true
  path: 运营中枢/工作台/karuo_ai_gateway_access.jsonl
  log_request_body: false
```

注意事项：

- `gateway.yaml` 必须是合法 YAML，尤其是 `tenants` 缩进
- 明文 key 不写入仓库，只写 hash
- `KARUO_GATEWAY_SALT` 必须存在，否则所有 key 校验失败

---

## 6. 新增科室/部门（标准 SOP）

1. 设置环境变量：

```bash
export KARUO_GATEWAY_SALT="你的随机盐"
```

2. 生成 key 与 hash：

```bash
python 运营中枢/scripts/karuo_ai_gateway/tools/generate_dept_key.py \
  --tenant-id finance \
  --tenant-name "财务科"
```

3. 将 `api_key_sha256` 写入 `gateway.yaml` 的 `tenants` 列表
4. 重启网关
5. 用明文 key 调用 `/v1/chat/completions` 验证

---

## 7. 调用说明（给客户端/系统）

## 7.1 通用调用（OpenAI 兼容）

推荐 Base URL：

- `https://kr-ai.quwanzhi.com/v1`

鉴权：

- `Authorization: Bearer <dept_key>`

示例：

```bash
curl -sS https://kr-ai.quwanzhi.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <dept_key>" \
  -d '{
    "model":"karuo-ai",
    "messages":[{"role":"user","content":"帮我做一份本周复盘"}]
  }'
```

## 7.2 Cursor 配置（重点）

1. `OpenAI API Key`：填部门 key
2. `Override OpenAI Base URL`：`https://kr-ai.quwanzhi.com/v1`
3. 不要在 Base URL 末尾加 `/`
4. 改完后重启 Cursor 一次

---

## 8. 健康检查与联调命令

```bash
# 1) 域名健康
curl -sS https://kr-ai.quwanzhi.com/v1/health

# 2) 模型列表
curl -sS https://kr-ai.quwanzhi.com/v1/models

# 3) 鉴权验证
curl -sS https://kr-ai.quwanzhi.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <dept_key>" \
  -d '{"model":"karuo-ai","messages":[{"role":"user","content":"ping"}]}'
```

---

## 9. 故障排查（最常见）

## 9.1 Cursor `Provider Error`

优先排查：

1. Base URL 是否写成 `https://kr-ai.quwanzhi.com/v1`
2. 是否错误写成带尾斜杠（可能出现 `//chat/completions`）
3. key 是否正确（401 会被客户端包装成 Provider Error）
4. 站点是否已配置 HTTPS（443）

## 9.2 502 Bad Gateway

检查链路：

1. 存客宝 `127.0.0.1:18080` 是否可达
2. frpc/frps 是否在线
3. NAS `127.0.0.1:8000/v1/health` 是否正常
4. Nginx 配置是否 reload 成功

## 9.3 401 invalid api key

排查点：

1. `KARUO_GATEWAY_SALT` 与生成 hash 时是否一致
2. `gateway.yaml` tenant 缩进是否正确
3. 请求头是否正确传递 `Authorization` 或 `X-Karuo-Api-Key`

---

## 10. 运维与自动化建议

建议保持以下自动任务：

1. NAS 每 2 分钟拉取本机 Gitea 主分支变更并重启网关
2. NAS 每 2 分钟自检 frpc 进程并自动拉起
3. Nginx 与网关日志按天轮转
4. 每周检查证书续签状态

---

## 11. 安全建议（上线必做）

1. 生产环境关闭“固定 key 注入”类联调兜底
2. 仅保留租户级鉴权（每部门独立 key）
3. 对 `/` 根路径与扫描流量加拦截/限速
4. `gateway.yaml`、日志文件不入库
5. 定期轮换部门 key

---

## 12. 交付清单（给合作方）

给调用方只需要四项：

1. Base URL：`https://kr-ai.quwanzhi.com/v1`
2. API Key：`<dept_key>`
3. 示例请求（chat/completions）
4. 错误码说明（401/429/500）

---

## 13. 版本记录

- `v2.0`（2026-02-24）：补齐 CKB NAS + frp + 存客宝 Nginx + HTTPS + Cursor 兼容的全链路部署与排障说明。
