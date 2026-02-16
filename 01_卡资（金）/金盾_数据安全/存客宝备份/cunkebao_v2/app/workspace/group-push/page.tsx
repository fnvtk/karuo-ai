"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PlusCircle, MoreVertical, Edit, Trash2, ArrowLeft, Clock, Search, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

// 模拟数据
const mockTasks = [
  {
    id: "1",
    name: "社群推送测试",
    pushTimeRange: "06:00 - 23:59",
    dailyPushCount: 20,
    pushOrder: "latest",
    isLoopPush: false,
    isEnabled: true,
    groupCount: 3,
    contentLibraryCount: 2,
    createdAt: "2025-03-15 14:30",
    lastPushTime: "2025-03-20 10:25",
    totalPushCount: 245,
  },
  {
    id: "2",
    name: "产品更新推送",
    pushTimeRange: "09:00 - 21:00",
    dailyPushCount: 15,
    pushOrder: "earliest",
    isLoopPush: true,
    isEnabled: false,
    groupCount: 5,
    contentLibraryCount: 1,
    createdAt: "2025-03-10 10:15",
    lastPushTime: "2025-03-19 16:45",
    totalPushCount: 128,
  },
  {
    id: "3",
    name: "新客户欢迎",
    pushTimeRange: "08:00 - 22:00",
    dailyPushCount: 10,
    pushOrder: "latest",
    isLoopPush: true,
    isEnabled: true,
    groupCount: 2,
    contentLibraryCount: 1,
    createdAt: "2025-03-05 09:20",
    lastPushTime: "2025-03-18 11:30",
    totalPushCount: 87,
  },
]

export default function GroupPushPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState(mockTasks)
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    setTaskToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (taskToDelete) {
      setTasks(tasks.filter((task) => task.id !== taskToDelete))
      setTaskToDelete(null)
    }
    setDeleteDialogOpen(false)
  }

  const handleToggleStatus = (id: string, isEnabled: boolean) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, isEnabled } : task)))
  }

  const filteredTasks = tasks.filter((task) => task.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/workspace")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium">社群推送</h1>
          </div>
          <Link href="/workspace/group-push/new">
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              新建任务
            </Button>
          </Link>
        </div>
      </header>

      {/* 搜索栏 */}
      <div className="p-4">
        <Card className="p-4 mb-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索任务名称"
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* 任务列表 */}
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium">{task.name}</h3>
                  <Badge variant={task.isEnabled ? "success" : "secondary"}>
                    {task.isEnabled ? "进行中" : "已暂停"}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={task.isEnabled}
                    onCheckedChange={(checked) => handleToggleStatus(task.id, checked)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link href={`/workspace/group-push/${task.id}`}>
                        <DropdownMenuItem>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mr-2"
                          >
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          查看
                        </DropdownMenuItem>
                      </Link>
                      <Link href={`/workspace/group-push/${task.id}/edit`}>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                      </Link>
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
                  <div>推送设备：{task.groupCount} 个</div>
                  <div>内容库：{task.contentLibraryCount} 个</div>
                  <div>推送时间：{task.pushTimeRange}</div>
                </div>
                <div className="text-sm text-gray-500">
                  <div>每日推送：{task.dailyPushCount} 条</div>
                  <div>已推送：{task.totalPushCount} 条</div>
                  <div>推送顺序：{task.pushOrder === "latest" ? "按最新" : "按最早"}</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-4">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  上次推送：{task.lastPushTime}
                </div>
                <div>创建时间：{task.createdAt}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* 空状态 */}
        {filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <Clock className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">暂无社群推送任务</h3>
            <p className="text-gray-500 mb-4">点击"新建任务"按钮创建您的第一个社群推送任务</p>
            <Link href="/workspace/group-push/new">
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                新建任务
              </Button>
            </Link>
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>您确定要删除这个社群推送任务吗？此操作无法撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
