import { request } from '@/utils/request'
import type { ApiResponse } from '@/types/api'
import type { UserInfo } from '@/types'

// 搜索用户（复杂查询）
export const searchUsers = (params: {
  id_card?: string
  phone?: string
  name?: string
  page?: number
  page_size?: number
}) => {
  return request.post<{
    users: UserInfo[]
    total: number
    page: number
    page_size: number
  }>('/users/search', params)
}

// 解密身份证
export const decryptIdCard = (userId: string) => {
  return request.get<{
    user_id: string
    id_card: string
  }>(`/users/${userId}/decrypt-id-card`)
}

// 删除用户标签
export const deleteUserTag = (userId: string, tagId: string) => {
  return request.delete(`/users/${userId}/tags/${tagId}`)
}

