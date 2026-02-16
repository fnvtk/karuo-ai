"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ChevronLeft,
  Settings,
  Copy,
  Link2,
  DollarSign,
  TrendingUp,
  Users,
  Wallet,
  Calendar,
  ArrowUpRight,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import BottomNav from "@/app/components/BottomNav"

// 模拟成员数据
const mockMemberData = {
  id: "m-1",
  name: "卡若招聘",
  code: "QD1766202404XPP2VLCOU",
  phone: "15880802661",
  wechat: "28533368",
  createType: "auto",
  remark: "暂无备注",
  createTime: "2025-12-20 11:46:44",
  planName: "卡若招聘分销计划",
  planId: "1",
  webUrl: "https://h5.ckb.quwanzhi.com/#/pages/form/input?id=689",
  stats: {
    totalCustomers: 156,
    todayCustomers: 12,
    totalFriends: 89,
    todayFriends: 5,
  },
  finance: {
    totalIncome: 312.0,
    pendingWithdraw: 45.0,
    pendingReview: 20.0,
    withdrawnAmount: 247.0,
  },
  withdrawHistory: [
    { id: "w-1", amount: 150.0, status: "completed", time: "2025-12-25 10:30:00", type: "首次提现" },
    { id: "w-2", amount: 97.0, status: "completed", time: "2025-12-27 14:20:00", type: "第二次提现" },
  ],
  incomeHistory: [
    { id: "i-1", amount: 2.0, type: "表单录入", customerName: "张三", time: "2025-12-28 09:15:00" },
    { id: "i-2", amount: 2.0, type: "表单录入", customerName: "李四", time: "2025-12-28 10:30:00" },
    { id: "i-3", amount: 2.0, type: "表单录入", customerName: "王五", time: "2025-12-28 11:45:00" },
    { id: "i-4", amount: 2.0, type: "表单录入", customerName: "赵六", time: "2025-12-28 14:20:00" },
    { id: "i-5", amount: 2.0, type: "表单录入", customerName: "孙七", time: "2025-12-28 15:30:00" },
  ],
}

