import request from "@/api/request";

// 消息列表
export const noticeList = (params: { page: number; limit: number }) => {
  return request(`/v1/kefu/notice/list`, params, "GET");
};

// 消息列表
export const readMessage = (params: { id: number }) => {
  return request(`/v1/kefu/notice/readMessage`, params, "PUT");
};

// 消息列表
export const readAll = () => {
  return request(`/v1/kefu/notice/readAll`, undefined, "PUT");
};

// 好友添加任务列表
export const friendRequestList = (params: { page: number; limit: number }) => {
  return request(`/v1/kefu/wechatFriend/addTaskList`, params, "GET");
};
