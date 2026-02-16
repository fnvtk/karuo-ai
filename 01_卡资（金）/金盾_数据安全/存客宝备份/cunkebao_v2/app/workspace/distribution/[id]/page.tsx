"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ChevronLeft,
  Plus,
  Search,
  Users,
  TrendingUp,
  UserPlus,
  DollarSign,
  Wallet,
  Phone,
  MessageCircle,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import BottomNav from "@/app/components/BottomNav"
import { toast } from "@/components/ui/use-toast"
import { AddChannelDialog } from "../components/add-channel-dialog"

// 分销渠道数据类型
interface DistributionChannel {
  id: string
  name: string
  code: string
  phone: string
  wechat: string
  remark: string
  createTime: string
  createType: "auto" | "manual"
  totalCustomers: number
  todayCustomers: number
  totalFriends: number
  todayFriends: number
  totalIncome: number
  pendingWithdraw: number
  pendingReview: number
  withdrawnAmount: number
}

// 提现记录
interface WithdrawRecord {
  id: string
  channelId: string
  channelName: string
  amount: number
  status: "pending" | "approved" | "rejected"
  applyTime: string
  reviewTime?: string
}

export default function DistributionPlanDetailPage() {
  const router = useRouter()
  const params = useParams()
  const planId = params.id as string

  const [activeTab, setActiveTab] = useState("channels")
  const [searchKeyword, setSearchKeyword] = useState("")
  const [addChannelOpen, setAddChannelOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")

  // 模拟计划数据
  const planData = {
    id: planId,
    name: "卡若招聘分销计划",
    scenario: "haibao",
    scenarioName: "海报获客",
    rewardType: "form",
    rewardAmount: 2.0,
    webUrl: "https://h5.ckb.quwanzhi.com/#/pages/form/input?id=689",
    status: "running",
  }

  // 模拟渠道数据
  const [channels] = useState<DistributionChannel[]>([
    {
      id: "ch-1",
      name: "卡若招聘",
      code: "QD1766202404XPP2VLCOU",
      phone: "15880802661",
      wechat: "28533368",
      remark: "",
      createTime: "2025-12-20 11:46:44",
      createType: "auto",
      totalCustomers: 156,
      todayCustomers: 12,
      totalFriends: 89,
      todayFriends: 5,
      totalIncome: 312.0,
      pendingWithdraw: 45.0,
      pendingReview: 20.0,
      withdrawnAmount: 247.0,
    },
    {
      id: "ch-2",
      name: "苏志钦",
      code: "QD1766202405ABC123",
      phone: "13800138001",
      wechat: "szq2024",
      remark: "合作渠道",
      createTime: "2025-12-21 09:30:00",
      createType: "manual",
      totalCustomers: 89,
      todayCustomers: 8,
      totalFriends: 45,
      todayFriends: 3,
      totalIncome: 178.0,
      pendingWithdraw: 30.0,
      pendingReview: 10.0,
      withdrawnAmount: 138.0,
    },
  ])

  // 模拟提现记录
  const [withdrawRecords] = useState<WithdrawRecord[]>([
    {
      id: "w-1",
      channelId: "ch-1",
      channelName: "卡若招聘",
      amount: 50.0,
      status: "pending",
      applyTime: "2025-12-28 10:30:00",
    },
    {
      id: "w-2",
      channelId: "ch-2",
      channelName: "苏志钦",
      amount: 30.0,
      status: "approved",
      applyTime: "2025-12-27 14:20:00",
      reviewTime: "2025-12-27 16:00:00",
    },
  ])

  // 统计汇总
  const stats = {
    totalChannels: channels.length,
    totalCustomers: channels.reduce((sum, c) => sum + c.totalCustomers, 0),
    totalFriends: channels.reduce((sum, c) => sum + c.totalFriends, 0),
    totalPayout: channels.reduce((sum, c) => sum + c.totalIncome, 0),
    totalWithdrawn: channels.reduce((sum, c) => sum + c.withdrawnAmount, 0),
    totalPending: channels.reduce((sum, c) => sum + c.pendingReview, 0),
    todayCustomers: channels.reduce((sum, c) => sum + c.todayCustomers, 0),
    todayFriends: channels.reduce((sum, c) => sum + c.todayFriends, 0),
  }

  // 复制链接
  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    toast({ title: "复制成功", description: "链接已复制到剪贴板" })
  }

  // 查看渠道详情
  const viewChannelDetail = (channelId: string) => {
    router.push(`/workspace/distribution/channel/${channelId}`)
  }

  // 审批提现
  const handleApproveWithdraw = (recordId: string, approve: boolean) => {
    toast({
      title: approve ? "已通过" : "已拒绝",
      description: `提现申请已${approve ? "通过" : "拒绝"}`,
    })
  }

  // 过滤渠道
  const filteredChannels = channels.filter(
    (channel) =>
      channel.name.includes(searchKeyword) ||
      channel.code.includes(searchKeyword) ||
      channel.phone.includes(searchKeyword),
  )

  // 过滤提现记录
  const filteredWithdrawRecords = withdrawRecords.filter((record) => {
    if (statusFilter !== "all" && record.status !== statusFilter) return false
    return true
  })

  return (
    <div className="flex-1 min-h-screen pb-20">
      {/* 毛玻璃背景 */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 -z-10" />

      {/* 顶部标题栏 */}
      <header className="sticky top-0 z-10 backdrop-blur-2xl bg-white/70 border-b border-white/20">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/workspace/distribution")}
              className="rounded-2xl hover:bg-white/50"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">{planData.name}</h1>
              <p className="text-xs text-gray-500">计划详情与渠道管理</p>
            </div>
          </div>
          <Button
            onClick={() => setAddChannelOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            添加渠道
          </Button>
        </div>
      </header>

      {/* Tab导航 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="backdrop-blur-xl bg-white/70 border-b border-white/20 sticky top-[72px] z-10">
          <TabsList className="w-full h-14 bg-transparent p-0 rounded-none">
            <TabsTrigger
              value="channels"
              className="flex-1 h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600"
            >
              <Users className="h-4 w-4 mr-2" />
              渠道管理
            </TabsTrigger>
            <TabsTrigger
              value="funds"
              className="flex-1 h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              资金统计
            </TabsTrigger>
            <TabsTrigger
              value="withdraw"
              className="flex-1 h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600"
            >
              <Wallet className="h-4 w-4 mr-2" />
              提现审核
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 渠道管理Tab */}
        <TabsContent value="channels" className="mt-0 p-4 space-y-4">
          {/* 统计卡片 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white shadow-xl shadow-blue-500/25">
              <Users className="h-5 w-5 mb-2 opacity-90" />
              <div className="text-xs opacity-80">总渠道数</div>
              <div className="text-2xl font-bold mt-1">{stats.totalChannels}</div>
            </div>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 p-4 text-white shadow-xl shadow-green-500/25">
              <TrendingUp className="h-5 w-5 mb-2 opacity-90" />
              <div className="text-xs opacity-80">总获客数</div>
              <div className="text-2xl font-bold mt-1">{stats.totalCustomers}</div>
              <div className="text-xs mt-1 opacity-70">今日: +{stats.todayCustomers}</div>
            </div>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500 to-violet-600 p-4 text-white shadow-xl shadow-purple-500/25">
              <UserPlus className="h-5 w-5 mb-2 opacity-90" />
              <div className="text-xs opacity-80">总加好友</div>
              <div className="text-2xl font-bold mt-1">{stats.totalFriends}</div>
              <div className="text-xs mt-1 opacity-70">今日: +{stats.todayFriends}</div>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索渠道名称、编码、电话..."
              className="pl-11 h-12 rounded-2xl backdrop-blur-xl bg-white/80 border-0 shadow-lg"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>

          {/* 渠道列表 */}
          <div className="space-y-4">
            {filteredChannels.map((channel) => (
              <Card
                key={channel.id}
                className="overflow-hidden backdrop-blur-xl bg-white/80 border-0 shadow-xl rounded-3xl"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-lg">{channel.name}</h3>
                        <Badge className="bg-blue-100 text-blue-600 rounded-full text-xs">
                          {channel.createType === "auto" ? "自动创建" : "手动创建"}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-mono">{channel.code}</div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem onClick={() => viewChannelDetail(channel.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* 联系方式 */}
                  <div className="flex items-center space-x-4 mt-3">
                    <div className="flex items-center text-sm text-gray-500">
                      <Phone className="h-4 w-4 mr-1 text-blue-500" />
                      {channel.phone}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <MessageCircle className="h-4 w-4 mr-1 text-green-500" />
                      {channel.wechat}
                    </div>
                  </div>
                </div>

                {/* 数据统计 */}
                <div className="grid grid-cols-2 gap-3 p-4 pt-0">
                  <div className="bg-blue-50/80 rounded-2xl p-3">
                    <div className="text-xs text-gray-500">总获客</div>
                    <div className="text-xl font-bold text-blue-600">{channel.totalCustomers}</div>
                  </div>
                  <div className="bg-green-50/80 rounded-2xl p-3">
                    <div className="text-xs text-gray-500">今日获客</div>
                    <div className="text-xl font-bold text-green-600">+{channel.todayCustomers}</div>
                  </div>
                  <div className="bg-purple-50/80 rounded-2xl p-3">
                    <div className="text-xs text-gray-500">总加好友</div>
                    <div className="text-xl font-bold text-purple-600">{channel.totalFriends}</div>
                  </div>
                  <div className="bg-orange-50/80 rounded-2xl p-3">
                    <div className="text-xs text-gray-500">总收益</div>
                    <div className="text-xl font-bold text-orange-600">¥{channel.totalIncome.toFixed(0)}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 资金统计Tab */}
        <TabsContent value="funds" className="mt-0 p-4 space-y-4">
          {/* 资金总览 */}
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-500 to-blue-600 p-5 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <DollarSign className="h-8 w-8 p-1.5 bg-white/20 rounded-xl" />
                <span className="text-sm opacity-80">总支出</span>
              </div>
              <div className="text-3xl font-bold mt-3">¥{stats.totalPayout.toFixed(2)}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-500 to-green-600 p-4 text-white shadow-xl">
                <Wallet className="h-6 w-6 p-1 bg-white/20 rounded-lg mb-2" />
                <div className="text-xs opacity-80">已提现</div>
                <div className="text-2xl font-bold mt-1">¥{stats.totalWithdrawn.toFixed(2)}</div>
              </div>
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 p-4 text-white shadow-xl">
                <Clock className="h-6 w-6 p-1 bg-white/20 rounded-lg mb-2" />
                <div className="text-xs opacity-80">待审核</div>
                <div className="text-2xl font-bold mt-1">¥{stats.totalPending.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* 渠道收益列表 */}
          <div className="flex items-center space-x-2 pt-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <span className="font-medium">渠道收益明细</span>
          </div>

          <div className="space-y-4">
            {channels.map((channel) => (
              <Card
                key={channel.id}
                className="overflow-hidden backdrop-blur-xl bg-white/80 border-0 shadow-xl rounded-3xl"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold">{channel.name}</h3>
                      <div className="text-xs text-gray-500 font-mono mt-1">{channel.code}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50/80 rounded-2xl p-3">
                      <div className="text-xs text-gray-500">总收益</div>
                      <div className="text-xl font-bold text-green-600">¥{channel.totalIncome.toFixed(2)}</div>
                    </div>
                    <div className="bg-blue-50/80 rounded-2xl p-3">
                      <div className="text-xs text-gray-500">可提现</div>
                      <div className="text-xl font-bold text-blue-600">¥{channel.pendingWithdraw.toFixed(2)}</div>
                    </div>
                    <div className="bg-gray-50/80 rounded-2xl p-3">
                      <div className="text-xs text-gray-500">已提现</div>
                      <div className="text-xl font-bold text-gray-700">¥{channel.withdrawnAmount.toFixed(2)}</div>
                    </div>
                    <div className="bg-orange-50/80 rounded-2xl p-3">
                      <div className="text-xs text-gray-500">待审核</div>
                      <div className="text-xl font-bold text-orange-600">¥{channel.pendingReview.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 提现审核Tab */}
        <TabsContent value="withdraw" className="mt-0 p-4 space-y-4">
          {/* 筛选条件 */}
          <Card className="p-4 backdrop-blur-xl bg-white/80 border-0 shadow-xl rounded-3xl">
            <div className="flex items-center space-x-2 mb-4">
              <Filter className="h-4 w-4 text-blue-500" />
              <span className="font-medium">筛选条件</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">状态</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50/80 border-0">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="pending">待审核</SelectItem>
                    <SelectItem value="approved">已通过</SelectItem>
                    <SelectItem value="rejected">已拒绝</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-500 mb-2 block">时间</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    placeholder="选择日期"
                    className="pl-10 h-11 rounded-xl bg-gray-50/80 border-0"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* 提现记录列表 */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>共 {filteredWithdrawRecords.length} 条记录</span>
          </div>

          <div className="space-y-4">
            {filteredWithdrawRecords.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-8 w-8 text-gray-400" />
                </div>
                <div className="text-gray-500">暂无提现记录</div>
              </div>
            ) : (
              filteredWithdrawRecords.map((record) => (
                <Card key={record.id} className="p-4 backdrop-blur-xl bg-white/80 border-0 shadow-xl rounded-3xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold">{record.channelName}</h3>
                      <p className="text-xs text-gray-500 mt-1">{record.applyTime}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">¥{record.amount.toFixed(2)}</div>
                      <Badge
                        className={`rounded-full mt-1 ${
                          record.status === "pending"
                            ? "bg-orange-100 text-orange-600"
                            : record.status === "approved"
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600"
                        }`}
                      >
                        {record.status === "pending" ? "待审核" : record.status === "approved" ? "已通过" : "已拒绝"}
                      </Badge>
                    </div>
                  </div>

                  {record.status === "pending" && (
                    <div className="flex space-x-2 pt-3 border-t border-gray-100">
                      <Button
                        variant="outline"
                        className="flex-1 h-10 rounded-xl border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                        onClick={() => handleApproveWithdraw(record.id, false)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        拒绝
                      </Button>
                      <Button
                        className="flex-1 h-10 rounded-xl bg-green-500 hover:bg-green-600 text-white"
                        onClick={() => handleApproveWithdraw(record.id, true)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        通过
                      </Button>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 添加渠道弹窗 */}
      <AddChannelDialog open={addChannelOpen} onOpenChange={setAddChannelOpen} />

      <BottomNav />
    </div>
  )
}
