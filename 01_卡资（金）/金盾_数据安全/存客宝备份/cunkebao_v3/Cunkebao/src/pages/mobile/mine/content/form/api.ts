import request from "@/api/request";
import {
  ContentLibrary,
  CreateContentLibraryParams,
  UpdateContentLibraryParams,
} from "./data";

// 获取内容库详情
export function getContentLibraryDetail(id: string): Promise<any> {
  return request("/v1/content/library/detail", { id }, "GET");
}

// 创建内容库
export function createContentLibrary(
  params: CreateContentLibraryParams,
): Promise<any> {
  return request("/v1/content/library/create", { ...params, formType: 0 }, "POST");
}

// 更新内容库
export function updateContentLibrary(
  params: UpdateContentLibraryParams,
): Promise<any> {
  const { id, ...data } = params;
  return request(`/v1/content/library/update`, { id, ...data }, "POST");
}
