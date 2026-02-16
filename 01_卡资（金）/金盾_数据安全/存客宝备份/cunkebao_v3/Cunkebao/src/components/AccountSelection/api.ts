import request from "@/api/request";

// 获取好友列表
export function getAccountList(params: {
  page: number;
  limit: number;
  keyword?: string;
}) {
  return request("/v1/workbench/account-list", params, "GET");
}
