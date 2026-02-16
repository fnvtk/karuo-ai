import request from "@/api/request";

// 获取自动建群任务列表
// 获取朋友圈同步任务列表
export const getAutoGroupList = (params: any) =>
  request("/v1/workbench/list", params, "GET");

// 复制自动建群任务
export function copyAutoGroupTask(id: string): Promise<any> {
  return request("/v1/workbench/copy", { id }, "POST");
}

// 删除自动建群任务
export function deleteAutoGroupTask(id: string): Promise<any> {
  return request("/v1/workbench/delete", { id }, "DELETE");
}
