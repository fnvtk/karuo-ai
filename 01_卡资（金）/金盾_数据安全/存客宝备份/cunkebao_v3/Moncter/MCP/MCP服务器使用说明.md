# Moncter MCP 服务器使用说明

## 概述

Moncter MCP Server 是一个基于 Model Context Protocol (MCP) 的服务器，允许通过 MCP 协议来管理 Moncter 系统的数据采集任务和标签任务。

## 安装步骤

### 1. 安装依赖

```bash
cd MCP/moncter-mcp-server
npm install
```

### 2. 编译 TypeScript

```bash
npm run build
```

### 3. 配置 MCP

编辑 `MCP/mcp.json` 文件，确保 Moncter MCP 服务器配置正确：

```json
{
  "mcpServers": {
    "Moncter": {
      "command": "node",
      "args": ["./MCP/moncter-mcp-server/dist/index.js"],
      "cwd": "E:/Cunkebao/Cunkebao02/Moncter",
      "env": {
        "MONCTER_API_URL": "http://127.0.0.1:8787"
      }
    }
  }
}
```

**注意**：`cwd` 路径需要根据实际项目路径修改。

## 可用的 MCP 工具

### 1. create_data_collection_task

创建数据采集任务。

**参数**：
- `name` (string, 必需): 任务名称
- `description` (string, 可选): 任务描述
- `data_source_id` (string, 必需): 数据源ID
- `database` (string, 必需): 数据库名称
- `collection` (string, 可选): 集合名称（单集合模式）
- `collections` (array, 可选): 集合列表（多集合模式）
- `mode` (string, 必需): 采集模式（batch/realtime）
- `field_mappings` (array, 可选): 字段映射配置
- `schedule` (object, 可选): 调度配置

**示例**：
```json
{
  "name": "create_data_collection_task",
  "arguments": {
    "name": "订单数据采集",
    "data_source_id": "data_source_id_123",
    "database": "KR_商城",
    "collection": "21年贝蒂喜订单整合",
    "mode": "realtime"
  }
}
```

### 2. create_tag_task

创建标签计算任务。

**参数**：
- `name` (string, 必需): 任务名称
- `task_type` (string, 必需): 任务类型（full/incremental/specific）
- `target_tag_ids` (array, 必需): 要计算的标签ID列表
- `user_scope` (object, 可选): 用户范围配置
- `schedule` (object, 可选): 调度配置
- `config` (object, 可选): 高级配置

**示例**：
```json
{
  "name": "create_tag_task",
  "arguments": {
    "name": "高价值用户标签计算",
    "task_type": "full",
    "target_tag_ids": ["tag_id_1", "tag_id_2"],
    "user_scope": {
      "type": "all"
    }
  }
}
```

### 3. list_data_collection_tasks

获取数据采集任务列表。

**参数**：
- `page` (number, 可选): 页码
- `page_size` (number, 可选): 每页数量

### 4. list_tag_tasks

获取标签任务列表。

**参数**：
- `page` (number, 可选): 页码
- `page_size` (number, 可选): 每页数量

### 5. get_data_sources

获取数据源列表。

**参数**：
- `type` (string, 可选): 数据源类型筛选
- `status` (number, 可选): 状态筛选（1=启用，0=禁用）

### 6. get_tag_definitions

获取标签定义列表。

**参数**：
- `status` (number, 可选): 状态筛选（1=启用，0=禁用）

### 7. start_data_collection_task

启动数据采集任务。

**参数**：
- `task_id` (string, 必需): 任务ID

### 8. start_tag_task

启动标签任务。

**参数**：
- `task_id` (string, 必需): 任务ID

## 环境变量

- `MONCTER_API_URL`: 后端API基础URL（默认: http://127.0.0.1:8787）

## 使用场景

### 场景1：通过 AI 助手创建数据采集任务

你可以通过支持 MCP 的 AI 助手（如 Claude Desktop）来创建任务：

1. 告诉 AI："创建一个实时监听的数据采集任务，从数据源 X 的数据库 Y 的集合 Z 采集数据"
2. AI 会调用 `create_data_collection_task` 工具
3. 任务创建成功后，AI 会告诉你任务ID和状态

### 场景2：批量创建标签任务

通过 MCP 工具批量创建多个标签计算任务：

1. 列出所有标签定义：`get_tag_definitions`
2. 为每个标签创建计算任务：`create_tag_task`
3. 启动所有任务：`start_tag_task`

### 场景3：任务管理

通过 MCP 工具查询和管理任务：

1. 列出所有任务：`list_data_collection_tasks` / `list_tag_tasks`
2. 查看任务详情和状态
3. 启动/暂停/停止任务

## 开发调试

### 开发模式

```bash
cd MCP/moncter-mcp-server
npm run dev
```

### 测试 MCP 服务器

可以使用 MCP Inspector 或其他 MCP 客户端工具来测试服务器：

```bash
# 如果安装了 @modelcontextprotocol/inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

## 故障排除

### 问题1：服务器无法启动

- 检查 Node.js 版本（需要 >= 18）
- 检查是否已安装依赖：`npm install`
- 检查是否已编译：`npm run build`

### 问题2：无法连接到后端API

- 检查 `MONCTER_API_URL` 环境变量是否正确
- 检查后端服务是否运行在指定端口
- 检查防火墙和网络连接

### 问题3：工具调用失败

- 检查后端API接口是否正常
- 检查参数是否正确
- 查看服务器日志输出

## 扩展开发

要添加新的 MCP 工具：

1. 在 `src/index.ts` 的 `ListToolsRequestSchema` handler 中添加新工具定义
2. 在 `CallToolRequestSchema` handler 中添加工具处理逻辑
3. 重新编译：`npm run build`
4. 重启 MCP 服务器

## 注意事项

1. **API URL 配置**：确保 `MONCTER_API_URL` 指向正确的后端服务地址
2. **路径配置**：`mcp.json` 中的 `cwd` 和 `args` 路径需要根据实际项目路径调整
3. **权限**：MCP 工具调用会直接操作后端API，请确保权限控制
4. **错误处理**：工具调用失败时会返回错误信息，请检查返回内容

---

**更新时间**：2025-01-24

