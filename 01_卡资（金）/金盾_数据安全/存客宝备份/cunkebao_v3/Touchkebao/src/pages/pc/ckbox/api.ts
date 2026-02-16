import request from "@/api/request";
import request2 from "@/api/request2";
import {
  MessageData,
  ChatHistoryResponse,
  MessageType,
  OnlineStatus,
  MessageStatus,
  FileUploadResponse,
  EmojiData,
  QuickReply,
  ChatSettings,
} from "./data";

//获取好友接待配置
export function getFriendInjectConfig(params) {
  return request("/v1/kefu/ai/friend/get", params, "GET");
}
//读取聊天信息

export function WechatGroup(params) {
  return request2("/api/WechatGroup/list", params, "GET");
}

//获取聊天记录-1 清除未读
export function clearUnreadCount1(params) {
  return request("/v1/kefu/message/readMessage", params, "GET");
}
export function clearUnreadCount2(params) {
  return request2("/api/WechatFriend/clearUnreadCount", params, "PUT");
}

//更新配置
export function updateConfig(params) {
  return request2("/api/WechatFriend/updateConfig", params, "PUT");
}
//获取聊天记录-2 获取列表
export interface messreocrParams {
  From?: number | string;
  To?: number | string;
  /**
   * 当前页码，从 1 开始
   */
  page?: number;
  /**
   * 每页条数
   */
  limit?: number;
  /**
   * 群id
   */
  wechatChatroomId?: number | string;
  /**
   * 好友id
   */
  wechatFriendId?: number | string;
  /**
   * 微信账号ID
   */
  wechatAccountId?: number | string;
  /**
   * 关键词、类型等扩展参数
   */
  [property: string]: any;
}
export function getChatMessages(params: messreocrParams) {
  // 禁用防抖，因为聊天消息详情接口需要频繁请求
  return request("/v1/kefu/message/details", params, "GET", {
    debounce: false,
  });
}
export function getChatroomMessages(params: messreocrParams) {
  // 禁用防抖，因为聊天消息详情接口需要频繁请求
  return request("/v1/kefu/message/details", params, "GET", {
    debounce: false,
  });
}
//=====================旧==============================

// export function getChatMessages(params: {
//   wechatAccountId: number;
//   wechatFriendId?: number;
//   wechatChatroomId?: number;
//   From: number;
//   To: number;
//   Count: number;
//   olderData: boolean;
// }) {
//   return request2("/api/FriendMessage/SearchMessage", params, "GET");
// }
// export function getChatroomMessages(params: {
//   wechatAccountId: number;
//   wechatFriendId?: number;
//   wechatChatroomId?: number;
//   From: number;
//   To: number;
//   Count: number;
//   olderData: boolean;
// }) {
//   return request2("/api/ChatroomMessage/SearchMessage", params, "GET");
// }

//获取群列表
export function getGroupList(params: { prevId: number; count: number }) {
  return request2(
    "/api/wechatChatroom/listExcludeMembersByPage?",
    params,
    "GET",
  );
}

//获取群成员
export function getGroupMembers(params: { id: number }) {
  return request2(
    "/api/WechatChatroom/listMembersByWechatChatroomId",
    params,
    "GET",
  );
}

//触客宝登陆
export function loginWithToken(params: any) {
  return request2(
    "/token",
    params,
    "POST",
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
    1000,
  );
}

// 获取触客宝用户信息
export function getChuKeBaoUserInfo() {
  return request2("/api/account/self", {}, "GET");
}

// 获取联系人列表
export const getContactList = (params: { prevId: number; count: number }) => {
  return request2("/api/wechatFriend/list", params, "GET");
};

//获取控制终端列表
export const getControlTerminalList = params => {
  return request2("/api/wechataccount", params, "GET");
};

// 获取聊天历史
export const getChatHistory = (
  chatId: string,
  page: number = 1,
  pageSize: number = 50,
): Promise<ChatHistoryResponse> => {
  return request2(`/v1/chats/${chatId}/messages`, { page, pageSize }, "GET");
};

// 发送消息
export const sendMessage = (
  chatId: string,
  content: string,
  type: MessageType = MessageType.TEXT,
): Promise<MessageData> => {
  return request2(`/v1/chats/${chatId}/messages`, { content, type }, "POST");
};

// 发送文件消息
export const sendFileMessage = (
  chatId: string,
  file: File,
  type: MessageType,
): Promise<MessageData> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);
  return request2(`/v1/chats/${chatId}/messages/file`, formData, "POST");
};

// 标记消息为已读
export const markMessageAsRead = (messageId: string): Promise<void> => {
  return request2(`/v1/messages/${messageId}/read`, {}, "PUT");
};

// 标记聊天为已读
export const markChatAsRead = (chatId: string): Promise<void> => {
  return request2(`/v1/chats/${chatId}/read`, {}, "PUT");
};

// 添加群组成员
export const addGroupMembers = (
  groupId: string,
  memberIds: string[],
): Promise<void> => {
  return request2(`/v1/groups/${groupId}/members`, { memberIds }, "POST");
};

// 移除群组成员
export const removeGroupMembers = (
  groupId: string,
  memberIds: string[],
): Promise<void> => {
  return request2(`/v1/groups/${groupId}/members`, { memberIds }, "DELETE");
};

// 获取在线状态
export const getOnlineStatus = (userId: string): Promise<OnlineStatus> => {
  return request2(`/v1/users/${userId}/status`, {}, "GET");
};

// 获取消息状态
export const getMessageStatus = (messageId: string): Promise<MessageStatus> => {
  return request2(`/v1/messages/${messageId}/status`, {}, "GET");
};

// 上传文件
export const uploadFile = (file: File): Promise<FileUploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  return request2("/v1/upload", formData, "POST");
};

// 获取表情包列表
export const getEmojiList = (): Promise<EmojiData[]> => {
  return request2("/v1/emojis", {}, "GET");
};

// 获取快捷回复列表
export const getQuickReplies = (): Promise<QuickReply[]> => {
  return request2("/v1/quick-replies", {}, "GET");
};

// 添加快捷回复
export const addQuickReply = (data: {
  content: string;
  category: string;
}): Promise<QuickReply> => {
  return request2("/v1/quick-replies", data, "POST");
};

// 删除快捷回复
export const deleteQuickReply = (id: string): Promise<void> => {
  return request2(`/v1/quick-replies/${id}`, {}, "DELETE");
};

// 获取聊天设置
export const getChatSettings = (): Promise<ChatSettings> => {
  return request2("/v1/chat/settings", {}, "GET");
};

// 更新聊天设置
export const updateChatSettings = (
  settings: Partial<ChatSettings>,
): Promise<ChatSettings> => {
  return request2("/v1/chat/settings", settings, "PUT");
};

// 删除聊天会话
export const deleteChatSession = (chatId: string): Promise<void> => {
  return request2(`/v1/chats/${chatId}`, {}, "DELETE");
};

// 静音聊天会话
export const muteChatSession = (chatId: string): Promise<void> => {
  return request2(`/v1/chats/${chatId}/mute`, {}, "PUT");
};

// 取消静音聊天会话
export const unmuteChatSession = (chatId: string): Promise<void> => {
  return request2(`/v1/chats/${chatId}/unmute`, {}, "PUT");
};

// 转发消息
export const forwardMessage = (
  messageId: string,
  targetChatIds: string[],
): Promise<void> => {
  return request2("/v1/messages/forward", { messageId, targetChatIds }, "POST");
};

// 撤回消息
export const recallMessage = (messageId: string): Promise<void> => {
  return request2(`/v1/messages/${messageId}/recall`, {}, "PUT");
};
