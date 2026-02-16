"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Search, Users } from "lucide-react"
import { useRouter, useParams } from "next/navigation"

// 好友数据类型定义
interface Friend {
  id: string
  nickname: string
  wechatId: string
  avatar: string
  tags: string[]
  addTime: string
  lastActive: string
  remark?: string
}

// 微信号详情数据类型
interface WechatAccountDetail {
  id: string
  nickname: string
  wechatId: string
  avatar: string
  status: "normal" | "limited" | "banned"
  friendCount: number
  todayAdded: number
  todayCanAdd: number
  maxDailyAdd: number
  deviceName: string
  lastActive: string
  accountAge: string
  activityLevel: number
  weightScore: number
  registrationDate: string
  totalChatCount: number
  restrictions: Array<{
    type: string
    date: string
    reason: string
  }>
}

// 模拟好友数据
const mockFriends: Friend[] = [
  {
    id: "1",
    nickname: "周小伟",
    wechatId: "wxid_lhwl22g",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["高意向"],
    addTime: "2024-03-15",
    lastActive: "2024-03-20",
  },
  {
    id: "2",
    nickname: "赵强辉",
    wechatId: "wxid_pf1cv43",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["企业客户", "高意向"],
    addTime: "2024-03-14",
    lastActive: "2024-03-19",
  },
  {
    id: "3",
    nickname: "杨秀芳",
    wechatId: "wxid_7vfs6m6",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["活跃客户", "企业客户", "高意向"],
    addTime: "2024-03-13",
    lastActive: "2024-03-18",
  },
  {
    id: "4",
    nickname: "李秀伟",
    wechatId: "wxid_0f7cydi",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["沉默用户"],
    addTime: "2024-03-12",
    lastActive: "2024-03-17",
  },
  {
    id: "5",
    nickname: "陈英强",
    wechatId: "wxid_wm6vdjo",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["高意向", "企业客户", "沉默用户"],
    addTime: "2024-03-11",
    lastActive: "2024-03-16",
  },
  {
    id: "6",
    nickname: "赵强杰",
    wechatId: "wxid_ufgvfge",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["个人用户", "新增好友", "活跃好友"],
    addTime: "2024-03-10",
    lastActive: "2024-03-15",
  },
  {
    id: "7",
    nickname: "王英娜",
    wechatId: "wxid_ie445jq",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["沉默用户", "老客户"],
    addTime: "2024-03-09",
    lastActive: "2024-03-14",
  },
  {
    id: "8",
    nickname: "吴秀秀",
    wechatId: "wxid_sw3ok5k",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["老客户", "个人用户", "新增好友"],
    addTime: "2024-03-08",
    lastActive: "2024-03-13",
  },
]

// 模拟微信号详情数据
const mockAccountDetail: WechatAccountDetail = {
  id: "1",
  nickname: "卡若-25vig",
  wechatId: "wxid_shnuwzna",
  avatar: "/placeholder.svg?height=80&width=80",
  status: "normal",
  friendCount: 266,
  todayAdded: 12,
  todayCanAdd: 17,
  maxDailyAdd: 20,
  deviceName: "设备1",
  lastActive: "2025/5/17 07:13:14",
  accountAge: "2年8个月",
  activityLevel: 42,
  weightScore: 85,
  registrationDate: "2021-06-15",
  totalChatCount: 15234,
  restrictions: [
    {
      type: "添加好友过于频繁",
      date: "2024-02-25",
      reason: "系统检测到异常添加行为",
    },
    {
      type: "营销内容违规",
      date: "2024-01-15",
      reason: "发送违规营销内容",
    },
  ],
}

