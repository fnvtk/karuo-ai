"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Search, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { PaymentOrder } from "@/types/billing"

export default function OrderHistoryPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<PaymentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // 加载订单列表
  useEffect(() => {
    loadOrders()
  }, [page, statusFilter])

  const loadOrders = async () => {
    setLoading(true)
    try {
      // 模拟订单数据
      const mockOrders: PaymentOrder[] = [
        {
          id: "1",
          orderNo: "CKB202501100001",
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
        },
        {
          id: "2",
          orderNo: "CKB202501090002",
          packageId: "standard",
          packageName: "标准算力包",
          computing: 7500,
          amount: 598,
          originalAmount: 1500,
          paymentMethod: "alipay",
          paymentStatus: "paid",
          paymentTime: "2025-01-09 10:15:30",
          createTime: "2025-01-09 10:12:00",
          expireTime: "2025-01-09 10:22:00",
          transactionId: "ALI20250109101530001",
          userId: "user123",
        },
        {
          id: "3",
          orderNo: "CKB202501080003",
          packageId: "custom",
          packageName: "自定义算力包",
          computing: 5000,
          amount: 250,
          paymentMethod: "wechat",
          paymentStatus: "pending",
          createTime: "2025-01-08 16:45:00",
          expireTime: "2025-01-08 16:55:00",
          userId: "user123",
        },
        {
          id: "4",
          orderNo: "CKB202501070004",
          packageId: "premium",
          packageName: "高级算力包",
          computing: 250000,
          amount: 19800,
          originalAmount: 50000,
          paymentMethod: "alipay",
          paymentStatus: "expired",
          createTime: "2025-01-07 09:30:00",
          expireTime: "2025-01-07 09:40:00",
          userId: "user123",
        },
      ]

      setOrders(mockOrders)
      setTotal(mockOrders.length)
    } catch (error) {
      console.error("加载订单失败:", error)
    } finally {
      setLoading(false)
    }
  }

  // 获取状态显示配置
  const getStatusConfig = (status: string) => {
    const configs = {
      paid: { label: "已支付", color: "bg-green-100 text-green-700" },
      pending: { label: "待支付", color: "bg-yellow-100 text-yellow-700" },
      failed: { label: "支付失败", color: "bg-red-100 text-red-700" },
      cancelled: { label: "已取消", color: "bg-gray-100 text-gray-700" },
      expired: { label: "已过期", color: "bg-gray-100 text-gray-700" },
    }
    return configs[status as keyof typeof configs] || configs.pending
  }

  // 获取支付方式显示
  const getPaymentMethodLabel = (method: string) => {
    return method === "wechat" ? "微信支付" : "支付宝"
  }

  // 筛选订单
  const filteredOrders = orders.filter((order) => {
    const matchSearch =
      order.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.packageName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = statusFilter === "all" || order.paymentStatus === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">订单历史</h1>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            导出
          </Button>
        </div>
      </header>

      {/* 搜索和筛选区域 */}
      <div className="p-4 space-y-3 bg-white border-b">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索订单号或套餐名称"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="paid">已支付</SelectItem>
              <SelectItem value="pending">待支付</SelectItem>
              <SelectItem value="expired">已过期</SelectItem>
              <SelectItem value="cancelled">已取消</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 订单列表 */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">暂无订单记录</div>
        ) : (
          filteredOrders.map((order) => {
            const statusConfig = getStatusConfig(order.paymentStatus)
            return (
              <Card
                key={order.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/profile/billing/orders/${order.orderNo}`)}
              >
                <div className="space-y-3">
                  {/* 订单头部 */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-base">{order.packageName}</h3>
                      <p className="text-sm text-gray-500 mt-1">订单号: {order.orderNo}</p>
                    </div>
                    <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                  </div>

                  {/* 订单信息 */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">算力数量</span>
                      <p className="font-medium mt-1">{order.computing.toLocaleString()} 算力</p>
                    </div>
                    <div>
                      <span className="text-gray-500">支付方式</span>
                      <p className="font-medium mt-1">{getPaymentMethodLabel(order.paymentMethod)}</p>
                    </div>
                  </div>

                  {/* 订单金额和时间 */}
                  <div className="flex items-end justify-between pt-2 border-t">
                    <div className="text-sm text-gray-500">
                      {order.paymentTime ? (
                        <span>支付时间: {order.paymentTime}</span>
                      ) : (
                        <span>创建时间: {order.createTime}</span>
                      )}
                    </div>
                    <div className="text-right">
                      {order.originalAmount && (
                        <p className="text-xs text-gray-400 line-through">¥{order.originalAmount}</p>
                      )}
                      <p className="text-lg font-semibold text-red-600">¥{order.amount}</p>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
