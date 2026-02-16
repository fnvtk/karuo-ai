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
