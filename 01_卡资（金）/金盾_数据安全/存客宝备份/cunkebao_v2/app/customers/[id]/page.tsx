"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, Phone, MessageCircle, MapPin, Tag, TrendingUp, ShoppingCart, Clock, Edit } from "lucide-react"
import type { TrafficUser } from "@/types/traffic"

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<TrafficUser | null>(null)

  useEffect(() => {
    loadCustomerData()
  }, [params.id])

  const loadCustomerData = async () => {
    setLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      // 模拟客户数据
      const mockCustomer: TrafficUser = {
        id: params.id,
        avatar: "/placeholder-user.jpg",
        nickname: "张三",
        wechatId: "zhangsan123",
        phone: "13800138000",
        region: "北京市朝阳区",
        note: "高价值客户，多次复购，对产品满意度高",
        status: "added",
        addTime: "2024-01-15",
        source: "海报获客",
        assignedTo: "销售A",
        category: "customer",
        rfmScore: {
          recency: 4.5,
          frequency: 4.2,
          monetary: 4.8,
          total: 13.5,
        },
        groupIds: ["high-value"],
        tags: ["VIP", "活跃", "复购"],
        lastInteraction: "2024-01-20 14:30",
        totalSpent: 15680,
        interactionCount: 28,
      }

      setCustomer(mockCustomer)
    } catch (error) {
      console.error("加载客户数据失败:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-gray-500 mb-4">客户不存在</div>
        <Button onClick={() => router.back()}>返回</Button>
      </div>
    )
  }

  const getRfmLevel = (score: number) => {
    if (score >= 12) return { text: "高价值", color: "text-red-600" }
    if (score >= 9) return { text: "中高价值", color: "text-blue-600" }
    if (score >= 6) return { text: "中等价值", color: "text-green-600" }
    return { text: "低价值", color: "text-gray-600" }
  }

  const rfmLevel = customer.rfmScore ? getRfmLevel(customer.rfmScore.total) : null

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium">客户详情</h1>
          </div>
          <Button size="sm" variant="outline">
            <Edit className="h-4 w-4 mr-1" />
            编辑
          </Button>
        </div>
      </header>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-auto pb-20">
        <div className="p-4 space-y-4">
          {/* 客户基本信息卡片 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={customer.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{customer.nickname[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xl font-bold">{customer.nickname}</h2>
                    {rfmLevel && <Badge className={`${rfmLevel.color} bg-opacity-10`}>{rfmLevel.text}</Badge>}
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      <span className="font-mono">{customer.wechatId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{customer.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{customer.region}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 标签 */}
              {customer.tags && customer.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {customer.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* 备注 */}
              {customer.note && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">备注</div>
                  <div className="text-sm text-gray-700">{customer.note}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* RFM评分卡片 */}
          {customer.rfmScore && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  RFM客户价值评分
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">总分</span>
                    <span className={`text-2xl font-bold ${rfmLevel?.color}`}>
                      {customer.rfmScore.total.toFixed(1)}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">最近消费 (R)</span>
                        <span className="font-medium">{customer.rfmScore.recency.toFixed(1)}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(customer.rfmScore.recency / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">消费频率 (F)</span>
                        <span className="font-medium">{customer.rfmScore.frequency.toFixed(1)}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${(customer.rfmScore.frequency / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">消费金额 (M)</span>
                        <span className="font-medium">{customer.rfmScore.monetary.toFixed(1)}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${(customer.rfmScore.monetary / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 统计数据卡片 */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">累计消费</div>
                    <div className="text-lg font-bold text-blue-600">¥{customer.totalSpent?.toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <MessageCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">互动次数</div>
                    <div className="text-lg font-bold text-green-600">{customer.interactionCount}次</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 详细信息标签页 */}
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">基本信息</TabsTrigger>
                  <TabsTrigger value="history">互动记录</TabsTrigger>
                  <TabsTrigger value="orders">订单记录</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-gray-500">添加时间</span>
                    <span className="text-sm font-medium">{customer.addTime}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-gray-500">获客来源</span>
                    <Badge variant="secondary">{customer.source}</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-gray-500">负责人</span>
                    <span className="text-sm font-medium">{customer.assignedTo}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-gray-500">客户状态</span>
                    <Badge>{customer.status === "added" ? "已添加" : "待添加"}</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-500">最后互动</span>
                    <span className="text-sm font-medium">{customer.lastInteraction}</span>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">暂无互动记录</p>
                  </div>
                </TabsContent>

                <TabsContent value="orders" className="mt-4">
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">暂无订单记录</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
