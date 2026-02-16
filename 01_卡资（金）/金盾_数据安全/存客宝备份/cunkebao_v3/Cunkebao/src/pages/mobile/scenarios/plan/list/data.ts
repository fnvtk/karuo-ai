export interface Task {
  id: string;
  name: string;
  status: number;
  created_at: string;
  updated_at: string;
  enabled: boolean;
  total_customers?: number;
  today_customers?: number;
  lastUpdated?: string;
  planType?: number; // 0-全局计划, 1-独立计划
  stats?: {
    devices?: number;
    acquired?: number;
    added?: number;
  };
  reqConf?: {
    device?: string[];
    selectedDevices?: string[];
  };
  acquiredCount?: number;
  addedCount?: number;
  passRate?: number;
  passCount?: number;
}

export interface ApiSettings {
  apiKey: string;
  webhookUrl: string;
  taskId: string;
}

// API响应相关类型
export interface TextUrl {
  apiKey: string;
  originalString?: string;
  sign?: string;
  fullUrl: string;
}

export interface PlanDetail {
  id: number;
  name: string;
  scenario: number;
  enabled: boolean;
  status: number;
  apiKey: string;
  textUrl: TextUrl;
  [key: string]: any;
}

export interface ApiResponse<T> {
  code: number;
  msg?: string;
  data: T;
}

export interface PlanListResponse {
  list: Task[];
  total: number;
}
