"use client"

import { useState } from "react"
import { ChevronLeft, Search, User, MessageSquare, Plus } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Friend {
  id: string
  phoneNumber: string
  nickname: string
  addedTime: string
  question: string
}

export default function PhoneAddedPage() {
  const router = useRouter()

  const [friends, setFriends] = useState<Friend[]>([
    {
      id: "1",
      phoneNumber: "139****5678",
      nickname: "张先生",
      addedTime: "2024-03-18 14:20",
      question: "你们的合作方式是怎样的？",
    },
    {
      id: "2",
      phoneNumber: "137****9012",
      nickname: "李女士",
      addedTime: "2024-03-18 11:30",
      question: "能详细介绍一下你们的服务吗？",
    },
    {
      id: "3",
      phoneNumber: "135****3456",
      nickname: "王经理",
      addedTime: "2024-03-17 16:50",
      question: "你们有什么优惠政策？",
    },
  ])

  const [searchQuery, setSearchQuery] = useState("")

  const filteredFriends = friends.filter(
    (friend) =>
      friend.phoneNumber.includes(searchQuery) ||
      friend.nickname.includes(searchQuery) ||
      friend.question.includes(searchQuery),
  )

  return (
    <div className="flex-1 bg-gradient-to-b from-blue-50 to-white min-h-screen">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-blue-600">电话已添加</h1>
          </div>
          <Button
            variant="default"
            onClick={() => router.push(`/scenarios/phone/new`)}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            新建计划
          </Button>
        </div>
      </header>

      <div className="p-4 max-w-7xl mx-auto">
        <Card className="p-6 bg-white/80 backdrop-blur-sm">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜索电话号码或昵称"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>好友信息</TableHead>
                  <TableHead>添加时间</TableHead>
                  <TableHead>首句问题</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFriends.map((friend) => (
                  <TableRow key={friend.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8 bg-green-100">
                          <AvatarFallback className="bg-green-100 text-green-600">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{friend.nickname}</div>
                          <div className="text-sm text-gray-500">{friend.phoneNumber}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{friend.addedTime}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{friend.question || "未识别到问题"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        发送消息
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  )
}
