"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Edit, Phone, MessageSquare, FileText } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface ScenarioDetail {
  id: string
  name: string
  type: string
  status: "active" | "inactive" | "draft"
  createdAt: string
  description: string
  devices: {
    total: number
    online: number
  }
  stats: {
    total: number
    today: number
    conversion: number
    history: Array<{
      date: string
      value: number
    }>
  }
  settings: {
    [key: string]: any
  }
}

export default function ScenarioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { channel, id } = params

  const [isLoading, setIsLoading] = useState(true)
  const [scenario, setScenario] = useState<ScenarioDetail | null>(null)

  useEffect(() => {
    // 模拟API请求
    const fetchScenarioDetail = async () => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 生成过去30天的数据
      const historyData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (29 - i))
        return {
          date: date.toISOString().split("T")[0],
          value: Math.floor(Math.random() * 20) + 1,
        }
      })

      const mockScenario: ScenarioDetail = {
        id: id as string,
        name: `${channel === "haibao" ? "海报" : channel === "douyin" ? "抖音" : channel === "phone" ? "电话" : "其他"}获客计划`,
        type: channel as string,
        status: "active",
        createdAt: "2023-05-15",
        description: "这是一个用于获取新客户的场景获客计划",
        devices: {
          total: 12,
          online: 8,
        },
        stats: {
          total: 342,
          today: 18,
          conversion: 0.32,
          history: historyData,
        },
        settings: {
          greeting: "你好，请通过我的好友请求",
          remarkType: "phone",
          addFriendInterval: 60,
          enableMessage: true,
          message: "您好，很高兴认识您！",
          delayTime: 5,
        },
      }

      setScenario(mockScenario)
      setIsLoading(false)
    }

    fetchScenarioDetail()
  }, [id, channel])

  const handleToggleStatus = () => {
    if (!scenario) return

    const newStatus = scenario.status === "active" ? "inactive" : "active"
    setScenario({ ...scenario, status: newStatus as "active" | "inactive" | "draft" })

    toast({
      title: `${newStatus === "active" ? "启用" : "停用"}成功`,
      description: `场景获客计划已${newStatus === "active" ? "启用" : "停用"}`,
    })
  }

  const handleEdit = () => {
    router.push(`/scenarios/${channel}/edit/${id}`)
  }

  const getScenarioTypeIcon = () => {
    switch (channel) {
      case "phone":
        return <Phone className="h-5 w-5" />
      case "order":
        return <FileText className="h-5 w-5" />
      case "douyin":
        return <MessageSquare className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getScenarioTypeName = () => {
    switch (channel) {
      case "haibao":
        return "海报获客"
      case "douyin":
        return "抖音获客"
      case "phone":
        return "电话获客"
      case "xiaohongshu":
        return "小红书获客"
      case "order":
        return "订单获客"
      case "weixinqun":
        return "微信群获客"
      case "gongzhonghao":
        return "公众号获客"
      default:
        return "其他获客"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">运行中</Badge>
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">已停用</Badge>
      case "draft":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">草稿</Badge>
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 bg-gray-50">
        <div className="max-w-[390px] mx-auto bg-white min-h-screen">
          <header className="sticky top-0 z-10 bg-white border-b">
            <div className="flex items-center h-14 px-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Skeleton className="h-6 w-40 ml-2" />
            </div>
          </header>
          <div className="p-4 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!scenario) {
    return (
      <div className="flex-1 bg-gray-50">
        <div className="max-w-[390px] mx-auto bg-white min-h-screen">
          <header className="sticky top-0 z-10 bg-white border-b">
            <div className="flex items-center h-14 px-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="ml-2 text-lg font-medium">场景详情</h1>
            </div>
          </header>
          <div className="flex flex-col items-center justify-center p-4 h-[80vh]">
            <p className="text-gray-500 mb-4">未找到场景获客计划</p>
            <Button onClick={() => router.push("/scenarios")}>返回列表</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-[390px] mx-auto bg-white min-h-screen">
        <header className="sticky top-0 z-10 bg-white border-b">
          <div className="flex items-center h-14 px-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="ml-2 text-lg font-medium">{scenario.name}</h1>
            <div className="ml-auto flex items-center">
              <Switch checked={scenario.status === "active"} onCheckedChange={handleToggleStatus} className="mr-2" />
              <Button size="sm" variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-1" />
                编辑
              </Button>
            </div>
          </div>
        </header>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {getScenarioTypeIcon()}
              <span className="ml-1 text-sm text-gray-500">{getScenarioTypeName()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">创建于 {scenario.createdAt}</span>
              {getStatusBadge(scenario.status)}
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">获客数据</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 p-2 rounded-lg text-center">
                  <p className="text-xs text-gray-500">总获客</p>
                  <p className="text-lg font-semibold">{scenario.stats.total}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg text-center">
                  <p className="text-xs text-gray-500">今日</p>
                  <p className="text-lg font-semibold">{scenario.stats.today}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg text-center">
                  <p className="text-xs text-gray-500">转化率</p>
                  <p className="text-lg font-semibold">{(scenario.stats.conversion * 100).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">获客趋势</CardTitle>
              <CardDescription className="text-xs">过去30天的获客数量</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ChartContainer
                  config={{
                    value: {
                      label: "获客数量",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={scenario.stats.history} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="value" stroke="var(--color-value)" name="获客数量" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">设备信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">总设备数</span>
                  <span className="font-medium">{scenario.devices.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">在线设备</span>
                  <span className="font-medium">{scenario.devices.online}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">设备在线率</span>
                  <span className="font-medium">
                    {((scenario.devices.online / scenario.devices.total) * 100).toFixed(1)}%
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  size="sm"
                  onClick={() => router.push(`/scenarios/${channel}/devices`)}
                >
                  查看设备详情
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">场景设置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {scenario.settings.greeting && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">招呼语</span>
                    <span className="font-medium">{scenario.settings.greeting}</span>
                  </div>
                )}
                {scenario.settings.remarkType && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">备注类型</span>
                    <span className="font-medium">
                      {scenario.settings.remarkType === "phone"
                        ? "手机号"
                        : scenario.settings.remarkType === "nickname"
                          ? "昵称"
                          : "来源"}
                    </span>
                  </div>
                )}
                {scenario.settings.addFriendInterval && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">添加频率</span>
                    <span className="font-medium">{scenario.settings.addFriendInterval} 秒/次</span>
                  </div>
                )}
                {scenario.settings.enableMessage && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">自动消息</span>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">已启用</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">消息内容</span>
                      <span className="font-medium">{scenario.settings.message}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">发送延迟</span>
                      <span className="font-medium">{scenario.settings.delayTime} 分钟</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
