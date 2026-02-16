<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #409eff;">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.dataCollectionTasks }}</div>
              <div class="stat-label">数据采集任务</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #67c23a;">
              <el-icon><PriceTag /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.tagTasks }}</div>
              <div class="stat-label">标签任务</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #e6a23c;">
              <el-icon><Filter /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.runningTasks }}</div>
              <div class="stat-label">运行中任务</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #f56c6c;">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalUsers }}</div>
              <div class="stat-label">用户总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最近任务</span>
              <el-button type="primary" @click="goToTaskList">查看更多</el-button>
            </div>
          </template>
          <el-table :data="recentTasks" style="width: 100%">
            <el-table-column prop="name" label="任务名称" />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.type === 'data_collection'" type="primary">数据采集</el-tag>
                <el-tag v-else type="success">标签任务</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <StatusBadge :status="row.status" />
              </template>
            </el-table-column>
            <el-table-column prop="updated_at" label="更新时间" width="180" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>快速操作</span>
            </div>
          </template>
          <div class="quick-actions">
            <el-button type="primary" @click="goToCreateDataCollectionTask">
              <el-icon><Plus /></el-icon>
              创建数据采集任务
            </el-button>
            <el-button type="success" @click="goToCreateTagTask">
              <el-icon><Plus /></el-icon>
              创建标签任务
            </el-button>
            <el-button type="warning" @click="goToTagFilter">
              <el-icon><Filter /></el-icon>
              标签筛选
            </el-button>
            <el-button type="info" @click="goToTagQuery">
              <el-icon><Search /></el-icon>
              标签查询
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Document, PriceTag, Filter, User, Plus, Search } from '@element-plus/icons-vue'
import StatusBadge from '@/components/StatusBadge/index.vue'
import { useDataCollectionStore } from '@/store'
import { useTagTaskStore } from '@/store'
import { formatDateTime } from '@/utils'

const router = useRouter()
const dataCollectionStore = useDataCollectionStore()
const tagTaskStore = useTagTaskStore()

const stats = ref({
  dataCollectionTasks: 0,
  tagTasks: 0,
  runningTasks: 0,
  totalUsers: 0
})

const recentTasks = ref<Array<{
  name: string
  type: string
  status: string
  updated_at: string
}>>([])

const loadStats = async () => {
  try {
    // 加载数据采集任务列表
    const collectionResult = await dataCollectionStore.fetchTasks({ page: 1, page_size: 1 })
    stats.value.dataCollectionTasks = collectionResult.total
    
    // 统计运行中的任务
    const runningCollectionTasks = dataCollectionStore.tasks.filter(
      t => t.status === 'running'
    ).length
    
    // 加载标签任务列表
    const tagResult = await tagTaskStore.fetchTasks({ page: 1, page_size: 1 })
    stats.value.tagTasks = tagResult.total
    
    // 统计运行中的标签任务
    const runningTagTasks = tagTaskStore.tasks.filter(
      t => t.status === 'running'
    ).length
    
    stats.value.runningTasks = runningCollectionTasks + runningTagTasks
    
    // 合并最近任务
    const allTasks = [
      ...dataCollectionStore.tasks.slice(0, 5).map(t => ({
        name: t.name,
        type: 'data_collection',
        status: t.status,
        updated_at: formatDateTime(t.updated_at)
      })),
      ...tagTaskStore.tasks.slice(0, 5).map(t => ({
        name: t.name,
        type: 'tag_task',
        status: t.status,
        updated_at: formatDateTime(t.updated_at)
      }))
    ]
    recentTasks.value = allTasks
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5)
    
    // TODO: 加载用户总数（需要后端提供接口）
    // stats.value.totalUsers = await getUserTotal()
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const goToTaskList = () => {
  router.push('/data-collection/tasks')
}

const goToCreateDataCollectionTask = () => {
  router.push('/data-collection/tasks/create')
}

const goToCreateTagTask = () => {
  router.push('/tag-tasks/create')
}

const goToTagFilter = () => {
  router.push('/tag-filter')
}

const goToTagQuery = () => {
  router.push('/tag-query/user')
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped lang="scss">
.dashboard {
  .stat-card {
    .stat-content {
      display: flex;
      align-items: center;
      gap: 15px;

      .stat-icon {
        width: 60px;
        height: 60px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 24px;
      }

      .stat-info {
        flex: 1;

        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #303133;
          line-height: 1;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 14px;
          color: #909399;
        }
      }
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .quick-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;

    .el-button {
      justify-content: flex-start;
    }
  }
}
</style>

