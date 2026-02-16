"use client"

import { useState } from "react"
import { ChevronLeft, Search, Phone, MoreVertical, UserPlus, Plus } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Customer {
  id: string
  phoneNumber: string
  time: string
  status: "pending" | "added"
  question: string
}

export default function PhoneAcquiredPage() {
  const router = useRouter()

  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: "1",
      phoneNumber: "138****1234",
      time: "2024-03-18 15:30",
      status: "pending",
      question: "请问贵公司的产品有什么特点？",
    },
    {
      id: "2",
      phoneNumber: "139****5678",
      time: "2024-03-18 14:15",
      status: "added",
      question: "你们的合作方式是怎样的？",
    },
    {
      id: "3",
      phoneNumber: "137****9012",
      time: "2024-03-18 11:22",
      status: "added",
      question: "能详细介绍一下你们的服务吗？",
    },
    {
      id: "4",
      phoneNumber: "135****3456",
      time: "2024-03-17 16:45",
      status: "added",
      question: "你们有什么优惠政策？",
    },
    {
      id: "5",
      phoneNumber: "136****7890",
      time: "2024-03-17 10:20",
      status: "pending",
      question: "未识别到有效问题",
    },
  ])

  const [searchQuery, setSearchQuery] = useState("")

  const filteredCustomers = customers.filter(
    (customer) => customer.phoneNumber.includes(searchQuery) || customer.question.includes(searchQuery),
  )

  const handleAddFriend = (customerId: string) => {
    setCustomers(
      customers.map((customer) => (customer.id === customerId ? { ...customer, status: "added" } : customer)),
    )

    toast({
      title: "添加成功",
      description: "已成功添加为微信好友",
    })
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-blue-50 to-white min-h-screen">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-blue-600">电话已获客</h1>
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
              placeholder="搜索电话号码或问题"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>电话号码</TableHead>
                  <TableHead>获客时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>首句问题</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8 bg-blue-100">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            <Phone className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{customer.phoneNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>{customer.time}</TableCell>
                    <TableCell>
                      <Badge variant={customer.status === "added" ? "success" : "secondary"}>
                        {customer.status === "added" ? "已添加" : "未添加"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{customer.question || "未识别到问题"}</TableCell>
                    <TableCell className="text-right">
                      {customer.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600"
                          onClick={() => handleAddFriend(customer.id)}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          添加好友
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100 rounded-full">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="cursor-pointer">查看详情</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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
