# GitHub开源工具对比分析

> 📅 整理日期：2026-01-21
> 📋 网站逆向分析相关的GitHub开源项目对比和选型建议

---

## 一、HAR/流量转OpenAPI工具

### 1. mitmproxy2swagger

**GitHub**: github.com/alufers/mitmproxy2swagger

| 维度 | 说明 |
|------|------|
| **输入** | mitmproxy流量文件 / HAR文件 |
| **输出** | OpenAPI 3.0 YAML |
| **语言** | Python |
| **安装** | `pip install mitmproxy2swagger` |
| **Star数** | 4k+ |
| **活跃度** | 活跃维护 |

**核心特点**：
- 自动检测HAR文件格式
- 支持多流量文件合并
- 两阶段工作流（先生成骨架，手动标记，再生成完整规范）
- `--examples` 包含请求/响应示例
- `--headers` 包含HTTP头

**使用示例**：
```bash
# 第一阶段：生成骨架
mitmproxy2swagger -i traffic.flow -o spec.yaml -p https://api.example.com

# 编辑spec.yaml，移除ignore:前缀

# 第二阶段：生成完整规范
mitmproxy2swagger -i traffic.flow -o spec.yaml -p https://api.example.com --examples
```

**优点**：
- 成熟稳定，社区活跃
- 路径参数化智能识别
- 支持请求示例

**缺点**：
- 需要两阶段操作
- 不直接生成SDK

---

### 2. web2sdk

**PyPI**: pypi.org/project/web2sdk

| 维度 | 说明 |
|------|------|
| **输入** | HAR文件 / mitmweb流量 |
| **输出** | OpenAPI YAML + Python SDK |
| **语言** | Python |
| **安装** | `pip install web2sdk` |
| **特点** | 一步到位，直出SDK |

**核心特点**：
- HAR直接生成可用的Python SDK
- 支持Bearer和Basic认证
- 可覆盖默认请求头
- Pydantic模型

**使用示例**：
```bash
web2sdk \
  --requests-path api.har \
  --base-url https://api.example.com/v1 \
  --sdk-name MyAPI \
  --auth-type bearer
```

**优点**：
- 最快速度出原型
- 一条命令完成全流程
- 同时生成OpenAPI和SDK

**缺点**：
- 生成的SDK定制性有限
- 复杂接口可能需要手动调整

---

### 3. har2openapi (Node.js)

**GitHub**: github.com/dcarr178/har2openapi

| 维度 | 说明 |
|------|------|
| **输入** | HAR文件（支持多个） |
| **输出** | OpenAPI 3.0 JSON/YAML |
| **语言** | Node.js |
| **安装** | `npm install` |

**核心特点**：
- 支持多HAR文件合并
- 配置文件驱动
- 自动生成JSON Schema
- 代码示例生成

**使用示例**：
```bash
# 生成OpenAPI
node index.js generate output.json input1.har input2.har

# 添加Schema和代码示例
node index.js samples output.json output_with_samples.json
```

**优点**：
- 多文件合并能力强
- Schema推断较完整
- 可与主规范合并

**缺点**：
- Node.js环境
- 不生成SDK

---

### 4. Demystify

**GitHub**: github.com/AndrewWalsh/demystify

| 维度 | 说明 |
|------|------|
| **输入** | HAR / 实时流量 |
| **输出** | OpenAPI 3.1 |
| **形式** | 桌面应用 / CLI / 浏览器扩展 |

**核心特点**：
- 实时流量分析
- 桌面GUI应用
- OpenAPI 3.1支持
- 路径参数自动推断

**优点**：
- 可视化操作
- 实时监控
- 最新OpenAPI版本

**缺点**：
- 需要安装桌面应用
- 不生成SDK

---

### 工具对比表

| 工具 | 输入 | 输出 | 语言 | 一键SDK | 实时监控 |
|------|------|------|------|---------|----------|
| mitmproxy2swagger | 流量/HAR | OpenAPI | Python | ❌ | ❌ |
| web2sdk | HAR | OpenAPI+SDK | Python | ✅ | ❌ |
| har2openapi | HAR | OpenAPI | Node.js | ❌ | ❌ |
| Demystify | HAR/实时 | OpenAPI | 多平台 | ❌ | ✅ |

