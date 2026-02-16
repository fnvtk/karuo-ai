"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  RefreshCw,
  Brain,
  Database,
  Target,
  Clock,
  Activity,
  TrendingUp,
  Zap,
  CheckCircle,
  AlertCircle,
  BarChart3,
} from "lucide-react"
import { useRouter } from "next/navigation"

// AI模型数据类型定义
interface AIModelData {
  id: string
  name: string
  type: string
  status: "active" | "training" | "idle"
  accuracy: number
  trainingHours: number
  dataSize: number
  lastUpdated: string
  version: string
}

// 模拟AI模型数据
const mockAIModels: AIModelData[] = [
  {
    id: "1",
    name: "客户意向识别模型",
    type: "分类模型",
    status: "active",
    accuracy: 94.2,
    trainingHours: 156,
    dataSize: 125000,
    lastUpdated: "2025/2/9 14:30:00",
    version: "v2.1.3",
  },
  {
    id: "2",
    name: "内容推荐算法",
    type: "推荐模型",
    status: "active",
    accuracy: 89.7,
    trainingHours: 203,
    dataSize: 89000,
    lastUpdated: "2025/2/8 22:15:00",
    version: "v1.8.2",
  },
  {
    id: "3",
    name: "用户画像分析",
    type: "聚类模型",
    status: "training",
    accuracy: 91.5,
    trainingHours: 87,
    dataSize: 67000,
    lastUpdated: "2025/2/9 09:45:00",
    version: "v3.0.1",
  },
  {
    id: "4",
    name: "智能回复生成",
    type: "生成模型",
    status: "active",
    accuracy: 87.3,
    trainingHours: 298,
    dataSize: 156000,
    lastUpdated: "2025/2/7 16:20:00",
    version: "v1.5.7",
  },
  {
    id: "5",
    name: "风险评估模型",
    type: "预测模型",
    status: "idle",
    accuracy: 92.8,
    trainingHours: 134,
    dataSize: 45000,
    lastUpdated: "2025/2/6 11:30:00",
    version: "v2.3.1",
  },
]

// 模拟总体统计数据
const mockOverallStats = {
  totalTrainingData: 482000, // 总训练数据量
  averageAccuracy: 91.1, // 平均准确率
  totalTrainingHours: 878, // 总训练小时数
  activeModels: 8, // 活跃模型个数
  totalModels: 12, // 总模型数
  todayTrainingHours: 24, // 今日训练小时数
  weeklyGrowth: 15.3, // 本周增长率
}

