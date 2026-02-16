import request from "@/api/request";

// 请求参数接口
export interface Request {
  keyword: string;
  /**
   * 条数
   */
  limit: string;
  /**
   * 分页
   */
  page: string;
  [property: string]: any;
}

// 获取流量池包列表
export function getPoolPackages(params: Request) {
  return request("/v1/traffic/pool/getPackage", params, "GET");
}

// 保留原接口以兼容现有代码
export function getPoolList(params: {
  page?: string;
  pageSize?: string;
  keyword?: string;
  addStatus?: string;
  deviceId?: string;
  packageId?: string;
  userValue?: string;
  [property: string]: any;
}) {
  return request("/v1/traffic/pool", params, "GET");
}
