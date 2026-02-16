// 流量分发详情接口
export interface TrafficDistributionDetail {
  id: number;
  name: string;
  type: number;
  status: number;
  autoStart: number;
  createTime: string;
  updateTime: string;
  companyId: number;
  config: TrafficDistributionConfig;
  auto_like: any;
  moments_sync: any;
  group_push: any;
}

// 流量分发配置接口
export interface TrafficDistributionConfig {
  id: number;
  workbenchId: number;
  distributeType: number;
  maxPerDay: number;
  timeType: number;
  startTime: string;
  endTime: string;
  accountGroups: any[];
  accountGroupsOptions: any[];
  deviceGroups: any[];
  deviceGroupsOptions: any[];
  poolGroups: any[];
  exp: number;
  createTime: string;
  updateTime: string;
  lastUpdated: string;
  total: {
    dailyAverage: number;
    totalAccounts: number;
    deviceCount: number;
    poolCount: number;
    totalUsers: number;
  };
}

// 流量分发表单数据接口
export interface TrafficDistributionFormData {
  id?: string;
  type: number;
  name: string;
  // 计划类型：0-全局计划，1-独立计划
  planType?: number;
  source: string;
  sourceIcon: string;
  description: string;
  distributeType: number;
  maxPerDay: number;
  timeType: number;
  startTime: string;
  endTime: string;
  deviceGroups: any[];
  deviceGroupsOptions: any[];
  accountGroups: any[];
  accountGroupsOptions: any[];
  poolGroups: any[];
  enabled: boolean;
}

// 流量池接口
export interface TrafficPool {
  id: string;
  name: string;
  userCount: number;
  tags: string[];
}

// 获客场景接口
export interface Scenario {
  label: string;
  value: string;
}
