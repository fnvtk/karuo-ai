// 流量池管理API模块
import { apiClient } from "./client"

// 流量池数据类型定义
export interface TrafficPool {
  id: string
  name: string
  description: string
  userCount: number
  activeUsers: number
  tags: string[]
  source: string
  createTime: string
  lastUpdateTime: string
  status: "active" | "inactive"
  dailyGrowth: number
  conversionRate: number
}

export interface TrafficStats {
  total: number
  active: number
  inactive: number
  totalUsers: number
  todayAdded: number
  averageConversion: number
}

export interface CreateTrafficPoolRequest {
  name: string
  description: string
  source: string
  tags?: string[]
}

// 获取流量池列表
export async function getTrafficPools(): Promise<TrafficPool[]> {
  try {
    const response = await apiClient.get("/v1/traffic/pools")
    return response.data || []
  } catch (error) {
    console.error("获取流量池列表失败:", error)
    // 返回模拟数据作为降级处理
    return [
      {
        id: "1",
        name: "高价值客户池",
        description: "高消费能力的潜在客户群体",
        userCount: 1250,
        activeUsers: 890,
        tags: ["高价值", "活跃"],
        source: "线上推广",
        createTime: "2024-01-01 10:00:00",
        lastUpdateTime: "2024-01-07 14:30:00",
        status: "active",
        dailyGrowth: 25,
        conversionRate: 12.5,
      },
      {
        id: "2",
        name: "新用户引导池",
        description: "新注册用户的培育池",
        userCount: 2340,
        activeUsers: 1560,
        tags: ["新用户", "培育"],
        source: "注册引导",
        createTime: "2024-01-02 11:00:00",
        lastUpdateTime: "2024-01-07 13:45:00",
        status: "active",
        dailyGrowth: 45,
        conversionRate: 8.3,
      },
      {
        id: "3",
        name: "沉睡用户唤醒池",
        description: "长期未活跃用户的唤醒池",
        userCount: 890,
        activeUsers: 234,
        tags: ["沉睡", "唤醒"],
        source: "历史数据",
        createTime: "2024-01-03 09:30:00",
        lastUpdateTime: "2024-01-07 10:20:00",
        status: "active",
        dailyGrowth: 8,
        conversionRate: 5.2,
      },
    ]
  }
}

// 获取流量池统计
export async function getTrafficStats(): Promise<TrafficStats> {
  try {
    const response = await apiClient.get("/v1/traffic/stats")
    return response.data || { total: 0, active: 0, inactive: 0, totalUsers: 0, todayAdded: 0, averageConversion: 0 }
  } catch (error) {
    console.error("获取流量池统计失败:", error)
    return {
      total: 8,
      active: 6,
      inactive: 2,
      totalUsers: 15420,
      todayAdded: 156,
      averageConversion: 8.7,
    }
  }
}

// 创建流量池
export async function createTrafficPool(
  pool: CreateTrafficPoolRequest,
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await apiClient.post("/v1/traffic/pools", pool)
    return { success: true, message: "流量池创建成功" }
  } catch (error) {
    console.error("创建流量池失败:", error)
    return { success: false, message: "创建流量池失败" }
  }
}

// 删除流量池
export async function deleteTrafficPool(poolId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await apiClient.delete(`/v1/traffic/pools/${poolId}`)
    return { success: true, message: "流量池删除成功" }
  } catch (error) {
    console.error("删除流量池失败:", error)
    return { success: false, message: "删除流量池失败" }
  }
}
