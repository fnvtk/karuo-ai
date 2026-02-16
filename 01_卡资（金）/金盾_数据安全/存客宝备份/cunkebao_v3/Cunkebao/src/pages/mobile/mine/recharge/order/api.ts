import {
  RechargeOrderDetail,
  RechargeOrderParams,
  GetRechargeOrderDetailParams,
} from "./data";
import request from "@/api/request";

// 获取充值记录列表
export async function getRechargeOrders(params: RechargeOrderParams) {
  return request("/v1/tokens/orderList", params, "GET");
}

// 获取充值记录详情
export async function getRechargeOrderDetail(
  params: GetRechargeOrderDetailParams,
): Promise<RechargeOrderDetail> {
  return request("/v1/tokens/queryOrder", params, "GET");
}

export interface ContinuePayParams {
  orderNo: string;
  [property: string]: any;
}

export interface ContinuePayResponse {
  code_url?: string;
  codeUrl?: string;
  payUrl?: string;
  [property: string]: any;
}

// 继续支付
export function continuePay(
  params: ContinuePayParams,
): Promise<ContinuePayResponse> {
  return request("/v1/tokens/pay", params, "POST");
}