export default function AIModelsPage() {
  const router = useRouter()
  const [models, setModels] = useState<AIModelData[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(mockOverallStats)

  // 加载AI模型数据
  const loadAIModels = async () => {
    try {
      setLoading(true)
      // 模拟API调用延迟
      await new Promise((resolve) => setTimeout(resolve, 800))
      setModels(mockAIModels)
      setStats(mockOverallStats)
    } catch (error) {
      console.error("加载AI模型数据失败:", error)
      setModels(mockAIModels)
      setStats(mockOverallStats)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAIModels()
  }, [])

  // 处理返回
  const handleBack = () => {
    router.back()
  }

  // 处理刷新
  const handleRefresh = () => {
    loadAIModels()
  }

  // 获取状态文本和颜色
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "active":
        return { text: "运行中", color: "bg-green-100 text-green-700", icon: <CheckCircle className="h-3 w-3" /> }
      case "training":
        return { text: "训练中", color: "bg-blue-100 text-blue-700", icon: <Activity className="h-3 w-3" /> }
      case "idle":
        return { text: "空闲", color: "bg-gray-100 text-gray-700", icon: <AlertCircle className="h-3 w-3" /> }
      default:
        return { text: "未知", color: "bg-gray-100 text-gray-700", icon: <AlertCircle className="h-3 w-3" /> }
    }
  }

  // 格式化数据大小
  const formatDataSize = (size: number) => {
    if (size >= 1000000) {
      return `${(size / 1000000).toFixed(1)}M`
    } else if (size >= 1000) {
      return `${(size / 1000).toFixed(1)}K`
    }
    return size.toString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">加载AI模型数据中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* 头部导航 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <Brain className="h-6 w-6 text-cyan-500" />
              <h1 className="text-lg font-medium">AI模型数据</h1>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* 核心数据概览 */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* 训练数据总量 */}
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Database className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">训练数据</p>
                  <p className="text-lg font-bold text-blue-600">{formatDataSize(stats.totalTrainingData)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 平均准确率 */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">平均准确率</p>
                  <p className="text-lg font-bold text-green-600">{stats.averageAccuracy}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 训练小时数 */}
          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">训练小时数</p>
                  <p className="text-lg font-bold text-purple-600">{stats.totalTrainingHours}h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 活跃模型个数 */}
          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Zap className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">活跃模型</p>
                  <p className="text-lg font-bold text-orange-600">{stats.activeModels}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 详细统计卡片 */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-gray-600" />
              <span>详细统计</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalModels}</p>
                <p className="text-xs text-gray-500">总模型数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.todayTrainingHours}h</p>
                <p className="text-xs text-gray-500">今日训练</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <p className="text-2xl font-bold text-green-600">+{stats.weeklyGrowth}%</p>
                </div>
                <p className="text-xs text-gray-500">本周增长</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 模型列表 */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="active">运行中</TabsTrigger>
            <TabsTrigger value="training">训练中</TabsTrigger>
            <TabsTrigger value="idle">空闲</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {models.map((model) => {
              const statusInfo = getStatusInfo(model.status)
              return (
                <Card key={model.id} className="bg-white">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* 模型基本信息 */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{model.name}</h3>
                          <p className="text-sm text-gray-500">
                            {model.type} • {model.version}
                          </p>
                        </div>
                        <Badge className={`${statusInfo.color} text-xs px-2 py-1 flex items-center space-x-1`}>
                          {statusInfo.icon}
                          <span>{statusInfo.text}</span>
                        </Badge>
                      </div>

                      {/* 性能指标 */}
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-lg font-semibold text-green-600">{model.accuracy}%</p>
                          <p className="text-xs text-gray-500">准确率</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-purple-600">{model.trainingHours}h</p>
                          <p className="text-xs text-gray-500">训练时长</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-blue-600">{formatDataSize(model.dataSize)}</p>
                          <p className="text-xs text-gray-500">数据量</p>
                        </div>
                      </div>

                      {/* 准确率进度条 */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>模型准确率</span>
                          <span>{model.accuracy}%</span>
                        </div>
                        <Progress value={model.accuracy} className="h-2" />
                      </div>

                      {/* 最后更新时间 */}
                      <div className="text-xs text-gray-400 text-center pt-2 border-t">
                        最后更新: {model.lastUpdated}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </TabsContent>

          <TabsContent value="active" className="space-y-3">
            {models
              .filter((m) => m.status === "active")
              .map((model) => {
                const statusInfo = getStatusInfo(model.status)
                return (
                  <Card key={model.id} className="bg-white">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{model.name}</h3>
                            <p className="text-sm text-gray-500">
                              {model.type} • {model.version}
                            </p>
                          </div>
                          <Badge className={`${statusInfo.color} text-xs px-2 py-1 flex items-center space-x-1`}>
                            {statusInfo.icon}
                            <span>{statusInfo.text}</span>
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-lg font-semibold text-green-600">{model.accuracy}%</p>
                            <p className="text-xs text-gray-500">准确率</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-purple-600">{model.trainingHours}h</p>
                            <p className="text-xs text-gray-500">训练时长</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-blue-600">{formatDataSize(model.dataSize)}</p>
                            <p className="text-xs text-gray-500">数据量</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>模型准确率</span>
                            <span>{model.accuracy}%</span>
                          </div>
                          <Progress value={model.accuracy} className="h-2" />
                        </div>
                        <div className="text-xs text-gray-400 text-center pt-2 border-t">
                          最后更新: {model.lastUpdated}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </TabsContent>

          <TabsContent value="training" className="space-y-3">
            {models
              .filter((m) => m.status === "training")
              .map((model) => {
                const statusInfo = getStatusInfo(model.status)
                return (
                  <Card key={model.id} className="bg-white">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{model.name}</h3>
                            <p className="text-sm text-gray-500">
                              {model.type} • {model.version}
                            </p>
                          </div>
                          <Badge className={`${statusInfo.color} text-xs px-2 py-1 flex items-center space-x-1`}>
                            {statusInfo.icon}
                            <span>{statusInfo.text}</span>
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-lg font-semibold text-green-600">{model.accuracy}%</p>
                            <p className="text-xs text-gray-500">准确率</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-purple-600">{model.trainingHours}h</p>
                            <p className="text-xs text-gray-500">训练时长</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-blue-600">{formatDataSize(model.dataSize)}</p>
                            <p className="text-xs text-gray-500">数据量</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>模型准确率</span>
                            <span>{model.accuracy}%</span>
                          </div>
                          <Progress value={model.accuracy} className="h-2" />
                        </div>
                        <div className="text-xs text-gray-400 text-center pt-2 border-t">
                          最后更新: {model.lastUpdated}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </TabsContent>

          <TabsContent value="idle" className="space-y-3">
            {models
              .filter((m) => m.status === "idle")
              .map((model) => {
                const statusInfo = getStatusInfo(model.status)
                return (
                  <Card key={model.id} className="bg-white">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{model.name}</h3>
                            <p className="text-sm text-gray-500">
                              {model.type} • {model.version}
                            </p>
                          </div>
                          <Badge className={`${statusInfo.color} text-xs px-2 py-1 flex items-center space-x-1`}>
                            {statusInfo.icon}
                            <span>{statusInfo.text}</span>
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-lg font-semibold text-green-600">{model.accuracy}%</p>
                            <p className="text-xs text-gray-500">准确率</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-purple-600">{model.trainingHours}h</p>
                            <p className="text-xs text-gray-500">训练时长</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-blue-600">{formatDataSize(model.dataSize)}</p>
                            <p className="text-xs text-gray-500">数据量</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>模型准确率</span>
                            <span>{model.accuracy}%</span>
                          </div>
                          <Progress value={model.accuracy} className="h-2" />
                        </div>
                        <div className="text-xs text-gray-400 text-center pt-2 border-t">
                          最后更新: {model.lastUpdated}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
