// 流量池用户类型
export interface TrafficPoolUser {
  id: number;
  identifier: string;
  mobile: string;
  wechatId: string;
  fromd: string;
  status: number;
  createTime: string;
  companyId: number;
  sourceId: string;
  type: number;
  nickname: string;
  avatar: string;
  gender: number;
  phone: string;
  packages: string[];
  tags: string[];
}

// 列表响应类型
export interface TrafficPoolUserListResponse {
  list: TrafficPoolUser[];
  total: number;
  page: number;
  pageSize: number;
}

// 设备类型
export interface DeviceOption {
  id: string;
  name: string;
}

// 分组类型
export interface PackageOption {
  id: string;
  name: string;
}

// 用户价值类型
export type ValueLevel = "all" | "high" | "medium" | "low";

// 状态类型
export type UserStatus = "all" | "added" | "pending" | "failed" | "duplicate";

// 获客场景类型
export interface ScenarioOption {
  id: string;
  name: string;
}
