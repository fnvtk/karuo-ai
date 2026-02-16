"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Copy, CheckCircle2, XCircle, Clock, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import type { OrderDetail } from "@/types/billing"

export default function OrderDetailPage({ params }: { params: { orderNo: string } }) {
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrderDetail()
  }, [params.orderNo])

  const loadOrderDetail = async () => {
    setLoading(true)
    try {
      // 模拟订单详情数据
      const mockOrder: OrderDetail = {
        id: "1",
        orderNo: params.orderNo,
        packageId: "basic",
        packageName: "基础算力包",
        computing: 1000,
        amount: 98,
        originalAmount: 200,
        paymentMethod: "wechat",
        paymentStatus: "paid",
        paymentTime: "2025-01-10 14:23:15",
        createTime: "2025-01-10 14:20:00",
        expireTime: "2025-01-10 14:30:00",
        transactionId: "WX20250110142315001",
        userId: "user123",
        paymentChannel: "微信支付-扫码支付",
        refundStatus: "none",
      }
      setOrder(mockOrder)
    } catch (error) {
      console.error("加载订单详情失败:", error)
      toast({
        title: "加载失败",
        description: "无法获取订单详情",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "复制成功",
      description: `${label}已复制到剪贴板`,
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 className="h-16 w-16 text-green-500" />
      case "pending":
        return <Clock className="h-16 w-16 text-yellow-500" />
      case "failed":
      case "expired":
      case "cancelled":
        return <XCircle className="h-16 w-16 text-red-500" />
      default:
        return <Clock className="h-16 w-16 text-gray-400" />
    }
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      paid: { label: "支付成功", color: "bg-green-100 text-green-700", desc: "订单已完成支付" },
      pending: { label: "待支付", color: "bg-yellow-100 text-yellow-700", desc: "请尽快完成支付" },
      failed: { label: "支付失败", color: "bg-red-100 text-red-700", desc: "支付过程中出现错误" },
      cancelled: { label: "已取消", color: "bg-gray-100 text-gray-700", desc: "订单已被取消" },
      expired: { label: "已过期", color: "bg-gray-100 text-gray-700", desc: "订单已超时失效" },
    }
    return configs[status as keyof typeof configs] || configs.pending
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500">订单不存在</p>
        <Button className="mt-4" onClick={() => router.back()}>
          返回
        </Button>
      </div>
    )
  }

  const statusConfig = getStatusConfig(order.paymentStatus)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">订单详情</h1>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            下载
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* 订单状态卡片 */}
        <Card className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {getStatusIcon(order.paymentStatus)}
            <div>
              <Badge className={`${statusConfig.color} text-base px-4 py-1`}>{statusConfig.label}</Badge>
              <p className="text-sm text-gray-500 mt-2">{statusConfig.desc}</p>
            </div>
          </div>
        </Card>

        {/* 订单信息卡片 */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">订单信息</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-gray-600">订单号</span>
              <div className="text-right flex items-center space-x-2">
                <span className="font-mono">{order.orderNo}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(order.orderNo, "订单号")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between">
              <span className="text-gray-600">套餐名称</span>
              <span className="font-medium">{order.packageName}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">算力数量</span>
              <span className="font-medium">{order.computing.toLocaleString()} 算力</span>
            </div>

            <Separator />

            <div className="flex justify-between">
              <span className="text-gray-600">订单金额</span>
              <span className="text-lg font-semibold text-red-600">¥{order.amount}</span>
            </div>

            {order.originalAmount && (
              <div className="flex justify-between">
                <span className="text-gray-600">原价</span>
                <span className="text-gray-400 line-through">¥{order.originalAmount}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-600">优惠金额</span>
              <span className="text-green-600 font-medium">
                -¥{((order.originalAmount || order.amount) - order.amount).toFixed(2)}
              </span>
            </div>
          </div>
        </Card>

        {/* 支付信息卡片 */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">支付信息</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">支付方式</span>
              <span className="font-medium">{order.paymentMethod === "wechat" ? "微信支付" : "支付宝"}</span>
            </div>

            {order.paymentChannel && (
              <div className="flex justify-between">
                <span className="text-gray-600">支付渠道</span>
                <span className="font-medium">{order.paymentChannel}</span>
              </div>
            )}

            {order.transactionId && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600">交易流水号</span>
                <div className="text-right flex items-center space-x-2">
                  <span className="font-mono text-sm">{order.transactionId}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(order.transactionId!, "交易流水号")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex justify-between">
              <span className="text-gray-600">创建时间</span>
              <span className="font-medium">{order.createTime}</span>
            </div>

            {order.paymentTime && (
              <div className="flex justify-between">
                <span className="text-gray-600">支付时间</span>
                <span className="font-medium text-green-600">{order.paymentTime}</span>
              </div>
            )}

            {!order.paymentTime && (
              <div className="flex justify-between">
                <span className="text-gray-600">过期时间</span>
                <span className="font-medium text-red-600">{order.expireTime}</span>
              </div>
            )}
          </div>
        </Card>

        {/* 底部操作按钮 */}
        {order.paymentStatus === "paid" && (
          <div className="flex space-x-3">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => router.push("/profile/billing")}>
              返回算力中心
            </Button>
            <Button className="flex-1" onClick={() => toast({ title: "功能开发中" })}>
              申请发票
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
