# QueryBuilder 组件说明

可视化查询构建器组件，支持 MongoDB 聚合查询配置。

## 功能特性

### ✅ 基础配置
- 数据源选择
- 数据库选择
- 单集合/多集合模式切换

### ✅ 多集合模式（新增）
- **集合列表展示**：复选框多选
- **文本筛选**：实时搜索过滤集合
- **批量操作**：
  - 全选：选择当前筛选结果的所有集合
  - 清空：清空所有已选集合
  - 反选：反选当前筛选结果
- **智能快捷筛选**（自动识别日期分片集合）：
  - 按年份：2021年、2022年、2023年、2024年、2025年
  - 按时间范围：最近3个月、最近6个月、最近12个月

### ✅ 过滤条件（WHERE）
- 多条件支持
- AND/OR 逻辑关系
- 丰富的运算符：
  - 等于、不等于
  - 大于、大于等于、小于、小于等于
  - 包含、不包含
  - 模糊匹配、存在

### ✅ 联表查询（JOIN/LOOKUP）
- 多表关联
- 支持 LEFT JOIN 效果
- 数组解构选项

### ✅ 排序和限制
- 字段排序
- 升序/降序
- 结果数量限制

### ✅ 查询预览
- 实时生成 MongoDB 聚合管道代码
- 数据预览（最多显示配置的 limit 条）

## 使用示例

### 基础用法

```vue
<template>
  <QueryBuilder v-model="queryConfig" />
</template>

<script setup>
import { reactive } from 'vue'
import QueryBuilder from '@/components/QueryBuilder/QueryBuilder.vue'

const queryConfig = reactive({
  data_source_id: '',
  database: '',
  collection: '',
  multi_collection: false,
  collections: [],
  filter: [],
  lookups: [],
  sort_field: '',
  sort_order: '1',
  limit: 1000
})
</script>
```

### 多集合模式示例

```javascript
// 配置数据结构
{
  data_source_id: 'source_001',
  database: 'ckb',
  collection: 'consumption_records_202101',  // 第一个集合（兼容性）
  multi_collection: true,                     // 启用多集合模式
  collections: [                              // 选中的集合列表
    'consumption_records_202101',
    'consumption_records_202102',
    'consumption_records_202103',
    'consumption_records_202104',
    'consumption_records_202105',
    'consumption_records_202106'
  ],
  filter: [
    { field: 'status', operator: 'eq', value: 'success' }
  ],
  lookups: [],
  sort_field: 'create_time',
  sort_order: '-1',
  limit: 1000
}
```

## 界面布局

```
┌─ 基础配置 ─────────────────────────────────────────┐
│ 数据源：[MongoDB数据源 ▼]                          │
│ 数据库：[ckb ▼]                                    │
│ 多集合模式：[●启用] ○禁用                          │
└────────────────────────────────────────────────────┘

┌─ 集合列表 ─────────────────────────────────────────┐
│ [🔍 筛选集合名称...]  [全选] [清空] [反选]          │
│                                                      │
│ 快捷筛选：[2021年] [2022年] [2023年] [2024年]      │
│          [最近3个月] [最近6个月] [最近12个月]       │
├──────────────────────────────────────────────────────┤
│ ☑ consumption_records_202101                        │
│ ☑ consumption_records_202102                        │
│ ☑ consumption_records_202103                        │
│ ☐ consumption_records_202104                        │
│ ☐ consumption_records_202105                        │
│ ... (滚动查看更多)                                   │
│                                                      │
│ 筛选结果：28个集合 | 已选择 3个集合                 │
└──────────────────────────────────────────────────────┘

┌─ 过滤条件（WHERE） ──────────────── [添加条件] ───┐
│ 逻辑 | 字段 | 运算符 | 值 | 操作                    │
│ -    | status | 等于 | success | [删除]            │
└──────────────────────────────────────────────────────┘

┌─ 联表查询（JOIN） ─────────────── [添加关联] ────┐
│ 关联集合 | 主字段 | 关联字段 | 结果名 | 操作       │
│ user_profile | user_id | user_id | user_info | [删除] │
└──────────────────────────────────────────────────────┘

┌─ 排序和限制 ────────────────────────────────────────┐
│ 排序字段：[create_time ▼] 排序方式：[降序 ▼]      │
│ 限制数量：[1000]                                    │
└──────────────────────────────────────────────────────┘

┌─ 查询预览 ───────────────────────── [预览数据] ───┐
│ // 多集合模式：将查询以下 3 个集合并合并结果       │
│ // consumption_records_202101, ...                  │
│                                                      │
│ db.consumption_records_202101.aggregate([           │
│   { $match: { status: { $eq: "success" } } },      │
│   { $sort: { create_time: -1 } },                  │
│   { $limit: 1000 }                                  │
│ ])                                                   │
│                                                      │
│ [预览数据表格]                                       │
└──────────────────────────────────────────────────────┘
```

