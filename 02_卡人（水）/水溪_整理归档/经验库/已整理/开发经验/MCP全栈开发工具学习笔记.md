# MCP全栈开发工具学习笔记

**来源**：对话时间 2026-01-26
**分类**：开发经验
**标签**：#MCP #全栈开发 #MongoDB #Playwright #ESLint #Docker

---

## 问题背景

需要从外部AI Skills平台学习全栈开发类工具，补充卡火的能力，让开发流程更加自动化。

---

## 学习来源

| 平台 | 地址 | 收获 |
|:---|:---|:---|
| Glama.ai | glama.ai/mcp | MongoDB MCP、PostgreSQL MCP |
| MongoDB官方 | mongodb.com/docs/mcp-server | 数据库操作MCP |
| Playwright官方 | playwright.dev/agents | 前端E2E测试MCP |
| ESLint官方 | eslint.org/docs/latest/use/mcp | 代码质量检查MCP |
| Supabase | supabase.com/features/mcp-server | 数据库+项目管理MCP |
| Vercel | vercel.com/docs/mcp | 部署管理MCP |
| Docker | docs.docker.com/ai/mcp-catalog-and-toolkit | 容器化部署MCP |

---

## 核心收获

### 1. 数据库操作自动化
- **MongoDB MCP** 可以用自然语言查询、增删改、管理索引
- **Supabase MCP** 支持20+工具，从建表到迁移一条龙

### 2. 前端测试自动化
- **Playwright MCP** 用自然语言生成E2E测试
- 使用Accessibility Tree，比截图方式节省70%内存
- 支持黑盒测试，无需源码

### 3. 代码质量自动化
- **ESLint MCP** 让AI直接调用ESLint检查和修复
- 支持Cursor、VS Code、Windsurf等IDE

### 4. 部署自动化
- **Docker MCP** 解决多版本管理、沙箱隔离
- **Vercel MCP** 项目管理、部署、日志分析

---

## 开发阶段对照

| 阶段 | 工具 | 用途 |
|:---|:---|:---|
| 数据库设计 | MongoDB/Supabase MCP | 建表、查询、迁移 |
| 前端开发 | v0 API | UI组件生成 |
| 前端测试 | Playwright MCP | E2E自动化测试 |
| 代码审查 | ESLint MCP | Lint检查和修复 |
| 容器化 | Docker MCP | 镜像构建、容器管理 |
| 部署上线 | Vercel MCP | 部署、日志分析 |

---

## 应用到卡火

1. **更新全栈开发SKILL.md** ✅ 已完成
2. **新增MCP开发工具速查表** ✅ 已完成
3. 添加Cursor统一配置模板

---

## 关键配置

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "mongodb": {
      "command": "npx",
      "args": ["-y", "mongodb-mcp-server"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

---

## 经验总结

> **MCP生态是全栈开发的加速器**：
> 1. 数据库MCP让"建表、查询"对话化
> 2. Playwright MCP让"E2E测试"自然语言化
> 3. ESLint MCP让"代码审查"自动化
> 4. 结合v0 API，实现从UI到部署的全链路AI辅助

---

## 后续行动

- [ ] 配置MongoDB MCP到Cursor
- [ ] 用Playwright MCP生成一个项目的测试用例
- [ ] 测试ESLint MCP的代码修复功能
