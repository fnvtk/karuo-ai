// 消息列表数据接口 - 支持weChatGroup和contracts两种数据类型
export interface MessageListData {
  serverId: number | string; // 服务器ID作为主键
  id?: number; // 接口数据的原始ID字段

  // 数据类型标识
  dataType: "weChatGroup" | "contracts"; // 数据类型：微信群组或联系人

  // 通用字段（两种类型都有的字段）
  wechatAccountId: number; // 微信账号ID
  tenantId: number; // 租户ID
  accountId: number; // 账号ID
  nickname: string; // 昵称
  avatar?: string; // 头像
  groupId: number; // 分组ID
  config?: {
    chat?: boolean;
    unreadCount: number; // 未读消息数
  }; // 配置信息
  labels?: string[]; // 标签列表

  // 联系人特有字段（当dataType为'contracts'时使用）
  wechatId?: string; // 微信ID
  alias?: string; // 别名
  conRemark?: string; // 备注
  quanPin?: string; // 全拼
  gender?: number; // 性别
  region?: string; // 地区
  addFrom?: number; // 添加来源
  phone?: string; // 电话
  signature?: string; // 签名
  extendFields?: any; // 扩展字段
  city?: string; // 城市
  lastUpdateTime?: string; // 最后更新时间
  isPassed?: boolean; // 是否通过
  thirdParty?: any; // 第三方
  additionalPicture?: string; // 附加图片
  desc?: string; // 描述
  lastMessageTime?: number; // 最后消息时间
  duplicate?: boolean; // 是否重复

  // 微信群组特有字段（当dataType为'weChatGroup'时使用）
  chatroomId?: string; // 群聊ID
  chatroomOwner?: string; // 群主
  chatroomAvatar?: string; // 群头像
  notice?: string; // 群公告
  selfDisplyName?: string; // 自己在群里的显示名称

  [key: string]: any; // 兼容其他字段
}

//联系人标签分组
export interface ContactGroupByLabel {
  id: number;
  accountId?: number;
  groupName: string;
  tenantId?: number;
  count: number;
  [key: string]: any;
}
//终端用户数据接口
export interface KfUserListData {
  id: number;
  tenantId: number;
  wechatId: string;
  nickname: string;
  alias: string;
  avatar: string;
  gender: number;
  region: string;
  signature: string;
  bindQQ: string;
  bindEmail: string;
  bindMobile: string;
  createTime: string;
  currentDeviceId: number;
  isDeleted: boolean;
  deleteTime: string;
  groupId: number;
  memo: string;
  wechatVersion: string;
  labels: string[];
  lastUpdateTime: string;
  isOnline?: boolean;
  [key: string]: any;
}

// 账户信息接口
export interface CkAccount {
  id: number;
  realName: string;
  nickname: string | null;
  memo: string | null;
  avatar: string;
  userName: string;
  secret: string;
  accountType: number;
  departmentId: number;
  useGoogleSecretKey: boolean;
  hasVerifyGoogleSecret: boolean;
}

//群聊数据接口
export interface weChatGroup {
  id?: number;
  wechatAccountId: number;
  tenantId: number;
  accountId: number;
  chatroomId: string;
  chatroomOwner: string;
  conRemark: string;
  nickname: string;
  chatroomAvatar: string;
  groupId: number;
  aiType?: number; // AI类型（0=普通，1=AI辅助）
  config?: {
    top?: false;
    chat?: boolean;
    unreadCount: number;
  };
  labels?: string[];
  notice: string;
  selfDisplyName: string;
  wechatChatroomId: number;
  serverId?: number;
  [key: string]: any;
}

// 联系人数据接口
export interface ContractData {
  id?: number;
  serverId?: number;
  wechatAccountId: number;
  wechatId: string;
  alias: string;
  conRemark: string;
  nickname: string;
  quanPin: string;
  avatar?: string;
  gender: number;
  region: string;
  addFrom: number;
  phone: string;
  labels: string[];
  signature: string;
  accountId: number;
  extendFields?: Record<string, any> | null;
  city?: string;
  lastUpdateTime: string;
  isPassed: boolean;
  tenantId: number;
  groupId: number;
  aiType?: number; // AI类型（0=普通，1=AI辅助）
  thirdParty: null;
  additionalPicture: string;
  desc: string;
  config?: {
    chat?: boolean;
    unreadCount: number;
  };
  lastMessageTime: number;
  duplicate: boolean;
  [key: string]: any;
}

//聊天记录接口
export interface ChatRecord {
  id: number;
  wechatFriendId: number;
  wechatAccountId: number;
  tenantId: number;
  accountId: number;
  synergyAccountId: number;
  content: string;
  msgType: number;
  msgSubType: number;
  msgSvrId: string;
  isSend: boolean;
  createTime: string;
  isDeleted: boolean;
  deleteTime: string;
  sendStatus: number;
  wechatTime: number;
  origin: number;
  msgId: number;
  recalled: boolean;
  sender?: {
    chatroomNickname: string;
    isAdmin: boolean;
    isDeleted: boolean;
    nickname: string;
    ownerWechatId: string;
    wechatId: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * 微信好友基本信息接口
 * 包含主要字段和兼容性字段
 */
export interface WechatFriend {
  // 主要字段
  id: number; // 好友ID
  wechatAccountId: number; // 微信账号ID
  wechatId: string; // 微信ID
  nickname: string; // 昵称
  conRemark: string; // 备注名
  avatar: string; // 头像URL
  gender: number; // 性别：1-男，2-女，0-未知
  region: string; // 地区
  phone: string; // 电话
  labels: string[]; // 标签列表
  [key: string]: any;
}

// 消息类型枚举
export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  VOICE = "voice",
  VIDEO = "video",
  FILE = "file",
  LOCATION = "location",
}

// 消息数据接口
export interface MessageData {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: MessageType;
  timestamp: string;
  isRead: boolean;
  replyTo?: string;
  forwardFrom?: string;
}

// 聊天会话类型
export type ChatType = "private" | "group";

// 聊天会话接口
export interface ChatSession {
  id: string;
  type: ChatType;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastTime: string;
  config: {
    unreadCount: number;
  };
  online: boolean;
  members?: string[];
  pinned?: boolean;
  muted?: boolean;
}

// 聊天历史响应接口
export interface ChatHistoryResponse {
  messages: MessageData[];
  hasMore: boolean;
  total: number;
}

// 发送消息请求接口
export interface SendMessageRequest {
  chatId: string;
  content: string;
  type: MessageType;
  replyTo?: string;
}

// 搜索联系人请求接口
export interface SearchContactRequest {
  keyword: string;
  limit?: number;
}

// 在线状态接口
export interface OnlineStatus {
  userId: string;
  online: boolean;
  lastSeen: string;
}

// 消息状态接口
export interface MessageStatus {
  messageId: string;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  timestamp: string;
}

// 文件上传响应接口
export interface FileUploadResponse {
  url: string;
  filename: string;
  size: number;
  type: string;
}

// 表情包接口
export interface EmojiData {
  id: string;
  name: string;
  url: string;
  category: string;
}

// 快捷回复接口
export interface QuickReply {
  id: string;
  content: string;
  category: string;
  useCount: number;
}

// 聊天设置接口
export interface ChatSettings {
  autoReply: boolean;
  autoReplyMessage: string;
  notification: boolean;
  sound: boolean;
  theme: "light" | "dark";
  fontSize: "small" | "medium" | "large";
}
