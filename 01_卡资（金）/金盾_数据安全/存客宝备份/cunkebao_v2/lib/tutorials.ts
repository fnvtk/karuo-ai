import type { PageTutorial, TutorialVideo } from "@/types/tutorial"

// 模拟后台配置的教程视频数据
export const tutorialConfig: PageTutorial[] = [
  {
    pageId: "home",
    videos: [
      {
        id: "home-intro",
        title: "存客宝使用介绍",
        description: "了解存客宝的主要功能和基本操作流程",
        url: "/videos/home-intro.mp4",
        thumbnailUrl: "/placeholder.svg?height=360&width=640",
      },
    ],
  },
  {
    pageId: "scenarios/xiaohongshu",
    videos: [
      {
        id: "xiaohongshu-intro",
        title: "小红书获客功能介绍",
        description: "学习如何使用小红书场景获取精准客户",
        url: "/videos/xiaohongshu-intro.mp4",
        thumbnailUrl: "/placeholder.svg?height=360&width=640",
      },
      {
        id: "xiaohongshu-setup",
        title: "小红书获客配置教程",
        description: "详细了解小红书获客的各项配置选项",
        url: "/videos/xiaohongshu-setup.mp4",
        thumbnailUrl: "/placeholder.svg?height=360&width=640",
      },
    ],
  },
  {
    pageId: "scenarios/douyin",
    videos: [
      {
        id: "douyin-intro",
        title: "抖音获客功能介绍",
        description: "学习如何使用抖音场景获取精准客户",
        url: "/videos/douyin-intro.mp4",
        thumbnailUrl: "/placeholder.svg?height=360&width=640",
      },
    ],
  },
  // ... 其他页面的视频配置
]

export function getPageTutorials(path: string): TutorialVideo[] {
  // 移除开头的斜杠并标准化路径
  const normalizedPath = path.replace(/^\/+/, "")

  // 查找匹配的页面教程
  const pageTutorial = tutorialConfig.find((config) => normalizedPath.startsWith(config.pageId))

  return pageTutorial?.videos || []
}
