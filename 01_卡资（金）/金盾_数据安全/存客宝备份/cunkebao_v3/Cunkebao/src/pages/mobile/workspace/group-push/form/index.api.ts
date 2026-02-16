import request from "@/api/request";

// 创建群发工作台
export function createGroupPushTask(data: any) {
  return request("/v1/workbench/create", data, "POST");
}

// 更新群发工作台
export function updateGroupPushTask(data: any) {
  return request("/v1/workbench/update", data, "POST");
}

// 获取群发工作台详情
export function fetchGroupPushTaskDetail(id: string) {
  return request("/v1/workbench/detail", { id }, "GET");
}
// 获取京东社交媒体列表
export const fetchSocialMediaList = async () => {
  return request("/v1/workbench/getJdSocialMedia", {}, "GET");
};

// 获取京东推广站点列表
export const fetchPromotionSiteList = async (id: number) => {
  return request("/v1/workbench/getJdPromotionSite", { id }, "GET");
};
