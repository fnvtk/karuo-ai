import request from "@/api/request";
import request2 from "@/api/request2";
//群、好友聊天记录列表
export function getMessageList(params: { page: number; limit: number }) {
  return request("/v1/kefu/message/list", params, "GET");
}

// 获取联系人列表
export const getContactList = (params: { prevId: string; count: number }) => {
  return request("/api/wechatFriend/list", params, "GET");
};

export interface dataProcessingPost {
  /**
   * CmdModifyFriendLabel专属
   */
  "labels[]"?: string[];
  /**
   * CmdModifyFriendLabel专属
   */
  newRemark?: string;
  /**
   * 类型 CmdModifyFriendRemark修改备注 CmdModifyFriendLabel好友修改标签
   */
  type?: string;
  /**
   * 公共
   */
  wechatAccountId?: number;
  wechatFriendId?: number;
  [property: string]: any;
}

export const dataProcessing = (params: dataProcessingPost) => {
  return request("/v1/kefu/dataProcessing", params, "POST");
};

export const getWechatFriendDetail = (params: { id: number }) => {
  return request("/v1/kefu/wechatFriend/detail", params, "GET");
};

export const getWechatChatroomDetail = (params: { id: number }) => {
  return request("/v1/kefu/wechatChatroom/detail", params, "GET");
};
//更新配置
export function updateConfig(params) {
  return request2("/api/WechatFriend/updateConfig", params, "PUT");
}
