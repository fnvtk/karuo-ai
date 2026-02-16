"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import CustomerSelector from "@/app/components/traffic/CustomerSelector"
import GroupAnalyticsDialog from "@/app/components/traffic/GroupAnalyticsDialog"
import AdvancedFilter from "@/app/components/traffic/AdvancedFilter"
import FilterSchemeManager from "@/app/components/traffic/FilterSchemeManager"
import {
  ChevronLeft,
  Search,
  UserPlus,
  MoreVertical,
  ArrowRightLeft,
  Trash2,
  Users,
  Filter,
  AlertCircle,
  TrendingUp,
  Edit,
  Tag,
  Bookmark,
  X,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { TrafficUser, TrafficPoolGroup } from "@/types/traffic"
import type { FilterCondition } from "@/types/filter"

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

function TrafficPoolContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const groupId = searchParams.get("groupId") || "uncategorized"

  // 状态管理
  const [loading, setLoading] = useState(true)
  const [currentGroup, setCurrentGroup] = useState<TrafficPoolGroup | null>(null)
  const [users, setUsers] = useState<TrafficUser[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showCustomerSelector, setShowCustomerSelector] = useState(false)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteType, setDeleteType] = useState<"current" | "all">("current")
  const [deleteUserId, setDeleteUserId] = useState<string>("")
  const [targetGroupId, setTargetGroupId] = useState("")
  const [availableGroups, setAvailableGroups] = useState<TrafficPoolGroup[]>([])
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false)
  const [filterConditions, setFilterConditions] = useState<FilterCondition>({})
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [showSchemeManager, setShowSchemeManager] = useState(false)

  // 可用标签和地区（示例数据）
  const availableTags = ["VIP", "活跃", "复购", "关注中", "待培育", "新客户", "互动", "忠实"]
  const availableRegions = ["北京", "上海", "深圳", "广州", "杭州", "成都", "武汉", "南京"]

  // 模拟用户数据
  const generateMockUsers = (groupId: string): TrafficUser[] => {
    const baseUsers: TrafficUser[] = [
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
    ]

    return baseUsers.filter((u) => u.groupIds.includes(groupId))
  }

  // 加载数据
  useEffect(() => {
    loadGroupData()
  }, [groupId])

  const loadGroupData = async () => {
    setLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      // 加载所有分组
      const savedCustomGroups = localStorage.getItem("customTrafficPoolGroups")
      const customGroups: TrafficPoolGroup[] = savedCustomGroups ? JSON.parse(savedCustomGroups) : []

      const allGroups: TrafficPoolGroup[] = [
        ...customGroups,
        {
          id: "high-value",
          name: "高价值客户池",
          description: "RFM评分高，消费能力强",
          userCount: 156,
          iconType: "users",
          color: "from-red-500 to-pink-500",
          isDefault: true,
          createdAt: new Date().toISOString(),
          avgRfmScore: { recency: 4.5, frequency: 4.2, monetary: 4.8, total: 13.5 },
        },
        {
          id: "potential",
          name: "潜在客户池",
          description: "有转化潜力的客户",
          userCount: 287,
          iconType: "trending",
          color: "from-blue-500 to-cyan-500",
          isDefault: true,
          createdAt: new Date().toISOString(),
          avgRfmScore: { recency: 3.2, frequency: 2.8, monetary: 3.1, total: 9.1 },
        },
        {
          id: "high-interaction",
          name: "高互动客户池",
          description: "互动频繁的客户",
          userCount: 324,
          iconType: "message",
          color: "from-green-500 to-emerald-500",
          isDefault: true,
          createdAt: new Date().toISOString(),
          avgRfmScore: { recency: 4.1, frequency: 4.5, monetary: 3.6, total: 12.2 },
        },
        {
          id: "uncategorized",
          name: "未分类",
          description: "未被划分的客户将自动归入此处",
          userCount: 33,
          iconType: "folder",
          color: "from-gray-400 to-gray-500",
          isDefault: true,
          isUncategorized: true,
          createdAt: new Date().toISOString(),
          avgRfmScore: { recency: 2.8, frequency: 2.5, monetary: 2.6, total: 7.9 },
        },
      ]

      const group = allGroups.find((g) => g.id === groupId)
      setCurrentGroup(group || null)

      // 加载该分组的用户
      const groupUsers = generateMockUsers(groupId)
      setUsers(groupUsers)

      // 设置可选的目标分组（排除当前分组和未分类分组）
      const movableGroups = allGroups.filter((g) => g.id !== groupId && !g.isUncategorized)
      setAvailableGroups(movableGroups)
    } catch (error) {
      console.error("加载失败:", error)
      toast({
        title: "加载失败",
        description: "无法加载分组数据",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map((u) => u.id))
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

  // 移动客户到其他分组
  const handleMoveUsers = () => {
    if (!targetGroupId) {
      toast({
        title: "请选择目标分组",
        variant: "destructive",
      })
      return
    }

    const targetGroup = availableGroups.find((g) => g.id === targetGroupId)
    const count = selectedUsers.length

    toast({
      title: "迁移成功",
      description: `已将 ${count} 个客户迁移到"${targetGroup?.name}"`,
    })

    setSelectedUsers([])
    setShowMoveDialog(false)
    setTargetGroupId("")
    loadGroupData()
  }

  // 批量迁移
  const handleBatchMove = () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "请选择客户",
        description: "请至少选择一个客户进行迁移",
        variant: "destructive",
      })
      return
    }
    setShowMoveDialog(true)
  }

  // 处理客户添加
  const handleAddCustomers = (selectedUserIds: string[]) => {
    const count = selectedUserIds.length

    // 计算添加的客户类型统计
    toast({
      title: "✨ 添加成功",
      description: `已将 ${count} 个客户添加到"${currentGroup?.name}"分组`,
      duration: 3000,
    })

    setShowCustomerSelector(false)
    loadGroupData()
  }

  // 点击客户卡片跳转详情
  const handleCustomerClick = (userId: string) => {
    router.push(`/customers/${userId}`)
  }

  // 显示删除确认对话框
  const showDeleteDialog = (userId: string, type: "current" | "all") => {
    setDeleteUserId(userId)
    setDeleteType(type)
    setShowDeleteConfirm(true)
  }

  // 确认删除
  const confirmDelete = () => {
    const user = users.find((u) => u.id === deleteUserId)
    if (!user) return

    if (deleteType === "current") {
      toast({
        title: "移除成功",
        description: `已将"${user.nickname}"从当前分组移除，归入"未分类"`,
      })
    } else {
      toast({
        title: "删除成功",
        description: `已将"${user.nickname}"从所有分组删除，归入"未分类"分组`,
      })
    }

    setShowDeleteConfirm(false)
    setDeleteUserId("")
    loadGroupData()
  }

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "请选择客户",
        description: "请至少选择一个客户进行删除",
        variant: "destructive",
      })
      return
    }

    const count = selectedUsers.length
    toast({
      title: "批量移除成功",
      description: `已将 ${count} 个客户从当前分组移除，归入"未分类"分组`,
    })

    setSelectedUsers([])
    loadGroupData()
  }

  // 应用筛选条件
  const filteredUsers = users.filter((user) => {
    // 基础搜索
    if (searchQuery) {
      const matchBasic =
        user.nickname.includes(searchQuery) || user.wechatId.includes(searchQuery) || user.phone.includes(searchQuery)
      if (!matchBasic) return false
    }

    // 高级筛选条件
    if (filterConditions.nickname && !user.nickname.includes(filterConditions.nickname)) {
      return false
    }

    if (filterConditions.wechatId && !user.wechatId.includes(filterConditions.wechatId)) {
      return false
    }

    if (filterConditions.phone && !user.phone.includes(filterConditions.phone)) {
      return false
    }

    if (filterConditions.tags && filterConditions.tags.length > 0) {
      const hasMatchingTag = filterConditions.tags.some((tag) => user.tags?.includes(tag))
      if (!hasMatchingTag) return false
    }

    if (filterConditions.rfmMin !== undefined && user.rfmScore) {
      if (user.rfmScore.total < filterConditions.rfmMin) return false
    }

    if (filterConditions.rfmMax !== undefined && user.rfmScore) {
      if (user.rfmScore.total > filterConditions.rfmMax) return false
    }

    if (filterConditions.regions && filterConditions.regions.length > 0) {
      if (!filterConditions.regions.includes(user.region)) return false
    }

    if (filterConditions.category && user.category !== filterConditions.category) {
      return false
    }

    return true
  })

  const isUncategorizedGroup = currentGroup?.isUncategorized

  // 计算活跃的筛选条件数量
  const activeFilterCount = Object.keys(filterConditions).length

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-10 bg-white border-b">
        {/* 第一行：返回按钮 + 标题 */}
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="flex-shrink-0">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h1 className="text-lg font-semibold truncate">{currentGroup?.name}</h1>
                  {isUncategorizedGroup && (
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      系统自动
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{currentGroup?.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 第二行：操作按钮区域 */}
        {!isUncategorizedGroup && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAnalyticsDialog(true)}
                className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
              >
                <TrendingUp className="h-4 w-4 mr-1.5" />
                <span className="text-sm">数据分析</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCustomerSelector(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4 mr-1.5" />
                <span className="text-sm">添加客户</span>
              </Button>
            </div>
          </div>
        )}

        {/* 第三行：搜索栏 */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索客户名称、微信号、手机号"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </div>

        {/* 第四行：筛选操作按钮 */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilter(true)}
              className="flex-1 h-9 relative"
            >
              <Filter className="h-4 w-4 mr-1.5" />
              <span className="text-sm">高级筛选</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs h-5 min-w-[20px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSchemeManager(true)} className="flex-1 h-9">
              <Bookmark className="h-4 w-4 mr-1.5" />
              <span className="text-sm">筛选方案</span>
            </Button>
          </div>
        </div>

        {/* 已应用的筛选条件展示 */}
        {activeFilterCount > 0 && (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              {filterConditions.nickname && (
                <Badge variant="secondary" className="text-xs h-6 px-2">
                  名称: {filterConditions.nickname}
                  <X
                    className="h-3 w-3 ml-1.5 cursor-pointer hover:text-gray-700"
                    onClick={() => setFilterConditions((prev) => ({ ...prev, nickname: undefined }))}
                  />
                </Badge>
              )}
              {filterConditions.wechatId && (
                <Badge variant="secondary" className="text-xs h-6 px-2">
                  微信号: {filterConditions.wechatId}
                  <X
                    className="h-3 w-3 ml-1.5 cursor-pointer hover:text-gray-700"
                    onClick={() => setFilterConditions((prev) => ({ ...prev, wechatId: undefined }))}
                  />
                </Badge>
              )}
              {filterConditions.phone && (
                <Badge variant="secondary" className="text-xs h-6 px-2">
                  手机: {filterConditions.phone}
                  <X
                    className="h-3 w-3 ml-1.5 cursor-pointer hover:text-gray-700"
                    onClick={() => setFilterConditions((prev) => ({ ...prev, phone: undefined }))}
                  />
                </Badge>
              )}
              {filterConditions.tags && filterConditions.tags.length > 0 && (
                <Badge variant="secondary" className="text-xs h-6 px-2">
                  标签: {filterConditions.tags.length}个
                  <X
                    className="h-3 w-3 ml-1.5 cursor-pointer hover:text-gray-700"
                    onClick={() => setFilterConditions((prev) => ({ ...prev, tags: undefined }))}
                  />
                </Badge>
              )}
              {filterConditions.rfmMin !== undefined && (
                <Badge variant="secondary" className="text-xs h-6 px-2">
                  RFM: {filterConditions.rfmMin}-{filterConditions.rfmMax || 15}
                  <X
                    className="h-3 w-3 ml-1.5 cursor-pointer hover:text-gray-700"
                    onClick={() => setFilterConditions((prev) => ({ ...prev, rfmMin: undefined, rfmMax: undefined }))}
                  />
                </Badge>
              )}
              {filterConditions.regions && filterConditions.regions.length > 0 && (
                <Badge variant="secondary" className="text-xs h-6 px-2">
                  地区: {filterConditions.regions.length}个
                  <X
                    className="h-3 w-3 ml-1.5 cursor-pointer hover:text-gray-700"
                    onClick={() => setFilterConditions((prev) => ({ ...prev, regions: undefined }))}
                  />
                </Badge>
              )}
              {filterConditions.category && (
                <Badge variant="secondary" className="text-xs h-6 px-2">
                  类别: {filterConditions.category === "customer" ? "正式客户" : "潜在客户"}
                  <X
                    className="h-3 w-3 ml-1.5 cursor-pointer hover:text-gray-700"
                    onClick={() => setFilterConditions((prev) => ({ ...prev, category: undefined }))}
                  />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterConditions({})}
                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100"
              >
                清除全部
              </Button>
            </div>
          </div>
        )}

        {/* 批量操作栏 */}
        {selectedUsers.length > 0 && (
          <div className="px-4 py-3 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium text-gray-900">已选 {selectedUsers.length} 个客户</span>
            </div>
            <div className="flex items-center gap-2">
              {!isUncategorizedGroup && (
                <Button size="sm" variant="outline" onClick={handleBatchMove} className="h-8 bg-transparent">
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs">迁移</span>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleBatchDelete}
                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">移除</span>
              </Button>
            </div>
          </div>
        )}

        {/* 统计信息栏 */}
        <div className="px-4 py-3 bg-gray-50 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-gray-600">共</span>
                <span className="font-semibold text-gray-900">{filteredUsers.length}</span>
                <span className="text-gray-600">个客户</span>
              </div>
              {currentGroup?.avgRfmScore && currentGroup.avgRfmScore.total > 0 && (
                <>
                  <div className="h-3 w-px bg-gray-300" />
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600">平均RFM</span>
                    <span className="font-semibold text-blue-600">{currentGroup.avgRfmScore.total.toFixed(1)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 未分类分组提示 */}
        {isUncategorizedGroup && (
          <div className="px-4 pb-3">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800 leading-relaxed">
                &ldquo;未分类&rdquo;分组自动承接未被分配的客户，不支持手动添加。您可以将客户迁移到其他分组进行管理。
              </AlertDescription>
            </Alert>
          </div>
        )}
      </header>

      {/* 客户列表 */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-300 mb-4" />
            <div className="text-gray-500 mb-2">暂无客户</div>
            {!isUncategorizedGroup && (
              <Button variant="outline" size="sm" onClick={() => setShowCustomerSelector(true)}>
                <UserPlus className="h-4 w-4 mr-1" />
                添加客户
              </Button>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3 pb-20">
            {filteredUsers.map((user) => (
              <Card
                key={user.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleCustomerClick(user.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* 选择框 */}
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => handleSelectUser(user.id, !!checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />

                    {/* 头像 */}
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{user.nickname[0]}</AvatarFallback>
                    </Avatar>

                    {/* 核心信息 */}
                    <div className="flex-1 min-w-0">
                      {/* 第一行：姓名 + RFM */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-medium text-base truncate">{user.nickname}</span>
                        {user.rfmScore && <RfmBadge score={user.rfmScore} />}
                      </div>

                      {/* 第二行：微信号 */}
                      <div className="text-sm text-gray-600 mb-1">
                        <span className="font-mono">{user.wechatId}</span>
                      </div>

                      {/* 第三行：电话 + 地址 */}
                      <div className="text-xs text-gray-500 mb-1.5">
                        <span>{user.phone}</span>
                        <span className="mx-1">·</span>
                        <span>{user.region}</span>
                      </div>

                      {/* 标签 */}
                      {user.tags && user.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {user.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 更多操作按钮 */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0"
                        >
                          <MoreVertical className="h-4 w-4 mr-1" />
                          <span className="text-xs">更多</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => console.log("编辑信息", user.id)}>
                          <Edit className="h-4 w-4 mr-2" />
                          编辑客户信息
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => console.log("编辑标签", user.id)}>
                          <Tag className="h-4 w-4 mr-2" />
                          编辑客户标签
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {!isUncategorizedGroup && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUsers([user.id])
                              setShowMoveDialog(true)
                            }}
                          >
                            <ArrowRightLeft className="h-4 w-4 mr-2" />
                            迁移至其他分组
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => showDeleteDialog(user.id, "current")}
                          className="text-orange-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          从当前分组移除
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => showDeleteDialog(user.id, "all")} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          从所有分组移除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 添加客户选择器 */}
      <Dialog open={showCustomerSelector} onOpenChange={setShowCustomerSelector}>
        <DialogContent className="w-[95%] max-w-2xl h-[80vh] p-0">
          <CustomerSelector
            currentGroupId={groupId}
            availableGroups={availableGroups}
            onConfirm={handleAddCustomers}
            onCancel={() => setShowCustomerSelector(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 迁移客户对话框 */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="w-[90%] max-w-md">
          <DialogHeader>
            <DialogTitle>迁移客户</DialogTitle>
            <DialogDescription>
              将 {selectedUsers.length} 个客户从"{currentGroup?.name}"迁移到其他分组
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>目标分组</Label>
              <Select value={targetGroupId} onValueChange={setTargetGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择目标分组" />
                </SelectTrigger>
                <SelectContent>
                  {availableGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <span>{group.name}</span>
                        {group.isDefault && !group.isUncategorized && (
                          <Badge variant="secondary" className="text-xs">
                            默认
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                客户将从当前分组移动到目标分组。如需保留在当前分组,请使用"添加到分组"功能。
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              取消
            </Button>
            <Button onClick={handleMoveUsers} disabled={!targetGroupId}>
              确认迁移
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="w-[90%] max-w-md">
          <DialogHeader>
            <DialogTitle>{deleteType === "current" ? "从当前分组移除" : "从所有分组删除"}</DialogTitle>
            <DialogDescription>
              {deleteType === "current"
                ? `确认将客户从"${currentGroup?.name}"移除吗？移除后客户将归入"未分类"分组。`
                : '确认将客户从所有分组删除吗？删除后客户将归入"未分类"分组。'}
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {deleteType === "current"
                ? "客户将仅从当前分组移除，其在其他分组的归属不受影响"
                : "客户将从所有已分配的分组中移除"}
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              确认{deleteType === "current" ? "移除" : "删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 数据分析对话框 */}
      {currentGroup && (
        <GroupAnalyticsDialog
          open={showAnalyticsDialog}
          onOpenChange={setShowAnalyticsDialog}
          group={currentGroup}
          users={users}
        />
      )}

      {/* 高级筛选对话框 */}
      <AdvancedFilter
        open={showAdvancedFilter}
        onOpenChange={setShowAdvancedFilter}
        onApplyFilter={setFilterConditions}
        currentConditions={filterConditions}
        availableTags={availableTags}
        availableRegions={availableRegions}
      />

      {/* 筛选方案管理对话框 */}
      <FilterSchemeManager
        open={showSchemeManager}
        onOpenChange={setShowSchemeManager}
        onApplyScheme={(conditions) => {
          setFilterConditions(conditions)
          setShowSchemeManager(false)
        }}
      />
    </div>
  )
}

export default function TrafficPoolPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-gray-500">加载中...</div>
        </div>
      }
    >
      <TrafficPoolContent />
    </Suspense>
  )
}
