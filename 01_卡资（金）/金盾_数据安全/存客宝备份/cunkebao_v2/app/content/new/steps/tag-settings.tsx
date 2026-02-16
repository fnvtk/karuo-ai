"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tag, Plus, X } from "lucide-react"
import type { ContentLibraryFormData } from "../page"

interface TagSettingsProps {
  formData: ContentLibraryFormData
  updateFormData: (field: string, value: any) => void
  onNext: () => void
  onPrevious: () => void
}

// 预设标签
const presetTags = ["营销素材", "产品介绍", "客户反馈", "行业资讯", "竞品分析", "培训资料", "案例分享", "活动宣传"]

export function TagSettings({ formData, updateFormData, onNext, onPrevious }: TagSettingsProps) {
  const [newTag, setNewTag] = useState("")
  const [tags, setTags] = useState<string[]>(formData.tags)
  const [error, setError] = useState<string | null>(null)

  const handleAddTag = () => {
    if (!newTag.trim()) {
      setError("标签不能为空")
      return
    }

    if (tags.includes(newTag.trim())) {
      setError("标签已存在")
      return
    }

    setTags([...tags, newTag.trim()])
    setNewTag("")
    setError(null)
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleAddPresetTag = (tag: string) => {
    if (tags.includes(tag)) {
      return
    }
    setTags([...tags, tag])
  }

  const handleNext = () => {
    updateFormData("tags", tags)
    onNext()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium">标签设置</h2>
              <p className="text-sm text-gray-500 mt-1">为内容库添加标签，便于后续管理和查找</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base">添加标签</Label>
                <div className="flex mt-1.5">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      value={newTag}
                      onChange={(e) => {
                        setNewTag(e.target.value)
                        setError(null)
                      }}
                      placeholder="输入标签名称"
                      className="pl-9"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddTag()
                        }
                      }}
                    />
                  </div>
                  <Button type="button" onClick={handleAddTag} className="ml-2" disabled={!newTag.trim()}>
                    <Plus className="h-4 w-4 mr-1" />
                    添加
                  </Button>
                </div>
                {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
              </div>

              {tags.length > 0 && (
                <div>
                  <Label className="text-base">已添加的标签</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1 px-3 py-1.5">
                        <Tag className="h-3 w-3" />
                        {tag}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 rounded-full"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-base">推荐标签</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {presetTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className={`cursor-pointer hover:bg-gray-100 ${
                        tags.includes(tag) ? "bg-blue-50 text-blue-700 border-blue-200" : ""
                      }`}
                      onClick={() => handleAddPresetTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          上一步
        </Button>
        <Button onClick={handleNext}>下一步</Button>
      </div>
    </div>
  )
}
