// 分销管理数据模型

// 渠道信息
export interface Channel {
  id: string;
  name: string;
  code: string;
  phone?: string;
  wechatId?: string;
  createType: "manual" | "auto"; // 手动创建 | 自动创建
  status?: "enabled" | "disabled"; // 启用 | 禁用
  totalCustomers: number; // 总获客数
  todayCustomers: number; // 今日获客数
  totalFriends: number; // 总加好友数
  todayFriends: number; // 今日加好友数
  createTime: string;
  remarks?: string; // 备注信息
}

// 统计数据
export interface Statistics {
  totalChannels: number; // 总渠道数
  todayChannels: number; // 今日渠道数
  totalCustomers: number; // 总获客数
  todayCustomers: number; // 今日获客数
  totalFriends: number; // 总加好友数
  todayFriends: number; // 今日加好友数
}

// 资金统计数据
export interface FundStatistics {
  totalExpenditure: number; // 总支出
  withdrawn: number; // 已提现
  pendingReview: number; // 待审核
}

// 渠道收益信息
export interface ChannelEarnings {
  channelId: string; // 渠道ID
  channelName: string; // 渠道名称
  channelCode: string; // 渠道编码
  totalRevenue: number; // 总收益（元）
  withdrawable: number; // 可提现（元）
  withdrawn: number; // 已提现（元）
  pendingReview: number; // 待审核（元）
}

// 提现申请状态
export type WithdrawalStatus = "all" | "pending" | "approved" | "rejected" | "paid";

// 提现申请信息
export interface WithdrawalRequest {
  id: string;
  channelId: string;
  channelName: string;
  channelCode: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "paid";
  applyDate: string;
  reviewDate?: string;
  reviewer?: string;
  remark?: string; // 备注（拒绝或打款时的备注）
  payType?: "wechat" | "alipay" | "bankcard"; // 打款方式
}

// 标签页类型
export type TabType = "channel" | "fund" | "withdrawal";
