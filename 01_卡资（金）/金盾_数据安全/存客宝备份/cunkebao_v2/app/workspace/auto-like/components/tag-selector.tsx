"use client"

import { useState } from "react"
import { Search, Tag, Check, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface TagGroup {
  id: string
  name: string
  tags: string[]
}

interface TagSelectorProps {
  selectedTags: string[]
  tagOperator: "and" | "or"
  onTagsChange: (tags: string[]) => void
  onOperatorChange: (operator: "and" | "or") => void
  onBack: () => void
  onComplete: () => void
}

export function TagSelector({
  selectedTags,
  tagOperator,
  onTagsChange,
  onOperatorChange,
  onBack,
  onComplete,
}: TagSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([
    {
      id: "intention",
      name: "意向度",
      tags: ["高意向", "中意向", "低意向"],
    },
    {
      id: "customer",
      name: "客户类型",
      tags: ["新客户", "老客户", "VIP客户"],
    },
    {
      id: "gender",
      name: "性别",
      tags: ["男性", "女性"],
    },
    {
      id: "age",
      name: "年龄段",
      tags: ["年轻人", "中年人", "老年人"],
    },
    {
      id: "location",
      name: "地区",
      tags: ["城市", "农村"],
    },
    {
      id: "income",
      name: "收入",
      tags: ["高收入", "中等收入", "低收入"],
    },
    {
      id: "interaction",
      name: "互动频率",
      tags: ["高频互动", "中频互动", "低频互动"],
    },
  ])
  const [customTag, setCustomTag] = useState("")

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      onTagsChange([...selectedTags, customTag.trim()])
      setCustomTag("")
    }
  }

  const removeTag = (tag: string) => {
    onTagsChange(selectedTags.filter((t) => t !== tag))
  }

  const filteredTagGroups = tagGroups
    .map((group) => ({
      ...group,
      tags: group.tags.filter((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
    }))
    .filter((group) => group.tags.length > 0)

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">选择目标人群标签</h3>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索标签"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Tabs defaultValue="intention" className="mb-6">
              <TabsList className="grid grid-cols-4 mb-4">
                {tagGroups.slice(0, 4).map((group) => (
                  <TabsTrigger key={group.id} value={group.id}>
                    {group.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tagGroups.map((group) => (
                <TabsContent key={group.id} value={group.id} className="mt-0">
                  <div className="flex flex-wrap gap-2">
                    {group.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer py-1 px-3"
                        onClick={() => toggleTag(tag)}
                      >
                        {selectedTags.includes(tag) && <Check className="h-3 w-3 mr-1" />}
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <ScrollArea className="h-48 border rounded-md p-4 mb-4">
              <div className="space-y-4">
                {filteredTagGroups.length > 0 ? (
                  filteredTagGroups.map((group) => (
                    <div key={group.id} className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-500">{group.name}</h4>
                      <div className="flex flex-wrap gap-2">
                        {group.tags.map((tag) => (
                          <div key={tag} className="flex items-center space-x-2">
                            <Checkbox
                              id={`tag-${tag}`}
                              checked={selectedTags.includes(tag)}
                              onCheckedChange={() => toggleTag(tag)}
                            />
                            <Label htmlFor={`tag-${tag}`} className="text-sm font-normal">
                              {tag}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500">没有找到匹配的标签</div>
                )}
              </div>
            </ScrollArea>

            <div className="flex space-x-2 mt-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  className="pl-9"
                  placeholder="添加自定义标签"
                  onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
                />
              </div>
              <Button onClick={addCustomTag} disabled={!customTag.trim()}>
                添加
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-medium">标签匹配逻辑</h3>
            <p className="text-sm text-muted-foreground mb-2">选择多个标签之间的匹配关系</p>

            <RadioGroup
              value={tagOperator}
              onValueChange={(value) => onOperatorChange(value as "and" | "or")}
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
            <h3 className="text-base font-medium mb-2">已选择的标签</h3>
            <div className="min-h-[60px] border rounded-md p-3">
              {selectedTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">未选择任何标签</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <Badge key={tag} className="flex items-center gap-1 py-1 px-2">
                      {tag}
                      <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => removeTag(tag)}>
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
            <Button className="flex-1" onClick={onComplete} disabled={selectedTags.length === 0}>
              完成设置
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
