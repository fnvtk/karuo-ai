---
name: 全网AI自动注册
description: 自动注册全网 AI API 账号 + Key 池管理 + 网关自动补充，Cerebras 为主力
triggers: AI注册、自动注册、批量注册、API Key、注册账号、免费API、API池、key池、自动开号、Gemini注册、Cerebras注册、Key管理、补充Key
owner: 木根
group: 木（卡木）
version: "3.0"
updated: "2026-03-16"
---

# 全网AI自动注册 + Key 池自动管理

## 能做什么（Capabilities）

### 自动注册
- **Cerebras（主力）**：纯 API 注册，mail.tm 临时邮箱 + Stytch magic link，无需浏览器/手机/CAPTCHA
- OpenAI / Cursor / Gemini / Groq / DeepSeek / Mistral / Together AI / Cohere 等平台注册
- 支持临时邮箱（mail.tm / tempmail.plus / Cloudflare Worker / 自有域名 IMAP）
- 支持纯 API（高速）和浏览器自动化（通用性强）两种模式
- 并发批量注册（1~50 并发）

### Key 池管理
- SQLite 统一存储所有平台 Key
- 自动健康检查（定期测试可用性、延迟、额度）
- 自动标记失效 Key，自动补充到最低水位
- Round-Robin 轮换分配
- FastAPI 管理接口（供网关/网站动态获取）

### 网关联动
- 卡若AI 网关自动从 Key 池读取活跃 Key（去重合并）
- Key 池补充后网关无需重启，下次请求自动生效
- 导出为 .env 格式供手动配置
- **官网 Mongo**：`key_pool_manager.py sync-site-mongo` 或 `auto-fill --sync-site-mongo` 将池内活跃 Key 写入 `karuo_site.gateways`（`gw-cerebras` / `gw-cohere`），官网 `callLLMViaGateway` 对同网关多 Key **按秒级轮换起点**依次尝试（失败则换下一 Key）

## 当前 Key 池状态（2026-03-16）

| 平台 | 模型 | 状态 | 延迟 | 说明 |
|:---|:---|:---|:---|:---|
| **Cerebras** | qwen-3-235b-a22b-instruct-2507 | ✅ 主力 | ~700ms | 235B 参数大模型，不限额度 |
| **Cerebras** | llama3.1-8b | ✅ 备选 | ~700ms | 快速推理 |
| **Cohere** | command-a-03-2025 | ✅ 备选 | ~800ms | 免费 tier |
| ~~Groq~~ | ~~llama-3.3-70b-versatile~~ | ❌ 已封 | - | Organization restricted |
| ~~Together AI~~ | ~~Llama-3.3-70B~~ | ❌ 额度耗尽 | - | $5 额度已用完 |

## 怎么用（Usage）

触发词：`API注册`、`自动注册`、`批量注册`、`API Key`、`免费API`、`key池`、`自动开号`、`补充Key`、`Key管理`

### 快速上手

```bash
cd 卡若AI/03_卡木（木）/木根_逆向分析/全网AI自动注册/脚本

# ====== Key 池管理 ======
python3 key_pool_manager.py status              # 查看池状态
python3 key_pool_manager.py check               # 健康检查
python3 key_pool_manager.py add <csk-xxx>       # 手动添加 Cerebras Key
python3 key_pool_manager.py export-env           # 导出网关 .env 格式
python3 key_pool_manager.py auto-fill            # 自动注册补充到最低水位
python3 key_pool_manager.py auto-fill -n 5       # 强制补充 5 个
python3 key_pool_manager.py auto-fill --sync-site-mongo   # 补充后同步到官网 Mongo（gw-cerebras / gw-cohere），参与对话网关多 Key 轮换
python3 key_pool_manager.py sync-site-mongo      # 仅同步当前池内活跃 Key → karuo_site.gateways（不写库注册）
python3 key_pool_manager.py daemon               # 守护模式（定期检查+自动补充）
python3 key_pool_manager.py serve                # 启动 API 服务（8898端口）

# 一键（工作台脚本）：bash 运营中枢/工作台/脚本/auto_fill_pool_sync_gateway_mongo.sh

# ====== 注册指定平台 ======
python3 auto_register.py register -p cerebras -n 3    # 注册 3 个 Cerebras
python3 auto_register.py register -p cohere -n 2
python3 auto_register.py list                          # 列出所有账号
python3 auto_register.py add-key -p cerebras -k csk-xxx  # 手动添加

# ====== 网关健康检查 ======
python3 ../../运营中枢/scripts/karuo_ai_gateway/key_health_check.py

# ====== Vercel / v0（mail.tm 多轮：取码失败换新邮箱）======
python3 vercel_mailtm_signup_loop.py --max-rounds 8 --poll-timeout 180
python3 vercel_mailtm_signup_loop.py --pause-enter --poll-timeout 240   # 先回车再轮询
python3 vercel_mailtm_signup_loop.py --out-jsonl ./vercel_mailtm_rounds.jsonl
```

### 自动化全链路

```
                 ┌─────────────────────────────────────┐
                 │        key_pool_manager.py           │
                 │  (守护模式 / 定时任务)                │
                 └───────┬───────────────┬─────────────┘
                         │               │
                   ① 健康检查        ② 水位不足？
                   标记失效 Key       触发自动注册
                         │               │
                         ▼               ▼
                 ┌───────────┐   ┌──────────────────┐
                 │ key_pool  │   │ cerebras_provider │
                 │   .db     │◄──│ (mail.tm + API)  │
                 └─────┬─────┘   └──────────────────┘
                       │
              ③ 网关自动读取
                       │
                       ▼
              ┌─────────────────┐
              │  卡若AI 网关     │
              │  main.py        │
              │ (故障切换队列)   │
              └─────────────────┘
```

