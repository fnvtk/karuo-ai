// 素材数据类型定义
export interface ContentItem {
  id: number;
  libraryId: number;
  type: string;
  contentType: number; // 0=未知, 1=图片, 2=链接, 3=视频, 4=文本, 5=小程序, 6=图文
  title: string;
  content: string;
  contentAi?: string | null;
  contentData?: string | null;
  snsId?: string | null;
  msgId?: string | null;
  wechatId?: string | null;
  friendId?: string | null;
  createMomentTime: number;
  createTime: string;
  updateTime: string;
  coverImage: string;
  resUrls: string[];
  urls: { desc: string; image: string; url: string }[];
  location?: string | null;
  lat: string;
  lng: string;
  status: number;
  isDel: number;
  delTime: number;
  wechatChatroomId?: string | null;
  senderNickname: string;
  senderAvatar?: string | null;
  createMessageTime?: string | null;
  comment: string;
  sendTime: number;
  sendTimes: number;
  contentTypeName: string;
}

// 内容库类型
export interface ContentLibrary {
  id: string;
  name: string;
  sourceType: number; // 1=微信好友, 2=聊天群
  creatorName?: string;
  updateTime: string;
  status: number; // 0=未启用, 1=已启用
  itemCount?: number;
  createTime: string;
  sourceFriends?: string[];
  sourceGroups?: string[];
  keywordInclude?: string[];
  keywordExclude?: string[];
  aiPrompt?: string;
  timeEnabled?: number;
  timeStart?: string;
  timeEnd?: string;
  selectedFriends?: any[];
  selectedGroups?: any[];
  selectedGroupMembers?: WechatGroupMember[];
}

// 微信群成员
export interface WechatGroupMember {
  id: string;
  nickname: string;
  wechatId: string;
  avatar: string;
  gender?: "male" | "female";
  role?: "owner" | "admin" | "member";
  joinTime?: string;
}

// API 响应类型
export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

export interface ItemListResponse {
  list: ContentItem[];
  total: number;
}

// 获取素材列表参数
export interface GetContentItemListParams {
  libraryId: string;
  page?: number;
  limit?: number;
  keyword?: string;
}

// 创建素材参数
export interface CreateContentItemParams {
  libraryId: string;
  title: string;
  content: string;
  contentType: number;
  resUrls?: string[];
  urls?: (string | { desc?: string; image?: string; url: string })[];
  comment?: string;
  sendTime?: string;
}

// 更新素材参数
export interface UpdateContentItemParams
  extends Partial<CreateContentItemParams> {
  id: string;
}

// AI改写参数
export interface AIRewriteParams {
  id: string;
  aiPrompt: string;
}

// 替换内容参数
export interface ReplaceContentParams {
  id: string;
  content: string;
}
