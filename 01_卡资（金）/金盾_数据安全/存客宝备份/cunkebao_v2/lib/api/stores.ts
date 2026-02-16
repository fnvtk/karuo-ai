// 门店账号管理API

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://ckbapi.quwanzhi.com"

// 门店账号类型定义
export interface StoreAccount {
  id: string
  account: string
  storeName: string
  phone: string
  deviceId: string
  deviceName: string
  status: "active" | "disabled"
  createTime: string
  lastLogin?: string
}

// 创建门店账号请求参数
export interface CreateStoreAccountRequest {
  account: string
  storeName: string
  password: string
  phone: string
  deviceId: string
}

// 更新门店账号请求参数
export interface UpdateStoreAccountRequest {
  id: string
  account?: string
  storeName?: string
  password?: string
  phone?: string
  deviceId?: string
}

// API响应格式
interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

class StoreAPI {
  // 获取门店账号列表
  async getStoreAccounts(): Promise<ApiResponse<{ items: StoreAccount[]; total: number }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stores`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      return await response.json()
    } catch (error) {
      console.error("获取门店账号列表失败:", error)
      throw error
    }
  }

  // 创建门店账号
  async createStoreAccount(data: CreateStoreAccountRequest): Promise<ApiResponse<StoreAccount>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      return await response.json()
    } catch (error) {
      console.error("创建门店账号失败:", error)
      throw error
    }
  }

  // 更新门店账号
  async updateStoreAccount(data: UpdateStoreAccountRequest): Promise<ApiResponse<StoreAccount>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stores/${data.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      return await response.json()
    } catch (error) {
      console.error("更新门店账号失败:", error)
      throw error
    }
  }

  // 删除门店账号
  async deleteStoreAccount(id: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stores/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })
      return await response.json()
    } catch (error) {
      console.error("删除门店账号失败:", error)
      throw error
    }
  }

  // 启用门店账号
  async enableStoreAccount(id: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stores/${id}/enable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
      return await response.json()
    } catch (error) {
      console.error("启用门店账号失败:", error)
      throw error
    }
  }

  // 禁用门店账号
  async disableStoreAccount(id: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stores/${id}/disable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
      return await response.json()
    } catch (error) {
      console.error("禁用门店账号失败:", error)
      throw error
    }
  }
}

export const storeApi = new StoreAPI()
