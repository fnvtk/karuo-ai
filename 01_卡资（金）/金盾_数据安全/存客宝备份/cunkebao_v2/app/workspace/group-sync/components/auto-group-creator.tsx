"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Users } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export function AutoGroupCreator() {
  const { toast } = useToast()
  const [groupName, setGroupName] = useState("")
  const [welcomeMessage, setWelcomeMessage] = useState("欢迎加入我们的群聊！")
  const [groupSize, setGroupSize] = useState(50)
  const [groupType, setGroupType] = useState("business")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  const handleAddTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleCreateGroup = () => {
    if (!groupName) {
      toast({
        title: "请输入群名称",
        variant: "destructive",
      })
      return
    }

    // 模拟创建群聊
    toast({
      title: "群聊创建成功",
      description: `已成功创建"${groupName}"群聊`,
    })

    // 重置表单
    setGroupName("")
    setWelcomeMessage("欢迎加入我们的群聊！")
    setGroupSize(50)
    setGroupType("business")
    setTags([])
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="mr-2 h-5 w-5" />
          自动建群
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="group-name">群聊名称</Label>
          <Input
            id="group-name"
            placeholder="请输入群聊名称"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="welcome-message">欢迎语</Label>
          <Textarea
            id="welcome-message"
            placeholder="请输入群欢迎语"
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="group-size">群人数上限</Label>
            <Input
              id="group-size"
              type="number"
              min={1}
              max={500}
              value={groupSize}
              onChange={(e) => setGroupSize(Number.parseInt(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-type">群类型</Label>
            <Select value={groupType} onValueChange={setGroupType}>
              <SelectTrigger id="group-type">
                <SelectValue placeholder="选择群类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business">业务群</SelectItem>
                <SelectItem value="customer">客户群</SelectItem>
                <SelectItem value="team">团队群</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>群标签</Label>
          <div className="flex space-x-2">
            <Input
              placeholder="添加标签"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
            />
            <Button type="button" size="sm" onClick={handleAddTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
              </Badge>
            ))}
          </div>
        </div>

        <Button className="w-full mt-4" onClick={handleCreateGroup}>
          创建群聊
        </Button>
      </CardContent>
    </Card>
  )
}
