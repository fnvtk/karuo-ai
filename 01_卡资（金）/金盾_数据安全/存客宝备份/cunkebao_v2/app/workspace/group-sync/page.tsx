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
import { PlusCircle, MoreVertical, Edit, Trash2, ArrowLeft, Clock } from "lucide-react"
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
  },
]

export default function GroupSyncPage() {
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
    <div className="container mx-auto py-6">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/workspace")} className="mr-auto">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <h1 className="text-2xl font-bold absolute left-1/2 transform -translate-x-1/2">社群同步</h1>

        <Link href="/workspace/group-sync/new">
          <Button className="flex items-center gap-1">
            <PlusCircle className="h-4 w-4" />
            新建任务
          </Button>
        </Link>
      </div>

      {/* 搜索栏 */}
      <div className="mb-6">
        <Input
          placeholder="搜索任务名称..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* 任务列表 */}
      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <Card key={task.id} className="overflow-hidden hover:shadow-sm transition-shadow">
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-lg">{task.name}</h3>
                    <Badge variant={task.isEnabled ? "default" : "secondary"}>
                      {task.isEnabled ? "已启用" : "已停用"}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <div className="flex items-center gap-4">
                      <span>推送时间: {task.pushTimeRange}</span>
                      <span>每日推送: {task.dailyPushCount}条</span>
                      <span>推送顺序: {task.pushOrder === "latest" ? "按最新" : "按最早"}</span>
                      <span>循环推送: {task.isLoopPush ? "是" : "否"}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span>社群数量: {task.groupCount}</span>
                      <span>内容库数量: {task.contentLibraryCount}</span>
                      <span>创建时间: {task.createdAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 mr-2">
                    <span className="text-sm text-gray-500">启用</span>
                    <Switch
                      checked={task.isEnabled}
                      onCheckedChange={(checked) => handleToggleStatus(task.id, checked)}
                    />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link href={`/workspace/group-sync/${task.id}/edit`}>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem onClick={() => handleDelete(task.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
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
          <h3 className="text-lg font-medium text-gray-900 mb-1">暂无社群同步任务</h3>
          <p className="text-gray-500 mb-4">点击"新建任务"按钮创建您的第一个社群同步任务</p>
          <Link href="/workspace/group-sync/new">
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              新建任务
            </Button>
          </Link>
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>您确定要删除这个社群同步任务吗？此操作无法撤销。</DialogDescription>
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
