import request from "@/api/request";
import {
  ContentLibrary,
  CreateContentLibraryParams,
  UpdateContentLibraryParams,
} from "./data";

// 获取内容库列表
export function getContentLibraryList(params: {
  page?: number;
  limit?: number;
  keyword?: string;
  sourceType?: number;
}): Promise<any> {
  return request("/v1/content/library/list", { ...params, formType: 0 }, "GET");
}

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

// 删除内容库
export function deleteContentLibrary(id: string): Promise<any> {
  return request("/v1/content/library/delete", { id }, "DELETE");
}

// 切换内容库状态
export function toggleContentLibraryStatus(
  id: string,
  status: number,
): Promise<any> {
  return request("/v1/content/library/update-status", { id, status }, "POST");
}
