"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, X, Smartphone, CheckCircle2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"

interface Device {
  id: string
  name: string
  type: string
  status: "online" | "offline"
  imei?: string
  wechatId?: string
}

interface Friend {
  id: string
  nickname: string
  wechatId: string
  avatar?: string
}

interface DeviceContentConfig {
  deviceId: string
  sourceType: "friends" | "groups"
  selectedFriends: Friend[]
  selectedGroups: any[]
}

interface ContentLibrary {
  id: string
  name: string
  selectedDevices: string[]
  deviceConfigs: DeviceContentConfig[]
  keywordsInclude: string
  keywordsExclude: string
  contentTypes: string[]
  useAI: boolean
  aiPrompt: string
  startDate: string
  endDate: string
  enabled: boolean
}
// </CHANGE>

const MOCK_DEVICES: Device[] = [
  { id: "1", name: "iPhone 13", type: "工作号", status: "online", imei: "sd123123", wechatId: "wxid_qc924n67" },
  { id: "2", name: "Pixel 5", type: "副外号", status: "online", imei: "sd123124", wechatId: "wxid_kwjazkzd" },
  { id: "3", name: "华为Mate60", type: "连哥号", status: "online", imei: "sd123125", wechatId: "wxid_6t25lkdf" },
]

const MOCK_FRIENDS: Friend[] = [
  { id: "1", nickname: "skcay", wechatId: "q58909851", avatar: "/placeholder.svg?height=40&width=40" },
  { id: "2", nickname: "周中师", wechatId: "q13366601", avatar: "/placeholder.svg?height=40&width=40" },
  {
    id: "3",
    nickname: "C1手动C2自动绿D.D驾证年检训",
    wechatId: "wxid_7eurxd3097021",
    avatar: "/placeholder.svg?height=40&width=40",
  },
]
// </CHANGE>

