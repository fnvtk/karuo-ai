<template>
  <div class="tag-task-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>标签任务列表</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            创建任务
          </el-button>
        </div>
      </template>

      <!-- 搜索和筛选 -->
      <div class="filter-bar">
        <el-form :inline="true" :model="filters">
          <el-form-item label="任务名称">
            <el-input
              v-model="filters.name"
              placeholder="请输入任务名称"
              clearable
              @clear="handleSearch"
            />
          </el-form-item>
          <el-form-item label="任务类型">
            <el-select
              v-model="filters.task_type"
              placeholder="请选择类型"
              clearable
              @change="handleSearch"
            >
              <el-option label="全量计算" value="full" />
              <el-option label="增量计算" value="incremental" />
              <el-option label="指定用户" value="specific" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select
              v-model="filters.status"
              placeholder="请选择状态"
              clearable
              @change="handleSearch"
            >
              <el-option label="待启动" value="pending" />
              <el-option label="运行中" value="running" />
              <el-option label="已暂停" value="paused" />
              <el-option label="已停止" value="stopped" />
              <el-option label="已完成" value="completed" />
              <el-option label="错误" value="error" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 任务列表 -->
      <el-table :data="taskList" v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="任务名称" min-width="200" />
        <el-table-column prop="task_type" label="任务类型" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.task_type === 'full'" type="primary">全量</el-tag>
            <el-tag v-else-if="row.task_type === 'incremental'" type="success">增量</el-tag>
            <el-tag v-else type="info">指定</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target_tag_ids" label="目标标签" width="150">
          <template #default="{ row }">
            <el-tag v-for="tagId in row.target_tag_ids?.slice(0, 2)" :key="tagId" size="small" style="margin-right: 5px;">
              {{ tagId }}
            </el-tag>
            <span v-if="row.target_tag_ids?.length > 2">...</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <StatusBadge :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column prop="progress.percentage" label="进度" width="120">
          <template #default="{ row }">
            <el-progress
              :percentage="row.progress?.percentage || 0"
              :status="row.progress?.status === 'error' ? 'exception' : undefined"
            />
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.updated_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending' || row.status === 'paused'"
              type="success"
              size="small"
              @click="handleStart(row)"
            >
              启动
            </el-button>
            <el-button
              v-if="row.status === 'running'"
              type="warning"
              size="small"
              @click="handlePause(row)"
            >
              暂停
            </el-button>
            <el-button
              v-if="row.status === 'running' || row.status === 'paused'"
              type="danger"
              size="small"
              @click="handleStop(row)"
            >
              停止
            </el-button>
            <el-button
              type="primary"
              size="small"
              @click="handleView(row)"
            >
              查看
            </el-button>
            <el-button
              type="info"
              size="small"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="handleDelete(row)"
            >
              删除
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
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import StatusBadge from '@/components/StatusBadge/index.vue'
import { useTagTaskStore } from '@/store'
import { formatDateTime } from '@/utils'
import type { TagTask } from '@/types'

const router = useRouter()
const store = useTagTaskStore()

const filters = ref({
  name: '',
  task_type: '',
  status: ''
})
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

const taskList = computed(() => store.tasks)
const loading = computed(() => store.loading)

const loadTasks = async () => {
  try {
    const result = await store.fetchTasks({
      ...filters.value,
      page: pagination.value.page,
      page_size: pagination.value.pageSize
    })
    pagination.value.total = result.total
  } catch (error: any) {
    ElMessage.error(error.message || '加载任务列表失败')
  }
}

const handleSearch = () => {
  pagination.value.page = 1
  loadTasks()
}

const handleReset = () => {
  filters.value = {
    name: '',
    task_type: '',
    status: ''
  }
  handleSearch()
}

const handleCreate = () => {
  router.push('/tag-tasks/create')
}

const handleView = (row: any) => {
  router.push(`/tag-tasks/${row.task_id}`)
}

const handleEdit = (row: any) => {
  router.push(`/tag-tasks/${row.task_id}/edit`)
}

const handleStart = async (row: TagTask) => {
  try {
    await store.startTask(row.task_id)
    ElMessage.success('任务已启动')
    await loadTasks()
  } catch (error: any) {
    ElMessage.error(error.message || '启动任务失败')
  }
}

const handlePause = async (row: TagTask) => {
  try {
    await store.pauseTask(row.task_id)
    ElMessage.success('任务已暂停')
    await loadTasks()
  } catch (error: any) {
    ElMessage.error(error.message || '暂停任务失败')
  }
}

const handleStop = async (row: TagTask) => {
  try {
    await ElMessageBox.confirm('确定要停止该任务吗？', '提示', {
      type: 'warning'
    })
    await store.stopTask(row.task_id)
    ElMessage.success('任务已停止')
    await loadTasks()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '停止任务失败')
    }
  }
}

const handleDelete = async (row: TagTask) => {
  try {
    await ElMessageBox.confirm('确定要删除该任务吗？', '提示', {
      type: 'warning'
    })
    await store.deleteTask(row.task_id)
    ElMessage.success('任务已删除')
    await loadTasks()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除任务失败')
    }
  }
}

const handleSizeChange = () => {
  loadTasks()
}

const handlePageChange = () => {
  loadTasks()
}

onMounted(() => {
  loadTasks()
})
</script>

<style scoped lang="scss">
.tag-task-list {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .filter-bar {
    margin-bottom: 20px;
  }

  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>

