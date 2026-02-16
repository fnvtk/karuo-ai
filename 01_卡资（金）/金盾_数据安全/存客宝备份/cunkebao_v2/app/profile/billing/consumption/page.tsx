"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, RefreshCw, Zap, Package, Filter } from "lucide-react"
import { useRouter } from "next/navigation"

// 购买记录接口
interface PurchaseRecord {
  id: string
  date: string
  packageName: string
  computePower: number
  amount: number
  paymentMethod: string
  status: "completed" | "pending" | "failed"
}

// 模拟购买记录数据
const mockPurchaseRecords: PurchaseRecord[] = [
  {
    id: "1",
    date: "2025/2/9 10:30:00",
    packageName: "标准算力包",
    computePower: 1000,
    amount: 99,
    paymentMethod: "微信支付",
    status: "completed",
  },
  {
    id: "2",
    date: "2025/2/5 15:20:00",
    packageName: "高级算力包",
    computePower: 3000,
    amount: 268,
    paymentMethod: "支付宝",
    status: "completed",
  },
  {
    id: "3",
    date: "2025/2/1 09:15:00",
    packageName: "基础算力包",
    computePower: 500,
    amount: 50,
    paymentMethod: "微信支付",
    status: "completed",
  },
  {
    id: "4",
    date: "2025/1/28 14:45:00",
    packageName: "企业算力包",
    computePower: 10000,
    amount: 799,
    paymentMethod: "企业转账",
    status: "completed",
  },
  {
    id: "5",
    date: "2025/1/25 11:30:00",
    packageName: "标准算力包",
    computePower: 1000,
    amount: 99,
    paymentMethod: "微信支付",
    status: "completed",
  },
  {
    id: "6",
    date: "2025/1/20 16:40:00",
    packageName: "高级算力包",
    computePower: 3000,
    amount: 268,
    paymentMethod: "支付宝",
    status: "completed",
  },
  {
    id: "7",
    date: "2025/1/15 13:25:00",
    packageName: "基础算力包",
    computePower: 500,
    amount: 50,
    paymentMethod: "微信支付",
    status: "pending",
  },
  {
    id: "8",
    date: "2025/1/10 10:15:00",
    packageName: "标准算力包",
    computePower: 1000,
    amount: 99,
    paymentMethod: "微信支付",
    status: "completed",
  },
]

export default function ConsumptionRecordsPage() {
  const router = useRouter()
  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("all")

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 800))
      setPurchaseRecords(mockPurchaseRecords)
    } catch (error) {
      console.error("加载数据失败:", error)
      setPurchaseRecords(mockPurchaseRecords)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 处理返回
  const handleBack = () => {
    router.back()
  }

  // 处理刷新
  const handleRefresh = () => {
    loadData()
  }

  // 获取状态文本和颜色
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "completed":
        return { text: "已完成", color: "bg-green-100 text-green-700" }
      case "pending":
        return { text: "处理中", color: "bg-yellow-100 text-yellow-700" }
      case "failed":
        return { text: "失败", color: "bg-red-100 text-red-700" }
      default:
        return { text: "未知", color: "bg-gray-100 text-gray-700" }
    }
  }

  // 筛选记录
  const filteredRecords = purchaseRecords.filter((record) => {
    const statusMatch = filterStatus === "all" || record.status === filterStatus
    return statusMatch
  })

  // 计算统计数据
  const totalRecords = filteredRecords.length
  const totalComputePower = filteredRecords.reduce((sum, record) => sum + record.computePower, 0)
  const totalAmount = filteredRecords.reduce((sum, record) => sum + record.amount, 0)

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
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* 头部导航 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium">消费记录</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="p-4 space-y-4">
        {/* 筛选器 */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">筛选条件</span>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="pending">处理中</SelectItem>
                  <SelectItem value="failed">失败</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 统计卡片 */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{totalRecords}</p>
                <p className="text-xs text-gray-600">记录总数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{totalComputePower}</p>
                <p className="text-xs text-gray-600">总获得算力</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">¥{totalAmount}</p>
                <p className="text-xs text-gray-600">总消费金额</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 购买记录列表 */}
        <div className="space-y-3">
          {filteredRecords.map((record) => {
            const statusInfo = getStatusInfo(record.status)
            return (
              <Card key={record.id} className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-gray-900">{record.packageName}</span>
                    </div>
                    <Badge className={`${statusInfo.color} text-xs px-2 py-0.5`}>{statusInfo.text}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="text-purple-600 font-semibold">{record.computePower} 算力</span>
                    </div>
                    <div className="text-right">
                      <span className="text-blue-600 font-semibold text-lg">¥{record.amount}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-blue-200">
                    <span className="text-sm text-gray-600">{record.paymentMethod}</span>
                    <span className="text-xs text-gray-400">{record.date}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {filteredRecords.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">暂无消费记录</p>
              <p className="text-sm text-gray-400 mt-1">尝试调整筛选条件查看更多记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
