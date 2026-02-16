import request from "@/api/request";

interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

// 获取入群欢迎语任务列表
export async function fetchGroupWelcomeTasks() {
  return request("/v1/workbench/list", { type: 7 }, "GET");
}

// 删除入群欢迎语任务
export async function deleteGroupWelcomeTask(id: string): Promise<ApiResponse> {
  return request("/v1/workbench/delete", { id }, "DELETE");
}

// 切换任务状态
export function toggleGroupWelcomeTask(data: { id: string; status: number }): Promise<any> {
  return request("/v1/workbench/update-status", { ...data, type: 7 }, "POST");
}

// 复制任务
export async function copyGroupWelcomeTask(id: string): Promise<ApiResponse> {
  return request("/v1/workbench/copy", { id }, "POST");
}
