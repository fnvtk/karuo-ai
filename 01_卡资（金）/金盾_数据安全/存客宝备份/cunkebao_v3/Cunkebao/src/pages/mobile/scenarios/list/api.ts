import request from "@/api/request";

// 获取场景列表
export function getScenarios(params: any) {
  return request("/v1/plan/scenes", params, "GET");
}

// 获取场景详情
export function getScenarioDetail(id: string) {
  return request(`/v1/scenarios/${id}`, {}, "GET");
}

// 创建场景
export function createScenario(data: any) {
  return request("/v1/scenarios", data, "POST");
}

// 更新场景
export function updateScenario(id: string, data: any) {
  return request(`/v1/scenarios/${id}`, data, "PUT");
}

// 删除场景
export function deleteScenario(id: string) {
  return request(`/v1/scenarios/${id}`, {}, "DELETE");
}
