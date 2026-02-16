"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  Plus,
  MoreHorizontal,
  Play,
  Pause,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  Users,
  Database,
  Clock,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
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
}

export default function TrafficDistributionPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<DistributionPlan[]>([
    {
      id: "1",
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
    },
    {
      id: "2",
      name: "小红书种草计划",
      status: "active",
      source: "xiaohongshu",
      sourceIcon: "📱",
      targetGroups: ["女性用户", "美妆爱好者"],
      totalUsers: 980,
      dailyAverage: 65,
      deviceCount: 2,
      poolCount: 1,
      lastUpdated: "2024-03-17 14:20:00",
      createTime: "2024-03-12 09:15:00",
      creator: "marketing",
    },
    {
      id: "3",
      name: "微信社群活动",
      status: "paused",
      source: "wechat",
      sourceIcon: "💬",
      targetGroups: ["老客户", "会员"],
      totalUsers: 2340,
      dailyAverage: 0,
      deviceCount: 5,
      poolCount: 3,
      lastUpdated: "2024-03-15 09:45:00",
      createTime: "2024-02-28 11:20:00",
      creator: "social",
    },
  ])

  // 直接使用plans而不是filteredPlans
  const plansList = plans

  const handleDelete = (planId: string) => {
    setPlans(plans.filter((plan) => plan.id !== planId))
  }

  const handleEdit = (planId: string) => {
    router.push(`/workspace/traffic-distribution/${planId}/edit`)
  }

  const handleView = (planId: string) => {
    router.push(`/workspace/traffic-distribution/${planId}`)
  }

  const togglePlanStatus = (planId: string) => {
    setPlans(
      plans.map((plan) =>
        plan.id === planId ? { ...plan, status: plan.status === "active" ? "paused" : "active" } : plan,
      ),
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
            <h1 className="text-lg font-medium">流量分发</h1>
          </div>
          <Link href="/workspace/traffic-distribution/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新建分发
            </Button>
          </Link>
        </div>
      </header>

      <div className="p-4">
        {plansList.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border mt-4">
            <div className="text-gray-500">暂无数据</div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/workspace/traffic-distribution/new")}
            >
              创建分发计划
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {plansList.map((plan) => (
              <Card key={plan.id} className="overflow-hidden">
                {/* 卡片头部 */}
                <div className="p-4 bg-white border-b flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{plan.sourceIcon}</div>
                    <div>
                      <h3 className="font-medium text-lg">{plan.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={plan.status === "active" ? "success" : "secondary"}>
                          {plan.status === "active" ? "进行中" : "已暂停"}
                        </Badge>
                        {plan.targetGroups.map((group, index) => (
                          <Badge key={index} variant="outline">
                            {group}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(plan.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        查看详情
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(plan.id)}>
                        <Edit className="mr-2 h-4 w-4" />
                        编辑计划
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => togglePlanStatus(plan.id)}>
                        {plan.status === "active" ? (
                          <>
                            <Pause className="mr-2 h-4 w-4" />
                            暂停计划
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            启动计划
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(plan.id)} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除计划
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* 卡片内容 - 参考场景获客的标签样式 */}
                <div className="grid grid-cols-5 divide-x bg-white">
                  <div className="p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">日均分发人数</div>
                    <div className="text-lg font-semibold">{plan.dailyAverage}</div>
                  </div>
                  <div className="p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">分发设备</div>
                    <div className="text-lg font-semibold flex items-center justify-center">
                      <Users className="h-4 w-4 mr-1 text-blue-500" />
                      {plan.deviceCount}
                    </div>
                  </div>
                  <div className="p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">流量池</div>
                    <div className="text-lg font-semibold flex items-center justify-center">
                      <Database className="h-4 w-4 mr-1 text-green-500" />
                      {plan.poolCount}
                    </div>
                  </div>
                  <div className="p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">日均分发量</div>
                    <div className="text-lg font-semibold flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 mr-1 text-amber-500" />
                      {plan.dailyAverage}
                    </div>
                  </div>
                  <div className="p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">总流量池数量</div>
                    <div className="text-lg font-semibold">{plan.totalUsers}</div>
                  </div>
                </div>

                {/* 底部信息 */}
                <div className="p-3 bg-gray-50 text-sm text-gray-500 flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>上次执行: {plan.lastUpdated.split(" ")[0]}</span>
                  </div>
                  <div>创建人: {plan.creator}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
