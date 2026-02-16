<template>
  <div class="progress-display">
    <div class="progress-header">
      <span class="progress-title">{{ title }}</span>
      <span class="progress-percentage">{{ percentage }}%</span>
    </div>
    <el-progress
      :percentage="percentage"
      :status="progressStatus"
      :stroke-width="strokeWidth"
    />
    <div class="progress-stats" v-if="showStats">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-item">
            <span class="stat-label">总数：</span>
            <span class="stat-value">{{ total }}</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <span class="stat-label">已处理：</span>
            <span class="stat-value">{{ processed }}</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <span class="stat-label">成功：</span>
            <span class="stat-value success">{{ success }}</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <span class="stat-label">失败：</span>
            <span class="stat-value error">{{ error }}</span>
          </div>
        </el-col>
      </el-row>
    </div>
    <div class="progress-time" v-if="showTime">
      <span v-if="startTime">开始时间：{{ formatTime(startTime) }}</span>
      <span v-if="endTime" style="margin-left: 20px">结束时间：{{ formatTime(endTime) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title?: string
  percentage: number
  total?: number
  processed?: number
  success?: number
  error?: number
  startTime?: string
  endTime?: string
  showStats?: boolean
  showTime?: boolean
  strokeWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  title: '进度',
  percentage: 0,
  total: 0,
  processed: 0,
  success: 0,
  error: 0,
  showStats: true,
  showTime: true,
  strokeWidth: 8
})

const progressStatus = computed(() => {
  if (props.percentage === 100) return 'success'
  if (props.error > 0 && props.processed === props.total) return 'exception'
  return undefined
})

const formatTime = (time: string) => {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleString('zh-CN')
}
</script>

<style scoped lang="scss">
.progress-display {
  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;

    .progress-title {
      font-weight: 500;
      color: #303133;
    }

    .progress-percentage {
      font-weight: 600;
      color: #409eff;
    }
  }

  .progress-stats {
    margin-top: 15px;

    .stat-item {
      .stat-label {
        color: #909399;
        font-size: 14px;
      }

      .stat-value {
        font-weight: 600;
        color: #303133;

        &.success {
          color: #67c23a;
        }

        &.error {
          color: #f56c6c;
        }
      }
    }
  }

  .progress-time {
    margin-top: 10px;
    font-size: 12px;
    color: #909399;
  }
}
</style>

