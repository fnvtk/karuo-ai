"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Users, Tag, MapPin, Filter, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// 微信好友类型定义
interface WechatFriend {
  id: string
  nickname: string
  remark?: string
  avatar?: string
  gender: "male" | "female" | "unknown"
  region?: string
  tags: string[]
  isOnline: boolean
  lastActiveAt: string
  deviceId: string
  deviceName: string
  addedAt: string
}

interface WechatFriendSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedFriends: string[]
  onSelectionChange: (friendIds: string[]) => void
  maxSelection?: number
  title?: string
  description?: string
}

export function WechatFriendSelector({
  open,
  onOpenChange,
  selectedFriends,
  onSelectionChange,
  maxSelection,
  title = "选择微信好友",
  description = "选择要操作的微信好友",
}: WechatFriendSelectorProps) {
  const [friends, setFriends] = useState<WechatFriend[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [onlineFilter, setOnlineFilter] = useState<"all" | "online" | "offline">("all")

  // 模拟好友数据
  const mockFriends: WechatFriend[] = [
    {
      id: "1",
      nickname: "张三",
      remark: "同事张三",
      avatar: "/placeholder-user.jpg",
      gender: "male",
      region: "北京",
      tags: ["同事", "重要客户"],
      isOnline: true,
      lastActiveAt: "2024-01-20T10:30:00Z",
      deviceId: "device1",
      deviceName: "设备001",
      addedAt: "2024-01-15T08:00:00Z",
    },
    {
      id: "2",
      nickname: "李四",
      remark: "朋友李四",
      avatar: "/placeholder-user.jpg",
      gender: "female",
      region: "上海",
      tags: ["朋友", "潜在客户"],
      isOnline: false,
      lastActiveAt: "2024-01-19T15:20:00Z",
      deviceId: "device1",
      deviceName: "设备001",
      addedAt: "2024-01-10T09:00:00Z",
    },
    {
      id: "3",
      nickname: "王五",
      avatar: "/placeholder-user.jpg",
      gender: "male",
      region: "广州",
      tags: ["客户", "VIP"],
      isOnline: true,
      lastActiveAt: "2024-01-20T09:15:00Z",
      deviceId: "device2",
      deviceName: "设备002",
      addedAt: "2024-01-12T14:30:00Z",
    },
    {
      id: "4",
      nickname: "赵六",
      remark: "合作伙伴",
      avatar: "/placeholder-user.jpg",
      gender: "female",
      region: "深圳",
      tags: ["合作伙伴", "重要"],
      isOnline: true,
      lastActiveAt: "2024-01-20T11:45:00Z",
      deviceId: "device2",
      deviceName: "设备002",
      addedAt: "2024-01-08T16:20:00Z",
    },
  ]

  useEffect(() => {
    if (open) {
      loadFriends()
    }
  }, [open])

  const loadFriends = async () => {
    setLoading(true)
    try {
      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setFriends(mockFriends)
    } catch (error) {
      console.error("加载好友列表失败:", error)
    } finally {
      setLoading(false)
    }
  }

  // 获取所有标签
  const allTags = Array.from(new Set(friends.flatMap((friend) => friend.tags)))

  // 获取所有地区
  const allRegions = Array.from(new Set(friends.map((friend) => friend.region).filter(Boolean)))

  // 获取所有设备
  const allDevices = Array.from(new Set(friends.map((friend) => ({ id: friend.deviceId, name: friend.deviceName }))))

  // 过滤好友
  const filteredFriends = friends.filter((friend) => {
    // 搜索过滤
    const searchMatch =
      !searchTerm ||
      friend.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      friend.remark?.toLowerCase().includes(searchTerm.toLowerCase())

    // 标签过滤
    const tagMatch = selectedTags.length === 0 || selectedTags.some((tag) => friend.tags.includes(tag))

    // 地区过滤
    const regionMatch = selectedRegions.length === 0 || (friend.region && selectedRegions.includes(friend.region))

    // 设备过滤
    const deviceMatch = selectedDevices.length === 0 || selectedDevices.includes(friend.deviceId)

    // 在线状态过滤
    const onlineMatch =
      onlineFilter === "all" ||
      (onlineFilter === "online" && friend.isOnline) ||
      (onlineFilter === "offline" && !friend.isOnline)

    return searchMatch && tagMatch && regionMatch && deviceMatch && onlineMatch
  })

  const handleFriendToggle = (friendId: string) => {
    const newSelection = selectedFriends.includes(friendId)
      ? selectedFriends.filter((id) => id !== friendId)
      : maxSelection && selectedFriends.length >= maxSelection
        ? selectedFriends
        : [...selectedFriends, friendId]

    onSelectionChange(newSelection)
  }

  const handleSelectAll = () => {
    const allFilteredIds = filteredFriends.map((friend) => friend.id)
    const newSelection = maxSelection ? allFilteredIds.slice(0, maxSelection) : allFilteredIds
    onSelectionChange(newSelection)
  }

  const handleClearAll = () => {
    onSelectionChange([])
  }

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const handleRegionToggle = (region: string) => {
    setSelectedRegions((prev) => (prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]))
  }

  const handleDeviceToggle = (deviceId: string) => {
    setSelectedDevices((prev) => (prev.includes(deviceId) ? prev.filter((d) => d !== deviceId) : [...prev, deviceId]))
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedTags([])
    setSelectedRegions([])
    setSelectedDevices([])
    setOnlineFilter("all")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>{title}</span>
          </DialogTitle>
          <p className="text-sm text-gray-600">{description}</p>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4">
          {/* 搜索和操作栏 */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索好友昵称或备注..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              全选
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              清空
            </Button>
          </div>

          {/* 选择统计 */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              已选择 {selectedFriends.length} 个好友
              {maxSelection && ` / ${maxSelection}`}
            </span>
            <span>共 {filteredFriends.length} 个好友</span>
          </div>

          <Tabs defaultValue="list" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">好友列表</TabsTrigger>
              <TabsTrigger value="filter">筛选条件</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="flex-1 mt-4">
              <ScrollArea className="h-96">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-gray-500">加载中...</div>
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-gray-500">暂无符合条件的好友</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                          selectedFriends.includes(friend.id) ? "border-blue-500 bg-blue-50" : "border-gray-200"
                        }`}
                        onClick={() => handleFriendToggle(friend.id)}
                      >
                        <Checkbox checked={selectedFriends.includes(friend.id)} onChange={() => {}} />
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={friend.avatar || "/placeholder.svg"} alt={friend.nickname} />
                          <AvatarFallback>{friend.nickname.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium truncate">{friend.nickname}</span>
                            {friend.remark && <span className="text-sm text-gray-500 truncate">({friend.remark})</span>}
                            <div
                              className={`w-2 h-2 rounded-full ${friend.isOnline ? "bg-green-500" : "bg-gray-400"}`}
                            />
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                            {friend.region && (
                              <span className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>{friend.region}</span>
                              </span>
                            )}
                            <span>{friend.deviceName}</span>
                          </div>
                          {friend.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {friend.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="filter" className="flex-1 mt-4">
              <ScrollArea className="h-96">
                <div className="space-y-6">
                  {/* 在线状态筛选 */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center space-x-2">
                      <Filter className="h-4 w-4" />
                      <span>在线状态</span>
                    </h4>
                    <div className="flex space-x-2">
                      {[
                        { value: "all", label: "全部" },
                        { value: "online", label: "在线" },
                        { value: "offline", label: "离线" },
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={onlineFilter === option.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setOnlineFilter(option.value as any)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 标签筛选 */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center space-x-2">
                      <Tag className="h-4 w-4" />
                      <span>标签筛选</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => (
                        <Button
                          key={tag}
                          variant={selectedTags.includes(tag) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleTagToggle(tag)}
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 地区筛选 */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>地区筛选</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {allRegions.map((region) => (
                        <Button
                          key={region}
                          variant={selectedRegions.includes(region) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleRegionToggle(region)}
                        >
                          {region}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 设备筛选 */}
                  <div>
                    <h4 className="font-medium mb-3">设备筛选</h4>
                    <div className="flex flex-wrap gap-2">
                      {allDevices.map((device) => (
                        <Button
                          key={device.id}
                          variant={selectedDevices.includes(device.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleDeviceToggle(device.id)}
                        >
                          {device.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 清除筛选 */}
                  <div className="pt-4 border-t">
                    <Button variant="outline" onClick={clearFilters} className="w-full bg-transparent">
                      <X className="h-4 w-4 mr-2" />
                      清除所有筛选条件
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* 底部操作按钮 */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={() => onOpenChange(false)}>确定选择</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default WechatFriendSelector
