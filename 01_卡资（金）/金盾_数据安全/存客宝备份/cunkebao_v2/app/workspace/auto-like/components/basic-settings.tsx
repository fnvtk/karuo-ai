"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Minus, Plus } from "lucide-react"

interface BasicSettingsProps {
  formData: {
    taskName: string
    likeInterval: number
    maxLikesPerDay: number
    timeRange: { start: string; end: string }
    contentTypes: string[]
    enabled: boolean
  }
  onChange: (data: Partial<BasicSettingsProps["formData"]>) => void
  onNext: () => void
}

export function BasicSettings({ formData, onChange, onNext }: BasicSettingsProps) {
  const handleContentTypeChange = (type: string) => {
    const currentTypes = [...formData.contentTypes]
    if (currentTypes.includes(type)) {
      onChange({ contentTypes: currentTypes.filter((t) => t !== type) })
    } else {
      onChange({ contentTypes: [...currentTypes, type] })
    }
  }

  const incrementInterval = () => {
    onChange({ likeInterval: Math.min(formData.likeInterval + 5, 60) })
  }

  const decrementInterval = () => {
    onChange({ likeInterval: Math.max(formData.likeInterval - 5, 5) })
  }

  const incrementMaxLikes = () => {
    onChange({ maxLikesPerDay: Math.min(formData.maxLikesPerDay + 10, 500) })
  }

  const decrementMaxLikes = () => {
    onChange({ maxLikesPerDay: Math.max(formData.maxLikesPerDay - 10, 10) })
  }

  return (
    <div className="space-y-6 px-6">
      <div className="space-y-2">
        <Label htmlFor="task-name">任务名称</Label>
        <Input
          id="task-name"
          placeholder="请输入任务名称"
          value={formData.taskName}
          onChange={(e) => onChange({ taskName: e.target.value })}
          className="h-12 rounded-xl border-gray-200"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="like-interval">点赞间隔</Label>
        <div className="flex items-center">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-l-xl border-gray-200 bg-white hover:bg-gray-50"
            onClick={decrementInterval}
          >
            <Minus className="h-5 w-5" />
          </Button>
          <div className="relative flex-1">
            <Input
              id="like-interval"
              type="number"
              min={5}
              max={60}
              value={formData.likeInterval}
              onChange={(e) => onChange({ likeInterval: Number.parseInt(e.target.value) || 5 })}
              className="h-12 rounded-none border-x-0 border-gray-200 text-center"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-500">
              秒
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-r-xl border-gray-200 bg-white hover:bg-gray-50"
            onClick={incrementInterval}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-xs text-gray-500">设置两次点赞之间的最小时间间隔</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="max-likes">每日最大点赞数</Label>
        <div className="flex items-center">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-l-xl border-gray-200 bg-white hover:bg-gray-50"
            onClick={decrementMaxLikes}
          >
            <Minus className="h-5 w-5" />
          </Button>
          <div className="relative flex-1">
            <Input
              id="max-likes"
              type="number"
              min={10}
              max={500}
              value={formData.maxLikesPerDay}
              onChange={(e) => onChange({ maxLikesPerDay: Number.parseInt(e.target.value) || 10 })}
              className="h-12 rounded-none border-x-0 border-gray-200 text-center"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-500">
              次/天
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-r-xl border-gray-200 bg-white hover:bg-gray-50"
            onClick={incrementMaxLikes}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-xs text-gray-500">设置每天最多点赞的次数</p>
      </div>

      <div className="space-y-2">
        <Label>点赞时间范围</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              type="time"
              value={formData.timeRange.start}
              onChange={(e) => onChange({ timeRange: { ...formData.timeRange, start: e.target.value } })}
              className="h-12 rounded-xl border-gray-200"
            />
          </div>
          <div>
            <Input
              type="time"
              value={formData.timeRange.end}
              onChange={(e) => onChange({ timeRange: { ...formData.timeRange, end: e.target.value } })}
              className="h-12 rounded-xl border-gray-200"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">设置每天可以点赞的时间段</p>
      </div>

      <div className="space-y-2">
        <Label>点赞内容类型</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "text", label: "文字" },
            { id: "image", label: "图片" },
            { id: "video", label: "视频" },
          ].map((type) => (
            <div
              key={type.id}
              className={`flex items-center justify-center h-12 rounded-xl border cursor-pointer ${
                formData.contentTypes.includes(type.id)
                  ? "border-blue-500 bg-blue-50 text-blue-600"
                  : "border-gray-200 text-gray-600"
              }`}
              onClick={() => handleContentTypeChange(type.id)}
            >
              {type.label}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">选择要点赞的内容类型</p>
      </div>

      <div className="flex items-center justify-between py-2">
        <Label htmlFor="auto-enabled" className="cursor-pointer">
          自动开启
        </Label>
        <Switch
          id="auto-enabled"
          checked={formData.enabled}
          onCheckedChange={(checked) => onChange({ enabled: checked })}
        />
      </div>

      <Button onClick={onNext} className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-xl text-base shadow-sm">
        下一步
      </Button>
    </div>
  )
}
