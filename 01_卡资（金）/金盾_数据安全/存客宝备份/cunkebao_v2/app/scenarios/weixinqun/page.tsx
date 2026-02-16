"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Plus, Search, RefreshCw, MoreVertical, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"

// 模拟数据 - 微信群获客
const mockWechatGroupPlans = [
  {
    id: "202588",
    name: "产品推广群计划",
    status: "running",
    stats: {
      devices: 2,
      acquired: 0,
      added: 0,
      passRate: 0,
    },
    lastExecution: "--",
  },
  {
    id: "202587",
    name: "用户交流群计划",
    status: "paused",
    stats: {
      devices: 5,
      acquired: 680,
      added: 612,
      passRate: 90,
    },
    lastExecution: "2024-02-08 18:30",
  },
  {
    id: "202586",
    name: "新人欢迎群计划",
    status: "running",
    stats: {
      devices: 12,
      acquired: 2100,
      added: 1890,
      passRate: 90,
    },
    lastExecution: "2024-02-09 15:45",
  },
]

export default function WechatGroupPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [plans, setPlans] = useState(mockWechatGroupPlans)

  const getStatusColor = (status: string) => {
    return status === "running" ? "bg-green-500 text-white" : "bg-gray-400 text-white"
  }

  const getStatusText = (status: string) => {
    return status === "running" ? "进行中" : "已暂停"
  }

  const handleRefresh = () => {
    // 模拟刷新数据
    toast({
      title: "刷新成功",
      description: "数据已更新",
    })
  }

  const handleMenuAction = (action: string, planId: string) => {
    switch (action) {
      case "edit":
        router.push(`/scenarios/weixinqun/edit/${planId}`)
        break
      case "copy":
        const originalPlan = plans.find((p) => p.id === planId)
        if (originalPlan) {
          const newPlan = {
            ...originalPlan,
            id: `${Date.now()}`,
            name: `${originalPlan.name} - 副本`,
            status: "paused" as const,
            stats: { ...originalPlan.stats, acquired: 0, added: 0, passRate: 0 },
          }
          setPlans([...plans, newPlan])
          toast({
            title: "复制成功",
            description: "计划已复制",
          })
        }
        break
      case "delete":
        if (confirm("确定要删除这个计划吗？")) {
          setPlans(plans.filter((p) => p.id !== planId))
          toast({
            title: "删除成功",
            description: "计划已删除",
          })
        }
        break
    }
  }

  const filteredPlans = plans.filter(
    (plan) =>
      plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.id.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5 text-blue-500" />
            </Button>
            <h1 className="ml-2 text-lg font-medium text-blue-500">微信群获客</h1>
          </div>
          <Button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            onClick={() => router.push("/scenarios/weixinqun/new")}
          >
            <Plus className="h-4 w-4 mr-1" />
            新建计划
          </Button>
        </div>
      </header>

      {/* 搜索栏 */}
      <div className="p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索计划名称"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-gray-200 rounded-full"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            className="rounded-full bg-white border-gray-200"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 计划列表 */}
      <div className="flex-1 px-4 pb-20">
        <div className="space-y-4">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="bg-white rounded-xl shadow-sm border-0">
              <CardContent className="p-4">
                {/* 计划标题行 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900">{plan.id}</h3>
                    <Badge className={`${getStatusColor(plan.status)} px-2 py-1 text-xs rounded-full`}>
                      {getStatusText(plan.status)}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleMenuAction("edit", plan.id)}>编辑计划</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleMenuAction("copy", plan.id)}>复制计划</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleMenuAction("delete", plan.id)} className="text-red-600">
                        删除计划
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* 统计数据网格 */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">设备数</div>
                    <div className="text-2xl font-bold text-gray-900">{plan.stats.devices}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">已获客</div>
                    <div className="text-2xl font-bold text-gray-900">{plan.stats.acquired}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">已添加</div>
                    <div className="text-2xl font-bold text-gray-900">{plan.stats.added}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">通过率</div>
                    <div className="text-2xl font-bold text-gray-900">{plan.stats.passRate}%</div>
                  </div>
                </div>

                {/* 底部信息 */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <span>上次执行: {plan.lastExecution}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 空状态 */}
        {filteredPlans.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Plus className="h-8 w-8" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">暂无计划</h3>
            <p className="text-gray-500 mb-6">{searchTerm ? "没有找到匹配的计划" : "创建您的第一个微信群获客计划"}</p>
            {!searchTerm && (
              <Button
                className="bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => router.push("/scenarios/weixinqun/new")}
              >
                <Plus className="h-4 w-4 mr-1" />
                新建计划
              </Button>
            )}
          </div>
        )}

        {/* 分页器 */}
        {filteredPlans.length > 0 && (
          <div className="flex justify-center mt-6">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button className="bg-blue-500 text-white h-8 w-8 rounded">1</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
