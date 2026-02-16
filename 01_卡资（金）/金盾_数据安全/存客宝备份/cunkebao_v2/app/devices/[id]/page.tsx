"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Battery, Wifi, Settings, History } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

interface WechatAccount {
  id: string
  avatar: string
  nickname: string
  wechatId: string
  gender: "male" | "female"
  status: "normal" | "abnormal"
  onlineStatus: "online" | "offline" | "standby"
  addFriendStatus: "enabled" | "disabled"
  friendCount: number
  lastActive: string
  isPrimary: boolean
}

interface Device {
  id: string
  imei: string
  name: string
  status: "online" | "offline"
  battery: number
  lastActive: string
  historicalIds: string[]
  wechatAccounts: WechatAccount[]
  features: {
    autoAddFriend: boolean
    autoReply: boolean
    contentSync: boolean
    aiChat: boolean
  }
  history: {
    time: string
    action: string
    operator: string
  }[]
}

export default function DeviceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [device, setDevice] = useState<Device | null>(null)
  const [activeTab, setActiveTab] = useState("accounts")

  useEffect(() => {
    // 模拟API调用 - 确保只有一个账号在线
    const mockDevice: Device = {
      id: params.id as string,
      imei: "sd123123",
      name: "设备 1",
      status: "online",
      battery: 85,
      lastActive: "2024-02-09 15:30:45",
      historicalIds: ["vx412321", "vfbadasd"],
      wechatAccounts: [
        {
          id: "1",
          avatar: "/placeholder.svg?height=40&width=40",
          nickname: "老张",
          wechatId: "wxid_abc123",
          gender: "male",
          status: "normal",
          onlineStatus: "online", // 主要在线账号
          addFriendStatus: "enabled",
          friendCount: 523,
          lastActive: "2024-02-09 15:20:33",
          isPrimary: true,
        },
        {
          id: "2",
          avatar: "/placeholder.svg?height=40&width=40",
          nickname: "老李",
          wechatId: "wxid_xyz789",
          gender: "male",
          status: "abnormal",
          onlineStatus: "standby", // 备用状态
          addFriendStatus: "disabled",
          friendCount: 245,
          lastActive: "2024-02-09 14:15:22",
          isPrimary: false,
        },
      ],
      features: {
        autoAddFriend: true,
        autoReply: true,
        contentSync: false,
        aiChat: true,
      },
      history: [
        {
          time: "2024-02-09 15:30:45",
          action: "切换主要账号至老张",
          operator: "系统",
        },
        {
          time: "2024-02-09 15:25:12",
          action: "老李账号切换为备用状态",
          operator: "系统",
        },
        {
          time: "2024-02-09 14:20:33",
          action: "添加微信号",
          operator: "管理员",
        },
      ],
    }
    setDevice(mockDevice)
  }, [params.id])

  const handleSwitchPrimary = (accountId: string) => {
    if (!device) return

    setDevice((prev) => {
      if (!prev) return prev

      const updatedAccounts = prev.wechatAccounts.map((account) => ({
        ...account,
        isPrimary: account.id === accountId,
        onlineStatus: account.id === accountId ? ("online" as const) : ("standby" as const),
      }))

      return {
        ...prev,
        wechatAccounts: updatedAccounts,
      }
    })
  }

  const getOnlineStatusColor = (onlineStatus: string) => {
    switch (onlineStatus) {
      case "online":
        return "bg-green-500"
      case "standby":
        return "bg-yellow-500"
      case "offline":
        return "bg-gray-400"
      default:
        return "bg-gray-400"
    }
  }

  const getOnlineStatusText = (onlineStatus: string) => {
    switch (onlineStatus) {
      case "online":
        return "在线"
      case "standby":
        return "备用"
      case "offline":
        return "离线"
      default:
        return "未知"
    }
  }

  if (!device) {
    return <div>加载中...</div>
  }

  const onlineAccount = device.wechatAccounts.find((acc) => acc.onlineStatus === "online")
  const standbyAccounts = device.wechatAccounts.filter((acc) => acc.onlineStatus !== "online")

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="max-w-[390px] mx-auto bg-white">
        <header className="sticky top-0 z-10 bg-white border-b">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-medium">设备详情</h1>
            </div>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {/* 设备基本信息 */}
          <Card className="p-4 rounded-xl shadow-sm">
            <div className="text-center mb-4">
              <div className="text-sm text-gray-500 mb-2">历史ID: {device.historicalIds.join(", ")}</div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Battery className={`w-5 h-5 ${device.battery < 20 ? "text-red-500" : "text-green-500"}`} />
                <span className="text-lg font-semibold text-green-500">{device.battery}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <Wifi className="w-5 h-5 text-blue-500" />
                <span className="text-lg font-semibold text-blue-500">已连接</span>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500">最后活跃：{device.lastActive}</div>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
              <TabsTrigger value="info" className="rounded-md">
                基本信息
              </TabsTrigger>
              <TabsTrigger value="accounts" className="rounded-md">
                关联账号
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-md">
                操作记录
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <Card className="p-4 space-y-4 rounded-xl shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">自动加好友</Label>
                      <div className="text-sm text-gray-500">自动通过好友验证</div>
                    </div>
                    <Switch checked={device.features.autoAddFriend} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">自动回复</Label>
                      <div className="text-sm text-gray-500">自动回复好友消息</div>
                    </div>
                    <Switch checked={device.features.autoReply} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">朋友圈同步</Label>
                      <div className="text-sm text-gray-500">自动同步朋友圈内容</div>
                    </div>
                    <Switch checked={device.features.contentSync} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">AI会话</Label>
                      <div className="text-sm text-gray-500">启用AI智能对话</div>
                    </div>
                    <Switch checked={device.features.aiChat} />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="accounts">
              <Card className="p-4 rounded-xl shadow-sm">
                <ScrollArea className="h-[calc(100vh-400px)]">
                  <div className="space-y-4">
                    {/* 在线账号 */}
                    {onlineAccount && (
                      <div>
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">当前在线账号</span>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                          <div className="flex items-start space-x-3">
                            <img
                              src={onlineAccount.avatar || "/placeholder.svg"}
                              alt={onlineAccount.nickname}
                              className="w-12 h-12 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="font-medium truncate">{onlineAccount.nickname}</div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="success" className="rounded-full">
                                    {onlineAccount.status === "normal" ? "正常" : "异常"}
                                  </Badge>
                                  <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs text-green-600">在线</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-sm text-gray-500 mt-1">微信号: {onlineAccount.wechatId}</div>
                              <div className="text-sm text-gray-500">
                                性别: {onlineAccount.gender === "male" ? "男" : "女"}
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-sm text-gray-500">好友数: {onlineAccount.friendCount}</span>
                                <Badge
                                  variant={onlineAccount.addFriendStatus === "enabled" ? "outline" : "secondary"}
                                  className="rounded-full"
                                >
                                  {onlineAccount.addFriendStatus === "enabled" ? "可加友" : "已停用"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 备用账号 */}
                    {standbyAccounts.length > 0 && (
                      <div>
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">备用账号</span>
                        </div>
                        <div className="space-y-3">
                          {standbyAccounts.map((account) => (
                            <div key={account.id} className="p-4 bg-gray-50 rounded-lg border">
                              <div className="flex items-start space-x-3">
                                <img
                                  src={account.avatar || "/placeholder.svg"}
                                  alt={account.nickname}
                                  className="w-12 h-12 rounded-full opacity-75"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <div className="font-medium truncate">{account.nickname}</div>
                                    <div className="flex items-center space-x-2">
                                      <Badge
                                        variant={account.status === "normal" ? "outline" : "destructive"}
                                        className="rounded-full"
                                      >
                                        {account.status === "normal" ? "正常" : "异常"}
                                      </Badge>
                                      <div className="flex items-center space-x-1">
                                        <div
                                          className={`w-2 h-2 rounded-full ${getOnlineStatusColor(account.onlineStatus)}`}
                                        ></div>
                                        <span className="text-xs text-gray-500">
                                          {getOnlineStatusText(account.onlineStatus)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">微信号: {account.wechatId}</div>
                                  <div className="text-sm text-gray-500">
                                    性别: {account.gender === "male" ? "男" : "女"}
                                  </div>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-sm text-gray-500">好友数: {account.friendCount}</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSwitchPrimary(account.id)}
                                      className="text-xs"
                                    >
                                      切换为主号
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 账号管理说明 */}
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-800">
                        <div className="font-medium mb-1">账号管理说明：</div>
                        <div className="text-xs space-y-1">
                          <div>• 每个设备同时只能有一个微信号在线</div>
                          <div>• 其他账号将自动切换为备用状态</div>
                          <div>• 可随时切换主要在线账号</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="p-4 rounded-xl shadow-sm">
                <ScrollArea className="h-[calc(100vh-400px)]">
                  <div className="space-y-4">
                    {device.history.map((record, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="p-2 bg-blue-50 rounded-full">
                          <History className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{record.action}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            操作人: {record.operator} · {record.time}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
