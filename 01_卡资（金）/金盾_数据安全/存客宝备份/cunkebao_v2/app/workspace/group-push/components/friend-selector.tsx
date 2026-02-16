"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Check, Smartphone } from "lucide-react"

// 模拟数据
const mockDevices = [
  { id: "1", name: "iPhone 13 Pro", online: true },
  { id: "2", name: "Xiaomi 12", online: true },
  { id: "3", name: "Samsung Galaxy S22", online: false },
  { id: "4", name: "OPPO Find X5", online: true },
]

const mockFriends = [
  {
    id: "1-friend-1",
    deviceId: "1",
    name: "张三",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["同事", "重要"],
    region: "北京",
  },
  {
    id: "1-friend-2",
    deviceId: "1",
    name: "李四",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["朋友"],
    region: "上海",
  },
  {
    id: "1-friend-3",
    deviceId: "1",
    name: "王五",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["家人"],
    region: "广州",
  },
  {
    id: "1-friend-4",
    deviceId: "1",
    name: "赵六",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["客户", "重要"],
    region: "深圳",
  },
  {
    id: "2-friend-1",
    deviceId: "2",
    name: "陈一",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["同学"],
    region: "北京",
  },
  {
    id: "2-friend-2",
    deviceId: "2",
    name: "杨二",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["朋友", "重要"],
    region: "上海",
  },
  {
    id: "2-friend-3",
    deviceId: "2",
    name: "刘三",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["同事"],
    region: "广州",
  },
  {
    id: "3-friend-1",
    deviceId: "3",
    name: "周七",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["客户"],
    region: "北京",
  },
  {
    id: "3-friend-2",
    deviceId: "3",
    name: "吴八",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["朋友"],
    region: "上海",
  },
  {
    id: "3-friend-3",
    deviceId: "3",
    name: "郑九",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["家人", "重要"],
    region: "广州",
  },
  {
    id: "4-friend-1",
    deviceId: "4",
    name: "冯十",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["同事"],
    region: "深圳",
  },
  {
    id: "4-friend-2",
    deviceId: "4",
    name: "蒋十一",
    avatar: "/placeholder.svg?height=40&width=40",
    tags: ["朋友"],
    region: "北京",
  },
]

interface Friend {
  id: string
  deviceId: string
  name: string
  avatar: string
  tags: string[]
  region: string
}

interface FriendSelectorProps {
  onSelectionChange: (friends: Friend[]) => void
  defaultSelectedFriendIds?: string[]
}

export function FriendSelector({ onSelectionChange, defaultSelectedFriendIds = [] }: FriendSelectorProps) {
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>(defaultSelectedFriendIds)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState<string>("all")
  const [selectedRegion, setSelectedRegion] = useState<string>("all")

  // 获取所有可用的标签和地区
  const allTags = Array.from(new Set(mockFriends.flatMap((friend) => friend.tags)))
  const allRegions = Array.from(new Set(mockFriends.map((friend) => friend.region)))

  // 根据选择的设备过滤好友
  const filteredFriends = mockFriends
    .filter((friend) => {
      // 如果没有选择设备，显示所有好友
      if (selectedDevices.length === 0) return true

      // 只显示选中设备的好友
      return selectedDevices.includes(friend.deviceId)
    })
    .filter((friend) => {
      // 搜索过滤
      if (searchQuery) {
        return friend.name.toLowerCase().includes(searchQuery.toLowerCase())
      }
      return true
    })
    .filter((friend) => {
      // 标签过滤
      if (selectedTag !== "all") {
        return friend.tags.includes(selectedTag)
      }
      return true
    })
    .filter((friend) => {
      // 地区过滤
      if (selectedRegion !== "all") {
        return friend.region === selectedRegion
      }
      return true
    })

  // 当选择的好友ID变化时，通知父组件
  useEffect(() => {
    const selectedFriends = mockFriends.filter((friend) => selectedFriendIds.includes(friend.id))
    onSelectionChange(selectedFriends)
  }, [selectedFriendIds, onSelectionChange])

  const toggleDeviceSelection = (deviceId: string) => {
    setSelectedDevices((prev) => {
      if (prev.includes(deviceId)) {
        return prev.filter((id) => id !== deviceId)
      } else {
        return [...prev, deviceId]
      }
    })
  }

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriendIds((prev) => {
      if (prev.includes(friendId)) {
        return prev.filter((id) => id !== friendId)
      } else {
        return [...prev, friendId]
      }
    })
  }

  const selectAllFriends = () => {
    setSelectedFriendIds(filteredFriends.map((friend) => friend.id))
  }

  const deselectAllFriends = () => {
    setSelectedFriendIds([])
  }

  return (
    <div className="space-y-6">
      {/* 设备选择 */}
      <div>
        <Label className="mb-2 block">选择设备</Label>
        <div className="flex flex-wrap gap-2">
          {mockDevices.map((device) => (
            <Button
              key={device.id}
              variant={selectedDevices.includes(device.id) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleDeviceSelection(device.id)}
              className="flex items-center gap-1"
              disabled={!device.online}
            >
              <Smartphone className="h-4 w-4" />
              {device.name}
              {selectedDevices.includes(device.id) && <Check className="h-3 w-3 ml-1" />}
              {!device.online && <span className="text-xs ml-1 text-gray-500">(离线)</span>}
            </Button>
          ))}
        </div>
      </div>

      {/* 好友筛选 */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="search" className="mb-2 block">
            搜索好友
          </Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              id="search"
              placeholder="输入好友名称"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="w-40">
          <Label htmlFor="tag-filter" className="mb-2 block">
            标签筛选
          </Label>
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger id="tag-filter">
              <SelectValue placeholder="选择标签" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部标签</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <Label htmlFor="region-filter" className="mb-2 block">
            地区筛选
          </Label>
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger id="region-filter">
              <SelectValue placeholder="选择地区" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部地区</SelectItem>
              {allRegions.map((region) => (
                <SelectItem key={region} value={region}>
                  {region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 好友列表 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label className="font-medium">好友列表 ({filteredFriends.length})</Label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAllFriends}>
              全选
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAllFriends}>
              取消全选
            </Button>
          </div>
        </div>

        <div className="border rounded-md overflow-hidden">
          <div className="max-h-[300px] overflow-y-auto p-1">
            {filteredFriends.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className={`flex items-center gap-2 p-2 rounded-md border ${
                      selectedFriendIds.includes(friend.id) ? "bg-blue-50 border-blue-200" : "border-gray-200"
                    }`}
                  >
                    <Checkbox
                      id={`friend-${friend.id}`}
                      checked={selectedFriendIds.includes(friend.id)}
                      onCheckedChange={() => toggleFriendSelection(friend.id)}
                    />
                    <img src={friend.avatar || "/placeholder.svg"} alt={friend.name} className="w-8 h-8 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{friend.name}</div>
                      <div className="text-xs text-gray-500 truncate">{friend.region}</div>
                    </div>
                    {friend.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {friend.tags.map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">没有找到符合条件的好友</div>
            )}
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-500">已选择 {selectedFriendIds.length} 位好友</div>
    </div>
  )
}
