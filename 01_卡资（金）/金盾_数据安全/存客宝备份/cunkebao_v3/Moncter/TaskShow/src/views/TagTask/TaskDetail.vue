<template>
  <div class="tag-task-detail">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>标签任务详情</span>
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
        <el-descriptions-item label="任务类型">
          <el-tag v-if="task?.task_type === 'full'" type="primary">全量计算</el-tag>
          <el-tag v-else-if="task?.task_type === 'incremental'" type="success">增量计算</el-tag>
          <el-tag v-else type="info">指定用户</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="目标标签数量">
          {{ task?.target_tag_ids?.length || 0 }}
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
          :total="task.progress.total_users"
          :processed="task.progress.processed_users"
          :success="task.progress.success_count"
          :error="task.progress.error_count"
        />
      </div>

      <!-- 执行记录 -->
      <div class="executions-section">
        <h3>执行记录</h3>
        <el-table :data="executions" border>
          <el-table-column prop="started_at" label="开始时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.started_at) }}
            </template>
          </el-table-column>
          <el-table-column prop="finished_at" label="结束时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.finished_at) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <StatusBadge :status="row.status" />
            </template>
          </el-table-column>
          <el-table-column prop="processed_users" label="处理用户数" width="120" />
          <el-table-column prop="success_count" label="成功数" width="100" />
          <el-table-column prop="error_count" label="失败数" width="100" />
          <el-table-column prop="error_message" label="错误信息" />
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import StatusBadge from '@/components/StatusBadge/index.vue'
import ProgressDisplay from '@/components/ProgressDisplay/index.vue'
import { useTagTaskStore } from '@/store'
import { formatDateTime } from '@/utils'

const route = useRoute()
const router = useRouter()
const store = useTagTaskStore()

const loading = computed(() => store.loading)
const task = computed(() => store.currentTask)
const executions = computed(() => store.executions)

const loadTaskDetail = async () => {
  try {
    await store.fetchTaskDetail(route.params.id as string)
  } catch (error: any) {
    ElMessage.error(error.message || '加载任务详情失败')
  }
}

const loadExecutions = async () => {
  try {
    await store.fetchExecutions(route.params.id as string)
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
  router.push(`/tag-tasks/${route.params.id}/edit`)
}

onMounted(() => {
  loadTaskDetail()
  loadExecutions()
})

onUnmounted(() => {
  store.resetCurrentTask()
})
</script>

<style scoped lang="scss">
.tag-task-detail {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .progress-section,
  .executions-section {
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

