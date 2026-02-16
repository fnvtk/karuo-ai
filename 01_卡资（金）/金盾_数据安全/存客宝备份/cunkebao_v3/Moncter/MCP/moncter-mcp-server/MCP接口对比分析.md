# MCP服务器接口对比分析

## 问题分析

对比标签引擎的MCP服务器和实际的采集任务接口，发现以下差异：

---

## 一、后端接口要求（DataCollectionTaskController）

### 必填字段（从Controller验证逻辑看）：
```php
$requiredFields = ['name', 'data_source_id', 'database', 'target_data_source_id', 'target_database', 'target_collection'];
```

### 可选但支持的字段：
- `target_type` - 目标类型（consumption_record 或 generic）
- `mode` - 采集模式（batch 或 realtime）
- `collection` - 单集合模式
- `collections` - 多集合模式（与collection二选一）
- `multi_collection` - 是否多集合模式
- `field_mappings` - 字段映射（单集合模式）
- `collection_field_mappings` - 字段映射（多集合模式）
- `lookups` - 连表查询配置（单集合模式）
- `collection_lookups` - 连表查询配置（多集合模式）
- `filter_conditions` - 过滤条件
- `schedule` - 调度配置
- `description` - 任务描述

---

## 二、前端TaskForm实际使用的字段

根据 `TaskShow/src/views/DataCollection/TaskForm.vue`，前端表单包含：

```typescript
{
  name: string
  description: string
  data_source_id: string
  database: string
  collection?: string  // 单集合模式
  collections?: string[]  // 多集合模式
  multi_collection: boolean
  target_type: string  // 'consumption_record' | 'generic'
  mode: 'batch' | 'realtime'
  field_mappings: FieldMapping[]
  collection_field_mappings?: Record<string, FieldMapping[]>
  lookups?: LookupConfig[]
  collection_lookups?: Record<string, LookupConfig[]>
  filter_conditions?: FilterCondition[]
  schedule: {
    enabled: boolean
    cron?: string
  }
}
```

**注意**：前端**没有** `target_data_source_id`, `target_database`, `target_collection` 字段！

---

## 三、MCP服务器当前支持的字段

根据 `MCP/moncter-mcp-server/src/index.ts`，当前支持：

```typescript
{
  name: string
  description: string
  data_source_id: string
  database: string
  collection?: string
  collections?: string[]
  mode: 'batch' | 'realtime'
  field_mappings: FieldMapping[]
  schedule: {
    enabled: boolean
    cron?: string
  }
}
```

---

## 四、字段差异对比

### ❌ MCP服务器缺少的字段：

1. **`target_type`** - 目标类型（重要！）
   - 前端使用：`'consumption_record'` 或 `'generic'`
   - 用途：决定使用哪个Handler处理数据
   - 优先级：**高**

2. **`multi_collection`** - 多集合模式标识
   - 前端使用：`boolean`
   - 用途：区分单集合和多集合模式
   - 优先级：**中**

3. **`filter_conditions`** - 过滤条件
   - 前端使用：`FilterCondition[]`
   - 用途：数据采集的过滤条件
   - 优先级：**中**

4. **`lookups`** - 连表查询配置（单集合模式）
   - 前端使用：`LookupConfig[]`
   - 用途：MongoDB $lookup 连表查询
   - 优先级：**低**

5. **`collection_lookups`** - 连表查询配置（多集合模式）
   - 前端使用：`Record<string, LookupConfig[]>`
   - 用途：多集合模式下的连表查询
   - 优先级：**低**

6. **`collection_field_mappings`** - 字段映射（多集合模式）
   - 前端使用：`Record<string, FieldMapping[]>`
   - 用途：多集合模式下每个集合的字段映射
   - 优先级：**中**

### ⚠️ 后端Controller要求的字段（但前端和Service都没使用）：

1. **`target_data_source_id`** - 目标数据源ID
2. **`target_database`** - 目标数据库
3. **`target_collection`** - 目标集合

**分析**：
- Controller的验证逻辑要求这些字段必填
- 但Service的`createTask`方法并没有使用这些字段
- 前端TaskForm也没有这些字段
- 对于`consumption_record`类型，Handler会自动处理存储，不需要指定目标
- 对于`generic`类型，可能需要这些字段

**结论**：这些字段可能是历史遗留，或者仅对`generic`类型必需，对`consumption_record`类型不是必需的。需要确认后端逻辑。

---

## 五、建议的修复方案

### 方案1：更新MCP服务器，添加缺失字段

**优先添加的字段**：
1. ✅ `target_type` - **必需**
2. ✅ `multi_collection` - **推荐**
3. ✅ `filter_conditions` - **推荐**
4. ✅ `collection_field_mappings` - **推荐**（支持多集合模式）
5. ⚠️ `lookups` - 可选
6. ⚠️ `collection_lookups` - 可选

**暂不处理**：
- `target_data_source_id`, `target_database`, `target_collection` - 需要先确认后端逻辑

### 方案2：确认后端接口的实际要求

需要确认：
1. `target_data_source_id`, `target_database`, `target_collection` 是否真的必需？
2. 对于`consumption_record`类型，这些字段是否可选？
3. 如果必需，MCP服务器需要添加这些字段

---

## 六、当前状态总结

### ✅ MCP服务器已支持的字段：
- name
- description
- data_source_id
- database
- collection / collections
- mode
- field_mappings
- schedule

### ❌ MCP服务器缺少的字段（按优先级）：
1. **target_type** - ⚠️ 重要！决定Handler类型
2. **multi_collection** - 区分单/多集合模式
3. **filter_conditions** - 数据过滤条件
4. **collection_field_mappings** - 多集合模式的字段映射
5. **lookups** - 连表查询（可选）
6. **collection_lookups** - 多集合连表查询（可选）

### ⚠️ 需要确认的字段：
- target_data_source_id
- target_database
- target_collection

---

## 七、下一步行动

1. ✅ 对比分析完成
2. ⏳ 更新MCP服务器，添加缺失字段
3. ⏳ 确认后端接口对target相关字段的要求
4. ⏳ 测试更新后的MCP服务器

