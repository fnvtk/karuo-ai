"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  Plus,
  Search,
  Users,
  TrendingUp,
  Wallet,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Copy,
  Link2,
  Clock,
  ArrowRight,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import BottomNav from "@/app/components/BottomNav"
import { toast } from "@/components/ui/use-toast"

// 分销计划数据类型 - 与场景获客融合
interface DistributionPlan {
  id: string
  name: string // 计划名称
  status: "running" | "paused" | "completed" // 状态
  scenario: string // 关联场景类型
  scenarioName: string // 场景名称
  rewardType: "disabled" | "form" | "friend" // 收益时机
  rewardAmount: number // 每条收益金额
  webUrl: string // Web入口链接
  miniappUrl?: string // 小程序入口
  channels: DistributionChannel[] // 分销渠道列表
  stats: {
    totalChannels: number // 总渠道数
    totalCustomers: number // 总获客数
    totalFriends: number // 总加好友数
    totalPayout: number // 总支出
    todayCustomers: number // 今日获客
    todayFriends: number // 今日加好友
  }
  createTime: string
  updateTime: string
}

// 分销渠道数据类型
interface DistributionChannel {
  id: string
  name: string
  code: string
  phone: string
  wechat: string
  createType: "auto" | "manual"
  totalCustomers: number
  todayCustomers: number
  totalFriends: number
  todayFriends: number
  totalIncome: number
  pendingWithdraw: number
  pendingReview: number
  withdrawnAmount: number
  createTime: string
}

// 场景类型映射
const scenarioMap: Record<string, { name: string; color: string; bgColor: string }> = {
  haibao: { name: "海报获客", color: "text-blue-600", bgColor: "bg-blue-50" },
  order: { name: "订单获客", color: "text-green-600", bgColor: "bg-green-50" },
  douyin: { name: "抖音获客", color: "text-pink-600", bgColor: "bg-pink-50" },
  xiaohongshu: { name: "小红书获客", color: "text-red-600", bgColor: "bg-red-50" },
  phone: { name: "电话获客", color: "text-purple-600", bgColor: "bg-purple-50" },
  weixinqun: { name: "微信群获客", color: "text-emerald-600", bgColor: "bg-emerald-50" },
  payment: { name: "付款码获客", color: "text-orange-600", bgColor: "bg-orange-50" },
  api: { name: "API获客", color: "text-gray-600", bgColor: "bg-gray-50" },
}

// 收益时机映射
const rewardTypeMap: Record<string, { label: string; color: string }> = {
  disabled: { label: "禁用", color: "bg-gray-100 text-gray-600" },
  form: { label: "表单录入时", color: "bg-green-100 text-green-600" },
  friend: { label: "好友通过时", color: "bg-blue-100 text-blue-600" },
}

