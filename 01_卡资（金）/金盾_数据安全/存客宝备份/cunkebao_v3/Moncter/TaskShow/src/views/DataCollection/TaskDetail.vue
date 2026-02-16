<template>
  <div class="task-detail">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>任务详情</span>
          <div>
            <el-button
              v-if="task?.status === 'pending' || task?.status === 'paused'"
              type="success"
              @click="handleStart"
            >
              启动
            </el-button>
            <el-button
              v-if="task?.status === 'running'"
              type="warning"
              @click="handlePause"
            >
              暂停
            </el-button>
            <el-button
              v-if="task?.status === 'running' || task?.status === 'paused'"
              type="danger"
              @click="handleStop"
            >
              停止
            </el-button>
            <el-button type="primary" @click="handleEdit">编辑</el-button>
          </div>
        </div>
      </template>

      <!-- 基本信息 -->
      <el-descriptions title="基本信息" :column="2" border>
        <el-descriptions-item label="任务名称">{{ task?.name }}</el-descriptions-item>
        <el-descriptions-item label="任务状态">
          <StatusBadge :status="task?.status || 'pending'" />
        </el-descriptions-item>
        <el-descriptions-item label="数据源">{{ task?.data_source_id }}</el-descriptions-item>
        <el-descriptions-item label="数据库">{{ task?.database }}</el-descriptions-item>
        <el-descriptions-item label="集合">{{ task?.collection }}</el-descriptions-item>
        <el-descriptions-item label="采集模式">
          <el-tag v-if="task?.mode === 'realtime'" type="success">实时</el-tag>
          <el-tag v-else type="info">批量</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateTime(task?.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatDateTime(task?.updated_at) }}</el-descriptions-item>
        <el-descriptions-item label="任务描述" :span="2">{{ task?.description || '-' }}</el-descriptions-item>
      </el-descriptions>

      <!-- 进度信息 -->
      <div class="progress-section" v-if="task?.progress">
        <h3>进度信息</h3>
        <ProgressDisplay
          :title="'任务进度'"
          :percentage="task.progress.percentage || 0"
          :total="task.progress.total_count"
          :processed="task.progress.processed_count"
          :success="task.progress.success_count"
          :error="task.progress.error_count"
          :start-time="task.progress.start_time"
          :end-time="task.progress.end_time"
        />
      </div>

      <!-- 字段映射 -->
      <div class="field-mappings" v-if="task?.field_mappings?.length">
        <h3>字段映射</h3>
        <el-table :data="task.field_mappings" border>
          <el-table-column prop="source_field" label="源字段" />
          <el-table-column prop="target_field" label="目标字段" />
          <el-table-column prop="transform" label="转换函数" />
        </el-table>
      </div>

      <!-- 过滤条件 -->
      <div class="filter-conditions" v-if="task?.filter_conditions?.length">
        <h3>过滤条件</h3>
        <el-table :data="task.filter_conditions" border>
          <el-table-column prop="field" label="字段" />
          <el-table-column prop="operator" label="运算符" />
          <el-table-column prop="value" label="值" />
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import StatusBadge from '@/components/StatusBadge/index.vue'
import ProgressDisplay from '@/components/ProgressDisplay/index.vue'
import { useDataCollectionStore } from '@/store'
import { formatDateTime } from '@/utils'

const route = useRoute()
const router = useRouter()
const store = useDataCollectionStore()

const loading = computed(() => store.loading)
const task = computed(() => store.currentTask)
let progressTimer: number | null = null

const loadTaskDetail = async () => {
  try {
    await store.fetchTaskDetail(route.params.id as string)
  } catch (error: any) {
    ElMessage.error(error.message || '加载任务详情失败')
  }
}

const loadProgress = async () => {
  if (!task.value) return
  
  try {
    await store.fetchTaskProgress(route.params.id as string)
  } catch (error) {
    // 静默失败
  }
}

const handleStart = async () => {
  try {
    await store.startTask(route.params.id as string)
    ElMessage.success('任务已启动')
    await loadTaskDetail()
  } catch (error: any) {
    ElMessage.error(error.message || '启动任务失败')
  }
}

const handlePause = async () => {
  try {
    await store.pauseTask(route.params.id as string)
    ElMessage.success('任务已暂停')
    await loadTaskDetail()
  } catch (error: any) {
    ElMessage.error(error.message || '暂停任务失败')
  }
}

const handleStop = async () => {
  try {
    await ElMessageBox.confirm('确定要停止该任务吗？', '提示', {
      type: 'warning'
    })
    await store.stopTask(route.params.id as string)
    ElMessage.success('任务已停止')
    await loadTaskDetail()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '停止任务失败')
    }
  }
}

const handleEdit = () => {
  router.push(`/data-collection/tasks/${route.params.id}/edit`)
}

onMounted(() => {
  loadTaskDetail()
  
  // 如果任务正在运行，定时刷新进度
  progressTimer = window.setInterval(() => {
    if (task.value?.status === 'running') {
      loadProgress()
    }
  }, 5000)
})

onUnmounted(() => {
  if (progressTimer) {
    clearInterval(progressTimer)
  }
  store.resetCurrentTask()
})
</script>

<style scoped lang="scss">
.task-detail {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .progress-section,
  .field-mappings,
  .filter-conditions {
    margin-top: 30px;

    h3 {
      margin-bottom: 15px;
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }
  }
}
</style>

