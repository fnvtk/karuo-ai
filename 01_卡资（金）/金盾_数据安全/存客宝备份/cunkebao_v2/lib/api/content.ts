// 内容库管理API模块
import { apiClient } from "./client"

// 内容数据类型定义
export interface Content {
  id: string
  title: string
  type: "text" | "image" | "video" | "audio" | "document"
  content: string
  thumbnail?: string
  fileUrl?: string
  tags: string[]
  category: string
  status: "draft" | "published" | "archived"
  viewCount: number
  useCount: number
  createTime: string
  updateTime: string
  creator: string
  size?: number
  duration?: number
}

export interface ContentStats {
  total: number
  published: number
  draft: number
  archived: number
  totalViews: number
  totalUses: number
}

export interface CreateContentRequest {
  title: string
  type: "text" | "image" | "video" | "audio" | "document"
  content: string
  tags?: string[]
  category: string
  fileUrl?: string
}

// 获取内容列表
export async function getContents(): Promise<Content[]> {
  try {
    const response = await apiClient.get("/v1/content")
    return response.data || []
  } catch (error) {
    console.error("获取内容列表失败:", error)
    // 返回模拟数据作为降级处理
    return [
      {
        id: "1",
        title: "产品介绍文案",
        type: "text",
        content: "这是一个优秀的产品介绍文案...",
        tags: ["产品", "介绍", "营销"],
        category: "营销文案",
        status: "published",
        viewCount: 1250,
        useCount: 89,
        createTime: "2024-01-01 10:00:00",
        updateTime: "2024-01-07 14:30:00",
        creator: "内容团队",
      },
      {
        id: "2",
        title: "品牌宣传图片",
        type: "image",
        content: "品牌宣传图片素材",
        thumbnail: "/placeholder.svg?height=100&width=100",
        fileUrl: "/placeholder.svg?height=400&width=600",
        tags: ["品牌", "宣传", "图片"],
        category: "视觉素材",
        status: "published",
        viewCount: 890,
        useCount: 156,
        createTime: "2024-01-02 11:00:00",
        updateTime: "2024-01-07 13:45:00",
        creator: "设计团队",
        size: 2048000,
      },
      {
        id: "3",
        title: "产品演示视频",
        type: "video",
        content: "产品功能演示视频",
        thumbnail: "/placeholder.svg?height=100&width=100",
        fileUrl: "/placeholder.mp4",
        tags: ["产品", "演示", "视频"],
        category: "视频素材",
        status: "published",
        viewCount: 567,
        useCount: 78,
        createTime: "2024-01-03 09:30:00",
        updateTime: "2024-01-07 10:20:00",
        creator: "视频团队",
        size: 15728640,
        duration: 120,
      },
    ]
  }
}

// 获取内容统计
export async function getContentStats(): Promise<ContentStats> {
  try {
    const response = await apiClient.get("/v1/content/stats")
    return response.data || { total: 0, published: 0, draft: 0, archived: 0, totalViews: 0, totalUses: 0 }
  } catch (error) {
    console.error("获取内容统计失败:", error)
    return {
      total: 156,
      published: 128,
      draft: 23,
      archived: 5,
      totalViews: 45620,
      totalUses: 2340,
    }
  }
}

// 创建内容
export async function createContent(content: CreateContentRequest): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await apiClient.post("/v1/content", content)
    return { success: true, message: "内容创建成功" }
  } catch (error) {
    console.error("创建内容失败:", error)
    return { success: false, message: "创建内容失败" }
  }
}

// 删除内容
export async function deleteContent(contentId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await apiClient.delete(`/v1/content/${contentId}`)
    return { success: true, message: "内容删除成功" }
  } catch (error) {
    console.error("删除内容失败:", error)
    return { success: false, message: "删除内容失败" }
  }
}

// 更新内容
export async function updateContent(
  contentId: string,
  updates: Partial<CreateContentRequest>,
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await apiClient.put(`/v1/content/${contentId}`, updates)
    return { success: true, message: "内容更新成功" }
  } catch (error) {
    console.error("更新内容失败:", error)
    return { success: false, message: "更新内容失败" }
  }
}
