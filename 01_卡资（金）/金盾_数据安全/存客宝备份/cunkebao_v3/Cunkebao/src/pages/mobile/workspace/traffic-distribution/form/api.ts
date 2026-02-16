import request from "@/api/request";
import type { TrafficDistributionFormData } from "./data";

// 获取流量分发详情
export const getTrafficDistributionDetail = (id: string) => {
  return request("/v1/workbench/detail", { id });
};

// 更新流量分发
export const updateTrafficDistribution = (
  data: TrafficDistributionFormData,
) => {
  return request("/v1/workbench/update", data, "POST");
};

// 创建流量分发
export const createTrafficDistribution = (
  data: TrafficDistributionFormData,
) => {
  return request("/v1/workbench/create", data, "POST");
};