export default function DistributionPage() {
  const router = useRouter()
  const [searchKeyword, setSearchKeyword] = useState("")

  // 模拟分销计划数据
  const [plans, setPlans] = useState<DistributionPlan[]>([
    {
      id: "1",
      name: "卡若招聘分销计划",
      status: "running",
      scenario: "haibao",
      scenarioName: "海报获客",
      rewardType: "form",
      rewardAmount: 2.0,
      webUrl: "https://h5.ckb.quwanzhi.com/#/pages/form/input?id=689",
      miniappUrl: "pages/form/input?id=689",
      channels: [
        {
          id: "ch-1",
          name: "卡若招聘",
          code: "QD1766202404XPP2VLCOU",
          phone: "15880802661",
          wechat: "28533368",
          createType: "auto",
          totalCustomers: 156,
          todayCustomers: 12,
          totalFriends: 89,
          todayFriends: 5,
          totalIncome: 312.0,
          pendingWithdraw: 45.0,
          pendingReview: 20.0,
          withdrawnAmount: 247.0,
          createTime: "2025-12-20 11:46:44",
        },
        {
          id: "ch-2",
          name: "苏志钦",
          code: "QD1766202405ABC123",
          phone: "13800138001",
          wechat: "szq2024",
          createType: "manual",
          totalCustomers: 89,
          todayCustomers: 8,
          totalFriends: 45,
          todayFriends: 3,
          totalIncome: 178.0,
          pendingWithdraw: 30.0,
          pendingReview: 10.0,
          withdrawnAmount: 138.0,
          createTime: "2025-12-21 09:30:00",
        },
      ],
      stats: {
        totalChannels: 2,
        totalCustomers: 245,
        totalFriends: 134,
        totalPayout: 490.0,
        todayCustomers: 20,
        todayFriends: 8,
      },
      createTime: "2025-12-18 10:00:00",
      updateTime: "2025-12-28 15:30:00",
    },
    {
      id: "2",
      name: "抖音直播分销",
      status: "paused",
      scenario: "douyin",
      scenarioName: "抖音获客",
      rewardType: "friend",
      rewardAmount: 3.5,
      webUrl: "https://h5.ckb.quwanzhi.com/#/pages/form/input?id=690",
      channels: [],
      stats: {
        totalChannels: 0,
        totalCustomers: 0,
        totalFriends: 0,
        totalPayout: 0,
        todayCustomers: 0,
        todayFriends: 0,
      },
      createTime: "2025-12-25 14:00:00",
      updateTime: "2025-12-25 14:00:00",
    },
  ])

  // 统计汇总
  const totalStats = plans.reduce(
    (acc, plan) => ({
      totalPlans: acc.totalPlans + 1,
      totalChannels: acc.totalChannels + plan.stats.totalChannels,
      totalCustomers: acc.totalCustomers + plan.stats.totalCustomers,
      totalFriends: acc.totalFriends + plan.stats.totalFriends,
      totalPayout: acc.totalPayout + plan.stats.totalPayout,
      todayCustomers: acc.todayCustomers + plan.stats.todayCustomers,
      todayFriends: acc.todayFriends + plan.stats.todayFriends,
    }),
    {
      totalPlans: 0,
      totalChannels: 0,
      totalCustomers: 0,
      totalFriends: 0,
      totalPayout: 0,
      todayCustomers: 0,
      todayFriends: 0,
    },
  )

  // 切换计划状态
  const togglePlanStatus = (planId: string) => {
    setPlans(
      plans.map((plan) =>
        plan.id === planId ? { ...plan, status: plan.status === "running" ? "paused" : "running" } : plan,
      ),
    )
  }

  // 复制链接
  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    toast({ title: "复制成功", description: "链接已复制到剪贴板" })
  }

  // 查看计划详情
  const viewPlanDetail = (planId: string) => {
    router.push(`/workspace/distribution/${planId}`)
  }

  // 编辑计划
  const editPlan = (planId: string) => {
    router.push(`/workspace/distribution/${planId}/edit`)
  }

  // 删除计划
  const deletePlan = (planId: string) => {
    setPlans(plans.filter((p) => p.id !== planId))
    toast({ title: "删除成功", description: "分销计划已删除" })
  }

  // 过滤计划
  const filteredPlans = plans.filter(
    (plan) =>
      plan.name.toLowerCase().includes(searchKeyword.toLowerCase()) || plan.scenarioName.includes(searchKeyword),
  )

  return (
    <div className="flex-1 min-h-screen pb-20">
      {/* 毛玻璃背景 */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 -z-10" />

      {/* 顶部标题栏 - 苹果毛玻璃效果 */}
      <header className="sticky top-0 z-10 backdrop-blur-2xl bg-white/70 border-b border-white/20 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/workspace")}
              className="rounded-2xl hover:bg-white/50 backdrop-blur"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                分销管理
              </h1>
              <p className="text-xs text-gray-500">场景获客分销中心</p>
            </div>
          </div>
          <Button
            onClick={() => router.push("/workspace/distribution/new")}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-2xl shadow-lg shadow-blue-500/30 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            新建任务
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* 数据总览卡片区 - 毛玻璃卡片 */}
        <div className="grid grid-cols-3 gap-3">
          {/* 总计划数 - 蓝色 */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white shadow-xl shadow-blue-500/25">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full blur-lg" />
            <Users className="h-5 w-5 mb-2 opacity-90" />
            <div className="text-xs opacity-80 font-medium">总计划数</div>
            <div className="text-2xl font-bold mt-1">{totalStats.totalPlans}</div>
            <div className="text-xs mt-2 opacity-70 flex items-center">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/60 mr-1" />
              渠道: {totalStats.totalChannels}
            </div>
          </div>

          {/* 总获客数 - 绿色 */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 p-4 text-white shadow-xl shadow-green-500/25">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
            <TrendingUp className="h-5 w-5 mb-2 opacity-90" />
            <div className="text-xs opacity-80 font-medium">总获客数</div>
            <div className="text-2xl font-bold mt-1">{totalStats.totalCustomers}</div>
            <div className="text-xs mt-2 opacity-70">今日: +{totalStats.todayCustomers}</div>
          </div>

          {/* 总支出 - 紫色 */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500 to-violet-600 p-4 text-white shadow-xl shadow-purple-500/25">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
            <Wallet className="h-5 w-5 mb-2 opacity-90" />
            <div className="text-xs opacity-80 font-medium">总支出</div>
            <div className="text-2xl font-bold mt-1">¥{totalStats.totalPayout.toFixed(0)}</div>
            <div className="text-xs mt-2 opacity-70">加好友: {totalStats.totalFriends}</div>
          </div>
        </div>

        {/* 搜索框 - 毛玻璃效果 */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索计划名称、场景类型..."
            className="pl-11 h-12 rounded-2xl backdrop-blur-xl bg-white/80 border-0 shadow-lg shadow-black/5 focus-visible:ring-2 focus-visible:ring-blue-500/30"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>

        {/* 分销计划列表 */}
        <div className="space-y-4">
          {filteredPlans.length === 0 ? (
            <Card className="p-8 backdrop-blur-xl bg-white/70 border-0 shadow-xl rounded-3xl text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">暂无分销计划</h3>
              <p className="text-sm text-gray-500 mb-4">点击右上角"新建任务"创建您的第一个分销计划</p>
              <Button
                onClick={() => router.push("/workspace/distribution/new")}
                className="bg-blue-500 hover:bg-blue-600 rounded-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                新建分销计划
              </Button>
            </Card>
          ) : (
            filteredPlans.map((plan) => (
              <Card
                key={plan.id}
                className="overflow-hidden backdrop-blur-xl bg-white/80 border-0 shadow-xl shadow-black/5 rounded-3xl"
              >
                {/* 计划头部 */}
                <div className="p-4 border-b border-gray-100/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-bold text-lg text-gray-900">{plan.name}</h3>
                        <Badge
                          className={`rounded-full text-xs px-2 py-0.5 ${
                            plan.status === "running"
                              ? "bg-green-100 text-green-700 border-0"
                              : plan.status === "paused"
                                ? "bg-orange-100 text-orange-700 border-0"
                                : "bg-gray-100 text-gray-700 border-0"
                          }`}
                        >
                          {plan.status === "running" ? "进行中" : plan.status === "paused" ? "已暂停" : "已完成"}
                        </Badge>
                      </div>

                      {/* 场景标签 */}
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-lg ${scenarioMap[plan.scenario]?.bgColor || "bg-gray-50"} ${scenarioMap[plan.scenario]?.color || "text-gray-600"}`}
                        >
                          {plan.scenarioName}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-lg ${rewardTypeMap[plan.rewardType].color}`}>
                          {rewardTypeMap[plan.rewardType].label}
                        </span>
                        {plan.rewardType !== "disabled" && (
                          <span className="text-xs text-emerald-600 font-medium">
                            ¥{plan.rewardAmount.toFixed(2)}/条
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch checked={plan.status === "running"} onCheckedChange={() => togglePlanStatus(plan.id)} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-gray-100/80">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl shadow-xl">
                          <DropdownMenuItem onClick={() => viewPlanDetail(plan.id)} className="rounded-lg">
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => editPlan(plan.id)} className="rounded-lg">
                            <Edit className="h-4 w-4 mr-2" />
                            编辑计划
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyLink(plan.webUrl)} className="rounded-lg">
                            <Copy className="h-4 w-4 mr-2" />
                            复制链接
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deletePlan(plan.id)} className="rounded-lg text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            删除计划
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* 统计数据 - 5列网格 */}
                <div className="grid grid-cols-5 divide-x divide-gray-100/50 bg-gradient-to-r from-gray-50/50 to-white/50">
                  <div className="p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">渠道数</div>
                    <div className="text-lg font-bold text-blue-600">{plan.stats.totalChannels}</div>
                  </div>
                  <div className="p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">获客数</div>
                    <div className="text-lg font-bold text-emerald-600">{plan.stats.totalCustomers}</div>
                  </div>
                  <div className="p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">加好友</div>
                    <div className="text-lg font-bold text-purple-600">{plan.stats.totalFriends}</div>
                  </div>
                  <div className="p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">今日获客</div>
                    <div className="text-lg font-bold text-orange-600">+{plan.stats.todayCustomers}</div>
                  </div>
                  <div className="p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">总支出</div>
                    <div className="text-lg font-bold text-gray-700">¥{plan.stats.totalPayout.toFixed(0)}</div>
                  </div>
                </div>

                {/* 入口链接区域 */}
                <div className="p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <Link2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="text-xs text-gray-500 truncate">{plan.webUrl}</span>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-xl text-xs hover:bg-white/80"
                        onClick={() => copyLink(plan.webUrl)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        复制
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-xl text-xs hover:bg-white/80"
                        onClick={() => viewPlanDetail(plan.id)}
                      >
                        详情
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 底部信息 */}
                <div className="px-4 py-3 bg-gray-50/30 text-xs text-gray-500 flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    更新于 {plan.updateTime.split(" ")[0]}
                  </div>
                  <div>创建于 {plan.createTime.split(" ")[0]}</div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
