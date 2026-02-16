import request from "@/api/request";
import { PlanDetail, PlanListResponse, ApiResponse } from "./data";

// ==================== 计划相关接口 ====================
// 获取计划列表
export function getPlanList(params: {
  sceneId: string;
  page: number;
  limit: number;
}): Promise<PlanListResponse> {
  return request(`/v1/plan/list`, params, "GET");
}

// 获取计划详情
export function getPlanDetail(planId: string): Promise<PlanDetail> {
  return request(`/v1/plan/detail`, { planId }, "GET");
}

// 复制计划
export function copyPlan(planId: string): Promise<ApiResponse<any>> {
  return request(`/v1/plan/copy`, { planId }, "GET");
}

// 删除计划
export function deletePlan(planId: string): Promise<ApiResponse<any>> {
  return request(`/v1/plan/delete`, { planId }, "DELETE");
}

// 获取小程序二维码
export function getWxMinAppCode(planId: string): Promise<ApiResponse<string>> {
  return request(`/v1/plan/getWxMinAppCode`, { taskId: planId }, "GET");
}
//获客列表
export function getUserList(planId: string, type: number) {
  return request(`/v1/plan/getUserList`, { planId, type }, "GET");
}

//获客列表
export function getFriendRequestTaskStats(
  taskId: string,
  params?: { startTime?: string; endTime?: string },
) {
  return request(
    `/v1/dashboard/friendRequestTaskStats`,
    { taskId, ...params },
    "GET",
  );
}
