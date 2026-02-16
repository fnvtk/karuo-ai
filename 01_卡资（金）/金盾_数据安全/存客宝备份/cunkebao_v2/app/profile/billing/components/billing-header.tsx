"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Zap, TrendingUp, BarChart3, Calendar } from "lucide-react"
import { Progress } from "@/components/ui/progress"

// 模拟用户账户数据 - 保持1位小数
const mockAccountData = {
  remainingPower: 9303.5,
  totalPower: 15000.0,
  todayStats: {
    addedFriends: 15,
    aiContent: 28,
    contentDistribution: 42,
  },
  yesterdayConsumedPower: 160.6,
  todayConsumedPower: 86.4,
  weeklyAverage: 142.3,
  efficiency: 87.5,
  predictedDays: 65,
}

export function BillingHeader() {
  const usageRate = ((mockAccountData.totalPower - mockAccountData.remainingPower) / mockAccountData.totalPower) * 100

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">剩余算力</p>
              <p className="text-3xl font-bold">{mockAccountData.remainingPower}</p>
              <p className="text-blue-100 text-xs mt-1">总计 {mockAccountData.totalPower}</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <Zap className="h-8 w-8" />
            </div>
          </div>
          <div className="mt-4">
            <Progress value={usageRate} className="h-2 bg-blue-400" />
            <p className="text-blue-100 text-xs mt-1">使用率 {usageRate.toFixed(1)}%</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">今日消耗</p>
              <p className="text-3xl font-bold">{mockAccountData.todayConsumedPower}</p>
              <p className="text-green-100 text-xs mt-1">周均 {mockAccountData.weeklyAverage}</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <BarChart3 className="h-8 w-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">使用效率</p>
              <p className="text-3xl font-bold">{mockAccountData.efficiency}%</p>
              <p className="text-purple-100 text-xs mt-1">本月优秀</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <TrendingUp className="h-8 w-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">预计可用</p>
              <p className="text-3xl font-bold">{mockAccountData.predictedDays}</p>
              <p className="text-orange-100 text-xs mt-1">天</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <Calendar className="h-8 w-8" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
