// 充值记录类型定义
export interface RechargeOrder {
  id?: number | string;
  orderNo?: string;
  money?: number;
  amount?: number;
  paymentMethod?: string;
  paymentChannel?: string;
  status?: number | string;
  statusText?: string;
  orderType?: number;
  orderTypeText?: string;
  createTime?: string | number;
  payTime?: string | number;
  description?: string;
  goodsName?: string;
  goodsSpecs?:
    | {
        id: number;
        name: string;
        price: number;
        tokens: number;
      }
    | string;
  remark?: string;
  operator?: string;
  balance?: number;
  tokens?: number | string;
  payType?: number;
  payTypeText?: string;
  transactionId?: string;
}

// API响应类型
export interface RechargeOrdersResponse {
  list: RechargeOrder[];
  total?: number;
  page?: number;
  limit?: number;
}

// 充值记录详情
export interface RechargeOrderDetail extends RechargeOrder {
  refundAmount?: number;
  refundTime?: string | number;
  refundReason?: string;
}

// 查询参数
export interface RechargeOrderParams {
  page?: number | string;
  limit?: number | string;
  status?: number | string;
  startTime?: string;
  endTime?: string;
  [property: string]: any;
}

export interface GetRechargeOrderDetailParams {
  orderNo: string;
  [property: string]: any;
}
