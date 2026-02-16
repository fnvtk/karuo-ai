# MCP服务器同步更新说明

## 更新日期
2025年12月

## 更新背景

根据最新的 `TaskForm.vue` 界面变更，MCP服务器需要同步更新以匹配最新的界面逻辑。

---

## 主要变更

### ✅ 移除的字段

根据最新的TaskForm.vue，以下字段已经从界面中移除，MCP服务器也已移除：

1. **`target_data_source_id`** - 目标数据源ID
2. **`target_database`** - 目标数据库
3. **`target_collection`** - 目标集合

**原因**：
- 对于 `consumption_record` 类型，Handler会自动处理存储到标签引擎数据库，不需要指定目标
- 对于 `generic` 类型，如果需要指定目标，应该在Handler配置或业务逻辑中处理
- 界面已经简化，不再要求用户配置这些字段

### ✅ 保留和优化的字段

#### 核心字段（必填）

1. **`name`** - 任务名称
2. **`data_source_id`** - 源数据源ID
3. **`database`** - 源数据库名称
4. **`mode`** - 采集模式（`batch` 或 `realtime`）
5. **`target_type`** - 目标类型（`consumption_record` 或 `generic`）

#### 集合配置字段

6. **`collection`** - 源集合名称（单集合模式）
7. **`collections`** - 源集合列表（多集合模式）
8. **`multi_collection`** - 是否启用多集合模式

**说明**：`collection` 和 `collections` 二选一，由 `multi_collection` 字段决定使用哪个。

#### 字段映射字段

9. **`field_mappings`** - 字段映射配置（单集合模式）
   - 格式：`[{ source_field, target_field, transform? }]`
   - 转换函数：`parse_amount`, `parse_datetime`, `parse_phone`

10. **`collection_field_mappings`** - 字段映射配置（多集合模式）
    - 格式：`{ "collection_name": [FieldMapping] }`
    - 每个集合可配置独立的字段映射

#### 查询配置字段

11. **`lookups`** - MongoDB $lookup连表查询配置（单集合模式）
    - 格式：`[{ from, local_field, foreign_field, as, unwrap?, preserve_null? }]`

12. **`collection_lookups`** - MongoDB $lookup连表查询配置（多集合模式）
    - 格式：`{ "collection_name": [LookupConfig] }`

13. **`filter_conditions`** - 过滤条件
    - 格式：`[{ field, operator, value }]`
    - 运算符：`eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`

#### 调度配置字段

14. **`schedule`** - 调度配置（批量模式使用）
    - `enabled`: 是否启用调度
    - `cron`: Cron表达式

---

## 字段使用指南

### 1. 消费记录采集任务（consumption_record）

**适用场景**：采集订单、交易等消费记录数据

**特点**：
- Handler会自动转换数据格式
- 通过手机号/身份证自动解析用户ID
- 自动时间分片存储（按月分表）
- 存储到标签引擎数据库

**示例**：
```json
{
  "name": "订单数据采集",
  "description": "从KR商城采集订单数据",
  "data_source_id": "source_123",
  "database": "KR_商城",
  "collection": "21年贝蒂喜订单整合",
  "multi_collection": false,
  "target_type": "consumption_record",
  "mode": "batch",
  "field_mappings": [
    {
      "source_field": "联系手机",
      "target_field": "phone_number",
      "transform": "parse_phone"
    },
    {
      "source_field": "买家实际支付金额",
      "target_field": "actual_amount",
      "transform": "parse_amount"
    },
    {
      "source_field": "订单付款时间",
      "target_field": "consume_time",
      "transform": "parse_datetime"
    },
    {
      "source_field": "店铺名称",
      "target_field": "store_name"
    }
  ],
  "filter_conditions": [
    {
      "field": "买家实际支付金额",
      "operator": "ne",
      "value": "0"
    },
    {
      "field": "订单付款时间",
      "operator": "ne",
      "value": null
    }
  ],
  "schedule": {
    "enabled": true,
    "cron": "0 2 * * *"
  }
}
```

### 2. 通用集合采集任务（generic）

**适用场景**：采集任意数据并存储到指定集合

**特点**：
- 需要自定义字段映射
- 需要指定目标存储（在Handler配置中）

**示例**：
```json
{
  "name": "通用数据采集",
  "description": "采集用户数据",
  "data_source_id": "source_123",
  "database": "user_db",
  "collection": "users",
  "multi_collection": false,
  "target_type": "generic",
  "mode": "realtime",
  "field_mappings": [
    {
      "source_field": "user_name",
      "target_field": "name"
    },
    {
      "source_field": "user_email",
      "target_field": "email"
    }
  ],
  "schedule": {
    "enabled": false
  }
}
```

### 3. 多集合模式

**适用场景**：同时从多个集合采集数据

