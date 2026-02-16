// 渠道详情数据模型

// 渠道详情信息
export interface ChannelDetail {
  id: string;
  name: string;
  code: string;
  phone?: string;
  wechatId?: string;
  createType: "manual" | "auto";
  remark?: string;
  createTime: string;
}

// 渠道统计数据
export interface ChannelStatistics {
  totalFriends: number; // 总加好友数
  todayFriends: number; // 今日加好友数
  totalCustomers: number; // 总获客数
  todayCustomers: number; // 今日获客数
  totalRevenue: number; // 总收益
  pendingWithdrawal: number; // 待提现
  pendingReview: number; // 待审核
  withdrawn: number; // 已提现
}

// 收益明细类型
export type RevenueType = "all" | "addFriend" | "customer" | "other";

// 收益明细记录
export interface RevenueRecord {
  id: string;
  title: string;
  type: "addFriend" | "customer" | "other";
  typeLabel: string;
  amount: number;
  date: string;
  remark?: string; // 备注
}

// 提现明细状态
export type WithdrawalDetailStatus = "all" | "pending" | "approved" | "rejected" | "paid";

// 提现明细记录
export interface WithdrawalDetailRecord {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "paid";
  applyDate: string;
  reviewDate?: string;
  paidDate?: string;
  remark?: string;
  reviewer?: string; // 审核人
}

// 渠道前端首页数据
export interface ChannelHomeData {
  channelInfo: {
    channelName: string;
    channelCode: string;
    phone?: string;
    wechatId?: string;
    remark?: string;
    createTime: string;
    createType: "manual" | "auto";
  };
  financialStats: {
    withdrawableAmount: number; // 可提现金额
    totalRevenue: number; // 总收益
    pendingReview: number; // 待审核
    withdrawn: number; // 已提现
  };
  customerStats: {
    totalFriends: number; // 总加好友数
    todayFriends: number; // 今日加好友数
    totalCustomers: number; // 总获客数
    todayCustomers: number; // 今日获客数
  };
}
