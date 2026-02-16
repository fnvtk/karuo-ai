"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Search, Filter, RefreshCw, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface TrafficUser {
  id: string
  avatar: string
  nickname: string
  wechatId: string
  phone: string
  region: string
  note: string
  status: "pending" | "added" | "failed"
  addTime: string
  source: string
  tags: string[]
}

export default function ChannelTrafficPage({
  params,
  searchParams,
}: {
  params: { channel: string }
  searchParams: { type?: string }
}) {
  const router = useRouter()
  const [users, setUsers] = useState<TrafficUser[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState(searchParams.type || "all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const getChannelName = (channel: string) => {
    const channelMap: Record<string, string> = {
      douyin: "抖音",
      kuaishou: "快手",
      xiaohongshu: "小红书",
      weibo: "微博",
    }
    return channelMap[channel] || channel
  }

  const channelName = getChannelName(params.channel)

  useEffect(() => {
    const fetchUsers = async () => {
      // 模拟API调用
      const mockUsers = Array.from({ length: 50 }, (_, i) => ({
        id: `user-${i + 1}`,
        avatar: "/placeholder.svg?height=40&width=40",
        nickname: `用户${i + 1}`,
        wechatId: `wxid_${Math.random().toString(36).substr(2, 8)}`,
        phone: `1${["3", "5", "7", "8", "9"][Math.floor(Math.random() * 5)]}${Array.from({ length: 9 }, () =>
          Math.floor(Math.random() * 10),
        ).join("")}`,
        region: ["广东", "浙江", "江苏", "北京", "上海"][Math.floor(Math.random() * 5)],
        note: ["感兴趣", "需要了解", "想购买", "咨询价格"][Math.floor(Math.random() * 4)],
        status: searchParams.type === "added" ? "added" : ["pending", "added", "failed"][Math.floor(Math.random() * 3)],
        addTime: new Date(Date.now() - Math.random() * 86400000 * 7).toLocaleString(),
        source: params.channel,
        tags: ["意向客户", "高活跃度", "新用户"][Math.floor(Math.random() * 3)].split(" "),
      }))
      setUsers(mockUsers)
    }

    fetchUsers()
  }, [params.channel, searchParams.type])

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.wechatId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery)
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-blue-600">{channelName}流量池</h1>
          </div>
          <Button
            variant="default"
            onClick={() => router.push(`/scenarios/${params.channel}/new`)}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            新建计划
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索用户"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="added">已添加</SelectItem>
                  <SelectItem value="failed">已失败</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {paginatedUsers.map((user) => (
                <Card key={user.id} className="p-4">
                  <div className="flex items-start space-x-4">
                    <img
                      src={user.avatar || "/placeholder.svg"}
                      alt={user.nickname}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-medium truncate">{user.nickname}</div>
                        <Badge
                          variant={
                            user.status === "added" ? "success" : user.status === "failed" ? "destructive" : "secondary"
                          }
                        >
                          {user.status === "added" ? "已添加" : user.status === "failed" ? "已失败" : "待处理"}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        <div>微信号: {user.wechatId}</div>
                        <div>手机号: {user.phone}</div>
                        <div>地区: {user.region}</div>
                        <div>添加时间: {user.addTime}</div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {user.tags.map((tag, index) => (
                          <Badge key={index} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={currentPage === page}
                        onClick={(e) => {
                          e.preventDefault()
                          setCurrentPage(page)
                        }}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
