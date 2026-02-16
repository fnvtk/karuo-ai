import request from "@/api/request";
// 创建内容库参数
export interface CreateContentLibraryParams {
  name: string;
  sourceType: number;
  sourceFriends?: string[];
  sourceGroups?: string[];
  keywordInclude?: string[];
  keywordExclude?: string[];
  aiPrompt?: string;
  timeEnabled?: number;
  timeStart?: string;
  timeEnd?: string;
}

// 创建内容库
export function createContentLibrary(
  params: CreateContentLibraryParams,
): Promise<any> {
  return request("/v1/content/library/create", params, "POST");
}

// 删除内容库
export function deleteContentLibrary(params: { id: number }) {
  return request(`/v1/content/library/update`, params, "DELETE");
}

// 智能话术改写
export function aiEditContent(params: { aiPrompt: string; content: string }) {
  return request(`/v1/content/library/aiEditContent`, params, "GET");
}
