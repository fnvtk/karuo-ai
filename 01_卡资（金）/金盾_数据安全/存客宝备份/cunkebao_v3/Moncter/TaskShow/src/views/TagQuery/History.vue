<template>
  <div class="tag-history">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>标签历史</span>
        </div>
      </template>

      <!-- 查询表单 -->
      <el-form :inline="true" :model="queryForm" @submit.prevent="handleQuery">
        <el-form-item label="用户ID">
          <el-input
            v-model="queryForm.user_id"
            placeholder="请输入用户ID"
            clearable
          />
        </el-form-item>
        <el-form-item label="标签">
          <el-select
            v-model="queryForm.tag_id"
            placeholder="请选择标签"
            filterable
            clearable
          >
            <el-option
              v-for="tag in tagDefinitions"
              :key="tag.tag_id"
              :label="tag.tag_name"
              :value="tag.tag_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="queryForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery" :loading="loading">
            查询
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 历史记录表格 -->
      <el-table :data="historyList" v-loading="loading" border style="margin-top: 20px">
        <el-table-column prop="user_id" label="用户ID" width="200" />
        <el-table-column prop="tag_name" label="标签名称" width="150" />
        <el-table-column prop="old_value" label="旧值" width="150">
          <template #default="{ row }">
            <span v-if="row.old_value">{{ row.old_value }}</span>
            <span v-else style="color: #909399;">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="new_value" label="新值" width="150" />
        <el-table-column prop="change_reason" label="变更原因" width="150" />
        <el-table-column prop="change_time" label="变更时间" width="180" />
        <el-table-column prop="operator" label="操作人" width="120" />
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
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { TagDefinition } from '@/types'

const route = useRoute()

const loading = ref(false)
const historyList = ref([])
const tagDefinitions = ref<TagDefinition[]>([])

const queryForm = reactive({
  user_id: '',
  tag_id: '',
  dateRange: null as [Date, Date] | null
})

const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

const loadTagDefinitions = async () => {
  try {
    // TODO: 调用API加载标签定义列表
    // const response = await request.get('/tag-definitions', { status: 0 })
    // tagDefinitions.value = response.data.definitions
    
    // 模拟数据
    tagDefinitions.value = []
  } catch (error) {
    ElMessage.error('加载标签定义失败')
  }
}

const handleQuery = async () => {
  loading.value = true
  try {
    // TODO: 调用历史查询API
    // const response = await request.get('/tags/history', {
    //   user_id: queryForm.user_id,
    //   tag_id: queryForm.tag_id,
    //   start_date: queryForm.dateRange?.[0],
    //   end_date: queryForm.dateRange?.[1],
    //   page: pagination.value.page,
    //   page_size: pagination.value.pageSize
    // })
    // historyList.value = response.data.items
    // pagination.value.total = response.data.total
    
    // 模拟数据
    historyList.value = []
    pagination.value.total = 0
  } catch (error) {
    ElMessage.error('查询历史记录失败')
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  queryForm.user_id = ''
  queryForm.tag_id = ''
  queryForm.dateRange = null
  pagination.value.page = 1
  handleQuery()
}

const handleSizeChange = () => {
  handleQuery()
}

const handlePageChange = () => {
  handleQuery()
}

onMounted(() => {
  loadTagDefinitions()
  
  // 如果URL中有参数，自动查询
  const userId = route.query.user_id as string
  const tagId = route.query.tag_id as string
  if (userId) {
    queryForm.user_id = userId
  }
  if (tagId) {
    queryForm.tag_id = tagId
  }
  if (userId || tagId) {
    handleQuery()
  }
})
</script>

<style scoped lang="scss">
.tag-history {
  .card-header {
    font-weight: 500;
    font-size: 16px;
  }

  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>

