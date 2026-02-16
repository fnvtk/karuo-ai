import request from "@/api/request";

// 获取素材详情
export function getContentItemDetail(id: string) {
  return request("/v1/content/library/get-item-detail", { id }, "GET");
}

// 创建素材
export function createContentItem(params: any) {
  return request("/v1/content/library/create-item", params, "POST");
}

// 更新素材
export function updateContentItem(params: any) {
  return request(`/v1/content/library/update-item`, params, "POST");
}
// 获取内容库详情
export function getContentLibraryDetail(id: string) {
  return request("/v1/content/library/detail", { id }, "GET");
}