**选型建议**：
- **快速原型**：web2sdk
- **生产级规范**：mitmproxy2swagger + openapi-python-client
- **可视化分析**：Demystify

---

## 二、SDK生成工具

### 1. openapi-python-client

**GitHub**: github.com/openapi-generators/openapi-python-client

| 维度 | 说明 |
|------|------|
| **输入** | OpenAPI 3.0/3.1 |
| **输出** | 现代Python SDK |
| **安装** | `pip install openapi-python-client` |
| **Star数** | 1k+ |

**核心特点**：
- Pydantic v2模型
- 同时生成sync和async客户端
- 使用pyproject.toml
- Python 3.9+

**使用示例**：
```bash
# 从本地规范生成
openapi-python-client generate --path api.yaml

# 从URL生成
openapi-python-client generate --url https://api.example.com/openapi.json
```

**生成的SDK结构**：
```
my_sdk/
├── pyproject.toml
├── my_sdk/
│   ├── __init__.py
│   ├── client.py          # 同步客户端
│   ├── async_client.py    # 异步客户端
│   ├── models/            # Pydantic模型
│   └── api/               # API方法
```

**优点**：
- 现代Python代码风格
- 类型安全（Pydantic）
- 支持async
- 可配置性强

**缺点**：
- 仅支持Python

---

### 2. OpenAPI Generator

**GitHub**: github.com/OpenAPITools/openapi-generator

| 维度 | 说明 |
|------|------|
| **输入** | OpenAPI 2.0/3.0/3.1 |
| **输出** | 50+语言SDK |
| **安装** | Docker/JAR/npm |

**支持的语言**：
- Python, JavaScript/TypeScript, Java, Go, Rust, PHP, C#, Ruby, Swift, Kotlin...

**使用示例**：
```bash
# Docker方式
docker run --rm -v ${PWD}:/local openapitools/openapi-generator-cli generate \
  -i /local/api.yaml \
  -g python \
  -o /local/sdk

# npm方式
npx @openapitools/openapi-generator-cli generate \
  -i api.yaml \
  -g python \
  -o ./sdk
```

**优点**：
- 语言支持最广
- 社区庞大
- 高度可配置

**缺点**：
- Python生成器相对滞后
- 代码风格较旧

---

### SDK生成对比

| 工具 | 语言支持 | Python质量 | 异步支持 | 类型安全 |
|------|----------|------------|----------|----------|
| openapi-python-client | Python | ⭐⭐⭐⭐⭐ | ✅ | Pydantic |
| OpenAPI Generator | 50+ | ⭐⭐⭐ | 部分 | 可选 |
| web2sdk | Python | ⭐⭐⭐ | ❌ | Pydantic |

**选型建议**：
- **纯Python项目**：openapi-python-client
- **多语言项目**：OpenAPI Generator
- **快速验证**：web2sdk

---

## 三、反检测/隐身浏览器

### 1. playwright-stealth (Python)

**GitHub**: github.com/AtuboDad/playwright_stealth

| 维度 | 说明 |
|------|------|
| **支持浏览器** | Chromium, Firefox, WebKit |
| **防护级别** | 基础 |
| **安装** | `pip install playwright-stealth` |

**使用示例**：
```python
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async

async with async_playwright() as p:
    browser = await p.chromium.launch()
    page = await browser.new_page()
    await stealth_async(page)
    await page.goto('https://bot.sannysoft.com')
```

**绕过能力**：
- ✅ navigator.webdriver检测
- ✅ Chrome DevTools Protocol检测
- ✅ 基础指纹检测
- ❌ 高级行为分析
- ❌ DataDome/Cloudflare高级防护

---

### 2. Botright

**GitHub**: github.com/Vinyzu/Botright

| 维度 | 说明 |
|------|------|
| **支持浏览器** | 真实Chromium |
| **防护级别** | 高级 |
| **安装** | `pip install botright` |

**核心特点**：
- 使用真实Chrome而非Playwright内置
- 指纹完全伪装
- 内置验证码解决
- 支持reCAPTCHA, hCaptcha, Cloudflare

