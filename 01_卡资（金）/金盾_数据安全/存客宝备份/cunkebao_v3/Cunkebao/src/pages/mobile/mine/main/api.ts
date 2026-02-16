import request from "@/api/request";
// 首页仪表盘总览
export function getDashboard() {
  return request("/v1/dashboard", {}, "GET");
}
// 用户信息统计
export function getUserInfoStats() {
  return request("/v1/dashboard/userInfoStats", {}, "GET");
}
