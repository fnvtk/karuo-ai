// 设备管理API接口
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://ckbapi.quwanzhi.com"

// 设备信息类型
export interface Device {
  id: string
  name: string
  type: "android" | "ios" | "windows" | "mac"
  status: "online" | "offline" | "error" | "maintenance"
  wechatAccounts: number
  onlineWechatAccounts: number
  lastActiveAt: string
  createdAt: string
  version?: string
  ip?: string
  location?: string
  tags?: string[]
}

// 设备统计类型
export interface DeviceStats {
  totalDevices: number
  onlineDevices: number
  offlineDevices: number
  errorDevices: number
  totalWechatAccounts: number
  onlineWechatAccounts: number
}

// 设备创建参数
export interface CreateDeviceParams {
  name: string
  type: "android" | "ios" | "windows" | "mac"
  description?: string
  tags?: string[]
}

// 设备更新参数
export interface UpdateDeviceParams {
  name?: string
  description?: string
  tags?: string[]
  status?: "online" | "offline" | "maintenance"
}

// 统一的API请求客户端
async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    const token = localStorage.getItem("ckb_token")
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...((options.headers as Record<string, string>) || {}),
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    console.log("发送设备API请求:", url)

    const response = await fetch(url, {
      ...options,
      headers,
      mode: "cors",
    })

    console.log("设备API响应状态:", response.status, response.statusText)

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("ckb_token")
          localStorage.removeItem("ckb_user")
        }
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("服务器返回了非JSON格式的数据")
    }

    const data = await response.json()
    console.log("设备API响应数据:", data)

    if (data.code && data.code !== 200 && data.code !== 0) {
      throw new Error(data.message || "请求失败")
    }

    return data.data || data
  } catch (error) {
    console.error("设备API请求失败:", error)
    throw error
  }
}

/**
 * 获取设备列表
 */
export async function getDevices(params?: {
  page?: number
  limit?: number
  status?: string
  type?: string
  search?: string
}): Promise<{
  devices: Device[]
  total: number
  page: number
  limit: number
}> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.append("page", params.page.toString())
  if (params?.limit) searchParams.append("limit", params.limit.toString())
  if (params?.status) searchParams.append("status", params.status)
  if (params?.type) searchParams.append("type", params.type)
  if (params?.search) searchParams.append("search", params.search)

  const url = `${API_BASE_URL}/v1/devices${searchParams.toString() ? `?${searchParams.toString()}` : ""}`

  try {
    return await apiRequest(url)
  } catch (error) {
    // 返回模拟数据作为后备
    console.warn("使用模拟设备数据")
    return {
      devices: [
        {
          id: "1",
          name: "设备001",
          type: "android",
          status: "online",
          wechatAccounts: 3,
          onlineWechatAccounts: 2,
          lastActiveAt: "2024-01-20T10:30:00Z",
          createdAt: "2024-01-15T08:00:00Z",
          version: "1.2.3",
          ip: "192.168.1.100",
          location: "北京",
          tags: ["主力设备", "获客专用"],
        },
        {
          id: "2",
          name: "设备002",
          type: "ios",
          status: "offline",
          wechatAccounts: 2,
          onlineWechatAccounts: 0,
          lastActiveAt: "2024-01-19T15:20:00Z",
          createdAt: "2024-01-10T09:00:00Z",
          version: "1.2.2",
          ip: "192.168.1.101",
          location: "上海",
          tags: ["备用设备"],
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
    }
  }
}

/**
 * 获取设备详情
 */
export async function getDevice(id: string): Promise<Device> {
  try {
    return await apiRequest(`${API_BASE_URL}/v1/devices/${id}`)
  } catch (error) {
    // 返回模拟数据作为后备
    console.warn("使用模拟设备详情数据")
    return {
      id,
      name: "设备001",
      type: "android",
      status: "online",
      wechatAccounts: 3,
      onlineWechatAccounts: 2,
      lastActiveAt: "2024-01-20T10:30:00Z",
      createdAt: "2024-01-15T08:00:00Z",
      version: "1.2.3",
      ip: "192.168.1.100",
      location: "北京",
      tags: ["主力设备", "获客专用"],
    }
  }
}

/**
 * 创建设备
 */
export async function createDevice(params: CreateDeviceParams): Promise<Device> {
  return apiRequest(`${API_BASE_URL}/v1/devices`, {
    method: "POST",
    body: JSON.stringify(params),
  })
}

/**
 * 更新设备
 */
export async function updateDevice(id: string, params: UpdateDeviceParams): Promise<Device> {
  return apiRequest(`${API_BASE_URL}/v1/devices/${id}`, {
    method: "PUT",
    body: JSON.stringify(params),
  })
}

/**
 * 删除设备
 */
export async function deleteDevice(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`${API_BASE_URL}/v1/devices/${id}`, {
    method: "DELETE",
  })
}

/**
 * 获取设备统计
 */
export async function getDeviceStats(): Promise<DeviceStats> {
  try {
    return await apiRequest(`${API_BASE_URL}/v1/devices/stats`)
  } catch (error) {
    // 返回模拟数据作为后备
    console.warn("使用模拟设备统计数据")
    return {
      totalDevices: 8,
      onlineDevices: 7,
      offlineDevices: 1,
      errorDevices: 0,
      totalWechatAccounts: 17,
      onlineWechatAccounts: 15,
    }
  }
}

/**
 * 重启设备
 */
export async function restartDevice(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`${API_BASE_URL}/v1/devices/${id}/restart`, {
    method: "POST",
  })
}

/**
 * 批量操作设备
 */
export async function batchOperateDevices(
  deviceIds: string[],
  operation: "start" | "stop" | "restart" | "delete",
): Promise<{ success: boolean; message: string; results: Array<{ id: string; success: boolean; message: string }> }> {
  return apiRequest(`${API_BASE_URL}/v1/devices/batch`, {
    method: "POST",
    body: JSON.stringify({
      deviceIds,
      operation,
    }),
  })
}

// 设备API类
export class DeviceAPI {
  static async getDevices(params?: {
    page?: number
    limit?: number
    status?: string
    type?: string
    search?: string
  }): Promise<{
    devices: Device[]
    total: number
    page: number
    limit: number
  }> {
    return getDevices(params)
  }

  static async getDevice(id: string): Promise<Device> {
    return getDevice(id)
  }

  static async createDevice(params: CreateDeviceParams): Promise<Device> {
    return createDevice(params)
  }

  static async updateDevice(id: string, params: UpdateDeviceParams): Promise<Device> {
    return updateDevice(id, params)
  }

  static async deleteDevice(id: string): Promise<{ success: boolean; message: string }> {
    return deleteDevice(id)
  }

  static async getDeviceStats(): Promise<DeviceStats> {
    return getDeviceStats()
  }

  static async restartDevice(id: string): Promise<{ success: boolean; message: string }> {
    return restartDevice(id)
  }

  static async batchOperateDevices(
    deviceIds: string[],
    operation: "start" | "stop" | "restart" | "delete",
  ): Promise<{ success: boolean; message: string; results: Array<{ id: string; success: boolean; message: string }> }> {
    return batchOperateDevices(deviceIds, operation)
  }
}

// 导出设备API实例
export const deviceApi = new DeviceAPI()

// 默认导出
export default DeviceAPI
