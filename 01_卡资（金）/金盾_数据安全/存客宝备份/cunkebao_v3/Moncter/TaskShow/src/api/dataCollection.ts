import { request } from '@/utils/request'
import type { ApiResponse } from '@/types/api'
import type { DataCollectionTask, DataSource } from '@/types'

// 获取数据采集任务列表
export const getDataCollectionTaskList = (params: {
  name?: string
  status?: string
  page?: number
  page_size?: number
}) => {
  return request.get<{
    tasks: DataCollectionTask[]
    total: number
    page: number
    page_size: number
  }>('/data-collection-tasks', params)
}

// 获取数据采集任务详情
export const getDataCollectionTaskDetail = (taskId: string) => {
  return request.get<DataCollectionTask>(`/data-collection-tasks/${taskId}`)
}

// 创建数据采集任务
export const createDataCollectionTask = (data: Partial<DataCollectionTask>) => {
  return request.post<DataCollectionTask>('/data-collection-tasks', data)
}

// 更新数据采集任务
export const updateDataCollectionTask = (taskId: string, data: Partial<DataCollectionTask>) => {
  return request.put<DataCollectionTask>(`/data-collection-tasks/${taskId}`, data)
}

// 删除数据采集任务
export const deleteDataCollectionTask = (taskId: string) => {
  return request.delete(`/data-collection-tasks/${taskId}`)
}

// 启动数据采集任务
export const startDataCollectionTask = (taskId: string) => {
  return request.post(`/data-collection-tasks/${taskId}/start`)
}

// 暂停数据采集任务
export const pauseDataCollectionTask = (taskId: string) => {
  return request.post(`/data-collection-tasks/${taskId}/pause`)
}

// 停止数据采集任务
export const stopDataCollectionTask = (taskId: string) => {
  return request.post(`/data-collection-tasks/${taskId}/stop`)
}

// 获取任务进度
export const getDataCollectionTaskProgress = (taskId: string) => {
  return request.get(`/data-collection-tasks/${taskId}/progress`)
}

// 获取数据源列表
export const getDataSources = () => {
  return request.get<DataSource[]>('/data-collection-tasks/data-sources')
}

// 获取数据库列表
export const getDatabases = (dataSourceId: string) => {
  return request.get<Array<{ name: string; id: string }>>(`/data-collection-tasks/data-sources/${dataSourceId}/databases`)
}

// 获取集合列表
export const getCollections = (dataSourceId: string, database: string | { name: string; id: string }) => {
  // 如果传入的是对象（包含id），使用id；否则使用字符串（向后兼容）
  const dbIdentifier = typeof database === 'object' ? database.id : database
  return request.get<Array<{ name: string; id: string }>>(
    `/data-collection-tasks/data-sources/${dataSourceId}/databases/${dbIdentifier}/collections`
  )
}

// 获取字段列表
export const getFields = (dataSourceId: string, database: string | { name: string; id: string }, collection: string | { name: string; id: string }) => {
  // 如果传入的是对象（包含id），使用id；否则使用字符串（向后兼容）
  const dbIdentifier = typeof database === 'object' ? database.id : database
  const collIdentifier = typeof collection === 'object' ? collection.id : collection
  return request.get<Array<{ name: string; type: string }>>(
    `/data-collection-tasks/data-sources/${dataSourceId}/databases/${dbIdentifier}/collections/${collIdentifier}/fields`
  )
}

// 获取Handler的目标字段列表
export const getHandlerTargetFields = (handlerType: string) => {
  return request.get<Array<{
    name: string
    label: string
    type: string
    required: boolean
    description?: string
  }>>(`/data-collection-tasks/handlers/${handlerType}/target-fields`)
}

// 预览查询结果
export const previewQuery = (data: {
  data_source_id: string
  database: string // 这里使用原始名称，因为后端会解码
  collection: string // 这里使用原始名称，因为后端会解码
  lookups?: any[]
  filter_conditions?: any[]
  limit?: number
}) => {
  return request.post<{
    fields: Array<{ name: string; type: string }>
    data: Array<any>
    count: number
  }>('/data-collection-tasks/preview-query', data)
}

