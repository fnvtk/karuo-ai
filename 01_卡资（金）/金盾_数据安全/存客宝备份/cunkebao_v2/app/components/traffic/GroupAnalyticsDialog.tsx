"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Users, DollarSign, MessageCircle, Target, Award } from "lucide-react"
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from "chart.js"
import { Doughnut, Bar } from "react-chartjs-2"
import type { TrafficUser, TrafficPoolGroup } from "@/types/traffic"

// 注册 Chart.js 组件
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

interface GroupAnalyticsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: TrafficPoolGroup
  users: TrafficUser[]
}

export default function GroupAnalyticsDialog({ open, onOpenChange, group, users }: GroupAnalyticsDialogProps) {
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    highValueCount: 0,
    potentialCount: 0,
    lowValueCount: 0,
    avgRfm: 0,
    totalSpent: 0,
    avgSpent: 0,
    totalInteractions: 0,
    avgInteractions: 0,
    regionDistribution: {} as Record<string, number>,
    categoryDistribution: {} as Record<string, number>,
  })

  useEffect(() => {
    if (open && users.length > 0) {
      calculateAnalytics()
    }
  }, [open, users])

  const calculateAnalytics = () => {
    // 计算各类统计数据
    const totalUsers = users.length
    const highValueCount = users.filter((u) => u.rfmScore && u.rfmScore.total >= 12).length
    const potentialCount = users.filter((u) => u.rfmScore && u.rfmScore.total >= 6 && u.rfmScore.total < 12).length
    const lowValueCount = users.filter((u) => u.rfmScore && u.rfmScore.total < 6).length

    const totalRfm = users.reduce((sum, u) => sum + (u.rfmScore?.total || 0), 0)
    const avgRfm = totalUsers > 0 ? totalRfm / totalUsers : 0

    const totalSpent = users.reduce((sum, u) => sum + (u.totalSpent || 0), 0)
    const avgSpent = totalUsers > 0 ? totalSpent / totalUsers : 0

    const totalInteractions = users.reduce((sum, u) => sum + (u.interactionCount || 0), 0)
    const avgInteractions = totalUsers > 0 ? totalInteractions / totalUsers : 0

    // 地区分布
    const regionDistribution: Record<string, number> = {}
    users.forEach((u) => {
      const region = u.region || "未知"
      regionDistribution[region] = (regionDistribution[region] || 0) + 1
    })

    // 客户类别分布
    const categoryDistribution: Record<string, number> = {}
    users.forEach((u) => {
      const category = u.category === "customer" ? "客户" : u.category === "potential" ? "潜在" : "流失"
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1
    })

    setAnalytics({
      totalUsers,
      highValueCount,
      potentialCount,
      lowValueCount,
      avgRfm,
      totalSpent,
      avgSpent,
      totalInteractions,
      avgInteractions,
      regionDistribution,
      categoryDistribution,
    })
  }

  // RFM分布饼图数据
  const rfmChartData = {
    labels: ["高价值", "中等价值", "低价值"],
    datasets: [
      {
        data: [analytics.highValueCount, analytics.potentialCount, analytics.lowValueCount],
        backgroundColor: ["#ef4444", "#3b82f6", "#9ca3af"],
        borderWidth: 0,
      },
    ],
  }

  // 地区分布柱状图数据
  const regionChartData = {
    labels: Object.keys(analytics.regionDistribution).slice(0, 5),
    datasets: [
      {
        label: "客户数量",
        data: Object.values(analytics.regionDistribution).slice(0, 5),
        backgroundColor: "#3b82f6",
      },
    ],
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            {group.name} - 数据分析
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* 核心指标卡片 */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">总客户数</div>
                    <div className="text-xl font-bold text-blue-600">{analytics.totalUsers}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Target className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">平均RFM</div>
                    <div className="text-xl font-bold text-purple-600">{analytics.avgRfm.toFixed(1)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">人均消费</div>
                    <div className="text-xl font-bold text-green-600">¥{analytics.avgSpent.toFixed(0)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <MessageCircle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">人均互动</div>
                    <div className="text-xl font-bold text-orange-600">{analytics.avgInteractions.toFixed(1)}次</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 客户价值分布 */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-gray-700" />
                <h3 className="font-medium">客户价值分布</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{analytics.highValueCount}</div>
                  <div className="text-xs text-gray-600">高价值客户</div>
                  <div className="text-xs text-gray-400">RFM ≥ 12</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{analytics.potentialCount}</div>
                  <div className="text-xs text-gray-600">中等价值</div>
                  <div className="text-xs text-gray-400">6 ≤ RFM {"<"} 12</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{analytics.lowValueCount}</div>
                  <div className="text-xs text-gray-600">低价值客户</div>
                  <div className="text-xs text-gray-400">RFM {"<"} 6</div>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="w-48 h-48">
                  <Doughnut
                    data={rfmChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          position: "bottom",
                          labels: {
                            padding: 10,
                            font: { size: 11 },
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 地区分布 */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-medium mb-4">Top 5 地区分布</h3>
              <div className="h-48">
                <Bar
                  data={regionChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* 运营建议 */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-medium mb-3">💡 运营建议</h3>
              <div className="space-y-2 text-sm">
                {analytics.highValueCount > analytics.totalUsers * 0.3 && (
                  <div className="p-2 bg-green-50 rounded text-green-700">
                    ✓ 高价值客户占比较高（
                    {((analytics.highValueCount / analytics.totalUsers) * 100).toFixed(1)}%
                    ），建议持续维护关系，提供VIP服务
                  </div>
                )}
                {analytics.potentialCount > analytics.highValueCount && (
                  <div className="p-2 bg-blue-50 rounded text-blue-700">↑ 潜在客户数量较多，建议加强培育和转化策略</div>
                )}
                {analytics.avgRfm < 8 && (
                  <div className="p-2 bg-orange-50 rounded text-orange-700">
                    ⚠ 平均RFM评分偏低，建议优化客户质量和互动频率
                  </div>
                )}
                {analytics.avgInteractions < 10 && (
                  <div className="p-2 bg-yellow-50 rounded text-yellow-700">
                    📱 客户互动频率较低，建议增加触达和沟通
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
