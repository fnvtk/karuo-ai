"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ChevronLeft,
  Plus,
  Users,
  TrendingUp,
  MessageCircle,
  ChevronRight,
  Folder,
  MoreVertical,
  Trash2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import type { TrafficPoolGroup } from "@/types/traffic"

// 图标渲染组件
const GroupIcon = ({ type, className = "h-8 w-8" }: { type: string; className?: string }) => {
  switch (type) {
    case "users":
      return <Users className={className} />
    case "trending":
      return <TrendingUp className={className} />
    case "message":
      return <MessageCircle className={className} />
    case "folder":
      return <Folder className={className} />
    default:
      return <Users className={className} />
  }
}

// RFM评分展示组件
const RfmScoreDisplay = ({
  score,
}: {
  score?: { recency: number; frequency: number; monetary: number; total: number }
}) => {
  if (!score || score.total === 0) {
    return (
      <div className="text-xs text-gray-400">
        <span>暂无RFM数据</span>
      </div>
    )
  }

  // 根据总分决定颜色
  let scoreColor = "text-gray-600"
  if (score.total >= 12) scoreColor = "text-red-600"
  else if (score.total >= 9) scoreColor = "text-blue-600"
  else if (score.total >= 6) scoreColor = "text-green-600"

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1">
        <span className="text-gray-500">RFM:</span>
        <span className={`font-bold ${scoreColor}`}>{score.total.toFixed(1)}</span>
      </div>
      <div className="h-3 w-px bg-gray-300" />
      <div className="flex gap-1.5 text-gray-500">
        <span>R:{score.recency.toFixed(1)}</span>
        <span>F:{score.frequency.toFixed(1)}</span>
        <span>M:{score.monetary.toFixed(1)}</span>
      </div>
    </div>
  )
}

