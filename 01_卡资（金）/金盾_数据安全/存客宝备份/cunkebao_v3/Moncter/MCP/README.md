# Moncter MCP 集成

这个目录包含 Moncter 系统的 MCP (Model Context Protocol) 服务器实现。

## 目录结构

```
MCP/
├── mcp.json                    # MCP 服务器配置文件（需要配置路径）
├── mcp.json.example            # MCP 配置文件示例
├── moncter-mcp-server/         # Moncter MCP 服务器源代码
│   ├── src/
│   │   └── index.ts           # 服务器主文件
│   ├── package.json           # Node.js 依赖配置
│   ├── tsconfig.json          # TypeScript 配置
│   ├── install.sh             # Linux/Mac 安装脚本
│   ├── install.bat            # Windows 安装脚本
│   └── README.md              # 服务器详细文档
├── 快速开始.md                 # 快速开始指南
└── MCP服务器使用说明.md        # 详细使用说明
```

## 快速开始

1. **安装 MCP Server**

   ```bash
   cd MCP/moncter-mcp-server
   npm install
   npm run build
   ```

2. **配置 MCP 客户端**

   编辑 `MCP/mcp.json`，将 `YOUR_PROJECT_PATH` 替换为实际的项目路径。

3. **启动后端服务**

   ```bash
   php start.php start
   ```

4. **使用 MCP 工具**

   在支持 MCP 的 AI 客户端（如 Claude Desktop）中使用 Moncter MCP 服务器提供的工具。

## 可用的 MCP 工具

- `create_data_collection_task` - 创建数据采集任务
- `create_tag_task` - 创建标签计算任务
- `list_data_collection_tasks` - 获取数据采集任务列表
- `list_tag_tasks` - 获取标签任务列表
- `get_data_sources` - 获取数据源列表
- `get_tag_definitions` - 获取标签定义列表
- `start_data_collection_task` - 启动数据采集任务
- `start_tag_task` - 启动标签任务

## 文档

- [快速开始指南](./快速开始.md) - 安装和配置步骤
- [详细使用说明](./MCP服务器使用说明.md) - 完整的工具说明和使用示例
- [服务器 README](./moncter-mcp-server/README.md) - 服务器开发文档

## 注意事项

1. 确保 Node.js 版本 >= 18
2. 确保后端服务运行在配置的端口（默认 8787）
3. 配置文件中的路径需要根据实际情况修改
4. MCP 工具调用会直接操作后端API，请确保权限控制

