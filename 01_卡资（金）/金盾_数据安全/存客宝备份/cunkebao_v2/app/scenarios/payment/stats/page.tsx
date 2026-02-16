"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Download, Calendar, TrendingUp, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { LineChartComponent, BarChartComponent, PieChartComponent } from "@/app/components/common/Charts"
import { toast } from "@/components/ui/use-toast"

export default function PaymentStatsPage() {
  const router = useRouter()
  const [dateRange, setDateRange] = useState("week")
  const [activeTab, setActiveTab] = useState("overview")

  // 模拟图表数据
  const lineChartData = [
    { name: "周一", 支付笔数: 24, 支付金额: 478.8 },
    { name: "周二", 支付笔数: 32, 支付金额: 636.8 },
    { name: "周三", 支付笔数: 28, 支付金额: 557.2 },
    { name: "周四", 支付笔数: 36, 支付金额: 716.4 },
    { name: "周五", 支付笔数: 42, 支付金额: 835.8 },
    { name: "周六", 支付笔数: 38, 支付金额: 756.2 },
    { name: "周日", 支付笔数: 35, 支付金额: 696.5 },
  ]

  const barChartData = [
    { name: "社群会员付款码", 支付笔数: 156, 支付金额: 3104.4 },
    { name: "课程付款码", 支付笔数: 78, 支付金额: 7722 },
    { name: "咨询服务付款码", 支付笔数: 45, 支付金额: 8955 },
    { name: "产品购买付款码", 支付笔数: 32, 支付金额: 9568 },
  ]

  const pieChartData = [
    { name: "微信支付", value: 75 },
    { name: "支付宝", value: 25 },
  ]

  const lineChartConfig = {
    支付笔数: { label: "支付笔数", color: "#3b82f6" },
    支付金额: { label: "支付金额", color: "#10b981" },
  }

  const barChartConfig = {
    支付笔数: { label: "支付笔数", color: "#3b82f6" },
    支付金额: { label: "支付金额", color: "#10b981" },
  }

  const pieChartConfig = {
    微信支付: { label: "微信支付", color: "#10b981" },
    支付宝: { label: "支付宝", color: "#3b82f6" },
  }

  const handleExport = () => {
    toast({
      title: "导出成功",
      description: "数据统计报表已导出为Excel文件",
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="ml-2 text-lg font-medium">数据统计</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleExport}>
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* 日期范围选择 */}
      <div className="p-4">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger>
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="选择时间范围" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">今日</SelectItem>
            <SelectItem value="week">本周</SelectItem>
            <SelectItem value="month">本月</SelectItem>
            <SelectItem value="quarter">本季度</SelectItem>
            <SelectItem value="year">本年</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 统计卡片 */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">总支付笔数</p>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-2xl font-semibold">311</p>
              <p className="text-xs text-green-500 mt-1">+12.5% 较上期</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">总支付金额</p>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-2xl font-semibold">¥29,845</p>
              <p className="text-xs text-green-500 mt-1">+8.3% 较上期</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">新增客户</p>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </div>
              <p className="text-2xl font-semibold">289</p>
              <p className="text-xs text-red-500 mt-1">-3.2% 较上期</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">平均客单价</p>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-2xl font-semibold">¥95.98</p>
              <p className="text-xs text-green-500 mt-1">+5.6% 较上期</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 图表标签页 */}
      <div className="flex-1 px-4 pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="trend">趋势</TabsTrigger>
            <TabsTrigger value="distribution">分布</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <LineChartComponent
              title="支付趋势"
              description="本周支付笔数和金额趋势"
              data={lineChartData}
              config={lineChartConfig}
              height={250}
            />

            <BarChartComponent
              title="付款码对比"
              description="各付款码支付情况对比"
              data={barChartData}
              config={barChartConfig}
              height={250}
            />
          </TabsContent>

          <TabsContent value="trend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>支付趋势分析</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChartComponent data={lineChartData} config={lineChartConfig} height={300} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">趋势说明</h3>
                <div className="space-y-2 text-sm">
                  <p>• 本周支付笔数较上周增长 12.5%</p>
                  <p>• 周五为支付高峰期，建议加强营销推广</p>
                  <p>• 周末支付量保持稳定，用户活跃度良好</p>
                  <p>• 平均每日支付笔数为 33.6 笔</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4">
            <PieChartComponent
              title="支付方式分布"
              description="各支付方式占比"
              data={pieChartData}
              config={pieChartConfig}
              height={250}
            />

            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">客户分布</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-500">新客户</span>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">289</span>
                      <span className="text-sm text-gray-500">(92.9%)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-500">老客户</span>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">22</span>
                      <span className="text-sm text-gray-500">(7.1%)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500">复购率</span>
                    <span className="font-medium">7.1%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">地域分布 TOP5</h3>
                <div className="space-y-3">
                  {[
                    { city: "广州", count: 89, percent: 28.6 },
                    { city: "深圳", count: 67, percent: 21.5 },
                    { city: "上海", count: 45, percent: 14.5 },
                    { city: "北京", count: 38, percent: 12.2 },
                    { city: "杭州", count: 32, percent: 10.3 },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-600">{item.city}</span>
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${item.percent}%` }} />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
