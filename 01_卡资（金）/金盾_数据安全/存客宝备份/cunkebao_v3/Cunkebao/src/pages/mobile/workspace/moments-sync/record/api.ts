import request from "@/api/request";
import {
  LikeTask,
  CreateLikeTaskData,
  UpdateLikeTaskData,
  LikeRecord,
  PaginatedResponse,
} from "@/pages/workspace/auto-like/record/data";

// 获取自动点赞任务列表
export function fetchAutoLikeTasks(
  params = { type: 1, page: 1, limit: 100 },
): Promise<LikeTask[]> {
  return request("/v1/workbench/list", params, "GET");
}

// 获取单个任务详情
export function fetchAutoLikeTaskDetail(id: string): Promise<LikeTask | null> {
  return request("/v1/workbench/detail", { id }, "GET");
}

// 创建自动点赞任务
export function createAutoLikeTask(data: CreateLikeTaskData): Promise<any> {
  return request("/v1/workbench/create", { ...data, type: 1 }, "POST");
}

// 更新自动点赞任务
export function updateAutoLikeTask(data: UpdateLikeTaskData): Promise<any> {
  return request("/v1/workbench/update", { ...data, type: 1 }, "POST");
}

// 删除自动点赞任务
export function deleteAutoLikeTask(id: string): Promise<any> {
  return request("/v1/workbench/delete", { id }, "DELETE");
}

// 切换任务状态
export function toggleAutoLikeTask(id: string, status: string): Promise<any> {
  return request("/v1/workbench/update-status", { id, status }, "POST");
}

// 复制自动点赞任务
export function copyAutoLikeTask(id: string): Promise<any> {
  return request("/v1/workbench/copy", { id }, "POST");
}

// 获取点赞记录
export function fetchLikeRecords(
  workbenchId: string,
  page: number = 1,
  limit: number = 20,
  keyword?: string,
): Promise<PaginatedResponse<LikeRecord>> {
  const params: any = {
    workbenchId,
    page: page.toString(),
    limit: limit.toString(),
  };
  if (keyword) {
    params.keyword = keyword;
  }
  return request("/v1/workbench/moments-records", params, "GET");
}
