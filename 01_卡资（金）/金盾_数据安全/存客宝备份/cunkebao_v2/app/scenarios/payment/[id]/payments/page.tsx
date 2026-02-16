"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Download, Filter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-picker"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { toast } from "@/components/ui/use-toast"

export default function PaymentRecordsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  // 模拟数据
  const paymentRecords = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    transactionId: `WX${Date.now()}${i}`,
    user: `用户${i + 1}`,
    platformUserId: `oq_${Math.random().toString(36).substr(2, 9)}`,
    amount: "19.9",
    paymentTime: new Date(Date.now() - i * 3600000).toLocaleString(),
    status: i % 10 === 0 ? "refunded" : "success",
    paymentMethod: "wechat",
    customerTags: ["付款客户", "社群会员"],
  }))

  const itemsPerPage = 10
  const totalPages = Math.ceil(paymentRecords.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentRecords = paymentRecords.slice(startIndex, endIndex)

  const handleExport = () => {
    toast({
      title: "导出成功",
      description: "支付记录已导出为Excel文件",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="outline" className="text-green-500 bg-green-50">
            支付成功
          </Badge>
        )
      case "refunded":
        return (
          <Badge variant="outline" className="text-orange-500 bg-orange-50">
            已退款
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="outline" className="text-red-500 bg-red-50">
            支付失败
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
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
            <h1 className="ml-2 text-lg font-medium">支付记录</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleExport}>
              <Download className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* 搜索和筛选 */}
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索用户名、交易ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {showFilters && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">支付状态</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="success">支付成功</SelectItem>
                    <SelectItem value="refunded">已退款</SelectItem>
                    <SelectItem value="failed">支付失败</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">支付时间</label>
                <DatePickerWithRange />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStatusFilter("all")
                    setSearchTerm("")
                  }}
                >
                  重置
                </Button>
                <Button className="flex-1">应用筛选</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 统计信息 */}
      <div className="px-4 pb-4">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-500">总支付笔数</p>
                <p className="text-xl font-semibold">{paymentRecords.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">总支付金额</p>
                <p className="text-xl font-semibold">¥{(paymentRecords.length * 19.9).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">成功率</p>
                <p className="text-xl font-semibold">90%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 记录列表 - 移动端优化 */}
      <div className="flex-1 px-4 pb-20">
        <div className="space-y-3">
          {currentRecords.map((record) => (
            <Card key={record.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{record.user}</p>
                    <p className="text-xs text-gray-500">交易ID: {record.transactionId}</p>
                  </div>
                  {getStatusBadge(record.status)}
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">支付金额</span>
                    <span className="font-medium">¥{record.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">支付时间</span>
                    <span>{record.paymentTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">支付方式</span>
                    <span>{record.paymentMethod === "wechat" ? "微信支付" : "支付宝"}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {record.customerTags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-blue-500"
                    onClick={() => router.push(`/wechat-accounts/${record.platformUserId}`)}
                  >
                    查看客户详情
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 分页 */}
        <div className="mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>

              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNumber = i + 1
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink onClick={() => setCurrentPage(pageNumber)} isActive={currentPage === pageNumber}>
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  )
}
