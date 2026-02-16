export interface GroupSyncTask {
  id: string
  name: string
  pushTimeStart: string
  pushTimeEnd: string
  dailyPushCount: number
  pushOrder: "earliest" | "latest"
  isLoopPush: boolean
  isImmediatePush: boolean
  isEnabled: boolean
  groups: WechatGroup[]
  contentLibraries: ContentLibrary[]
  createdAt: string
  updatedAt: string
}

export interface WechatGroup {
  id: string
  name: string
  avatar?: string
  serviceAccount: {
    id: string
    name: string
    avatar?: string
  }
}

export interface ContentLibrary {
  id: string
  name: string
  targets: {
    id: string
    avatar?: string
  }[]
}
