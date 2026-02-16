"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart3, TrendingUp, TrendingDown, Users, Star, Target, DollarSign, Percent } from "lucide-react"

interface AnalyticsData {
  totalUsers: number
  highValueUsers: number
  mediumValueUsers: number
  lowValueUsers: number
  duplicateUsers: number
  pendingUsers: number
  addedUsers: number
  failedUsers: number
  avgSpent: number
  conversionRate: number
  addSuccessRate: number
  duplicateRate: number
  dailyGrowth: number
  weeklyGrowth: number
  monthlyGrowth: number
}

interface AnalyticsDashboardProps {
  data: AnalyticsData
}

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  // 计算百分比
  const highValuePercentage = (data.highValueUsers / data.totalUsers) * 100
  const mediumValuePercentage = (data.mediumValueUsers / data.totalUsers) * 100
  const lowValuePercentage = (data.lowValueUsers / data.totalUsers) * 100

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k"
    }
    return num.toString()
  }

  // 格式化百分比
  const formatPercentage = (num: number) => {
    return num.toFixed(1) + "%"
  }

  // 获取趋势图标和颜色
  const getTrendIcon = (value: number) => {
    if (value > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    } else if (value < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    }
    return <div className="h-4 w-4" />
  }

  const getTrendColor = (value: number) => {
    if (value > 0) return "text-green-600"
    if (value < 0) return "text-red-600"
    return "text-gray-600"
  }

  return (
    <div className="space-y-4">
      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 总用户数 */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">{formatNumber(data.totalUsers)}</div>
              <div className="text-xs text-gray-500">总用户数</div>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
          <div className="flex items-center mt-2 text-xs">
            {getTrendIcon(data.dailyGrowth)}
            <span className={getTrendColor(data.dailyGrowth)}>
              {data.dailyGrowth > 0 ? "+" : ""}
              {data.dailyGrowth}% 日增长
            </span>
          </div>
        </Card>

        {/* 高价值用户 */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-600">{formatNumber(data.highValueUsers)}</div>
              <div className="text-xs text-gray-500">高价值用户</div>
            </div>
            <Star className="h-8 w-8 text-red-500" />
          </div>
          <div className="flex items-center mt-2 text-xs">
            <span className="text-gray-600">占比 {formatPercentage(highValuePercentage)}</span>
          </div>
        </Card>

        {/* 平均消费 */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">¥{data.avgSpent}</div>
              <div className="text-xs text-gray-500">平均消费</div>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
          <div className="flex items-center mt-2 text-xs">
            {getTrendIcon(data.weeklyGrowth)}
            <span className={getTrendColor(data.weeklyGrowth)}>
              {data.weeklyGrowth > 0 ? "+" : ""}
              {data.weeklyGrowth}% 周增长
            </span>
          </div>
        </Card>

        {/* 转化率 */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-600">{formatPercentage(data.conversionRate)}</div>
              <div className="text-xs text-gray-500">转化率</div>
            </div>
            <Target className="h-8 w-8 text-purple-500" />
          </div>
          <div className="flex items-center mt-2 text-xs">
            {getTrendIcon(data.monthlyGrowth)}
            <span className={getTrendColor(data.monthlyGrowth)}>
              {data.monthlyGrowth > 0 ? "+" : ""}
              {data.monthlyGrowth}% 月增长
            </span>
          </div>
        </Card>
      </div>

      {/* 用户价值分布 */}
      <Card className="p-4">
        <div className="flex items-center mb-3">
          <BarChart3 className="h-5 w-5 mr-2 text-gray-600" />
          <h3 className="text-sm font-medium">用户价值分布</h3>
        </div>
        <div className="space-y-3">
          {/* 高价值用户 */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                <span>高价值用户</span>
              </div>
              <span className="font-medium">
                {data.highValueUsers} ({formatPercentage(highValuePercentage)})
              </span>
            </div>
            <Progress value={highValuePercentage} className="h-2" />
          </div>

          {/* 中价值用户 */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                <span>中价值用户</span>
              </div>
              <span className="font-medium">
                {data.mediumValueUsers} ({formatPercentage(mediumValuePercentage)})
              </span>
            </div>
            <Progress value={mediumValuePercentage} className="h-2" />
          </div>

          {/* 低价值用户 */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-500 rounded mr-2"></div>
                <span>低价值用户</span>
              </div>
              <span className="font-medium">
                {data.lowValueUsers} ({formatPercentage(lowValuePercentage)})
              </span>
            </div>
            <Progress value={lowValuePercentage} className="h-2" />
          </div>
        </div>
      </Card>

      {/* 添加效率分析 */}
      <Card className="p-4">
        <div className="flex items-center mb-3">
          <Target className="h-5 w-5 mr-2 text-gray-600" />
          <h3 className="text-sm font-medium">添加效率分析</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">成功率</span>
              <span className="font-medium text-green-600">{formatPercentage(data.addSuccessRate)}</span>
            </div>
            <Progress value={data.addSuccessRate} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">重复率</span>
              <span className="font-medium text-orange-600">{formatPercentage(data.duplicateRate)}</span>
            </div>
            <Progress value={data.duplicateRate} className="h-2" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{data.addedUsers}</div>
            <div className="text-xs text-gray-500">已添加</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">{data.pendingUsers}</div>
            <div className="text-xs text-gray-500">待添加</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">{data.failedUsers}</div>
            <div className="text-xs text-gray-500">添加失败</div>
          </div>
        </div>
      </Card>

      {/* 数据质量指标 */}
      <Card className="p-4">
        <div className="flex items-center mb-3">
          <Percent className="h-5 w-5 mr-2 text-gray-600" />
          <h3 className="text-sm font-medium">数据质量指标</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">重复用户</span>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-orange-50 text-orange-800">
                {data.duplicateUsers} 个
              </Badge>
              <span className="text-sm font-medium">{formatPercentage(data.duplicateRate)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">数据完整性</span>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-green-50 text-green-800">
                优秀
              </Badge>
              <span className="text-sm font-medium">98.5%</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">标签覆盖率</span>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-800">
                良好
              </Badge>
              <span className="text-sm font-medium">85.2%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 增长趋势 */}
      <Card className="p-4">
        <div className="flex items-center mb-3">
          <TrendingUp className="h-5 w-5 mr-2 text-gray-600" />
          <h3 className="text-sm font-medium">增长趋势</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-md">
            <div className="flex items-center justify-center mb-1">
              {getTrendIcon(data.dailyGrowth)}
              <span className={`text-sm font-medium ml-1 ${getTrendColor(data.dailyGrowth)}`}>
                {data.dailyGrowth > 0 ? "+" : ""}
                {formatPercentage(data.dailyGrowth)}
              </span>
            </div>
            <div className="text-xs text-gray-500">日增长</div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-md">
            <div className="flex items-center justify-center mb-1">
              {getTrendIcon(data.weeklyGrowth)}
              <span className={`text-sm font-medium ml-1 ${getTrendColor(data.weeklyGrowth)}`}>
                {data.weeklyGrowth > 0 ? "+" : ""}
                {formatPercentage(data.weeklyGrowth)}
              </span>
            </div>
            <div className="text-xs text-gray-500">周增长</div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-md">
            <div className="flex items-center justify-center mb-1">
              {getTrendIcon(data.monthlyGrowth)}
              <span className={`text-sm font-medium ml-1 ${getTrendColor(data.monthlyGrowth)}`}>
                {data.monthlyGrowth > 0 ? "+" : ""}
                {formatPercentage(data.monthlyGrowth)}
              </span>
            </div>
            <div className="text-xs text-gray-500">月增长</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
