import request from "@/api/request";

// 创建入群欢迎语任务
export function createGroupWelcomeTask(data: any) {
  return request("/v1/workbench/create", data, "POST");
}

// 更新入群欢迎语任务
export function updateGroupWelcomeTask(data: any) {
  return request("/v1/workbench/update", data, "POST");
}

// 获取入群欢迎语任务详情
export function fetchGroupWelcomeTaskDetail(id: string) {
  return request("/v1/workbench/detail", { id }, "GET");
}
