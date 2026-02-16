import request from "@/api/request";

// 设备统计
export function getDeviceStats() {
  return request("/v1/dashboard/device-stats", {}, "GET");
}

// 微信号统计
export function getWechatStats() {
  return request("/v1/dashboard/wechat-stats", {}, "GET");
}

// 今日数据统计
export function getTodayStats() {
  return request("/v1/dashboard/today-stats", {}, "GET");
}

// 首页仪表盘总览
export function getDashboard() {
  return request("/v1/dashboard", {}, "GET");
}

// 获客场景统计
export function getPlanStats(params: any) {
  return request("/v1/dashboard/plan-stats", params, "GET");
}

// 近七天统计
export function getSevenDayStats() {
  return request("/v1/dashboard/sevenDay-stats", {}, "GET");
}
