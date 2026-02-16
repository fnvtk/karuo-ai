"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useViewMode } from "@/app/components/LayoutWrapper"

export interface LikeRulesData {
  enableAutoLike: boolean
  likeInterval: number
  maxLikesPerDay: number
  likeOldContent: boolean
  contentTypes: string[]
  keywordFilters: string[]
  friendGroups: string[]
  excludedGroups: string[]
  timeRanges: { id: string; start: string; end: string }[]
  randomizeInterval: boolean
  minInterval: number
  maxInterval: number
}

interface LikeRulesProps {
  initialData: LikeRulesData
  onSave: (data: LikeRulesData) => void
}

export function LikeRules({ initialData, onSave }: LikeRulesProps) {
  const [formData, setFormData] = useState<LikeRulesData>(initialData)
  const [newKeyword, setNewKeyword] = useState("")
  const { viewMode } = useViewMode()

  const handleContentTypeToggle = (type: string) => {
    const updatedTypes = formData.contentTypes.includes(type)
      ? formData.contentTypes.filter((t) => t !== type)
      : [...formData.contentTypes, type]
    setFormData({ ...formData, contentTypes: updatedTypes })
  }

  const addKeywordFilter = () => {
    if (newKeyword.trim() && !formData.keywordFilters.includes(newKeyword.trim())) {
      setFormData({
        ...formData,
        keywordFilters: [...formData.keywordFilters, newKeyword.trim()],
      })
      setNewKeyword("")
    }
  }

  const removeKeywordFilter = (keyword: string) => {
    setFormData({
      ...formData,
      keywordFilters: formData.keywordFilters.filter((k) => k !== keyword),
    })
  }

  const addTimeRange = () => {
    const newId = String(formData.timeRanges.length + 1)
    setFormData({
      ...formData,
      timeRanges: [...formData.timeRanges, { id: newId, start: "09:00", end: "18:00" }],
    })
  }

  const updateTimeRange = (id: string, field: "start" | "end", value: string) => {
    setFormData({
      ...formData,
      timeRanges: formData.timeRanges.map((range) => (range.id === id ? { ...range, [field]: value } : range)),
    })
  }

  const removeTimeRange = (id: string) => {
    if (formData.timeRanges.length > 1) {
      setFormData({
        ...formData,
        timeRanges: formData.timeRanges.filter((range) => range.id !== id),
      })
    }
  }

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className={`space-y-6 ${viewMode === "desktop" ? "p-6" : "p-4"}`}>
          <div className={`grid ${viewMode === "desktop" ? "grid-cols-2 gap-8" : "grid-cols-1 gap-4"}`}>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable-auto-like" className="text-base font-medium">
                  启用自动点赞
                </Label>
                <p className="text-sm text-muted-foreground">开启后，系统将按照设定的规则自动点赞</p>
              </div>
              <Switch
                id="enable-auto-like"
                checked={formData.enableAutoLike}
                onCheckedChange={(checked) => setFormData({ ...formData, enableAutoLike: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">内容类型</Label>
              <p className="text-sm text-muted-foreground mb-2">选择需要自动点赞的内容类型</p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="text-content"
                    checked={formData.contentTypes.includes("text")}
                    onCheckedChange={() => handleContentTypeToggle("text")}
                  />
                  <label htmlFor="text-content" className="text-sm">
                    文字
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="image-content"
                    checked={formData.contentTypes.includes("image")}
                    onCheckedChange={() => handleContentTypeToggle("image")}
                  />
                  <label htmlFor="image-content" className="text-sm">
                    图片
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="video-content"
                    checked={formData.contentTypes.includes("video")}
                    onCheckedChange={() => handleContentTypeToggle("video")}
                  />
                  <label htmlFor="video-content" className="text-sm">
                    视频
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-likes" className="text-base font-medium">
                每日最大点赞数
              </Label>
              <p className="text-sm text-muted-foreground mb-2">设置每日最多点赞次数，建议不超过100次</p>
              <div className="flex items-center gap-4">
                <Slider
                  id="max-likes"
                  value={[formData.maxLikesPerDay]}
                  min={10}
                  max={150}
                  step={5}
                  onValueChange={(value) => setFormData({ ...formData, maxLikesPerDay: value[0] })}
                  className="flex-1"
                />
                <div className="bg-primary text-primary-foreground rounded-md px-3 py-1 font-medium min-w-[60px] text-center">
                  {formData.maxLikesPerDay}次
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="like-interval" className="text-base font-medium">
                点赞间隔
              </Label>
              <p className="text-sm text-muted-foreground mb-2">设置点赞之间的时间间隔（分钟）</p>
              <div className="flex items-center gap-4">
                <Slider
                  id="like-interval"
                  value={[formData.likeInterval]}
                  min={1}
                  max={60}
                  step={1}
                  onValueChange={(value) => setFormData({ ...formData, likeInterval: value[0] })}
                  className="flex-1"
                />
                <div className="bg-primary text-primary-foreground rounded-md px-3 py-1 font-medium min-w-[60px] text-center">
                  {formData.likeInterval}分钟
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="randomize-interval" className="text-base font-medium">
                    随机化间隔
                  </Label>
                  <p className="text-sm text-muted-foreground">开启后，系统将在设定范围内随机选择点赞间隔</p>
                </div>
                <Switch
                  id="randomize-interval"
                  checked={formData.randomizeInterval}
                  onCheckedChange={(checked) => setFormData({ ...formData, randomizeInterval: checked })}
                />
              </div>

              {formData.randomizeInterval && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <Label htmlFor="min-interval">最小间隔（分钟）</Label>
                    <Input
                      id="min-interval"
                      type="number"
                      value={formData.minInterval}
                      onChange={(e) => setFormData({ ...formData, minInterval: Number.parseInt(e.target.value) || 1 })}
                      min={1}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-interval">最大间隔（分钟）</Label>
                    <Input
                      id="max-interval"
                      type="number"
                      value={formData.maxInterval}
                      onChange={(e) => setFormData({ ...formData, maxInterval: Number.parseInt(e.target.value) || 1 })}
                      min={formData.minInterval + 1}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">时间范围</Label>
              <p className="text-sm text-muted-foreground mb-2">设置自动点赞的时间段</p>

              <div className="space-y-4">
                {formData.timeRanges.map((range) => (
                  <div key={range.id} className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={range.start}
                      onChange={(e) => updateTimeRange(range.id, "start", e.target.value)}
                      className="w-32"
                    />
                    <span>至</span>
                    <Input
                      type="time"
                      value={range.end}
                      onChange={(e) => updateTimeRange(range.id, "end", e.target.value)}
                      className="w-32"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTimeRange(range.id)}
                      disabled={formData.timeRanges.length <= 1}
                      className="ml-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button variant="outline" size="sm" onClick={addTimeRange} className="mt-2">
                  <Plus className="h-4 w-4 mr-2" />
                  添加时间段
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">关键词过滤</Label>
              <p className="text-sm text-muted-foreground mb-2">添加包含特定关键词的内容才会被点赞</p>

              <div className="flex space-x-2 mb-2">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="输入关键词"
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && addKeywordFilter()}
                />
                <Button onClick={addKeywordFilter} variant="secondary">
                  添加
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {formData.keywordFilters.length === 0 && (
                  <span className="text-sm text-muted-foreground">未设置关键词过滤</span>
                )}

                {formData.keywordFilters.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                    {keyword}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => removeKeywordFilter(keyword)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="like-old-content" className="text-base font-medium">
                  点赞历史内容
                </Label>
                <p className="text-sm text-muted-foreground">开启后，系统会点赞朋友圈中较旧的内容</p>
              </div>
              <Switch
                id="like-old-content"
                checked={formData.likeOldContent}
                onCheckedChange={(checked) => setFormData({ ...formData, likeOldContent: checked })}
              />
            </div>
          </div>

          <Button className="w-full" onClick={() => onSave(formData)}>
            下一步
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
