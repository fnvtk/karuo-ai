# MCP商业工具学习笔记

**来源**：对话时间 2026-01-26
**分类**：商业经验
**标签**：#MCP #商业工具 #财务分析 #CRM #自动化

---

## 问题背景

需要从外部AI Skills平台学习商业类工具，补充卡土的能力，让商业分析和招商运营更加自动化。

---

## 学习来源

| 平台 | 地址 | 收获 |
|:---|:---|:---|
| Glama.ai | glama.ai/mcp | 财务分析MCP、Excel MCP |
| HubSpot | developers.hubspot.com | CRM管理MCP |
| Notion | developers.notion.com | 协作文档MCP |
| AgentFactory | agentfactory.panaversity.org | AI Agent商业化模型 |

---

## 核心收获

### 1. 财务分析自动化
- **Financial Analysis MCP** 可自动计算毛利率、净利率、ROE等指标
- **Excel MCP** 可处理表格、生成图表，不需要安装Excel
- 结合使用可以实现"一键算账"

### 2. 客户管理自动化
- **HubSpot MCP** 可以用自然语言管理CRM
- 支持联系人、公司、交易、工单等对象
- 可实现招商进度自动跟踪

### 3. AI Agent商业化模型
发现四种变现模式：
1. **数字FTE订阅**：$500-2000/月，替代人工
2. **成功付费**：按结果计费（线索、节省成本）
3. **技能授权**：SKILL.md作为知识产权授权
4. **技能市场**：上架OpenAI Apps等平台

### 4. 成本优势数据
| 任务 | 人工成本 | Agent成本 | 节省率 |
|:---|:---:|:---:|:---:|
| 线索筛选 | $3-5 | $0.25 | 92% |
| 合同审查 | $50-100 | $2-5 | 95% |

---

## 应用到卡土

1. **创建「商业工具集」Skill** ✅ 已完成
2. 整合财务分析、CRM、营销自动化工具
3. 与云阿米巴模式结合，实现自动化分润计算

---

## 关键命令

```bash
# HubSpot MCP配置
{
  "mcpServers": {
    "hubspot": {
      "url": "https://mcp.hubspot.com",
      "transport": "sse"
    }
  }
}

# Excel MCP安装
pip install excel-mcp-server
```

---

## 经验总结

> **MCP生态是卡土能力放大器**：
> 1. 财务类MCP让"算账"自动化
> 2. CRM类MCP让"招商管理"自动化
> 3. 结合云阿米巴，可实现"自动分润系统"

---

## 后续行动

- [ ] 配置HubSpot MCP到Cursor
- [ ] 测试Financial Analysis MCP的财务指标计算
- [ ] 设计"云阿米巴自动分润"工作流
