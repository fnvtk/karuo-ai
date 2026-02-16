import { request } from '@/utils/request'
import type { ApiResponse } from '@/types/api'
import type { TagDefinition } from '@/types'

// 获取标签定义列表
export const getTagDefinitionList = (params?: {
  name?: string
  category?: string
  status?: number
  page?: number
  page_size?: number
}) => {
  return request.get<{
    definitions: TagDefinition[]
    total: number
    page: number
    page_size: number
  }>('/tag-definitions', params)
}

// 获取标签定义详情
export const getTagDefinitionDetail = (tagId: string) => {
  return request.get<TagDefinition>(`/tag-definitions/${tagId}`)
}

// 创建标签定义
export const createTagDefinition = (data: Partial<TagDefinition>) => {
  return request.post<TagDefinition>('/tag-definitions', data)
}

// 更新标签定义
export const updateTagDefinition = (tagId: string, data: Partial<TagDefinition>) => {
  return request.put<TagDefinition>(`/tag-definitions/${tagId}`, data)
}

// 删除标签定义
export const deleteTagDefinition = (tagId: string) => {
  return request.delete(`/tag-definitions/${tagId}`)
}

// 批量初始化标签定义
export const batchInitTagDefinitions = (data: {
  definitions: Partial<TagDefinition>[]
}) => {
  return request.post('/tag-definitions/batch', data)
}

