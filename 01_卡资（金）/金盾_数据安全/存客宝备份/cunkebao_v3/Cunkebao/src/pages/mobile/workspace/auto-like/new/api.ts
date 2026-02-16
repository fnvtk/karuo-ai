import request from "@/api/request";
import {
  CreateLikeTaskData,
  UpdateLikeTaskData,
  LikeTask,
} from "@/pages/workspace/auto-like/record/data";

// 获取自动点赞任务详情
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
