"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HelpCircle, FileText, ImageIcon, Video, LinkIcon, FileAudio } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { ContentLibraryFormData } from "../page"

interface ContentSettingsProps {
  formData: ContentLibraryFormData
  updateFormData: (field: string, value: any) => void
  onNext: () => void
  onPrevious: () => void
}

export function ContentSettings({ formData, updateFormData, onNext, onPrevious }: ContentSettingsProps) {
  const contentTypes = [
    { id: "text", name: "文本", icon: FileText, description: "收集文本内容，如聊天记录、文章等" },
    { id: "image", name: "图片", icon: ImageIcon, description: "收集图片内容，如照片、截图等" },
    { id: "video", name: "视频", icon: Video, description: "收集视频内容，如短视频、直播回放等" },
    { id: "link", name: "链接", icon: LinkIcon, description: "收集链接内容，如网页链接、小程序链接等" },
    { id: "audio", name: "音频", icon: FileAudio, description: "收集音频内容，如语音消息、音乐等" },
  ]

  const handleContentTypeToggle = (type: string) => {
    const currentTypes = [...formData.contentTypes]
    if (currentTypes.includes(type)) {
      updateFormData(
        "contentTypes",
        currentTypes.filter((t) => t !== type),
      )
    } else {
      updateFormData("contentTypes", [...currentTypes, type])
    }
  }

  const handleAutoSyncChange = (checked: boolean) => {
    updateFormData("autoSync", checked)
  }

  const handleSyncIntervalChange = (value: string) => {
    updateFormData("syncInterval", Number.parseInt(value))
  }

  const isFormValid = formData.contentTypes.length > 0

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium">内容设置</h2>
              <p className="text-sm text-gray-500 mt-1">设置需要收集的内容类型和同步方式</p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-base">内容类型</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">选择需要收集的内容类型，可以多选。不同类型的内容将分别存储和管理。</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="mt-2 space-y-2">
                  {contentTypes.map((type) => (
                    <div
                      key={type.id}
                      className={`flex items-start space-x-2 p-3 border rounded-md ${
                        formData.contentTypes.includes(type.id) ? "bg-blue-50 border-blue-200" : "bg-white"
                      }`}
                    >
                      <Checkbox
                        id={`content-type-${type.id}`}
                        checked={formData.contentTypes.includes(type.id)}
                        onCheckedChange={() => handleContentTypeToggle(type.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor={`content-type-${type.id}`} className="font-medium flex items-center">
                          <type.icon className="h-4 w-4 mr-2" />
                          {type.name}
                        </Label>
                        <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {formData.contentTypes.length === 0 && (
                  <p className="text-sm text-red-500 mt-1">请至少选择一种内容类型</p>
                )}
              </div>

              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <Label htmlFor="auto-sync" className="font-medium">
                    自动同步
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">启用后，系统将按照设定的时间间隔自动同步内容</p>
                </div>
                <Switch id="auto-sync" checked={formData.autoSync} onCheckedChange={handleAutoSyncChange} />
              </div>

              {formData.autoSync && (
                <div>
                  <Label htmlFor="sync-interval" className="text-base">
                    同步间隔
                  </Label>
                  <Select value={formData.syncInterval.toString()} onValueChange={handleSyncIntervalChange}>
                    <SelectTrigger id="sync-interval" className="mt-1.5">
                      <SelectValue placeholder="选择同步间隔" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">每1小时</SelectItem>
                      <SelectItem value="6">每6小时</SelectItem>
                      <SelectItem value="12">每12小时</SelectItem>
                      <SelectItem value="24">每天</SelectItem>
                      <SelectItem value="168">每周</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          上一步
        </Button>
        <Button onClick={onNext} disabled={!isFormValid}>
          下一步
        </Button>
      </div>
    </div>
  )
}
