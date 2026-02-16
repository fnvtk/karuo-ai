import request from "@/api/request";
//获取客服列表
export function getCustomerList() {
  return request("/v1/kefu/customerService/list", {}, "GET");
}