## Props

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| modelValue | Object | - | 查询配置对象（v-model 绑定） |

## Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| update:modelValue | queryConfig | 配置变化时触发 |

## 多集合模式特性

### 智能识别
自动检测集合命名格式，如果包含6位数字（YYYYMM格式），则显示快捷筛选按钮。

**支持的格式**：
- `consumption_records_202101`
- `collection_2021_01`
- `data_202101_backup`

### 快捷筛选逻辑

#### 按年份筛选
匹配包含年份字符串的集合。

```javascript
// 点击 "2021年"
collections.filter(coll => coll.includes('2021'))
```

#### 按时间范围筛选
计算当前日期向前推算N个月，匹配包含对应年月的集合。

```javascript
// 点击 "最近3个月"（假设当前 2025-01）
匹配：202501, 202412, 202411
```

### 筛选功能实现

```javascript
// 实时筛选
const filteredCollections = computed(() => {
  if (!collectionFilter.value) return collections.value
  const filter = collectionFilter.value.toLowerCase()
  return collections.value.filter(coll => 
    coll.toLowerCase().includes(filter)
  )
})

// 全选
const handleSelectAllCollections = () => {
  const newSelections = [
    ...new Set([
      ...queryConfig.collections, 
      ...filteredCollections.value
    ])
  ]
  queryConfig.collections = newSelections
}

// 反选
const handleInvertCollections = () => {
  const currentSelections = new Set(queryConfig.collections)
  const newSelections = filteredCollections.value.filter(
    coll => !currentSelections.has(coll)
  )
  const keptSelections = queryConfig.collections.filter(
    coll => !filteredCollections.value.includes(coll)
  )
  queryConfig.collections = [...keptSelections, ...newSelections]
}
```

## API 依赖

组件依赖以下 API：

```typescript
import * as dataCollectionApi from '@/api/dataCollection'

// 获取数据源列表
dataCollectionApi.getDataSources()

// 获取数据库列表
dataCollectionApi.getDatabases(dataSourceId)

// 获取集合列表
dataCollectionApi.getCollections(dataSourceId, database)

// 获取字段列表
dataCollectionApi.getFields(dataSourceId, database, collection)

// 预览查询结果
dataCollectionApi.previewQuery({
  data_source_id,
  database,
  collection,    // 单集合模式
  collections,   // 多集合模式
  lookups,
  filter_conditions,
  limit
})
```

## 注意事项

1. **字段一致性**
   - 多集合模式下，各集合应有相同或相似的字段结构
   - 字段列表从第一个选中的集合加载

2. **性能考虑**
   - 选择的集合越多，查询性能越慢
   - 建议根据实际需求选择合适的集合范围
   - 合理设置 `limit` 限制返回数据量

3. **后端支持**
   - 多集合模式需要后端 API 支持 `collections` 参数
   - 后端需要遍历所有集合执行查询并合并结果
   - 合并后需要重新应用排序和限制

4. **数据格式**
   - API 返回的数据库和集合可能是对象或字符串
   - 组件内部会自动处理格式转换
   - 保存时同时存储对象用于后续 API 调用

## 相关文档

- [多集合模式使用说明](../../../提示词/多集合模式使用说明.md)
- [集合筛选功能使用技巧](../../../提示词/集合筛选功能使用技巧.md)
- [数据列表管理界面使用说明](../../../提示词/数据列表管理界面使用说明.md)
- [真实API接入说明](../../../提示词/数据列表管理_真实API接入说明.md)

---

**版本**：v2.0  
**更新时间**：2025-01-XX  
**作者**：CKB Team
