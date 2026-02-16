// 移动端场景获客API - 基于cunkebao_v3项目架构
import { apiClient } from "./client"

// 场景获客统计数据接口
export interface ScenarioStatsData {
  id: string
  name: string
  type: string
  todayCount: number
  totalCount: number
  growthRate: number
  status: "active" | "inactive" | "error"
  lastUpdateTime: string
}

// AI智能获客数据接口
export interface AIScenarioData {
  id: string
  name: string
  description: string
  todayCount: number
  totalCount: number
  growthRate: number
  status: "active" | "inactive" | "beta"
  features: string[]
}

// 场景获客概览数据
export interface ScenarioOverview {
  totalScenarios: number
  activeScenarios: number
  todayTotal: number
  monthlyTotal: number
  averageGrowthRate: number
  topPerforming: string[]
}

/**
 * 获取场景获客统计数据
 * 对应cunkebao_v3项目中的场景获客模块
 */
export async function getScenarioStats(): Promise<ScenarioStatsData[]> {
  try {
    console.log("📊 获取场景获客统计数据")

    const response = await apiClient.get<ScenarioStatsData[]>("/api/scenarios/stats")

    if (response.code === 200 && response.data) {
      console.log("✅ 获取场景统计成功:", response.data.length)
      return response.data
    }

    throw new Error(response.message || "获取场景统计失败")
  } catch (error) {
    console.error("❌ 获取场景统计失败:", error)

    // 返回模拟数据作为降级方案
    return [
      {
        id: "haibao",
        name: "海报获客",
        type: "poster",
        todayCount: 167,
        totalCount: 5420,
        growthRate: 10.2,
        status: "active",
        lastUpdateTime: "2024-01-15 14:30:00",
      },
      {
        id: "dingdan",
        name: "订单获客",
        type: "order",
        todayCount: 112,
        totalCount: 3890,
        growthRate: 7.8,
        status: "active",
        lastUpdateTime: "2024-01-15 14:25:00",
      },
      {
        id: "douyin",
        name: "抖音获客",
        type: "douyin",
        todayCount: 156,
        totalCount: 4760,
        growthRate: 12.5,
        status: "active",
        lastUpdateTime: "2024-01-15 14:20:00",
      },
      {
        id: "xiaohongshu",
        name: "小红书获客",
        type: "xiaohongshu",
        todayCount: 89,
        totalCount: 2340,
        growthRate: 8.3,
        status: "active",
        lastUpdateTime: "2024-01-15 14:15:00",
      },
      {
        id: "phone",
        name: "电话获客",
        type: "phone",
        todayCount: 42,
        totalCount: 1890,
        growthRate: 15.8,
        status: "active",
        lastUpdateTime: "2024-01-15 14:10:00",
      },
      {
        id: "gongzhonghao",
        name: "公众号获客",
        type: "wechat_official",
        todayCount: 234,
        totalCount: 7650,
        growthRate: 15.7,
        status: "active",
        lastUpdateTime: "2024-01-15 14:05:00",
      },
      {
        id: "weixinqun",
        name: "微信群获客",
        type: "wechat_group",
        todayCount: 145,
        totalCount: 4320,
        growthRate: 11.2,
        status: "active",
        lastUpdateTime: "2024-01-15 14:00:00",
      },
      {
        id: "fukuanma",
        name: "付款码获客",
        type: "payment_code",
        todayCount: 78,
        totalCount: 2100,
        growthRate: 9.5,
        status: "active",
        lastUpdateTime: "2024-01-15 13:55:00",
      },
      {
        id: "api",
        name: "API获客",
        type: "api",
        todayCount: 198,
        totalCount: 6540,
        growthRate: 14.3,
        status: "active",
        lastUpdateTime: "2024-01-15 13:50:00",
      },
    ]
  }
}

/**
 * 获取AI智能获客数据
 * 对应cunkebao_v3项目中的AI模块
 */
