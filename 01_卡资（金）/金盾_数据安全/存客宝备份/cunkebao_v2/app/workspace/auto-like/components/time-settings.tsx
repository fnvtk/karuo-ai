"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, Plus, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface TimeRange {
  id: string
  start: string
  end: string
}

export interface TimeSettingsData {
  enableAutoLike: boolean
  timeRanges: TimeRange[]
  likeInterval: number
  randomizeInterval: boolean
  minInterval?: number
  maxInterval?: number
}

interface TimeSettingsProps {
  initialData?: Partial<TimeSettingsData>
  onSave: (data: TimeSettingsData) => void
}

export function TimeSettings({ initialData, onSave }: TimeSettingsProps) {
  const [formData, setFormData] = useState<TimeSettingsData>({
    enableAutoLike: initialData?.enableAutoLike ?? true,
    timeRanges: initialData?.timeRanges ?? [{ id: "1", start: "06:00", end: "08:00" }],
    likeInterval: initialData?.likeInterval ?? 15,
    randomizeInterval: initialData?.randomizeInterval ?? false,
    minInterval: initialData?.minInterval ?? 5,
    maxInterval: initialData?.maxInterval ?? 30,
  })

  // 添加时间范围
  const addTimeRange = () => {
    const newId = String(formData.timeRanges.length + 1)
    setFormData({
      ...formData,
      timeRanges: [...formData.timeRanges, { id: newId, start: "12:00", end: "14:00" }],
    })
  }

  // 删除时间范围
  const removeTimeRange = (id: string) => {
    setFormData({
      ...formData,
      timeRanges: formData.timeRanges.filter((range) => range.id !== id),
    })
  }

  // 更新时间范围
  const updateTimeRange = (id: string, field: "start" | "end", value: string) => {
    setFormData({
      ...formData,
      timeRanges: formData.timeRanges.map((range) => (range.id === id ? { ...range, [field]: value } : range)),
    })
  }

  // 处理表单提交
  const handleSubmit = () => {
    onSave(formData)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>点赞时间设置</CardTitle>
          <CardDescription>设置自动点赞的时间段和间隔</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 基本设置 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Label htmlFor="enableAutoLike" className="font-medium">
                  启用自动点赞
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>开启后系统将根据设置自动为朋友圈点赞</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="enableAutoLike"
                checked={formData.enableAutoLike}
                onCheckedChange={(checked) => setFormData({ ...formData, enableAutoLike: checked })}
              />
            </div>

            {/* 时间范围设置 */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <Label className="font-medium">点赞时间段</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addTimeRange}
                  disabled={!formData.enableAutoLike || formData.timeRanges.length >= 5}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加时间段
                </Button>
              </div>

              <div className="space-y-3">
                {formData.timeRanges.map((range) => (
                  <div key={range.id} className="flex items-center space-x-2">
                    <Input
                      type="time"
                      value={range.start}
                      onChange={(e) => updateTimeRange(range.id, "start", e.target.value)}
                      className="w-32"
                      disabled={!formData.enableAutoLike}
                    />
                    <span>至</span>
                    <Input
                      type="time"
                      value={range.end}
                      onChange={(e) => updateTimeRange(range.id, "end", e.target.value)}
                      className="w-32"
                      disabled={!formData.enableAutoLike}
                    />
                    {formData.timeRanges.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTimeRange(range.id)}
                        disabled={!formData.enableAutoLike}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">设置点赞的时间段，系统将在这些时间段内执行点赞任务</p>
            </div>

            <div className="space-y-2 pt-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="intervalType" className="font-medium">
                  点赞间隔设置
                </Label>
                <Select
                  value={formData.randomizeInterval ? "random" : "fixed"}
                  onValueChange={(value) => setFormData({ ...formData, randomizeInterval: value === "random" })}
                  disabled={!formData.enableAutoLike}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="选择间隔类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">固定间隔</SelectItem>
                    <SelectItem value="random">随机间隔</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.randomizeInterval ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="minInterval" className="text-sm">
                        最小间隔（分钟）
                      </Label>
                      <span className="text-sm text-muted-foreground">{formData.minInterval}分钟</span>
                    </div>
                    <Slider
                      id="minInterval"
                      min={1}
                      max={30}
                      step={1}
                      value={[formData.minInterval || 5]}
                      onValueChange={(value) => setFormData({ ...formData, minInterval: value[0] })}
                      disabled={!formData.enableAutoLike}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="maxInterval" className="text-sm">
                        最大间隔（分钟）
                      </Label>
                      <span className="text-sm text-muted-foreground">{formData.maxInterval}分钟</span>
                    </div>
                    <Slider
                      id="maxInterval"
                      min={formData.minInterval || 5}
                      max={120}
                      step={1}
                      value={[formData.maxInterval || 30]}
                      onValueChange={(value) => setFormData({ ...formData, maxInterval: value[0] })}
                      disabled={!formData.enableAutoLike}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="likeInterval" className="text-sm">
                      点赞间隔（分钟）
                    </Label>
                    <span className="text-sm text-muted-foreground">{formData.likeInterval}分钟</span>
                  </div>
                  <Slider
                    id="likeInterval"
                    min={1}
                    max={60}
                    step={1}
                    value={[formData.likeInterval]}
                    onValueChange={(value) => setFormData({ ...formData, likeInterval: value[0] })}
                    disabled={!formData.enableAutoLike}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit}>下一步</Button>
      </div>
    </div>
  )
}
