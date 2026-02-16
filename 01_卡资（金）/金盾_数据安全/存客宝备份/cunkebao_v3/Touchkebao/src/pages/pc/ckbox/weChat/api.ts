import request2 from "@/api/request2";
import request from "@/api/request";
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
//流量池

//好友接待配置
export function setFriendInjectConfig(params) {
  return request("/v1/kefu/ai/friend/set", params, "POST");
}

export function getTrafficPoolList() {
  return request(
    "/v1/traffic/pool/getPackage",
    {
      page: 1,
      limit: 9999,
    },
    "GET",
  );
}
type ListRequestOptions = {
  debounceGap?: number;
};

// 好友列表
export function getContactList(params, options?: ListRequestOptions) {
  return request(
    "/v1/kefu/wechatFriend/list",
    params,
    "GET",
    undefined,
    options?.debounceGap,
  );
}

// 群列表
export function getGroupList(params, options?: ListRequestOptions) {
  return request(
    "/v1/kefu/wechatChatroom/list",
    params,
    "GET",
    undefined,
    options?.debounceGap,
  );
}
// 分组列表
export function getLabelsListByGroup(params) {
  return request("/v1/kefu/wechatGroup/list", params, "GET");
}

//==============-原接口=================
// 获取联系人列表
// export const getContactList = (params: { prevId: number; count: number }) => {
//   return request2("/api/wechatFriend/list", params, "GET");
// };

// //获取群列表
// export function getGroupList(params: { prevId: number; count: number }) {
//   return request2(
//     "/api/wechatChatroom/listExcludeMembersByPage?",
//     params,
//     "GET",
//   );
// }

//群、好友聊天记录列表
export function getMessageList(params: { page: number; limit: number }) {
  return request("/v1/kefu/message/list", params, "GET");
}

//获取客服列表
export function getCustomerList() {
  return request("/v1/kefu/customerService/list", {}, "GET");
}

//读取聊天信息
function jsonToQueryString(json) {
  const params = new URLSearchParams();
  for (const key in json) {
    if (Object.prototype.hasOwnProperty.call(json, key)) {
      params.append(key, json[key]);
    }
  }
  return params.toString();
}
//转移好友
export function WechatFriendAllot(params: {
  wechatFriendId?: number;
  toAccountId: number;
  notifyReceiver: boolean;
  comment: string;
}) {
  return request2(
    "/api/wechatFriend/allot?" + jsonToQueryString(params),
    undefined,
    "PUT",
  );
}
//转移群
export function WechatChatroomAllot(params: {
  wechatChatroomId?: number;
  toAccountId: number;
  notifyReceiver: boolean;
  comment: string;
}) {
  return request2(
    "/api/wechatChatroom/allot?" + jsonToQueryString(params),
    undefined,
    "PUT",
  );
}

//获取可转移客服列表
export function getTransferableAgentList() {
  return request("/v1/kefu/accounts/list", {}, "GET");
}

// 微信好友列表
export function WechatFriendRebackAllot(params: {
  wechatFriendId?: number;
  wechatChatroomId?: number;
}) {
  return request2(
    "/api/wechatFriend/rebackAllot?" + jsonToQueryString(params),
    undefined,
    "PUT",
  );
}

// 微信群列表
export function WechatGroup(params) {
  return request2("/api/WechatGroup/list", params, "GET");
}

//更新配置
export function updateConfig(params) {
  return request("/api/WechatFriend/updateConfig", params, "PUT");
}
//获取聊天记录-2 获取列表
export function getChatMessages(params: {
  wechatAccountId: number;
  wechatFriendId?: number;
  wechatChatroomId?: number;
  From: number;
  To: number;
  Count: number;
  olderData: boolean;
}) {
  return request("/api/FriendMessage/SearchMessage", params, "GET");
}
export function getChatroomMessages(params: {
  wechatAccountId: number;
  wechatFriendId?: number;
  wechatChatroomId?: number;
  From: number;
  To: number;
  Count: number;
  olderData: boolean;
}) {
  return request2("/api/ChatroomMessage/SearchMessage", params, "GET");
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

// ============== 跟进提醒相关接口 ==============

// 跟进提醒列表
export const getFollowUpList = (params: {
  isProcess?: string;
  isRemind?: string;
  keyword?: string;
  level?: string;
  limit?: string;
  page?: string;
  friendId?: string;
}) => {
  return request("/v1/kefu/followUp/list", params, "GET");
};

// 跟进提醒添加
export const addFollowUp = (params: {
  description?: string;
  friendId: string;
  reminderTime?: string;
  title?: string;
  type?: string; // 0其他 1电话回访 2发送消息 3安排会议 4发送邮件
}) => {
  return request("/v1/kefu/followUp/add", params, "POST");
};

// 跟进提醒处理
export const processFollowUp = (params: { ids?: string }) => {
  return request("/v1/kefu/followUp/process", params, "GET");
};

// ============== 待办事项相关接口 ==============

// 待办事项列表
export const getTodoList = (params: {
  isProcess?: string;
  isRemind?: string;
  keyword?: string;
  level?: string;
  limit?: string;
  page?: string;
  friendId?: string;
}) => {
  return request("/v1/kefu/todo/list", params, "GET");
};

// 待办事项添加
export const addTodo = (params: {
  description?: string;
  friendId: string;
  level?: string; // 0低优先级 1中优先级 2高优先级 3紧急
  reminderTime?: string;
  title?: string;
}) => {
  return request("/v1/kefu/todo/add", params, "POST");
};

// 待办事项处理
export const processTodo = (params: { ids: string }) => {
  return request("/v1/kefu/todo/process", params, "GET");
};
