"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  RefreshCw,
  Zap,
  TrendingUp,
  Calendar,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  Sparkles,
  Target,
  MessageSquare,
  FileText,
  Lightbulb,
  Bot,
  Receipt,
  ShoppingBag,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { PaymentQRDialog } from "@/app/components/PaymentQRDialog"

interface ConsumptionRecord {
  id: string
  date: string
  type: string
  model: string
  description: string
  computePower: number
  tokens: number
  duration: string
  status: "completed" | "pending" | "failed"
}

const mockConsumptionRecords: ConsumptionRecord[] = [
  {
    id: "1",
    date: "2025/2/22 17:02:00",
    type: "智能客服",
    model: "GPT4oMini",
    description: "销售咨询 - 客户意向分析",
    computePower: -2.2,
    tokens: 1240,
    duration: "耗时 0.8s",
    status: "completed",
  },
  {
    id: "2",
    date: "2025/2/22 17:02:00",
    type: "内容创作",
    model: "GPT4",
    description: "营销策略 - 营销方案生成",
    computePower: -1.7,
    tokens: 890,
    duration: "耗时 1.2s",
    status: "completed",
  },
  {
    id: "3",
    date: "2025/2/22 15:43:00",
    type: "用户分析",
    model: "GPT4oMini",
    description: "运营数据 - 数据分析",
    computePower: -2.3,
    tokens: 1560,
    duration: "耗时 2.1s",
    status: "completed",
  },
  {
    id: "4",
    date: "2025/2/22 14:25:00",
    type: "自动回复",
    model: "GPT4Mini",
    description: "客服机器人 - 自动回复",
    computePower: -0.8,
    tokens: 420,
    duration: "耗时 0.5s",
    status: "completed",
  },
]

interface ComputePackage {
  id: string
  name: string
  computePower: number
  originalPrice: number
  currentPrice: number
  discount: string
  unitPrice: string
  features: string[]
  isPopular?: boolean
  savings?: number
}

const computePackages: ComputePackage[] = [
  {
    id: "1",
    name: "基础算力包",
    computePower: 1000,
    originalPrice: 200,
    currentPrice: 98,
    discount: "51% OFF",
    unitPrice: "¥0.098/算力",
    savings: 102,
    features: ["适合个人用户日常使用", "永久有效", "基础算力满足"],
  },
  {
    id: "2",
    name: "标准算力包",
    computePower: 7500,
    originalPrice: 1500,
    currentPrice: 598,
    discount: "60% OFF",
    unitPrice: "¥0.080/算力",
    isPopular: true,
    savings: 902,
    features: ["全功能AI服务", "优先级权重", "使用期限长", "7×24技术支持"],
  },
  {
    id: "3",
    name: "高级算力包",
    computePower: 250000,
    originalPrice: 50000,
    currentPrice: 19800,
    discount: "60% OFF",
    unitPrice: "¥0.079/算力",
    savings: 30200,
    features: ["适合企业大规模使用", "企业管理端", "定制化方案", "SLA保障", "数据安全全认证"],
  },
]

