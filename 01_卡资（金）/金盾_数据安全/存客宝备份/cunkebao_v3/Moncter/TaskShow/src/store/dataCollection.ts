import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DataCollectionTask, DataSource } from '@/types'
import * as dataCollectionApi from '@/api/dataCollection'

export const useDataCollectionStore = defineStore('dataCollection', () => {
  const tasks = ref<DataCollectionTask[]>([])
  const currentTask = ref<DataCollectionTask | null>(null)
  const dataSources = ref<DataSource[]>([])
  const loading = ref(false)

  // 获取任务列表
  const fetchTasks = async (params?: {
    name?: string
    status?: string
    page?: number
    page_size?: number
  }) => {
    loading.value = true
    try {
      const response = await dataCollectionApi.getDataCollectionTaskList(params || {})
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
      const response = await dataCollectionApi.getDataCollectionTaskDetail(taskId)
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
  const createTask = async (data: Partial<DataCollectionTask>) => {
    try {
      const response = await dataCollectionApi.createDataCollectionTask(data)
      await fetchTasks()
      return response.data
    } catch (error) {
      console.error('创建任务失败:', error)
      throw error
    }
  }

  // 更新任务
  const updateTask = async (taskId: string, data: Partial<DataCollectionTask>) => {
    try {
      const response = await dataCollectionApi.updateDataCollectionTask(taskId, data)
      await fetchTasks()
      return response.data
    } catch (error) {
      console.error('更新任务失败:', error)
      throw error
    }
  }

  // 删除任务
  const deleteTask = async (taskId: string, params?: {
    name?: string
    status?: string
    page?: number
    page_size?: number
  }) => {
    try {
      await dataCollectionApi.deleteDataCollectionTask(taskId)
      // 刷新列表时保持当前的筛选和分页状态，并返回结果以便更新分页信息
      return await fetchTasks(params)
    } catch (error) {
      console.error('删除任务失败:', error)
      throw error
    }
  }

  // 启动任务
  const startTask = async (taskId: string) => {
    try {
      await dataCollectionApi.startDataCollectionTask(taskId)
      await fetchTaskDetail(taskId)
    } catch (error) {
      console.error('启动任务失败:', error)
      throw error
    }
  }

  // 暂停任务
  const pauseTask = async (taskId: string) => {
    try {
      await dataCollectionApi.pauseDataCollectionTask(taskId)
      await fetchTaskDetail(taskId)
    } catch (error) {
      console.error('暂停任务失败:', error)
      throw error
    }
  }

  // 停止任务
  const stopTask = async (taskId: string) => {
    try {
      await dataCollectionApi.stopDataCollectionTask(taskId)
      await fetchTaskDetail(taskId)
    } catch (error) {
      console.error('停止任务失败:', error)
      throw error
    }
  }

  // 获取数据源列表
  const fetchDataSources = async () => {
    try {
      const response = await dataCollectionApi.getDataSources()
      dataSources.value = response.data
      return response.data
    } catch (error) {
      console.error('获取数据源列表失败:', error)
      throw error
    }
  }

  // 获取任务进度
  const fetchTaskProgress = async (taskId: string) => {
    try {
      const response = await dataCollectionApi.getDataCollectionTaskProgress(taskId)
      if (currentTask.value && currentTask.value.task_id === taskId) {
        currentTask.value.progress = response.data
      }
      return response.data
    } catch (error) {
      console.error('获取任务进度失败:', error)
      throw error
    }
  }

  // 复制任务
  const duplicateTask = async (taskId: string) => {
    try {
      // 获取原任务详情
      const originalTask = await fetchTaskDetail(taskId)
      if (!originalTask) {
        throw new Error('任务不存在')
      }
      
      // 复制任务数据，但清除运行时数据
      const taskData: Partial<DataCollectionTask> = {
        name: `${originalTask.name}_副本`,
        description: originalTask.description || '',
        data_source_id: originalTask.data_source_id,
        database: originalTask.database,
        collection: originalTask.collection || null,
        collections: originalTask.collections || null,
        target_type: originalTask.target_type || 'generic',
        target_data_source_id: originalTask.target_data_source_id || null,
        target_database: originalTask.target_database || null,
        target_collection: originalTask.target_collection || null,
        mode: originalTask.mode || 'batch',
        field_mappings: originalTask.field_mappings || [],
        collection_field_mappings: originalTask.collection_field_mappings || {},
        lookups: originalTask.lookups || [],
        collection_lookups: originalTask.collection_lookups || {},
        filter_conditions: originalTask.filter_conditions || [],
        schedule: originalTask.schedule || { enabled: false, cron: '' },
        status: 'pending' // 复制后的任务状态为待启动
      }
      
      // 创建新任务
      const response = await dataCollectionApi.createDataCollectionTask(taskData)
      await fetchTasks()
      return response.data
    } catch (error) {
      console.error('复制任务失败:', error)
      throw error
    }
  }

  // 重置当前任务
  const resetCurrentTask = () => {
    currentTask.value = null
  }

  return {
    tasks,
    currentTask,
    dataSources,
    loading,
    fetchTasks,
    fetchTaskDetail,
    createTask,
    updateTask,
    deleteTask,
    startTask,
    pauseTask,
    stopTask,
    fetchDataSources,
    fetchTaskProgress,
    duplicateTask,
    resetCurrentTask
  }
})