**使用示例**：
```python
import botright

async def main():
    botright_client = await botright.Botright()
    browser = await botright_client.new_browser()
    page = await browser.new_page()
    
    # 自动处理Cloudflare
    await page.goto("https://cloudflare-protected-site.com")
    
    # 解决验证码
    await page.solve_captcha()
```

**绕过能力**：
- ✅ navigator.webdriver
- ✅ 高级指纹检测
- ✅ DataDome
- ✅ Cloudflare (部分)
- ✅ reCAPTCHA/hCaptcha

---

### 3. undetected-playwright

**GitHub**: github.com/kaliiiiiiiiii/undetected-playwright

| 维度 | 说明 |
|------|------|
| **语言** | JavaScript/TypeScript (Node版本) |
| **防护级别** | 高级 |

**特点**：
- 深度补丁Playwright
- 持续更新对抗检测

---

### 反检测工具对比

| 工具 | 语言 | 难度 | Cloudflare | DataDome | 验证码 |
|------|------|------|------------|----------|--------|
| playwright-stealth | Python | 简单 | ❌ | ❌ | ❌ |
| Botright | Python | 中等 | ✅ | ✅ | ✅ |
| undetected-playwright | Node.js | 中等 | ✅ | 部分 | ❌ |

**选型建议**：
- **普通网站**：playwright-stealth
- **高防护网站**：Botright
- **Node.js项目**：undetected-playwright

---

## 四、AI辅助工具

### 1. Claude Computer Use

**官方文档**: docs.anthropic.com/en/docs/build-with-claude/computer-use

通过Claude控制电脑，执行浏览器操作：
- 截图识别
- 鼠标键盘控制
- GUI自动化

### 2. claude-computer-use-mcp

**GitHub**: github.com/Theopsguide/claude-computer-use-mcp

MCP服务器，让Claude执行Playwright操作：
- 导航网页
- 点击元素
- 提取内容
- 截图

### 3. browser-use

**GitHub**: github.com/RaulAM7/AI-Agents-browser-use

AI Agent驱动的浏览器自动化：
- 自然语言指令
- 多Agent协作
- 数据提取

---

## 五、推荐工具链组合

### 场景1：快速验证（1小时内）

```
浏览器HAR导出 → web2sdk → 直接使用SDK
```

### 场景2：标准开发（半天）

```
mitmproxy捕获流量 → mitmproxy2swagger → openapi-python-client → 部署FastAPI
```

### 场景3：高防护网站（1天+）

```
Botright反检测浏览器 → 手动/AI辅助分析 → 自定义SDK → Redis会话管理 → Docker部署
```

### 场景4：持续维护（长期）

```
CI/CD流程：
  1. 定期运行Playwright测试脚本验证接口
  2. 接口变更时自动更新HAR
  3. 重新生成OpenAPI和SDK
  4. 自动发布新版本
```

---

## 六、安装命令汇总

```bash
# 核心工具
pip install mitmproxy
pip install mitmproxy2swagger
pip install web2sdk
pip install openapi-python-client

# 浏览器自动化
pip install playwright
playwright install chromium
pip install playwright-stealth

# 高级反检测
pip install botright

# Web框架
pip install fastapi uvicorn redis aiohttp httpx

# 可选：Node.js工具
npm install -g @openapitools/openapi-generator-cli
```

---

## 七、常见问题

### Q1: 为什么mitmproxy捕获不到HTTPS流量？

需要安装mitmproxy的CA证书：
```bash
# 启动mitmproxy后访问 http://mitm.it 下载证书
# macOS: 双击安装，在钥匙串中信任
```

### Q2: playwright-stealth还是被检测到了？

1. 使用headless=False（非无头模式）
2. 尝试Botright
3. 使用高质量代理IP

### Q3: 生成的SDK方法名太丑？

在OpenAPI规范中添加`operationId`：
```yaml
paths:
  /users:
    get:
      operationId: listUsers  # 这个会成为方法名
```

### Q4: 如何处理接口变更？

建立监控流程：
1. 定期运行测试脚本
2. 比对API响应结构
3. 变更时重新生成SDK
