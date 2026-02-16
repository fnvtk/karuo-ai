import request from "@/api/request";

// 算力包套餐类型（仅 buy-power 页面用到类型定义，须保留）
export interface PowerPackage {
  id: number;
  name: string;
  tokens: number | string; // 算力点数（可能是字符串，如"2,800"）
  price: number; // 价格（分）
  originalPrice: number; // 原价（分）
  unitPrice: number; // 单价
  discount: number; // 折扣百分比
  isTrial: number; // 是否试用套餐
  isRecommend: number; // 是否推荐
  isHot: number; // 是否热门
  isVip: number; // 是否VIP
  features?: string[]; // 功能特性（可选）
  description: string[]; // 描述关键词
  status: number;
  createTime: string;
  updateTime: string;
}

// 获取套餐列表
export function getTaocanList(): Promise<{ list: PowerPackage[] }> {
  return request("/v1/tokens/list", {}, "GET");
}

export interface BuyPackageParams {
  /**
   * 二选一
   */
  id?: number;
  /**
   * 二选一 自定义购买金额
   */
  price?: number;
  [property: string]: any;
}
// 购买套餐
export function buyPackage(params: BuyPackageParams) {
  return request("/v1/tokens/pay", params, "POST");
}

// 自定义购买算力
export function buyCustomPower(params: { amount: number }) {
  return request("/v1/power/buy-custom", params, "POST");
}
