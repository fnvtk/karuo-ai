"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  Settings,
  ArrowUp,
  Plus,
  Users,
  DollarSign,
  Wallet,
  FileText,
  Calendar,
  ChevronDown,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import BottomNav from "@/app/components/BottomNav"
import { toast } from "@/components/ui/use-toast"

// 分销获客统计页面 - 渠道端视图（苹果毛玻璃风格重构）
export default function ChannelStatsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"income" | "withdraw">("income")
  const [typeFilter, setTypeFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [showFilter, setShowFilter] = useState(true)

  // 模拟渠道数据
  const channelData = {
    name: "卡若招聘",
    code: "QD1766202404XPP2VLCOU",
    availableWithdraw: 45.0,
    totalIncome: 312.0,
    pendingReview: 20.0,
    withdrawn: 247.0,
    totalFriends: 89,
    todayFriends: 5,
    totalCustomers: 156,
    todayCustomers: 12,
  }

  // 模拟收益记录
  const incomeRecords = [
    { id: "1", type: "customer", amount: 2.0, description: "获客收益 - 张三", createTime: "2025-12-28 15:30:00" },
    { id: "2", type: "friend", amount: 2.0, description: "好友通过 - 李四", createTime: "2025-12-28 14:20:00" },
    { id: "3", type: "customer", amount: 2.0, description: "获客收益 - 王五", createTime: "2025-12-28 12:10:00" },
  ]

  // 模拟提现记录
  const withdrawRecords = [
    { id: "1", amount: 100.0, status: "approved", applyTime: "2025-12-25 10:00:00", reviewTime: "2025-12-25 12:00:00" },
    { id: "2", amount: 50.0, status: "pending", applyTime: "2025-12-28 09:30:00" },
  ]

  // 一键提现
  const handleWithdraw = () => {
    if (channelData.availableWithdraw <= 0) {
      toast({ title: "暂无可提现金额", variant: "destructive" })
      return
    }
    toast({ title: "提现申请已提交", description: `申请提现 ¥${channelData.availableWithdraw.toFixed(2)}` })
  }

  return (
    <div className="flex-1 min-h-screen pb-20">
      {/* 毛玻璃背景 */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 -z-10" />

      {/* 顶部标题栏 */}
      <header className="sticky top-0 z-10 backdrop-blur-2xl bg-white/70 border-b border-white/20">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-2xl hover:bg-white/50">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">分销获客统计</h1>
          </div>
        </div>
      </header>

      {/* 顶部信息区 - 渐变背景 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 p-6 text-white">
        {/* 装饰元素 */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">分销获客统计</h2>
              <p className="text-sm opacity-80 mt-1">实时数据 · 精准统计</p>
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-2xl">
              <Settings className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80">渠道名称</p>
              <p className="font-bold text-lg">{channelData.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-80">分销编码</p>
              <p className="font-mono text-sm">{channelData.code}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 可提现金额卡片 - 毛玻璃效果 */}
      <div className="px-4 -mt-6">
        <Card className="p-5 backdrop-blur-2xl bg-white/95 border-0 shadow-2xl rounded-3xl">
          <div className="flex items-center space-x-2 text-gray-500 mb-2">
            <Wallet className="h-4 w-4" />
            <span className="text-sm">当前可提现金额</span>
          </div>
          <div className="text-4xl font-bold text-gray-900">¥{channelData.availableWithdraw.toFixed(2)}</div>

          <Button
            className="w-full h-12 mt-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-base font-medium shadow-lg shadow-blue-500/30"
            onClick={handleWithdraw}
          >
            <ArrowUp className="h-4 w-4 mr-2" />
            一键提现
          </Button>

          {/* 收益统计 */}
          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">总收益</div>
              <div className="font-bold text-gray-900">¥{channelData.totalIncome.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">待审核</div>
              <div className="font-bold text-orange-600">¥{channelData.pendingReview.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">已提现</div>
              <div className="font-bold text-gray-700">¥{channelData.withdrawn.toFixed(2)}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* 统计卡片区 */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        <Card className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white shadow-xl border-0">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-lg" />
          <Plus className="h-6 w-6 p-1 bg-white/20 rounded-xl mb-2" />
          <div className="text-xs opacity-80">总加好友数</div>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-bold">{channelData.totalFriends}</span>
            <span className="text-xs opacity-70">今日 +{channelData.todayFriends}</span>
          </div>
        </Card>

        <Card className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 p-4 text-white shadow-xl border-0">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-lg" />
          <Users className="h-6 w-6 p-1 bg-white/20 rounded-xl mb-2" />
          <div className="text-xs opacity-80">总获客数</div>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-bold">{channelData.totalCustomers}</span>
            <span className="text-xs opacity-70">今日 +{channelData.todayCustomers}</span>
          </div>
        </Card>
      </div>

      {/* 明细记录区 */}
      <div className="px-4 mt-6">
        <div className="flex items-center space-x-2 mb-4">
          <FileText className="h-5 w-5 text-gray-600" />
          <span className="font-bold">明细记录</span>
        </div>

        {/* Tab切换 - 毛玻璃胶囊 */}
        <Card className="p-1 backdrop-blur-xl bg-gray-100/80 border-0 rounded-2xl mb-4">
          <div className="grid grid-cols-2 gap-1">
            <Button
              variant={activeTab === "income" ? "default" : "ghost"}
              className={`h-10 rounded-xl ${
                activeTab === "income" ? "bg-white shadow-md text-blue-600" : "bg-transparent text-gray-600"
              }`}
              onClick={() => setActiveTab("income")}
            >
              收益明细
            </Button>
            <Button
              variant={activeTab === "withdraw" ? "default" : "ghost"}
              className={`h-10 rounded-xl ${
                activeTab === "withdraw" ? "bg-white shadow-md text-blue-600" : "bg-transparent text-gray-600"
              }`}
              onClick={() => setActiveTab("withdraw")}
            >
              提现明细
            </Button>
          </div>
        </Card>

        {/* 筛选条件 */}
        <Card className="p-4 backdrop-blur-xl bg-white/80 border-0 shadow-xl rounded-3xl mb-4">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
            onClick={() => setShowFilter(!showFilter)}
          >
            <span className="font-medium">筛选条件</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilter ? "rotate-180" : ""}`} />
          </Button>

          {showFilter && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">类型</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-gray-50/80 border-0 text-sm">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="customer">获客收益</SelectItem>
                    <SelectItem value="friend">加好友收益</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">时间</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    placeholder="选择日期"
                    className="h-10 pl-9 rounded-xl bg-gray-50/80 border-0 text-sm"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* 记录统计 */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>共{activeTab === "income" ? incomeRecords.length : withdrawRecords.length}条记录</span>
          <Badge variant="outline" className="rounded-full">
            {activeTab === "income" ? incomeRecords.length : withdrawRecords.length} 条
          </Badge>
        </div>

        {/* 记录列表 */}
        <div className="space-y-4">
          {activeTab === "income" ? (
            incomeRecords.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="h-8 w-8 text-gray-400" />
                </div>
                <div className="text-gray-500">暂无记录</div>
              </div>
            ) : (
              incomeRecords.map((record) => (
                <Card key={record.id} className="p-4 backdrop-blur-xl bg-white/80 border-0 shadow-xl rounded-3xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{record.description}</h3>
                      <p className="text-xs text-gray-500 mt-1">{record.createTime}</p>
                    </div>
                    <span className="text-xl font-bold text-green-600">+¥{record.amount.toFixed(2)}</span>
                  </div>
                </Card>
              ))
            )
          ) : withdrawRecords.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="h-8 w-8 text-gray-400" />
              </div>
              <div className="text-gray-500">暂无记录</div>
            </div>
          ) : (
            withdrawRecords.map((record: any) => (
              <Card key={record.id} className="p-4 backdrop-blur-xl bg-white/80 border-0 shadow-xl rounded-3xl">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xl font-bold">¥{record.amount.toFixed(2)}</span>
                    <p className="text-xs text-gray-500 mt-1">{record.applyTime}</p>
                  </div>
                  <Badge
                    className={`rounded-full ${
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
              </Card>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
