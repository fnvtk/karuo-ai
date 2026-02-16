import request from "@/api/request";

// 获取微信号列表
export function getWechatAccounts(params: {
  page: number;
  page_size: number;
  keyword?: string;
  wechatStatus?: string;
}) {
  return request("v1/wechats", params, "GET");
}

// 获取微信号详情
export function getWechatAccountDetail(id: string) {
  return request("v1/WechatAccount/detail", { id }, "GET");
}

// 获取微信号好友列表
export function getWechatFriends(params: {
  wechatAccountKeyword: string;
  pageIndex: number;
  pageSize: number;
  friendKeyword?: string;
}) {
  return request("v1/WechatFriend/friendlistData", params, "POST");
}

// 获取微信好友详情
export function getWechatFriendDetail(id: string) {
  return request("v1/WechatFriend/detail", { id }, "GET");
}
