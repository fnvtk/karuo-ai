export interface FilterCondition {
  // 基础搜索
  keyword?: string // 综合搜索关键词

  // 详细筛选
  phone?: string // 手机号
  wechatId?: string // 微信号
  nickname?: string // 用户名称
  tags?: string[] // 微信标签

  // RFM评分筛选
  rfmMin?: number // 最低RFM分
  rfmMax?: number // 最高RFM分

  // 地区筛选
  regions?: string[] // 地区列表

  // 其他条件
  category?: "customer" | "potential" | "lost" | "" // 客户类别
  addTimeStart?: string // 添加时间开始
  addTimeEnd?: string // 添加时间结束
}

export interface FilterScheme {
  id: string
  name: string // 方案名称
  description?: string // 方案描述
  conditions: FilterCondition // 筛选条件
  createdAt: string // 创建时间
  updatedAt: string // 更新时间
  usageCount: number // 使用次数
}
