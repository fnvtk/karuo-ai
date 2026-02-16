"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  ArrowLeft,
  TrendingUp,
  Loader2,
  Plus,
  Search,
  Users,
  Wallet,
  ChevronRight,
  Phone,
  MessageCircle,
  Copy,
  Link2,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  DollarSign,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/toast"
import BottomNav from "@/app/components/BottomNav"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

// ========== 数据类型定义 ==========

// 场景数据类型
interface ScenarioData {
  id: string
  name: string
  icon: string
  todayCount: number
  growthRate: number
  status: "active" | "inactive"
  description: string
}

// 渠道成员数据类型 - 每个分销人员的详细信息
interface ChannelMember {
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
  totalIncome: number // 总收益
  pendingWithdraw: number // 待提现
  pendingReview: number // 待审核
  withdrawnAmount: number // 已提现
  firstWithdraw: number // 首次提现收益
  secondWithdraw: number // 第二次提现收益
  createTime: string
}

// 渠道获客计划数据类型
interface ChannelPlan {
  id: string
  name: string
  status: "running" | "paused" | "completed"
  linkedPlanIds: string[] // 关联的场景获客计划ID
  linkedPlanNames: string[] // 关联的场景获客计划名称
  rewardConfig: {
    friendPass: number // 好友通过收益
    replyRate: number // 回复率收益
    passReplyRate: number // 通过后回复率收益
  }
  webUrl: string
  miniappUrl?: string
  members: ChannelMember[] // 渠道成员列表
  stats: {
    totalCustomers: number
    totalFriends: number
    totalPayout: number
    todayCustomers: number
    todayFriends: number
  }
  createTime: string
  updateTime: string
}

// ========== 静态数据 ==========

// 场景数据
const staticScenarios: ScenarioData[] = [
  {
    id: "haibao",
    name: "海报获客",
    icon: "🎨",
    todayCount: 167,
    growthRate: 10.2,
    status: "active",
    description: "通过海报推广获取潜在客户",
  },
  {
    id: "order",
    name: "订单获客",
    icon: "📋",
    todayCount: 112,
    growthRate: 7.8,
    status: "active",
    description: "订单场景下的客户获取",
  },
  {
    id: "douyin",
    name: "抖音获客",
    icon: "🎵",
    todayCount: 156,
    growthRate: 12.5,
    status: "active",
    description: "抖音平台客户获取与转化",
  },
  {
    id: "xiaohongshu",
    name: "小红书获客",
    icon: "📖",
    todayCount: 89,
    growthRate: 8.3,
    status: "active",
    description: "小红书平台营销获客",
  },
  {
    id: "phone",
    name: "电话获客",
    icon: "📞",
    todayCount: 42,
    growthRate: 15.8,
    status: "active",
    description: "通过电话外呼进行客户获取",
  },
  {
    id: "gongzhonghao",
    name: "公众号获客",
    icon: "💚",
    todayCount: 234,
    growthRate: 15.7,
    status: "active",
    description: "微信公众号营销获客",
  },
  {
    id: "weixinqun",
    name: "微信群获客",
    icon: "💬",
    todayCount: 145,
    growthRate: 11.2,
    status: "active",
    description: "微信群营销和客户获取",
  },
  {
    id: "payment",
    name: "付款码获客",
    icon: "💳",
    todayCount: 78,
    growthRate: 9.5,
    status: "active",
    description: "支付场景下的客户获取",
  },
  {
    id: "api",
    name: "API获客",
    icon: "🔗",
    todayCount: 198,
    growthRate: 14.3,
    status: "active",
    description: "通过API接口进行客户获取",
  },
]

