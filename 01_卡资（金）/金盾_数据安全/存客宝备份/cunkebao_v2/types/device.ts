// 设备状态枚举
export enum DeviceStatus {
  ONLINE = "online",
  OFFLINE = "offline",
  BUSY = "busy",
  ERROR = "error",
}

// 设备类型枚举
export enum DeviceType {
  ANDROID = "android",
  IOS = "ios",
}

// 设备基础信息
export interface Device {
  id: string
  name: string
  imei: string
  type: DeviceType
  status: DeviceStatus
  wechatId: string
  friendCount: number
  battery: number
  lastActive: string
  addFriendStatus: "normal" | "abnormal"
  remark?: string
  // 新增属性
  model?: string // 设备型号
  category?: string // 设备分类
  todayAdded?: number // 今日新增好友
  totalTasks?: number // 总任务数
  completedTasks?: number // 已完成任务数
  activePlans?: string[] // 活跃计划ID列表
  planNames?: string[] // 计划名称列表
  tags?: string[] // 设备标签
  location?: string // 设备位置
  operator?: string // 操作员
  purchaseDate?: string // 购买日期
  warrantyExpiry?: string // 保修到期日期
}

// 设备统计信息
export interface DeviceStats {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  todayNewFriends: number
  totalNewFriends: number
  onlineTime: number // 在线时长(分钟)
}

// 设备任务记录
export interface DeviceTaskRecord {
  id: string
  deviceId: string
  taskType: string
  status: "pending" | "running" | "completed" | "failed"
  startTime: string
  endTime?: string
  result?: string
  error?: string
}

// API响应格式
export interface ApiResponse<T> {
  code: number
  message: string
  data: T | null
}

// 分页响应格式
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 设备查询参数
export interface QueryDeviceParams {
  keyword?: string
  status?: DeviceStatus
  type?: DeviceType
  tags?: string[]
  page?: number
  pageSize?: number
  dateRange?: {
    start: string
    end: string
  }
}

// 创建设备参数
export interface CreateDeviceParams {
  name: string
  imei: string
  type: DeviceType
  wechatId?: string
  remark?: string
  tags?: string[]
}

// 更新设备参数
export interface UpdateDeviceParams {
  id: string
  name?: string
  wechatId?: string
  remark?: string
  tags?: string[]
}

export interface DeviceResponse {
  code: number
  message: string
  data: {
    devices: Device[]
    total: number
  }
}

export interface DeviceSelectResponse {
  code: number
  message: string
  data: {
    success: boolean
    deviceIds: string[]
  }
}

// 新增设备分类枚举
export enum DeviceCategory {
  ACQUISITION = "acquisition", // 获客设备
  MAINTENANCE = "maintenance", // 维护设备
  TESTING = "testing", // 测试设备
  BACKUP = "backup", // 备用设备
}

// 新增设备过滤参数
export interface DeviceFilterParams {
  keyword?: string
  status?: DeviceStatus[]
  type?: DeviceType[]
  category?: DeviceCategory[]
  tags?: string[]
  models?: string[]
  batteryRange?: [number, number]
  friendCountRange?: [number, number]
  hasActivePlans?: boolean
  dateRange?: {
    start: string
    end: string
  }
}