**示例**：
```json
{
  "name": "多集合数据采集",
  "data_source_id": "source_123",
  "database": "multi_db",
  "multi_collection": true,
  "collections": ["collection1", "collection2"],
  "target_type": "generic",
  "mode": "batch",
  "collection_field_mappings": {
    "collection1": [
      {
        "source_field": "field1",
        "target_field": "target1"
      }
    ],
    "collection2": [
      {
        "source_field": "field2",
        "target_field": "target2"
      }
    ]
  },
  "collection_lookups": {
    "collection1": [
      {
        "from": "related_collection",
        "local_field": "related_id",
        "foreign_field": "_id",
        "as": "related_data",
        "unwrap": false,
        "preserve_null": true
      }
    ]
  },
  "schedule": {
    "enabled": true,
    "cron": "0 3 * * *"
  }
}
```

### 4. 连表查询配置

**适用场景**：需要从其他集合关联数据

**示例**：
```json
{
  "lookups": [
    {
      "from": "user_info",
      "local_field": "user_id",
      "foreign_field": "_id",
      "as": "user_info",
      "unwrap": true,
      "preserve_null": false
    }
  ]
}
```

**说明**：
- `unwrap: true` - 解构后可直接使用 `user_info.mobile`
- `unwrap: false` - 返回数组 `user_info[0].mobile`

---

## 与界面的对应关系

| MCP字段 | TaskForm字段 | 界面位置 | 说明 |
|---------|-------------|---------|------|
| name | form.name | 步骤1：基本信息 | 任务名称 |
| description | form.description | 步骤1：基本信息 | 任务描述 |
| mode | form.mode | 步骤1：基本信息 | 采集模式 |
| target_type | form.target_type | 步骤2：Handler配置 | 数据处理方式 |
| data_source_id | form.data_source_id | 步骤3：源数据配置 | 数据源 |
| database | form.database | 步骤3：源数据配置 | 数据库 |
| collection | form.collection | 步骤3：源数据配置 | 集合（单集合） |
| collections | form.collections | 步骤3：源数据配置 | 集合列表（多集合） |
| multi_collection | form.multi_collection | 步骤3：源数据配置 | 多集合模式开关 |
| lookups | form.lookups | 步骤3：连表查询 | 连表查询配置 |
| filter_conditions | form.filter_conditions | 步骤3：过滤条件 | 过滤条件 |
| field_mappings | form.field_mappings | 步骤4：字段映射 | 字段映射（单集合） |
| collection_field_mappings | form.collection_field_mappings | 步骤4：字段映射 | 字段映射（多集合） |
| schedule | form.schedule | 步骤5：调度配置 | 调度配置 |

---

## 验证清单

✅ MCP服务器已更新，完全匹配最新的TaskForm.vue界面逻辑：

- [x] 移除了 `target_data_source_id`, `target_database`, `target_collection` 字段
- [x] 保留了所有界面使用的字段
- [x] 更新了字段描述，使其更清晰准确
- [x] 明确了字段的使用场景和条件要求
- [x] 支持单集合和多集合模式
- [x] 支持连表查询和过滤条件
- [x] 支持字段映射和转换函数

---

## 注意事项

1. **target_type是必填的**：必须明确指定是 `consumption_record` 还是 `generic`
2. **collection和collections二选一**：根据 `multi_collection` 决定使用哪个
3. **字段映射方式**：
   - 单集合模式使用 `field_mappings`
   - 多集合模式使用 `collection_field_mappings`
4. **连表查询方式**：
   - 单集合模式使用 `lookups`
   - 多集合模式使用 `collection_lookups`
5. **调度配置**：仅在 `mode=batch` 时使用

---

## 测试建议

1. **测试消费记录采集任务创建**
   ```json
   {
     "name": "测试任务",
     "data_source_id": "test_source",
     "database": "test_db",
     "collection": "test_collection",
     "target_type": "consumption_record",
     "mode": "batch",
     "field_mappings": [...],
     "schedule": {"enabled": true, "cron": "0 2 * * *"}
   }
   ```

2. **测试多集合模式**
   ```json
   {
     "name": "多集合测试",
     "data_source_id": "test_source",
     "database": "test_db",
     "multi_collection": true,
     "collections": ["coll1", "coll2"],
     "target_type": "generic",
     "mode": "batch",
     "collection_field_mappings": {...}
   }
   ```

3. **测试连表查询**
   ```json
   {
     "lookups": [{
       "from": "related",
       "local_field": "id",
       "foreign_field": "_id",
       "as": "related_data"
     }]
   }
   ```

---

## 总结

MCP服务器已成功同步更新，完全匹配最新的TaskForm.vue界面逻辑。所有字段定义、使用方式和验证规则都与界面保持一致。

