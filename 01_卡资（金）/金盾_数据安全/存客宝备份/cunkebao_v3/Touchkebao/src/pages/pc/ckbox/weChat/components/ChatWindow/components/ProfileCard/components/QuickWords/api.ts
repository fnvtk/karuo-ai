import request from "@/api/request";
// 快捷回复项接口
export interface QuickWordsReply {
  id: number;
  groupId: number;
  userId: number;
  title: string;
  msgType: number;
  content: string;
  createTime: string;
  lastUpdateTime: string;
  sortIndex: string;
  updateTime: string | null;
  isDel: number;
  delTime: string | null;
}

// 快捷回复组接口
export interface QuickWordsItem {
  id: number;
  groupName: string;
  sortIndex: string;
  parentId: number;
  replyType: string;
  replys: any | null;
  companyId: number;
  userId: number;
  replies: QuickWordsReply[];
  children: QuickWordsItem[];
}

//好友接待配置
export function setFriendInjectConfig(params: any): Promise<QuickWordsItem[]> {
  return request("/v1/kefu/reply/list", params, "GET");
}

export interface AddReplyRequest {
  id?: string;
  content?: string;
  groupId?: string;
  /**
   * 1文本 3图片 43视频 49链接 等
   */
  msgType?: string[];
  /**
   * 默认50
   */
  sortIndex?: string;
  title?: string;
  [property: string]: any;
}

// 添加快捷回复
export function addReply(params: AddReplyRequest): Promise<any> {
  return request("/v1/kefu/reply/addReply", params, "POST");
}

// 更新快捷回复
export function updateReply(params: AddReplyRequest): Promise<any> {
  return request("/v1/kefu/reply/updateReply", params, "POST");
}

// 删除快捷回复
export function deleteReply(params: { id: string }): Promise<any> {
  return request("/v1/kefu/reply/deleteReply", params, "DELETE");
}

export interface AddGroupRequest {
  id?: string;
  groupName?: string;
  parentId?: string;
  /**
   * 0 公共 1私有 2部门
   */
  replyType?: string[];
  /**
   * 默认50
   */
  sortIndex?: string;
  [property: string]: any;
}

// 添加快捷回复组
export function addGroup(params: AddGroupRequest): Promise<any> {
  return request("/v1/kefu/reply/addGroup", params, "POST");
}

// 更新快捷回复组
export function updateGroup(params: AddGroupRequest): Promise<any> {
  return request("/v1/kefu/reply/updateGroup", params, "POST");
}

// 删除快捷回复组
export function deleteGroup(params: { id: string }): Promise<any> {
  return request("/v1/kefu/reply/deleteGroup", params, "DELETE");
}
