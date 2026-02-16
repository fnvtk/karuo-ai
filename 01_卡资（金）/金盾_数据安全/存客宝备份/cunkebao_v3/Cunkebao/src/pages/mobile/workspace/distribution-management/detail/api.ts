// 渠道详情 API

import request from "@/api/request";
import type {
  ChannelDetail,
  ChannelStatistics,
  RevenueRecord,
  RevenueType,
  WithdrawalDetailRecord,
  WithdrawalDetailStatus,
  ChannelHomeData,
} from "./data";

// 模拟延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 获取渠道详情（使用真实接口）
export const fetchChannelDetail = async (
  channelCode: string,
): Promise<ChannelDetail> => {
  const data = await request(
    "/v1/frontend/distribution/user/home",
    { channelCode },
    "GET",
  ) as ChannelHomeData;

  // 将接口返回的 channelInfo 转换为 ChannelDetail 格式
  return {
    id: data.channelInfo.channelCode, // 使用 channelCode 作为 id
    name: data.channelInfo.channelName,
    code: data.channelInfo.channelCode,
    phone: data.channelInfo.phone,
    wechatId: data.channelInfo.wechatId,
    createType: data.channelInfo.createType,
    remark: data.channelInfo.remark,
    createTime: data.channelInfo.createTime,
  };
};

// 获取渠道统计数据（使用真实接口）
export const fetchChannelStatistics = async (
  channelCode: string,
): Promise<ChannelStatistics> => {
  const data = await request(
    "/v1/frontend/distribution/user/home",
    { channelCode },
    "GET",
  ) as ChannelHomeData;

  // 将接口返回的数据转换为 ChannelStatistics 格式
  return {
    totalFriends: data.customerStats.totalFriends,
    todayFriends: data.customerStats.todayFriends,
    totalCustomers: data.customerStats.totalCustomers,
    todayCustomers: data.customerStats.todayCustomers,
    totalRevenue: data.financialStats.totalRevenue,
    pendingWithdrawal: data.financialStats.withdrawableAmount,
    pendingReview: data.financialStats.pendingReview,
    withdrawn: data.financialStats.withdrawn,
  };
};

// 获取渠道首页数据（完整数据）
export const fetchChannelHomeData = async (
  channelCode: string,
): Promise<ChannelHomeData> => {
  return request("/v1/frontend/distribution/user/home", { channelCode }, "GET") as Promise<ChannelHomeData>;
};

// 将接口返回的 type 映射到前端的 RevenueType
const mapApiTypeToRevenueType = (apiType: string): "addFriend" | "customer" | "other" => {
  if (apiType === "customer_acquisition") {
    return "customer";
  }
  if (apiType === "add_friend" || apiType === "addFriend") {
    return "addFriend";
  }
  return "other";
};

// 将前端的 RevenueType 映射到接口的 filterType
const mapRevenueTypeToFilterType = (type?: RevenueType): string => {
  if (!type || type === "all") {
    return "";
  }
  if (type === "customer") {
    return "customer_acquisition";
  }
  if (type === "addFriend") {
    return "add_friend";
  }
  return "";
};

// 获取收益明细列表（使用真实接口）
export const fetchRevenueList = async (params: {
  channelCode: string;
  page?: number;
  limit?: number;
  type?: RevenueType;
  date?: string;
}): Promise<{ list: RevenueRecord[]; total: number; page: number }> => {
  const response = await request(
    "/v1/frontend/distribution/user/revenue-records",
    {
      channelCode: params.channelCode,
      page: params.page || 1,
      limit: params.limit || 10,
      filterType: mapRevenueTypeToFilterType(params.type),
      date: params.date || "",
    },
    "GET",
  ) as {
    list: Array<{
      id: string;
      sourceType: string;
      type: string;
      typeLabel: string;
      amount: number;
      remark?: string;
      createTime: string;
    }>;
    total: number;
    page: number;
    limit: number;
  };

  // 将接口返回的数据转换为 RevenueRecord 格式
  const list: RevenueRecord[] = response.list.map(item => ({
    id: item.id,
    title: item.sourceType || item.typeLabel, // 使用 sourceType 作为 title，如果没有则使用 typeLabel
    type: mapApiTypeToRevenueType(item.type),
    typeLabel: item.typeLabel,
    amount: item.amount, // 金额是分
    date: item.createTime,
    remark: item.remark,
  }));

  return {
    list,
    total: response.total,
    page: response.page,
  };
};

// 获取提现明细列表（使用真实接口）
export const fetchWithdrawalDetailList = async (params: {
  channelCode: string;
  page?: number;
  limit?: number;
  status?: WithdrawalDetailStatus;
  payType?: "all" | "wechat" | "alipay" | "bankcard";
  date?: string;
}): Promise<{
  list: WithdrawalDetailRecord[];
  total: number;
  page: number;
}> => {
  const requestParams: any = {
    channelCode: params.channelCode,
    page: params.page || 1,
    limit: params.limit || 10,
    status: params.status || "all",
    payType: params.payType || "all",
  };

  // 如果有日期参数，添加到请求参数中
  if (params.date) {
    requestParams.date = params.date;
  }

  const response = await request(
    "/v1/frontend/distribution/user/withdrawal-records",
    requestParams,
    "GET",
  ) as {
    list: Array<{
      id: string;
      amount: number;
      status: "pending" | "approved" | "rejected" | "paid";
      statusLabel: string;
      payType: string;
      payTypeLabel: string;
      applyTime: string;
      reviewTime: string | null;
      reviewer: string | null;
      remark: string | null;
    }>;
    total: number;
    page: number;
    limit: number;
  };

  // 将接口返回的数据转换为 WithdrawalDetailRecord 格式
  const list: WithdrawalDetailRecord[] = response.list.map(item => ({
    id: item.id,
    amount: item.amount, // 金额是分
    status: item.status,
    applyDate: item.applyTime,
    reviewDate: item.reviewTime || undefined,
    paidDate: undefined, // 接口没有单独的 paidDate 字段
    remark: item.remark || undefined,
    reviewer: item.reviewer || undefined,
  }));

  return {
    list,
    total: response.total,
    page: response.page,
  };
};
