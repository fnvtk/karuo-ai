import request from "@/api/request";
import { GroupPushTask } from "../detail/groupPush";

interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export async function fetchGroupPushTasks() {
  return request("/v1/workbench/list", { type: 3 }, "GET");
}

export async function deleteGroupPushTask(id: string): Promise<ApiResponse> {
  return request("/v1/workbench/delete", { id }, "DELETE");
}

// 切换任务状态
export function toggleGroupPushTask(data): Promise<any> {
  return request("/v1/workbench/update-status", { ...data, type: 3 }, "POST");
}

export async function copyGroupPushTask(id: string): Promise<ApiResponse> {
  return request("/v1/workbench/copy", { id }, "POST");
}

export async function createGroupPushTask(
  taskData: Partial<GroupPushTask>,
): Promise<ApiResponse> {
  return request("/v1/workspace/group-push/tasks", taskData, "POST");
}

export async function updateGroupPushTask(
  id: string,
  taskData: Partial<GroupPushTask>,
): Promise<ApiResponse> {
  return request(`/v1/workspace/group-push/tasks/${id}`, taskData, "PUT");
}

export async function getGroupPushTaskDetail(
  id: string,
): Promise<GroupPushTask> {
  return request(`/v1/workspace/group-push/tasks/${id}`);
}
