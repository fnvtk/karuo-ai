import request from "@/api/request";

// 创建自动建群任务
export const createGroupCreate = (params: any) =>
  request("/v1/workbench/create", params, "POST");

// 更新自动建群任务
export const updateGroupCreate = (params: any) =>
  request("/v1/workbench/update", params, "POST");

// 获取自动建群任务详情
export const getGroupCreateDetail = (id: string) =>
  request("/v1/workbench/detail", { id }, "GET");

// 获取自动建群任务列表
export const getGroupCreateList = (params: any) =>
  request("/v1/workbench/list", params, "GET");

// 删除自动建群任务
export const deleteGroupCreate = (id: string) =>
  request("/v1/workbench/delete", { id }, "DELETE");

// 切换任务状态
export const toggleGroupCreateStatus = (data: { id: string | number; status: number }) =>
  request("/v1/workbench/update-status", { ...data }, "POST");

// 获取群列表
export const getCreatedGroupsList = (params: {
  workbenchId: string;
  page?: number;
  limit?: number;
  keyword?: string;
}) => {
  // 如果没有指定 limit，默认使用 20
  const finalParams = {
    ...params,
    limit: params.limit ?? 20,
  };
  return request("/v1/workbench/created-groups-list", finalParams, "GET");
};

// 获取群详情
export const getCreatedGroupDetail = (params: {
  workbenchId: string;
  groupId: string;
}) => {
  return request("/v1/workbench/created-group-detail", params, "GET");
};

// 同步群信息
export const syncGroupInfo = (params: {
  workbenchId: string;
  groupId: string;
}) => {
  return request("/v1/workbench/sync-group-info", params, "POST");
};

// 修改群名称/群公告
export const modifyGroupInfo = (params: {
  workbenchId: string;
  groupId: string;
  chatroomName?: string;
  announce?: string;
}) => {
  return request("/v1/workbench/modify-group-info", params, "POST");
};

// 退出群组
export const quitGroup = (params: {
  workbenchId: string;
  groupId: string;
}) => {
  return request("/v1/workbench/quit-group", params, "POST");
};
