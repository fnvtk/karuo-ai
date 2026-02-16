"use client"

import { useState } from "react"
import {
  ChevronLeft,
  Plus,
  Filter,
  Search,
  RefreshCw,
  MoreVertical,
  Clock,
  Edit,
  Trash2,
  Eye,
  Copy,
  ChevronDown,
  ChevronUp,
  Settings,
  Calendar,
  Users,
  ThumbsUp,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"

interface LikeTask {
  id: string
  name: string
  status: "running" | "paused"
  deviceCount: number
  targetGroup: string
  likeCount: number
  lastLikeTime: string
  createTime: string
  creator: string
  likeInterval: number
  maxLikesPerDay: number
  timeRange: { start: string; end: string }
  contentTypes: string[]
  targetTags: string[]
}

export default function AutoLikePage() {
  const router = useRouter()
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<LikeTask[]>([
    {
      id: "1",
      name: "高频互动点赞",
      deviceCount: 2,
      targetGroup: "高频互动好友",
      likeCount: 156,
      lastLikeTime: "2025-02-06 13:12:35",
      createTime: "2024-11-20 19:04:14",
      creator: "admin",
      status: "running",
      likeInterval: 5,
      maxLikesPerDay: 200,
      timeRange: { start: "08:00", end: "22:00" },
      contentTypes: ["text", "image", "video"],
      targetTags: ["高频互动", "高意向", "男性"],
    },
    {
      id: "2",
      name: "潜在客户点赞",
      deviceCount: 1,
      targetGroup: "潜在客户",
      likeCount: 89,
      lastLikeTime: "2024-03-04 14:09:35",
      createTime: "2024-03-04 14:29:04",
      creator: "manager",
      status: "paused",
      likeInterval: 10,
      maxLikesPerDay: 150,
      timeRange: { start: "09:00", end: "21:00" },
      contentTypes: ["image", "video"],
      targetTags: ["潜在客户", "中意向", "女性"],
    },
  ])

  const toggleExpand = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId)
  }

  const handleDelete = (taskId: string) => {
    setTasks(tasks.filter((task) => task.id !== taskId))
    toast({
      title: "删除成功",
      description: "已成功删除点赞任务",
    })
  }

  const handleEdit = (taskId: string) => {
    router.push(`/workspace/auto-like/${taskId}/edit`)
  }

  const handleView = (taskId: string) => {
    router.push(`/workspace/auto-like/${taskId}`)
  }

  const handleCopy = (taskId: string) => {
    const taskToCopy = tasks.find((task) => task.id === taskId)
    if (taskToCopy) {
      const newTask = {
        ...taskToCopy,
        id: `${Date.now()}`,
        name: `${taskToCopy.name} (复制)`,
        createTime: new Date().toISOString().replace("T", " ").substring(0, 19),
      }
      setTasks([...tasks, newTask])
      toast({
        title: "复制成功",
        description: "已成功复制点赞任务",
      })
    }
  }

  const toggleTaskStatus = (taskId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, status: task.status === "running" ? "paused" : "running" } : task,
      ),
    )
    const task = tasks.find((t) => t.id === taskId)
    if (task) {
      toast({
        title: task.status === "running" ? "已暂停" : "已启动",
        description: `${task.name}任务${task.status === "running" ? "已暂停" : "已启动"}`,
      })
    }
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen pb-20">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium">自动点赞</h1>
          </div>
          <Link href="/workspace/auto-like/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新建任务
            </Button>
          </Link>
        </div>
      </header>

      <div className="p-4">
        <Card className="p-4 mb-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="搜索任务名称" className="pl-9" />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium">{task.name}</h3>
                  <Badge variant={task.status === "running" ? "success" : "secondary"}>
                    {task.status === "running" ? "进行中" : "已暂停"}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch checked={task.status === "running"} onCheckedChange={() => toggleTaskStatus(task.id)} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(task.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        查看
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(task.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopy(task.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        复制
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(task.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-sm text-gray-500">
                  <div>执行设备：{task.deviceCount} 个</div>
                  <div>目标人群：{task.targetGroup}</div>
                </div>
                <div className="text-sm text-gray-500">
                  <div>已点赞：{task.likeCount} 次</div>
                  <div>创建人：{task.creator}</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-4">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  上次点赞：{task.lastLikeTime}
                </div>
                <div className="flex items-center">
                  <span>创建时间：{task.createTime}</span>
                  <Button variant="ghost" size="sm" className="ml-2 p-0 h-6 w-6" onClick={() => toggleExpand(task.id)}>
                    {expandedTaskId === task.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {expandedTaskId === task.id && (
                <div className="mt-4 pt-4 border-t border-dashed">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <Settings className="h-5 w-5 mr-2 text-gray-500" />
                        <h4 className="font-medium">基本设置</h4>
                      </div>
                      <div className="space-y-2 pl-7">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">点赞间隔：</span>
                          <span>{task.likeInterval} 秒</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">每日最大点赞数：</span>
                          <span>{task.maxLikesPerDay} 次</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">执行时间段：</span>
                          <span>
                            {task.timeRange.start} - {task.timeRange.end}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center">
                        <Users className="h-5 w-5 mr-2 text-gray-500" />
                        <h4 className="font-medium">目标人群</h4>
                      </div>
                      <div className="space-y-2 pl-7">
                        <div className="flex flex-wrap gap-2">
                          {task.targetTags.map((tag) => (
                            <Badge key={tag} variant="outline" className="bg-gray-50">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center">
                        <ThumbsUp className="h-5 w-5 mr-2 text-gray-500" />
                        <h4 className="font-medium">点赞内容类型</h4>
                      </div>
                      <div className="space-y-2 pl-7">
                        <div className="flex flex-wrap gap-2">
                          {task.contentTypes.map((type) => (
                            <Badge key={type} variant="outline" className="bg-gray-50">
                              {type === "text" ? "文字" : type === "image" ? "图片" : "视频"}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-gray-500" />
                        <h4 className="font-medium">执行进度</h4>
                      </div>
                      <div className="space-y-2 pl-7">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-500">今日已点赞：</span>
                          <span>
                            {task.likeCount} / {task.maxLikesPerDay}
                          </span>
                        </div>
                        <Progress
                          value={(task.likeCount / task.maxLikesPerDay) * 100}
                          className="h-2"
                          indicatorClassName="bg-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
