"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Users, Database, TrendingUp, Calendar, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import BottomNav from "@/app/components/BottomNav"

interface DistributionPlan {
  id: string
  name: string
  status: "active" | "paused"
  source: string
  sourceIcon: string
  targetGroups: string[]
  totalUsers: number
  dailyAverage: number
  deviceCount: number
  poolCount: number
  lastUpdated: string
  createTime: string
  creator: string
  devices: {
    id: string
    name: string
    status: "online" | "offline"
  }[]
  pools: {
    id: string
    name: string
    count: number
    keywords: string[]
  }[]
  dailyStats: {
    date: string
    distributed: number
  }[]
}

export default function DistributionPlanDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [plan, setPlan] = useState<DistributionPlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 模拟API请求
    setTimeout(() => {
      setPlan({
        id: params.id,
        name: "抖音直播引流计划",
        status: "active",
        source: "douyin",
        sourceIcon: "🎬",
        targetGroups: ["新客户", "潜在客户"],
        totalUsers: 1250,
        dailyAverage: 85,
        deviceCount: 3,
        poolCount: 2,
        lastUpdated: "2024-03-18 10:30:00",
        createTime: "2024-03-10 08:30:00",
        creator: "admin",
        devices: [
          { id: "dev1", name: "iPhone 13", status: "online" },
          { id: "dev2", name: "Xiaomi 12", status: "online" },
          { id: "dev3", name: "Huawei P40", status: "offline" },
        ],
        pools: [
          { id: "pool1", name: "抖音流量池", count: 850, keywords: ["抖音直播", "短视频", "网红"] },
          { id: "pool2", name: "通用流量池", count: 400, keywords: ["电商", "购物", "促销"] },
        ],
        dailyStats: [
          { date: "03-15", distributed: 78 },
          { date: "03-16", distributed: 92 },
          { date: "03-17", distributed: 85 },
          { date: "03-18", distributed: 103 },
          { date: "03-19", distributed: 67 },
          { date: "03-20", distributed: 89 },
          { date: "03-21", distributed: 95 },
        ],
      })
      setLoading(false)
    }, 500)
  }, [params.id])

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 min-h-screen p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="flex-1 bg-gray-50 min-h-screen p-4">
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-gray-700">未找到计划</h2>
          <p className="text-gray-500 mt-2">无法找到ID为 {params.id} 的分发计划</p>
          <Button className="mt-4" onClick={() => router.push("/workspace/traffic-distribution")}>
            返回列表
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen pb-16">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium">计划详情</h1>
          </div>
          <Button variant="outline" onClick={() => router.push(`/workspace/traffic-distribution/${params.id}/edit`)}>
            编辑计划
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* 计划概览 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{plan.sourceIcon}</div>
                <CardTitle>{plan.name}</CardTitle>
              </div>
              <Badge variant={plan.status === "active" ? "success" : "secondary"}>
                {plan.status === "active" ? "进行中" : "已暂停"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">创建人: {plan.creator}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">创建时间: {plan.createTime.split(" ")[0]}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">最近更新: {plan.lastUpdated.split(" ")[0]}</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 mt-6 bg-gray-50 rounded-lg p-2">
              <div className="p-2 text-center">
                <div className="text-xs text-gray-500 mb-1">日均分发人数</div>
                <div className="text-lg font-semibold">{plan.dailyAverage}</div>
              </div>
              <div className="p-2 text-center">
                <div className="text-xs text-gray-500 mb-1">分发设备</div>
                <div className="text-lg font-semibold flex items-center justify-center">
                  <Users className="h-4 w-4 mr-1 text-blue-500" />
                  {plan.deviceCount}
                </div>
              </div>
              <div className="p-2 text-center">
                <div className="text-xs text-gray-500 mb-1">流量池</div>
                <div className="text-lg font-semibold flex items-center justify-center">
                  <Database className="h-4 w-4 mr-1 text-green-500" />
                  {plan.poolCount}
                </div>
              </div>
              <div className="p-2 text-center">
                <div className="text-xs text-gray-500 mb-1">日均分发量</div>
                <div className="text-lg font-semibold flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 mr-1 text-amber-500" />
                  {plan.dailyAverage}
                </div>
              </div>
              <div className="p-2 text-center">
                <div className="text-xs text-gray-500 mb-1">总流量池数量</div>
                <div className="text-lg font-semibold">{plan.totalUsers}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 详细信息标签页 */}
        <Tabs defaultValue="devices" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="devices">设备</TabsTrigger>
            <TabsTrigger value="pools">流量池</TabsTrigger>
            <TabsTrigger value="stats">分发统计</TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">分发设备 ({plan.devices.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plan.devices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{device.name}</div>
                        <div className="text-sm text-gray-500">ID: {device.id}</div>
                      </div>
                      <Badge variant={device.status === "online" ? "success" : "secondary"}>
                        {device.status === "online" ? "在线" : "离线"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pools" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">流量池 ({plan.pools.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plan.pools.map((pool) => (
                    <div key={pool.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{pool.name}</div>
                        <Badge variant="outline">{pool.count} 人</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {pool.keywords.map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-white">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">分发统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  {/* 这里可以放置图表组件，例如使用 recharts 或其他图表库 */}
                  <div className="h-full flex items-end justify-between gap-2">
                    {plan.dailyStats.map((stat, idx) => (
                      <div key={idx} className="flex flex-col items-center">
                        <div
                          className="bg-blue-500 rounded-t-sm w-10"
                          style={{ height: `${(stat.distributed / 120) * 100}%` }}
                        ></div>
                        <div className="text-xs mt-1">{stat.date}</div>
                        <div className="text-xs font-medium">{stat.distributed}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-center mt-4 text-sm text-gray-500">最近7天分发数据统计</div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  )
}
