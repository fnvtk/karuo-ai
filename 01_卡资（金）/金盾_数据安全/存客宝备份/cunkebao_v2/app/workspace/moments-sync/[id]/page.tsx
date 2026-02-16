"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

export default function ViewMomentsSyncTask({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [task, setTask] = useState<SyncTask | null>(null)

  useEffect(() => {
    // Fetch task data from API
    // For now, we'll use mock data
    setTask({
      id: params.id,
      name: "同步卡若主号",
      deviceCount: 2,
      contentLib: "卡若朋友圈",
      syncCount: 307,
      lastSyncTime: "2025-02-06 13:12:35",
      createTime: "2024-11-20 19:04:14",
      creator: "karuo",
      status: "running",
    })
  }, [params.id])

  const toggleTaskStatus = () => {
    if (task) {
      setTask({ ...task, status: task.status === "running" ? "paused" : "running" })
    }
  }

  if (!task) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium">查看朋友圈同步任务</h1>
          </div>
          <Button onClick={() => router.push(`/workspace/moments-sync/${task.id}/edit`)}>编辑任务</Button>
        </div>
      </header>

      <div className="p-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold">{task.name}</h2>
              <Badge variant={task.status === "running" ? "success" : "secondary"}>
                {task.status === "running" ? "进行中" : "已暂停"}
              </Badge>
            </div>
            <Switch checked={task.status === "running"} onCheckedChange={toggleTaskStatus} />
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">任务详情</h3>
              <div className="space-y-2">
                <p>推送设备：{task.deviceCount} 个</p>
                <p>内容库：{task.contentLib}</p>
                <p>已同步：{task.syncCount} 条</p>
                <p>创建人：{task.creator}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">时间信息</h3>
              <div className="space-y-2">
                <p>创建时间：{task.createTime}</p>
                <p>上次同步：{task.lastSyncTime}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">同步内容预览</h3>
            {/* Add content preview here */}
            <p className="text-gray-500">暂无内容预览</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
