<template>
  <div class="task-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>数据采集任务列表</span>
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
          <el-form-item label="状态">
            <el-select
              v-model="filters.status"
              placeholder="请选择状态"
              clearable
              @change="handleSearch"
              style="width: 140px"
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
           <div class="filter-buttons">
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
           </div>
          </el-form-item>
        </el-form>
      </div>

      <!-- 任务列表 -->
      <el-table :data="taskList" v-loading="loading" >
        <el-table-column prop="name" label="任务名称"  />
        <el-table-column prop="data_source_id" label="数据源" width="200">
          <template #default="{ row }">
            {{ getDataSourceName(row.data_source_id) }}
          </template>
        </el-table-column>
        <el-table-column prop="database" label="数据库" width="200" />
        <el-table-column prop="collection" label="集合" width="200" />
        <el-table-column prop="mode" label="模式" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.mode === 'realtime'" type="success">实时</el-tag>
            <el-tag v-else type="info">批量</el-tag>
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
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div style="display: flex; justify-content:space-between;">
              <!-- 状态控制按钮（根据任务状态显示） -->
              <!-- 启动按钮：pending(待启动)、paused(已暂停)、stopped(已停止)、completed(已完成)、error(错误) -->
              <el-button
                v-if="['pending', 'paused', 'stopped', 'completed', 'error'].includes(row.status)"
                type="success"
                size="small"
                @click="handleStart(row)"
              >
                {{ ['completed', 'error', 'stopped'].includes(row.status) ? '重新启动' : row.status === 'paused' ? '恢复' : '启动' }}
              </el-button>
              <!-- 暂停按钮：仅在 running(运行中) 状态显示 -->
              <el-button
                v-if="row.status === 'running'"
                type="warning"
                size="small"
                @click="handlePause(row)"
              >
                暂停
              </el-button>
              <!-- 停止按钮：running(运行中) 或 paused(已暂停) 状态显示 -->
              <el-button
                v-if="row.status === 'running' || row.status === 'paused'"
                type="danger"
                size="small"
                @click="handleStop(row)"
              >
                停止
              </el-button>
              
              <!-- 其他操作（下拉菜单） -->
              <el-dropdown trigger="click" @command="(cmd) => handleDropdownCommand(cmd, row)">
                <el-button size="small" type="primary" plain>
                  更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <!-- 查看：所有状态可用 -->
                    <el-dropdown-item command="view">
                      <el-icon><View /></el-icon>
                      查看
                    </el-dropdown-item>
                    <!-- 编辑：只有非运行中状态可用（pending, paused, stopped, completed, error） -->
                    <el-dropdown-item 
                      command="edit" 
                      :disabled="row.status === 'running'"
                    >
                      <el-icon><Edit /></el-icon>
                      编辑
                    </el-dropdown-item>
                    <!-- 复制：所有状态可用 -->
                    <el-dropdown-item command="duplicate">
                      <el-icon><CopyDocument /></el-icon>
                      复制
                    </el-dropdown-item>
                    <!-- 删除：所有状态可用，但运行中/已暂停时会先停止任务 -->
                    <el-dropdown-item command="delete" divided>
                      <el-icon><Delete /></el-icon>
                      <span style="color: #f56c6c;">删除</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
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
import { Plus, ArrowDown, View, Edit, CopyDocument, Delete } from '@element-plus/icons-vue'
import StatusBadge from '@/components/StatusBadge/index.vue'
import { useDataCollectionStore } from '@/store'
import { formatDateTime } from '@/utils'
import type { DataCollectionTask } from '@/types'

const router = useRouter()
const store = useDataCollectionStore()

const filters = ref({
  name: '',
  status: ''
})
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

const taskList = computed(() => store.tasks)
const loading = computed(() => store.loading)
const dataSources = computed(() => store.dataSources)

// 根据数据源ID获取数据源名称
const getDataSourceName = (dataSourceId: string): string => {
  if (!dataSourceId) return '-'
  const dataSource = dataSources.value.find(ds => ds.id === dataSourceId)
  return dataSource?.name || dataSourceId
}

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
    status: ''
  }
  handleSearch()
}

const handleCreate = () => {
  router.push('/data-collection/tasks/create')
}

const handleView = (row: any) => {
  router.push(`/data-collection/tasks/${row.task_id}`)
}

const handleEdit = (row: DataCollectionTask) => {
  // 运行中的任务不允许编辑
  if (row.status === 'running') {
    ElMessage.warning('运行中的任务不允许编辑，请先停止任务')
    return
  }
  router.push(`/data-collection/tasks/${row.task_id}/edit`)
}

const handleDuplicate = async (row: DataCollectionTask) => {
  try {
    await store.duplicateTask(row.task_id)
    ElMessage.success('任务复制成功')
    await loadTasks()
  } catch (error: any) {
    ElMessage.error(error.message || '复制任务失败')
  }
}

const handleStart = async (row: DataCollectionTask) => {
  try {
    await store.startTask(row.task_id)
    ElMessage.success('任务已启动')
    await loadTasks()
  } catch (error: any) {
    ElMessage.error(error.message || '启动任务失败')
  }
}

const handlePause = async (row: DataCollectionTask) => {
  try {
    await store.pauseTask(row.task_id)
    ElMessage.success('任务已暂停')
    await loadTasks()
  } catch (error: any) {
    ElMessage.error(error.message || '暂停任务失败')
  }
}

const handleStop = async (row: DataCollectionTask) => {
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

const handleDelete = async (row: DataCollectionTask) => {
  try {
    // 运行中或已暂停的任务需要特别提示（后端会自动先停止）
    const isRunningOrPaused = row.status === 'running' || row.status === 'paused'
    const confirmMessage = isRunningOrPaused 
      ? `任务当前状态为"${row.status === 'running' ? '运行中' : '已暂停'}"，删除任务将先停止该任务。确定要删除吗？`
      : '确定要删除该任务吗？'
    
    await ElMessageBox.confirm(confirmMessage, '提示', {
      type: 'warning'
    })
    // 传递当前筛选和分页参数，保持列表状态
    // store.deleteTask 内部会自动刷新列表，不需要再次调用 loadTasks()
    const result = await store.deleteTask(row.task_id, {
      ...filters.value,
      page: pagination.value.page,
      page_size: pagination.value.pageSize
    })
    pagination.value.total = result.total
    ElMessage.success('任务已删除')
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

// 处理下拉菜单命令
const handleDropdownCommand = (command: string, row: DataCollectionTask) => {
  switch (command) {
    case 'view':
      handleView(row)
      break
    case 'edit':
      // 编辑按钮可能被禁用，但点击时仍会触发，这里再次检查
      if (row.status === 'running') {
        ElMessage.warning('运行中的任务不允许编辑，请先停止任务')
        return
      }
      handleEdit(row)
      break
    case 'duplicate':
      handleDuplicate(row)
      break
    case 'delete':
      handleDelete(row)
      break
  }
}

onMounted(async () => {
  // 加载数据源列表，用于显示数据源名称
  await store.fetchDataSources()
  loadTasks()
})
</script>

<style scoped lang="scss">
.task-list {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .filter-bar {
    margin-bottom: 20px;
    .filter-buttons{
      .el-button{margin-left: 20px;}
    }
  }

  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
.el-button+.el-button {
  margin-left: 0px;
}
</style>

