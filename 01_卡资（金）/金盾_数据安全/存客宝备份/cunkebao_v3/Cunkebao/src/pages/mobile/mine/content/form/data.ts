// 内容库表单数据类型定义
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

// 创建内容库参数
export interface CreateContentLibraryParams {
  name: string;
  sourceType: number;
  sourceFriends?: string[];
  sourceGroups?: string[];
  keywordInclude?: string[];
  keywordExclude?: string[];
  aiPrompt?: string;
  timeEnabled?: number;
  timeStart?: string;
  timeEnd?: string;
}

// 更新内容库参数
export interface UpdateContentLibraryParams
  extends Partial<CreateContentLibraryParams> {
  id: string;
  status?: number;
}
