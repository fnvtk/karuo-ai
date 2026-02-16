// 流量分发相关类型定义

export interface Device {
  id: string;
  name: string;
  status: "online" | "offline" | "busy";
  battery: number;
  location: string;
  wechatAccounts: number;
  dailyAddLimit: number;
  todayAdded: number;
}

export interface WechatAccount {
  id: string;
  nickname: string;
  wechatId: string;
  avatar: string;
  deviceId: string;
  status: "normal" | "limited" | "blocked";
  friendCount: number;
  dailyAddLimit: number;
}

export interface CustomerService {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "offline" | "busy";
  assignedUsers: number;
}

export interface TrafficPool {
  id: string;
  name: string;
  description?: string;
  userCount?: number;
  tags?: string[];
  createdAt?: string;
  deviceIds?: string[];
}

export interface RFMScore {
  recency: number;
  frequency: number;
  monetary: number;
  total: number;
  segment: string;
  priority: "high" | "medium" | "low";
}

export interface UserTag {
  id: string;
  name: string;
  color: string;
  source: string;
}

export interface UserInteraction {
  id: string;
  type: "message" | "purchase" | "view" | "click";
  content: string;
  timestamp: string;
  value?: number;
}

export interface TrafficUser {
  id: string;
  avatar: string;
  nickname: string;
  wechatId: string;
  phone: string;
  region: string;
  note: string;
  status: "pending" | "added" | "failed" | "duplicate";
  addTime: string;
  source: string;
  scenario: string;
  deviceId: string;
  wechatAccountId: string;
  customerServiceId: string;
  poolIds: string[];
  tags: UserTag[];
  rfmScore: RFMScore;
  lastInteraction: string;
  totalSpent: number;
  interactionCount: number;
  conversionRate: number;
  isDuplicate: boolean;
  mergedAccounts: string[];
  addStatus: "not_added" | "adding" | "added" | "failed";
  interactions: UserInteraction[];
}

// 流量分发规则类型
export interface DistributionRule {
  id: number;
  companyId: number;
  name: string;
  type: number;
  status: number;
  autoStart: number;
  userId: number;
  createTime: string;
  updateTime: string;
  config: {
    id: number;
    workbenchId: number;
    distributeType: number;
    maxPerDay: number;
    timeType: number;
    startTime: string;
    endTime: string;
    account: (string | number)[];
    devices: string[];
    poolGroups: string[];
    exp: number;
    createTime: string;
    updateTime: string;
    lastUpdated: string;
    total: {
      dailyAverage: number;
      totalAccounts: number;
      deviceCount: number;
      poolCount: string | number;
      totalUsers: number;
    };
  };
  creatorName: string;
  auto_like: any;
  moments_sync: any;
  group_push: any;
}