// 模拟渠道获客计划数据 - 修改数据结构，关联场景计划而非场景
const mockChannelPlans: ChannelPlan[] = [
  {
    id: "1",
    name: "卡若招聘分销计划",
    status: "running",
    linkedPlanIds: ["plan-1", "plan-2"],
    linkedPlanNames: ["海报获客-春季招聘计划", "抖音获客-直播引流"],
    rewardConfig: {
      friendPass: 2.0, // 好友通过 2元
      replyRate: 3.0, // 回复率 3元
      passReplyRate: 3.0, // 通过后回复率 3元
    },
    webUrl: "https://h5.ckb.quwanzhi.com/#/pages/form/input?id=689",
    miniappUrl: "pages/form/input?id=689",
    members: [
      {
        id: "m-1",
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
        firstWithdraw: 150.0,
        secondWithdraw: 97.0,
        createTime: "2025-12-20 11:46:44",
      },
      {
        id: "m-2",
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
        firstWithdraw: 88.0,
        secondWithdraw: 50.0,
        createTime: "2025-12-21 09:30:00",
      },
      {
        id: "m-3",
        name: "王龙兰",
        code: "QD1766202406DEF456",
        phone: "13800138002",
        wechat: "wll2024",
        createType: "manual",
        totalCustomers: 67,
        todayCustomers: 5,
        totalFriends: 32,
        todayFriends: 2,
        totalIncome: 134.0,
        pendingWithdraw: 24.0,
        pendingReview: 8.0,
        withdrawnAmount: 102.0,
        firstWithdraw: 62.0,
        secondWithdraw: 40.0,
        createTime: "2025-12-22 14:20:00",
      },
    ],
    stats: {
      totalCustomers: 312,
      totalFriends: 166,
      totalPayout: 624.0,
      todayCustomers: 25,
      todayFriends: 10,
    },
    createTime: "2025-12-18 10:00:00",
    updateTime: "2025-12-28 15:30:00",
  },
  {
    id: "2",
    name: "抖音直播分销",
    status: "paused",
    linkedPlanIds: ["plan-3"],
    linkedPlanNames: ["抖音获客-年货节活动"],
    rewardConfig: {
      friendPass: 2.5,
      replyRate: 3.5,
      passReplyRate: 4.0,
    },
    webUrl: "https://h5.ckb.quwanzhi.com/#/pages/form/input?id=690",
    members: [],
    stats: {
      totalCustomers: 0,
      totalFriends: 0,
      totalPayout: 0,
      todayCustomers: 0,
      todayFriends: 0,
    },
    createTime: "2025-12-25 14:00:00",
    updateTime: "2025-12-25 14:00:00",
  },
]

// ========== 主页面组件 ==========

