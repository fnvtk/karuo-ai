#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// 获取后端API基础URL（从环境变量或默认值）
const API_BASE_URL = process.env.MONCTER_API_URL || 'http://127.0.0.1:8787';

/**
 * HTTP请求辅助函数
 */
async function apiRequest(
  method: string,
  endpoint: string,
  data?: any
): Promise<any> {
  const url = `${API_BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json() as any;

    if (result.code !== 0 && result.code !== undefined) {
      throw new Error(result.message || 'API请求失败');
    }

    return result.data || result;
  } catch (error: any) {
    throw new Error(`API请求错误: ${error.message}`);
  }
}

/**
 * 创建MCP服务器
 */
const server = new Server(
  {
    name: 'moncter-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 列出可用工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'create_data_collection_task',
        description: '创建数据采集任务。用于从数据源采集数据并转换为消费记录或其他格式。支持单集合和多集合模式，支持连表查询和过滤条件。',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: '任务名称（必填）',
            },
            description: {
              type: 'string',
              description: '任务描述（可选）',
            },
            data_source_id: {
              type: 'string',
              description: '源数据源ID（必填）',
            },
            database: {
              type: 'string',
              description: '源数据库名称（必填）',
            },
            collection: {
              type: 'string',
              description: '源集合名称（单集合模式，与collections二选一）',
            },
            collections: {
              type: 'array',
              items: { type: 'string' },
              description: '源集合列表（多集合模式，与collection二选一）',
            },
            multi_collection: {
              type: 'boolean',
              description: '是否启用多集合模式。true=使用collections字段，false=使用collection字段',
            },
            target_type: {
              type: 'string',
              enum: ['consumption_record', 'generic'],
              description: '目标类型（必填）：consumption_record=消费记录处理（自动转换格式，通过手机号解析用户ID，时间分片存储到标签引擎数据库），generic=通用集合处理（需要自定义字段映射和目标存储配置）',
            },
            mode: {
              type: 'string',
              enum: ['batch', 'realtime'],
              description: '采集模式（必填）：batch=批量采集（定时执行），realtime=实时监听（持续监听数据变化）',
            },
            field_mappings: {
              type: 'array',
              description: '字段映射配置（单集合模式使用），将源字段映射到目标字段',
              items: {
                type: 'object',
                properties: {
                  source_field: { 
                    type: 'string', 
                    description: '源字段名（查询结果中的字段）' 
                  },
                  target_field: { 
                    type: 'string', 
                    description: '目标字段名（Handler需要的字段名）' 
                  },
                  transform: { 
                    type: 'string',
                    enum: ['parse_amount', 'parse_datetime', 'parse_phone'],
                    description: '转换函数（可选）：parse_amount=解析金额，parse_datetime=解析日期时间，parse_phone=解析手机号'
                  },
                },
                required: ['source_field', 'target_field'],
              },
            },
            collection_field_mappings: {
              type: 'object',
              description: '字段映射配置（多集合模式使用），格式：{ "collection_name": [FieldMapping] }，每个集合可配置独立的字段映射',
              additionalProperties: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    source_field: { type: 'string' },
                    target_field: { type: 'string' },
                    transform: { type: 'string' },
                  },
                },
              },
            },
            lookups: {
              type: 'array',
              description: 'MongoDB $lookup连表查询配置（单集合模式使用，可选），可以从其他集合关联数据',
              items: {
                type: 'object',
                properties: {
                  from: { 
                    type: 'string', 
                    description: '关联集合名' 
                  },
                  local_field: { 
                    type: 'string', 
                    description: '主集合字段（用于关联的字段）' 
                  },
                  foreign_field: { 
                    type: 'string', 
                    description: '关联集合字段（被关联集合的字段，通常是_id）' 
                  },
                  as: { 
                    type: 'string', 
                    description: '结果字段名（关联结果存储的字段名）' 
                  },
                  unwrap: { 
                    type: 'boolean', 
                    description: '是否解构（true=解构后可直接使用user_info.mobile，false=返回数组）' 
                  },
                  preserve_null: { 
                    type: 'boolean', 
                    description: '是否保留空值（当关联不到数据时是否保留）' 
                  },
                },
                required: ['from', 'local_field', 'foreign_field', 'as'],
              },
            },
            collection_lookups: {
              type: 'object',
              description: 'MongoDB $lookup连表查询配置（多集合模式使用，可选），格式：{ "collection_name": [LookupConfig] }，每个集合可配置独立的连表查询',
              additionalProperties: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    from: { type: 'string' },
                    local_field: { type: 'string' },
                    foreign_field: { type: 'string' },
                    as: { type: 'string' },
                    unwrap: { type: 'boolean' },
                    preserve_null: { type: 'boolean' },
                  },
                },
              },
            },
            filter_conditions: {
              type: 'array',
              description: '过滤条件（可选），只采集满足条件的数据',
              items: {
                type: 'object',
                properties: {
                  field: { 
                    type: 'string', 
                    description: '字段名' 
                  },
                  operator: {
                    type: 'string',
                    enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin'],
                    description: '运算符：eq=等于，ne=不等于，gt=大于，gte=大于等于，lt=小于，lte=小于等于，in=在列表中，nin=不在列表中'
                  },
                  value: { 
                    type: ['string', 'number', 'boolean', 'array'], 
                    description: '值（可以是字符串、数字、布尔值或数组）' 
                  },
                },
                required: ['field', 'operator', 'value'],
              },
            },
            schedule: {
              type: 'object',
              description: '调度配置（批量模式batch时使用）',
              properties: {
                enabled: { 
                  type: 'boolean', 
                  description: '是否启用调度（批量模式时可启用Cron定时执行）' 
                },
                cron: { 
                  type: 'string', 
                  description: 'Cron表达式（格式：分 时 日 月 周，例如：0 2 * * * 表示每天凌晨2点执行）' 
                },
              },
            },
          },
          required: ['name', 'data_source_id', 'database', 'mode', 'target_type'],
        },
      },
      {
        name: 'create_tag_task',
        description: '创建标签计算任务。用于批量计算用户标签。',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: '任务名称',
            },
            description: {
              type: 'string',
              description: '任务描述',
            },
            task_type: {
              type: 'string',
              enum: ['full', 'incremental', 'specific'],
              description: '任务类型：full=全量计算，incremental=增量计算，specific=指定用户',
            },
            target_tag_ids: {
              type: 'array',
              items: { type: 'string' },
              description: '要计算的标签ID列表',
            },
            user_scope: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['all', 'list', 'filter'],
                  description: '用户范围类型',
                },
                user_ids: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '用户ID列表（当type=list时）',
                },
                filter_conditions: {
                  type: 'array',
                  description: '筛选条件（当type=filter时）',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      operator: { type: 'string' },
                      value: { type: 'string' },
                    },
                  },
                },
              },
            },
            schedule: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                cron: { type: 'string' },
              },
            },
            config: {
              type: 'object',
              properties: {
                concurrency: { type: 'number' },
                batch_size: { type: 'number' },
                error_handling: {
                  type: 'string',
                  enum: ['skip', 'stop', 'retry'],
                },
              },
            },
          },
          required: ['name', 'task_type', 'target_tag_ids'],
        },
      },
      {
        name: 'list_data_collection_tasks',
        description: '获取数据采集任务列表',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: '页码' },
            page_size: { type: 'number', description: '每页数量' },
          },
        },
      },
      {
        name: 'list_tag_tasks',
        description: '获取标签任务列表',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: '页码' },
            page_size: { type: 'number', description: '每页数量' },
          },
        },
      },
      {
        name: 'get_data_sources',
        description: '获取数据源列表',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: '数据源类型筛选' },
            status: { type: 'number', description: '状态筛选：1=启用，0=禁用' },
          },
        },
      },
      {
        name: 'get_tag_definitions',
        description: '获取标签定义列表',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'number', description: '状态筛选：1=启用，0=禁用' },
          },
        },
      },
      {
        name: 'start_data_collection_task',
        description: '启动数据采集任务',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: '任务ID',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'start_tag_task',
        description: '启动标签任务',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: '任务ID',
            },
          },
          required: ['task_id'],
        },
      },
    ],
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'create_data_collection_task': {
        const result = await apiRequest(
          'POST',
          '/api/data-collection-tasks',
          args
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: '数据采集任务创建成功',
                  data: result,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'create_tag_task': {
        const result = await apiRequest('POST', '/api/tag-tasks', args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: '标签任务创建成功',
                  data: result,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'list_data_collection_tasks': {
        const params = new URLSearchParams();
        if (args?.page) params.append('page', String(args.page));
        if (args?.page_size) params.append('page_size', String(args.page_size));
        const query = params.toString();
        const endpoint = `/api/data-collection-tasks${query ? `?${query}` : ''}`;
        const result = await apiRequest('GET', endpoint);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_tag_tasks': {
        const params = new URLSearchParams();
        if (args?.page) params.append('page', String(args.page));
        if (args?.page_size) params.append('page_size', String(args.page_size));
        const query = params.toString();
        const endpoint = `/api/tag-tasks${query ? `?${query}` : ''}`;
        const result = await apiRequest('GET', endpoint);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_data_sources': {
        const params = new URLSearchParams();
        if (args?.type) params.append('type', String(args.type));
        if (args?.status !== undefined) params.append('status', String(args.status));
        const query = params.toString();
        const endpoint = `/api/data-sources${query ? `?${query}` : ''}`;
        const result = await apiRequest('GET', endpoint);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_tag_definitions': {
        const params = new URLSearchParams();
        if (args?.status !== undefined) params.append('status', String(args.status));
        const query = params.toString();
        const endpoint = `/api/tag-definitions${query ? `?${query}` : ''}`;
        const result = await apiRequest('GET', endpoint);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'start_data_collection_task': {
        if (!args?.task_id) {
          throw new Error('缺少必需参数: task_id');
        }
        const result = await apiRequest(
          'POST',
          `/api/data-collection-tasks/${args.task_id}/start`,
          {}
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: '数据采集任务启动成功',
                  data: result,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'start_tag_task': {
        if (!args?.task_id) {
          throw new Error('缺少必需参数: task_id');
        }
        const result = await apiRequest(
          'POST',
          `/api/tag-tasks/${args.task_id}/start`,
          {}
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: '标签任务启动成功',
                  data: result,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`未知的工具: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: error.message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Moncter MCP Server running on stdio');
}

main().catch((error) => {
  console.error('服务器启动失败:', error);
  process.exit(1);
});

