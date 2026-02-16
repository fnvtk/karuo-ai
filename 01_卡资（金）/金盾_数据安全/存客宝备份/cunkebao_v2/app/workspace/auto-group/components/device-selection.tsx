"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Smartphone, Loader2, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useMobile } from "@/hooks/use-mobile"

interface Device {
  id: string
  name: string
  status: "online" | "offline" | "busy"
  lastActive: string
  type: "android" | "ios"
  number?: string
}

// 模拟设备数据
const mockDevices: Device[] = [
  {
    id: "device-1",
    name: "设备1",
    status: "online",
    lastActive: "2023-05-15 14:30",
    type: "android",
    number: "13812345678",
  },
  {
    id: "device-2",
    name: "设备2",
    status: "offline",
    lastActive: "2023-05-14 09:15",
    type: "ios",
    number: "13987654321",
  },
  {
    id: "device-3",
    name: "设备3",
    status: "busy",
    lastActive: "2023-05-15 11:45",
    type: "android",
    number: "15612345678",
  },
  {
    id: "device-4",
    name: "设备4",
    status: "online",
    lastActive: "2023-05-15 13:20",
    type: "android",
    number: "18712345678",
  },
  {
    id: "device-5",
    name: "设备5",
    status: "online",
    lastActive: "2023-05-15 10:05",
    type: "ios",
    number: "13612345678",
  },
]

interface DeviceSelectionProps {
  onNext: () => void
  onPrevious: () => void
  initialSelectedDevices?: string[]
  onDevicesChange: (deviceIds: string[]) => void
}

export function DeviceSelection({
  onNext,
  onPrevious,
  initialSelectedDevices = [],
  onDevicesChange,
}: DeviceSelectionProps) {
  const isMobile = useMobile()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDevices, setSelectedDevices] = useState<string[]>(initialSelectedDevices)
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline" | "busy">("all")

  useEffect(() => {
    const fetchDevices = async () => {
      setLoading(true)
      try {
        // 模拟API调用
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setDevices(mockDevices)
      } catch (error) {
        console.error("获取设备失败:", error)
        setError("获取设备列表失败，请稍后重试")
      } finally {
        setLoading(false)
      }
    }

    fetchDevices()
  }, [])

  useEffect(() => {
    // 只在设备选择变化时通知父组件，而不是每次渲染
    const currentSelection = JSON.stringify(selectedDevices)
    const prevSelection = JSON.stringify(initialSelectedDevices)

    if (currentSelection !== prevSelection) {
      onDevicesChange(selectedDevices)
    }
  }, [selectedDevices, initialSelectedDevices, onDevicesChange])

  const handleDeviceToggle = (deviceId: string) => {
    setSelectedDevices((prev) => (prev.includes(deviceId) ? prev.filter((id) => id !== deviceId) : [...prev, deviceId]))
  }

  const handleSelectAll = () => {
    if (selectedDevices.length === filteredDevices.length) {
      setSelectedDevices([])
    } else {
      setSelectedDevices(filteredDevices.map((device) => device.id))
    }
  }

  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (device.number && device.number.includes(searchQuery))
    const matchesStatus = statusFilter === "all" || device.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: Device["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500/10 text-green-500"
      case "offline":
        return "bg-gray-500/10 text-gray-500"
      case "busy":
        return "bg-yellow-500/10 text-yellow-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  const getStatusText = (status: Device["status"]) => {
    switch (status) {
      case "online":
        return "在线"
      case "offline":
        return "离线"
      case "busy":
        return "忙碌"
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">选择设备</Label>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={filteredDevices.length === 0}>
                  {selectedDevices.length === filteredDevices.length && filteredDevices.length > 0
                    ? "取消全选"
                    : "全选"}
                </Button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索设备名称或手机号"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="all">全部状态</option>
                  <option value="online">在线</option>
                  <option value="offline">离线</option>
                  <option value="busy">忙碌</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
                <span>正在加载设备列表...</span>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : filteredDevices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">未找到匹配的设备</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {filteredDevices.map((device) => (
                  <div
                    key={device.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedDevices.includes(device.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                    }`}
                    onClick={() => handleDeviceToggle(device.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5">
                          {selectedDevices.includes(device.id) ? (
                            <CheckCircle2 className="h-5 w-5 text-blue-500" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium flex items-center">
                            {device.name}
                            <Badge variant="outline" className={`ml-2 ${getStatusColor(device.status)}`}>
                              {getStatusText(device.status)}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {device.number && <div>手机号: {device.number}</div>}
                            <div>最后活跃: {device.lastActive}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Smartphone
                          className={`h-5 w-5 ${device.status === "online" ? "text-green-500" : "text-gray-400"}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-gray-500">
                已选择 {selectedDevices.length} / {filteredDevices.length} 个设备
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          上一步
        </Button>
        <Button onClick={onNext} className="bg-blue-500 hover:bg-blue-600" disabled={selectedDevices.length === 0}>
          下一步
        </Button>
      </div>
    </div>
  )
}
