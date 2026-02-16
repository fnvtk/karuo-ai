"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, RefreshCw, Users } from "lucide-react"
import { useRouter } from "next/navigation"

// 微信号数据类型定义
interface WechatAccount {
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
}

// 模拟数据 - 与整个项目保持一致（总数17个微信号）
const mockWechatAccounts: WechatAccount[] = [
  {
    id: "1",
    nickname: "卡若-zok7e",
    wechatId: "wxid_ilf29mrq",
    avatar: "/placeholder.svg?height=60&width=60",
    status: "normal",
    friendCount: 4557,
    todayAdded: 5,
    todayCanAdd: 15,
    maxDailyAdd: 20,
    deviceName: "设备1",
    lastActive: "2025/2/9 07:13:14",
  },
  {
    id: "2",
    nickname: "卡若-25vig",
    wechatId: "wxid_ioxbl5c6",
    avatar: "/placeholder.svg?height=60&width=60",
    status: "normal",
    friendCount: 1501,
    todayAdded: 8,
    todayCanAdd: 12,
    maxDailyAdd: 20,
    deviceName: "设备1",
    lastActive: "2025/2/8 19:13:14",
  },
  {
    id: "3",
    nickname: "卡若-ip9ob",
    wechatId: "wxid_e7ahk8a2",
    avatar: "/placeholder.svg?height=60&width=60",
    status: "normal",
    friendCount: 3708,
    todayAdded: 3,
    todayCanAdd: 17,
    maxDailyAdd: 20,
    deviceName: "设备2",
    lastActive: "2025/2/8 22:13:14",
  },
  {
    id: "4",
    nickname: "卡若-2kna3",
    wechatId: "wxid_pl3wt26z",
    avatar: "/placeholder.svg?height=60&width=60",
    status: "normal",
    friendCount: 2030,
    todayAdded: 12,
    todayCanAdd: 8,
    maxDailyAdd: 20,
    deviceName: "设备2",
    lastActive: "2025/2/8 19:13:14",
  },
  // 添加更多微信账号以达到17个总数
  {
    id: "5",
    nickname: "卡若-abc12",
    wechatId: "wxid_abc12345",
    avatar: "/placeholder.svg?height=60&width=60",
    status: "normal",
    friendCount: 1245,
    todayAdded: 2,
    todayCanAdd: 18,
    maxDailyAdd: 20,
    deviceName: "设备3",
    lastActive: "2025/2/9 06:30:14",
  },
  {
    id: "6",
    nickname: "卡若-def34",
    wechatId: "wxid_def34567",
    avatar: "/placeholder.svg?height=60&width=60",
    status: "normal",
    friendCount: 987,
    todayAdded: 6,
    todayCanAdd: 14,
    maxDailyAdd: 20,
    deviceName: "设备3",
    lastActive: "2025/2/9 05:45:14",
  },
  {
    id: "7",
    nickname: "卡若-ghi56",
    wechatId: "wxid_ghi56789",
    avatar: "/placeholder.svg?height=60&width=60",
    status: "normal",
    friendCount: 2345,
    todayAdded: 4,
    todayCanAdd: 16,
    maxDailyAdd: 20,
    deviceName: "设备4",
    lastActive: "2025/2/9 04:20:14",
  },
  {
    id: "8",
    nickname: "卡若-jkl78",
    wechatId: "wxid_jkl78901",
    avatar: "/placeholder.svg?height=60&width=60",
    status: "limited",
    friendCount: 456,
    todayAdded: 0,
    todayCanAdd: 5,
    maxDailyAdd: 20,
    deviceName: "设备4",
    lastActive: "2025/2/8 23:15:14",
  },
  {
    id: "9",
    nickname: "卡若-mno90",
    wechatId: "wxid_mno90123",
    avatar: "/placeholder.svg?height=60&width=60",
    status: "normal",
    friendCount: 1678,
    todayAdded: 7,
    todayCanAdd: 13,
    maxDailyAdd: 20,
    deviceName: "设备5",
    lastActive: "2025/2/9 03:10:14",
  },
  {
    id: "10",
    nickname: "卡若-pqr12",
    wechatId: "wxid_pqr12345",
    avatar: "/placeholder.svg?height=60&width=60",
    status: "normal",
    friendCount: 2789,
    todayAdded: 9,
    todayCanAdd: 11,
    maxDailyAdd: 20,
    deviceName: "设备5",
    lastActive: "2025/2/9 02:05:14",
  },
  {
    id: "11",
    nickname: "卡若-stu34",
    wechatId: "wxid_stu34567",
    avatar: "/placeholder.svg?height=60&width=60",
    status: "normal",
    friendCount: 3456,
    todayAdded: 1,
    todayCanAdd: 19,
    maxDailyAdd: 20,
    deviceName: "设备6",
    lastActive: "2025/2/9 01:30:14",
  },
  {
    id: "12",
    nickname: "卡若-vwx56",
    wechatId: "wxid_vwx56789",
    avatar: "/placeholder.svg?height=60&width=60",
    status: "normal",
    friendCount: 789,
    todayAdded: 11,
    todayCanAdd: 9,
    maxDailyAdd: 20,
    deviceName: "设备6",
    lastActive: "2025/2/8 24:45:14",
  },
  {
    id: "13",
    nickname: "卡若-yza78",
    wechatId: "wxid_yza78901",
    avatar: "/placeholder.svg?height=60&width=60",
    status: "normal",
    friendCount: 1234,
    todayAdded: 5,
    todayCanAdd: 15,
    maxDailyAdd: 20,
    deviceName: "设备7",
    lastActive: "2025/2/8 23:20:14",
  },
  {
    id: "14",
    nickname: "卡若-bcd90",
    wechatId: "wxid_bcd90123",
    avatar: "/placeholder.svg?height=60&width=60",
    status: "normal",
    friendCount: 2567,
    todayAdded: 3,
    todayCanAdd: 17,
    maxDailyAdd: 20,
    deviceName: "设备7",
    lastActive: "2025/2/8 22:10:14",
  },
  {
    id: "15",
    nickname: "卡若-efg12",
    wechatId: "wxid_efg12345",
    avatar: "/placeholder.svg?height=60&width=60",
    status: "normal",
    friendCount: 890,
    todayAdded: 10,
    todayCanAdd: 10,
    maxDailyAdd: 20,
    deviceName: "设备8",
    lastActive: "2025/2/8 21:55:14",
  },
  {
    id: "16",
    nickname: "卡若-hij34",
    wechatId: "wxid_hij34567",
    avatar: "/placeholder.svg?height=60&width=60",
    status: "normal",
    friendCount: 1567,
    todayAdded: 6,
    todayCanAdd: 14,
    maxDailyAdd: 20,
    deviceName: "设备8",
    lastActive: "2025/2/8 20:40:14",
  },
  {
    id: "17",
    nickname: "卡若-klm56",
    wechatId: "wxid_klm56789",
    avatar: "/placeholder.svg?height=60&width=60",
    status: "normal",
    friendCount: 2234,
    todayAdded: 8,
    todayCanAdd: 12,
    maxDailyAdd: 20,
    deviceName: "设备8",
    lastActive: "2025/2/8 19:25:14",
  },
]

