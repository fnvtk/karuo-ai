export interface ContentLibrary {
  id: string
  name: string
  source: string
  creator: string
  contentCount: number
  lastUpdated: string
  type: "moments" | "chat" | "group"
  status: "active" | "inactive"
  items: ContentItem[]
}

export interface ContentItem {
  id: string
  title: string
  content: string
  type: "text" | "image" | "video"
  images?: string[]
  video?: string
  createTime: string
  publishTime?: string
  status: "pending" | "published" | "failed"
}

export interface Tag {
  id: string
  name: string
  description?: string
  contentCount: number
  lastSync: string
  settings: {
    syncInterval: number
    timeRange: {
      start: string
      end: string
    }
    dailyLimit: number
    accountType: "business" | "personal"
    enabled: boolean
  }
}
