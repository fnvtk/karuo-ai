import request from "@/api/request";

// 获取流量包用户列表
export function fetchTrafficPoolList(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  packageId?: string;
}) {
  return request("/v1/traffic/pool/user-list", params, "GET");
}