export default function ContentLibraryPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [devices] = useState<Device[]>(MOCK_DEVICES)
  const [isLoading, setIsLoading] = useState(true)

  const [library, setLibrary] = useState<ContentLibrary>({
    id: params.id,
    name: "卡若的朋友圈",
    selectedDevices: ["1", "2"],
    deviceConfigs: [
      {
        deviceId: "1",
        sourceType: "friends",
        selectedFriends: MOCK_FRIENDS,
        selectedGroups: [],
      },
      {
        deviceId: "2",
        sourceType: "friends",
        selectedFriends: MOCK_FRIENDS,
        selectedGroups: [],
      },
    ],
    keywordsInclude: "",
    keywordsExclude: "",
    contentTypes: ["文本", "图片", "视频"],
    useAI: true,
    aiPrompt:
      "重写这条朋友圈要求：1、原来的字数和意思不要修改超过10%。2、出现品牌名或产品名或个人名字要就保持原样不要改。",
    startDate: "2024/01/01",
    endDate: "2024/12/31",
    enabled: true,
  })
  // </CHANGE>

  useEffect(() => {
    const fetchLibrary = async () => {
      setIsLoading(true)
      try {
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        console.error("Failed to fetch library data:", error)
        toast({
          title: "错误",
          description: "获取内容库数据失败",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchLibrary()
  }, [params.id])

  const handleDeviceToggle = (deviceId: string) => {
    const isSelected = library.selectedDevices.includes(deviceId)

    if (isSelected) {
      // 取消选择设备，同时移除该设备的配置
      setLibrary({
        ...library,
        selectedDevices: library.selectedDevices.filter((id) => id !== deviceId),
        deviceConfigs: library.deviceConfigs.filter((config) => config.deviceId !== deviceId),
      })
    } else {
      // 选择设备，添加新的配置
      setLibrary({
        ...library,
        selectedDevices: [...library.selectedDevices, deviceId],
        deviceConfigs: [
          ...library.deviceConfigs,
          {
            deviceId,
            sourceType: "friends",
            selectedFriends: [],
            selectedGroups: [],
          },
        ],
      })
    }
  }
  // </CHANGE>

  const updateDeviceConfig = (deviceId: string, updates: Partial<DeviceContentConfig>) => {
    setLibrary({
      ...library,
      deviceConfigs: library.deviceConfigs.map((config) =>
        config.deviceId === deviceId ? { ...config, ...updates } : config,
      ),
    })
  }

  // 移除好友
  const removeFriend = (deviceId: string, friendId: string) => {
    const config = library.deviceConfigs.find((c) => c.deviceId === deviceId)
    if (config) {
      updateDeviceConfig(deviceId, {
        selectedFriends: config.selectedFriends.filter((f) => f.id !== friendId),
      })
    }
  }
  // </CHANGE>

  const handleContentTypeToggle = (type: string) => {
    const selected = library.contentTypes.includes(type)
    if (selected) {
      setLibrary({
        ...library,
        contentTypes: library.contentTypes.filter((t) => t !== type),
      })
    } else {
      setLibrary({
        ...library,
        contentTypes: [...library.contentTypes, type],
      })
    }
  }

  const handleSave = async () => {
    if (!library.name.trim()) {
      toast({
        title: "错误",
        description: "请输入内容库名称",
        variant: "destructive",
      })
      return
    }

    if (library.selectedDevices.length === 0) {
      toast({
        title: "错误",
        description: "请至少选择一个采集设备",
        variant: "destructive",
      })
      return
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      toast({
        title: "成功",
        description: "内容库已保存",
      })
      router.back()
    } catch (error) {
      console.error("Failed to save library:", error)
      toast({
        title: "错误",
        description: "保存内容库失败",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">加载中...</div>
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-blue-600">编辑内容库</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 pb-24 space-y-4">
        <Card className="p-4">
          <div>
            <Label htmlFor="name" className="text-sm font-medium">
              <span className="text-red-500">* </span>内容库名称
            </Label>
            <Input
              id="name"
              value={library.name}
              onChange={(e) => setLibrary({ ...library, name: e.target.value })}
              placeholder="请输入内容库名称"
              className="mt-2"
            />
          </div>
        </Card>
        {/* </CHANGE> */}

        <Card className="p-4">
          <Label className="text-sm font-medium">选择设备</Label>
          <div className="flex gap-3 mt-3 overflow-x-auto pb-2">
            {devices.map((device) => {
              const isSelected = library.selectedDevices.includes(device.id)
              return (
                <div
                  key={device.id}
                  onClick={() => handleDeviceToggle(device.id)}
                  className={`flex-shrink-0 w-32 p-3 rounded-lg border-2 cursor-pointer transition-all relative ${
                    isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    </div>
                  )}
                  <div className="flex flex-col items-center space-y-2">
                    <Smartphone className={`w-8 h-8 ${isSelected ? "text-blue-500" : "text-gray-400"}`} />
                    <div className="text-center">
                      <div className={`text-sm font-medium ${isSelected ? "text-blue-600" : "text-gray-700"}`}>
                        {device.name}
                      </div>
                      <div className="text-xs text-gray-500">{device.type}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
        {/* </CHANGE> */}

        {library.selectedDevices.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-gray-700">采集内容</h2>

            {library.selectedDevices.map((deviceId) => {
              const device = devices.find((d) => d.id === deviceId)
              const config = library.deviceConfigs.find((c) => c.deviceId === deviceId)

              if (!device || !config) return null

              return (
                <Card key={deviceId} className="p-4 border-2 border-blue-100">
                  {/* 设备标识 */}
                  <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                    <Smartphone className="w-4 h-4" />
                    <span className="font-medium">
                      {device.name} ({device.type})
                    </span>
                    {config.selectedFriends.length > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {config.selectedFriends.length}
                      </Badge>
                    )}
                  </div>

                  {/* 好友/群组选择标签 */}
                  <Tabs
                    value={config.sourceType}
                    onValueChange={(value: "friends" | "groups") => updateDeviceConfig(deviceId, { sourceType: value })}
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="friends" className="text-sm">
                        选择微信好友
                      </TabsTrigger>
                      <TabsTrigger value="groups" className="text-sm">
                        选择聊天群
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="friends" className="mt-4 space-y-3">
                      {/* 搜索框 */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder={`已选择 ${config.selectedFriends.length} 个好友`}
                          className="pl-10 bg-gray-50"
                          readOnly
                        />
                        {config.selectedFriends.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 text-xs text-gray-400"
                            onClick={() => updateDeviceConfig(deviceId, { selectedFriends: [] })}
                          >
                            清空
                          </Button>
                        )}
                      </div>

                      {/* 已选好友列表 */}
                      {config.selectedFriends.length > 0 && (
                        <div className="space-y-2">
                          {config.selectedFriends.map((friend) => (
                            <div
                              key={friend.id}
                              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100"
                            >
                              <img
                                src={friend.avatar || "/placeholder.svg"}
                                alt={friend.nickname}
                                className="w-10 h-10 rounded-full"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{friend.nickname}</div>
                                <div className="text-xs text-gray-500">{friend.wechatId}</div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                                onClick={() => removeFriend(deviceId, friend.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="groups" className="mt-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder={`已选择 ${config.selectedGroups.length} 个群组`}
                          className="pl-10 bg-gray-50"
                          readOnly
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </Card>
              )
            })}
          </div>
        )}
        {/* </CHANGE> */}

        {/* 关键词设置 */}
        <Accordion type="single" collapsible className="bg-white rounded-lg border">
          <AccordionItem value="keywords" className="border-0">
            <AccordionTrigger className="px-4 hover:no-underline">
              <span className="text-sm font-medium">关键词设置</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-4">
              <div>
                <Label htmlFor="keywordsInclude" className="text-sm">
                  关键词匹配
                </Label>
                <Textarea
                  id="keywordsInclude"
                  value={library.keywordsInclude}
                  onChange={(e) => setLibrary({ ...library, keywordsInclude: e.target.value })}
                  placeholder="如果设置了关键词，系统只会采集含有关键词的内容。多个关键词用','隔开"
                  className="mt-2 min-h-[60px] text-sm"
                />
              </div>
              <div>
                <Label htmlFor="keywordsExclude" className="text-sm">
                  关键词排除
                </Label>
                <Textarea
                  id="keywordsExclude"
                  value={library.keywordsExclude}
                  onChange={(e) => setLibrary({ ...library, keywordsExclude: e.target.value })}
                  placeholder="匹配到这些关键词的内容将不会被采集。多个关键词用','隔开"
                  className="mt-2 min-h-[60px] text-sm"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* 采集内容类型 */}
        <Card className="p-4">
          <Label className="text-sm font-medium">采集内容类型</Label>
          <div className="flex gap-2 mt-3">
            {["文本", "图片", "视频"].map((type) => (
              <Button
                key={type}
                variant={library.contentTypes.includes(type) ? "default" : "outline"}
                onClick={() => handleContentTypeToggle(type)}
                className={`flex-1 ${library.contentTypes.includes(type) ? "bg-blue-500 hover:bg-blue-600" : ""}`}
              >
                {type}
              </Button>
            ))}
          </div>
        </Card>

        {/* 是否启用AI */}
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Label className="text-sm font-medium">是否启用AI</Label>
              <p className="text-xs text-gray-500 mt-1">启用后，该内容库下的内容会通过AI生成</p>
            </div>
            <Switch checked={library.useAI} onCheckedChange={(checked) => setLibrary({ ...library, useAI: checked })} />
          </div>

          {library.useAI && (
            <div className="mt-4">
              <Label htmlFor="aiPrompt" className="text-sm font-medium">
                AI提示词
              </Label>
              <Textarea
                id="aiPrompt"
                value={library.aiPrompt}
                onChange={(e) => setLibrary({ ...library, aiPrompt: e.target.value })}
                placeholder="请输入AI提示词"
                className="mt-2 min-h-[80px] text-sm"
              />
            </div>
          )}
        </Card>

        {/* 时间限制 */}
        <Card className="p-4">
          <Label className="text-sm font-medium">时间限制</Label>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <Label htmlFor="startDate" className="text-xs text-gray-500">
                开始时间
              </Label>
              <Input
                id="startDate"
                type="text"
                value={library.startDate}
                onChange={(e) => setLibrary({ ...library, startDate: e.target.value })}
                placeholder="年/月/日"
                className="mt-1.5 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-xs text-gray-500">
                结束时间
              </Label>
              <Input
                id="endDate"
                type="text"
                value={library.endDate}
                onChange={(e) => setLibrary({ ...library, endDate: e.target.value })}
                placeholder="年/月/日"
                className="mt-1.5 text-sm"
              />
            </div>
          </div>
        </Card>

        {/* 是否启用 */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">是否启用</Label>
            <Switch
              checked={library.enabled}
              onCheckedChange={(checked) => setLibrary({ ...library, enabled: checked })}
            />
          </div>
        </Card>
      </div>

      {/* 底部按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
        <Button onClick={handleSave} className="w-full bg-blue-500 hover:bg-blue-600 h-12 text-base font-medium">
          保存内容库
        </Button>
      </div>
    </div>
  )
}