export default function ScenariosPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"scenarios" | "channels">("scenarios")
  const [scenarios, setScenarios] = useState<ScenarioData[]>([])
  const [channelPlans, setChannelPlans] = useState<ChannelPlan[]>(mockChannelPlans)
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState("")
  const [memberDetailDialog, setMemberDetailDialog] = useState<{
    open: boolean
    type: "customers" | "members" | "payout"
    plan: ChannelPlan | null
  }>({ open: false, type: "customers", plan: null })

  // 加载场景数据
  useEffect(() => {
    const loadScenarios = async () => {
      try {
        setLoading(true)
        await new Promise((resolve) => setTimeout(resolve, 300))
        setScenarios(staticScenarios)
      } catch (err) {
        console.error("场景数据加载异常:", err)
        setScenarios(staticScenarios)
      } finally {
        setLoading(false)
      }
    }
    loadScenarios()
  }, [])

  // 处理场景点击
  const handleScenarioClick = (scenarioId: string) => {
    router.push(`/scenarios/${scenarioId}`)
  }

  // 处理新建计划
  const handleNewPlan = () => {
    if (activeTab === "scenarios") {
      router.push("/plans/new")
    } else {
      router.push("/scenarios/channel/new")
    }
  }

  // 处理返回
  const handleBack = () => {
    router.back()
  }

  // 切换计划状态
  const togglePlanStatus = (planId: string) => {
    setChannelPlans(
      channelPlans.map((plan) =>
        plan.id === planId ? { ...plan, status: plan.status === "running" ? "paused" : "running" } : plan,
      ),
    )
    toast({ title: "状态已更新" })
  }

  // 复制链接
  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    toast({ title: "复制成功", description: "链接已复制到剪贴板" })
  }

  // 删除计划
  const deletePlan = (planId: string) => {
    setChannelPlans(channelPlans.filter((p) => p.id !== planId))
    toast({ title: "删除成功", description: "渠道获客计划已删除" })
  }

  // 过滤渠道计划
  const filteredChannelPlans = channelPlans.filter(
    (plan) =>
      plan.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      plan.linkedPlanNames.some((name) => name.includes(searchKeyword)),
  )

  // 计算渠道获客统计
  const channelStats = channelPlans.reduce(
    (acc, plan) => ({
      totalPlans: acc.totalPlans + 1,
      totalMembers: acc.totalMembers + plan.members.length,
      totalCustomers: acc.totalCustomers + plan.stats.totalCustomers,
      totalPayout: acc.totalPayout + plan.stats.totalPayout,
      todayCustomers: acc.todayCustomers + plan.stats.todayCustomers,
    }),
    { totalPlans: 0, totalMembers: 0, totalCustomers: 0, totalPayout: 0, todayCustomers: 0 },
  )

  const openMemberDetail = (type: "customers" | "members" | "payout", plan: ChannelPlan) => {
    setMemberDetailDialog({ open: true, type, plan })
  }

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
          <p className="text-sm text-gray-600">正在加载数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20">
      {/* 毛玻璃背景 */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-green-50 -z-10" />

      {/* 头部导航 */}
      <div className="sticky top-0 z-10 backdrop-blur-2xl bg-white/70 border-b border-white/20 shadow-sm">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center space-x-3 flex-1">
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-9 w-9 rounded-2xl hover:bg-white/50">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                场景获客
              </h1>
              <p className="text-xs text-gray-500">场景与渠道管理中心</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleNewPlan}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 h-10 font-medium rounded-2xl shadow-lg shadow-blue-500/30"
          >
            <Plus className="h-4 w-4 mr-1" />
            新建任务
          </Button>
        </div>

        {/* 标签切换 */}
        <div className="px-4 pb-3">
          <div className="flex bg-gray-100/80 rounded-2xl p-1 backdrop-blur">
            <button
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === "scenarios" ? "bg-white text-blue-600 shadow-md" : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setActiveTab("scenarios")}
            >
              <span className="flex items-center justify-center gap-2">
                <TrendingUp className="h-4 w-4" />
                场景获客
              </span>
            </button>
            <button
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === "channels" ? "bg-white text-green-600 shadow-md" : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setActiveTab("channels")}
            >
              <span className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />
                渠道获客
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="px-4 pb-4">
        {activeTab === "scenarios" ? (
          /* ========== 场景获客标签内容 ========== */
          <div className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              {scenarios.map((scenario) => (
                <Card
                  key={scenario.id}
                  className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 hover:shadow-lg transition-all duration-200 cursor-pointer border-0 shadow-lg shadow-black/5 relative"
                  onClick={() => handleScenarioClick(scenario.id)}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="text-5xl mb-3">{scenario.icon}</div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">{scenario.name}</h3>
                    <div className="w-full space-y-2">
                      <div className="text-sm text-gray-600">
                        今日: <span className="text-base font-bold text-blue-600">{scenario.todayCount}</span>
                      </div>
                      <div className="flex items-center justify-center text-sm font-semibold text-green-600">
                        <TrendingUp className="h-4 w-4 mr-1" />+{scenario.growthRate}%
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          /* ========== 渠道获客标签内容 ========== */
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {/* 总获客数 */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 text-white shadow-lg shadow-blue-500/20">
                <TrendingUp className="h-4 w-4 mb-1 opacity-80" />
                <div className="text-[10px] opacity-70">总获客</div>
                <div className="text-xl font-bold">{channelStats.totalCustomers}</div>
                <div className="text-[10px] opacity-60">+{channelStats.todayCustomers} 今日</div>
              </div>

              {/* 渠道成员 */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-3 text-white shadow-lg shadow-green-500/20">
                <Users className="h-4 w-4 mb-1 opacity-80" />
                <div className="text-[10px] opacity-70">成员</div>
                <div className="text-xl font-bold">{channelStats.totalMembers}</div>
                <div className="text-[10px] opacity-60">{channelStats.totalPlans} 计划</div>
              </div>

              {/* 总支出 */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 p-3 text-white shadow-lg shadow-purple-500/20">
                <Wallet className="h-4 w-4 mb-1 opacity-80" />
                <div className="text-[10px] opacity-70">总支出</div>
                <div className="text-xl font-bold">¥{channelStats.totalPayout.toFixed(0)}</div>
              </div>
            </div>

            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索计划名称、关联场景..."
                className="pl-11 h-11 rounded-2xl backdrop-blur-xl bg-white/80 border-0 shadow-lg shadow-black/5 focus-visible:ring-2 focus-visible:ring-green-500/30"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>

            {/* 渠道获客计划列表 */}
            <div className="space-y-4">
              {filteredChannelPlans.length === 0 ? (
                <Card className="p-8 backdrop-blur-xl bg-white/70 border-0 shadow-xl rounded-3xl text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">暂无渠道获客计划</h3>
                  <p className="text-sm text-gray-500 mb-4">点击右上角"新建任务"创建您的第一个渠道获客计划</p>
                  <Button
                    onClick={() => router.push("/scenarios/channel/new")}
                    className="bg-green-500 hover:bg-green-600 rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    新建渠道获客计划
                  </Button>
                </Card>
              ) : (
                filteredChannelPlans.map((plan) => (
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

                          <div className="flex items-center flex-wrap gap-2 mb-3">
                            {plan.linkedPlanNames.map((name, idx) => (
                              <span key={idx} className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600">
                                {name}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                            <span className="flex items-center gap-1">
                              <UserPlus className="h-3 w-3" />
                              好友通过 ¥{plan.rewardConfig.friendPass}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              回复率 ¥{plan.rewardConfig.replyRate}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              通过后回复 ¥{plan.rewardConfig.passReplyRate}
                            </span>
                          </div>
                        </div>

                        {/* 操作区域 */}
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={plan.status === "running"}
                            onCheckedChange={() => togglePlanStatus(plan.id)}
                            className="data-[state=checked]:bg-green-500"
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem
                                className="rounded-lg"
                                onClick={() => router.push(`/scenarios/channel/${plan.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                查看详情
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="rounded-lg"
                                onClick={() => router.push(`/scenarios/channel/${plan.id}/edit`)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                编辑计划
                              </DropdownMenuItem>
                              <DropdownMenuItem className="rounded-lg text-red-600" onClick={() => deletePlan(plan.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除计划
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-gray-100">
                      <button
                        className="p-3 text-center hover:bg-gray-50/50 transition-colors"
                        onClick={() => openMemberDetail("customers", plan)}
                      >
                        <div className="text-xs text-gray-500 mb-1">总获客</div>
                        <div className="text-lg font-bold text-blue-600">{plan.stats.totalCustomers}</div>
                        <div className="text-[10px] text-gray-400">+{plan.stats.todayCustomers} 今日</div>
                      </button>
                      <button
                        className="p-3 text-center hover:bg-gray-50/50 transition-colors"
                        onClick={() => openMemberDetail("members", plan)}
                      >
                        <div className="text-xs text-gray-500 mb-1">渠道成员</div>
                        <div className="text-lg font-bold text-green-600">{plan.members.length}</div>
                        <div className="text-[10px] text-gray-400">点击查看</div>
                      </button>
                      <button
                        className="p-3 text-center hover:bg-gray-50/50 transition-colors"
                        onClick={() => openMemberDetail("payout", plan)}
                      >
                        <div className="text-xs text-gray-500 mb-1">总支出</div>
                        <div className="text-lg font-bold text-purple-600">¥{plan.stats.totalPayout}</div>
                        <div className="text-[10px] text-gray-400">点击查看</div>
                      </button>
                    </div>

                    {/* 入口链接 */}
                    <div className="p-3 bg-gray-50/50 border-t border-gray-100/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-500 truncate">{plan.webUrl}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-3 text-xs text-blue-600 hover:bg-blue-50 rounded-lg flex-shrink-0"
                          onClick={() => copyLink(plan.webUrl)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          复制
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={memberDetailDialog.open}
        onOpenChange={(open) => setMemberDetailDialog({ ...memberDetailDialog, open })}
      >
        <DialogContent className="rounded-3xl max-w-sm mx-4 max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {memberDetailDialog.type === "customers" && "获客明细"}
              {memberDetailDialog.type === "members" && "渠道成员"}
              {memberDetailDialog.type === "payout" && "支出明细"}
            </DialogTitle>
            <DialogDescription>{memberDetailDialog.plan?.name} - 各成员数据详情</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {memberDetailDialog.plan?.members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">暂无渠道成员</p>
              </div>
            ) : (
              memberDetailDialog.plan?.members.map((member) => (
                <div
                  key={member.id}
                  className="p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    setMemberDetailDialog({ ...memberDetailDialog, open: false })
                    router.push(`/scenarios/channel/member/${member.id}`)
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{member.name}</div>
                        <div className="text-xs text-gray-500">{member.code}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>

                  {/* 根据类型显示不同数据 */}
                  {memberDetailDialog.type === "customers" && (
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-white rounded-xl p-2">
                        <div className="text-xs text-gray-500">总获客</div>
                        <div className="text-base font-bold text-blue-600">{member.totalCustomers}</div>
                      </div>
                      <div className="bg-white rounded-xl p-2">
                        <div className="text-xs text-gray-500">今日获客</div>
                        <div className="text-base font-bold text-green-600">{member.todayCustomers}</div>
                      </div>
                    </div>
                  )}

                  {memberDetailDialog.type === "members" && (
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {member.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {member.wechat}
                      </span>
                    </div>
                  )}

                  {memberDetailDialog.type === "payout" && (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white rounded-xl p-2">
                        <div className="text-[10px] text-gray-500">总收益</div>
                        <div className="text-sm font-bold text-green-600">¥{member.totalIncome}</div>
                      </div>
                      <div className="bg-white rounded-xl p-2">
                        <div className="text-[10px] text-gray-500">首次提现</div>
                        <div className="text-sm font-bold text-blue-600">¥{member.firstWithdraw}</div>
                      </div>
                      <div className="bg-white rounded-xl p-2">
                        <div className="text-[10px] text-gray-500">二次提现</div>
                        <div className="text-sm font-bold text-purple-600">¥{member.secondWithdraw}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  )
}
