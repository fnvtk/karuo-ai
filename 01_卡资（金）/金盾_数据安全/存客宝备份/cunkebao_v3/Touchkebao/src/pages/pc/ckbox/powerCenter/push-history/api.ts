import { request } from "@/api/request";
import { PushHistoryRecord } from "./index";

// 获取推送历史接口参数
export interface GetPushHistoryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  pushTypeCode?: string; // 推送类型代码：friend, group, announcement
  status?: string; // 状态：pending, completed, failed
  workbenchId?: string;
  [property: string]: any;
}

// 获取推送历史接口响应
export interface GetPushHistoryResponse {
  success: boolean;
  message?: string;
  data?: {
    list: PushHistoryRecord[];
    total: number;
    page: number;
    pageSize: number;
  };
}

/**
 * 获取推送历史列表
 */
export interface GetGroupPushHistoryParams {
  keyword?: string;
  limit?: string | number;
  page?: string | number;
  pageSize?: string | number;
  pushTypeCode?: string;
  status?: string;
  workbenchId?: string;
  [property: string]: any;
}

export const getPushHistory = async (
  params: GetGroupPushHistoryParams,
): Promise<GetPushHistoryResponse> => {
  // 转换参数格式，确保 limit 和 page 是字符串
  const requestParams: Record<string, any> = {
    ...params,
  };

  if (params.page !== undefined) {
    requestParams.page = String(params.page);
  }

  if (params.pageSize !== undefined) {
    requestParams.limit = String(params.pageSize);
  }

  return request("/v1/workbench/group-push-history", requestParams, "GET");
};
