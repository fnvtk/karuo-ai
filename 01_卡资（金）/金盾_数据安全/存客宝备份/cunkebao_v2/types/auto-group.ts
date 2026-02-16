export interface AutoGroupPlan {
  id: string
  name: string
  customerType: string
  startDate: string
  endDate: string
  groupSize: number
  welcomeMessage: string
  deviceId: string
  operatorId: string
  status: "running" | "stopped" | "completed"
  createdGroups: number
  totalFriends: number
  tags: string[]
  specificWechatIds: string[]
  keywords: string[]
}

export interface GroupMember {
  id: string
  wechatId: string
  nickname: string
  avatar: string
  tags: string[]
}

export interface Device {
  id: string
  name: string
  status: "online" | "offline"
  currentOperator: string
}

export interface WechatAccount {
  id: string
  wechatId: string
  nickname: string
  avatar: string
  status: "online" | "offline"
}
