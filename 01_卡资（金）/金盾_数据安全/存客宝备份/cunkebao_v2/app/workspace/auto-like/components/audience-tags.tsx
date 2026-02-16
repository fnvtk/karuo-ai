"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Check, Plus, Tag, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export interface AudienceTagsData {
  selectedTags: string[]
  tagOperator: "and" | "or"
}

interface AudienceTagsProps {
  initialData: AudienceTagsData
  onSave: (data: AudienceTagsData) => void
  onBack: () => void
}

// 模拟标签数据
const predefinedTags = [
  "高意向",
  "中意向",
  "低意向",
  "新客户",
  "老客户",
  "VIP客户",
  "男性",
  "女性",
  "年轻人",
  "中年人",
  "老年人",
  "城市",
  "农村",
  "高收入",
  "中等收入",
  "低收入",
]

export function AudienceTags({ initialData, onSave, onBack }: AudienceTagsProps) {
  const [formData, setFormData] = useState<AudienceTagsData>(initialData)
  const [newTag, setNewTag] = useState("")

  const toggleTag = (tag: string) => {
    const newSelectedTags = formData.selectedTags.includes(tag)
      ? formData.selectedTags.filter((t) => t !== tag)
      : [...formData.selectedTags, tag]

    setFormData({ ...formData, selectedTags: newSelectedTags })
  }

  const addCustomTag = () => {
    if (newTag.trim() && !predefinedTags.includes(newTag) && !formData.selectedTags.includes(newTag)) {
      setFormData({
        ...formData,
        selectedTags: [...formData.selectedTags, newTag.trim()],
      })
      setNewTag("")
    }
  }

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div>
            <Label className="text-base font-medium">筛选标签</Label>
            <p className="text-sm text-muted-foreground mb-4">选择需要点赞的人群标签</p>

            <div className="flex flex-wrap gap-2 mb-6">
              {predefinedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={formData.selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer py-1 px-3"
                  onClick={() => toggleTag(tag)}
                >
                  {formData.selectedTags.includes(tag) && <Check className="h-3 w-3 mr-1" />}
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex space-x-2 mt-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="pl-9"
                  placeholder="添加自定义标签"
                  onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
                />
              </div>
              <Button onClick={addCustomTag} disabled={!newTag.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                添加
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">标签匹配逻辑</Label>
            <p className="text-sm text-muted-foreground mb-2">选择多个标签之间的匹配关系</p>

            <RadioGroup
              value={formData.tagOperator}
              onValueChange={(value) => setFormData({ ...formData, tagOperator: value as "and" | "or" })}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="and" id="and-operator" />
                <Label htmlFor="and-operator" className="font-normal">
                  所有标签都必须匹配（AND）
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="or" id="or-operator" />
                <Label htmlFor="or-operator" className="font-normal">
                  匹配任意一个标签即可（OR）
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-base font-medium">已选择的标签</Label>
            <div className="mt-2 min-h-[60px] border rounded-md p-3">
              {formData.selectedTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">未选择任何标签</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {formData.selectedTags.map((tag) => (
                    <Badge key={tag} className="flex items-center gap-1 py-1 px-2">
                      {tag}
                      <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => toggleTag(tag)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between space-x-4">
            <Button variant="outline" className="flex-1" onClick={onBack}>
              上一步
            </Button>
            <Button className="flex-1" onClick={() => onSave(formData)} disabled={formData.selectedTags.length === 0}>
              完成设置
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
