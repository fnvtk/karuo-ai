---
name: v0模型集成
description: 在Cursor中使用v0 API生成前端代码。触发词：v0、v0模型、前端生成、v0配置、UI生成、组件生成。
---

# v0模型集成

在Cursor中使用v0 API生成高质量前端/UI代码。

## 配置信息

| 配置项 | 值 |
|--------|-----|
| API URL | `https://api.v0.dev/v1` |
| API Key | `v1:C6mw1SlvXsJdlO4VFEXSQEVf:519gA0DPqIMbjvfMh7CXf4B2` |
| 默认模型 | `v0-1.5-md` |

## v0 API可用模型

| 模型 | 用途 | 特点 |
|------|------|------|
| `v0-1.5-md` | **生产级UI代码（推荐）** | 高质量输出，适合正式开发 |
| `v0-1.5-lg` | 复杂页面/大型组件 | 更强大，适合复杂需求 |
| `v0-1.0-md` | 基础组件 | 旧版本，稳定可靠 |

> **注意**：v0 API专注于前端/UI生成，不支持claude-opus等通用模型。通用推理请使用Cursor内置模型。

## 方法一：Cursor OpenAI兼容API（推荐）

### 步骤1：打开Cursor设置

```
Cmd + , → 搜索 "OpenAI API"
或
Cmd + Shift + P → "Cursor Settings"
```

### 步骤2：添加OpenAI兼容API

在Cursor设置中找到 **Models** → **Add Model** 区域：

```
Model Name: v0-1.5-md
API Key: v1:C6mw1SlvXsJdlO4VFEXSQEVf:519gA0DPqIMbjvfMh7CXf4B2
Base URL: https://api.v0.dev/v1
```

### 步骤3：选择模型

在聊天窗口或Composer中选择模型：
- 点击右下角模型选择器
- 搜索 `v0-1.5-md`
- 开始使用

## 方法二：直接通过脚本调用（任何项目通用）

### Python调用脚本

参见 `scripts/v0_generate.py`，可在任何项目中使用：

```bash
python v0_generate.py "生成一个登录页面组件"
```

## 方法三：项目级配置文件

### 创建 `.v0rc.json`（项目根目录）

```json
{
  "apiUrl": "https://api.v0.dev/v1",
  "apiKey": "v1:C6mw1SlvXsJdlO4VFEXSQEVf:519gA0DPqIMbjvfMh7CXf4B2",
  "defaultModel": "v0-1.5-md",
  "models": {
    "production": "v0-1.5-md",
    "complex": "v0-1.5-lg",
    "basic": "v0-1.0-md"
  },
  "framework": "next-app-router",
  "styling": "tailwind",
  "componentLibrary": "shadcn/ui",
  "typescript": true
}
```

### 创建 `.cursorrules`（项目根目录）

```markdown
# v0模型使用规则

## 模型选择策略
- 生产级UI组件：使用 v0-1.5-md（推荐）
- 复杂页面/大型组件：使用 v0-1.5-lg
- 简单基础组件：使用 v0-1.0-md

## 代码标准
- 框架：Next.js App Router
- 样式：Tailwind CSS
- 组件库：shadcn/ui
- 无占位符，生产就绪代码

## 设计规范
- 移动优先
- 3-5色配色系统
- 最多2种字体
```

## 快速使用

### 在Cursor中使用（配置后）

```plaintext
# 切换到v0模型后直接使用
生成一个用户登录页面，使用Tailwind和shadcn/ui

# 指定需求
生成一个产品卡片组件，支持图片、标题、价格、购买按钮

# 整页生成
生成一个完整的用户设置页面，包含头像、昵称、密码修改
```

### 切换模型

```
1. 点击聊天窗口右下角的模型名称
2. 搜索 v0-1.5-md
3. 选择后开始使用
```

## v0专注场景

```
┌─────────────────────────────────────────────────────────┐
│  v0 API 最适合的场景                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🎨 UI组件生成      → v0-1.5-md（推荐）                 │
│  📱 完整页面        → v0-1.5-lg                        │
│  🧩 基础组件        → v0-1.0-md                        │
│                                                         │
│  ⚠️ 不适合的场景（请使用Cursor内置模型）：               │
│  🏗️ 架构设计        → 使用 Claude/GPT                  │
│  📝 代码审查        → 使用 Claude/GPT                  │
│  🐛 调试修复        → 使用 Claude/GPT                  │
│  📊 复杂算法        → 使用 Claude/GPT                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## API直接调用

### curl测试

```bash
curl https://api.v0.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer v1:C6mw1SlvXsJdlO4VFEXSQEVf:519gA0DPqIMbjvfMh7CXf4B2" \
  -d '{
    "model": "v0-1.5-md",
    "messages": [{"role": "user", "content": "生成一个React登录表单组件"}]
  }'
```

### Python调用

```python
import openai

client = openai.OpenAI(
    api_key="v1:C6mw1SlvXsJdlO4VFEXSQEVf:519gA0DPqIMbjvfMh7CXf4B2",
    base_url="https://api.v0.dev/v1"
)

response = client.chat.completions.create(
    model="v0-1.5-md",
    messages=[{"role": "user", "content": "生成一个React登录组件，使用Tailwind CSS"}]
)

print(response.choices[0].message.content)
```

## 常见问题

### Q: 模型不显示？
A: 确保API Key正确，在Cursor中手动添加模型配置

### Q: v0支持claude-opus吗？
A: 不支持。v0 API只支持v0专有模型（v0-1.5-md等），通用推理请使用Cursor内置模型

### Q: 如何切换模型？
A: 修改 `.v0rc.json` 中的 `defaultModel` 字段，可选：v0-1.5-md、v0-1.5-lg、v0-1.0-md

## 快速复制配置

### 一键初始化（推荐）

```bash
# 在目标项目目录运行
/Users/karuo/Documents/个人/卡若AI/02_开发辅助/v0模型集成/scripts/init_v0_config.sh .
```

### 手动复制

```bash
# 复制配置文件到项目
cp /Users/karuo/Documents/个人/卡若AI/02_开发辅助/v0模型集成/references/.v0rc.json 你的项目路径/
cp /Users/karuo/Documents/个人/卡若AI/02_开发辅助/v0模型集成/references/.cursorrules 你的项目路径/
```

## 实时状态显示

### 每次对话显示当前模型状态

```bash
# 快速查看当前状态
python3 /Users/karuo/Documents/个人/卡若AI/02_开发辅助/v0模型集成/scripts/model_status_banner.py
```

### 详细状态检查

```bash  
# 详细检查模型配置和API状态
python3 /Users/karuo/Documents/个人/卡若AI/02_开发辅助/v0模型集成/scripts/check_model_status.py
```

---

**当前默认配置：v0-1.5-md（生产级UI生成）**

**修改模型：编辑 `.v0rc.json` 的 `defaultModel` 字段**

**实时状态：运行 `model_status_banner.py` 查看当前模型和API状态**
