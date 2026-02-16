// 场景数据类型
export interface Scenario {
  id: string
  name: string
  type:
    | "phone"
    | "poster"
    | "douyin"
    | "weixinqun"
    | "payment"
    | "api"
    | "gongzhonghao"
    | "xiaohongshu"
    | "haibao"
    | "order"
  description: string
  status: "active" | "inactive" | "draft"
  todayCount: number
  growthRate: number
  totalAcquired: number
  totalAdded: number
  passRate: number
  createdAt: string
  updatedAt: string
  config?: Record<string, any>
}

// 场景统计数据
export interface ScenarioStats {
  totalScenarios: number
  activeScenarios: number
  todayAcquisition: number
  totalAcquisition: number
  averagePassRate: number
  topPerformingScenario: string
}

// 场景创建参数
export interface CreateScenarioParams {
  name: string
  type: Scenario["type"]
  description: string
  config: Record<string, any>
}

// 场景更新参数
export interface UpdateScenarioParams {
  name?: string
  description?: string
  status?: Scenario["status"]
  config?: Record<string, any>
}

// API请求基础配置
const apiRequest = async (url: string, options: RequestInit = {}) => {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://ckbapi.quwanzhi.com"

    const response = await fetch(`${baseUrl}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    console.error("API请求错误:", error)
    throw error
  }
}

// 统一的API响应格式类型
export interface ApiResponse<T = any> {
  code: number
  message?: string
  data?: T
}

// 场景基础类型（用于列表查询）
export interface ScenarioBase {
  id: string
  name: string
  type: Scenario["type"]
  status: string
  createdAt: string
  updatedAt: string
}

// 分页查询响应类型
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// 场景API服务
export const scenarioApi = {
  // 获取场景列表
  async getScenarios(params?: {
    page?: number
    pageSize?: number
    type?: string
    status?: string
    search?: string
  }): Promise<{ data: Scenario[]; total: number }> {
    try {
      const searchParams = new URLSearchParams()

      if (params?.page) searchParams.append("page", params.page.toString())
      if (params?.pageSize) searchParams.append("pageSize", params.pageSize.toString())
      if (params?.type) searchParams.append("type", params.type)
      if (params?.status) searchParams.append("status", params.status)
      if (params?.search) searchParams.append("search", params.search)

      const url = `/api/scenarios?${searchParams.toString()}`
      return await apiRequest(url)
    } catch (error) {
      console.error("获取场景列表失败:", error)
      // 返回模拟数据作为降级方案
      return {
        data: mockScenarioData,
        total: mockScenarioData.length,
      }
    }
  },

  // 获取场景详情
  async getScenario(id: string): Promise<Scenario> {
    try {
      const url = `/api/scenarios/${id}`
      return await apiRequest(url)
    } catch (error) {
      console.error("获取场景详情失败:", error)
      // 返回模拟数据
      const mockScenario = mockScenarioData.find((s) => s.id === id)
      if (mockScenario) {
        return mockScenario
      }
      throw error
    }
  },

  // 创建场景
  async createScenario(params: CreateScenarioParams): Promise<Scenario> {
    try {
      return await apiRequest("/api/scenarios", {
        method: "POST",
        body: JSON.stringify(params),
      })
    } catch (error) {
      console.error("创建场景失败:", error)
      throw error
    }
  },

  // 更新场景
  async updateScenario(id: string, params: UpdateScenarioParams): Promise<Scenario> {
    try {
      const url = `/api/scenarios/${id}`
      return await apiRequest(url, {
        method: "PUT",
        body: JSON.stringify(params),
      })
    } catch (error) {
      console.error("更新场景失败:", error)
      throw error
    }
  },

  // 删除场景
  async deleteScenario(id: string): Promise<void> {
    try {
      const url = `/api/scenarios/${id}`
      await apiRequest(url, {
        method: "DELETE",
      })
    } catch (error) {
      console.error("删除场景失败:", error)
      throw error
    }
  },

  // 启动场景
  async startScenario(id: string): Promise<void> {
    try {
      const url = `/api/scenarios/${id}/start`
      await apiRequest(url, {
        method: "POST",
      })
    } catch (error) {
      console.error("启动场景失败:", error)
      throw error
    }
  },

  // 停止场景
  async stopScenario(id: string): Promise<void> {
    try {
      const url = `/api/scenarios/${id}/stop`
      await apiRequest(url, {
        method: "POST",
      })
    } catch (error) {
      console.error("停止场景失败:", error)
      throw error
    }
  },

  // 暂停场景
  async pauseScenario(id: string): Promise<void> {
    try {
      const url = `/api/scenarios/${id}/pause`
      await apiRequest(url, {
        method: "POST",
      })
    } catch (error) {
      console.error("暂停场景失败:", error)
      throw error
    }
  },

  // 复制场景
  async copyScenario(id: string, name: string): Promise<Scenario> {
    try {
      const url = `/api/scenarios/${id}/copy`
      return await apiRequest(url, {
        method: "POST",
        body: JSON.stringify({ name }),
      })
    } catch (error) {
      console.error("复制场景失败:", error)
      throw error
    }
  },

  // 获取场景统计
  async getScenarioStats(
    id: string,
    params?: {
      startDate?: string
      endDate?: string
    },
  ): Promise<{
    todayAcquisition: number
    totalAcquisition: number
    passRate: number
    trend: Array<{ date: string; count: number }>
  }> {
    try {
      const searchParams = new URLSearchParams()
      if (params?.startDate) searchParams.append("startDate", params.startDate)
      if (params?.endDate) searchParams.append("endDate", params.endDate)

      const url = `/api/scenarios/${id}/stats?${searchParams.toString()}`
      return await apiRequest(url)
    } catch (error) {
      console.error("获取场景统计失败:", error)
      // 返回模拟数据
      return {
        todayAcquisition: Math.floor(Math.random() * 200),
        totalAcquisition: Math.floor(Math.random() * 5000),
        passRate: Math.floor(Math.random() * 100),
        trend: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          count: Math.floor(Math.random() * 100),
        })),
      }
    }
  },

  // 获取场景API配置
  async getScenarioApiConfig(id: string): Promise<{
    apiKey: string
    webhookUrl: string
    callbackUrl: string
    config: Record<string, any>
  }> {
    try {
      const url = `/api/scenarios/${id}/config`
      return await apiRequest(url)
    } catch (error) {
      console.error("获取场景API配置失败:", error)
      // 返回模拟数据
      return {
        apiKey: `ckb_${id}_${Date.now()}`,
        webhookUrl: `https://ckbapi.quwanzhi.com/webhook/${id}`,
        callbackUrl: `https://ckbapi.quwanzhi.com/callback/${id}`,
        config: {},
      }
    }
  },

  // 获取总体统计
  async getOverallStats(): Promise<ScenarioStats> {
    try {
      return await apiRequest("/api/scenarios/stats/overall")
    } catch (error) {
      console.error("获取总体统计失败:", error)
      // 返回模拟数据
      return {
        totalScenarios: mockScenarioData.length,
        activeScenarios: mockScenarioData.filter((s) => s.status === "active").length,
        todayAcquisition: mockScenarioData.reduce((sum, s) => sum + s.todayCount, 0),
        totalAcquisition: mockScenarioData.reduce((sum, s) => sum + s.totalAcquired, 0),
        averagePassRate: mockScenarioData.reduce((sum, s) => sum + s.passRate, 0) / mockScenarioData.length,
        topPerformingScenario: mockScenarioData.sort((a, b) => b.todayCount - a.todayCount)[0]?.name || "暂无数据",
      }
    }
  },

  async query(params?: {
    page?: number
    pageSize?: number
    type?: string
    status?: string
    search?: string
  }): Promise<ApiResponse<PaginatedResponse<ScenarioBase>>> {
    try {
      const result = await this.getScenarios(params)
      return {
        code: 0,
        data: {
          items: result.data as unknown as ScenarioBase[],
          total: result.total,
          page: params?.page || 1,
          pageSize: params?.pageSize || 20,
        },
      }
    } catch (error) {
      console.error("查询场景列表失败:", error)
      return {
        code: -1,
        message: error instanceof Error ? error.message : "查询失败",
        data: {
          items: mockScenarioData as unknown as ScenarioBase[],
          total: mockScenarioData.length,
          page: params?.page || 1,
          pageSize: params?.pageSize || 20,
        },
      }
    }
  },

  async copy(id: string, name: string): Promise<ApiResponse<Scenario>> {
    try {
      const result = await this.copyScenario(id, name)
      return {
        code: 0,
        data: result,
      }
    } catch (error) {
      console.error("复制场景失败:", error)
      return {
        code: -1,
        message: error instanceof Error ? error.message : "复制失败",
      }
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await this.deleteScenario(id)
      return {
        code: 0,
      }
    } catch (error) {
      console.error("删除场景失败:", error)
      return {
        code: -1,
        message: error instanceof Error ? error.message : "删除失败",
      }
    }
  },

  async start(id: string): Promise<ApiResponse<void>> {
    try {
      await this.startScenario(id)
      return {
        code: 0,
      }
    } catch (error) {
      console.error("启动场景失败:", error)
      return {
        code: -1,
        message: error instanceof Error ? error.message : "启动失败",
      }
    }
  },

  async pause(id: string): Promise<ApiResponse<void>> {
    try {
      await this.pauseScenario(id)
      return {
        code: 0,
      }
    } catch (error) {
      console.error("暂停场景失败:", error)
      return {
        code: -1,
        message: error instanceof Error ? error.message : "暂停失败",
      }
    }
  },

  async getApiConfig(id: string): Promise<
    ApiResponse<{
      apiKey: string
      webhookUrl: string
      callbackUrl: string
      config: Record<string, any>
    }>
  > {
    try {
      const result = await this.getScenarioApiConfig(id)
      return {
        code: 0,
        data: result,
      }
    } catch (error) {
      console.error("获取API配置失败:", error)
      return {
        code: -1,
        message: error instanceof Error ? error.message : "获取配置失败",
      }
    }
  },
}

