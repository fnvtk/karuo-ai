// 首页数据API接口定义
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://ckbapi.quwanzhi.com"

// 统一的API请求客户端
async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("ckb_token") : null

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      // 触发未授权事件
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth-error", { detail: "UNAUTHORIZED" }))
      }
    }
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  // 检查业务状态码
  if (data.code !== 200 && data.code !== 0) {
    throw new Error(data.message || "请求失败")
  }

  return data
}

// 首页统计数据类型定义
export interface DashboardStats {
  deviceCount: number // 设备总数
  onlineDeviceCount: number // 在线设备数
  wechatAccountCount: number // 微信号总数
  activeWechatCount: number // 活跃微信号数
  todayAcquisition: number // 今日获客数
  totalAcquisition: number // 总获客数
  scenarioCount: number // 场景数量
  runningTaskCount: number // 运行中任务数
}

// 获客趋势数据类型
export interface AcquisitionTrend {
  date: string
  count: number
  channel: string
}

// 场景统计数据类型
export interface ScenarioStats {
  scenarioName: string
  acquisitionCount: number
  successRate: number
  status: "running" | "stopped" | "completed"
}

/**
 * 获取首页统计数据
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const response = await apiRequest<{ data: DashboardStats }>(`${API_BASE_URL}/v1/dashboard/stats`)
    return response.data
  } catch (error) {
    console.error("获取首页统计数据失败:", error)
    // 返回默认数据，避免页面崩溃
    return {
      deviceCount: 0,
      onlineDeviceCount: 0,
      wechatAccountCount: 0,
      activeWechatCount: 0,
      todayAcquisition: 0,
      totalAcquisition: 0,
      scenarioCount: 0,
      runningTaskCount: 0,
    }
  }
}

/**
 * 获取获客趋势数据
 */
export async function getAcquisitionTrend(days = 7): Promise<AcquisitionTrend[]> {
  try {
    const response = await apiRequest<{ data: AcquisitionTrend[] }>(
      `${API_BASE_URL}/v1/dashboard/acquisition-trend?days=${days}`,
    )
    return response.data || []
  } catch (error) {
    console.error("获取获客趋势数据失败:", error)
    return []
  }
}

/**
 * 获取场景统计数据
 */
export async function getScenarioStats(): Promise<ScenarioStats[]> {
  try {
    const response = await apiRequest<{ data: ScenarioStats[] }>(`${API_BASE_URL}/v1/dashboard/scenario-stats`)
    return response.data || []
  } catch (error) {
    console.error("获取场景统计数据失败:", error)
    return []
  }
}

/**
 * 获取设备状态统计
 */
export async function getDeviceStats(): Promise<{ online: number; offline: number; total: number }> {
  try {
    const response = await apiRequest<{ data: { online: number; offline: number; total: number } }>(
      `${API_BASE_URL}/v1/dashboard/device-stats`,
    )
    return response.data
  } catch (error) {
    console.error("获取设备状态统计失败:", error)
    return { online: 0, offline: 0, total: 0 }
  }
}

/**
 * 获取微信号状态统计
 */
export async function getWechatStats(): Promise<{ active: number; inactive: number; total: number }> {
  try {
    const response = await apiRequest<{ data: { active: number; inactive: number; total: number } }>(
      `${API_BASE_URL}/v1/dashboard/wechat-stats`,
    )
    return response.data
  } catch (error) {
    console.error("获取微信号状态统计失败:", error)
    return { active: 0, inactive: 0, total: 0 }
  }
}
