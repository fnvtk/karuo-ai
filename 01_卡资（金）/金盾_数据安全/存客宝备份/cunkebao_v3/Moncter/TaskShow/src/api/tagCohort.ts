import { request } from '@/utils/request'
import type { ApiResponse } from '@/types/api'
import type { TagCohort, TagCohortListItem, TagCondition } from '@/types'

// 获取人群快照列表
export const getTagCohortList = (params?: {
  page?: number
  page_size?: number
}) => {
  return request.get<{
    cohorts: TagCohortListItem[]
    total: number
    page: number
    page_size: number
  }>('/tag-cohorts', params)
}

// 获取人群快照详情
export const getTagCohortDetail = (cohortId: string) => {
  return request.get<TagCohort>(`/tag-cohorts/${cohortId}`)
}

// 创建人群快照
export const createTagCohort = (data: {
  name: string
  description?: string
  conditions: TagCondition[]
  logic?: 'AND' | 'OR'
  user_ids?: string[]
  created_by?: string
}) => {
  return request.post<{
    cohort_id: string
    name: string
    user_count: number
  }>('/tag-cohorts', data)
}

// 删除人群快照
export const deleteTagCohort = (cohortId: string) => {
  return request.delete(`/tag-cohorts/${cohortId}`)
}

// 导出人群快照
export const exportTagCohort = (cohortId: string) => {
  return request.post(`/tag-cohorts/${cohortId}/export`, {}, {
    responseType: 'blob'
  })
}

