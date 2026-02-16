export type DeviceStatus = "online" | "offline" | "busy" | "error";

export interface Device {
  id: number | string;
  imei: string;
  memo?: string;
  wechatId?: string;
  totalFriend?: number;
  alive?: number;
  status?: DeviceStatus;
  nickname?: string;
  battery?: number;
  lastActive?: string;
  avatar?: string;
  features?: {
    autoAddFriend?: boolean;
    autoReply?: boolean;
    momentsSync?: boolean;
    aiChat?: boolean;
  };
}

export interface DeviceListResponse {
  list: Device[];
  total: number;
  page: number;
  limit: number;
}

export interface DeviceDetailResponse {
  id: number | string;
  imei: string;
  memo?: string;
  wechatId?: string;
  alive?: number;
  totalFriend?: number;
  nickname?: string;
  battery?: number;
  lastActive?: string;
  features?: {
    autoAddFriend?: boolean;
    autoReply?: boolean;
    momentsSync?: boolean;
    aiChat?: boolean;
  };
}

export interface WechatAccount {
  id: string;
  avatar: string;
  nickname: string;
  wechatId: string;
  gender: number;
  status: number;
  statusText: string;
  wechatAlive: number;
  wechatAliveText: string;
  addFriendStatus: number;
  totalFriend: number;
  lastActive: string;
}

export interface HandleLog {
  id: string | number;
  content: string;
  username: string;
  createTime: string;
}
