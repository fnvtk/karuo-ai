"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Download, Mail, Share2, Tag, Users, Database, BarChart2, PieChart } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface StrategyReport {
  id: string
  name: string
  deviceNames: string[]
  trafficPoolNames: string[]
  createdAt: string
  completedAt: string
  strategyType: "jd" | "yisi" | "database" | "custom"
  strategyName: string
  trafficPoolSize: number
  optimizedUsers: number
  summary: string
  userSegments: {
    name: string
    count: number
    percentage: number
  }[]
  userAttributes: {
    [key: string]: {
      name: string
      count: number
      percentage: number
    }[]
  }
  recommendations: string[]
}

export default function StrategyReportPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [report, setReport] = useState<StrategyReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 模拟加载报告数据
    const fetchReport = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const mockReport: StrategyReport = {
        id: params.id,
        name: "京东会员优化",
        deviceNames: ["设备1", "设备2"],
        trafficPoolNames: ["微信好友池-设备1", "设备流量池-设备1"],
        createdAt: "2023-12-15T10:30:00Z",
        completedAt: "2023-12-15T11:45:00Z",
        strategyType: "jd",
        strategyName: "京东会员识别",
        trafficPoolSize: 287,
        optimizedUsers: 142,
        summary:
          "通过京东会员识别策略，在287位用户中成功识别出142位京东会员用户，占比49.5%。其中PLUS会员38位，VIP会员56位，普通会员48位。这些用户主要集中在电子产品和美妆护肤品类，消费能力中上。建议针对PLUS会员和VIP会员进行高端产品推广，对普通会员提供会员升级优惠。",
        userSegments: [
          { name: "PLUS会员", count: 38, percentage: 27 },
          { name: "VIP会员", count: 56, percentage: 39 },
          { name: "普通会员", count: 48, percentage: 34 },
        ],
        userAttributes: {
          购物偏好: [
            { name: "电子产品", count: 52, percentage: 37 },
            { name: "美妆护肤", count: 43, percentage: 30 },
            { name: "家居生活", count: 28, percentage: 20 },
            { name: "服装鞋包", count: 19, percentage: 13 },
          ],
          消费能力: [
            { name: "高", count: 35, percentage: 25 },
            { name: "中高", count: 48, percentage: 34 },
            { name: "中", count: 39, percentage: 27 },
            { name: "中低", count: 20, percentage: 14 },
          ],
          活跃度: [
            { name: "高度活跃", count: 42, percentage: 30 },
            { name: "中度活跃", count: 63, percentage: 44 },
            { name: "低度活跃", count: 37, percentage: 26 },
          ],
        },
        recommendations: [
          "针对PLUS会员推送高端电子产品和限量版美妆产品",
          "为VIP会员提供专属优惠券和新品预售资格",
          "向普通会员推广PLUS会员权益，提供升级优惠",
          "根据用户购物偏好进行精准内容推送",
          "对高消费能力用户提供专属客服和VIP服务",
        ],
      }

      setReport(mockReport)
      setIsLoading(false)
    }

    fetchReport()
  }, [params.id])

  const getStrategyTypeLabel = (type: string) => {
    switch (type) {
      case "jd":
        return "京东会员"
      case "yisi":
        return "易思接口"
      case "database":
        return "数据库匹配"
      case "custom":
        return "自定义策略"
      default:
        return "未知类型"
    }
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">策略优化报告</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">导入标签</span>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">发送报告</span>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">下载报告</span>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">分享</span>
          </Button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 p-4 overflow-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
          </div>
        ) : report ? (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* 报告头部 */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div>
                    <CardTitle className="text-xl">{report.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{new Date(report.completedAt).toLocaleString()} 完成</p>
                  </div>
                  <Badge className="self-start sm:self-auto bg-green-100 text-green-800 border-green-200">
                    {getStrategyTypeLabel(report.strategyType)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">流量池大小</p>
                      <p className="font-semibold">{report.trafficPoolSize} 用户</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Database className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">优化用户数</p>
                      <p className="font-semibold">{report.optimizedUsers} 用户</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <BarChart2 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">优化比例</p>
                      <p className="font-semibold">
                        {Math.round((report.optimizedUsers / report.trafficPoolSize) * 100)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">优化摘要</h3>
                  <p className="text-sm text-gray-700">{report.summary}</p>
                </div>
              </CardContent>
            </Card>

            {/* 详细分析 */}
            <Tabs defaultValue="segments" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="segments">用户分类</TabsTrigger>
                <TabsTrigger value="attributes">用户属性</TabsTrigger>
              </TabsList>

              <TabsContent value="segments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">用户分类分析</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium mb-3">用户分类</h3>
                        <div className="space-y-3">
                          {report.userSegments.map((segment, index) => (
                            <div key={index}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{segment.name}</span>
                                <span className="font-medium">
                                  {segment.count} ({segment.percentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${segment.percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium mb-3">分类分布</h3>
                        <div className="flex items-center h-40 justify-center">
                          <PieChart className="h-32 w-32 text-gray-400" />
                        </div>
                        <div className="grid grid-cols-3 text-center mt-2">
                          {report.userSegments.map((segment, index) => (
                            <div key={index}>
                              <div className="text-sm text-gray-500">{segment.name}</div>
                              <div className="font-medium">
                                {segment.count} ({segment.percentage}%)
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">优化建议</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {report.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                          </div>
                          <p className="text-gray-700">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attributes" className="space-y-4">
                {Object.entries(report.userAttributes).map(([category, attributes], categoryIndex) => (
                  <Card key={categoryIndex}>
                    <CardHeader>
                      <CardTitle className="text-lg">{category}分析</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="font-medium mb-3">{category}分布</h3>
                          <div className="space-y-3">
                            {attributes.map((attribute, index) => (
                              <div key={index}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>{attribute.name}</span>
                                  <span className="font-medium">
                                    {attribute.count} ({attribute.percentage}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-green-500 h-2 rounded-full"
                                    style={{ width: `${attribute.percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="font-medium mb-3">图表展示</h3>
                          <div className="flex items-center h-40 justify-center">
                            <PieChart className="h-32 w-32 text-gray-400" />
                          </div>
                          <div className="grid grid-cols-2 text-center mt-2 gap-2">
                            {attributes.map((attribute, index) => (
                              <div key={index}>
                                <div className="text-sm text-gray-500">{attribute.name}</div>
                                <div className="font-medium">
                                  {attribute.count} ({attribute.percentage}%)
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">未找到报告数据</p>
          </div>
        )}
      </div>
    </div>
  )
}
