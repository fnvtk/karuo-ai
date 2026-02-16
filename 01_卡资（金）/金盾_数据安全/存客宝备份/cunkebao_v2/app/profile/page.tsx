"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronLeft, ChevronRight, Settings, Smartphone, MessageCircle, Layers, FolderOpen, Store } from "lucide-react"

interface UserInfo {
  name: string
  role: string
  balance: number
  avatar: string
  lastLogin: string
}

interface FunctionItem {
  id: string
  name: string
  description: string
  icon: any
  count: number
  color: string
  path: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: "卡若",
    role: "管理员",
    balance: 1288.5,
    avatar: "/placeholder-user.jpg",
    lastLogin: "2025/7/29 20:33:11",
  })

  const functions: FunctionItem[] = [
    {
      id: "devices",
      name: "设备管理",
      description: "管理您的设备和微信账号",
      icon: Smartphone,
      count: 8,
      color: "text-blue-500",
      path: "/profile/devices",
    },
    {
      id: "wechat",
      name: "微信号管理",
      description: "管理微信账号和好友",
      icon: MessageCircle,
      count: 17,
      color: "text-green-500",
      path: "/wechat-accounts",
    },
    {
      id: "stores",
      name: "门店账号管理",
      description: "管理门店账号和权限",
      icon: Store,
      count: 5,
      color: "text-cyan-500",
      path: "/profile/stores",
    },
    {
      id: "traffic",
      name: "流量池",
      description: "管理用户流量池和分组",
      icon: Layers,
      count: 999,
      color: "text-purple-500",
      path: "/profile/traffic-pool",
    },
    {
      id: "content",
      name: "内容库",
      description: "管理营销内容和素材",
      icon: FolderOpen,
      count: 999,
      color: "text-orange-500",
      path: "/content",
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-16">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold text-blue-500">我的</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-4">
        {/* 用户信息卡片 */}
        <Card className="bg-white shadow-sm border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={userInfo.avatar || "/placeholder.svg"} alt={userInfo.name} />
                  <AvatarFallback className="bg-gray-200 text-gray-600 text-xl">{userInfo.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h2 className="text-xl font-bold text-gray-900">{userInfo.name}</h2>
                    <Badge className="bg-orange-100 text-orange-600 border-0">{userInfo.role}</Badge>
                  </div>
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-sm text-gray-600">余额:</span>
                    <span className="text-xl font-bold text-green-600">¥{userInfo.balance.toFixed(1)}</span>
                    <Button
                      className="bg-blue-500 hover:bg-blue-600 text-white h-8 px-4 rounded-md"
                      onClick={() => router.push("/profile/billing")}
                    >
                      充值
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/profile/settings")}
                className="text-gray-400"
              >
                <Settings className="w-6 h-6" />
              </Button>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-500">最近登录: {userInfo.lastLogin}</div>
            </div>
          </CardContent>
        </Card>

        {/* 功能列表 */}
        <div className="space-y-3">
          {functions.map((func) => {
            const Icon = func.icon
            return (
              <Card
                key={func.id}
                className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer border-0"
                onClick={() => router.push(func.path)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`${func.color}`}>
                        <Icon className="w-6 h-6" strokeWidth={2} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-base mb-0.5">{func.name}</h3>
                        <p className="text-xs text-gray-500">{func.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-blue-500">{func.count}</span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
