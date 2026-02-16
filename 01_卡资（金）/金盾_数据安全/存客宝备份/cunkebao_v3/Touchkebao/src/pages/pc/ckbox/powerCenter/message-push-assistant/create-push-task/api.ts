import request from "@/api/request";
import type { CreatePushTaskPayload } from "./types";

// 创建推送任务
export function queryWorkbenchCreate(
  params: CreatePushTaskPayload,
): Promise<any> {
  return request("/v1/workbench/create", params, "POST");
}
