import request from "@/api/request";

// 获取设备列表
export const fetchDeviceList = (params: {
  page?: number;
  limit?: number;
  keyword?: string;
}) => request("/v1/devices", params, "GET");

// 获取设备详情
export const fetchDeviceDetail = (id: string | number) =>
  request(`/v1/devices/${id}`);

// 获取设备关联微信账号
export const fetchDeviceRelatedAccounts = (id: string | number) =>
  request(`/v1/wechats/related-device/${id}`);

// 获取设备操作日志
export const fetchDeviceHandleLogs = (
  id: string | number,
  page = 1,
  limit = 10,
) => request(`/v1/devices/${id}/handle-logs`, { page, limit }, "GET");

// 更新设备任务配置
export const updateDeviceTaskConfig = (config: {
  deviceId: string | number;
  autoAddFriend?: boolean;
  autoReply?: boolean;
  momentsSync?: boolean;
  aiChat?: boolean;
}) => request("/v1/devices/task-config", config, "POST");

// 删除设备
export const deleteDevice = (id: number) =>
  request(`/v1/devices/${id}`, undefined, "DELETE");

// 获取设备二维码
export const fetchDeviceQRCode = (accountId: string) =>
  request("/v1/api/device/add", { accountId }, "POST");

// 通过IMEI添加设备
export const addDeviceByImei = (imei: string, name: string) =>
  request("/v1/api/device/add-by-imei", { imei, name }, "POST");

// 获取设备添加结果（用于轮询检查）
export const fetchAddResults = (params: { accountId?: string }) =>
  request("/v1/devices/add-results", params, "GET");
