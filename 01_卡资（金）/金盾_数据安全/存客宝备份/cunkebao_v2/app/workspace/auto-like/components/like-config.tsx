"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export interface LikeConfigData {
  taskName: string
  maxLikesPerDay: number
  likeOldContent: boolean
  contentTypes: string[]
  keywordFilters: string[]
  startImmediately: boolean
  likeFirstPageOnly: boolean
}

interface LikeConfigProps {
  initialData?: Partial<LikeConfigData>
  onSave: (data: LikeConfigData) => void
  onBack: () => void
}

export function LikeConfig({ initialData, onSave, onBack }: LikeConfigProps) {
  const [formData, setFormData] = useState<LikeConfigData>({
    taskName: initialData?.taskName ?? "朋友圈自动点赞任务",
    maxLikesPerDay: initialData?.maxLikesPerDay ?? 50,
    likeOldContent: initialData?.likeOldContent ?? false,
    contentTypes: initialData?.contentTypes ?? ["text", "image", "video"],
    keywordFilters: initialData?.keywordFilters ?? [],
    startImmediately: initialData?.startImmediately ?? true,
    likeFirstPageOnly: initialData?.likeFirstPageOnly ?? false,
  })

  const [newKeyword, setNewKeyword] = useState("")

  // 内容类型选项
  const contentTypeOptions = [
    { id: "text", label: "纯文字动态" },
    { id: "image", label: "图片动态" },
    { id: "video", label: "视频动态" },
    { id: "link", label: "链接分享" },
    { id: "original", label: "仅原创内容" },
  ]

  // 添加关键词
  const addKeyword = () => {
    if (newKeyword.trim() && !formData.keywordFilters.includes(newKeyword.trim())) {
      setFormData({
        ...formData,
        keywordFilters: [...formData.keywordFilters, newKeyword.trim()],
      })
      setNewKeyword("")
    }
  }

  // 删除关键词
  const removeKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      keywordFilters: formData.keywordFilters.filter((k) => k !== keyword),
    })
  }

  // 切换内容类型
  const toggleContentType = (typeId: string) => {
    setFormData({
      ...formData,
      contentTypes: formData.contentTypes.includes(typeId)
        ? formData.contentTypes.filter((id) => id !== typeId)
        : [...formData.contentTypes, typeId],
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
          <CardTitle>点赞配置设置</CardTitle>
          <CardDescription>配置点赞任务的名称、内容和数量</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 任务名称 */}
          <div className="space-y-2">
            <Label htmlFor="taskName" className="font-medium">
              任务名称
            </Label>
            <Input
              id="taskName"
              value={formData.taskName}
              onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
              placeholder="输入任务名称"
            />
          </div>

          {/* 每日点赞数量 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxLikesPerDay" className="font-medium">
                每日最大点赞数
              </Label>
              <span className="text-sm text-muted-foreground">{formData.maxLikesPerDay}个</span>
            </div>
            <Slider
              id="maxLikesPerDay"
              min={10}
              max={200}
              step={10}
              value={[formData.maxLikesPerDay]}
              onValueChange={(value) => setFormData({ ...formData, maxLikesPerDay: value[0] })}
            />
          </div>

          {/* 内容类型设置 */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="font-medium">点赞内容类型</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {contentTypeOptions.map((type) => (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`content-${type.id}`}
                    checked={formData.contentTypes.includes(type.id)}
                    onCheckedChange={() => toggleContentType(type.id)}
                  />
                  <Label htmlFor={`content-${type.id}`} className="text-sm">
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* 关键词过滤 */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="font-medium">关键词过滤</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="输入关键词"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="flex-1"
              />
              <Button type="button" onClick={addKeyword} disabled={!newKeyword.trim()}>
                添加
              </Button>
            </div>
            {formData.keywordFilters.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.keywordFilters.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                    {keyword}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeKeyword(keyword)}
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">添加关键词后，系统将只对包含这些关键词的内容进行点赞</p>
          </div>

          {/* 其他选项 */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Label htmlFor="likeOldContent" className="font-medium">
                  点赞历史内容
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>开启后系统将点赞好友的历史朋友圈内容</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="likeOldContent"
                checked={formData.likeOldContent}
                onCheckedChange={(checked) => setFormData({ ...formData, likeOldContent: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Label htmlFor="startImmediately" className="font-medium">
                  立即开始点赞
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>开启后任务创建完成将立即开始执行</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="startImmediately"
                checked={formData.startImmediately}
                onCheckedChange={(checked) => setFormData({ ...formData, startImmediately: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Label htmlFor="likeFirstPageOnly" className="font-medium">
                  仅点赞第一页
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>开启后系统将只点赞朋友圈第一页的内容</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="likeFirstPageOnly"
                checked={formData.likeFirstPageOnly}
                onCheckedChange={(checked) => setFormData({ ...formData, likeFirstPageOnly: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          返回上一步
        </Button>
        <Button onClick={handleSubmit}>保存并继续</Button>
      </div>
    </div>
  )
}
