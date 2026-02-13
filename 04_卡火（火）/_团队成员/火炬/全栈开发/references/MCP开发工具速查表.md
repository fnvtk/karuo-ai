# MCP开发工具速查表

> 卡火常用的MCP开发工具快速参考
> 更新日期：2026-01-26

---

## 一、数据库类

### MongoDB MCP
- **官方文档**：mongodb.com/docs/mcp-server
- **功能**：
  - 连接数据库（connection string）
  - 查询数据（find/aggregate/count）
  - 增删改（insert/update/delete）
  - 索引管理
  - MongoDB Atlas管理（组织、项目、集群）
- **安装**：
```bash
npx -y mongodb-mcp-server
```
- **配置**：
```json
{
  "mcpServers": {
    "mongodb": {
      "command": "npx",
      "args": ["-y", "mongodb-mcp-server"],
      "env": {
        "MONGODB_URI": "mongodb://localhost:27017/your_db"
      }
    }
  }
}
```

### PostgreSQL MCP
- **地址**：glama.ai/mcp/servers/@modelcontextprotocol/postgresql
- **功能**：
  - 只读SQL查询
  - Schema检查（列名、数据类型）
- **安装**：
```bash
npx -y @modelcontextprotocol/postgresql
```

### Supabase MCP
- **地址**：supabase.com/features/mcp-server
- **功能**：
  - 创建/管理Supabase项目
  - 设计表、生成迁移
  - SQL查询
  - 20+工具
- **安装**：
```bash
npx -y @supabase/mcp-server
```

---

## 二、前端测试类

### Playwright MCP
- **官方文档**：playwright.dev/agents
- **GitHub**：github.com/microsoft/playwright-mcp
- **核心优势**：
  - 用自然语言生成E2E测试
  - 使用Accessibility Tree（比截图省70%内存）
  - 支持黑盒测试（无需源码）
- **安装**：
```bash
npx @playwright/mcp@latest
```
- **配置**：
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```
- **使用示例**：
```
@playwright 测试登录流程
- 访问 /login
- 输入手机号 13800138000
- 点击获取验证码
- 输入验证码 1234
- 点击登录按钮
- 验证跳转到 /home
```

---

## 三、代码质量类

### ESLint MCP
- **官方文档**：eslint.org/docs/latest/use/mcp
- **功能**：
  - Lint检查
  - 自动修复
  - 与AI集成
- **安装**：
```bash
npx @eslint/mcp@latest
```
- **Cursor配置**（`.cursor/mcp.json`）：
```json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```
- **使用示例**：
```
@eslint 检查这个文件的lint错误
@eslint 修复所有ESLint问题
```

---

## 四、部署类

### Docker MCP
- **官方文档**：docs.docker.com/ai/mcp-catalog-and-toolkit
- **核心价值**：
  - 解决多版本Python/Node管理
  - 沙箱隔离
  - 动态管理多个容器化工具
- **启用**：
```bash
# 需Docker Desktop
docker mcp enable
```

### Vercel MCP
- **地址**：mcp.vercel.com
- **功能**：
  - 文档搜索
  - 项目管理
  - 部署管理
  - 日志分析
- **配置**：
```json
{
  "mcpServers": {
    "vercel": {
      "url": "https://mcp.vercel.com",
      "transport": "sse"
    }
  }
}
```

---

## 五、开发阶段对照表

| 阶段 | 工具 | 用途 |
|:---|:---|:---|
| 数据库设计 | MongoDB/Supabase MCP | 建表、查询、迁移 |
| 前端开发 | v0 API | UI组件生成 |
| 前端测试 | Playwright MCP | E2E自动化测试 |
| 代码审查 | ESLint MCP | Lint检查和修复 |
| 容器化 | Docker MCP | 镜像构建、容器管理 |
| 部署上线 | Vercel MCP | 部署、日志分析 |

---

## 六、一键安装脚本

```bash
#!/bin/bash
# install_mcp_tools.sh
# 安装卡火常用的MCP开发工具

echo "=== 安装数据库MCP ==="
npx -y mongodb-mcp-server --version
npx -y @supabase/mcp-server --version

echo "=== 安装前端测试MCP ==="
npx -y @playwright/mcp@latest --version

echo "=== 安装代码质量MCP ==="
npx -y @eslint/mcp@latest --version

echo "=== 完成 ==="
```

---

## 七、Cursor统一配置模板

在 `.cursor/mcp.json` 中：

```json
{
  "mcpServers": {
    "mongodb": {
      "command": "npx",
      "args": ["-y", "mongodb-mcp-server"],
      "env": {
        "MONGODB_URI": "mongodb://localhost:27017/your_db"
      }
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    },
    "vercel": {
      "url": "https://mcp.vercel.com",
      "transport": "sse"
    }
  }
}
```

---

> 持续从 glama.ai、awesome-mcp-servers 更新
