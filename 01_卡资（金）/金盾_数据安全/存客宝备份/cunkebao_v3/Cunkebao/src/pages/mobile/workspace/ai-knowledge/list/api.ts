import request from "@/api/request";
import type {
  KnowledgeBaseListResponse,
  KnowledgeBaseFormData,
  GlobalPromptConfig,
} from "./data";

// 获取知识库列表
export function updateTypeStatus(params: { id: number; status: number }) {
  return request("/v1/knowledge/updateTypeStatus", params, "PUT");
}

// 初始化AI功能
export function initAIKnowledge(): Promise<any> {
  return request("/v1/knowledge/init", {}, "GET");
}

// 发布并应用AI工具
export function releaseAIKnowledge(id: number): Promise<any> {
  return request("/v1/knowledge/release", { id }, "GET");
}

// 获取知识库类型列表
export function fetchKnowledgeBaseList(params: {
  page?: number;
  limit?: number;
  keyword?: string;
}): Promise<KnowledgeBaseListResponse> {
  return request("/v1/knowledge/typeList", params, "GET");
}

// 创建知识库类型
export function createKnowledgeBase(data: KnowledgeBaseFormData): Promise<any> {
  return request(
    "/v1/knowledge/addType",
    {
      name: data.name,
      description: data.description || "",
      label: data.tags || [],
      prompt: data.useIndependentPrompt ? data.independentPrompt || "" : "",
    },
    "POST",
  );
}

// 更新知识库类型
export function updateKnowledgeBase(data: KnowledgeBaseFormData): Promise<any> {
  return request(
    "/v1/knowledge/editType",
    {
      id: data.id,
      name: data.name,
      description: data.description || "",
      label: data.tags || [],
      prompt: data.useIndependentPrompt ? data.independentPrompt || "" : "",
    },
    "POST",
  );
}

// 删除知识库类型
export function deleteKnowledgeBase(id: number): Promise<any> {
  return request("/v1/knowledge/deleteType", { id }, "DELETE");
}

// 初始化统一提示词配置
export function initGlobalPrompt(): Promise<any> {
  return request("/v1/knowledge/init", undefined, "GET");
}

interface SaveGlobalPromptData {
  promptInfo: string;
}
interface PromptResponse {
  id: number;
  companyId: number;
  userId: number;
  config: {
    name: string;
    model_id: string;
    prompt_info: string;
  };
  createTime: string;
  updateTime: string;
  isRelease: number;
  releaseTime: number;
  botId: string;
  datasetId: string;
}
// 保存统一提示词配置
export function saveGlobalPrompt(
  data: SaveGlobalPromptData,
): Promise<PromptResponse> {
  return request("/v1/knowledge/savePrompt", data, "POST");
}
