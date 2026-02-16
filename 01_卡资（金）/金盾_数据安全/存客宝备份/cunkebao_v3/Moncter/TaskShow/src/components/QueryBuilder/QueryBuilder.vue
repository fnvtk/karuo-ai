<template>
  <div class="query-builder">
    <!-- 基础配置 -->
    <el-card shadow="never" style="margin-bottom: 20px">
      <template #header>
        <div class="card-header">
          <span>基础配置</span>
        </div>
      </template>
      
      <el-form :model="queryConfig" label-width="120px" size="default">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="数据源" required>
              <el-select
                v-model="queryConfig.data_source_id"
                placeholder="请选择数据源"
                filterable
                @change="handleDataSourceChange"
                :loading="dataSourceLoading"
                style="width: 100%"
              >
                <el-option
                  v-for="ds in dataSources"
                  :key="ds.data_source_id"
                  :label="ds.name"
                  :value="ds.data_source_id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="数据库" required>
              <el-select
                v-model="queryConfig.database"
                placeholder="请选择数据库"
                filterable
                @change="handleDatabaseChange"
                :loading="databaseLoading"
                style="width: 100%"
              >
                <el-option
                  v-for="db in databases"
                  :key="db"
                  :label="db"
                  :value="db"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="多集合模式">
              <el-switch
                v-model="queryConfig.multi_collection"
                active-text="启用"
                inactive-text="禁用"
                @change="handleMultiCollectionChange"
              />
              <div class="form-tip" style="margin-top: 4px; font-size: 12px; color: #909399;">
                启用后可同时选择多个集合（如按月分片的消费记录表）
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20" v-if="!queryConfig.multi_collection">
          <el-col :span="8">
            <el-form-item label="主集合" required>
              <el-select
                v-model="queryConfig.collection"
                placeholder="请选择主集合"
                filterable
                @change="handleCollectionChange"
                :loading="collectionLoading"
                style="width: 100%"
              >
                <el-option
                  v-for="coll in collections"
                  :key="coll"
                  :label="coll"
                  :value="coll"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20" v-if="queryConfig.multi_collection">
          <el-col :span="24">
            <el-form-item label="集合列表" required>
              <!-- 筛选和操作栏 -->
              <div style="margin-bottom: 12px;">
                <div style="display: flex; gap: 12px; margin-bottom: 8px; align-items: center;">
                  <el-input
                    v-model="collectionFilter"
                    placeholder="筛选集合名称..."
                    clearable
                    style="flex: 1; max-width: 400px;"
                  >
                    <template #prefix>
                      <el-icon><Search /></el-icon>
                    </template>
                  </el-input>
                  <el-button 
                    @click="handleSelectAllCollections" 
                    size="small"
                    :disabled="filteredCollections.length === 0"
                  >
                    全选
                  </el-button>
                  <el-button 
                    @click="handleClearAllCollections" 
                    size="small"
                    :disabled="queryConfig.collections.length === 0"
                  >
                    清空
                  </el-button>
                  <el-button 
                    @click="handleInvertCollections" 
                    size="small"
                    :disabled="filteredCollections.length === 0"
                  >
                    反选
                  </el-button>
                </div>
                
                <!-- 快捷筛选按钮（针对按日期分片的集合） -->
                <div v-if="hasDateShardedCollections" style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <span style="color: #909399; font-size: 12px; line-height: 28px;">快捷筛选：</span>
                  <el-button size="small" @click="quickSelectByPattern('consumption_records_2021')">2021年</el-button>
                  <el-button size="small" @click="quickSelectByPattern('consumption_records_2022')">2022年</el-button>
                  <el-button size="small" @click="quickSelectByPattern('consumption_records_2023')">2023年</el-button>
                  <el-button size="small" @click="quickSelectByPattern('consumption_records_2024')">2024年</el-button>
                  <el-button size="small" @click="quickSelectByPattern('consumption_records_2025')">2025年</el-button>
                  <el-button size="small" @click="quickSelectRecentMonths(3)">最近3个月</el-button>
                  <el-button size="small" @click="quickSelectRecentMonths(6)">最近6个月</el-button>
                  <el-button size="small" @click="quickSelectRecentMonths(12)">最近12个月</el-button>
                </div>
              </div>
              
              <!-- 集合复选框列表 -->
              <el-checkbox-group
                v-model="queryConfig.collections"
                @change="handleCollectionsChange"
                style="display: flex; flex-wrap: wrap; gap: 12px; max-height: 300px; overflow-y: auto; padding: 15px; border: 1px solid #dcdfe6; border-radius: 4px;"
              >
                <el-checkbox
                  v-for="coll in filteredCollections"
                  :key="coll"
                  :label="coll"
                  :value="coll"
                  style="width: 250px;"
                >
                  {{ coll }}
                </el-checkbox>
              </el-checkbox-group>
              
              <div class="form-tip" style="margin-top: 8px;">
                <span v-if="collectionFilter">
                  筛选结果：{{ filteredCollections.length }} 个集合 | 
                </span>
                已选择 {{ queryConfig.collections?.length || 0 }} 个集合
                <span v-if="queryConfig.collections?.length > 0">
                  ，查询时将自动合并这些集合的数据
                </span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 过滤条件 -->
    <el-card shadow="never" style="margin-bottom: 20px">
      <template #header>
        <div class="card-header" style="cursor: pointer;" @click="collapseStates.filter = !collapseStates.filter">
          <div style="display: flex; align-items: center; gap: 8px;">
            <el-icon>
              <component :is="collapseStates.filter ? 'ArrowDown' : 'ArrowRight'" />
            </el-icon>
            <span>过滤条件（WHERE）</span>
            <el-tag v-if="queryConfig.filter.length > 0" size="small" type="success">
              {{ queryConfig.filter.length }} 个条件
            </el-tag>
          </div>
          <el-button 
            type="primary" 
            size="small" 
            @click.stop="handleAddFilter" 
            :disabled="!hasCollection"
          >
            <el-icon><Plus /></el-icon>
            添加条件
          </el-button>
        </div>
      </template>

      <el-collapse-transition>
        <div v-show="collapseStates.filter">
          <el-table
            :data="queryConfig.filter"
            border
            v-if="queryConfig.filter && queryConfig.filter.length > 0"
          >
            <el-table-column label="逻辑关系" width="120">
              <template #default="{ $index }">
                <el-select v-model="queryConfig.filter[$index].logic" v-if="$index > 0">
                  <el-option label="AND" value="and" />
                  <el-option label="OR" value="or" />
                </el-select>
                <span v-else style="color: #909399;">-</span>
              </template>
            </el-table-column>
            <el-table-column label="字段" width="200">
              <template #default="{ row }">
                <el-select
                  v-model="row.field"
                  placeholder="选择字段"
                  filterable
                  @change="handleFilterFieldChange(row)"
                >
                  <el-option
                    v-for="field in availableFields"
                    :key="field.field_name"
                    :label="field.field"
                    :value="field.field_name"
                  >
                    <span>{{ field.field }}</span>
                    <span style="color: #909399; margin-left: 8px;">({{ field.type }})</span>
                  </el-option>
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="运算符" width="150">
              <template #default="{ row }">
                <el-select v-model="row.operator">
                  <el-option label="等于" value="eq" />
                  <el-option label="不等于" value="ne" />
                  <el-option label="大于" value="gt" />
                  <el-option label="大于等于" value="gte" />
                  <el-option label="小于" value="lt" />
                  <el-option label="小于等于" value="lte" />
                  <el-option label="包含" value="in" />
                  <el-option label="不包含" value="nin" />
                  <el-option label="模糊匹配" value="regex" />
                  <el-option label="存在" value="exists" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="值" min-width="200">
              <template #default="{ row }">
                <el-input
                  v-if="row.operator !== 'exists' && row.operator !== 'in' && row.operator !== 'nin'"
                  v-model="row.value"
                  placeholder="请输入值"
                  :type="getValueInputType(row)"
                />
                <el-input
                  v-else-if="row.operator === 'in' || row.operator === 'nin'"
                  v-model="row.value"
                  placeholder='例如: ["值1","值2"]'
                  type="textarea"
                  :rows="2"
                />
                <el-switch
                  v-else
                  v-model="row.value"
                  active-text="存在"
                  inactive-text="不存在"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ $index }">
                <el-button
                  type="danger"
                  size="small"
                  @click="handleRemoveFilter($index)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-else class="empty-tip">
            <el-empty description="暂无过滤条件，点击右上角「添加条件」按钮开始配置" :image-size="80" />
          </div>
        </div>
      </el-collapse-transition>
    </el-card>

    <!-- 联表查询 -->
    <el-card shadow="never" style="margin-bottom: 20px">
      <template #header>
        <div class="card-header" style="cursor: pointer;" @click="collapseStates.lookup = !collapseStates.lookup">
          <div style="display: flex; align-items: center; gap: 8px;">
            <el-icon>
              <component :is="collapseStates.lookup ? 'ArrowDown' : 'ArrowRight'" />
            </el-icon>
            <span>联表查询（JOIN/LOOKUP）</span>
            <el-tag v-if="queryConfig.lookups.length > 0" size="small" type="warning">
              {{ queryConfig.lookups.length }} 个关联
            </el-tag>
          </div>
          <el-button 
            type="primary" 
            size="small" 
            @click.stop="handleAddLookup" 
            :disabled="!hasCollection"
          >
            <el-icon><Plus /></el-icon>
            添加关联
          </el-button>
        </div>
      </template>

      <el-collapse-transition>
        <div v-show="collapseStates.lookup">
          <el-table
            :data="queryConfig.lookups"
            border
            v-if="queryConfig.lookups && queryConfig.lookups.length > 0"
          >
            <el-table-column label="关联集合" width="200">
              <template #default="{ row }">
                <el-select
                  v-model="row.from"
                  placeholder="选择集合"
                  filterable
                >
                  <el-option
                    v-for="coll in collections"
                    :key="coll"
                    :label="coll"
                    :value="coll"
                  />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="主集合字段" width="150">
              <template #default="{ row }">
                <el-select
                  v-model="row.local_field"
                  placeholder="选择字段"
                  filterable
                >
                  <el-option
                    v-for="field in availableFields"
                    :key="field.field_name"
                    :label="field.field"
                    :value="field.field_name"
                  />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="关联集合字段" width="150">
              <template #default="{ row }">
                <el-input v-model="row.foreign_field" placeholder="如: _id" />
              </template>
            </el-table-column>
            <el-table-column label="结果字段名" width="150">
              <template #default="{ row }">
                <el-input v-model="row.as" placeholder="如: user_info" />
              </template>
            </el-table-column>
            <el-table-column label="解构" width="100">
              <template #default="{ row }">
                <el-switch
                  v-model="row.unwrap"
                  active-text="是"
                  inactive-text="否"
                />
                <div class="form-tip" style="font-size: 11px; margin-top: 2px;">
                  解构后可直接使用字段
                </div>
              </template>
            </el-table-column>
            <el-table-column label="保留空值" width="100">
              <template #default="{ row }">
                <el-switch
                  v-model="row.preserve_null"
                  active-text="是"
                  inactive-text="否"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ $index }">
                <el-button
                  type="danger"
                  size="small"
                  @click="handleRemoveLookup($index)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-else class="empty-tip">
            <el-empty description="暂无联表查询，点击右上角「添加关联」按钮开始配置" :image-size="80" />
          </div>
        </div>
      </el-collapse-transition>
    </el-card>

    <!-- 排序和限制 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>排序和限制</span>
        </div>
      </template>

      <el-form :model="queryConfig" label-width="120px" size="default">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="排序字段">
              <el-select
                v-model="queryConfig.sort_field"
                placeholder="选择排序字段"
                filterable
                clearable
                style="width: 100%"
              >
                <el-option
                  v-for="field in availableFields"
                  :key="field.field_name"
                  :label="field.field"
                  :value="field.field_name"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="排序方式">
              <el-select v-model="queryConfig.sort_order" style="width: 100%">
                <el-option label="升序" value="1" />
                <el-option label="降序" value="-1" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="限制数量">
              <el-input-number
                v-model="queryConfig.limit"
                :min="1"
                :max="10000"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- SQL预览 -->
    <el-card shadow="never" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>查询预览</span>
          <el-button type="primary" size="small" @click="handlePreview" :disabled="!canPreview">
            <el-icon><View /></el-icon>
            预览数据
          </el-button>
        </div>
      </template>

      <div class="sql-preview">
        <pre>{{ sqlPreview }}</pre>
      </div>

      <div v-if="previewData.length > 0" style="margin-top: 20px">
        <el-table :data="previewData" border max-height="400">
          <el-table-column
            v-for="(value, key) in previewData[0]"
            :key="key"
            :prop="key"
            :label="key"
            min-width="150"
          />
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, View, Search, ArrowDown, ArrowRight } from '@element-plus/icons-vue'
import request from '@/utils/request'
import * as dataCollectionApi from '@/api/dataCollection'

