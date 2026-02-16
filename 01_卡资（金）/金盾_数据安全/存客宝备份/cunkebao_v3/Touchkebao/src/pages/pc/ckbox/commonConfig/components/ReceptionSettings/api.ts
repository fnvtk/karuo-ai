import request from "@/api/request";

export const getAiSettings = () => {
  return request("/v1/kefu/ai/friend/get", "GET");
};

export const setAiSettings = (params: {
  isUpdata: string;
  packageId: string[];
  type: number;
}) => {
  return request("/v1/kefu/ai/friend/setAll", params, "POST");
};
