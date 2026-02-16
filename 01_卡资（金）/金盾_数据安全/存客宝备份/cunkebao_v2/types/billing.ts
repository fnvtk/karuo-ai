// 算力包订单相关类型定义

export interface ComputingPackage {
  id: string
  name: string
  computing: number // 算力数量
  price: number // 原价
  discountPrice: number // 折扣价
  discount: number // 折扣率 (0-100)
  features: string[] // 特性描述
  popular?: boolean // 是否为热门套餐
}

export interface PaymentOrder {
  id: string // 订单ID
  orderNo: string // 订单号
  packageId: string // 套餐ID
  packageName: string // 套餐名称
  computing: number // 购买的算力数量
  amount: number // 支付金额
  originalAmount?: number // 原价
  paymentMethod: "wechat" | "alipay" // 支付方式
  paymentStatus: "pending" | "paid" | "failed" | "cancelled" | "expired" // 支付状态
  paymentTime?: string // 支付时间
  createTime: string // 创建时间
  expireTime: string // 过期时间
  qrCode?: string // 支付二维码
  transactionId?: string // 交易流水号
  userId: string // 用户ID
  remark?: string // 备注
}

export interface OrderDetail extends PaymentOrder {
  // 支付详情扩展信息
  paymentChannel?: string // 支付渠道详情
  refundStatus?: "none" | "processing" | "success" | "failed" // 退款状态
  refundAmount?: number // 退款金额
  refundTime?: string // 退款时间
}

export interface PaymentCallback {
  orderNo: string
  status: "success" | "failed"
  transactionId: string
  paymentTime: string
  amount: number
}
