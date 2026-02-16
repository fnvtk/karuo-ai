"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Plus, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"

export default function NewMaterialPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [content, setContent] = useState("")
  const [newTag, setNewTag] = useState("")
  const [tags, setTags] = useState<string[]>([])

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag])
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content) {
      toast({
        title: "错误",
        description: "请输入素材内容",
        variant: "destructive",
      })
      return
    }
    try {
      // 模拟保存新素材
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({
        title: "成功",
        description: "新素材已创建",
      })
      router.push(`/content/${params.id}/materials`)
    } catch (error) {
      console.error("Failed to create new material:", error)
      toast({
        title: "错误",
        description: "创建新素材失败",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium">新建素材</h1>
          </div>
        </div>
      </header>

      <div className="p-4">
        <Card className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="content">素材内容</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请输入素材内容"
                className="mt-1"
                rows={5}
              />
            </div>

            <div>
              <Label htmlFor="tags">标签</Label>
              <div className="flex items-center mt-1">
                <Input
                  id="tags"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="输入标签"
                  className="flex-1"
                />
                <Button type="button" onClick={handleAddTag} className="ml-2">
                  <Plus className="h-4 w-4" />
                  添加
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center">
                    {tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 ml-1 p-0"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full">
              保存素材
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