export default function WechatAccountDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [accountDetail, setAccountDetail] = useState<WechatAccountDetail | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const friendsPerPage = 10

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        // 模拟API调用
        await new Promise((resolve) => setTimeout(resolve, 800))
        setAccountDetail(mockAccountDetail)
        setFriends(mockFriends)
      } catch (error) {
        console.error("加载数据失败:", error)
        setAccountDetail(mockAccountDetail)
        setFriends(mockFriends)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params.id])

  // 处理搜索
  const filteredFriends = friends.filter(
    (friend) =>
      friend.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      friend.wechatId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      friend.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // 分页处理
  const totalPages = Math.ceil(filteredFriends.length / friendsPerPage)
  const startIndex = (currentPage - 1) * friendsPerPage
  const currentFriends = filteredFriends.slice(startIndex, startIndex + friendsPerPage)

  // 处理返回
  const handleBack = () => {
    router.back()
  }

  // 获取标签颜色
  const getTagColor = (tag: string) => {
    const colors: { [key: string]: string } = {
      高意向: "bg-green-100 text-green-700",
      企业客户: "bg-red-100 text-red-700",
      个人用户: "bg-pink-100 text-pink-700",
      新增好友: "bg-green-100 text-green-700",
      活跃用户: "bg-blue-100 text-blue-700",
      活跃客户: "bg-blue-100 text-blue-700",
      活跃好友: "bg-blue-100 text-blue-700",
      沉默用户: "bg-gray-100 text-gray-700",
      老客户: "bg-orange-100 text-orange-700",
    }
    return colors[tag] || "bg-gray-100 text-gray-700"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!accountDetail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">微信号不存在</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部导航 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium">账号详情</h1>
          </div>
        </div>
      </div>

      {/* 账号基本信息卡片 */}
      <div className="p-4">
        <Card className="p-5 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-medium">{accountDetail.nickname}</h2>
              <Badge className="bg-green-100 text-green-700">正常</Badge>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="text-xs bg-transparent">
                设备1
              </Button>
              <Button variant="outline" size="sm" className="text-xs bg-transparent">
                <Users className="h-3 w-3 mr-1" />
                好友转移
              </Button>
            </div>
          </div>
          <div className="text-sm text-gray-600 mb-4">微信号: {accountDetail.wechatId}</div>
        </Card>
      </div>

      {/* 标签页 */}
      <div className="px-4">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="overview">账号概览</TabsTrigger>
            <TabsTrigger value="friends">好友列表 ({accountDetail.friendCount})</TabsTrigger>
          </TabsList>

          {/* 账号概览标签页 */}
          <TabsContent value="overview" className="space-y-4">
            {/* 账号年龄和活跃度 */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 text-center">
                <div className="text-sm text-gray-500 mb-2">账号年龄</div>
                <div className="text-2xl font-bold text-blue-600 mb-1">{accountDetail.accountAge}</div>
                <div className="text-xs text-gray-400">注册时间: {accountDetail.registrationDate}</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-sm text-gray-500 mb-2">活跃程度</div>
                <div className="text-2xl font-bold text-blue-600 mb-1">{accountDetail.activityLevel}次/天</div>
                <div className="text-xs text-gray-400">总聊天数: {accountDetail.totalChatCount}</div>
              </Card>
            </div>

            {/* 账号权重评估 */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">账号权重评估</h3>
                <div className="text-2xl font-bold text-green-600">{accountDetail.weightScore} 分</div>
              </div>
              <div className="text-sm text-gray-600 mb-4">账号状态良好</div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">账号年龄</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={90} className="w-20 h-2" />
                    <span className="text-sm text-gray-500">90%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">活跃度</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={85} className="w-20 h-2" />
                    <span className="text-sm text-gray-500">85%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">限制频响</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={80} className="w-20 h-2" />
                    <span className="text-sm text-gray-500">80%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">实名认证</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={100} className="w-20 h-2" />
                    <span className="text-sm text-gray-500">100%</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* 添加好友统计 */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">添加好友统计</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">今日已添加</span>
                  <span className="font-semibold text-blue-600">{accountDetail.todayAdded}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">添加进度</span>
                  <span className="text-sm">
                    {accountDetail.todayAdded}/{accountDetail.maxDailyAdd}
                  </span>
                </div>
                <Progress value={(accountDetail.todayAdded / accountDetail.maxDailyAdd) * 100} className="h-2" />
                <div className="text-xs text-gray-500 mt-2">
                  根据当前账号权重({accountDetail.weightScore}分), 每日最多可添加 {accountDetail.todayCanAdd} 个好友
                </div>
              </div>
            </Card>

            {/* 限制记录 */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">限制记录</h3>
                <Badge variant="secondary" className="text-xs">
                  共 {accountDetail.restrictions.length} 次
                </Badge>
              </div>
              <div className="space-y-3">
                {accountDetail.restrictions.map((restriction, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-orange-600">{restriction.type}</div>
                      <div className="text-xs text-gray-500 mt-1">{restriction.reason}</div>
                    </div>
                    <div className="text-xs text-gray-400">{restriction.date}</div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* 好友列表标签页 */}
          <TabsContent value="friends" className="space-y-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索好友昵称/微信号/备注/标签"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 好友列表 */}
            <div className="space-y-3">
              {currentFriends.length === 0 ? (
                <Card className="p-8 text-center">
                  <div className="text-gray-400">{searchTerm ? "未找到匹配的好友" : "暂无好友"}</div>
                </Card>
              ) : (
                currentFriends.map((friend) => (
                  <Card key={friend.id} className="p-4 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={friend.avatar || "/placeholder.svg"} alt={friend.nickname} />
                        <AvatarFallback className="bg-gray-200 text-gray-600">
                          {friend.nickname.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium truncate">{friend.nickname}</h4>
                          {friend.remark && <span className="text-xs text-gray-500">({friend.remark})</span>}
                        </div>
                        <div className="text-sm text-gray-500 mb-2">{friend.wechatId}</div>
                        <div className="flex flex-wrap gap-1">
                          {friend.tags.map((tag, index) => (
                            <Badge key={index} className={`text-xs px-2 py-0.5 ${getTagColor(tag)}`}>
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 底部导航占位 */}
      <div className="h-20"></div>
    </div>
  )
}
