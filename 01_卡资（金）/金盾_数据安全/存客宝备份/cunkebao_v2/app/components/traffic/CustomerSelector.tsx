"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Users } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TrafficUser, TrafficPoolGroup } from "@/types/traffic"

interface CustomerSelectorProps {
  currentGroupId: string
  availableGroups: TrafficPoolGroup[]
  onConfirm: (selectedUserIds: string[]) => void
  onCancel: () => void
}

// RFM评分徽章组件
const RfmBadge = ({ score }: { score: { total: number } }) => {
  let color = "bg-gray-100 text-gray-600"
  let text = "低价值"

  if (score.total >= 12) {
    color = "bg-red-100 text-red-600"
    text = "高价值"
  } else if (score.total >= 9) {
    color = "bg-blue-100 text-blue-600"
    text = "中高价值"
  } else if (score.total >= 6) {
    color = "bg-green-100 text-green-600"
    text = "中等价值"
  }

  return (
    <Badge className={`${color} text-xs font-medium`}>
      {text} {score.total.toFixed(1)}
    </Badge>
  )
}

export default function CustomerSelector({
  currentGroupId,
  availableGroups,
  onConfirm,
  onCancel,
}: CustomerSelectorProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [users, setUsers] = useState<TrafficUser[]>([])
  const [loading, setLoading] = useState(false)
  const [addSummary, setAddSummary] = useState<{
    total: number
    highValue: number
    potential: number
    avgRfm: number
  } | null>(null)

  // 模拟用户数据
  const generateMockUsers = (groupId: string): TrafficUser[] => {
    const allUsers: TrafficUser[] = [
      {
        id: "u1",
        avatar: "/placeholder-user.jpg",
        nickname: "张三",
        wechatId: "zhangsan123",
        phone: "13800138000",
        region: "北京",
        note: "高价值客户，多次复购",
        status: "added",
        addTime: "2024-01-15",
        source: "海报获客",
        assignedTo: "销售A",
        category: "customer",
        rfmScore: {
          recency: 4.5,
          frequency: 4.2,
          monetary: 4.8,
          total: 13.5,
        },
        groupIds: ["high-value"],
        tags: ["VIP", "活跃", "复购"],
        lastInteraction: "2024-01-20",
        totalSpent: 15680,
        interactionCount: 28,
      },
      {
        id: "u2",
        avatar: "/placeholder-user.jpg",
        nickname: "李四",
        wechatId: "lisi456",
        phone: "13900139000",
        region: "上海",
        note: "潜在客户，需要持续跟进",
        status: "added",
        addTime: "2024-01-16",
        source: "抖音获客",
        assignedTo: "销售B",
        category: "potential",
        rfmScore: {
          recency: 3.2,
          frequency: 2.8,
          monetary: 3.1,
          total: 9.1,
        },
        groupIds: ["potential"],
        tags: ["关注中", "待培育"],
        lastInteraction: "2024-01-19",
        totalSpent: 5200,
        interactionCount: 12,
      },
      {
        id: "u3",
        avatar: "/placeholder-user.jpg",
        nickname: "王五",
        wechatId: "wangwu789",
        phone: "13700137000",
        region: "深圳",
        note: "高互动客户，活跃度高",
        status: "added",
        addTime: "2024-01-17",
        source: "公众号获客",
        assignedTo: "销售C",
        category: "customer",
        rfmScore: {
          recency: 4.1,
          frequency: 4.5,
          monetary: 3.6,
          total: 12.2,
        },
        groupIds: ["high-interaction"],
        tags: ["活跃", "互动", "忠实"],
        lastInteraction: "2024-01-21",
        totalSpent: 8900,
        interactionCount: 35,
      },
      {
        id: "u4",
        avatar: "/placeholder-user.jpg",
        nickname: "赵六",
        wechatId: "zhaoliu321",
        phone: "13600136000",
        region: "广州",
        note: "新客户，刚添加",
        status: "added",
        addTime: "2024-01-22",
        source: "微信群获客",
        assignedTo: "销售D",
        category: "potential",
        rfmScore: {
          recency: 2.5,
          frequency: 2.0,
          monetary: 2.3,
          total: 6.8,
        },
        groupIds: ["uncategorized"],
        tags: ["新客户"],
        lastInteraction: "2024-01-22",
        totalSpent: 1200,
        interactionCount: 3,
      },
      {
        id: "u5",
        avatar: "/placeholder-user.jpg",
        nickname: "孙七",
        wechatId: "sunqi567",
        phone: "13500135000",
        region: "杭州",
        note: "活跃用户，经常互动",
        status: "added",
        addTime: "2024-01-18",
        source: "小红书获客",
        assignedTo: "销售E",
        category: "customer",
        rfmScore: {
          recency: 3.8,
          frequency: 4.0,
          monetary: 3.5,
          total: 11.3,
        },
        groupIds: ["high-interaction", "potential"],
        tags: ["活跃", "互动"],
        lastInteraction: "2024-01-21",
        totalSpent: 7200,
        interactionCount: 25,
      },
    ]

    // 过滤出属于指定分组但不属于当前分组的用户
    return allUsers.filter((u) => u.groupIds.includes(groupId) && !u.groupIds.includes(currentGroupId))
  }

  // 加载用户数据
  useEffect(() => {
    if (selectedGroupId) {
      setLoading(true)
      setTimeout(() => {
        const groupUsers = generateMockUsers(selectedGroupId)
        setUsers(groupUsers)
        setLoading(false)
      }, 300)
    } else {
      setUsers([])
    }
  }, [selectedGroupId])

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map((u) => u.id))
    } else {
      setSelectedUsers([])
    }
  }

  // 单个选择
  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId])
    } else {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId))
    }
  }

  // 确认选择
  const handleConfirm = () => {
    if (selectedUsers.length === 0) {
      return
    }

    // 计算添加成果统计
    const selectedUserData = filteredUsers.filter((u) => selectedUsers.includes(u.id))
    const highValueCount = selectedUserData.filter((u) => u.rfmScore && u.rfmScore.total >= 12).length
    const potentialCount = selectedUserData.filter(
      (u) => u.rfmScore && u.rfmScore.total >= 6 && u.rfmScore.total < 12,
    ).length
    const avgRfm = selectedUserData.reduce((sum, u) => sum + (u.rfmScore?.total || 0), 0) / selectedUserData.length

    setAddSummary({
      total: selectedUsers.length,
      highValue: highValueCount,
      potential: potentialCount,
      avgRfm: avgRfm,
    })

    onConfirm(selectedUsers)
  }

  // 过滤用户
  const filteredUsers = users.filter(
    (user) =>
      user.nickname.includes(searchQuery) || user.wechatId.includes(searchQuery) || user.phone.includes(searchQuery),
  )

  const selectedGroup = availableGroups.find((g) => g.id === selectedGroupId)

  return (
    <div className="flex flex-col h-full">
      {/* 顶部选择区域 */}
      <div className="p-4 border-b space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">选择来源分组</label>
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger>
              <SelectValue placeholder="请选择要添加客户的来源分组" />
            </SelectTrigger>
            <SelectContent>
              {availableGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  <div className="flex items-center gap-2">
                    <span>{group.name}</span>
                    <span className="text-xs text-gray-500">({group.userCount}人)</span>
                    {group.isUncategorized && (
                      <Badge variant="secondary" className="text-xs">
                        未分类
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedGroupId && (
          <>
            {/* 搜索栏 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索客户名称、微信号、手机号"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 批量选择栏 */}
            {selectedUsers.length > 0 && (
              <div className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium text-blue-700">已选 {selectedUsers.length} 个客户</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedUsers([])}>
                  清空
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 添加成果展示 */}
      {addSummary && (
        <div className="p-4 border-t bg-gradient-to-r from-blue-50 to-green-50">
          <div className="text-sm font-medium text-gray-900 mb-2">✨ 添加成果</div>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{addSummary.total}</div>
              <div className="text-xs text-gray-500">总计</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{addSummary.highValue}</div>
              <div className="text-xs text-gray-500">高价值</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{addSummary.potential}</div>
              <div className="text-xs text-gray-500">潜力客户</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{addSummary.avgRfm.toFixed(1)}</div>
              <div className="text-xs text-gray-500">平均RFM</div>
            </div>
          </div>
        </div>
      )}

      {/* 客户列表 */}
      <div className="flex-1 overflow-auto p-4">
        {!selectedGroupId ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Users className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm">请先选择来源分组</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Users className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-sm">该分组暂无可添加的客户</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <Card key={user.id} className={selectedUsers.includes(user.id) ? "border-blue-500 bg-blue-50" : ""}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* 选择框 */}
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => handleSelectUser(user.id, !!checked)}
                      className="mt-1"
                    />

                    {/* 头像 */}
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{user.nickname[0]}</AvatarFallback>
                    </Avatar>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{user.nickname}</span>
                        {user.rfmScore && <RfmBadge score={user.rfmScore} />}
                      </div>

                      <div className="text-xs text-gray-500 space-y-0.5">
                        <div className="font-mono">{user.wechatId}</div>
                        <div className="flex items-center gap-2">
                          <span>{user.phone}</span>
                          <span>·</span>
                          <span>{user.region}</span>
                        </div>
                      </div>

                      {/* 标签 */}
                      {user.tags && user.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="p-4 border-t bg-white flex items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          {selectedUsers.length > 0 ? (
            <span>
              已选择 <span className="font-medium text-blue-600">{selectedUsers.length}</span> 个客户
            </span>
          ) : (
            <span>请选择要添加的客户</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={selectedUsers.length === 0}>
            确认添加
          </Button>
        </div>
      </div>
    </div>
  )
}
