import { ContentItem } from "@/components/ContentSelection/data";
export interface WechatGroup {
  id: string;
  name: string;
  avatar: string;
  serviceAccount: {
    id: string;
    name: string;
    avatar: string;
  };
}

export interface ContentLibrary {
  id: string;
  name: string;
  targets: Array<{
    id: string;
    avatar: string;
  }>;
}

export interface FormData {
  // 计划类型：0-全局计划，1-独立计划
  planType?: number;
  name: string;
  startTime: string; // 允许推送的开始时间
  endTime: string; // 允许推送的结束时间
  dailyPushCount: number;
  pushOrder: number; // 1: 按最早, 2: 按最新
  isLoop: number; // 0: 否, 1: 是
  pushType: number; // 0: 定时推送, 1: 立即推送
  status: number; // 0: 否, 1: 是（同时作为是否自动启动）
  isRandomTemplate?: number; // 是否随机模板：0=否，1=是
  postPushTags?: string[]; // 推送后标签数组
  contentGroups: string[];
  wechatGroups: string[];
  // 推送目标类型：1=群推送，2=好友推送
  targetType: number; // 默认1
  // 群推送子类型：1=群群发，2=群公告（仅当targetType=1时有效）
  groupPushSubType?: number; // 默认1
  // 好友推送相关
  wechatFriends?: string[]; // 当targetType=2时可选（可以为空）
  wechatFriendsOptions?: any[]; // 好友选项列表
  // 流量池（当wechatFriends为空时必须选择）
  poolGroups?: string[]; // 流量池ID列表
  poolGroupsOptions?: any[]; // 流量池选项列表
  // 好友推送间隔设置
  friendIntervalMin?: number; // 目标间最小间隔（秒）
  friendIntervalMax?: number; // 目标间最大间隔（秒）
  messageIntervalMin?: number; // 消息间最小间隔（秒）
  messageIntervalMax?: number; // 消息间最大间隔（秒）
  // 群公告相关（仅当targetType=1且groupPushSubType=2时）
  announcementContent?: string; // 群公告内容
  enableAiRewrite?: number; // 是否启用AI改写：0=否，1=是
  aiRewritePrompt?: string; // AI改写提示词
  // 设备选择
  deviceGroups?: string[]; // 设备ID列表
  deviceGroupsOptions?: any[]; // 设备选项列表
  // 京东联盟相关字段
  socialMediaId?: string;
  promotionSiteId?: string;
  [key: string]: any;
}
