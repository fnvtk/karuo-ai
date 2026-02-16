"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus, FileText, BarChart2, Mail } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

interface AnalysisPlan {
  id: string
  name: string
  wechatId: string
  deviceName: string
  status: "running" | "completed" | "failed"
  createdAt: string
  completedAt?: string
  keywords: string[]
  type: "friends" | "moments" | "both" | "behavior"
}

export default function AIAnalyzerPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<AnalysisPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 模拟加载数据
    const fetchPlans = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockPlans: AnalysisPlan[] = [
        {
          id: "plan-1",
          name: "美妆用户分析",
          wechatId: "wxid_abc123",
          deviceName: "设备1",
          status: "completed",
          createdAt: "2023-12-15T10:30:00Z",
          completedAt: "2023-12-15T11:45:00Z",
          keywords: ["美妆", "护肤", "彩妆"],
          type: "both",
        },
        {
          id: "plan-2",
          name: "健身爱好者分析",
          wechatId: "wxid_fit456",
          deviceName: "设备2",
          status: "running",
          createdAt: "2023-12-16T09:15:00Z",
          keywords: ["健身", "运动", "健康"],
          type: "friends",
        },
        {
          id: "plan-3",
          name: "教育行业分析",
          wechatId: "wxid_edu789",
          deviceName: "设备3",
          status: "completed",
          createdAt: "2023-12-14T14:20:00Z",
          completedAt: "2023-12-14T16:10:00Z",
          keywords: ["教育", "培训", "学习"],
          type: "moments",
        },
        {
          id: "plan-4",
          name: "用户行为分析",
          wechatId: "wxid_beh123",
          deviceName: "设备4",
          status: "completed",
          createdAt: "2023-12-18T08:20:00Z",
          completedAt: "2023-12-18T10:15:00Z",
          keywords: ["活跃度", "互动", "转化"],
          type: "behavior",
        },
      ]

      setPlans(mockPlans)
      setIsLoading(false)
    }

    fetchPlans()
  }, [])

  const getStatusBadge = (status: AnalysisPlan["status"]) => {
    switch (status) {
      case "running":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            分析中
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

  const getTypeLabel = (type: AnalysisPlan["type"]) => {
    switch (type) {
      case "friends":
        return "好友信息分析"
      case "moments":
        return "朋友圈内容分析"
      case "both":
        return "综合分析"
      case "behavior":
        return "用户行为分析"
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
          <h1 className="text-xl font-semibold">AI数据分析</h1>
        </div>
        <Button onClick={() => router.push("/workspace/ai-analyzer/new")} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          新建分析计划
        </Button>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="all">全部计划</TabsTrigger>
              <TabsTrigger value="running">进行中</TabsTrigger>
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
                          <CardDescription className="mt-1">
                            设备: {plan.deviceName} | 微信号: {plan.wechatId}
                          </CardDescription>
                        </div>
                        {getStatusBadge(plan.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">分析类型</span>
                          <span className="font-medium">{getTypeLabel(plan.type)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">关键词</span>
                          <div className="flex flex-wrap gap-1 justify-end">
                            {plan.keywords.map((keyword, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
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
                                <Mail className="h-4 w-4" />
                                <span>发送报告</span>
                              </Button>
                              <Link href={`/workspace/ai-analyzer/${plan.id}`}>
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
                  <h3 className="text-lg font-medium text-gray-900 mb-1">暂无分析计划</h3>
                  <p className="text-gray-500 mb-4">创建一个新的AI数据分析计划来开始</p>
                  <Button onClick={() => router.push("/workspace/ai-analyzer/new")}>新建分析计划</Button>
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
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{plan.name}</CardTitle>
                            <CardDescription className="mt-1">
                              设备: {plan.deviceName} | 微信号: {plan.wechatId}
                            </CardDescription>
                          </div>
                          {getStatusBadge(plan.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">分析类型</span>
                            <span className="font-medium">{getTypeLabel(plan.type)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">关键词</span>
                            <div className="flex flex-wrap gap-1 justify-end">
                              {plan.keywords.map((keyword, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
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
                  <p className="text-gray-500">暂无进行中的分析计划</p>
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
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{plan.name}</CardTitle>
                            <CardDescription className="mt-1">
                              设备: {plan.deviceName} | 微信号: {plan.wechatId}
                            </CardDescription>
                          </div>
                          {getStatusBadge(plan.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">分析类型</span>
                            <span className="font-medium">{getTypeLabel(plan.type)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">关键词</span>
                            <div className="flex flex-wrap gap-1 justify-end">
                              {plan.keywords.map((keyword, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
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
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              <span>发送报告</span>
                            </Button>
                            <Link href={`/workspace/ai-analyzer/${plan.id}`}>
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
                  <p className="text-gray-500">暂无已完成的分析计划</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
