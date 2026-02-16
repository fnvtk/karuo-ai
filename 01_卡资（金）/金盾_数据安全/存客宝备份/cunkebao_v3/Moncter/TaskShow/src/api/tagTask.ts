import { request } from '@/utils/request'
import type { ApiResponse } from '@/types/api'
import type { TagTask, TaskExecution } from '@/types'

// 获取标签任务列表
export const getTagTaskList = (params: {
  name?: string
  task_type?: string
  status?: string
  page?: number
  page_size?: number
}) => {
  return request.get<{
    tasks: TagTask[]
    total: number
    page: number
    page_size: number
  }>('/tag-tasks', params)
}

// 获取标签任务详情
export const getTagTaskDetail = (taskId: string) => {
  return request.get<TagTask>(`/tag-tasks/${taskId}`)
}

// 创建标签任务
export const createTagTask = (data: Partial<TagTask>) => {
  return request.post<TagTask>('/tag-tasks', data)
}

// 更新标签任务
export const updateTagTask = (taskId: string, data: Partial<TagTask>) => {
  return request.put<TagTask>(`/tag-tasks/${taskId}`, data)
}

// 删除标签任务
export const deleteTagTask = (taskId: string) => {
  return request.delete(`/tag-tasks/${taskId}`)
}

// 启动标签任务
export const startTagTask = (taskId: string) => {
  return request.post(`/tag-tasks/${taskId}/start`)
}

// 暂停标签任务
export const pauseTagTask = (taskId: string) => {
  return request.post(`/tag-tasks/${taskId}/pause`)
}

// 停止标签任务
export const stopTagTask = (taskId: string) => {
  return request.post(`/tag-tasks/${taskId}/stop`)
}

// 获取任务执行记录
export const getTagTaskExecutions = (taskId: string, params?: {
  page?: number
  page_size?: number
}) => {
  return request.get<{
    executions: TaskExecution[]
    total: number
  }>(`/tag-tasks/${taskId}/executions`, params)
}

