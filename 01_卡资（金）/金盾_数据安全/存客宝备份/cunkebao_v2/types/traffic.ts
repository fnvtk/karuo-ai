export interface TrafficUser {
  id: string
  avatar: string
  nickname: string
  wechatId: string
  phone: string
  region: string
  note: string
  status: "pending" | "added" | "failed"
  addTime: string
  source: string
  assignedTo: string
  category: "potential" | "customer" | "lost"
  // RFM评分相关
  rfmScore?: {
    recency: number // 最近消费时间 (1-5分)
    frequency: number // 消费频率 (1-5分)
    monetary: number // 消费金额 (1-5分)
    total: number // 总分 (3-15分)
  }
  // 所属分组
  groupIds: string[]
  tags?: string[]
  lastInteraction?: string
  totalSpent?: number
  interactionCount?: number
}

export interface TrafficPoolGroup {
  id: string
  name: string
  description: string
  userCount: number
  iconType: "users" | "trending" | "message" | "folder"
  color: string
  isDefault: boolean
  isUncategorized?: boolean // 是否为"未分类"分组
  createdAt: string
  // RFM平均评分
  avgRfmScore?: {
    recency: number
    frequency: number
    monetary: number
    total: number
  }
}
