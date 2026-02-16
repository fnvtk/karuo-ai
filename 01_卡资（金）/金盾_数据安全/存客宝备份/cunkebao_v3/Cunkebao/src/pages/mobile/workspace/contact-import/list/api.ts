import request from "@/api/request";
import {
  ContactImportTask,
  CreateContactImportTaskData,
  UpdateContactImportTaskData,
  ContactImportRecord,
  PaginatedResponse,
  ImportStats,
} from "./data";

// 获取通讯录导入任务列表
export function fetchContactImportTasks(
  params = { type: 6, page: 1, limit: 10 },
) {
  return request("/v1/workbench/list", params, "GET");
}

// 获取单个任务详情
export function fetchContactImportTaskDetail(
  id: number,
): Promise<ContactImportTask | null> {
  return request("/v1/workbench/detail", { id }, "GET");
}

// 创建通讯录导入任务
export function createContactImportTask(
  data: CreateContactImportTaskData,
): Promise<any> {
  return request("/v1/workbench/create", { ...data, type: 6 }, "POST");
}

// 更新通讯录导入任务
export function updateContactImportTask(
  data: UpdateContactImportTaskData,
): Promise<any> {
  return request("/v1/workbench/update", { ...data, type: 6 }, "POST");
}

// 删除通讯录导入任务
export function deleteContactImportTask(id: number): Promise<any> {
  return request("/v1/workbench/delete", { id }, "DELETE");
}

// 切换任务状态
export function toggleContactImportTask(data: {
  id: number;
  status: number;
}): Promise<any> {
  return request("/v1/workbench/update-status", { ...data }, "POST");
}

// 复制通讯录导入任务
export function copyContactImportTask(id: number): Promise<any> {
  return request("/v1/workbench/copy", { id }, "POST");
}

// 获取导入记录
export function fetchImportRecords(
  workbenchId: number,
  page: number = 1,
  limit: number = 20,
  keyword?: string,
): Promise<PaginatedResponse<ContactImportRecord>> {
  return request(
    "/v1/workbench/import-contact",
    {
      workbenchId,
      page,
      limit,
      keyword,
    },
    "GET",
  );
}

// 获取统计数据
export function fetchImportStats(): Promise<ImportStats> {
  return request("/v1/workbench/import-stats", {}, "GET");
}

// 获取设备组列表
export function fetchDeviceGroups(): Promise<any[]> {
  return request("/v1/device/groups", {}, "GET");
}

// 手动触发导入
export function triggerImport(taskId: number): Promise<any> {
  return request("/v1/workbench/trigger-import", { taskId }, "POST");
}

// 批量操作任务
export function batchOperateTasks(data: {
  taskIds: number[];
  operation: "start" | "stop" | "delete";
}): Promise<any> {
  return request("/v1/workbench/batch-operate", data, "POST");
}
