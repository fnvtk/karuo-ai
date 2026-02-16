# MCP服务器更新说明

## 更新日期
2025年12月

## 更新内容

### ✅ 已添加的字段

更新了 `create_data_collection_task` 工具，添加了以下缺失的字段：

1. **`target_type`** ⭐ **重要**
   - 类型：`'consumption_record' | 'generic'`
   - 必填：是
   - 说明：决定使用哪个Handler处理数据
   - 用途：
     - `consumption_record`: 使用ConsumptionCollectionHandler，自动处理消费记录格式转换和存储
     - `generic`: 使用GenericCollectionHandler，支持自定义字段映射和目标存储

2. **`multi_collection`**
   - 类型：`boolean`
   - 必填：否
   - 说明：是否启用多集合模式

3. **`target_data_source_id`**
   - 类型：`string`
   - 必填：否（但后端Controller验证要求必填，见注意事项）
   - 说明：目标数据源ID（通用Handler需要）

4. **`target_database`**
   - 类型：`string`
   - 必填：否（但后端Controller验证要求必填，见注意事项）
   - 说明：目标数据库（通用Handler需要）

5. **`target_collection`**
   - 类型：`string`
   - 必填：否（但后端Controller验证要求必填，见注意事项）
   - 说明：目标集合（通用Handler需要）

6. **`collection_field_mappings`**
   - 类型：`object`
   - 必填：否
   - 说明：多集合模式下的字段映射，格式：`{ "collection_name": [FieldMapping] }`

7. **`lookups`**
   - 类型：`array`
   - 必填：否
   - 说明：单集合模式下的MongoDB $lookup连表查询配置
   - 结构：
     ```typescript
     {
       from: string,           // 关联集合名
       local_field: string,    // 主集合字段
       foreign_field: string,  // 关联集合字段
       as: string,             // 结果字段名
       unwrap?: boolean,       // 是否解构
       preserve_null?: boolean // 是否保留空值
     }
     ```

8. **`collection_lookups`**
   - 类型：`object`
   - 必填：否
   - 说明：多集合模式下的连表查询配置，格式：`{ "collection_name": [LookupConfig] }`

9. **`filter_conditions`**
   - 类型：`array`
   - 必填：否
   - 说明：数据采集的过滤条件
   - 结构：
     ```typescript
     {
       field: string,
       operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin',
       value: any
     }
     ```

### 📝 更新的字段说明

- **`field_mappings`**: 添加了更详细的说明，明确是单集合模式的字段映射

### ✅ 更新的必填字段

- 新增 `target_type` 为必填字段（这是最重要的字段，决定Handler类型）

---

## ⚠️ 注意事项

### 1. 后端Controller验证问题

**问题**：
后端 `DataCollectionTaskController::create()` 方法要求以下字段必填：
- `target_data_source_id`
- `target_database`
- `target_collection`

**但实际情况**：
- 前端 `TaskForm.vue` 没有这些字段
- Service的 `createTask()` 方法也没有使用这些字段
- 对于 `consumption_record` 类型，Handler会自动处理存储，不需要指定目标

**可能的原因**：
1. Controller的验证逻辑过于严格
2. 这些字段仅对 `generic` 类型必需
3. 后端代码不一致（Controller和Service不同步）

**建议**：
1. 如果使用 `consumption_record` 类型，可能需要传递空值或默认值
2. 如果使用 `generic` 类型，必须提供这些字段
3. 建议后端修改验证逻辑，根据 `target_type` 动态验证必填字段

### 2. 字段使用建议

**对于 consumption_record 类型**：
```json
{
  "name": "订单采集任务",
  "data_source_id": "source_123",
  "database": "KR_商城",
  "collection": "21年贝蒂喜订单整合",
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
    }
  ],
  "filter_conditions": [
    {
      "field": "买家实际支付金额",
      "operator": "ne",
      "value": "0"
    }
  ],
  "schedule": {
    "enabled": true,
    "cron": "0 2 * * *"
  }
}
```

