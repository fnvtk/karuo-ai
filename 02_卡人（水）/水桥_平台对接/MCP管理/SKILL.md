---
name: MCP 搜索与连接
description: 当卡若AI需要连接 MCP 时，使用本技能搜索、发现并安装 MCP 服务器。触发词：MCP、找MCP、连接MCP、MCP搜索、发现MCP、添加MCP、需要MCP、MCP安装、MCP发现。
owner: 水桥
group: 水
version: "1.0"
updated: "2026-02-23"
---

# MCP 搜索与连接 Skill

> 需要啥 MCP，搜一搜、连一连。 —— 水桥

---

## 核心能力

**当卡若AI遇到需要 MCP 能力的场景时，使用本技能完成：**
1. 搜索 MCP 服务器（5000+ 可发现）
2. 获取安装配置
3. 写入 Cursor/Claude/Windsurf 等客户端配置
4. 按需使用相应 MCP 工具

---

## 推荐工具：MCPfinder

**MCPfinder** 是「MCP 的 App Store」—— 一次安装，AI 自主发现并安装 MCP 服务器。

| 能力 | 说明 |
|:---|:---|
| 搜索 | 5000+ 服务器，多注册表聚合（Official、Glama、Smithery） |
| 安装 | 一键生成 Cursor / Claude Desktop / Windsurf 等配置 |
| 排名 | 按相关性、热度、多注册表覆盖、更新 recency 排序 |

### 安装（Cursor）

在 `~/.cursor/mcp.json` 或项目 `.cursor/mcp.json` 中加入：

```json
{
  "mcpServers": {
    "mcpfinder": {
      "command": "npx",
      "args": ["-y", "@mcpfinder/server@beta"]
    }
  }
}
```

> 注：首次运行会同步注册表（约 1～2 分钟），之后本地缓存自动刷新。

### MCPfinder 工具一览

| 工具 | 用途 | 触发场景 |
|:---|:---|:---|
| `search_mcp_servers` | 按关键词/用例/技术搜索 | 用户需要你当前没有的能力 |
| `get_server_details` | 获取详情（描述、env、来源等） | 评估是否适合安装 |
| `get_install_command` | 生成可直接粘贴的配置 | 用户要安装某个 MCP |
| `list_categories` | 按分类浏览 | 用户不确定需要啥 |
| `browse_category` | 查看某分类下的热门服务器 | 探索某领域（数据库、AI、云等） |

---

## 执行流程（卡若AI 使用本技能时）

```
用户需求（需要某种 MCP 能力）
    ↓
① 判断：当前 MCP 工具是否已有该能力？
    ├── 有 → 直接调用对应 MCP 工具
    └── 无 → 进入 ②
    ↓
② 调用 MCPfinder.search_mcp_servers(query) 搜索
    ↓
③ 若有结果，选 1～3 个候选，调用 get_server_details 评估
    ↓
④ 调用 get_install_command 生成 Cursor 配置
    ↓
⑤ 写入 ~/.cursor/mcp.json（或项目 mcp.json）
    ↓
⑥ 提示用户重启 Cursor 或等待自动检测
    ↓
⑦ 配置生效后，使用新 MCP 完成用户需求
```

---

## 其他 MCP 发现资源（备用）

当 MCPfinder 未安装或搜索无果时，可引导用户到：

| 资源 | 链接 | 说明 |
|:---|:---|:---|
| GitHub MCP Registry | https://github.com/mcp | 官方精选，VS Code 一键安装 |
| MCP Awesome | https://mcp-awesome.com | 1200+ 经核验服务器 |
| Find My MCP | https://findmymcp.com | 可搜索目录 |
| Cursor Directory | https://cursor.directory/mcp | Cursor 专用目录 |
| awesome-mcp-servers | https://github.com/appcypher/awesome-mcp-servers | GitHub 5k+ star 列表 |

---

## 与 Skill 的配合

- **需要功能时**：本技能负责「找 MCP、连 MCP」
- **功能落地时**：按 `SKILL_REGISTRY.md` 匹配现有 Skill，或结合「技能工厂」为新 MCP 写封装 Skill
- **MCP 安装后**：该 MCP 工具即成为卡若AI 的扩展能力，可直接在对话中调用

---

## 卡若AI 可接入 MCP 的技能清单（参考）

| 技能 | 成员 | 对应能力 | 可选 MCP 方向 |
|:---|:---|:---|:---|
| F11 量化交易 | 火炬 | 量化策略 | 用 MCP 迭代和优化 |

> 其他技能匹配见对话归档或 MCPfinder 搜索。

---

## 触发词

`MCP`、`找MCP`、`连接MCP`、`MCP搜索`、`发现MCP`、`添加MCP`、`需要MCP`、`MCP安装`、`MCP发现`、`查MCP`、`装MCP`

---

## 引用

- MCPfinder 新仓库：https://github.com/lksrz/mcpfinder
- MCPfinder 官网：https://mcpfinder.dev · https://findmcp.dev
- npm 包：`@mcpfinder/server`（beta）
