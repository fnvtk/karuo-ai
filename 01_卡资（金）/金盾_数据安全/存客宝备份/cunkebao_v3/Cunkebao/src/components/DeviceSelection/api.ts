import request from "@/api/request";

// 获取设备列表
export function getDeviceList(params: {
  page: number;
  limit: number;
  keyword?: string;
}) {
  return request("/v1/devices", params, "GET");
}
