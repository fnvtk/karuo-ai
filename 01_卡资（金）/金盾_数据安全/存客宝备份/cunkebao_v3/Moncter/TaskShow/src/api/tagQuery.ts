import { request } from '@/utils/request'
import type { ApiResponse } from '@/types/api'
import type { UserTag, UserInfo, TagCondition, TagStatistics, TagHistoryResponse } from '@/types'

// 获取用户标签（支持通过用户ID或手机号查询）
export const getUserTags = (userIdOrPhone: string) => {
  return request.get<{
    user_id: string
    tags: UserTag[]
    count: number
  }>(`/users/${userIdOrPhone}/tags`)
}

// 重新计算用户标签
export const recalculateUserTags = (userId: string) => {
  return request.put<{
    user_id: string
    updated_tags: Array<{
      tag_id: string
      tag_code: string
      tag_value: string
    }>
    count: number
  }>(`/users/${userId}/tags`)
}

// 根据标签筛选用户
export const filterUsersByTags = (params: {
  tag_conditions: TagCondition[]
  logic: 'AND' | 'OR'
  page?: number
  page_size?: number
  include_user_info?: boolean
}) => {
  return request.post<{
    users: UserInfo[]
    total: number
    page: number
    page_size: number
    total_pages?: number
  }>('/tags/filter', params)
}

// 获取标签统计信息
export const getTagStatistics = (params?: {
  tag_id?: string
  start_date?: string
  end_date?: string
}) => {
  return request.get<TagStatistics>('/tags/statistics', params)
}

// 获取标签历史记录
export const getTagHistory = (params?: {
  user_id?: string
  tag_id?: string
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
}) => {
  return request.get<TagHistoryResponse>('/tags/history', params)
}

