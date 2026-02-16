"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ChevronLeft, Download, Share2, QrCode, Copy, BarChart4, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"

export default function PaymentCodeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("detail")

  // 模拟数据
  const paymentCode = {
    id: params.id,
    name: "社群会员付款码",
    amount: "19.9",
    description: "加入VIP社群会员",
    status: "active",
    qrCodeUrl: "/placeholder.svg?height=300&width=300&query=QR%20Code",
    paymentMethod: "wechat",
    createTime: "2023-10-26 11:00:00",
    totalPayments: 156,
    totalAmount: 3104.4,
    distribution: {
      enabled: true,
      type: "percentage",
      value: "10%",
      totalDistributed: 310.44,
    },
    redPacket: {
      enabled: true,
      amount: "5",
      totalSent: 156,
      totalAmount: 780,
    },
    autoWelcome: {
      enabled: true,
      message: "感谢您的支付，欢迎加入我们的VIP社群！",
    },
    tags: ["付款客户", "社群会员", "已成交"],
  }

  const recentPayments = [
    { id: 1, user: "用户1", amount: "19.9", time: "2023-10-26 15:30:00", status: "success" },
    { id: 2, user: "用户2", amount: "19.9", time: "2023-10-26 14:45:00", status: "success" },
    { id: 3, user: "用户3", amount: "19.9", time: "2023-10-26 13:20:00", status: "success" },
    { id: 4, user: "用户4", amount: "19.9", time: "2023-10-26 12:10:00", status: "success" },
    { id: 5, user: "用户5", amount: "19.9", time: "2023-10-26 11:05:00", status: "success" },
  ]

  const handleStatusChange = (checked: boolean) => {
    toast({
      title: checked ? "付款码已启用" : "付款码已停用",
      description: checked ? "客户现在可以通过此付款码支付" : "客户将无法通过此付款码支付",
    })
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "复制成功",
      description: "内容已复制到剪贴板",
    })
  }

  const handleDownload = () => {
    toast({
      title: "下载成功",
      description: "付款码已保存到相册",
    })
  }

  const handleShare = () => {
    toast({
      title: "分享成功",
      description: "付款码已分享",
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
            <h1 className="ml-2 text-lg font-medium">付款码详情</h1>
          </div>
          <div className="flex items-center">
            <Switch checked={paymentCode.status === "active"} onCheckedChange={handleStatusChange} />
            <span className="ml-2 text-sm">{paymentCode.status === "active" ? "启用中" : "已停用"}</span>
          </div>
        </div>
      </header>

      {/* 标签页 */}
      <div className="flex-1 px-4 pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="detail" className="text-xs">
              <QrCode className="h-4 w-4 mr-1" />
              付款码
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs">
              <BarChart4 className="h-4 w-4 mr-1" />
              支付记录
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">
              <Users className="h-4 w-4 mr-1" />
              高级设置
            </TabsTrigger>
          </TabsList>

          {/* 付款码详情 */}
          <TabsContent value="detail" className="space-y-4">
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <h2 className="font-medium text-center mb-2">{paymentCode.name}</h2>
                <p className="text-sm text-gray-500 mb-4">{paymentCode.description}</p>

                <div className="relative w-64 h-64 mb-4">
                  <Image
                    src={paymentCode.qrCodeUrl || "/placeholder.svg"}
                    alt="付款码"
                    fill
                    className="object-contain"
                  />
                </div>

                <div className="text-center mb-4">
                  <Badge variant="outline" className="text-green-500 bg-green-50">
                    ¥{paymentCode.amount}
                  </Badge>
                </div>

                <div className="flex justify-center space-x-4 w-full">
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-1" />
                    下载
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-1" />
                    分享
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(`付款码：${paymentCode.name}，金额：${paymentCode.amount}元`)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    复制
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">付款码信息</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-500">付款码ID</span>
                    <span className="font-medium">{paymentCode.id}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-500">支付方式</span>
                    <span className="font-medium">
                      {paymentCode.paymentMethod === "wechat"
                        ? "微信支付"
                        : paymentCode.paymentMethod === "alipay"
                          ? "支付宝"
                          : "微信和支付宝"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-500">创建时间</span>
                    <span className="font-medium">{paymentCode.createTime}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-500">支付笔数</span>
                    <span className="font-medium">{paymentCode.totalPayments}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500">支付金额</span>
                    <span className="font-medium">¥{paymentCode.totalAmount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 支付记录 */}
          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">最近支付记录</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-500"
                    onClick={() => router.push(`/scenarios/payment/${params.id}/payments`)}
                  >
                    查看全部
                  </Button>
                </div>

                <div className="space-y-3">
                  {recentPayments.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{payment.user}</p>
                        <p className="text-xs text-gray-500">{payment.time}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">¥{payment.amount}</p>
                        <Badge variant="outline" className="text-green-500 bg-green-50 text-xs">
                          支付成功
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">支付统计</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-500">总支付笔数</span>
                    <span className="font-medium">{paymentCode.totalPayments}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-500">总支付金额</span>
                    <span className="font-medium">¥{paymentCode.totalAmount}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-500">平均客单价</span>
                    <span className="font-medium">
                      ¥{(paymentCode.totalAmount / paymentCode.totalPayments).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500">新增客户数</span>
                    <span className="font-medium">{Math.floor(paymentCode.totalPayments * 0.9)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 高级设置 */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">分销返利设置</h3>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-500">启用分销返利</span>
                  <Switch checked={paymentCode.distribution.enabled} />
                </div>

                {paymentCode.distribution.enabled && (
                  <div className="space-y-3 pl-4 border-l-2 border-blue-100">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-500">返利类型</span>
                      <span className="font-medium">
                        {paymentCode.distribution.type === "percentage" ? "比例返利" : "固定金额"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-500">返利值</span>
                      <span className="font-medium">{paymentCode.distribution.value}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-500">已发放金额</span>
                      <span className="font-medium">¥{paymentCode.distribution.totalDistributed}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">红包奖励设置</h3>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-500">启用红包奖励</span>
                  <Switch checked={paymentCode.redPacket.enabled} />
                </div>

                {paymentCode.redPacket.enabled && (
                  <div className="space-y-3 pl-4 border-l-2 border-blue-100">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-500">红包金额</span>
                      <span className="font-medium">¥{paymentCode.redPacket.amount}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-500">已发放数量</span>
                      <span className="font-medium">{paymentCode.redPacket.totalSent}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-500">已发放金额</span>
                      <span className="font-medium">¥{paymentCode.redPacket.totalAmount}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">自动欢迎语设置</h3>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-500">启用自动欢迎语</span>
                  <Switch checked={paymentCode.autoWelcome.enabled} />
                </div>

                {paymentCode.autoWelcome.enabled && (
                  <div className="pl-4 border-l-2 border-blue-100">
                    <div className="py-2">
                      <span className="text-gray-500 block mb-2">欢迎语内容</span>
                      <div className="bg-gray-50 p-3 rounded-md text-sm">{paymentCode.autoWelcome.message}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">客户标签设置</h3>
                <div className="flex flex-wrap gap-2">
                  {paymentCode.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="rounded-full">
                      {tag}
                    </Badge>
                  ))}
                  <Button variant="outline" size="sm" className="rounded-full text-blue-500">
                    + 添加标签
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                className="text-red-500 border-red-200 hover:bg-red-50"
                onClick={() => {
                  if (confirm("确定要删除此付款码吗？删除后将无法恢复。")) {
                    toast({
                      title: "付款码已删除",
                      description: "付款码已成功删除",
                    })
                    router.push("/scenarios/payment")
                  }
                }}
              >
                删除付款码
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
