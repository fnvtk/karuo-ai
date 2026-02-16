import request from "@/api/request";
import type {
  KnowledgeBaseDetailResponse,
  MaterialListResponse,
  CallerListResponse,
} from "./data";

// 获取知识库类型详情（复用列表接口）
export function getKnowledgeBaseDetail(
  id: number,
): Promise<KnowledgeBaseDetailResponse> {
  // 接口文档中没有单独的详情接口，通过列表接口获取
  return request("/v1/knowledge/typeList", { page: 1, limit: 100 }, "GET").then(
    (res: any) => {
      const item = res.data?.find((item: any) => item.id === id);
      if (!item) {
        throw new Error("知识库不存在");
      }
      // 转换数据格式
      return {
        ...item,
        tags: item.label || [],
        useIndependentPrompt: !!item.prompt,
        independentPrompt: item.prompt || "",
        materials: [], // 需要单独获取
        callers: [], // 暂无接口
      };
    },
  );
}

// 获取知识库素材列表（对应接口的 knowledge/getList）
export function getMaterialList(params: {
  knowledgeBaseId: number;
  page?: number;
  limit?: number;
  name?: string;
  label?: string[];
}): Promise<MaterialListResponse> {
  return request(
    "/v1/knowledge/getList",
    {
      typeId: params.knowledgeBaseId,
      name: params.name,
      label: params.label,
      page: params.page || 1,
      limit: params.limit || 20,
    },
    "GET",
  ).then((res: any) => ({
    list: res.data || [],
    total: res.total || 0,
  }));
}

// 添加素材
export function uploadMaterial(data: {
  typeId: number;
  name: string;
  label: string[];
  fileUrl: string;
}): Promise<any> {
  return request("/v1/knowledge/add", data, "POST");
}

// 删除素材
export function deleteMaterial(id: number): Promise<any> {
  return request("/v1/knowledge/delete", { id }, "DELETE");
}

// 获取调用者列表（接口未提供）
export function getCallerList(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params: {
    knowledgeBaseId: number;
    page?: number;
    limit?: number;
  },
): Promise<CallerListResponse> {
  // 注意：实际接口未提供，需要后端补充
  console.warn("getCallerList 接口未提供");
  return Promise.resolve({
    list: [],
    total: 0,
  });
}

// 更新知识库配置（使用编辑接口）
export function updateKnowledgeBaseConfig(data: {
  id: number;
  name?: string;
  description?: string;
  label?: string[];
  aiCallEnabled?: boolean;
  useIndependentPrompt?: boolean;
  independentPrompt?: string;
}): Promise<any> {
  return request(
    "/v1/knowledge/editType",
    {
      id: data.id,
      name: data.name || "",
      description: data.description || "",
      label: data.label || [],
      prompt: data.useIndependentPrompt ? data.independentPrompt || "" : "",
    },
    "POST",
  );
}
