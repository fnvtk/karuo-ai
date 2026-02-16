"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import type { Tag } from "@/types/content"

interface TagEditorProps {
  tagId?: string
  initialData?: Tag
}

export function TagEditor({ tagId, initialData }: TagEditorProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<Partial<Tag["settings"]>>({
    syncInterval: 1,
    timeRange: {
      start: "06:00",
      end: "23:59",
    },
    dailyLimit: 5,
    accountType: "business",
    enabled: true,
  })

  useEffect(() => {
    if (initialData) {
      setFormData(initialData.settings)
    }
  }, [initialData])

  const handleSave = async () => {
    try {
      // Here you would typically save the changes to your backend
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({
        title: tagId ? "标签已更新" : "标签已创建",
        description: "设置已成功保存",
      })
      router.back()
    } catch (error) {
      toast({
        title: "保存失败",
        description: "无法保存标签设置",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <Label htmlFor="taskName">任务名称</Label>
          <Input
            id="taskName"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="请输入任务名称"
            className="mt-2"
          />
        </div>

        <div>
          <Label>允许发布时间段</Label>
          <div className="flex items-center space-x-2 mt-2">
            <Input
              type="time"
              value={formData.timeRange?.start}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  timeRange: { ...formData.timeRange, start: e.target.value },
                })
              }
              className="w-32"
            />
            <span>至</span>
            <Input
              type="time"
              value={formData.timeRange?.end}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  timeRange: { ...formData.timeRange, end: e.target.value },
                })
              }
              className="w-32"
            />
          </div>
        </div>

        <div>
          <Label>每日同步数量</Label>
          <div className="flex items-center space-x-4 mt-2">
            <Button
              variant="outline"
              onClick={() => setFormData({ ...formData, dailyLimit: Math.max(1, (formData.dailyLimit || 1) - 1) })}
            >
              -
            </Button>
            <span className="w-12 text-center">{formData.dailyLimit}</span>
            <Button
              variant="outline"
              onClick={() => setFormData({ ...formData, dailyLimit: (formData.dailyLimit || 0) + 1 })}
            >
              +
            </Button>
            <span className="text-gray-500">条朋友圈</span>
          </div>
        </div>

        <div>
          <Label>账号类型</Label>
          <div className="flex space-x-4 mt-2">
            <Button
              variant={formData.accountType === "business" ? "default" : "outline"}
              onClick={() => setFormData({ ...formData, accountType: "business" })}
              className="w-24"
            >
              业务号
            </Button>
            <Button
              variant={formData.accountType === "personal" ? "default" : "outline"}
              onClick={() => setFormData({ ...formData, accountType: "personal" })}
              className="w-24"
            >
              人设号
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label>是否启用</Label>
          <Switch
            checked={formData.enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => router.back()}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
      </div>
    </Card>
  )
}