export default function TrafficPoolGroupsPage() {
  const router = useRouter()
  const { toast } = useToast()

  // 状态管理
  const [groups, setGroups] = useState<TrafficPoolGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteGroupId, setDeleteGroupId] = useState<string>("")
  const [showCreateDialog, setShowCreateDialog] = useState(false) // Declare the variable here

  // "未分类"默认分组
  const uncategorizedGroup: TrafficPoolGroup = {
    id: "uncategorized",
    name: "未分类",
    description: "未被划分至任何自定义分组的客户将自动归入此处",
    userCount: 33,
    iconType: "folder",
    color: "from-gray-400 to-gray-500",
    isDefault: true,
    isUncategorized: true,
    createdAt: new Date().toISOString(),
    avgRfmScore: {
      recency: 2.8,
      frequency: 2.5,
      monetary: 2.6,
      total: 7.9,
    },
  }

  // 三大默认分组数据
  const defaultGroups: TrafficPoolGroup[] = [
    {
      id: "high-value",
      name: "高价值客户池",
      description: "RFM评分高，消费能力强，优先跟进的核心客户",
      userCount: 156,
      iconType: "users",
      color: "from-red-500 to-pink-500",
      isDefault: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      avgRfmScore: {
        recency: 4.5,
        frequency: 4.2,
        monetary: 4.8,
        total: 13.5,
      },
    },
    {
      id: "potential",
      name: "潜在客户池",
      description: "有转化潜力，需要持续培育和跟进的客户",
      userCount: 287,
      iconType: "trending",
      color: "from-blue-500 to-cyan-500",
      isDefault: true,
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      avgRfmScore: {
        recency: 3.2,
        frequency: 2.8,
        monetary: 3.1,
        total: 9.1,
      },
    },
    {
      id: "high-interaction",
      name: "高互动客户池",
      description: "互动频繁，活跃度高，关系维护良好的客户",
      userCount: 324,
      iconType: "message",
      color: "from-green-500 to-emerald-500",
      isDefault: true,
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      avgRfmScore: {
        recency: 4.1,
        frequency: 4.5,
        monetary: 3.6,
        total: 12.2,
      },
    },
  ]

  // 加载分组数据
  useEffect(() => {
    loadGroups()
  }, [])

  const loadGroups = async () => {
    setLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      // 从localStorage加载自定义分组
      const savedCustomGroups = localStorage.getItem("customTrafficPoolGroups")
      const customGroups: TrafficPoolGroup[] = savedCustomGroups ? JSON.parse(savedCustomGroups) : []

      // 计算未分类分组的人数（所有用户总数 - 已分配的用户数）
      const totalUsersInGroups = [...defaultGroups, ...customGroups].reduce((sum, g) => sum + g.userCount, 0)
      const totalUsers = 800 // 假设总用户数
      uncategorizedGroup.userCount = Math.max(0, totalUsers - totalUsersInGroups)

      // 合并所有分组：自定义分组 + 默认分组 + 未分类
      const allGroups = [...customGroups, ...defaultGroups, uncategorizedGroup]
      setGroups(allGroups)
    } catch (error) {
      console.error("加载分组失败:", error)
      toast({
        title: "加载失败",
        description: "无法加载流量池分组",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 创建新分组
  const handleCreateGroup = () => {
    router.push("/profile/traffic-pool/new")
  }

  // 显示删除确认对话框
  const showDeleteConfirm = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId)
    if (group?.isDefault) {
      toast({
        title: "无法删除",
        description: "默认分组和系统分组不能删除",
        variant: "destructive",
      })
      return
    }
    setDeleteGroupId(groupId)
    setShowDeleteDialog(true)
  }

  // 确认删除分组
  const confirmDeleteGroup = () => {
    const group = groups.find((g) => g.id === deleteGroupId)
    if (!group) return

    // 获取现有自定义分组
    const savedCustomGroups = localStorage.getItem("customTrafficPoolGroups")
    const customGroups: TrafficPoolGroup[] = savedCustomGroups ? JSON.parse(savedCustomGroups) : []

    // 删除指定分组
    const updatedCustomGroups = customGroups.filter((g) => g.id !== deleteGroupId)

    // 保存到localStorage
    localStorage.setItem("customTrafficPoolGroups", JSON.stringify(updatedCustomGroups))

    // 更新页面显示
    loadGroups()

    toast({
      title: "删除成功",
      description: `已删除分组"${group.name}"，其中的客户已自动归入"未分类"`,
    })

    setShowDeleteDialog(false)
    setDeleteGroupId("")
  }

  // 进入分组详情
  const handleEnterGroup = (group: TrafficPoolGroup) => {
    router.push(`/traffic-pool?groupId=${group.id}`)
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "今天创建"
    if (diffDays === 1) return "昨天创建"
    if (diffDays < 7) return `${diffDays}天前创建`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前创建`
    return `${Math.floor(diffDays / 30)}个月前创建`
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-medium">流量池</h1>
              <p className="text-xs text-gray-500">选择分组进入管理</p>
            </div>
          </div>
          <Button onClick={handleCreateGroup} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-1" />
            新建分组
          </Button>
        </div>
      </header>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-auto p-4 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 分组列表 */}
            {groups.map((group, index) => {
              // 判断显示哪个分隔符
              const showDefaultHeader = group.isDefault && !group.isUncategorized && index === 0
              const showCustomHeader =
                !group.isDefault && (index === 0 || groups[index - 1]?.isDefault || groups[index - 1]?.isUncategorized)
              const showUncategorizedHeader =
                group.isUncategorized && (index === 0 || !groups[index - 1]?.isUncategorized)

              return (
                <div key={group.id}>
                  {/* 默认分组分隔符 */}
                  {showDefaultHeader && (
                    <div className="px-1 py-2 mb-2">
                      <div className="text-sm font-medium text-gray-900">默认分组</div>
                    </div>
                  )}

                  {/* 自定义分组分隔符 */}
                  {showCustomHeader && (
                    <div className="px-1 py-2 mb-2">
                      <div className="text-sm font-medium text-gray-900">自定义分组</div>
                    </div>
                  )}

                  {/* 未分类分组分隔符 */}
                  {showUncategorizedHeader && (
                    <div className="px-1 py-2 mb-2">
                      <div className="text-sm font-medium text-gray-900">系统分组</div>
                    </div>
                  )}

                  {/* 分组卡片 */}
                  <Card className="cursor-pointer hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        {/* 图标区域 */}
                        <div
                          className={`flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br ${group.color} flex items-center justify-center text-white shadow-lg`}
                          onClick={() => handleEnterGroup(group)}
                        >
                          <GroupIcon type={group.iconType} className="h-8 w-8" />
                        </div>

                        {/* 信息区域 */}
                        <div className="flex-1 min-w-0" onClick={() => handleEnterGroup(group)}>
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-lg font-medium truncate">{group.name}</h3>
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-1 mb-2">{group.description}</p>

                          {/* 人数和RFM评分 */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center">
                                <Users className="h-4 w-4 text-blue-500 mr-1" />
                                <span className="text-sm font-medium text-blue-600">{group.userCount}</span>
                                <span className="text-xs text-gray-500 ml-1">人</span>
                              </div>
                              {!group.isDefault && !group.isUncategorized && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                  自定义
                                </span>
                              )}
                              {group.isUncategorized && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                  系统自动
                                </span>
                              )}
                            </div>

                            {/* RFM平均评分 */}
                            <RfmScoreDisplay score={group.avgRfmScore} />
                          </div>

                          {/* 创建时间 */}
                          {!group.isUncategorized && (
                            <div className="text-xs text-gray-400 mt-1">{formatDate(group.createdAt)}</div>
                          )}
                        </div>

                        {/* 操作菜单 */}
                        <div className="flex items-center gap-2">
                          <ChevronRight
                            className="h-5 w-5 text-gray-400 flex-shrink-0"
                            onClick={() => handleEnterGroup(group)}
                          />
                          {!group.isDefault && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEnterGroup(group)}>查看详情</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => showDeleteConfirm(group.id)} className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  删除分组
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}

            {/* 空状态 */}
            {groups.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <div className="text-gray-500 mb-4">暂无流量池分组</div>
                <Button onClick={() => setShowCreateDialog(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  创建第一个分组
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 删除分组确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="w-[90%] max-w-md">
          <DialogHeader>
            <DialogTitle>删除分组</DialogTitle>
            <DialogDescription>
              确认删除分组&ldquo;{groups.find((g) => g.id === deleteGroupId)?.name}&rdquo;吗？
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertDescription className="text-xs">
              <div className="space-y-1">
                <div>• 分组删除后无法恢复</div>
                <div>• 分组中的所有客户将自动归入&ldquo;未分类&rdquo;分组</div>
                <div>• 客户本身的数据不会丢失</div>
              </div>
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDeleteGroup}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
