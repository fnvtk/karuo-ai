"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChevronLeft, Play, Pause, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { BasicSettings } from "@/app/scenarios/new/steps/BasicSettings"
import { toast } from "@/components/ui/use-toast"

export default function EditPlanPage() {
  const router = useRouter()
  const params = useParams()
  const { channel, id } = params

  const [planData, setPlanData] = useState({
    id: id as string,
    name: "获客计划A",
    status: "running",
    stats: {
      devices: 8,
      acquired: 196,
      added: 196,
      passRate: 100,
    },
    lastExecution: "2024-02-09 15:30",
    nextExecution: "2024-02-09 17:25:36",
    settings: {
      planName: "获客计划A",
      scenario: channel as string,
      actionType: "click_receive",
      enabled: true,
    },
  })

  const [isRunning, setIsRunning] = useState(planData.status === "running")

  const handleToggleStatus = () => {
    const newStatus = isRunning ? "paused" : "running"
    setIsRunning(!isRunning)
    setPlanData((prev) => ({ ...prev, status: newStatus }))

    toast({
      title: isRunning ? "计划已暂停" : "计划已启动",
      description: `"${planData.name}" ${isRunning ? "已暂停执行" : "已开始执行"}`,
    })
  }

  const handleDelete = () => {
    if (confirm("确定要删除这个计划吗？")) {
      toast({
        title: "计划已删除",
        description: `"${planData.name}" 已被删除`,
      })
      router.push(`/scenarios/${channel}`)
    }
  }

  const handleSettingsUpdate = (newSettings: any) => {
    setPlanData((prev) => ({
      ...prev,
      settings: newSettings,
      name: newSettings.planName,
    }))
  }

  const getStatusColor = (status: string) => {
    return status === "running" ? "bg-green-500 text-white" : "bg-gray-400 text-white"
  }

  const getStatusText = (status: string) => {
    return status === "running" ? "进行中" : "已暂停"
  }

  const getChannelName = (channel: string) => {
    const channelNames: { [key: string]: string } = {
      douyin: "抖音获客",
      weixinqun: "微信群获客",
      payment: "付款码获客",
      poster: "海报获客",
      phone: "电话获客",
    }
    return channelNames[channel] || "获客"
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5 text-blue-500" />
            </Button>
            <h1 className="ml-2 text-lg font-medium text-blue-500">编辑{getChannelName(channel as string)}计划</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleToggleStatus}>
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  暂停
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  启动
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700 bg-transparent"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              删除
            </Button>
          </div>
        </div>
      </header>

      {/* 内容区域 */}
      <div className="flex-1 p-4">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">计划概览</TabsTrigger>
            <TabsTrigger value="settings">计划设置</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* 计划信息卡片 */}
            <Card className="bg-white rounded-xl shadow-sm border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{planData.name}</CardTitle>
                  <Badge className={`${getStatusColor(planData.status)} px-2 py-1 text-xs rounded-full`}>
                    {getStatusText(planData.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* 统计数据网格 */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">设备数</div>
                    <div className="text-2xl font-bold text-gray-900">{planData.stats.devices}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">已获客</div>
                    <div className="text-2xl font-bold text-gray-900">{planData.stats.acquired}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">已添加</div>
                    <div className="text-2xl font-bold text-gray-900">{planData.stats.added}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">通过率</div>
                    <div className="text-2xl font-bold text-gray-900">{planData.stats.passRate}%</div>
                  </div>
                </div>

                {/* 执行时间信息 */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div>上次执行: {planData.lastExecution}</div>
                  <div>下次执行: {planData.nextExecution}</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <BasicSettings data={planData.settings} onUpdate={handleSettingsUpdate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
