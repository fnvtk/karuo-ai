"use client"

import { useState, useEffect } from "react"
import { Check, Search, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface WechatGroup {
  id: string
  name: string
  avatar?: string
  memberCount: number
  description?: string
  tags: string[]
  isActive: boolean
  lastMessageTime: string
  ownerNickname: string
}

interface WechatGroupSelectorProps {
  selectedGroups?: string[]
  onSelectionChange?: (groupIds: string[]) => void
  maxSelection?: number
  className?: string
}

export function WechatGroupSelector({
  selectedGroups = [],
  onSelectionChange,
  maxSelection,
  className,
}: WechatGroupSelectorProps) {
  const [groups, setGroups] = useState<WechatGroup[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedGroups)
  const [loading, setLoading] = useState(true)

  // 模拟获取微信群列表
  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true)
      try {
        // 模拟API调用
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const mockGroups: WechatGroup[] = [
          {
            id: "1",
            name: "产品讨论群",
            memberCount: 128,
            description: "产品功能讨论和反馈",
            tags: ["工作", "产品"],
            isActive: true,
            lastMessageTime: "2024-01-20T10:30:00Z",
            ownerNickname: "产品经理",
          },
          {
            id: "2",
            name: "技术交流群",
            memberCount: 256,
            description: "技术问题讨论",
            tags: ["技术", "开发"],
            isActive: true,
            lastMessageTime: "2024-01-20T09:15:00Z",
            ownerNickname: "技术总监",
          },
          {
            id: "3",
            name: "客户服务群",
            memberCount: 89,
            tags: ["客服", "支持"],
            isActive: false,
            lastMessageTime: "2024-01-19T16:20:00Z",
            ownerNickname: "客服主管",
          },
          {
            id: "4",
            name: "营销推广群",
            memberCount: 167,
            description: "营销活动策划和执行",
            tags: ["营销", "推广"],
            isActive: true,
            lastMessageTime: "2024-01-20T11:45:00Z",
            ownerNickname: "营销总监",
          },
          {
            id: "5",
            name: "用户反馈群",
            memberCount: 203,
            description: "用户意见和建议收集",
            tags: ["用户", "反馈"],
            isActive: true,
            lastMessageTime: "2024-01-20T08:30:00Z",
            ownerNickname: "用户运营",
          },
        ]

        setGroups(mockGroups)
      } catch (error) {
        console.error("获取群列表失败:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchGroups()
  }, [])

  // 过滤群列表
  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
      group.ownerNickname.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // 处理群选择
  const handleGroupToggle = (groupId: string) => {
    let newSelectedIds: string[]

    if (selectedIds.includes(groupId)) {
      newSelectedIds = selectedIds.filter((id) => id !== groupId)
    } else {
      if (maxSelection && selectedIds.length >= maxSelection) {
        return // 达到最大选择数量
      }
      newSelectedIds = [...selectedIds, groupId]
    }

    setSelectedIds(newSelectedIds)
    onSelectionChange?.(newSelectedIds)
  }

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedIds.length === filteredGroups.length) {
      setSelectedIds([])
      onSelectionChange?.([])
    } else {
      const allIds = filteredGroups.slice(0, maxSelection || filteredGroups.length).map((g) => g.id)
      setSelectedIds(allIds)
      onSelectionChange?.(allIds)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>选择微信群</span>
          <Badge variant="secondary">
            已选择 {selectedIds.length}
            {maxSelection && ` / ${maxSelection}`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="搜索群名称、描述或标签..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={loading || filteredGroups.length === 0}
          >
            {selectedIds.length === filteredGroups.length ? "取消全选" : "全选"}
          </Button>
          <span className="text-sm text-gray-500">共 {filteredGroups.length} 个群</span>
        </div>

        {/* 群列表 */}
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">加载中...</p>
              </div>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">没有找到匹配的群</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleGroupToggle(group.id)}
                >
                  <Checkbox checked={selectedIds.includes(group.id)} onChange={() => handleGroupToggle(group.id)} />

                  <div className="flex-shrink-0">
                    {group.avatar ? (
                      <img src={group.avatar || "/placeholder.svg"} alt={group.name} className="w-10 h-10 rounded-lg" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                        <Users className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900 truncate">{group.name}</p>
                      {group.isActive && <div className="w-2 h-2 bg-green-400 rounded-full"></div>}
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>{group.memberCount} 人</span>
                      <span>•</span>
                      <span>群主: {group.ownerNickname}</span>
                    </div>

                    {group.description && <p className="text-sm text-gray-500 truncate mt-1">{group.description}</p>}

                    {group.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {group.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedIds.includes(group.id) && <Check className="h-5 w-5 text-blue-600" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
