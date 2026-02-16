"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { ContentLibraryFormData } from "../page"

interface BasicSettingsProps {
  formData: ContentLibraryFormData
  updateFormData: (field: string, value: any) => void
  onNext: () => void
}

export function BasicSettings({ formData, updateFormData, onNext }: BasicSettingsProps) {
  const isFormValid = formData.name.trim() !== ""

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium">基础设置</h2>
              <p className="text-sm text-gray-500 mt-1">设置内容库的基本信息</p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="name" className="text-base">
                    内容库名称
                  </Label>
                  <span className="text-sm text-gray-500">必填</span>
                </div>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                  placeholder="请输入内容库名称"
                  className="mt-1.5"
                />
                {formData.name.trim() === "" && <p className="text-sm text-red-500 mt-1">请输入内容库名称</p>}
              </div>

              <div>
                <Label htmlFor="description" className="text-base">
                  内容库描述
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData("description", e.target.value)}
                  placeholder="请输入内容库描述（选填）"
                  className="mt-1.5 min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base">内容库类型</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">选择内容库的类型，不同类型的内容库适用于不同的场景。</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <RadioGroup
                  value={formData.type}
                  onValueChange={(value) => updateFormData("type", value)}
                  className="mt-2"
                >
                  <div className="flex items-start space-x-2 p-3 border rounded-md">
                    <RadioGroupItem value="friends" id="friends" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="friends" className="font-medium">
                        微信好友
                      </Label>
                      <p className="text-sm text-gray-500 mt-1">从微信好友中收集内容，适用于个人互动和一对一营销</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 p-3 border rounded-md mt-2">
                    <RadioGroupItem value="groups" id="groups" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="groups" className="font-medium">
                        微信群
                      </Label>
                      <p className="text-sm text-gray-500 mt-1">从微信群中收集内容，适用于群组互动和社群营销</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 p-3 border rounded-md mt-2">
                    <RadioGroupItem value="moments" id="moments" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="moments" className="font-medium">
                        朋友圈
                      </Label>
                      <p className="text-sm text-gray-500 mt-1">从朋友圈中收集内容，适用于社交媒体营销和品牌曝光</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 p-3 border rounded-md mt-2">
                    <RadioGroupItem value="mixed" id="mixed" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="mixed" className="font-medium">
                        混合来源
                      </Label>
                      <p className="text-sm text-gray-500 mt-1">从多种来源收集内容，适用于全方位的内容收集和分析</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <Label htmlFor="enabled" className="font-medium">
                    启用状态
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">设置内容库的初始状态，可以随时更改</p>
                </div>
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => updateFormData("enabled", checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!isFormValid}>
          下一步
        </Button>
      </div>
    </div>
  )
}
