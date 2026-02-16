"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GroupPreview } from "./group-preview"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface GroupCreationProgressProps {
  planId: string
  onComplete: () => void
}

export function GroupCreationProgress({ planId, onComplete }: GroupCreationProgressProps) {
  const [groups, setGroups] = useState<any[]>([])
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0)
  const [status, setStatus] = useState<"preparing" | "creating" | "completed">("preparing")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 模拟获取分组数据
    const mockGroups = Array.from({ length: 5 }).map((_, index) => ({
      id: `group-${index}`,
      members: Array.from({ length: Math.floor(Math.random() * 10) + 30 }).map((_, mIndex) => ({
        id: `member-${index}-${mIndex}`,
        nickname: `用户${mIndex + 1}`,
        wechatId: `wx_${mIndex}`,
        tags: [`标签${(mIndex % 3) + 1}`],
      })),
    }))
    setGroups(mockGroups)
    setStatus("creating")
  }, [])

  useEffect(() => {
    if (status === "creating" && currentGroupIndex < groups.length) {
      const timer = setTimeout(() => {
        if (currentGroupIndex === groups.length - 1) {
          setStatus("completed")
          onComplete()
        } else {
          setCurrentGroupIndex((prev) => prev + 1)
        }
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [status, currentGroupIndex, groups.length, onComplete])

  const handleRetryGroup = (groupIndex: number) => {
    // 模拟重试逻辑
    setGroups((prev) =>
      prev.map((group, index) => {
        if (index === groupIndex) {
          return {
            ...group,
            members: [
              ...group.members,
              {
                id: `retry-member-${Date.now()}`,
                nickname: `补充用户${group.members.length + 1}`,
                wechatId: `wx_retry_${Date.now()}`,
                tags: ["新加入"],
              },
            ],
          }
        }
        return group
      }),
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">
              建群进度
              <Badge className="ml-2">
                {status === "preparing" ? "准备中" : status === "creating" ? "创建中" : "已完成"}
              </Badge>
            </CardTitle>
            <div className="text-sm text-gray-500">
              {currentGroupIndex + 1}/{groups.length}组
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={Math.round(((currentGroupIndex + 1) / groups.length) * 100)} className="h-2" />
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-4">
          {groups.map((group, index) => (
            <GroupPreview
              key={group.id}
              groupIndex={index}
              members={group.members}
              isCreating={status === "creating" && index === currentGroupIndex}
              isCompleted={status === "completed" || index < currentGroupIndex}
              onRetry={() => handleRetryGroup(index)}
            />
          ))}
        </div>
      </ScrollArea>

      {status === "completed" && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>所有群组已创建完成</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
