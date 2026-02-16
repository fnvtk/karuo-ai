"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, ImageIcon, Video, LinkIcon, FileAudio, Tag, Clock, Check, X } from "lucide-react"
import Image from "next/image"
import type { ContentLibraryFormData } from "../page"

interface PreviewAndConfirmProps {
  formData: ContentLibraryFormData
  onSubmit: () => void
  onPrevious: () => void
}

export function PreviewAndConfirm({ formData, onSubmit, onPrevious }: PreviewAndConfirmProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case "text":
        return <FileText className="h-4 w-4" />
      case "image":
        return <ImageIcon className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      case "link":
        return <LinkIcon className="h-4 w-4" />
      case "audio":
        return <FileAudio className="h-4 w-4" />
      default:
        return null
    }
  }

  const getContentTypeName = (type: string) => {
    switch (type) {
      case "text":
        return "文本"
      case "image":
        return "图片"
      case "video":
        return "视频"
      case "link":
        return "链接"
      case "audio":
        return "音频"
      default:
        return type
    }
  }

  const getLibraryTypeName = (type: string) => {
    switch (type) {
      case "friends":
        return "微信好友"
      case "groups":
        return "微信群"
      case "moments":
        return "朋友圈"
      case "mixed":
        return "混合来源"
      default:
        return type
    }
  }

  const getSyncIntervalText = (hours: number) => {
    if (hours === 1) return "每1小时"
    if (hours === 6) return "每6小时"
    if (hours === 12) return "每12小时"
    if (hours === 24) return "每天"
    if (hours === 168) return "每周"
    return `每${hours}小时`
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium">预览确认</h2>
              <p className="text-sm text-gray-500 mt-1">请确认内容库的设置信息，确认无误后点击"创建内容库"</p>
            </div>

            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">基础信息</TabsTrigger>
                <TabsTrigger value="sources">来源信息</TabsTrigger>
                <TabsTrigger value="content">内容设置</TabsTrigger>
                <TabsTrigger value="tags">标签信息</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="p-4 border rounded-md mt-4 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">内容库名称</h3>
                  <p className="mt-1">{formData.name}</p>
                </div>

                {formData.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">内容库描述</h3>
                    <p className="mt-1">{formData.description}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-500">内容库类型</h3>
                  <p className="mt-1">{getLibraryTypeName(formData.type)}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">启用状态</h3>
                  <div className="flex items-center mt-1">
                    {formData.enabled ? (
                      <>
                        <Check className="h-4 w-4 text-green-500 mr-1" />
                        <span>已启用</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-red-500 mr-1" />
                        <span>已禁用</span>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sources" className="p-4 border rounded-md mt-4 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">已选择的来源</h3>
                  <div className="mt-2 space-y-2">
                    {formData.sources.length > 0 ? (
                      formData.sources.map((source) => (
                        <div key={source.id} className="flex items-center space-x-2 p-2 border rounded-md">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden">
                            <Image
                              src={source.avatar || "/placeholder.svg"}
                              alt={source.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{source.name}</p>
                            <p className="text-xs text-gray-500">
                              {source.type === "friend" ? "微信好友" : source.type === "group" ? "微信群" : "公众号"}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">未选择任何来源</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">来源总数</h3>
                  <p className="mt-1">{formData.sources.length} 个来源</p>
                </div>
              </TabsContent>

              <TabsContent value="content" className="p-4 border rounded-md mt-4 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">内容类型</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.contentTypes.map((type) => (
                      <Badge key={type} variant="outline" className="flex items-center gap-1">
                        {getContentTypeIcon(type)}
                        {getContentTypeName(type)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">同步设置</h3>
                  <div className="flex items-center mt-1">
                    {formData.autoSync ? (
                      <>
                        <Check className="h-4 w-4 text-green-500 mr-1" />
                        <span>自动同步</span>
                        <Badge variant="outline" className="ml-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getSyncIntervalText(formData.syncInterval)}
                        </Badge>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-red-500 mr-1" />
                        <span>手动同步</span>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tags" className="p-4 border rounded-md mt-4 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">标签</h3>
                  {formData.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">未添加任何标签</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          上一步
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "创建中..." : "创建内容库"}
        </Button>
      </div>
    </div>
  )
}
