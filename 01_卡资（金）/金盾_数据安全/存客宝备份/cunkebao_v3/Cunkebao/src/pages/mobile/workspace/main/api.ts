import request from "@/api/request";

// 设备统计
export function getDeviceStats() {
  return request("/v1/dashboard/device-stats", {}, "GET");
}

// 微信号统计
export function getWechatStats() {
  return request("/v1/dashboard/wechat-stats", {}, "GET");
}

// 获取常用功能列表
export function getCommonFunctions() {
  return request("/v1/workbench/common-functions", {}, "GET");
}

// 你可以根据需要继续添加其他接口
// 例如：场景获客统计、今日数据统计等
