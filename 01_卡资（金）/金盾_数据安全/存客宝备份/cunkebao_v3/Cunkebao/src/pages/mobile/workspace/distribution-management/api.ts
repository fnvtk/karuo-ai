// 分销管理 API

import request from "@/api/request";
import type {
  Channel,
  Statistics,
  FundStatistics,
  ChannelEarnings,
  WithdrawalRequest,
  WithdrawalStatus,
} from "./data";

// 获取统计数据
export const fetchStatistics = async (): Promise<Statistics> => {
  return request("/v1/distribution/channels/statistics", {}, "GET");
};

// 获取渠道列表
export const fetchChannelList = async (params: {
  page?: number;
  limit?: number;
  keyword?: string;
  status?: "enabled" | "disabled"; // 渠道状态筛选
}): Promise<{ list: Channel[]; total: number }> => {
  return request("/v1/distribution/channels", params, "GET");
};

// 创建渠道
export const createChannel = async (data: {
  name: string;
  phone?: string;
  wechatId?: string;
  remarks?: string;
}): Promise<Channel> => {
  return request("/v1/distribution/channel", data, "POST");
};

// 更新渠道
export const updateChannel = async (
  id: string,
  data: {
    name: string;
    phone?: string;
    wechatId?: string;
    remarks?: string;
  },
): Promise<Channel> => {
  return request(`/v1/distribution/channel/${id}`, data, "PUT");
};

// 删除渠道
export const deleteChannel = async (id: string): Promise<void> => {
  return request(`/v1/distribution/channel/${id}`, null, "DELETE");
};

// 禁用/启用渠道
export const toggleChannelStatus = async (
  id: string,
  status: "enabled" | "disabled",
): Promise<void> => {
  return request(`/v1/distribution/channel/${id}/status`, { status }, "PUT");
};

// 获取资金统计数据
export const fetchFundStatistics = async (): Promise<FundStatistics> => {
  return request("/v1/distribution/channels/revenue-statistics", {}, "GET");
};

// 获取渠道收益列表
export const fetchChannelEarningsList = async (params: {
  page?: number;
  limit?: number;
  keyword?: string;
}): Promise<{ list: ChannelEarnings[]; total: number }> => {
  const queryParams: any = {};
  if (params.page) queryParams.page = params.page;
  if (params.limit) queryParams.limit = params.limit;
  if (params.keyword) queryParams.keyword = params.keyword;

  return request("/v1/distribution/channels/revenue-detail", queryParams, "GET");
};

// 获取提现申请列表
export const fetchWithdrawalList = async (params: {
  page?: number;
  limit?: number;
  status?: WithdrawalStatus;
  date?: string;
  keyword?: string;
}): Promise<{ list: WithdrawalRequest[]; total: number }> => {
  const queryParams: any = {};
  if (params.page) queryParams.page = params.page;
  if (params.limit) queryParams.limit = params.limit;
  if (params.status && params.status !== "all") {
    queryParams.status = params.status;
  }
  if (params.date) queryParams.date = params.date;
  if (params.keyword) queryParams.keyword = params.keyword;

  return request("/v1/distribution/withdrawals", queryParams, "GET");
};

// 审核提现申请
export const reviewWithdrawal = async (
  id: string,
  action: "approve" | "reject",
  remark?: string,
): Promise<void> => {
  const data: any = { action };
  // 拒绝时 remark 必填，通过时可选
  if (action === "reject") {
    if (!remark || !remark.trim()) {
      throw new Error("拒绝时必须填写审核备注");
    }
    data.remark = remark.trim();
  } else if (remark) {
    // 通过时如果有备注也传递
    data.remark = remark.trim();
  }
  return request(`/v1/distribution/withdrawals/${id}/review`, data, "POST");
};

// 标记为已打款
export const markAsPaid = async (
  id: string,
  payType: "wechat" | "alipay" | "bankcard",
  remark?: string,
): Promise<void> => {
  const data: any = { payType };
  if (remark) {
    data.remark = remark.trim();
  }
  return request(`/v1/distribution/withdrawals/${id}/mark-paid`, data, "POST");
};

// 生成渠道扫码创建二维码
export const generateQRCode = async (
  type: "h5" | "miniprogram",
): Promise<{
  type: "h5" | "miniprogram";
  qrCode: string;
  url: string;
}> => {
  return request("/v1/distribution/channel/generate-qrcode", { type }, "POST");
};

// 生成渠道登录二维码
export const generateLoginQRCode = async (
  type: "h5" | "miniprogram" = "h5",
): Promise<{
  type: "h5" | "miniprogram";
  qrCode: string; // base64 或图片URL
  url: string; // H5 或小程序落地页URL
}> => {
  return request(
    "/v1/distribution/channel/generate-login-qrcode",
    { type },
    "POST",
  );
};