export default function MemberDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [activeTab, setActiveTab] = useState<"overview" | "income" | "withdraw">("overview")
  const [incomeFilter, setIncomeFilter] = useState("all")
  const [withdrawFilter, setWithdrawFilter] = useState("all")

  const member = mockMemberData

  // 复制链接
  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    toast({ title: "复制成功", description: "链接已复制到剪贴板" })
  }

  // 一键提现
  const handleWithdraw = () => {
    if (member.finance.pendingWithdraw < 10) {
      toast({ title: "提现失败", description: "最低提现金额为10元", variant: "destructive" })
      return
    }
    toast({ title: "提现申请已提交", description: `申请提现 ¥${member.finance.pendingWithdraw.toFixed(2)}` })
  }

  return (
    <div className="min-h-screen pb-20">
      {/* 毛玻璃背景 */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 -z-10" />

      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 backdrop-blur-2xl bg-white/70 border-b border-white/20">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-2xl hover:bg-white/50">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">分销获客统计</h1>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-2xl">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* 头部信息卡片 */}
      <div className="px-4 pt-4">
        <Card className="overflow-hidden border-0 shadow-xl rounded-3xl">
          {/* 渐变背景头部 */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">分销获客统计</h2>
                <p className="text-blue-100 text-sm mt-1">实时数据 · 精准统计</p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-xl bg-white/10 hover:bg-white/20 text-white">
                <Settings className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-100 text-xs">渠道名称</div>
                <div className="text-lg font-bold mt-1">{member.name}</div>
              </div>
              <div className="text-right">
                <div className="text-blue-100 text-xs">分销编码</div>
                <div className="text-sm font-mono mt-1">{member.code}</div>
              </div>
            </div>
          </div>

          {/* 可提现金额卡片 */}
          <div className="p-4 bg-white">
            <Card className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-2xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-purple-600" />
                </div>
                <span className="text-sm text-gray-600">当前可提现金额</span>
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-4">¥{member.finance.pendingWithdraw.toFixed(2)}</div>
              <Button
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg shadow-purple-500/30"
                onClick={handleWithdraw}
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                一键提现
              </Button>

              {/* 金额明细 */}
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-xs text-gray-500">总收益</div>
                  <div className="font-bold text-gray-900">¥{member.finance.totalIncome.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">待审核</div>
                  <div className="font-bold text-orange-600">¥{member.finance.pendingReview.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">已提现</div>
                  <div className="font-bold text-green-600">¥{member.finance.withdrawnAmount.toFixed(2)}</div>
                </div>
              </div>
            </Card>
          </div>
        </Card>
      </div>

      {/* 数据统计卡片 */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-2 gap-3">
          {/* 总加好友数 */}
          <Card className="p-4 border-0 shadow-lg rounded-2xl bg-gradient-to-br from-blue-50 to-white">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-600">总加好友数</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-blue-600">{member.stats.totalFriends}</span>
              <span className="text-sm text-gray-500">今日 {member.stats.todayFriends}</span>
            </div>
          </Card>

          {/* 总获客数 */}
          <Card className="p-4 border-0 shadow-lg rounded-2xl bg-gradient-to-br from-green-50 to-white">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">总获客数</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-green-600">{member.stats.totalCustomers}</span>
              <span className="text-sm text-gray-500">今日 {member.stats.todayCustomers}</span>
            </div>
          </Card>
        </div>
      </div>

      {/* 明细记录区域 */}
      <div className="px-4 mt-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-1 h-5 bg-blue-500 rounded-full" />
          <h3 className="font-bold text-gray-900">明细记录</h3>
        </div>

        {/* Tab切换 */}
        <div className="flex bg-gray-100/80 rounded-2xl p-1 mb-4">
          <button
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
              activeTab === "income" ? "bg-white text-blue-600 shadow-md" : "text-gray-600"
            }`}
            onClick={() => setActiveTab("income")}
          >
            收益明细
          </button>
          <button
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
              activeTab === "withdraw" ? "bg-white text-blue-600 shadow-md" : "text-gray-600"
            }`}
            onClick={() => setActiveTab("withdraw")}
          >
            提现明细
          </button>
        </div>

        {/* 筛选条件 */}
        <Card className="p-4 border-0 shadow-lg rounded-2xl mb-4">
          <div className="flex items-center space-x-2 mb-3">
            <Filter className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-gray-700">筛选条件</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">类型</label>
              <Select value={incomeFilter} onValueChange={setIncomeFilter}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="form">表单录入</SelectItem>
                  <SelectItem value="friend">好友通过</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">时间</label>
              <Button variant="outline" className="w-full h-10 rounded-xl justify-start bg-transparent">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                <span className="text-gray-500">选择日期</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* 记录列表 */}
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              共{activeTab === "income" ? member.incomeHistory.length : member.withdrawHistory.length}条记录
            </span>
            <span className="text-xs text-gray-400">
              {activeTab === "income" ? member.incomeHistory.length : member.withdrawHistory.length}/
              {activeTab === "income" ? member.incomeHistory.length : member.withdrawHistory.length}条
            </span>
          </div>

          {activeTab === "income" ? (
            member.incomeHistory.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {member.incomeHistory.map((record) => (
                  <div key={record.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{record.type}</div>
                          <div className="text-xs text-gray-500">
                            {record.customerName} · {record.time.split(" ")[1]}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">+¥{record.amount.toFixed(2)}</div>
                        <div className="text-xs text-gray-400">{record.time.split(" ")[0]}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500">暂无收益记录</p>
              </div>
            )
          ) : member.withdrawHistory.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {member.withdrawHistory.map((record) => (
                <div key={record.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{record.type}</div>
                        <div className="text-xs text-gray-500">{record.time}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-purple-600">¥{record.amount.toFixed(2)}</div>
                      <Badge
                        className={`text-xs rounded-full ${
                          record.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {record.status === "completed" ? "已完成" : "处理中"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500">暂无提现明细</p>
            </div>
          )}
        </Card>
      </div>

      {/* 专属链接 */}
      <div className="px-4 mt-6 mb-4">
        <Card className="p-4 border-0 shadow-lg rounded-2xl bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-gray-900">专属入口链接</span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-xl bg-transparent"
              onClick={() => copyLink(`${member.webUrl}&channel=${member.code}`)}
            >
              <Copy className="h-3 w-3 mr-1" />
              复制
            </Button>
          </div>
          <div className="flex items-center space-x-2 bg-white rounded-xl p-3 border border-gray-100">
            <Link2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="text-xs text-gray-600 truncate">
              {member.webUrl}&channel={member.code}
            </span>
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  )
}
