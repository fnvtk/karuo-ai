import request from "@/api/request";

export interface GroupPushTask {
  id: string;
  name: string;
  status: number; // 1: 运行中, 2: 已暂停
  deviceCount: number;
  targetGroups: string[];
  pushCount: number;
  successCount: number;
  lastPushTime: string;
  createTime: string;
  creator: string;
  pushInterval: number;
  maxPerDay: number;
  startTime: string; // 允许推送的开始时间
  endTime: string; // 允许推送的结束时间
  messageType: "text" | "image" | "video" | "link";
  messageContent: string;
  targetTags: string[];
  pushMode: "immediate" | "scheduled";
  scheduledTime?: string;
}

interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export async function fetchGroupPushTasks(): Promise<GroupPushTask[]> {
  const response = await request("/v1/workbench/list", { type: 3 }, "GET");
  if (Array.isArray(response)) return response;
  if (response && Array.isArray(response.data)) return response.data;
  return [];
}

export async function deleteGroupPushTask(id: string): Promise<ApiResponse> {
  return request(`/v1/workspace/group-push/tasks/${id}`, {}, "DELETE");
}

export async function toggleGroupPushTask(
  id: string,
  status: string,
): Promise<ApiResponse> {
  return request(
    `/v1/workspace/group-push/tasks/${id}/toggle`,
    { status },
    "POST",
  );
}

export async function copyGroupPushTask(id: string): Promise<ApiResponse> {
  return request(`/v1/workspace/group-push/tasks/${id}/copy`, {}, "POST");
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
