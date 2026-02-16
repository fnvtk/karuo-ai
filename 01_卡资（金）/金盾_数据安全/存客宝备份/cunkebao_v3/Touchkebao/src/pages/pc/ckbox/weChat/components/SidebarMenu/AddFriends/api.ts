import request from "@/api/request2";
export const getWechatAccountInfo = (params: { id?: string }) => {
  return request("/api/wechataccount", params, "GET");
};