// 模拟数据（开发环境使用）
export const mockScenarioData: Scenario[] = [
  {
    id: "haibao",
    name: "海报获客",
    type: "haibao",
    description: "通过海报推广获取潜在客户",
    status: "active",
    todayCount: 167,
    growthRate: 10.2,
    totalAcquired: 1250,
    totalAdded: 856,
    passRate: 68.5,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-20T15:30:00Z",
  },
  {
    id: "order",
    name: "订单获客",
    type: "order",
    description: "订单场景下的客户获取",
    status: "active",
    todayCount: 112,
    growthRate: 7.8,
    totalAcquired: 890,
    totalAdded: 623,
    passRate: 70.0,
    createdAt: "2024-01-10T09:00:00Z",
    updatedAt: "2024-01-19T14:20:00Z",
  },
  {
    id: "douyin",
    name: "抖音获客",
    type: "douyin",
    description: "抖音平台客户获取与转化",
    status: "active",
    todayCount: 156,
    growthRate: 12.5,
    totalAcquired: 2100,
    totalAdded: 1470,
    passRate: 70.0,
    createdAt: "2024-01-08T11:00:00Z",
    updatedAt: "2024-01-18T16:45:00Z",
  },
  {
    id: "xiaohongshu",
    name: "小红书获客",
    type: "xiaohongshu",
    description: "小红书平台营销获客",
    status: "active",
    todayCount: 89,
    growthRate: 8.3,
    totalAcquired: 567,
    totalAdded: 340,
    passRate: 60.0,
    createdAt: "2024-01-05T08:00:00Z",
    updatedAt: "2024-01-15T12:00:00Z",
  },
  {
    id: "phone",
    name: "电话获客",
    type: "phone",
    description: "通过电话外呼进行客户获取",
    status: "active",
    todayCount: 42,
    growthRate: 15.8,
    totalAcquired: 456,
    totalAdded: 298,
    passRate: 65.4,
    createdAt: "2024-01-12T14:00:00Z",
    updatedAt: "2024-01-17T11:30:00Z",
  },
  {
    id: "gongzhonghao",
    name: "公众号获客",
    type: "gongzhonghao",
    description: "微信公众号营销获客",
    status: "active",
    todayCount: 234,
    growthRate: 15.7,
    totalAcquired: 1890,
    totalAdded: 1323,
    passRate: 70.0,
    createdAt: "2024-01-03T16:00:00Z",
    updatedAt: "2024-01-16T09:15:00Z",
  },
  {
    id: "weixinqun",
    name: "微信群获客",
    type: "weixinqun",
    description: "微信群营销和客户获取",
    status: "active",
    todayCount: 145,
    growthRate: 11.2,
    totalAcquired: 1123,
    totalAdded: 789,
    passRate: 70.3,
    createdAt: "2024-01-07T13:00:00Z",
    updatedAt: "2024-01-14T17:45:00Z",
  },
  {
    id: "payment",
    name: "付款码获客",
    type: "payment",
    description: "支付场景下的客户获取",
    status: "active",
    todayCount: 78,
    growthRate: 9.5,
    totalAcquired: 345,
    totalAdded: 234,
    passRate: 67.8,
    createdAt: "2024-01-09T10:00:00Z",
    updatedAt: "2024-01-13T15:20:00Z",
  },
  {
    id: "api",
    name: "API获客",
    type: "api",
    description: "通过API接口进行客户获取",
    status: "active",
    todayCount: 198,
    growthRate: 14.3,
    totalAcquired: 1567,
    totalAdded: 1098,
    passRate: 70.1,
    createdAt: "2024-01-06T12:00:00Z",
    updatedAt: "2024-01-11T18:30:00Z",
  },
]

export default scenarioApi
