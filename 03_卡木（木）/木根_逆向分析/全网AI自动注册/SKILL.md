---
name: 全网AI自动注册
description: 自动注册全网各类 AI API 免费账号，提取 API Key/Token 并统一管理
triggers: AI注册、自动注册、批量注册、API Key、注册账号、免费API、API池、key池、自动开号、Gemini注册
owner: 木根
group: 木（卡木）
version: "1.0"
updated: "2026-03-15"
---

# 全网AI自动注册

## 能做什么（Capabilities）

- 自动注册 OpenAI / Cursor / Gemini / Groq / DeepSeek / Mistral / Together AI 等平台的免费账号
- 支持临时邮箱（tempmail.plus / Cloudflare Worker catch-all / 自有域名 IMAP）
- 支持纯 API 注册（高速）和浏览器自动化注册（通用性强）两种模式
- 自动获取邮箱验证码（IMAP 轮询 / API 轮询 / 正则提取 6 位 OTP）
- 自动处理 CAPTCHA（Cloudflare Turnstile / hCaptcha checkbox 点击）
- Token / API Key 提取并存入本地 SQLite + JSON 双存储
- API Key 池管理与轮换（内置 FastAPI 管理接口）
- 并发批量注册（支持 1~50 并发）

## 怎么用（Usage）

触发词：`API注册`、`自动注册`、`批量注册`、`API Key`、`免费API`、`key池`、`自动开号`

### 快速开始

```bash
cd 卡若AI/03_卡木（木）/木根_逆向分析/全网API自动注册/脚本

# 1. 安装依赖
pip install -r requirements.txt

# 2. 配置（复制模板并编辑）
cp config.example.yaml config.yaml
# 编辑 config.yaml：填写邮箱域名、IMAP 信息等

# 3. 注册指定平台
python auto_register.py --provider openai --count 5
python auto_register.py --provider cursor --count 3
python auto_register.py --provider gemini --count 10

# 4. 查看已注册的 Key 池
python auto_register.py --list

# 5. 启动 Key 管理 API 服务
python auto_register.py --serve --port 8899
```

### 支持的平台

| 平台 | 模式 | 免费额度 | 注册方式 |
|:---|:---|:---|:---|
| OpenAI (Codex) | API 模式 | $5 免费额度 | OAuth PKCE + OTP |
| Cursor | 浏览器模式 | 2 周免费试用 | 表单 + Turnstile + OTP |
| Google Gemini | API 模式 | 15 RPM/project | Google Cloud Console API Key |
| Groq | 浏览器模式 | 免费 tier | 注册 + API Key 生成 |
| DeepSeek | API 模式 | 免费额度 | 注册 + API Key |
| Mistral | API 模式 | 免费 tier | 注册 + API Key |
| Together AI | API 模式 | $5 免费额度 | 注册 + API Key |
| Cohere | API 模式 | 免费 tier | 注册 + API Key |

## 执行步骤（Steps）

### 新增平台支持

1. 在 `providers/` 目录创建 `平台名.py`，继承 `BaseProvider` 基类
2. 实现 `register()` 方法：注册流程
3. 实现 `extract_key()` 方法：提取 API Key/Token
4. 在 `config.yaml` 添加平台配置
5. 运行 `python auto_register.py --provider 平台名 --count N`

### 注册流程（通用框架）

```
生成临时邮箱 → 打开注册页面/调用注册API
    → 填写表单/提交邮箱
    → 处理 CAPTCHA（如有）
    → 等待并提取邮箱验证码
    → 提交验证码
    → 创建账号（填写资料）
    → 提取 API Key / Token
    → 存入本地数据库
    → 下一个...
```

## 相关文件（Files）

- 主程序：`脚本/auto_register.py`
- 配置模板：`脚本/config.example.yaml`
- 依赖：`脚本/requirements.txt`
- Provider 基类：`providers/base_provider.py`
- OpenAI Provider：`providers/openai_provider.py`
- Cursor Provider：`providers/cursor_provider.py`
- Gemini Provider：`providers/gemini_provider.py`
- 邮箱服务：`脚本/email_service.py`
- Key 管理 API：`脚本/key_manager_api.py`

## 依赖（Dependencies）

- 前置技能：M02 网站逆向分析（分析注册流程时联动）
- 外部工具：Python 3.10+、Chrome/Chromium（浏览器模式需要）
- Python 包：curl_cffi、DrissionPage、aiosqlite、fastapi、uvicorn、pyyaml

## 参考项目（References）

| 项目 | 地址 | Stars | 核心技术 |
|:---|:---|:---|:---|
| openai-auto-register | github.com/Ethan-W20/openai-auto-register | 184⭐ | Go/Python 纯 API + IMAP |
| gpt-auto-register | github.com/7836246/gpt-auto-register | 182⭐ | Selenium + Cloudflare Worker |
| cursor-auto-register | github.com/ddCat-main/cursor-auto-register | - | DrissionPage + FastAPI |
| Hydra-gemini | github.com/LikithMeruvu/Hydra-gemini | - | Gemini Key 池聚合 |
| openai-gemini-api-key-rotator | github.com/p32929/openai-gemini-api-key-rotator | - | Node.js Key 轮换代理 |
