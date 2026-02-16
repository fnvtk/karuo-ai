import request from "@/api/request";

// 创建朋友圈同步任务
export const createMomentsSync = (params: any) =>
  request("/v1/workbench/create", params, "POST");

// 更新朋友圈同步任务
export const updateMomentsSync = (params: any) =>
  request("/v1/workbench/update", params, "POST");

// 获取朋友圈同步任务详情
export const getMomentsSyncDetail = (id: string) =>
  request("/v1/workbench/detail", { id }, "GET");
