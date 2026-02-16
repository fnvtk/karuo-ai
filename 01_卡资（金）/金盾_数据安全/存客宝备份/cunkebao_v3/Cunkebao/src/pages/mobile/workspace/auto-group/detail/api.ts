import request from "@/api/request";

// 获取自动建群任务详情
export function getAutoGroupDetail(id: string) {
  return request(`/api/auto-group/detail/${id}`);
}
