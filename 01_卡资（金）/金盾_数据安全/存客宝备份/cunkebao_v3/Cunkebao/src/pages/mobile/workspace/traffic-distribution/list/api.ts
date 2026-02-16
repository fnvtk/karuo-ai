import request from "@/api/request";

// 获取流量分发规则列表
export function fetchDistributionRuleList(params: {
  page?: number;
  limit?: number;
  keyword?: string;
}): Promise<any> {
  return request("/v1/workbench/list?type=5", params, "GET");
}

// 编辑计划（更新）
export function updateDistributionRule(data: any): Promise<any> {
  return request("/v1/workbench/update", { ...data, type: 5 }, "POST");
}

// 暂停/启用计划
export function toggleDistributionRuleStatus(
  id: number,
  status: 0 | 1,
): Promise<any> {
  return request("/v1/workbench/update-status", { id, status }, "POST");
}

// 删除计划
export function deleteDistributionRule(id: number): Promise<any> {
  return request("/v1/workbench/delete", { id }, "DELETE");
}

// 获取流量分发规则详情
export function fetchDistributionRuleDetail(id: number): Promise<any> {
  return request(`/v1/workbench/detail?id=${id}`, {}, "GET");
}

//流量分发记录
export function fetchTransferFriends(params: {
  page?: number;
  limit?: number;
  keyword?: string;
  workbenchId: number;
  isRecycle?: number; // 0=未回收, 1=已回收, undefined=全部
}) {
  return request("/v1/workbench/transfer-friends", params, "GET");
}
