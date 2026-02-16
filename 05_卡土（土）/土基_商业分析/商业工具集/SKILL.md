---
name: 商业工具集
description: 商业分析与自动化工具。触发词：算账、财务分析、商业画布、定价策略、客户管理、合作伙伴。整合MCP生态中的商业类工具，提升卡土的商业决策能力。
---

# 商业工具集

卡土的商业分析与自动化工具箱，整合MCP生态最佳实践。

---

## 核心工具清单

### 💰 财务分析工具

| 工具 | 来源 | 功能 |
|:---|:---|:---|
| **Financial Analysis MCP** | glama.ai | 计算毛利率、净利率、ROE、ROA、PE等关键指标 |
| **Financial Modeling Prep** | glama.ai | DCF估值、投资决策分析 |
| **Yahoo Finance MCP** | glama.ai | 实时股票数据、财务报表 |
| **Excel MCP Server** | glama.ai | 表格处理、公式计算、图表生成 |

**安装命令**：
```bash
# Financial Analysis MCP
npx -y @anthropics/create-mcp-server@latest --name financial-analysis

# Excel MCP (Python版)
pip install excel-mcp-server
```

---

### 📊 商业模式工具

| 工具 | 用途 | 对应卡土能力 |
|:---|:---|:---|
| **Business Model Canvas** | 9宫格商业画布 | 商业计划 |
| **Revenue Model Templates** | 收益模型设计 | 云阿米巴 |
| **Pricing Strategy Framework** | 定价策略 | 招商方案 |

**商业画布9要素**：
```
1. 客户细分 (Customer Segments)
2. 价值主张 (Value Propositions)
3. 渠道通路 (Channels)
4. 客户关系 (Customer Relationships)
5. 收入来源 (Revenue Streams)
6. 核心资源 (Key Resources)
7. 关键活动 (Key Activities)
8. 重要合作 (Key Partnerships)
9. 成本结构 (Cost Structure)
```

---

### 👥 客户与合作伙伴管理

| 工具 | 来源 | 功能 |
|:---|:---|:---|
| **HubSpot MCP** | developers.hubspot.com | CRM、线索管理、交易跟踪 |
| **Notion MCP** | developers.notion.com | 协作文档、合作方管理 |
| **Airtable MCP** | Docker/n8n | 数据库式管理、工作流自动化 |

**HubSpot MCP配置**：
```json
{
  "mcpServers": {
    "hubspot": {
      "url": "https://mcp.hubspot.com",
      "transport": "sse"
    }
  }
}
```

---

### 🎯 营销自动化

| 工具 | 类目 | 功能 |
|:---|:---|:---|
| **Marketing MCP** | glama.ai/marketing | 营销工具集成 |
| **Social Media MCP** | glama.ai/social-media | 社交媒体管理 |
| **E-commerce MCP** | glama.ai/ecommerce | 电商数据分析 |

---

## AI Agent商业化模型

从外部学习到的四种变现模式：

### 1️⃣ 数字FTE订阅模式
```
定价：$500-2000/月
模式：托管Agent + 月度维护支持
适用：替代人工的标准化任务
```

### 2️⃣ 成功付费模式
```
定价：按结果计费
示例：
  - $5/合格线索
  - 节省成本的2%
  - $50/文档处理
适用：可量化结果的任务
```

### 3️⃣ 技能授权模式
```
定价：$10k-50k/年
模式：SKILL.md作为知识产权授权
适用：垂直行业专业技能
```

### 4️⃣ 技能市场模式
```
平台：OpenAI Apps、skillsmp.com
模式：按订阅或使用量收费
适用：通用型技能
```

---

## 成本优势对比

| 任务类型 | 人工成本 | Agent成本 | 节省率 |
|:---|:---:|:---:|:---:|
| 线索筛选 | $3-5 | $0.25 | 92% |
| 合同审查 | $50-100 | $2-5 | 95% |
| 报告生成 | $20-40 | $1-2 | 95% |
| 数据分析 | $30-60 | $2-4 | 93% |

---

## 与云阿米巴结合

**卡土独创模式 + MCP工具 = 自动化商业系统**

```
┌─────────────────────────────────────────────────┐
│              云阿米巴 + MCP 架构                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  流量端          私域系统          分润系统      │
│    │               │                │          │
│    ▼               ▼                ▼          │
│  Social MCP → Notion/Airtable → Excel MCP      │
│    │               │                │          │
│    └───────────────┴────────────────┘          │
│                    │                           │
│                    ▼                           │
│              Financial MCP                     │
│              (自动算账)                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 快速使用指南

### 场景1：写商业计划书
```
1. 用商业画布梳理9要素
2. 用Financial MCP计算财务指标
3. 用Excel MCP生成财务预测表
```

### 场景2：设计招商方案
```
1. 用定价策略框架确定分润比例
2. 用Airtable MCP建合作方数据库
3. 用HubSpot MCP跟踪招商进度
```

### 场景3：算账分析
```
1. 用Financial MCP计算毛利率、净利率
2. 用Excel MCP做敏感性分析
3. 输出投资回报周期
```

---

## 资源索引

| 类目 | 平台 | 地址 |
|:---|:---|:---|
| Finance | Glama | glama.ai/mcp/servers/categories/finance |
| Marketing | Glama | glama.ai/mcp/servers/categories/marketing |
| CRM | Glama | glama.ai/mcp/servers/categories/customer-data-platforms |
| E-commerce | Glama | glama.ai/mcp/servers/categories/ecommerce-and-retail |

---

> **卡土的承诺**：让赚钱可计算，让复制可自动。先算账。
