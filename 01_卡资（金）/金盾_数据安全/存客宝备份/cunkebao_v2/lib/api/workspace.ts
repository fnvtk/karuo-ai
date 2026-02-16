// 工作台API接口定义
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://ckbapi.quwanzhi.com"

// 工作台任务类型
export type WorkspaceTaskType =
  | "moments-sync" // 朋友圈同步
  | "group-push" // 社群推送
  | "auto-like" // 自动点赞
  | "auto-group" // 自动建群
  | "group-sync" // 群同步
  | "traffic-distribution" // 流量分发
  | "ai-assistant" // AI助手
  | "ai-analyzer" // AI分析
  | "ai-strategy" // AI策略

// 工作台任务状态
export type WorkspaceTaskStatus = "pending" | "running" | "completed" | "failed" | "paused"

// 工作台任务数据类型
export interface WorkspaceTask {
  id: string
  name: string
  type: WorkspaceTaskType
  status: WorkspaceTaskStatus
  progress: number
  deviceCount: number
  wechatCount: number
  targetCount: number
  completedCount: number
  successRate: number
  createTime: string
  startTime?: string
  endTime?: string
  lastRunTime?: string
  nextRunTime?: string
  settings: Record<string, any>
  tags: string[]
  creator: string
  description?: string
}

// 工作台统计数据
export interface WorkspaceStats {
  totalTasks: number
  runningTasks: number
  completedTasks: number
  failedTasks: number
  todayCompleted: number
  totalCompleted: number
  averageSuccessRate: number
}

// 任务创建参数
export interface CreateTaskParams {
  name: string
  type: WorkspaceTaskType
  deviceIds: string[]
  wechatIds: string[]
  settings: Record<string, any>
  tags?: string[]
  description?: string
  scheduleTime?: string
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

    console.log("发送工作台API请求:", url)

    const response = await fetch(url, {
      ...options,
      headers,
      mode: "cors",
    })

    console.log("工作台API响应状态:", response.status, response.statusText)

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
    console.log("工作台API响应数据:", data)

    if (data.code && data.code !== 200 && data.code !== 0) {
      throw new Error(data.message || "请求失败")
    }

    return data.data || data
  } catch (error) {
    console.error("工作台API请求失败:", error)
    throw error
  }
}

/**
 * 获取工作台任务列表
 */
export async function getWorkspaceTasks(): Promise<WorkspaceTask[]> {
  return apiRequest<WorkspaceTask[]>(`${API_BASE_URL}/v1/workspace/tasks`)
}

/**
 * 获取工作台统计数据
 */
export async function getWorkspaceStats(): Promise<WorkspaceStats> {
  return apiRequest<WorkspaceStats>(`${API_BASE_URL}/v1/workspace/stats`)
}

/**
 * 获取单个任务详情
 */
export async function getWorkspaceTask(id: string): Promise<WorkspaceTask> {
  return apiRequest<WorkspaceTask>(`${API_BASE_URL}/v1/workspace/tasks/${id}`)
}

/**
 * 创建工作台任务
 */
export async function createWorkspaceTask(
  params: CreateTaskParams,
): Promise<{ success: boolean; message: string; id?: string }> {
  return apiRequest(`${API_BASE_URL}/v1/workspace/tasks`, {
    method: "POST",
    body: JSON.stringify(params),
  })
}

/**
 * 更新工作台任务
 */
export async function updateWorkspaceTask(
  id: string,
  params: Partial<CreateTaskParams>,
): Promise<{ success: boolean; message: string }> {
  return apiRequest(`${API_BASE_URL}/v1/workspace/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(params),
  })
}

/**
 * 删除工作台任务
 */
export async function deleteWorkspaceTask(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`${API_BASE_URL}/v1/workspace/tasks/${id}`, {
    method: "DELETE",
  })
}

/**
 * 启动工作台任务
 */
export async function startWorkspaceTask(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`${API_BASE_URL}/v1/workspace/tasks/${id}/start`, {
    method: "POST",
  })
}

/**
 * 停止工作台任务
 */
export async function stopWorkspaceTask(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`${API_BASE_URL}/v1/workspace/tasks/${id}/stop`, {
    method: "POST",
  })
}

/**
 * 暂停工作台任务
 */
export async function pauseWorkspaceTask(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`${API_BASE_URL}/v1/workspace/tasks/${id}/pause`, {
    method: "POST",
  })
}

/**
 * 获取任务运行日志
 */
export async function getWorkspaceTaskLogs(
  id: string,
  page = 1,
  limit = 20,
): Promise<{
  logs: Array<{
    id: string
    timestamp: string
    level: "info" | "warning" | "error"
    message: string
    details?: any
  }>
  total: number
  page: number
  limit: number
}> {
  return apiRequest(`${API_BASE_URL}/v1/workspace/tasks/${id}/logs?page=${page}&limit=${limit}`)
}

/**
 * 获取任务执行报告
 */
export async function getWorkspaceTaskReport(
  id: string,
  dateRange?: { start: string; end: string },
): Promise<{
  summary: {
    totalExecutions: number
    successfulExecutions: number
    failedExecutions: number
    averageExecutionTime: number
    successRate: number
  }
  dailyStats: Array<{
    date: string
    executions: number
    successes: number
    failures: number
    successRate: number
  }>
  deviceStats: Array<{
    deviceId: string
    deviceName: string
    executions: number
    successes: number
    failures: number
    successRate: number
  }>
}> {
  const queryString = dateRange ? `?start=${dateRange.start}&end=${dateRange.end}` : ""
  return apiRequest(`${API_BASE_URL}/v1/workspace/tasks/${id}/report${queryString}`)
}

/**
 * 批量操作任务
 */
export async function batchOperateWorkspaceTasks(
  taskIds: string[],
  operation: "start" | "stop" | "pause" | "delete",
): Promise<{ success: boolean; message: string; results: Array<{ id: string; success: boolean; message: string }> }> {
  return apiRequest(`${API_BASE_URL}/v1/workspace/tasks/batch`, {
    method: "POST",
    body: JSON.stringify({
      taskIds,
      operation,
    }),
  })
}
