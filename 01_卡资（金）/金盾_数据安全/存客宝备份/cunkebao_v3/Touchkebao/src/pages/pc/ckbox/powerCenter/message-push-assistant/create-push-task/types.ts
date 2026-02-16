export type PushType =
  | "friend-message"
  | "group-message"
  | "group-announcement";

export interface ContactItem {
  id: number;
  nickname: string;
  avatar?: string;
  conRemark?: string;
  wechatId?: string;
  gender?: number;
  region?: string;
  type?: "friend" | "group";
  labels?: string[];
  groupId?: number | string;
  groupName?: string;
  groupLabel?: string;
  city?: string;
  extendFields?: Record<string, any>;
}

// 消息类型定义
export type MessageType = "text" | "image" | "file" | "audio";

export interface MessageItem {
  type: MessageType;
  content: string; // 文本内容或文件URL
  // 文件相关字段
  fileName?: string; // 文件名
  fileSize?: number; // 文件大小（字节）
  // 语音相关字段
  durationMs?: number; // 语音时长（毫秒）
}

export interface ScriptGroup {
  id: string;
  name: string;
  messages: string[]; // 保持向后兼容，但实际应该使用 MessageItem[]
}

// 接口请求载荷类型定义
export interface CreatePushTaskPayload {
  // 基础字段
  name: string;
  type: 3; // 固定值：工作台类型
  autoStart: 0 | 1;
  status: 1; // 固定值：启用
  pushType: 0 | 1; // 0=定时，1=立即
  targetType: 1 | 2; // 1=群推送，2=好友推送
  groupPushSubType: 1 | 2; // 1=群群发，2=群公告
  startTime: string; // "HH:mm" 格式
  endTime: string; // "HH:mm" 格式
  maxPerDay: number;
  pushOrder: 1 | 2; // 1=最早优先，2=最新优先
  friendIntervalMin: number;
  friendIntervalMax: number;
  messageIntervalMin: number;
  messageIntervalMax: number;
  isRandomTemplate: 0 | 1;
  contentGroups: number[]; // 内容库ID数组
  postPushTags: number[]; // 推送后标签ID数组
  ownerWechatIds: number[]; // 客服ID数组

  // 好友推送特有字段
  wechatFriends?: string[]; // 好友ID列表（字符串数组）
  deviceGroups?: number[]; // 设备分组ID数组（好友推送时必填）
  isLoop?: 0; // 固定值（好友推送时）

  // 群推送特有字段
  wechatGroups?: number[]; // 微信群ID数组
  announcementContent?: string; // 群公告内容（群公告时必填）

  // 可选字段
  trafficPools?: string[]; // 流量池ID数组（字符串数组）
  manualMessages?: string[]; // 手动消息数组
  manualScriptName?: string; // 手动话术名称
  selectedScriptGroupIds?: string[]; // 选中的话术组ID数组
  enableAiRewrite?: 0 | 1; // 是否启用AI改写
  aiRewritePrompt?: string; // AI改写提示词
  scriptGroups?: Array<{
    id: string;
    name: string;
    messages: string[];
  }>; // 话术组对象数组
}
