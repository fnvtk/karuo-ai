"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import {
  ThumbsUp,
  Clock,
  Send,
  Users,
  Share2,
  MessageSquare,
  BarChart3,
  Target,
  TrendingUp,
  Brain,
  BookOpen,
} from "lucide-react"

// 功能项数据类型
interface WorkspaceFunction {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  path: string
  isNew?: boolean
  color: string
  bgColor: string
}

// 常用功能数据 - 添加分销功能入口
const commonFunctions: WorkspaceFunction[] = [
  {
    id: "auto-like",
    title: "自动点赞",
    description: "智能自动点赞互动",
    icon: <ThumbsUp className="w-6 h-6" />,
    path: "/workspace/auto-like",
    isNew: true,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  {
    id: "moments-sync",
    title: "朋友圈同步",
    description: "自动同步朋友圈内容",
    icon: <Clock className="w-6 h-6" />,
    path: "/workspace/moments-sync",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    id: "group-push",
    title: "群消息推送",
    description: "智能群发助手",
    icon: <Send className="w-6 h-6" />,
    path: "/workspace/group-push",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    id: "auto-group",
    title: "自动建群",
    description: "智能拉好友建群",
    icon: <Users className="w-6 h-6" />,
    path: "/workspace/auto-group",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    id: "traffic-distribution",
    title: "流量分发",
    description: "管理流量分发和分配",
    icon: <Share2 className="w-6 h-6" />,
    path: "/workspace/traffic-distribution",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "ai-assistant",
    title: "AI对话助手",
    description: "智能回复，提高互动质量",
    icon: <MessageSquare className="w-6 h-6" />,
    path: "/workspace/ai-assistant",
    isNew: true,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
]

// AI智能助手功能数据
const aiFunctions: WorkspaceFunction[] = [
  {
    id: "ai-analyzer",
    title: "AI数据分析",
    description: "智能分析客户行为特征",
    icon: <BarChart3 className="w-6 h-6" />,
    path: "/workspace/ai-analyzer",
    isNew: true,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "ai-strategy",
    title: "AI策略优化",
    description: "智能优化获客策略",
    icon: <Target className="w-6 h-6" />,
    path: "/workspace/ai-strategy",
    isNew: true,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
  },
  {
    id: "ai-prediction",
    title: "AI销售预测",
    description: "智能预测销售趋势",
    icon: <TrendingUp className="w-6 h-6" />,
    path: "/workspace/ai-prediction",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  {
    id: "ai-models",
    title: "AI模型数据",
    description: "查看AI模型训练和性能数据",
    icon: <Brain className="w-6 h-6" />,
    path: "/workspace/ai-models",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
  },
  {
    id: "ai-knowledge-base",
    title: "AI知识库",
    description: "管理AI助手的知识资料",
    icon: <BookOpen className="w-6 h-6" />,
    path: "/workspace/ai-knowledge-base",
    isNew: true,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
]

export default function WorkspacePage() {
  const router = useRouter()
  const [accessStats, setAccessStats] = useState<Record<string, number>>({})

  // 记录功能访问
  const recordAccess = async (functionId: string) => {
    try {
      // 这里可以调用API记录访问统计
      setAccessStats((prev) => ({
        ...prev,
        [functionId]: (prev[functionId] || 0) + 1,
      }))
    } catch (error) {
      console.error("记录访问失败:", error)
    }
  }

  // 处理功能点击
  const handleFunctionClick = (func: WorkspaceFunction) => {
    recordAccess(func.id)
    router.push(func.path)
  }

  // 功能卡片组件
  const FunctionCard = ({ func }: { func: WorkspaceFunction }) => (
    <Card
      className="bg-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border-0"
      onClick={() => handleFunctionClick(func)}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-xl ${func.bgColor}`}>
              <div className={func.color}>{func.icon}</div>
            </div>
            {func.isNew && <Badge className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">New</Badge>}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">{func.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{func.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex-1 pb-16 bg-gray-50 min-h-screen">
      {/* 顶部标题 */}
      <header className="bg-white border-b">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-gray-900">工作台</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* 常用功能 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">常用功能</h2>
          <div className="grid grid-cols-2 gap-4">
            {commonFunctions.map((func) => (
              <FunctionCard key={func.id} func={func} />
            ))}
          </div>
        </section>

        {/* AI智能助手 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI智能助手</h2>
          <div className="grid grid-cols-2 gap-4">
            {aiFunctions.map((func) => (
              <FunctionCard key={func.id} func={func} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