export default function WechatAccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<WechatAccount[]>([])
  const [loading, setLoading] = useState(true)

  // 加载微信号数据
  const loadWechatAccounts = async () => {
    try {
      setLoading(true)
      // 模拟API调用延迟
      await new Promise((resolve) => setTimeout(resolve, 800))
      setAccounts(mockWechatAccounts)
    } catch (error) {
      console.error("加载微信号失败:", error)
      setAccounts(mockWechatAccounts)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWechatAccounts()
  }, [])

  // 处理返回
  const handleBack = () => {
    router.back()
  }

  // 处理刷新
  const handleRefresh = () => {
    loadWechatAccounts()
  }

  // 处理点击微信号
  const handleAccountClick = (accountId: string) => {
    router.push(`/wechat-accounts/${accountId}`)
  }

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case "normal":
        return "正常"
      case "limited":
        return "受限"
      case "banned":
        return "封号"
      default:
        return "未知"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">加载微信号中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部导航 - 简化版 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium">微信号</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* 微信号列表 - 简化版 */}
      <div className="p-4 space-y-4">
        {accounts.map((account) => (
          <Card
            key={account.id}
            className="p-5 hover:shadow-md transition-all cursor-pointer bg-white"
            onClick={() => handleAccountClick(account.id)}
          >
            {/* 顶部信息行 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <h3 className="font-medium text-lg">{account.nickname}</h3>
                <Badge className="bg-green-100 text-green-700 text-xs px-2 py-1">{getStatusText(account.status)}</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs px-3 py-1 h-8 bg-transparent"
                onClick={(e) => {
                  e.stopPropagation()
                  // 处理好友转移
                }}
              >
                <Users className="h-3 w-3 mr-1" />
                好友转移
              </Button>
            </div>

            {/* 微信号 */}
            <div className="text-sm text-gray-600 mb-4">微信号: {account.wechatId}</div>

            {/* 主要内容区域 */}
            <div className="flex items-center space-x-6">
              {/* 头像 */}
              <Avatar className="h-16 w-16 flex-shrink-0">
                <AvatarImage src={account.avatar || "/placeholder.svg"} alt={account.nickname} />
                <AvatarFallback className="bg-gray-200 text-gray-600 text-lg">
                  {account.nickname.charAt(0)}
                </AvatarFallback>
              </Avatar>

              {/* 统计信息 */}
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">好友数量</div>
                  <div className="font-semibold text-lg">{account.friendCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">今日新增</div>
                  <div className="font-semibold text-lg text-green-600">+{account.todayAdded}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">今日可添加</div>
                  <div className="font-semibold text-lg">{account.todayCanAdd}</div>
                </div>
              </div>
            </div>

            {/* 进度条区域 */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>今日可添加</span>
                <span>
                  {account.todayCanAdd}/{account.maxDailyAdd}
                </span>
              </div>
              <Progress value={(account.todayCanAdd / account.maxDailyAdd) * 100} className="h-2" />
            </div>

            {/* 底部信息 */}
            <div className="text-xs text-gray-400 mt-3 text-center">
              所属设备: {account.deviceName} 最后活跃: {account.lastActive}
            </div>
          </Card>
        ))}
      </div>

      {/* 底部导航占位 */}
      <div className="h-20"></div>
    </div>
  )
}
