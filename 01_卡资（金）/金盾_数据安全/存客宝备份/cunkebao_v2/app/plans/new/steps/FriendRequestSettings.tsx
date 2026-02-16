"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HelpCircle, MessageSquare, AlertCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChevronsUpDown } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface FriendRequestSettingsProps {
  formData: any
  onChange: (data: any) => void
  onNext: () => void
  onPrev: () => void
}

// 招呼语模板
const greetingTemplates = [
  "你好，请通过",
  "你好,了解XX,请通过",
  "你好，我是XX产品的客服请通过",
  "你好，感谢关注我们的产品",
  "你好，很高兴为您服务",
]

// 备注类型选项
const remarkTypes = [
  { value: "phone", label: "手机号" },
  { value: "nickname", label: "昵称" },
  { value: "source", label: "来源" },
]

// 模拟设备数据
const mockDevices = [
  { id: "1", name: "iPhone 13 Pro", status: "online" },
  { id: "2", name: "Xiaomi 12", status: "online" },
  { id: "3", name: "Huawei P40", status: "offline" },
  { id: "4", name: "OPPO Find X3", status: "online" },
  { id: "5", name: "Samsung S21", status: "online" },
]

export function FriendRequestSettings({ formData, onChange, onNext, onPrev }: FriendRequestSettingsProps) {
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [hasWarnings, setHasWarnings] = useState(false)
  const [isDeviceSelectorOpen, setIsDeviceSelectorOpen] = useState(false)
  const [selectedDevices, setSelectedDevices] = useState<any[]>(formData.selectedDevices || [])

  // 获取场景标题
  const getScenarioTitle = () => {
    switch (formData.scenario) {
      case "douyin":
        return "抖音直播"
      case "xiaohongshu":
        return "小红书"
      case "weixinqun":
        return "微信群"
      case "gongzhonghao":
        return "公众号"
      default:
        return formData.planName || "获客计划"
    }
  }

  // 使用useEffect设置默认值
  useEffect(() => {
    if (!formData.greeting) {
      onChange({
        ...formData,
        greeting: "你好，请通过",
        remarkType: "phone", // 默认选择手机号
        remarkFormat: `手机号+${getScenarioTitle()}`, // 默认备注格式
        addFriendInterval: 1,
      })
    }
  }, [formData, formData.greeting, onChange])

  // 检查是否有未完成的必填项
  useEffect(() => {
    const hasIncompleteFields = !formData.greeting?.trim()
    setHasWarnings(hasIncompleteFields)
  }, [formData])

  const handleTemplateSelect = (template: string) => {
    onChange({ ...formData, greeting: template })
    setIsTemplateDialogOpen(false)
  }

  const handleNext = () => {
    // 即使有警告也允许进入下一步，但会显示提示
    onNext()
  }

  const toggleDeviceSelection = (device: any) => {
    const isSelected = selectedDevices.some((d) => d.id === device.id)
    let newSelectedDevices

    if (isSelected) {
      newSelectedDevices = selectedDevices.filter((d) => d.id !== device.id)
    } else {
      newSelectedDevices = [...selectedDevices, device]
    }

    setSelectedDevices(newSelectedDevices)
    onChange({ ...formData, selectedDevices: newSelectedDevices })
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <Label className="text-base">选择设备</Label>
          <div className="relative mt-2">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => setIsDeviceSelectorOpen(!isDeviceSelectorOpen)}
            >
              {selectedDevices.length ? `已选择 ${selectedDevices.length} 个设备` : "选择设备"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>

            {isDeviceSelectorOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                <div className="p-2">
                  <Input placeholder="搜索设备..." className="mb-2" />
                  <div className="max-h-60 overflow-auto">
                    {mockDevices.map((device) => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => toggleDeviceSelection(device)}
                      >
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedDevices.some((d) => d.id === device.id)}
                            onCheckedChange={() => toggleDeviceSelection(device)}
                          />
                          <span>{device.name}</span>
                        </div>
                        <span className={`text-xs ${device.status === "online" ? "text-green-500" : "text-gray-400"}`}>
                          {device.status === "online" ? "在线" : "离线"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <Label className="text-base">好友备注</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>设置添加好友时的备注格式</p>
                  <p className="mt-1">备注格式预览：</p>
                  <p>{formData.remarkType === "phone" && `138****1234+${getScenarioTitle()}`}</p>
                  <p>{formData.remarkType === "nickname" && `小红书用户2851+${getScenarioTitle()}`}</p>
                  <p>{formData.remarkType === "source" && `抖音直播+${getScenarioTitle()}`}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select
            value={formData.remarkType || "phone"}
            onValueChange={(value) => onChange({ ...formData, remarkType: value })}
          >
            <SelectTrigger className="w-full mt-2">
              <SelectValue placeholder="选择备注类型" />
            </SelectTrigger>
            <SelectContent>
              {remarkTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label className="text-base">招呼语</Label>
            <Button variant="ghost" size="sm" onClick={() => setIsTemplateDialogOpen(true)} className="text-blue-500">
              <MessageSquare className="h-4 w-4 mr-2" />
              参考模板
            </Button>
          </div>
          <Input
            value={formData.greeting}
            onChange={(e) => onChange({ ...formData, greeting: e.target.value })}
            placeholder="请输入招呼语"
            className="mt-2"
          />
        </div>

        <div>
          <Label className="text-base">添加间隔</Label>
          <div className="flex items-center space-x-2 mt-2">
            <Input
              type="number"
              value={formData.addFriendInterval || 1}
              onChange={(e) => onChange({ ...formData, addFriendInterval: Number(e.target.value) })}
              className="w-32"
            />
            <span>分钟</span>
          </div>
        </div>

        <div>
          <Label className="text-base">允许加人的时间段</Label>
          <div className="flex items-center space-x-2 mt-2">
            <Input
              type="time"
              value={formData.addFriendTimeStart || "09:00"}
              onChange={(e) => onChange({ ...formData, addFriendTimeStart: e.target.value })}
              className="w-32"
            />
            <span>至</span>
            <Input
              type="time"
              value={formData.addFriendTimeEnd || "18:00"}
              onChange={(e) => onChange({ ...formData, addFriendTimeEnd: e.target.value })}
              className="w-32"
            />
          </div>
        </div>

        {hasWarnings && (
          <Alert variant="warning" className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription>您有未完成的设置项，建议完善后再进入下一步。</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onPrev}>
            上一步
          </Button>
          <Button onClick={handleNext}>下一步</Button>
        </div>
      </div>

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>招呼语模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {greetingTemplates.map((template, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start h-auto py-3 px-4"
                onClick={() => handleTemplateSelect(template)}
              >
                {template}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
