import request from "@/api/request";
// 获取场景类型列表
export function getScenarioTypes() {
  return request("/v1/plan/scenes", undefined, "GET");
}

// 创建计划
export function createPlan(data: any) {
  return request("/v1/plan/create", data, "POST");
}

// 更新计划
export function updatePlan(data: any) {
  return request("/v1/plan/update", data, "PUT");
}

// 获取计划详情
export function getPlanDetail(planId: string) {
  return request(`/v1/plan/detail?planId=${planId}`, undefined, "GET");
}
