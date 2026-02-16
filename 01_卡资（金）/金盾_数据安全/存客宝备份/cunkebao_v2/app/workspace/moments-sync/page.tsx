"use client"

import { useState } from "react"
import { ChevronLeft, Plus, Filter, Search, RefreshCw, MoreVertical, Clock, Edit, Trash2, Eye } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"

interface SyncTask {
  id: string
  name: string
  status: "running" | "paused"
  deviceCount: number
  contentLib: string
  syncCount: number
  lastSyncTime: string
  createTime: string
  creator: string
}

export default function MomentsSyncPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<SyncTask[]>([
    {
      id: "1",
      name: "同步卡若主号",
      deviceCount: 2,
      contentLib: "卡若朋友圈",
      syncCount: 307,
      lastSyncTime: "2025-02-06 13:12:35",
      createTime: "2024-11-20 19:04:14",
      creator: "karuo",
      status: "running",
    },
    {
      id: "2",
      name: "暗黑4业务",
      deviceCount: 1,
      contentLib: "暗黑4代练",
      syncCount: 622,
      lastSyncTime: "2024-03-04 14:09:35",
      createTime: "2024-03-04 14:29:04",
      creator: "lkdie",
      status: "paused",
    },
  ])

  const handleDelete = (taskId: string) => {
    setTasks(tasks.filter((task) => task.id !== taskId))
  }

  const handleEdit = (taskId: string) => {
    router.push(`/workspace/moments-sync/${taskId}/edit`)
  }

  const handleView = (taskId: string) => {
    router.push(`/workspace/moments-sync/${taskId}`)
  }

  const toggleTaskStatus = (taskId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, status: task.status === "running" ? "paused" : "running" } : task,
      ),
    )
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium">朋友圈同步</h1>
          </div>
          <Link href="/workspace/moments-sync/new">
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
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleView(task.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        查看
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(task.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        编辑
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
                  <div>推送设备：{task.deviceCount} 个</div>
                  <div>内容库：{task.contentLib}</div>
                </div>
                <div className="text-sm text-gray-500">
                  <div>已同步：{task.syncCount} 条</div>
                  <div>创建人：{task.creator}</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-4">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  上次同步：{task.lastSyncTime}
                </div>
                <div>创建时间：{task.createTime}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
