"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus, FileText, BarChart2, Mail, Tag } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

interface StrategyPlan {
  id: string
  name: string
  deviceIds: string[]
  deviceNames: string[]
  status: "running" | "completed" | "failed"
  createdAt: string
  completedAt?: string
  strategyType: "jd" | "yisi" | "database" | "custom"
  strategyName: string
  trafficPoolSize: number
  optimizedUsers: number
}

export default function AIStrategyPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<StrategyPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 模拟加载数据
    const fetchPlans = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockPlans: StrategyPlan[] = [
        {
          id: "plan-1",
          name: "京东会员优化",
          deviceIds: ["device-1", "device-2"],
          deviceNames: ["设备1", "设备2"],
          status: "completed",
          createdAt: "2023-12-15T10:30:00Z",
          completedAt: "2023-12-15T11:45:00Z",
          strategyType: "jd",
          strategyName: "京东会员识别",
          trafficPoolSize: 287,
          optimizedUsers: 142,
        },
        {
          id: "plan-2",
          name: "易思API用户分析",
          deviceIds: ["device-3"],
          deviceNames: ["设备3"],
          status: "running",
          createdAt: "2023-12-16T09:15:00Z",
          strategyType: "yisi",
          strategyName: "易思用户画像",
          trafficPoolSize: 156,
          optimizedUsers: 0,
        },
        {
          id: "plan-3",
          name: "数据库客户匹配",
          deviceIds: ["device-1", "device-4"],
          deviceNames: ["设备1", "设备4"],
          status: "completed",
          createdAt: "2023-12-14T14:20:00Z",
          completedAt: "2023-12-14T16:10:00Z",
          strategyType: "database",
          strategyName: "CRM客户匹配",
          trafficPoolSize: 423,
          optimizedUsers: 215,
        },
      ]

      setPlans(mockPlans)
      setIsLoading(false)
    }

    fetchPlans()
  }, [])

  const getStatusBadge = (status: StrategyPlan["status"]) => {
    switch (status) {
      case "running":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            执行中
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
            已完成
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
            失败
          </Badge>
        )
    }
  }

  const getStrategyLabel = (type: StrategyPlan["strategyType"]) => {
    switch (type) {
      case "jd":
        return "京东会员"
      case "yisi":
        return "易思接口"
      case "database":
        return "数据库匹配"
      case "custom":
        return "自定义策略"
    }
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">AI策略优化</h1>
        </div>
        <Button onClick={() => router.push("/workspace/ai-strategy/new")} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          新建优化策略
        </Button>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="all">全部策略</TabsTrigger>
              <TabsTrigger value="running">执行中</TabsTrigger>
              <TabsTrigger value="completed">已完成</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
                </div>
              ) : plans.length > 0 ? (
                plans.map((plan) => (
                  <Card key={plan.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{plan.name}</CardTitle>
                          <CardDescription className="mt-1">设备: {plan.deviceNames.join(", ")}</CardDescription>
                        </div>
                        {getStatusBadge(plan.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">策略类型</span>
                          <span className="font-medium">{getStrategyLabel(plan.strategyType)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">策略名称</span>
                          <span className="font-medium">{plan.strategyName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">流量池大小</span>
                          <span className="font-medium">{plan.trafficPoolSize} 用户</span>
                        </div>
                        {plan.status === "completed" && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">优化用户数</span>
                            <span className="font-medium">{plan.optimizedUsers} 用户</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">创建时间</span>
                          <span>{new Date(plan.createdAt).toLocaleString()}</span>
                        </div>
                        {plan.completedAt && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">完成时间</span>
                            <span>{new Date(plan.completedAt).toLocaleString()}</span>
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                          {plan.status === "completed" && (
                            <>
                              <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <Tag className="h-4 w-4" />
                                <span>导入标签</span>
                              </Button>
                              <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                <span>发送报告</span>
                              </Button>
                              <Link href={`/workspace/ai-strategy/${plan.id}`}>
                                <Button size="sm" className="flex items-center gap-1">
                                  <BarChart2 className="h-4 w-4" />
                                  <span>查看报告</span>
                                </Button>
                              </Link>
                            </>
                          )}
                          {plan.status === "running" && (
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span>查看进度</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <BarChart2 className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">暂无优化策略</h3>
                  <p className="text-gray-500 mb-4">创建一个新的AI策略优化计划来开始</p>
                  <Button onClick={() => router.push("/workspace/ai-strategy/new")}>新建优化策略</Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="running" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
                </div>
              ) : plans.filter((p) => p.status === "running").length > 0 ? (
                plans
                  .filter((p) => p.status === "running")
                  .map((plan) => (
                    <Card key={plan.id} className="hover:shadow-md transition-shadow">
                      {/* 与上面相同的卡片内容 */}
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{plan.name}</CardTitle>
                            <CardDescription className="mt-1">设备: {plan.deviceNames.join(", ")}</CardDescription>
                          </div>
                          {getStatusBadge(plan.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">策略类型</span>
                            <span className="font-medium">{getStrategyLabel(plan.strategyType)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">策略名称</span>
                            <span className="font-medium">{plan.strategyName}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">流量池大小</span>
                            <span className="font-medium">{plan.trafficPoolSize} 用户</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">创建时间</span>
                            <span>{new Date(plan.createdAt).toLocaleString()}</span>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span>查看进度</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border">
                  <p className="text-gray-500">暂无执行中的优化策略</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
                </div>
              ) : plans.filter((p) => p.status === "completed").length > 0 ? (
                plans
                  .filter((p) => p.status === "completed")
                  .map((plan) => (
                    <Card key={plan.id} className="hover:shadow-md transition-shadow">
                      {/* 与上面相同的卡片内容 */}
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{plan.name}</CardTitle>
                            <CardDescription className="mt-1">设备: {plan.deviceNames.join(", ")}</CardDescription>
                          </div>
                          {getStatusBadge(plan.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">策略类型</span>
                            <span className="font-medium">{getStrategyLabel(plan.strategyType)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">策略名称</span>
                            <span className="font-medium">{plan.strategyName}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">流量池大小</span>
                            <span className="font-medium">{plan.trafficPoolSize} 用户</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">优化用户数</span>
                            <span className="font-medium">{plan.optimizedUsers} 用户</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">创建时间</span>
                            <span>{new Date(plan.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">完成时间</span>
                            <span>{new Date(plan.completedAt!).toLocaleString()}</span>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                              <Tag className="h-4 w-4" />
                              <span>导入标签</span>
                            </Button>
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              <span>发送报告</span>
                            </Button>
                            <Link href={`/workspace/ai-strategy/${plan.id}`}>
                              <Button size="sm" className="flex items-center gap-1">
                                <BarChart2 className="h-4 w-4" />
                                <span>查看报告</span>
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border">
                  <p className="text-gray-500">暂无已完成的优化策略</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
