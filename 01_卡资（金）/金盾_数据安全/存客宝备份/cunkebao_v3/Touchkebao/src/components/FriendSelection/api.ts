import request from "@/api/request";

// 获取好友列表
export function getFriendList(params: {
  page: number;
  limit: number;
  deviceIds?: string; // 逗号分隔
  keyword?: string;
}) {
  return request("/v1/friend", params, "GET");
}
