import request from "@/api/request";

export interface Package {
  id: number;
  name: string;
  description: string;
  pic: string;
  type: number;
  createTime: string;
  num: number;
  R: number;
  F: number;
  M: number;
  RFM: number;
}
export interface PackageList {
  list: Package[];
  total: number;
}
export async function getPackage(params: {
  page: number;
  pageSize: number;
  keyword: string;
}): Promise<PackageList> {
  return request("/v1/traffic/pool/getPackage", params, "GET");
}

// 删除数据包
export async function deletePackage(id: number): Promise<{ success: boolean }> {
  return request("/v1/traffic/pool/deletePackage", { id }, "POST");
}
