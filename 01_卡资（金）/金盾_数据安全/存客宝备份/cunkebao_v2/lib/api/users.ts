import type { TrafficUser } from "@/types/traffic"
import type { ApiResponse } from "@/types/common"

const API_BASE = "/api/users"

// 用户管理API
export const userApi = {
  // 查询用户列表
  async query(params: {
    page?: number
    pageSize?: number
    search?: string
    category?: string
    source?: string
    status?: string
    startDate?: string
    endDate?: string
    wechatSource?: string
  }): Promise<{
    users: TrafficUser[]
    pagination: {
      total: number
      totalPages: number
      currentPage: number
      pageSize: number
    }
    stats: {
      total: number
      todayNew: number
      categoryStats: {
        potential: number
        customer: number
        lost: number
      }
    }
  }> {
    const queryString = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryString.append(key, String(value))
      }
    })

    const response = await fetch(`${API_BASE}?${queryString.toString()}`)
    return response.json()
  },

  // 获取用户详情
  async getById(id: string): Promise<ApiResponse<TrafficUser>> {
    const response = await fetch(`${API_BASE}/${id}`)
    return response.json()
  },

  // 更新用户信息
  async update(id: string, data: Partial<TrafficUser>): Promise<ApiResponse<TrafficUser>> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 批量更新用户标签
  async updateTags(ids: string[], tags: string[]): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE}/tags`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userIds: ids, tags }),
    })
    return response.json()
  },

  // 批量导出用户数据
  async exportUsers(ids: string[]): Promise<Blob> {
    const response = await fetch(`${API_BASE}/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userIds: ids }),
    })
    return response.blob()
  },
}
