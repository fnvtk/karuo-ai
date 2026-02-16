# MCP商业工具速查表

> 卡土常用的MCP商业工具快速参考

---

## 一、财务分析类

### Financial Analysis MCP
- **地址**：glama.ai/mcp/servers/@NARAVINDR321/MCP_Server_for_Financial_Analysis
- **功能**：
  - 毛利率 (Gross Margin)
  - 营业利润率 (Operating Margin)
  - 净利率 (Net Profit Margin)
  - EBITDA
  - 流动比率 (Current Ratio)
  - 速动比率 (Quick Ratio)
  - 资产负债率 (Debt-to-Equity)
  - ROE、ROA
  - PE、PB、股息率

### Excel MCP Server
- **地址**：glama.ai/mcp/servers/@haris-musa/excel-mcp-server
- **功能**：
  - 创建/编辑Excel工作簿
  - 公式计算
  - 图表生成（折线图、柱状图、饼图）
  - 数据透视表
  - 不需要安装Excel

### Financial Modeling Prep
- **地址**：glama.ai/mcp/servers/@imbenrabi/Financial-Modeling-Prep-MCP-Server
- **功能**：
  - DCF估值计算
  - 投资决策分析

---

## 二、客户管理类

### HubSpot MCP
- **地址**：developers.hubspot.com/mcp
- **状态**：Beta
- **支持对象**：
  - Contacts（联系人）
  - Companies（公司）
  - Deals（交易）
  - Tickets（工单）
  - Products（产品）
  - Quotes（报价）
- **配置**：
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

### Notion MCP
- **地址**：developers.notion.com/docs/mcp
- **功能**：
  - 读写Notion页面
  - 数据库操作
  - 协作文档管理
- **支持客户端**：Claude、Cursor、VS Code、ChatGPT

### Airtable MCP
- **地址**：hub.docker.com/mcp/server/airtable-mcp-server
- **功能**：
  - 列出数据库
  - 查询记录
  - 创建/更新/删除记录
  - 字段管理

---

## 三、营销类

### Marketing类MCP
- **索引**：glama.ai/mcp/servers/categories/marketing
- **常用工具**：
  - 广告投放管理
  - 营销自动化
  - 邮件营销集成

### Social Media类MCP
- **索引**：glama.ai/mcp/servers/categories/social-media
- **常用工具**：
  - 社交媒体发布
  - 数据分析
  - 内容管理

---

## 四、电商类

### E-commerce MCP
- **索引**：glama.ai/mcp/servers/categories/ecommerce-and-retail
- **功能**：
  - 订单管理
  - 库存跟踪
  - 销售分析

---

## 五、项目管理类

### Project Management MCP
- **索引**：glama.ai/mcp/servers/categories/project-management
- **常用工具**：
  - Jira集成
  - Trello集成
  - 任务自动化

---

## 安装指南

### 方式1：通过npm安装
```bash
npx -y @anthropics/create-mcp-server@latest --name <server-name>
```

### 方式2：通过pip安装
```bash
pip install <mcp-server-package>
```

### 方式3：通过Docker
```bash
docker pull mcp/server/<server-name>
```

### 方式4：Cursor配置
在 `.cursor/mcp.json` 中添加：
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@package/mcp-server"]
    }
  }
}
```

---

## 更新日志

| 日期 | 更新内容 |
|:---|:---|
| 2026-01-26 | 初始版本，收录核心商业工具 |

---

> 持续从 glama.ai、punkpeye/awesome-mcp-servers 更新
