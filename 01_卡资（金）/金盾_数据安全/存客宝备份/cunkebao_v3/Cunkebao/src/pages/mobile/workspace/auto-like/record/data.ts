// 自动点赞任务状态
export type LikeTaskStatus = 1 | 2; // 1: 开启, 2: 关闭

// 内容类型
export type ContentType = "text" | "image" | "video" | "link";

// 设备信息
export interface Device {
  id: string;
  name: string;
  status: "online" | "offline";
  lastActive: string;
}

// 好友信息
export interface Friend {
  id: string;
  nickname: string;
  wechatId: string;
  avatar: string;
  tags: string[];
  region: string;
  source: string;
}

// 点赞记录
export interface LikeRecord {
  id: string;
  workbenchId: string;
  momentsId: string;
  snsId: string;
  wechatAccountId: string;
  wechatFriendId: string;
  likeTime: string;
  content: string;
  resUrls: string[];
  momentTime: string;
  userName: string;
  operatorName: string;
  operatorAvatar: string;
  friendName: string;
  friendAvatar: string;
}

// 自动点赞任务
export interface LikeTask {
  id: string;
  name: string;
  status: LikeTaskStatus;
  deviceCount: number;
  targetGroup: string;
  likeCount: number;
  lastLikeTime: string;
  createTime: string;
  creator: string;
  likeInterval: number;
  maxLikesPerDay: number;
  timeRange: { start: string; end: string };
  contentTypes: ContentType[];
  targetTags: string[];
  devices: string[];
  friends: string[];
  friendMaxLikes: number;
  friendTags: string;
  enableFriendTags: boolean;
  todayLikeCount: number;
  totalLikeCount: number;
  updateTime: string;
}

// 创建任务数据
export interface CreateLikeTaskData {
  name: string;
  interval: number;
  maxLikes: number;
  startTime: string;
  endTime: string;
  contentTypes: ContentType[];
  devices: string[];
  friends?: string[];
  friendMaxLikes: number;
  friendTags?: string;
  enableFriendTags: boolean;
  targetTags: string[];
}

// 更新任务数据
export interface UpdateLikeTaskData extends CreateLikeTaskData {
  id: string;
}

// 任务配置
export interface TaskConfig {
  interval: number;
  maxLikes: number;
  startTime: string;
  endTime: string;
  contentTypes: ContentType[];
  devices: string[];
  friends: string[];
  friendMaxLikes: number;
  friendTags: string;
  enableFriendTags: boolean;
}

// API响应类型
export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  limit: number;
}
