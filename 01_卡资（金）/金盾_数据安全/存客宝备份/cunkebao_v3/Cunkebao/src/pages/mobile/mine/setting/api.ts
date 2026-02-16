import request from "@/api/request";

export const editUserInfo = (data: any) => {
  return request("/v1/user/editUserInfo", data, "PUT");
};