## 执行步骤（Steps）

### Cerebras 注册流程（全自动）

1. `mail.tm` API 创建临时邮箱
2. 调用 Cerebras Stytch API 发送 magic link 到临时邮箱
3. 轮询 mail.tm 收件箱提取 magic link
4. 访问 magic link 完成注册认证
5. 调用 Cerebras API 创建 API Key
6. 验证 Key 可用性 → 存入 key_pool.db
7. 网关下次请求自动读取新 Key

### Vercel / v0 邮箱注册（mail.tm 循环）

1. **不要单邮箱死磕**：登录页试邮只会收到「Attempted Sign-in」+ signup 链接；**注册页** `Continue with Email` 才会收到 **Sign-up Verification** 六位码。
2. **循环**：本轮 `poll-timeout` 内无注册验证邮件 → **放弃该 mail.tm** → 脚本 `vercel_mailtm_signup_loop.py` 自动生成下一邮箱 → 重复，直到取到码或达 `--max-rounds`。
3. OTP 建议**逐格输入**；团队 URL 需全局唯一。
4. 经验与命令见 `水溪_整理归档/经验库/待沉淀/2026-03-31_Vercel与v0_mail.tm注册_OTP与团队创建.md`。

### 新增平台支持

1. 在 `providers/` 创建 `平台名_provider.py`，继承 `BaseProvider`
2. 实现 `register()` → 返回 `AccountResult`
3. 在 `key_pool_manager.py` 的 `PLATFORM_CONFIG` 添加平台配置
4. 在 `auto_register.py` 的 `get_provider()` 注册
5. 运行验证

## 支持的平台

| 平台 | 模式 | 免费额度 | 限制情况 | 推荐度 |
|:---|:---|:---|:---|:---|
| **Cerebras** | **纯 API** | **不限额度** | **不封号、不限频率** | ⭐⭐⭐⭐⭐ |
| Cohere | 浏览器/API | 免费 tier | 暂无限制 | ⭐⭐⭐⭐ |
| OpenAI (Codex) | API 模式 | $5 免费额度 | 额度有限 | ⭐⭐⭐ |
| Cursor | 浏览器模式 | 2 周试用 | 需 Turnstile | ⭐⭐ |
| Google Gemini | API 模式 | 15 RPM | 需手机验证 | ⭐⭐ |
| Groq | 浏览器模式 | 免费 tier | **容易被封** | ⭐ |
| Together AI | API 模式 | $5 额度 | 额度有限 | ⭐⭐ |
| DeepSeek | API 模式 | 免费额度 | 需手机验证 | ⭐⭐ |
| Mistral | API 模式 | 免费 tier | 需手机验证 | ⭐ |

## 相关文件（Files）

### 核心脚本
- Key 池管理器：`脚本/key_pool_manager.py`
- 池 → 官网 Mongo 网关：`脚本/sync_key_pool_to_site_mongo.py`（由 `sync-site-mongo` / `auto-fill --sync-site-mongo` 调用）
- 一键 shell：`运营中枢/工作台/脚本/auto_fill_pool_sync_gateway_mongo.sh`
- 主程序入口：`脚本/auto_register.py`
- Cerebras Provider：`providers/cerebras_provider.py`
- Provider 基类：`providers/base_provider.py`
- 通用浏览器 Provider：`providers/generic_browser_provider.py`
- Key 管理 API：`脚本/key_manager_api.py`
- 配置模板：`脚本/config.example.yaml`
- 依赖：`脚本/requirements.txt`

### 数据存储
- Key 池数据库：`脚本/key_pool.db`
- 账号数据库：`脚本/accounts.db`
- Token 文件：`脚本/tokens/*.json`

### 网关联动
- 网关主程序：`运营中枢/scripts/karuo_ai_gateway/main.py`（自动读取 key_pool.db）
- 网关配置：`运营中枢/scripts/karuo_ai_gateway/.env.api_keys.local`
- 网关健康检查：`运营中枢/scripts/karuo_ai_gateway/key_health_check.py`
- 网关状态：`运营中枢/scripts/karuo_ai_gateway/key_status.json`

## 依赖（Dependencies）

- 前置技能：M02 网站逆向分析（分析注册流程时联动）
- 外部工具：Python 3.10+、Chrome/Chromium（浏览器模式需要）
- Python 包：httpx、faker、aiosqlite、fastapi、uvicorn、pyyaml
- 浏览器模式额外：curl_cffi、DrissionPage

## 参考项目（References）

| 项目 | 地址 | Stars | 核心技术 |
|:---|:---|:---|:---|
| openai-auto-register | github.com/Ethan-W20/openai-auto-register | 184⭐ | Go/Python 纯 API + IMAP |
| gpt-auto-register | github.com/7836246/gpt-auto-register | 182⭐ | Selenium + Cloudflare Worker |
| cursor-auto-register | github.com/ddCat-main/cursor-auto-register | - | DrissionPage + FastAPI |
| Hydra-gemini | github.com/LikithMeruvu/Hydra-gemini | - | Gemini Key 池聚合 |
