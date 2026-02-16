"use client"

import { useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { Search, Smartphone, Wifi, WifiOff, Clock, Battery, MapPin, Users, X } from "lucide-react"

interface Device {
  id: string
  name: string
  status: "online" | "offline" | "busy"
  battery: number
  location: string
  wechatAccounts: number
  dailyAddLimit: number
  todayAdded: number
  lastActiveTime: string
  model: string
  version: string
}

interface MultiDeviceSelectorProps {
  devices: Device[]
  selectedDevices: string[]
  onDeviceSelect: (deviceIds: string[]) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MultiDeviceSelector({
  devices,
  selectedDevices,
  onDeviceSelect,
  open,
  onOpenChange,
}: MultiDeviceSelectorProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [tempSelectedDevices, setTempSelectedDevices] = useState<string[]>(selectedDevices)

  // 过滤设备
  const filteredDevices = devices.filter(
    (device) =>
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.model.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // 处理设备选择
  const handleDeviceToggle = useCallback((deviceId: string, checked: boolean) => {
    setTempSelectedDevices((prev) => (checked ? [...prev, deviceId] : prev.filter((id) => id !== deviceId)))
  }, [])

  // 处理全选
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setTempSelectedDevices(filteredDevices.map((device) => device.id))
      } else {
        setTempSelectedDevices([])
      }
    },
    [filteredDevices],
  )

  // 处理确认选择
  const handleConfirm = () => {
    onDeviceSelect(tempSelectedDevices)
    onOpenChange(false)
    toast({
      title: "设备选择成功",
      description: `已选择 ${tempSelectedDevices.length} 个设备`,
    })
  }

  // 处理取消
  const handleCancel = () => {
    setTempSelectedDevices(selectedDevices)
    onOpenChange(false)
  }

  // 获取设备状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <Wifi className="h-4 w-4 text-green-500" />
      case "offline":
        return <WifiOff className="h-4 w-4 text-gray-500" />
      case "busy":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />
    }
  }

  // 获取设备状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case "online":
        return "在线"
      case "offline":
        return "离线"
      case "busy":
        return "忙碌"
      default:
        return "未知"
    }
  }

  // 获取设备状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-100 text-green-800"
      case "offline":
        return "bg-gray-100 text-gray-800"
      case "busy":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // 获取电池颜色
  const getBatteryColor = (battery: number) => {
    if (battery > 50) return "text-green-600"
    if (battery > 20) return "text-yellow-600"
    return "text-red-600"
  }

  // 格式化时间
  const formatTime = (timeString: string) => {
    const date = new Date(timeString)
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  // 设备卡片组件
  const DeviceCard = ({ device }: { device: Device }) => {
    const isSelected = tempSelectedDevices.includes(device.id)

    return (
      <Card
        className={`p-4 cursor-pointer transition-all ${isSelected ? "border-blue-500 bg-blue-50" : "hover:shadow-md"}`}
        onClick={() => handleDeviceToggle(device.id, !isSelected)}
      >
        <div className="flex items-start space-x-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => handleDeviceToggle(device.id, checked as boolean)}
            onClick={(e) => e.stopPropagation()}
          />

          <div className="flex-1 min-w-0">
            {/* 设备名称和状态 */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4 text-gray-600" />
                <span className="font-medium">{device.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                {getStatusIcon(device.status)}
                <Badge className={getStatusColor(device.status)} variant="outline">
                  {getStatusText(device.status)}
                </Badge>
              </div>
            </div>

            {/* 设备信息 */}
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
              <div className="flex items-center">
                <Battery className={`h-3 w-3 mr-1 ${getBatteryColor(device.battery)}`} />
                <span>电量 {device.battery}%</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                <span>{device.location}</span>
              </div>
              <div className="flex items-center">
                <Users className="h-3 w-3 mr-1" />
                <span>{device.wechatAccounts} 个微信号</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                <span>{formatTime(device.lastActiveTime)}</span>
              </div>
            </div>

            {/* 设备型号和版本 */}
            <div className="text-xs text-gray-500 mb-2">
              {device.model} • {device.version}
            </div>

            {/* 添加限制信息 */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">
                今日添加: {device.todayAdded}/{device.dailyAddLimit}
              </span>
              <div className="w-16 bg-gray-200 rounded-full h-1">
                <div
                  className="bg-blue-500 h-1 rounded-full"
                  style={{ width: `${(device.todayAdded / device.dailyAddLimit) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>选择设备</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 搜索栏 */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索设备名称、位置或型号"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* 操作栏 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={
                  filteredDevices.length > 0 &&
                  filteredDevices.every((device) => tempSelectedDevices.includes(device.id))
                }
                onCheckedChange={handleSelectAll}
                id="select-all-devices"
              />
              <label htmlFor="select-all-devices" className="text-sm font-medium">
                全选当前页
              </label>
            </div>
            <div className="text-sm text-gray-500">
              已选择 {tempSelectedDevices.length} / {filteredDevices.length} 个设备
            </div>
          </div>

          {/* 已选择设备标签 */}
          {tempSelectedDevices.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-md">
              <span className="text-sm font-medium text-blue-800">已选择设备:</span>
              {tempSelectedDevices.map((deviceId) => {
                const device = devices.find((d) => d.id === deviceId)
                return device ? (
                  <Badge
                    key={deviceId}
                    variant="outline"
                    className="bg-white cursor-pointer"
                    onClick={() => handleDeviceToggle(deviceId, false)}
                  >
                    {device.name}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ) : null
              })}
            </div>
          )}

          {/* 设备列表 */}
          <ScrollArea className="h-[400px]">
            <div className="grid gap-3">
              {filteredDevices.map((device) => (
                <DeviceCard key={device.id} device={device} />
              ))}

              {filteredDevices.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? "未找到匹配的设备" : "暂无可用设备"}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={tempSelectedDevices.length === 0}>
            确认选择 ({tempSelectedDevices.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