export async function getAIScenarioStats(): Promise<AIScenarioData[]> {
  try {
    console.log("🤖 获取AI智能获客数据")

    const response = await apiClient.get<AIScenarioData[]>("/api/ai-scenarios/stats")

    if (response.code === 200 && response.data) {
      console.log("✅ 获取AI场景统计成功:", response.data.length)
      return response.data
    }

    throw new Error(response.message || "获取AI场景统计失败")
  } catch (error) {
    console.error("❌ 获取AI场景统计失败:", error)

    // 返回模拟数据作为降级方案
    return [
      {
        id: "ai-friend",
        name: "AI智能加友",
        description: "智能分析用户画像，自动添加优质客户",
        todayCount: 245,
        totalCount: 8900,
        growthRate: 18.5,
        status: "beta",
        features: ["智能筛选", "自动加友", "画像分析"],
      },
      {
        id: "ai-group",
        name: "AI群引流",
        description: "智能群聊互动，提高群活跃度和转化率",
        todayCount: 178,
        totalCount: 5670,
        growthRate: 15.2,
        status: "beta",
        features: ["智能回复", "群活跃度", "转化优化"],
      },
      {
        id: "ai-conversion",
        name: "AI话费转化",
        description: "多话费智能营销，提升转化效果",
        todayCount: 134,
        totalCount: 4230,
        growthRate: 12.8,
        status: "beta",
        features: ["智能营销", "转化分析", "效果优化"],
      },
    ]
  }
}

/**
 * 获取场景获客概览数据
 */
export async function getScenarioOverview(): Promise<ScenarioOverview> {
  try {
    console.log("📈 获取场景获客概览")

    const response = await apiClient.get<ScenarioOverview>("/api/scenarios/overview")

    if (response.code === 200 && response.data) {
      console.log("✅ 获取概览数据成功")
      return response.data
    }

    throw new Error(response.message || "获取概览数据失败")
  } catch (error) {
    console.error("❌ 获取概览数据失败:", error)

    // 返回模拟数据作为降级方案
    return {
      totalScenarios: 12,
      activeScenarios: 9,
      todayTotal: 1421,
      monthlyTotal: 42890,
      averageGrowthRate: 12.4,
      topPerforming: ["公众号获客", "API获客", "抖音获客"],
    }
  }
}

/**
 * 创建新的获客计划
 */
export async function createScenarioPlan(planData: {
  name: string
  type: string
  config: any
  deviceIds: string[]
  targetCount: number
}): Promise<{ id: string; message: string }> {
  try {
    console.log("🎯 创建获客计划:", planData.name)

    const response = await apiClient.post<{ id: string; message: string }>("/api/scenarios/create", planData)

    if (response.code === 200 && response.data) {
      console.log("✅ 创建计划成功")
      return response.data
    }

    throw new Error(response.message || "创建计划失败")
  } catch (error) {
    console.error("❌ 创建计划失败:", error)
    throw error
  }
}

/**
 * 启动获客场景
 */
export async function startScenario(scenarioId: string): Promise<{ message: string }> {
  try {
    console.log("▶️ 启动获客场景:", scenarioId)

    const response = await apiClient.post<{ message: string }>(`/api/scenarios/${scenarioId}/start`, {})

    if (response.code === 200) {
      console.log("✅ 启动场景成功")
      return response.data || { message: "启动成功" }
    }

    throw new Error(response.message || "启动场景失败")
  } catch (error) {
    console.error("❌ 启动场景失败:", error)
    throw error
  }
}

/**
 * 停止获客场景
 */
export async function stopScenario(scenarioId: string): Promise<{ message: string }> {
  try {
    console.log("⏹️ 停止获客场景:", scenarioId)

    const response = await apiClient.post<{ message: string }>(`/api/scenarios/${scenarioId}/stop`, {})

    if (response.code === 200) {
      console.log("✅ 停止场景成功")
      return response.data || { message: "停止成功" }
    }

    throw new Error(response.message || "停止场景失败")
  } catch (error) {
    console.error("❌ 停止场景失败:", error)
    throw error
  }
}
