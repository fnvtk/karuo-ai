import request from "@/api/request";

// 获取群组列表
export function getGroupList(params: {
  page: number;
  limit: number;
  keyword?: string;
}) {
  return request("/v1/kefu/content/material/list", params, "GET");
}
