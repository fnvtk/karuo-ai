"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Battery, Smartphone, MessageCircle, Users, Clock } from "lucide-react"

export interface Device {
  id: string
  imei: string
  name: string
  status: "online" | "offline"
  battery: number
  wechatId: string
  friendCount: number
  todayAdded: number
  messageCount: number
  lastActive: string
  addFriendStatus: "normal" | "abnormal"
}

interface DeviceGridProps {
  devices: Device[]
  selectable?: boolean
  selectedDevices?: string[]
  onSelect?: (deviceIds: string[]) => void
  itemsPerRow?: number
}

export function DeviceGrid({
  devices,
  selectable = false,
  selectedDevices = [],
  onSelect,
  itemsPerRow = 2,
}: DeviceGridProps) {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)

  const handleSelectAll = () => {
    if (selectedDevices.length === devices.length) {
      onSelect?.([])
    } else {
      onSelect?.(devices.map((d) => d.id))
    }
  }

  return (
    <div className="space-y-4">
      {selectable && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={selectedDevices.length === devices.length && devices.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm">全选</span>
          </div>
          <span className="text-sm text-gray-500">已选择 {selectedDevices.length} 个设备</span>
        </div>
      )}

      <div className={`grid grid-cols-${itemsPerRow} gap-4`}>
        {devices.map((device) => (
          <Card
            key={device.id}
            className={`p-4 hover:shadow-md transition-all cursor-pointer ${
              selectedDevices.includes(device.id) ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => {
              if (selectable) {
                const newSelection = selectedDevices.includes(device.id)
                  ? selectedDevices.filter((id) => id !== device.id)
                  : [...selectedDevices, device.id]
                onSelect?.(newSelection)
              } else {
                setSelectedDevice(device)
              }
            }}
          >
            <div className="flex items-start space-x-3">
              {selectable && (
                <Checkbox
                  checked={selectedDevices.includes(device.id)}
                  className="mt-1"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{device.name}</div>
                  <Badge variant={device.status === "online" ? "success" : "secondary"}>
                    {device.status === "online" ? "在线" : "离线"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Battery className={`w-4 h-4 ${device.battery < 20 ? "text-red-500" : "text-green-500"}`} />
                    <span>{device.battery}%</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{device.friendCount}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="w-4 h-4" />
                    <span>{device.messageCount}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>+{device.todayAdded}</span>
                  </div>
                </div>

                <div className="text-sm text-gray-500">
                  <div>IMEI: {device.imei}</div>
                  <div>微信号: {device.wechatId}</div>
                </div>

                <Badge variant={device.addFriendStatus === "normal" ? "outline" : "destructive"} className="mt-2">
                  {device.addFriendStatus === "normal" ? "加友正常" : "加友异常"}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedDevice} onOpenChange={() => setSelectedDevice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设备详情</DialogTitle>
          </DialogHeader>
          {selectedDevice && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-medium">{selectedDevice.name}</h3>
                    <p className="text-sm text-gray-500">IMEI: {selectedDevice.imei}</p>
                  </div>
                </div>
                <Badge variant={selectedDevice.status === "online" ? "success" : "secondary"}>
                  {selectedDevice.status === "online" ? "在线" : "离线"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">电池电量</div>
                  <div className="flex items-center space-x-2">
                    <Battery className={`w-5 h-5 ${selectedDevice.battery < 20 ? "text-red-500" : "text-green-500"}`} />
                    <span className="font-medium">{selectedDevice.battery}%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">好友数量</div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">{selectedDevice.friendCount}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">今日新增</div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-green-500" />
                    <span className="font-medium">+{selectedDevice.todayAdded}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">消息数量</div>
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="w-5 h-5 text-purple-500" />
                    <span className="font-medium">{selectedDevice.messageCount}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-gray-500">微信账号</div>
                <div className="font-medium">{selectedDevice.wechatId}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-gray-500">最后活跃</div>
                <div className="font-medium">{selectedDevice.lastActive}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-gray-500">加友状态</div>
                <Badge variant={selectedDevice.addFriendStatus === "normal" ? "outline" : "destructive"}>
                  {selectedDevice.addFriendStatus === "normal" ? "加友正常" : "加友异常"}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
