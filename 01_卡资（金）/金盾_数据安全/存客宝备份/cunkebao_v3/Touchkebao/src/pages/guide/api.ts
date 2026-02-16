import request from "@/api/request";

// 获取设备二维码
export const fetchDeviceQRCode = (accountId: string) =>
  request("/v1/api/device/add", { accountId }, "POST");

// 通过IMEI添加设备
export const addDeviceByImei = (imei: string, name: string) =>
  request("/v1/api/device/add-by-imei", { imei, name }, "POST");

// 获取设备列表
export const fetchDeviceList = (params: { accountId?: string }) =>
  request("/v1/devices/add-results", params, "GET");
