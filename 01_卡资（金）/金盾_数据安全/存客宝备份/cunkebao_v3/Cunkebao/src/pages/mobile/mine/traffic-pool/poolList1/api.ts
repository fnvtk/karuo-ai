import request from "@/api/request";

// 获取流量池列表
export function fetchTrafficPoolList(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
}) {
  return request("/v1/traffic/pool", params, "GET");
}

export async function fetchScenarioOptions() {
  return request("/v1/plan/scenes", {}, "GET");
}

export async function fetchPackageOptions() {
  return request("/v1/traffic/pool/getPackage", {}, "GET");
}

export async function addPackage(params: {
  type: string; // 类型 1搜索 2选择用户 3文件上传
  addPackageId?: number;
  addStatus?: number;
  deviceId?: string;
  keyword?: string;
  packageId?: number;
  packageName?: number; // 添加的流量池名称
  tableFile?: number;
  taskId?: number; // 任务id j及场景获客id
  userIds?: number[];
  userValue?: number;
}) {
  return request("/v1/traffic/pool/addPackage", params, "POST");
}