interface Props {
  modelValue?: any
}

interface Emits {
  (e: 'update:modelValue', value: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 数据源相关
const dataSourceLoading = ref(false)
const databaseLoading = ref(false)
const collectionLoading = ref(false)
const dataSources = ref<any[]>([])
const databases = ref<string[]>([])
const collections = ref<string[]>([])
const availableFields = ref<Array<{ field: string; field_name: string; type: string }>>([])

// 保存完整的对象用于API调用
const databaseObjects = ref<any[]>([])
const collectionObjects = ref<any[]>([])

// 集合筛选
const collectionFilter = ref('')

// 检测是否有按日期分片的集合（如 consumption_records_202101）
const hasDateShardedCollections = computed(() => {
  return collections.value.some(coll => /\d{6}/.test(coll)) // 包含6位数字（YYYYMM格式）
})

// 折叠状态
const collapseStates = reactive({
  filter: false,  // 过滤条件默认折叠
  lookup: false   // 联表查询默认折叠
})

// 检查是否有选中集合
const hasCollection = computed(() => {
  return queryConfig.multi_collection 
    ? (queryConfig.collections && queryConfig.collections.length > 0)
    : !!queryConfig.collection
})

// 查询配置
const queryConfig = reactive({
  data_source_id: '',
  database: '',
  collection: '',
  multi_collection: false,
  collections: [] as string[],
  filter: [] as Array<{
    logic?: string
    field: string
    operator: string
    value: any
  }>,
  lookups: [] as Array<{
    from: string
    local_field: string
    foreign_field: string
    as: string
    unwrap?: boolean
    preserve_null?: boolean
  }>,
  sort_field: '',
  sort_order: '1',
  limit: 1000
})

// 预览数据
const previewData = ref<any[]>([])

// 加载数据源列表
const loadDataSources = async () => {
  try {
    dataSourceLoading.value = true
    const response = await dataCollectionApi.getDataSources()
    
    // 转换数据格式，兼容旧的data_source_id字段
    dataSources.value = (response.data || []).map((ds: any) => ({
      data_source_id: ds.id || ds.data_source_id,
      name: ds.name || ds.id,
      type: ds.type,
      status: 1
    }))
  } catch (error: any) {
    ElMessage.error(error.message || '加载数据源失败')
  } finally {
    dataSourceLoading.value = false
  }
}

// 数据源变化
const handleDataSourceChange = async (dataSourceId: string) => {
  if (!dataSourceId) {
    databases.value = []
    collections.value = []
    availableFields.value = []
    databaseObjects.value = []
    collectionObjects.value = []
    queryConfig.database = ''
    queryConfig.collection = ''
    return
  }
  await loadDatabases(dataSourceId)
}

// 加载数据库列表
const loadDatabases = async (dataSourceId: string) => {
  try {
    databaseLoading.value = true
    const response = await dataCollectionApi.getDatabases(dataSourceId)
    
    // 转换为字符串数组（只返回数据库名称）
    databases.value = (response.data || []).map((db: any) => 
      typeof db === 'string' ? db : db.name
    )
    
    // 保存完整的数据库对象供后续使用
    databaseObjects.value = response.data || []
  } catch (error: any) {
    ElMessage.error(error.message || '加载数据库列表失败')
  } finally {
    databaseLoading.value = false
  }
}

// 数据库变化
const handleDatabaseChange = async (database: string) => {
  if (!database || !queryConfig.data_source_id) {
    collections.value = []
    availableFields.value = []
    collectionObjects.value = []
    queryConfig.collection = ''
    collectionFilter.value = '' // 清空筛选
    return
  }
  collectionFilter.value = '' // 切换数据库时清空筛选
  await loadCollections(queryConfig.data_source_id, database)
}

// 加载集合列表
const loadCollections = async (dataSourceId: string, database: string) => {
  try {
    collectionLoading.value = true
    
    // 查找数据库对象
    const dbObj = databaseObjects.value.find((db: any) => 
      (typeof db === 'object' && db.name === database) || db === database
    )
    
    const response = await dataCollectionApi.getCollections(
      dataSourceId,
      dbObj || database
    )
    
    // 转换为字符串数组（只返回集合名称）
    collections.value = (response.data || []).map((coll: any) => 
      typeof coll === 'string' ? coll : coll.name
    )
    
    // 保存完整的集合对象供后续使用
    collectionObjects.value = response.data || []
  } catch (error: any) {
    ElMessage.error(error.message || '加载集合列表失败')
  } finally {
    collectionLoading.value = false
  }
}

// 集合变化
const handleCollectionChange = async (collection: string) => {
  if (!collection || !queryConfig.data_source_id || !queryConfig.database) {
    availableFields.value = []
    return
  }
  await loadFields(queryConfig.data_source_id, queryConfig.database, collection)
}

// 多集合模式切换
const handleMultiCollectionChange = () => {
  if (queryConfig.multi_collection) {
    // 切换到多集合模式
    queryConfig.collection = ''
    queryConfig.collections = []
    availableFields.value = []
    collectionFilter.value = '' // 清空筛选
  } else {
    // 切换到单集合模式
    queryConfig.collections = []
    availableFields.value = []
    collectionFilter.value = '' // 清空筛选
  }
}

// 多集合选择变化
const handleCollectionsChange = async () => {
  if (!queryConfig.multi_collection || !queryConfig.collections || queryConfig.collections.length === 0) {
    availableFields.value = []
    return
  }
  
  // 加载第一个集合的字段列表作为基准
  if (queryConfig.data_source_id && queryConfig.database && queryConfig.collections[0]) {
    await loadFields(queryConfig.data_source_id, queryConfig.database, queryConfig.collections[0])
  }
}

// 筛选后的集合列表
const filteredCollections = computed(() => {
  if (!collectionFilter.value) {
    return collections.value
  }
  const filter = collectionFilter.value.toLowerCase()
  return collections.value.filter(coll => coll.toLowerCase().includes(filter))
})

// 全选集合
const handleSelectAllCollections = () => {
  // 全选当前筛选结果
  const newSelections = [...new Set([...queryConfig.collections, ...filteredCollections.value])]
  queryConfig.collections = newSelections
  handleCollectionsChange()
}

// 清空集合选择
const handleClearAllCollections = () => {
  queryConfig.collections = []
  availableFields.value = []
}

// 反选集合
const handleInvertCollections = () => {
  // 对当前筛选结果进行反选
  const currentSelections = new Set(queryConfig.collections)
  const newSelections = filteredCollections.value.filter(coll => !currentSelections.has(coll))
  
  // 保留不在筛选结果中的已选项
  const keptSelections = queryConfig.collections.filter(coll => !filteredCollections.value.includes(coll))
  
  queryConfig.collections = [...keptSelections, ...newSelections]
  handleCollectionsChange()
}

// 按模式快速选择集合
const quickSelectByPattern = (pattern: string) => {
  const matched = collections.value.filter(coll => coll.includes(pattern))
  if (matched.length === 0) {
    ElMessage.warning(`未找到包含 "${pattern}" 的集合`)
    return
  }
  queryConfig.collections = matched
  handleCollectionsChange()
  ElMessage.success(`已选择 ${matched.length} 个集合`)
}

// 快速选择最近N个月的集合
const quickSelectRecentMonths = (months: number) => {
  // 获取当前日期
  const now = new Date()
  const recentMonths: string[] = []
  
  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const yearMonth = date.getFullYear().toString() + (date.getMonth() + 1).toString().padStart(2, '0')
    recentMonths.push(yearMonth)
  }
  
  // 查找匹配的集合
  const matched = collections.value.filter(coll => {
    return recentMonths.some(ym => coll.includes(ym))
  })
  
  if (matched.length === 0) {
    ElMessage.warning(`未找到最近 ${months} 个月的集合`)
    return
  }
  
  queryConfig.collections = matched
  handleCollectionsChange()
  ElMessage.success(`已选择最近 ${months} 个月的 ${matched.length} 个集合`)
}

// 加载字段列表
const loadFields = async (dataSourceId: string, database: string, collection: string) => {
  try {
    // 查找数据库和集合对象
    const dbObj = databaseObjects.value.find((db: any) => 
      (typeof db === 'object' && db.name === database) || db === database
    )
    const collObj = collectionObjects.value.find((coll: any) => 
      (typeof coll === 'object' && coll.name === collection) || coll === collection
    )
    
    const response = await dataCollectionApi.getFields(
      dataSourceId,
      dbObj || database,
      collObj || collection
    )
    
    // 转换字段格式：API返回的是 { name, type }，需要转换为 { field, field_name, type }
    availableFields.value = (response.data || []).map((field: any) => ({
      field: field.name, // 显示名称使用字段名
      field_name: field.name, // 实际字段名
      type: field.type || 'string'
    }))
  } catch (error: any) {
    ElMessage.error(error.message || '加载字段列表失败')
    availableFields.value = []
  }
}

// 过滤字段变化
const handleFilterFieldChange = (row: any) => {
  // 可以根据字段类型调整默认值
}

// 获取值输入类型
const getValueInputType = (row: any) => {
  const field = availableFields.value.find(f => f.field_name === row.field)
  if (field) {
    if (field.type === 'number' || field.type === 'int' || field.type === 'float') {
      return 'number'
    }
    if (field.type === 'date' || field.type === 'datetime') {
      return 'date'
    }
  }
  return 'text'
}

// 添加过滤条件
const handleAddFilter = () => {
  if (!hasCollection.value) {
    ElMessage.warning('请先选择主集合')
    return
  }
  queryConfig.filter.push({
    logic: queryConfig.filter.length > 0 ? 'and' : undefined,
    field: '',
    operator: 'eq',
    value: ''
  })
  // 自动展开过滤条件区域
  collapseStates.filter = true
}

// 删除过滤条件
const handleRemoveFilter = (index: number) => {
  queryConfig.filter.splice(index, 1)
  // 如果删除第一个，移除第二个的logic
  if (index === 0 && queryConfig.filter.length > 0) {
    queryConfig.filter[0].logic = undefined
  }
}

// 添加联表查询
const handleAddLookup = () => {
  if (!hasCollection.value) {
    ElMessage.warning('请先选择主集合')
    return
  }
  queryConfig.lookups.push({
    from: '',
    local_field: '',
    foreign_field: '_id',
    as: 'joined',
    unwrap: false,
    preserve_null: true
  })
  // 自动展开联表查询区域
  collapseStates.lookup = true
}

// 删除联表查询
const handleRemoveLookup = (index: number) => {
  queryConfig.lookups.splice(index, 1)
}

// SQL预览
const sqlPreview = computed(() => {
  const targetCollection = queryConfig.multi_collection 
    ? (queryConfig.collections?.[0] || '') 
    : queryConfig.collection

  if (!targetCollection) {
    return '请先选择主集合'
  }

  // 多集合模式提示
  let collectionNote = ''
  if (queryConfig.multi_collection && queryConfig.collections && queryConfig.collections.length > 1) {
    collectionNote = `// 多集合模式：将查询以下 ${queryConfig.collections.length} 个集合并合并结果\n// ${queryConfig.collections.join(', ')}\n\n`
  }

  let sql = `db.${targetCollection}.aggregate([\n`

  // 过滤条件
  if (queryConfig.filter.length > 0) {
    const filterObj: any = {}
    queryConfig.filter.forEach((condition, index) => {
      if (condition.field && condition.operator && condition.value !== undefined) {
        const operatorMap: any = {
          eq: '$eq',
          ne: '$ne',
          gt: '$gt',
          gte: '$gte',
          lt: '$lt',
          lte: '$lte',
          in: '$in',
          nin: '$nin',
          regex: '$regex',
          exists: '$exists'
        }
        const mongoOp = operatorMap[condition.operator] || condition.operator
        if (condition.operator === 'exists') {
          filterObj[condition.field] = { [mongoOp]: condition.value }
        } else if (condition.operator === 'regex') {
          filterObj[condition.field] = { [mongoOp]: condition.value, $options: 'i' }
        } else {
          filterObj[condition.field] = { [mongoOp]: condition.value }
        }
      }
    })
    if (Object.keys(filterObj).length > 0) {
      sql += `  { $match: ${JSON.stringify(filterObj, null, 2).split('\n').map((line, i) => i === 0 ? line : '  ' + line).join('\n')} },\n`
    }
  }

  // 联表查询
  queryConfig.lookups.forEach(lookup => {
    if (lookup.from && lookup.local_field && lookup.foreign_field) {
      sql += `  { $lookup: {\n`
      sql += `    from: "${lookup.from}",\n`
      sql += `    localField: "${lookup.local_field}",\n`
      sql += `    foreignField: "${lookup.foreign_field}",\n`
      sql += `    as: "${lookup.as || 'joined'}"\n`
      sql += `  } },\n`
      if (lookup.unwrap) {
        sql += `  { $unwind: {\n`
        sql += `    path: "$${lookup.as || 'joined'}",\n`
        sql += `    preserveNullAndEmptyArrays: ${lookup.preserve_null !== false}\n`
        sql += `  } },\n`
      }
    }
  })

  // 排序
  if (queryConfig.sort_field) {
    const sortObj: any = {}
    sortObj[queryConfig.sort_field] = parseInt(queryConfig.sort_order)
    sql += `  { $sort: ${JSON.stringify(sortObj)} },\n`
  }

  // 限制
  if (queryConfig.limit) {
    sql += `  { $limit: ${queryConfig.limit} }\n`
  }

  sql += `])`
  return collectionNote + sql
})

// 是否可以预览
const canPreview = computed(() => {
  if (queryConfig.multi_collection) {
    return !!queryConfig.data_source_id && !!queryConfig.database && queryConfig.collections && queryConfig.collections.length > 0
  } else {
    return !!queryConfig.data_source_id && !!queryConfig.database && !!queryConfig.collection
  }
})

// 预览数据
const handlePreview = async () => {
  if (!canPreview.value) {
    ElMessage.warning('请先完成基础配置')
    return
  }

  try {
    // 构建查询预览请求
    const lookups = queryConfig.lookups.map((lookup: any) => ({
      from: lookup.foreign_collection,
      localField: lookup.local_field,
      foreignField: lookup.foreign_field,
      as: lookup.as,
      unwind: lookup.unwind,
      preserveNullAndEmptyArrays: lookup.preserve_null
    }))

    const filterConditions = queryConfig.filter.map((filter: any) => ({
      field: filter.field_name,
      operator: filter.operator,
      value: filter.value,
      logic: filter.logic || 'and'
    }))

    // 构建预览请求参数
    const previewParams: any = {
      data_source_id: queryConfig.data_source_id,
      database: queryConfig.database,
      lookups: lookups.length > 0 ? lookups : undefined,
      filter_conditions: filterConditions.length > 0 ? filterConditions : undefined,
      limit: queryConfig.limit || 10
    }

    // 根据模式选择集合
    if (queryConfig.multi_collection) {
      previewParams.collections = queryConfig.collections
      previewParams.collection = queryConfig.collections[0] // 兼容性
    } else {
      previewParams.collection = queryConfig.collection
    }

    const response = await dataCollectionApi.previewQuery(previewParams)
    
    previewData.value = response.data?.data || []
    ElMessage.success(`预览成功，共 ${previewData.value.length} 条数据`)
  } catch (error: any) {
    ElMessage.error(error.message || '预览失败')
  }
}

// 监听配置变化，同步到父组件
watch(
  () => queryConfig,
  (newVal) => {
    emit('update:modelValue', { ...newVal })
  },
  { deep: true }
)

// 初始化
onMounted(() => {
  loadDataSources()
  if (props.modelValue) {
    Object.assign(queryConfig, props.modelValue)
    if (queryConfig.data_source_id) {
      handleDataSourceChange(queryConfig.data_source_id)
    }
  }
})
</script>

<style scoped lang="scss">
.query-builder {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 500;
    font-size: 14px;
    
    &[style*="cursor: pointer"] {
      user-select: none;
      transition: background-color 0.2s;
      margin: -12px -20px;
      padding: 12px 20px;
      border-radius: 4px;
      
      &:hover {
        background-color: #f5f7fa;
      }
    }
  }

  .form-tip {
    font-size: 11px;
    color: #909399;
    margin-top: 2px;
  }

  .empty-tip {
    padding: 20px;
    text-align: center;
  }

  .sql-preview {
    background: #f5f7fa;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    padding: 15px;
    max-height: 400px;
    overflow: auto;

    pre {
      margin: 0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.6;
      color: #303133;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  }
}
</style>
