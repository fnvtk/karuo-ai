"use client"

import { useState } from "react"
import { ChevronLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

// 获取渠道中文名称
const getChannelName = (channel: string) => {
  const channelMap: Record<string, string> = {
    douyin: "抖音",
    kuaishou: "快手",
    xiaohongshu: "小红书",
    weibo: "微博",
  }
  return channelMap[channel] || channel
}

interface Customer {
  id: string
  nickname: string
  avatar: string
  tags: string[]
  acquiredTime: string
  source: string
}

export default function AcquiredCustomersPage({ params }: { params: { channel: string } }) {
  const router = useRouter()
  const channelName = getChannelName(params.channel)

  const [customers] = useState<Customer[]>(
    Array.from({ length: 31 }, (_, i) => ({
      id: `customer-${i + 1}`,
      nickname: `用户${i + 1}`,
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + (i + 1),
      tags: ["直播间", "高互动", Math.random() > 0.5 ? "潜在客户" : "意向客户"],
      acquiredTime: new Date(Date.now() - Math.random() * 86400000 * 7).toLocaleString(),
      source: Math.random() > 0.5 ? "直播间" : "评论区",
    })),
  )

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.ceil(customers.length / itemsPerPage)
  const currentCustomers = customers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b">
        <div className="flex items-center p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-blue-600">{channelName}已获客</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {currentCustomers.map((customer) => (
          <Card key={customer.id} className="p-4">
            <div className="flex items-start space-x-4">
              <img
                src={customer.avatar || "/placeholder.svg"}
                alt={customer.nickname}
                className="w-12 h-12 rounded-full"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{customer.nickname}</h3>
                  <span className="text-sm text-gray-500">{customer.acquiredTime}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {customer.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="mt-2 text-sm text-gray-500">来源：{customer.source}</div>
              </div>
            </div>
          </Card>
        ))}

        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              上一页
            </Button>
            <span className="text-sm text-gray-500">
              第 {currentPage} / {totalPages} 页
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              下一页
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
