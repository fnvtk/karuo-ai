# Moncter MCP Server

Moncter MCP Server 是一个 Model Context Protocol (MCP) 服务器，用于通过 MCP 协议管理 Moncter 系统的数据采集任务和标签任务。

## 功能

提供以下 MCP 工具：

1. **create_data_collection_task** - 创建数据采集任务
2. **create_tag_task** - 创建标签计算任务
3. **list_data_collection_tasks** - 获取数据采集任务列表
4. **list_tag_tasks** - 获取标签任务列表
5. **get_data_sources** - 获取数据源列表
6. **get_tag_definitions** - 获取标签定义列表
7. **start_data_collection_task** - 启动数据采集任务
8. **start_tag_task** - 启动标签任务

## 安装

```bash
cd MCP/moncter-mcp-server
npm install
npm run build
```

## 配置

在 `mcp.json` 中配置服务器：

```json
{
  "mcpServers": {
    "Moncter": {
      "command": "node",
      "args": ["E:/Cunkebao/Cunkebao02/Moncter/MCP/moncter-mcp-server/dist/index.js"],
      "env": {
        "MONCTER_API_URL": "http://127.0.0.1:8787"
      }
    }
  }
}
```

或者使用 npm 方式（如果全局安装）：

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

## 环境变量

- `MONCTER_API_URL`: 后端API基础URL（默认: http://127.0.0.1:8787）

## 使用示例

### 创建数据采集任务

```json
{
  "name": "create_data_collection_task",
  "arguments": {
    "name": "订单数据采集",
    "description": "从KR商城采集订单数据",
    "data_source_id": "your_data_source_id",
    "database": "KR_商城",
    "collection": "21年贝蒂喜订单整合",
    "mode": "realtime",
    "field_mappings": [
      {
        "source_field": "订单号",
        "target_field": "order_no"
      }
    ]
  }
}
```

### 创建标签任务

```json
{
  "name": "create_tag_task",
  "arguments": {
    "name": "高价值用户标签计算",
    "description": "计算高价值用户标签",
    "task_type": "full",
    "target_tag_ids": ["tag_id_1", "tag_id_2"],
    "user_scope": {
      "type": "all"
    },
    "schedule": {
      "enabled": true,
      "cron": "0 2 * * *"
    }
  }
}
```

## 开发

```bash
# 开发模式（使用 tsx）
npm run dev

# 编译
npm run build

# 运行
npm start
```