**对于 generic 类型**：
```json
{
  "name": "通用数据采集",
  "data_source_id": "source_123",
  "database": "KR_商城",
  "collection": "some_collection",
  "target_type": "generic",
  "target_data_source_id": "target_source_123",
  "target_database": "target_db",
  "target_collection": "target_collection",
  "mode": "batch",
  "field_mappings": [
    {
      "source_field": "source_field1",
      "target_field": "target_field1"
    }
  ],
  "schedule": {
    "enabled": false
  }
}
```

---

## 📊 字段对比表

| 字段 | MCP服务器（更新前） | MCP服务器（更新后） | 前端 | 后端Controller | 优先级 |
|------|-------------------|-------------------|------|---------------|--------|
| name | ✅ | ✅ | ✅ | ✅ 必填 | 高 |
| data_source_id | ✅ | ✅ | ✅ | ✅ 必填 | 高 |
| database | ✅ | ✅ | ✅ | ✅ 必填 | 高 |
| collection/collections | ✅ | ✅ | ✅ | ✅ 必填 | 高 |
| mode | ✅ | ✅ | ✅ | ✅ | 高 |
| field_mappings | ✅ | ✅ | ✅ | ✅ | 中 |
| schedule | ✅ | ✅ | ✅ | ✅ | 中 |
| target_type | ❌ | ✅ **新增** | ✅ | ✅ | **高** ⭐ |
| multi_collection | ❌ | ✅ **新增** | ✅ | ✅ | 中 |
| filter_conditions | ❌ | ✅ **新增** | ✅ | ✅ | 中 |
| collection_field_mappings | ❌ | ✅ **新增** | ✅ | ✅ | 中 |
| lookups | ❌ | ✅ **新增** | ✅ | ✅ | 低 |
| collection_lookups | ❌ | ✅ **新增** | ✅ | ✅ | 低 |
| target_data_source_id | ❌ | ✅ **新增** | ❌ | ✅ 必填 | ⚠️ |
| target_database | ❌ | ✅ **新增** | ❌ | ✅ 必填 | ⚠️ |
| target_collection | ❌ | ✅ **新增** | ❌ | ✅ 必填 | ⚠️ |

---

## ✅ 更新后的状态

### 完全支持的字段：
- ✅ 基本字段（name, description, data_source_id, database, collection/collections）
- ✅ 模式配置（mode, multi_collection）
- ✅ 目标配置（target_type, target_data_source_id, target_database, target_collection）
- ✅ 字段映射（field_mappings, collection_field_mappings）
- ✅ 查询配置（lookups, collection_lookups, filter_conditions）
- ✅ 调度配置（schedule）

### ⚠️ 需要注意的问题：
- 后端Controller要求 `target_data_source_id`, `target_database`, `target_collection` 必填，但前端和Service都没有使用
- 建议在使用MCP创建任务时，对于 `consumption_record` 类型，可能需要传递这些字段的空值或默认值，或者后端需要修改验证逻辑

---

## 🔄 下一步建议

1. **后端验证逻辑优化**：
   - 根据 `target_type` 动态验证必填字段
   - 对于 `consumption_record` 类型，不需要 `target_*` 字段
   - 对于 `generic` 类型，需要 `target_*` 字段

2. **测试验证**：
   - 测试使用MCP创建 `consumption_record` 类型的任务
   - 测试使用MCP创建 `generic` 类型的任务
   - 验证所有新增字段是否正确传递

3. **文档更新**：
   - 更新MCP使用文档，说明不同 `target_type` 的字段要求
   - 添加使用示例

---

## 📝 总结

MCP服务器已经更新，**基本符合**当前的采集任务接口要求。主要添加了：

1. ✅ **target_type** - 最重要的字段，决定Handler类型
2. ✅ **multi_collection** - 支持多集合模式
3. ✅ **filter_conditions** - 支持数据过滤
4. ✅ **lookups/collection_lookups** - 支持连表查询
5. ✅ **collection_field_mappings** - 支持多集合字段映射
6. ✅ **target_* 字段** - 虽然前端没有，但后端Controller要求，已添加

**剩余问题**：后端Controller的验证逻辑可能与实际使用不一致，需要确认或调整。

