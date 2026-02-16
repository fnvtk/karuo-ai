import { request } from '@/utils/request'
import type { ApiResponse } from '@/types/api'

// 数据源类型
export interface DataSource {
  data_source_id: string
  name: string
  type: 'mongodb' | 'mysql' | 'postgresql'
  host: string
  port: number
  database: string
  username?: string
  password?: string
  auth_source?: string
  options?: Record<string, any>
  description?: string
  is_tag_engine?: boolean // 是否为标签引擎数据库（ckb数据库）
  status: number // 1:启用, 0:禁用
  created_at?: string
  updated_at?: string
}

// 获取数据源列表
export const getDataSourceList = (params?: {
  type?: string
  status?: number
  name?: string
  page?: number
  page_size?: number
}) => {
  return request.get<{
    data_sources: DataSource[]
    total: number
    page: number
    page_size: number
  }>('/data-sources', params)
}

// 获取数据源详情
export const getDataSourceDetail = (dataSourceId: string) => {
  return request.get<DataSource>(`/data-sources/${dataSourceId}`)
}

// 创建数据源
export const createDataSource = (data: Partial<DataSource>) => {
  return request.post<DataSource>('/data-sources', data)
}

// 更新数据源
export const updateDataSource = (dataSourceId: string, data: Partial<DataSource>) => {
  return request.put<DataSource>(`/data-sources/${dataSourceId}`, data)
}

// 删除数据源
export const deleteDataSource = (dataSourceId: string) => {
  return request.delete(`/data-sources/${dataSourceId}`)
}

// 测试数据源连接
export const testDataSourceConnection = (data: {
  type: string
  host: string
  port: number
  database: string
  username?: string
  password?: string
  auth_source?: string
  options?: Record<string, any>
}) => {
  return request.post<{ connected: boolean }>('/data-sources/test-connection', data)
}

