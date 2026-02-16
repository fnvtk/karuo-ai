"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Tag {
  id: string
  name: string
  color?: string
}

export interface TagManagerProps {
  /** 已选择的标签 */
  selectedTags: Tag[]
  /** 标签变更回调 */
  onTagsChange: (tags: Tag[]) => void
  /** 预设标签列表 */
  presetTags?: Tag[]
  /** 是否允许创建自定义标签 */
  allowCustomTags?: boolean
  /** 标签最大数量，0表示不限制 */
  maxTags?: number
  /** 自定义类名 */
  className?: string
  /** 是否使用卡片包装 */
  withCard?: boolean
  /** 标题 */
  title?: string
}

/**
 * 统一的标签管理器组件
 */
export function TagManager({
  selectedTags = [],
  onTagsChange,
  presetTags = [],
  allowCustomTags = true,
  maxTags = 0,
  className,
  withCard = true,
  title = "标签管理",
}: TagManagerProps) {
  const [newTagName, setNewTagName] = useState("")

  // 默认预设标签
  const defaultPresetTags: Tag[] = [
    { id: "tag1", name: "重要客户", color: "bg-red-100 text-red-800 hover:bg-red-200" },
    { id: "tag2", name: "潜在客户", color: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
    { id: "tag3", name: "已成交", color: "bg-green-100 text-green-800 hover:bg-green-200" },
    { id: "tag4", name: "待跟进", color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" },
    { id: "tag5", name: "高意向", color: "bg-purple-100 text-purple-800 hover:bg-purple-200" },
    { id: "tag6", name: "低意向", color: "bg-gray-100 text-gray-800 hover:bg-gray-200" },
    { id: "tag7", name: "已流失", color: "bg-pink-100 text-pink-800 hover:bg-pink-200" },
    { id: "tag8", name: "新客户", color: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200" },
  ]

  const availablePresetTags = presetTags.length > 0 ? presetTags : defaultPresetTags

  // 添加标签
  const handleAddTag = (tag: Tag) => {
    if (maxTags > 0 && selectedTags.length >= maxTags) {
      return
    }

    if (!selectedTags.some((t) => t.id === tag.id)) {
      onTagsChange([...selectedTags, tag])
    }
  }

  // 移除标签
  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTags.filter((tag) => tag.id !== tagId))
  }

  // 添加自定义标签
  const handleAddCustomTag = () => {
    if (!newTagName.trim() || (maxTags > 0 && selectedTags.length >= maxTags)) {
      return
    }

    // 生成随机颜色
    const colors = [
      "bg-red-100 text-red-800 hover:bg-red-200",
      "bg-blue-100 text-blue-800 hover:bg-blue-200",
      "bg-green-100 text-green-800 hover:bg-green-200",
      "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
      "bg-purple-100 text-purple-800 hover:bg-purple-200",
      "bg-gray-100 text-gray-800 hover:bg-gray-200",
      "bg-pink-100 text-pink-800 hover:bg-pink-200",
      "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
    ]
    const randomColor = colors[Math.floor(Math.random() * colors.length)]

    const newTag: Tag = {
      id: `custom-${Date.now()}`,
      name: newTagName.trim(),
      color: randomColor,
    }

    onTagsChange([...selectedTags, newTag])
    setNewTagName("")
  }

  const TagManagerContent = () => (
    <div className="space-y-4">
      {title && <h3 className="text-lg font-medium">{title}</h3>}

      {/* 已选标签 */}
      <div>
        <Label className="mb-2 block">已选标签</Label>
        <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md">
          {selectedTags.length > 0 ? (
            selectedTags.map((tag) => (
              <Badge key={tag.id} className={cn("flex items-center gap-1 px-3 py-1", tag.color)}>
                {tag.name}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag.id)} />
              </Badge>
            ))
          ) : (
            <div className="text-gray-400 text-sm">暂无标签</div>
          )}
        </div>
      </div>

      {/* 预设标签 */}
      <div>
        <Label className="mb-2 block">预设标签</Label>
        <div className="flex flex-wrap gap-2">
          {availablePresetTags.map((tag) => (
            <Badge
              key={tag.id}
              className={cn(
                "cursor-pointer px-3 py-1",
                tag.color,
                selectedTags.some((t) => t.id === tag.id) ? "opacity-50" : "",
              )}
              onClick={() => handleAddTag(tag)}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* 自定义标签 */}
      {allowCustomTags && (
        <div>
          <Label className="mb-2 block">添加自定义标签</Label>
          <div className="flex gap-2">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="输入标签名称"
              className="flex-1"
              maxLength={10}
            />
            <Button
              onClick={handleAddCustomTag}
              disabled={!newTagName.trim() || (maxTags > 0 && selectedTags.length >= maxTags)}
            >
              <Plus className="h-4 w-4 mr-1" />
              添加
            </Button>
          </div>
          {maxTags > 0 && (
            <div className="text-sm text-gray-500 mt-1">
              已添加 {selectedTags.length}/{maxTags} 个标签
            </div>
          )}
        </div>
      )}
    </div>
  )

  return withCard ? (
    <Card className={className}>
      <CardContent className="p-4 sm:p-6">
        <TagManagerContent />
      </CardContent>
    </Card>
  ) : (
    <div className={className}>
      <TagManagerContent />
    </div>
  )
}
