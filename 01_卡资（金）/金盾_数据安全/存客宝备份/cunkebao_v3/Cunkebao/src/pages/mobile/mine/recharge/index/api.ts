import request from "@/api/request";

export interface Statistics {
  totalTokens: number; // 总算力
  todayUsed: number; // 今日使用
  monthUsed: number; // 本月使用
  remainingTokens: number; // 剩余算力
  totalConsumed: number; // 总消耗
  yesterdayUsed?: number; // 昨日消耗
  historyConsumed?: number; // 历史消耗
  estimatedDays?: number; // 预计可用天数
}
// 算力统计接口
export function getStatistics(): Promise<Statistics> {
  return request("/v1/tokens/statistics", undefined, "GET");
}

// 算力包套餐类型
export interface PowerPackage {
  id: number;
  name: string;
  tokens: number; // 算力点数
  price: number; // 价格（分）
  originalPrice: number; // 原价（分）
  unitPrice: number; // 单价
  discount: number; // 折扣百分比
  isTrial: number; // 是否试用套餐
  isRecommend: number; // 是否推荐
  isHot: number; // 是否热门
  isVip: number; // 是否VIP
  features: string[]; // 功能特性
  status: number;
  createTime: string;
  updateTime: string;
}

// 算力统计信息
export interface PowerStats {
  balance: number; // 账户余额（元）
  totalPower: number; // 总算力
  todayUsed: number; // 今日使用
  monthUsed: number; // 本月使用
  remainingPower: number; // 剩余算力
}

// 消费记录类型
export interface ConsumptionRecord {
  id: number;
  type: string; // AI分析、内容生成等
  status: string; // 已完成、进行中等
  amount: number; // 消费金额（元）
  power: number; // 消耗算力
  description: string; // 描述
  createTime: string;
}

export interface OrderListParams {
  /**
   * 关键词搜索（订单号、商品名称）
   */
  keyword?: string;
  /**
   * 每页数量（默认10）
   */
  limit?: string;
  /**
   * 订单类型（1-算力充值）
   */
  orderType?: string;
  /**
   * 页码
   */
  page?: string;
  /**
   * 订单状态（0-待支付 1-已支付 2-已取消 3-已退款）
   */
  status?: string;
  [property: string]: any;
}

export interface OrderList {
  id?: number;
  mchId?: number;
  companyId?: number;
  userId?: number;
  orderType?: number;
  status?: number;
  goodsId?: number;
  goodsName?: string;
  goodsSpecs?:
    | {
        id: number;
        name: string;
        price: number;
        tokens: number;
      }
    | string;
  money?: number;
  orderNo?: string;
  ip?: string;
  nonceStr?: string;
  createTime?: string | number;
  payType?: number;
  payTime?: string | number;
  payInfo?: any;
  deleteTime?: string | number;
  tokens?: string | number;
  statusText?: string;
  orderTypeText?: string;
  payTypeText?: string;
}

// 获取订单列表
export function getOrderList(
  params: OrderListParams,
): Promise<{ list: OrderList[]; total: number }> {
  return request("/v1/tokens/orderList", params, "GET");
}

// 获取算力统计
export function getPowerStats(): Promise<PowerStats> {
  return request("/v1/power/stats", {}, "GET");
}

// 获取套餐列表
export function getTaocanList(): Promise<{ list: PowerPackage[] }> {
  return request("/v1/tokens/list", {}, "GET");
}

// 获取消费记录
export function getConsumptionRecords(params: {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
}): Promise<{ list: ConsumptionRecord[]; total: number }> {
  return request("/v1/power/consumption-records", params, "GET");
}

// 购买套餐
export function buyPackage(params: { id: number; price: number }) {
  return request("/v1/tokens/pay", params, "POST");
}

// 自定义购买算力
export function buyCustomPower(params: { amount: number }) {
  return request("/v1/power/buy-custom", params, "POST");
}

// 查询订单状态
export interface QueryOrderResponse {
  id: number;
  mchId: number;
  companyId: number;
  userId: number;
  orderType: number;
  status: number; // 0: 待支付, 1: 已支付
  goodsId: number;
  goodsName: string;
  goodsSpecs: string;
  money: number;
  orderNo: string;
  payType: number | null;
  payTime: number | null;
  payInfo: any;
  createTime: number;
}

export function queryOrder(orderNo: string): Promise<QueryOrderResponse> {
  return request("/v1/tokens/queryOrder", { orderNo }, "GET");
}

// 账号信息
export interface Account {
  id: number;
  uid?: number; // 用户ID（用于分配算力）
  userId?: number; // 用户ID（别名）
  userName: string;
  realName: string;
  nickname: string;
  departmentId: number;
  departmentName: string;
  avatar: string;
}

// 获取账号列表
export function getAccountList(): Promise<{ list: Account[]; total: number }> {
  return request("/v1/kefu/accounts/list", undefined, "GET");
}

// 分配算力接口参数
export interface AllocateTokensParams {
  targetUserId: number; // 目标用户ID
  tokens: number; // 分配的算力数量
  remarks?: string; // 备注
}

// 分配算力
export function allocateTokens(params: AllocateTokensParams): Promise<any> {
  return request("/v1/tokens/allocate", params, "POST");
}
