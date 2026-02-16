<template>
  <el-tag :type="tagType" :effect="effect">
    {{ label }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  status: string
  effect?: 'dark' | 'light' | 'plain'
}

const props = withDefaults(defineProps<Props>(), {
  effect: 'light'
})

const statusMap: Record<string, { type: string; label: string }> = {
  // 任务状态
  pending: { type: 'info', label: '待启动' },
  running: { type: 'success', label: '运行中' },
  paused: { type: 'warning', label: '已暂停' },
  stopped: { type: 'info', label: '已停止' },
  completed: { type: 'success', label: '已完成' },
  error: { type: 'danger', label: '错误' },
  
  // 进度状态
  idle: { type: 'info', label: '空闲' },
  
  // 执行状态
  failed: { type: 'danger', label: '失败' },
  cancelled: { type: 'info', label: '已取消' },
  
  // 标签状态
  active: { type: 'success', label: '启用' },
  inactive: { type: 'info', label: '禁用' },
}

const tagType = computed(() => {
  return statusMap[props.status]?.type || 'info'
})

const label = computed(() => {
  return statusMap[props.status]?.label || props.status
})
</script>

