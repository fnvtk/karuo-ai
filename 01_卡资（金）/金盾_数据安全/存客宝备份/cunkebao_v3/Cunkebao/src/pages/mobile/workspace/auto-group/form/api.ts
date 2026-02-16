import request from "@/api/request";

// 创建朋友圈同步任务
export const createAutoGroup = (params: any) =>
  request("/v1/workbench/create", params, "POST");

// 更新朋友圈同步任务
export const updateAutoGroup = (params: any) =>
  request("/v1/workbench/update", params, "POST");

// 获取朋友圈同步任务详情
export const getAutoGroupDetail = (id: string) =>
  request("/v1/workbench/detail", { id }, "GET");

// 获取朋友圈同步任务列表
export const getAutoGroupList = (params: any) =>
  request("/v1/workbench/list", params, "GET");