export default function BillingPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("usage")
  const [consumptionRecords, setConsumptionRecords] = useState<ConsumptionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDepartment, setFilterDepartment] = useState("all")
  const [filterModel, setFilterModel] = useState("all")
  const [filterService, setFilterService] = useState("all")
  const [customAmount, setCustomAmount] = useState("")
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<ComputePackage | null>(null)

  const computeStats = {
    remaining: 9303.5,
    total: 15000,
    usagePercent: 38.0,
    todayUsage: 86.4,
    todayIncrease: 142.3,
    efficiencyRate: 87.5,
    predictedDays: 65,
    yesterdayUsage: 160.6,
    monthlyUsage: 4267.8,
  }

  const loadData = async () => {
    try {
      setLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 500))
      setConsumptionRecords(mockConsumptionRecords)
    } catch (error) {
      console.error("加载数据失败:", error)
      setConsumptionRecords(mockConsumptionRecords)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleBack = () => {
    router.back()
  }

  const handleRefresh = () => {
    loadData()
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "completed":
        return { text: "成功", icon: CheckCircle2, color: "text-green-600" }
      case "pending":
        return { text: "处理中", icon: Clock, color: "text-yellow-600" }
      case "failed":
        return { text: "失败", icon: XCircle, color: "text-red-600" }
      default:
        return { text: "未知", icon: Clock, color: "text-gray-600" }
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "智能客服":
        return MessageSquare
      case "内容创作":
        return FileText
      case "用户分析":
        return BarChart3
      case "自动回复":
        return Bot
      default:
        return Sparkles
    }
  }

  const handlePurchase = (pkg: ComputePackage) => {
    setSelectedPackage(pkg)
    setPaymentDialogOpen(true)
  }

  const handleCustomPurchase = () => {
    if (!customAmount || Number(customAmount) < 50 || Number(customAmount) > 50000) {
      // 这里可以添加toast提示
      return
    }

    const computePower = Math.floor(Number(customAmount) * 10)
    const customPackage: ComputePackage = {
      id: "custom",
      name: "自定义算力包",
      computePower: computePower,
      originalPrice: Number(customAmount),
      currentPrice: Number(customAmount),
      discount: "0",
      unitPrice: "¥0.100/算力",
      features: ["自定义购买金额", "永久有效", "灵活选择"],
    }
    setSelectedPackage(customPackage)
    setPaymentDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-base font-semibold">算力管理中心</h1>
              <p className="text-xs text-gray-500">Computing Power Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right mr-2">
              <div className="text-lg font-bold text-blue-600">{computeStats.remaining}</div>
              <div className="text-xs text-gray-500">算力</div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleRefresh} className="h-8 w-8">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <Card className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-blue-100 text-xs mb-1">剩余算力</div>
                <div className="text-white text-3xl font-bold mb-1">{computeStats.remaining}</div>
                <div className="text-blue-100 text-xs">总计 {computeStats.total}</div>
              </div>
              <div className="bg-white/20 p-2.5 rounded-full">
                <Zap className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-blue-100">
                <span>使用率 {computeStats.usagePercent}%</span>
              </div>
              <div className="h-2 bg-blue-400/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${computeStats.usagePercent}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 shadow-md">
            <CardContent className="p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div className="text-white text-xs">今日消耗</div>
              </div>
              <div className="text-white text-2xl font-bold mb-0.5">{computeStats.todayUsage}</div>
              <div className="text-green-100 text-xs">周增 {computeStats.todayIncrease}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-md">
            <CardContent className="p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <Target className="h-4 w-4 text-white" />
                </div>
                <div className="text-white text-xs">使用效率</div>
              </div>
              <div className="text-white text-2xl font-bold mb-0.5">{computeStats.efficiencyRate}%</div>
              <div className="text-purple-100 text-xs">本月优秀</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 shadow-md">
            <CardContent className="p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <div className="text-white text-xs">预计可用</div>
              </div>
              <div className="text-white text-2xl font-bold mb-0.5">{computeStats.predictedDays}</div>
              <div className="text-orange-100 text-xs">天</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-600 to-gray-700 border-0 shadow-md">
            <CardContent className="p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <div className="text-white text-xs">昨日消耗</div>
              </div>
              <div className="text-white text-2xl font-bold mb-0.5">{computeStats.yesterdayUsage}</div>
              <div className="text-gray-300 text-xs">月度 {computeStats.monthlyUsage}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="usage" className="text-sm">
              消费记录
            </TabsTrigger>
            <TabsTrigger value="purchase" className="text-sm">
              购买算力
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usage" className="mt-3 space-y-3">
            {/* 筛选条件 */}
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="text-sm font-medium">筛选条件</div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    <Download className="h-3.5 w-3.5 mr-1" />
                    导出
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-gray-600 mb-1.5">部门</div>
                    <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部部门</SelectItem>
                        <SelectItem value="sales">销售部</SelectItem>
                        <SelectItem value="marketing">市场部</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1.5">AI模型</div>
                    <Select value={filterModel} onValueChange={setFilterModel}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部模型</SelectItem>
                        <SelectItem value="gpt4">GPT-4</SelectItem>
                        <SelectItem value="gpt4mini">GPT-4 Mini</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-xs text-gray-600 mb-1.5">服务类型</div>
                  <Select value={filterService} onValueChange={setFilterService}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部服务</SelectItem>
                      <SelectItem value="chat">智能对话</SelectItem>
                      <SelectItem value="analysis">数据分析</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full mt-3 h-9 bg-blue-600 hover:bg-blue-700 text-sm">查询记录</Button>
              </CardContent>
            </Card>

            {/* 快速操作区域 */}
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <div className="text-sm font-medium mb-2.5">快速操作</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center gap-2 bg-transparent hover:bg-blue-50"
                    onClick={() => router.push("/profile/billing/consumption")}
                  >
                    <Receipt className="h-5 w-5 text-blue-600" />
                    <span className="text-xs">消费记录</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center gap-2 bg-transparent hover:bg-green-50"
                    onClick={() => router.push("/profile/billing/orders")}
                  >
                    <ShoppingBag className="h-5 w-5 text-green-600" />
                    <span className="text-xs">订单历史</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI服务类型说明 */}
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs justify-start bg-transparent">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                    AI服务类型说明
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs justify-start bg-transparent">
                    <Lightbulb className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                    智能对话
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs justify-start bg-transparent">
                    <BarChart3 className="h-3.5 w-3.5 mr-1.5 text-orange-500" />
                    数据分析
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs justify-start bg-transparent">
                    <FileText className="h-3.5 w-3.5 mr-1.5 text-purple-500" />
                    内容生成
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs justify-start bg-transparent">
                    <Target className="h-3.5 w-3.5 mr-1.5 text-pink-500" />
                    自动化
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 消费明细列表 */}
            <div>
              <div className="flex items-center justify-between mb-2.5 px-1">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">消费明细</span>
                </div>
                <span className="text-xs text-blue-600">共 4 条</span>
              </div>

              <div className="space-y-2">
                {consumptionRecords.map((record) => {
                  const statusInfo = getStatusInfo(record.status)
                  const TypeIcon = getTypeIcon(record.type)
                  return (
                    <Card key={record.id} className="shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2.5">
                          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-2 rounded-lg flex-shrink-0">
                            <TypeIcon className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1.5">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{record.type}</span>
                                  <span className="text-xs text-gray-500">{record.model}</span>
                                  <Badge
                                    variant="outline"
                                    className={`${statusInfo.color} border-0 px-1.5 py-0 h-5 text-xs`}
                                  >
                                    {statusInfo.text}
                                  </Badge>
                                </div>
                                <div className="text-xs text-gray-600 mb-1.5">
                                  {record.description.split(" - ")[0]}: {record.description.split(" - ")[1]}
                                </div>
                                <div className="text-xs text-gray-400 mb-1.5">
                                  {record.date} · {record.duration}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-2">
                                <div className="text-base font-bold text-red-600">{record.computePower}</div>
                                <div className="text-xs text-gray-500">剩余 {computeStats.remaining}</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <div className="text-xs">
                                <span className="text-gray-500">Token</span>
                                <span className="ml-2 font-medium">{record.tokens}</span>
                              </div>
                              <div className="text-xs">
                                <span className="text-gray-500">类型</span>
                                <span className="ml-2 font-medium text-blue-600">{record.type}</span>
                              </div>
                              <div className="text-xs">
                                <span className="text-gray-500">状态</span>
                                <span className={`ml-2 font-medium ${statusInfo.color}`}>{statusInfo.text}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* 分页 */}
              <div className="flex items-center justify-center gap-1 mt-4">
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs bg-transparent">
                  上一页
                </Button>
                <Button variant="default" size="sm" className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700">
                  1
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent">
                  2
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent">
                  3
                </Button>
                <span className="text-xs text-gray-400 px-2">...</span>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent">
                  514
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs bg-transparent">
                  下一页
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="purchase" className="mt-3 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 mb-2.5 px-1">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">算力充值套餐</span>
                <Button variant="ghost" size="sm" className="h-6 ml-auto text-xs text-blue-600">
                  <Target className="h-3 w-3 mr-1" />
                  安全保障
                </Button>
              </div>

              <div className="space-y-3">
                {computePackages.map((pkg) => (
                  <Card
                    key={pkg.id}
                    className={`shadow-sm hover:shadow-md transition-all ${
                      pkg.isPopular ? "border-2 border-blue-500 relative" : ""
                    }`}
                  >
                    {pkg.isPopular && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-0.5 text-xs shadow-md">
                          推荐
                        </Badge>
                      </div>
                    )}
                    <CardContent className="p-3.5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-base">{pkg.name}</h3>
                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 px-1.5 py-0">
                              {pkg.discount}
                            </Badge>
                          </div>
                          <div className="flex items-baseline gap-1.5 mb-0.5">
                            <span className="text-2xl font-bold text-red-600">¥{pkg.currentPrice}</span>
                            <span className="text-xs text-gray-400 line-through">¥{pkg.originalPrice}</span>
                          </div>
                          <div className="text-xs text-green-600 mb-2">节省 ¥{pkg.savings}</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-baseline gap-0.5">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            <span className="text-xl font-bold text-gray-900">{pkg.computePower.toLocaleString()}</span>
                          </div>
                          <div className="text-xs text-gray-500">算力</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-2.5">{pkg.unitPrice}</div>
                      <div className="space-y-1 mb-3">
                        {pkg.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-xs text-gray-600">
                            <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                      <Button
                        className="w-full h-9 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-sm shadow-md"
                        onClick={() => handlePurchase(pkg)}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        立即购买
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* 自定义算力包 */}
            <Card className="shadow-sm border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50/50 to-purple-50/50">
              <CardContent className="p-4 text-center">
                <div className="flex justify-center mb-3">
                  <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-3 rounded-full">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <h3 className="font-semibold text-base mb-1">自定义算力包</h3>
                <p className="text-xs text-gray-600 mb-3">根据您的需求定制，灵活购买算力</p>
                <div className="mb-3">
                  <div className="text-xs text-gray-600 mb-2">购买范围：50-50,000元（≈10算力）｜永久有效</div>
                  <Input
                    type="number"
                    placeholder="请输入购买金额"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="h-10 text-center text-sm"
                  />
                </div>
                <Button
                  className="w-full h-10 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-sm shadow-md"
                  onClick={handleCustomPurchase}
                >
                  立即购买
                </Button>
              </CardContent>
            </Card>

            {/* 安全保障 */}
            <Card className="shadow-sm bg-gradient-to-br from-green-50/50 to-emerald-50/50 border-green-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="bg-green-100 p-1.5 rounded-full">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">安全保障承诺</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>算力永不过期，购买后永久有效</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>透明计费，每次AI服务消耗明细可查</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>7×24小时技术支持</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>企业级数据安全全认证</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {selectedPackage && (
        <PaymentQRDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          packageInfo={{
            id: selectedPackage.id,
            name: selectedPackage.name,
            amount: selectedPackage.computePower,
            price: selectedPackage.currentPrice,
            validity: 365,
            discount: selectedPackage.savings
              ? Math.round((selectedPackage.savings / selectedPackage.originalPrice) * 100)
              : undefined,
          }}
          onPaymentSuccess={() => {
            // 支付成功后刷新数据
            loadData()
          }}
        />
      )}
    </div>
  )
}
