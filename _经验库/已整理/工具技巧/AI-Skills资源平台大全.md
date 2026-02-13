# AI Skills资源平台大全

**来源**：对话时间 2026-01-26 调研
**分类**：工具技巧
**标签**：#AI #Skills #MCP #资源库 #学习

---

## 问题背景

需要找到全球主流的AI Skills/MCP资源平台，用于持续学习和积累，扩展卡若AI的能力边界。

---

## 解决方案

### 一、Skills专属平台

| 平台 | 地址 | 数量 | 特点 |
|:---|:---|:---:|:---|
| Agent Skills Marketplace | skillsmp.com | **96,000+** | 最大的SKILL.md标准库，可直接安装 |
| Glama.ai | glama.ai/mcp | **17,227** | 76个类目，分类最清晰 |
| MCP.so | mcp.so | **17,400+** | 第三方聚合，中文友好 |
| PulseMCP | pulsemcp.com | **7,907** | 质量把控严格，每日更新 |
| Smithery.ai | smithery.ai | **5,500+** | 最大的MCP开放市场 |
| MCPMarket | mcpmarket.com | 624页 | 通用聚合平台 |

### 二、GitHub核心仓库

| 仓库 | Stars | 用途 |
|:---|:---:|:---|
| punkpeye/awesome-mcp-servers | 79.4k | MCP服务器大全，首选汇总 |
| anthropics/skills | 52.7k | Anthropic官方Skills规范 |
| wong2/awesome-mcp-servers | 3.4k | 精选MCP列表 |
| openai/skills | 1.9k | OpenAI Codex Skills |
| heilcheng/awesome-agent-skills | 1.6k | 多平台技能汇总 |

### 三、Cursor专属

| 平台 | 规模 | 用途 |
|:---|:---:|:---|
| cursor.directory | 70.2k会员 | 规则生成器、MCP浏览 |
| cursorlist.com | - | .cursorrules按技术栈分类 |

---

## 类目分布（以Glama为参考）

- 🖥️ **Remote远程部署** - 7,383个（42.8%）
- 🐍 **Python** - 7,077个（41.1%）
- 🔧 **开发工具** - 6,072个（35.2%）
- 🗄️ **数据库** - Supabase/Postgres/MongoDB
- 🤖 **RAG/向量数据库** - 增长最快
- ☁️ **云平台** - AWS/GCP/Azure
- 🌐 **浏览器自动化** - Playwright/Puppeteer

---

## 关键命令

```bash
# 克隆最大的MCP汇总库
git clone https://github.com/punkpeye/awesome-mcp-servers.git

# 克隆Anthropic官方Skills
git clone https://github.com/anthropics/skills.git

# 克隆OpenAI Codex Skills
git clone https://github.com/openai/skills.git
```

---

## 经验总结

> **学习资源获取的优先级**：
> 1. 先看GitHub官方仓库（anthropics/skills、openai/skills）了解标准
> 2. 用punkpeye/awesome-mcp-servers作为索引找具体工具
> 3. 需要某类功能时，去Glama.ai按类目搜索
> 4. 日常保持关注skillsmp.com的更新

---

## 后续行动

- [ ] 定期（每周）检查awesome-mcp-servers更新
- [ ] 将常用的MCP服务器配置到本地
- [ ] 积累3条以上同类经验后，转化为专属Skill
