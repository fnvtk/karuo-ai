"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { CheckCircle2, ChevronDown, ChevronUp, Smartphone } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

export interface DeviceSelectionData {
  selectedDevices: string[]
  selectedDatabase: string
  selectedAudience: string
}

interface DeviceSelectionProps {
  initialData: DeviceSelectionData
  onSave: (data: DeviceSelectionData) => void
  onBack: () => void
}

// 模拟设备数据
const mockDevices = [
  { id: "1", name: "iPhone 13", status: "online", lastActive: "刚刚" },
  { id: "2", name: "华为 P40", status: "offline", lastActive: "3小时前" },
  { id: "3", name: "小米 11", status: "online", lastActive: "1小时前" },
  { id: "4", name: "OPPO Find X3", status: "offline", lastActive: "昨天" },
  { id: "5", name: "vivo X60", status: "online", lastActive: "刚刚" },
]

// 模拟数据库选项
const databaseOptions = [
  { id: "all", name: "全部客户" },
  { id: "new", name: "新客户" },
  { id: "vip", name: "VIP客户" },
]

// 模拟用户群体选项
const audienceOptions = [
  { id: "all", name: "全部好友" },
  { id: "active", name: "活跃好友" },
  { id: "inactive", name: "不活跃好友" },
  { id: "recent", name: "最近添加" },
]

export function DeviceSelection({ initialData, onSave, onBack }: DeviceSelectionProps) {
  const [formData, setFormData] = useState<DeviceSelectionData>(initialData)
  const [devices, setDevices] = useState(mockDevices)
  const [showAllDevices, setShowAllDevices] = useState(false)

  const toggleDevice = (deviceId: string) => {
    const newSelectedDevices = formData.selectedDevices.includes(deviceId)
      ? formData.selectedDevices.filter((id) => id !== deviceId)
      : [...formData.selectedDevices, deviceId]

    setFormData({ ...formData, selectedDevices: newSelectedDevices })
  }

  const selectAllDevices = () => {
    const allDeviceIds = devices.map((device) => device.id)
    setFormData({ ...formData, selectedDevices: allDeviceIds })
  }

  const clearDeviceSelection = () => {
    setFormData({ ...formData, selectedDevices: [] })
  }

  // 用于显示的设备
  const displayedDevices = showAllDevices ? devices : devices.slice(0, 3)

  return (
    <div className="space-y-6">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <Label className="text-base font-medium">选择点赞设备</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllDevices}>
                    全选
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearDeviceSelection}>
                    清空
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {displayedDevices.map((device) => (
                  <div
                    key={device.id}
                    className={`flex items-center p-3 rounded-md border cursor-pointer transition-colors ${
                      formData.selectedDevices.includes(device.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleDevice(device.id)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          device.status === "online" ? "bg-green-100" : "bg-gray-100"
                        }`}
                      >
                        <Smartphone
                          className={`h-4 w-4 ${device.status === "online" ? "text-green-600" : "text-gray-400"}`}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{device.name}</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant={device.status === "online" ? "success" : "secondary"} className="text-xs">
                            {device.status === "online" ? "在线" : "离线"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{device.lastActive}</span>
                        </div>
                      </div>
                    </div>

                    {formData.selectedDevices.includes(device.id) && <CheckCircle2 className="h-5 w-5 text-primary" />}
                  </div>
                ))}

                {devices.length > 3 && (
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => setShowAllDevices(!showAllDevices)}
                  >
                    {showAllDevices ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        收起
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        展开更多({devices.length - 3}台)
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">选择目标客户</Label>
                <p className="text-sm text-muted-foreground mb-2">选择需要点赞的目标客户群体</p>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {databaseOptions.find((option) => option.id === formData.selectedDatabase)?.name ||
                        "选择客户数据库"}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <ScrollArea className="h-[200px]">
                      {databaseOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.id}
                          onClick={() => setFormData({ ...formData, selectedDatabase: option.id })}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          {option.name}
                          {formData.selectedDatabase === option.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        </DropdownMenuItem>
                      ))}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div>
                <Label className="text-base font-medium">选择好友范围</Label>
                <p className="text-sm text-muted-foreground mb-2">选择需要点赞的好友范围</p>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {audienceOptions.find((option) => option.id === formData.selectedAudience)?.name ||
                        "选择好友范围"}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <ScrollArea className="h-[200px]">
                      {audienceOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.id}
                          onClick={() => setFormData({ ...formData, selectedAudience: option.id })}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          {option.name}
                          {formData.selectedAudience === option.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        </DropdownMenuItem>
                      ))}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex justify-between space-x-4">
              <Button variant="outline" className="flex-1" onClick={onBack}>
                上一步
              </Button>
              <Button
                className="flex-1"
                onClick={() => onSave(formData)}
                disabled={
                  formData.selectedDevices.length === 0 || !formData.selectedDatabase || !formData.selectedAudience
                }
              >
                下一步
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
