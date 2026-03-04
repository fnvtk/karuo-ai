# Cursor API 获取与使用说明

> 整理自 Cursor 官方文档（api.cursor.com / cursor.com/docs），便于在卡若AI 内查阅。  
> 更新：2026-03-04

---

## 一、两种「API」含义

| 含义 | 说明 | 获取/配置入口 |
|------|------|----------------|
| **Cursor 自家 API** | 用 API Key 调用 Cursor 提供的接口（团队管理、分析、AI 代码追踪、Cloud Agents 等） | 见下文「二、创建 Cursor API Key」 |
| **Cursor 里配置的第三方 API** | 在 Cursor 里填 OpenAI / Anthropic / 自建网关等 Key，让 Cursor 用你的 Key 调模型 | **Cursor → Settings → API Keys** |

---

## 二、创建 Cursor API Key（Cursor 自家接口）

- **Base URL**：`https://api.cursor.com`
- **认证方式**：Basic Authentication（用户名 = API Key，密码留空）

### 1. Admin API & AI Code Tracking API（团队管理、AI 代码追踪）

- **适用**：Enterprise 团队
- **创建步骤**：
  1. 打开 [cursor.com/dashboard](https://cursor.com/dashboard)
  2. 进入 **Settings** 标签 → **Advanced** → **Admin API Keys**
  3. 点击 **Create New API Key**
  4. 给 Key 起名（如 "Usage Dashboard"）
  5. **创建后立即复制**：Key 只显示一次，格式类似 `key_xxxxxxxx...`

### 2. Analytics API（团队使用与 AI 指标）

- **适用**：Enterprise 团队
- **创建**：在 [团队设置页](https://cursor.com/settings) 生成 API Key

### 3. Cloud Agents API（云端 AI 编程 Agent，Beta）

- **适用**：Beta，所有计划可用
- **创建**：[Cursor Dashboard → Integrations](https://cursor.com/dashboard?tab=integrations) 创建 API Key

---

## 三、调用示例（Basic Auth）

```bash
# 使用 curl（Key 作为用户名，密码为空）
curl -X GET "https://api.cursor.com/analytics/ai-code/commits?startDate=7d&endDate=now&page=1&pageSize=100" \
  -u YOUR_API_KEY:
```

或设置请求头：

```bash
Authorization: Basic $(echo -n "YOUR_API_KEY:" | base64)
```

---

## 四、主要 API 与限制（摘要）

| API | 用途 | 可用范围 | 限流（约） |
|-----|------|----------|------------|
| Admin API | 成员、设置、用量、支出 | Enterprise | 20 次/分钟（部分端点 250） |
| Analytics API | 团队用量、AI 指标、DAU、模型使用 | Enterprise | 100/50 次/分钟 |
| AI Code Tracking API | 按 commit/change 追踪 AI 生成代码 | Enterprise | 20 次/分钟/端点 |
| Cloud Agents API | 创建与管理 AI 编程 Agent | Beta（全计划） | 标准限流 |

- 限流触发会返回 **429**，需做退避重试。
- 详细端点与参数见：[Cursor API 总览](https://cursor.com/docs/api.md)、[AI Code Tracking](https://cursor.com/docs/account/teams/ai-code-tracking-api)、[Admin API](https://cursor.com/docs/account/teams/admin-api)。

---

## 五、在 Cursor 里配置「自己的模型 API」（第三方 Key）

若目的是让 **Cursor 使用你自己的 OpenAI / Claude / 网关**，而不是调用 Cursor 的接口：

1. 打开 **Cursor → Settings（设置）→ API Keys**
2. 填写对应服务的 Base URL 与 API Key（如 OpenAI、Anthropic、OpenRouter、或卡若AI 网关 `http://localhost:8000`）
3. 保存后，Cursor 会用这些 Key 请求模型，用量与计费走你的账号

卡若AI 网关在 Cursor 中的配置方式见：`运营中枢/scripts/karuo_ai_gateway/README.md`（Cursor API Keys 填网关地址与 Key）。

---

## 六、相关文档

- Cursor API 总览：https://cursor.com/docs/api.md  
- 卡若AI 网关与多接口配置：`运营中枢/参考资料/API网关与常用AI配置说明.md`  
- 账号与 API 索引：`运营中枢/工作台/00_账号与API索引.md`
