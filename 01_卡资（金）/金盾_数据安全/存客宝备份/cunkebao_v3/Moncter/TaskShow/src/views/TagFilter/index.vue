<template>
  <div class="tag-filter">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>标签筛选</span>
        </div>
      </template>

      <!-- 条件配置 -->
      <div class="conditions-section">
        <h3>筛选条件</h3>
        <el-form :inline="true">
          <el-form-item label="逻辑关系">
            <el-radio-group v-model="logic">
              <el-radio label="AND">AND（所有条件都满足）</el-radio>
              <el-radio label="OR">OR（任一条件满足）</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>

        <el-button type="primary" @click="handleAddCondition" style="margin-bottom: 15px;">
          <el-icon><Plus /></el-icon>
          添加条件
        </el-button>

        <el-table :data="conditions" border>
          <el-table-column label="标签" width="200">
            <template #default="{ row }">
              <el-select
                v-model="row.tag_code"
                placeholder="请选择标签"
                filterable
                style="width: 100%"
              >
                <el-option
                  v-for="tag in tagDefinitions"
                  :key="tag.tag_code"
                  :label="tag.tag_name"
                  :value="tag.tag_code"
                />
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
                <el-option label="在列表中" value="in" />
                <el-option label="不在列表中" value="nin" />
                <el-option label="包含" value="contains" />
                <el-option label="不包含" value="not_contains" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="值">
            <template #default="{ row }">
              <el-input v-model="row.value" placeholder="值" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ $index }">
              <el-button
                type="danger"
                size="small"
                @click="handleRemoveCondition($index)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button type="primary" @click="handleSearch" :loading="searching">
          查询
        </el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button type="success" @click="handleSaveCohort" :disabled="!hasResults">
          保存为人群快照
        </el-button>
      </div>

      <!-- 结果展示 -->
      <div class="results-section" v-if="hasResults">
        <h3>查询结果</h3>
        <div class="result-stats">
          <el-alert
            :title="`共找到 ${pagination.total} 个用户`"
            type="info"
            :closable="false"
          />
        </div>

        <el-table :data="results" border style="margin-top: 15px">
          <el-table-column prop="user_id" label="用户ID" width="200" />
          <el-table-column prop="name" label="姓名" width="120" />
          <el-table-column prop="phone" label="手机号" width="150">
            <template #default="{ row }">
              {{ maskPhone(row.phone) }}
            </template>
          </el-table-column>
          <el-table-column prop="total_amount" label="总消费金额" width="120">
            <template #default="{ row }">
              ¥{{ row.total_amount?.toFixed(2) || '0.00' }}
            </template>
          </el-table-column>
          <el-table-column prop="total_count" label="消费次数" width="100" />
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button type="primary" @click="handleViewUser(row.user_id)">
                查看标签
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :total="pagination.total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useTagDefinitionStore } from '@/store'
import * as tagQueryApi from '@/api/tagQuery'
import * as tagCohortApi from '@/api/tagCohort'
import { maskPhone } from '@/utils'
import type { TagCondition, UserInfo } from '@/types'

const router = useRouter()
const tagDefinitionStore = useTagDefinitionStore()

const logic = ref<'AND' | 'OR'>('AND')
const conditions = ref<TagCondition[]>([])
const searching = ref(false)
const results = ref<UserInfo[]>([])
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

const tagDefinitions = computed(() => tagDefinitionStore.definitions)
const hasResults = computed(() => results.value.length > 0 || pagination.value.total > 0)

const loadTagDefinitions = async () => {
  try {
    await tagDefinitionStore.getActiveDefinitions()
  } catch (error: any) {
    ElMessage.error(error.message || '加载标签定义失败')
  }
}

const handleAddCondition = () => {
  conditions.value.push({
    tag_code: '',
    operator: 'eq',
    value: ''
  })
}

const handleRemoveCondition = (index: number) => {
  conditions.value.splice(index, 1)
}

const handleSearch = async () => {
  if (conditions.value.length === 0) {
    ElMessage.warning('请至少添加一个筛选条件')
    return
  }

  searching.value = true
  try {
    const response = await tagQueryApi.filterUsersByTags({
      tag_conditions: conditions.value,
      logic: logic.value,
      page: pagination.value.page,
      page_size: pagination.value.pageSize,
      include_user_info: true
    })
    results.value = response.data.users
    pagination.value.total = response.data.total
  } catch (error: any) {
    ElMessage.error(error.message || '查询失败')
  } finally {
    searching.value = false
  }
}

const handleReset = () => {
  conditions.value = []
  results.value = []
  pagination.value = {
    page: 1,
    pageSize: 20,
    total: 0
  }
}

const handleSaveCohort = async () => {
  try {
    const { value: name } = await ElMessageBox.prompt('请输入人群快照名称', '保存人群快照', {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '快照名称不能为空'
    })
    
    await tagCohortApi.createTagCohort({
      name: name,
      conditions: conditions.value,
      logic: logic.value,
      user_ids: results.value.map(u => u.user_id!)
    })
    
    ElMessage.success('人群快照保存成功')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '保存人群快照失败')
    }
  }
}

const handleViewUser = (userId: string) => {
  router.push(`/tag-query/user?user_id=${userId}`)
}

// maskPhone 已从 utils 导入

const handleSizeChange = () => {
  handleSearch()
}

const handlePageChange = () => {
  handleSearch()
}

onMounted(() => {
  loadTagDefinitions()
})
</script>

<style scoped lang="scss">
.tag-filter {
  .card-header {
    font-weight: 500;
    font-size: 16px;
  }

  .conditions-section {
    margin-bottom: 30px;

    h3 {
      margin-bottom: 15px;
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }
  }

  .action-buttons {
    margin-bottom: 20px;
    display: flex;
    gap: 10px;
  }

  .results-section {
    margin-top: 30px;

    h3 {
      margin-bottom: 15px;
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }

    .result-stats {
      margin-bottom: 15px;
    }

    .pagination {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
  }
}
</style>

