// 通讯录导入任务状态
export type ContactImportTaskStatus = 1 | 2; // 1: 开启, 2: 关闭

// 设备组信息
export interface DeviceGroup {
  id: string;
  name: string;
  deviceCount: number;
  status: "online" | "offline";
  lastActive: string;
}

// 通讯录导入记录
export interface ContactImportRecord {
  id: string;
  workbenchId: string;
  wechatAccountId: string;
  deviceId: string;
  num: number;
  clientId: string;
  remarkType: string;
  remarkValue: string;
  startTime: string;
  endTime: string;
  createTime: string;
  operatorName: string;
  operatorAvatar: string;
  deviceName: string;
  importStatus: "success" | "failed" | "pending";
  errorMessage?: string;
}

// 通讯录导入任务配置
export interface ContactImportTaskConfig {
  id: number;
  workbenchId: number;
  devices: number[];
  poolGroups: number[];
  num: number;
  clearContact: number;
  remarkType: number;
  remark: string;
  startTime: string;
  endTime: string;
  createTime: string;
}

// 通讯录导入任务
export interface ContactImportTask {
  id: number;
  companyId: number;
  name: string;
  type: number;
  status: ContactImportTaskStatus;
  autoStart: number;
  userId: number;
  createTime: string;
  updateTime: string;
  config: ContactImportTaskConfig;
  creatorName: string;
  auto_like: any;
  moments_sync: any;
  traffic_config: any;
  group_push: any;
  group_create: any;
  // 计算属性，用于向后兼容
  deviceGroups?: string[];
  todayImportCount?: number;
  totalImportCount?: number;
  maxImportsPerDay?: number;
  importInterval?: number;
}

// 创建通讯录导入任务数据
export interface CreateContactImportTaskData {
  name: string;
  type: number;
  config: {
    devices: number[];
    poolGroups: number[];
    num: number;
    clearContact: number;
    remarkType: number;
    remark: string;
    startTime: string;
    endTime: string;
  };
}

// 更新通讯录导入任务数据
export interface UpdateContactImportTaskData
  extends CreateContactImportTaskData {
  id: number;
}

// 任务配置
export interface TaskConfig {
  deviceGroups: string[];
  num: number;
  clientId: string;
  remarkType: string;
  remarkValue: string;
  startTime: string;
  endTime: string;
  maxImportsPerDay: number;
  importInterval: number;
}

// API响应
export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

// 分页响应
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  limit: number;
}

// 统计数据
export interface ImportStats {
  totalTasks: number;
  activeTasks: number;
  todayImports: number;
  totalImports: number;
  successRate: number;
}
