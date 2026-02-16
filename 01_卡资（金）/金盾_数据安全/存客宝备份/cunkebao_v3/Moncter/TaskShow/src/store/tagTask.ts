import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TagTask, TaskExecution } from '@/types'
import * as tagTaskApi from '@/api/tagTask'

export const useTagTaskStore = defineStore('tagTask', () => {
  const tasks = ref<TagTask[]>([])
  const currentTask = ref<TagTask | null>(null)
  const executions = ref<TaskExecution[]>([])
  const loading = ref(false)

  // 获取任务列表
  const fetchTasks = async (params?: {
    name?: string
    task_type?: string
    status?: string
    page?: number
    page_size?: number
  }) => {
    loading.value = true
    try {
      const response = await tagTaskApi.getTagTaskList(params || {})
      tasks.value = response.data.tasks
      return response.data
    } catch (error) {
      console.error('获取任务列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 获取任务详情
  const fetchTaskDetail = async (taskId: string) => {
    loading.value = true
    try {
      const response = await tagTaskApi.getTagTaskDetail(taskId)
      currentTask.value = response.data
      return response.data
    } catch (error) {
      console.error('获取任务详情失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 创建任务
  const createTask = async (data: Partial<TagTask>) => {
    try {
      const response = await tagTaskApi.createTagTask(data)
      await fetchTasks()
      return response.data
    } catch (error) {
      console.error('创建任务失败:', error)
      throw error
    }
  }

  // 更新任务
  const updateTask = async (taskId: string, data: Partial<TagTask>) => {
    try {
      const response = await tagTaskApi.updateTagTask(taskId, data)
      await fetchTasks()
      return response.data
    } catch (error) {
      console.error('更新任务失败:', error)
      throw error
    }
  }

  // 删除任务
  const deleteTask = async (taskId: string) => {
    try {
      await tagTaskApi.deleteTagTask(taskId)
      await fetchTasks()
    } catch (error) {
      console.error('删除任务失败:', error)
      throw error
    }
  }

  // 启动任务
  const startTask = async (taskId: string) => {
    try {
      await tagTaskApi.startTagTask(taskId)
      await fetchTaskDetail(taskId)
    } catch (error) {
      console.error('启动任务失败:', error)
      throw error
    }
  }

  // 暂停任务
  const pauseTask = async (taskId: string) => {
    try {
      await tagTaskApi.pauseTagTask(taskId)
      await fetchTaskDetail(taskId)
    } catch (error) {
      console.error('暂停任务失败:', error)
      throw error
    }
  }

  // 停止任务
  const stopTask = async (taskId: string) => {
    try {
      await tagTaskApi.stopTagTask(taskId)
      await fetchTaskDetail(taskId)
    } catch (error) {
      console.error('停止任务失败:', error)
      throw error
    }
  }

  // 获取执行记录
  const fetchExecutions = async (taskId: string, params?: {
    page?: number
    page_size?: number
  }) => {
    try {
      const response = await tagTaskApi.getTagTaskExecutions(taskId, params)
      executions.value = response.data.executions
      return response.data
    } catch (error) {
      console.error('获取执行记录失败:', error)
      throw error
    }
  }

  // 重置当前任务
  const resetCurrentTask = () => {
    currentTask.value = null
    executions.value = []
  }

  return {
    tasks,
    currentTask,
    executions,
    loading,
    fetchTasks,
    fetchTaskDetail,
    createTask,
    updateTask,
    deleteTask,
    startTask,
    pauseTask,
    stopTask,
    fetchExecutions,
    resetCurrentTask
  }
})

