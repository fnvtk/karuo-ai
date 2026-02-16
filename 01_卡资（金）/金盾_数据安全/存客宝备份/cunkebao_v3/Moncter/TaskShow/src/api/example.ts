import { request } from '@/utils/request'
import type { ApiResponse, PageParams, PageResponse } from '@/types/api'

// 示例：用户相关 API
export interface User {
  id: number
  name: string
  email: string
  avatar?: string
}

// 获取用户列表
export const getUserList = (params: PageParams) => {
  return request.get<PageResponse<User>>('/users', params)
}

// 获取用户详情
export const getUserDetail = (id: number) => {
  return request.get<User>(`/users/${id}`)
}

// 创建用户
export const createUser = (data: Omit<User, 'id'>) => {
  return request.post<User>('/users', data)
}

// 更新用户
export const updateUser = (id: number, data: Partial<User>) => {
  return request.put<User>(`/users/${id}`, data)
}

// 删除用户
export const deleteUser = (id: number) => {
  return request.delete(`/users/${id}`)
}
