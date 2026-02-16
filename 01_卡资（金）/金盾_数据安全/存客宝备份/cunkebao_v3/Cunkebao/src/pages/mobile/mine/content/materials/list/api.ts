import request from "@/api/request";
import {
  GetContentItemListParams,
  CreateContentItemParams,
  UpdateContentItemParams,
  AIRewriteParams,
  ReplaceContentParams,
} from "./data";

// 获取素材列表
export function getContentItemList(params: GetContentItemListParams) {
  return request("/v1/content/library/item-list", params, "GET");
}

// 获取素材详情
export function getContentItemDetail(id: string) {
  return request("/v1/content/item/detail", { id }, "GET");
}

// 创建素材
export function createContentItem(params: CreateContentItemParams) {
  return request("/v1/content/item/create", params, "POST");
}

// 更新素材
export function updateContentItem(params: UpdateContentItemParams) {
  const { id, ...data } = params;
  return request(`/v1/content/item/update`, { id, ...data }, "POST");
}

// 删除素材
export function deleteContentItem(id: string) {
  return request("/v1/content/library/delete-item", { id }, "DELETE");
}

// 获取内容库详情
export function getContentLibraryDetail(id: string) {
  return request("/v1/content/library/detail", { id }, "GET");
}

// AI改写内容
export function aiRewriteContent(params: AIRewriteParams) {
  return request("/v1/content/library/aiEditContent", params, "GET");
}

// 替换原内容
export function replaceContent(params: ReplaceContentParams) {
  return request("/v1/content/library/aiEditContent", params, "POST");
}

// 导入Excel素材
export function importMaterialsFromExcel(params: {
  id: string;
  fileUrl: string;
}) {
  return request("/v1/content/library/import-excel", params, "POST");
}
