"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Search, Smartphone, Wifi, WifiOff } from "lucide-react"

interface Device {
  id: string
  name: string
  imei: string
  wechatId: string
  status: "online" | "offline"
  friendCount: number
  tags: string[]
}

interface DeviceSelectionProps {
  data: {
    selectedDevices: string[]
    deviceFilter: string
  }
  onUpdate: (data: any) => void
}

export default function DeviceSelection({ data, onUpdate }: DeviceSelectionProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(data.deviceFilter || "")
  const [selectedDevices, setSelectedDevices] = useState<string[]>(data.selectedDevices || [])

  // 模拟获取设备列表
  useEffect(() => {
    const fetchDevices = async () => {
      setLoading(true)
      try {
        // 模拟API调用
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const mockDevices: Device[] = [
          {
            id: "1",
            name: "设备1",
            imei: "sd123123",
            wechatId: "wxid_qc924n67",
            status: "online",
            friendCount: 1234,
            tags: ["主力设备"],
          },
          {
            id: "2",
            name: "设备2",
            imei: "sd456456",
            wechatId: "wxid_abc123",
            status: "offline",
            friendCount: 856,
            tags: ["备用设备"],
          },
          {
            id: "3",
            name: "设备3",
            imei: "sd789789",
            wechatId: "wxid_def456",
            status: "online",
            friendCount: 2103,
            tags: ["高效设备", "VIP"],
          },
        ]

        setDevices(mockDevices)
      } catch (error) {
        console.error("获取设备列表失败:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDevices()
  }, [])

  // 过滤设备
  const filteredDevices = devices.filter(
    (device) =>
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.wechatId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // 处理设备选择
  const handleDeviceToggle = (deviceId: string) => {
    const newSelected = selectedDevices.includes(deviceId)
      ? selectedDevices.filter((id) => id !== deviceId)
      : [...selectedDevices, deviceId]

    setSelectedDevices(newSelected)
    onUpdate({
      selectedDevices: newSelected,
      deviceFilter: searchTerm,
    })
  }

  // 全选/取消全选
  const handleSelectAll = () => {
    const allDeviceIds = filteredDevices.map((d) => d.id)
    const newSelected = selectedDevices.length === allDeviceIds.length ? [] : allDeviceIds
    setSelectedDevices(newSelected)
    onUpdate({
      selectedDevices: newSelected,
      deviceFilter: searchTerm,
    })
  }

  // 处理搜索
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    onUpdate({
      selectedDevices,
      deviceFilter: value,
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>选择设备</span>
            <Badge variant="secondary">已选择 {selectedDevices.length} 台设备</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 搜索框 */}
          <div className="space-y-2">
            <Label htmlFor="search">搜索设备</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="search"
                placeholder="搜索设备名称、微信号或标签..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={loading || filteredDevices.length === 0}
            >
              {selectedDevices.length === filteredDevices.length ? "取消全选" : "全选"}
            </Button>
            <span className="text-sm text-gray-500">共 {filteredDevices.length} 台设备</span>
          </div>

          {/* 设备列表 */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">加载中...</p>
                </div>
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="text-center py-8">
                <Smartphone className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">没有找到匹配的设备</p>
              </div>
            ) : (
              filteredDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleDeviceToggle(device.id)}
                >
                  <Checkbox
                    checked={selectedDevices.includes(device.id)}
                    onChange={() => handleDeviceToggle(device.id)}
                  />

                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900 truncate">{device.name}</p>
                      {device.status === "online" ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-gray-400" />
                      )}
                    </div>

                    <p className="text-sm text-gray-500 truncate">
                      {device.wechatId} • {device.friendCount} 好友
                    </p>

                    {device.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {device.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    <Badge variant={device.status === "online" ? "default" : "secondary"} className="text-xs">
                      {device.status === "online" ? "在线" : "离线"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
