import type {
  ApiResponse,
  CreateScenarioParams,
  UpdateScenarioParams,
  QueryScenarioParams,
  ScenarioBase,
  ScenarioStats,
  AcquisitionRecord,
  PaginatedResponse,
} from "@/types/scenario"

const API_BASE = "/api/scenarios"

// 获客场景API
export const scenarioApi = {
  // 创建场景
  async create(params: CreateScenarioParams): Promise<ApiResponse<ScenarioBase>> {
    const response = await fetch(`${API_BASE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    })
    return response.json()
  },

  // 更新场景
  async update(params: UpdateScenarioParams): Promise<ApiResponse<ScenarioBase>> {
    const response = await fetch(`${API_BASE}/${params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    })
    return response.json()
  },

  // 获取场景详情
  async getById(id: string): Promise<ApiResponse<ScenarioBase>> {
    const response = await fetch(`${API_BASE}/${id}`)
    return response.json()
  },

  // 查询场景列表
  async query(params: QueryScenarioParams): Promise<ApiResponse<PaginatedResponse<ScenarioBase>>> {
    const queryString = new URLSearchParams({
      ...params,
      dateRange: params.dateRange ? JSON.stringify(params.dateRange) : "",
    }).toString()

    const response = await fetch(`${API_BASE}?${queryString}`)
    return response.json()
  },

  // 删除场景
  async delete(id: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
    })
    return response.json()
  },

  // 启动场景
  async start(id: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE}/${id}/start`, {
      method: "POST",
    })
    return response.json()
  },

  // 暂停场景
  async pause(id: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE}/${id}/pause`, {
      method: "POST",
    })
    return response.json()
  },

  // 获取场景统计数据
  async getStats(id: string): Promise<ApiResponse<ScenarioStats>> {
    const response = await fetch(`${API_BASE}/${id}/stats`)
    return response.json()
  },

  // 获取获客记录
  async getRecords(id: string, page = 1, pageSize = 20): Promise<ApiResponse<PaginatedResponse<AcquisitionRecord>>> {
    const response = await fetch(`${API_BASE}/${id}/records?page=${page}&pageSize=${pageSize}`)
    return response.json()
  },

  // 导出获客记录
  async exportRecords(id: string, dateRange?: { start: string; end: string }): Promise<Blob> {
    const queryString = dateRange ? `?start=${dateRange.start}&end=${dateRange.end}` : ""
    const response = await fetch(`${API_BASE}/${id}/records/export${queryString}`)
    return response.blob()
  },

  // 批量更新标签
  async updateTags(id: string, customerIds: string[], tags: string[]): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE}/${id}/tags`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerIds, tags }),
    })
    return response.json()
  },
}
