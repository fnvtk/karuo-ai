"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Smartphone, Users } from "lucide-react"

interface Device {
  id: string
  name: string
  status: "online" | "offline"
}

interface TrafficPool {
  id: string
  name: string
  deviceId: string
  deviceName: string
  type: "wechat" | "device"
  userCount: number
  lastUpdated: string
}

interface TrafficPoolSelectionProps {
  formData: any
  updateFormData: (data: any) => void
  onNext: () => void
}

export function TrafficPoolSelection({ formData, updateFormData, onNext }: TrafficPoolSelectionProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [trafficPools, setTrafficPools] = useState<TrafficPool[]>([])
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>(formData.deviceIds || [])
  const [selectedPoolIds, setSelectedPoolIds] = useState<string[]>(formData.trafficPoolIds || [])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("devices")

  useEffect(() => {
    // 模拟加载设备和流量池数据
    const fetchData = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockDevices: Device[] = [
        { id: "device-1", name: "iPhone 13 Pro", status: "online" },
        { id: "device-2", name: "Xiaomi 12", status: "online" },
        { id: "device-3", name: "Huawei P40", status: "offline" },
        { id: "device-4", name: "OPPO Find X3", status: "online" },
        { id: "device-5", name: "Samsung S21", status: "offline" },
      ]

      const mockTrafficPools: TrafficPool[] = [
        {
          id: "pool-1",
          name: "微信好友池-设备1",
          deviceId: "device-1",
          deviceName: "iPhone 13 Pro",
          type: "wechat",
          userCount: 156,
          lastUpdated: "2023-12-15T10:30:00Z",
        },
        {
          id: "pool-2",
          name: "设备流量池-设备1",
          deviceId: "device-1",
          deviceName: "iPhone 13 Pro",
          type: "device",
          userCount: 287,
          lastUpdated: "2023-12-14T15:45:00Z",
        },
        {
          id: "pool-3",
          name: "微信好友池-设备2",
          deviceId: "device-2",
          deviceName: "Xiaomi 12",
          type: "wechat",
          userCount: 203,
          lastUpdated: "2023-12-16T09:15:00Z",
        },
        {
          id: "pool-4",
          name: "设备流量池-设备3",
          deviceId: "device-3",
          deviceName: "Huawei P40",
          type: "device",
          userCount: 156,
          lastUpdated: "2023-12-13T14:20:00Z",
        },
        {
          id: "pool-5",
          name: "微信好友池-设备4",
          deviceId: "device-4",
          deviceName: "OPPO Find X3",
          type: "wechat",
          userCount: 178,
          lastUpdated: "2023-12-12T11:30:00Z",
        },
      ]

      setDevices(mockDevices)
      setTrafficPools(mockTrafficPools)
      setIsLoading(false)
    }

    fetchData()
  }, [])

  const handleDeviceToggle = (deviceId: string) => {
    setSelectedDeviceIds((prev) => {
      if (prev.includes(deviceId)) {
        return prev.filter((id) => id !== deviceId)
      } else {
        return [...prev, deviceId]
      }
    })
  }

  const handlePoolToggle = (poolId: string) => {
    setSelectedPoolIds((prev) => {
      if (prev.includes(poolId)) {
        return prev.filter((id) => id !== poolId)
      } else {
        return [...prev, poolId]
      }
    })
  }

  const filteredDevices = devices.filter((device) => device.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const filteredPools = trafficPools.filter(
    (pool) =>
      (selectedDeviceIds.length === 0 || selectedDeviceIds.includes(pool.deviceId)) &&
      pool.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleContinue = () => {
    const selectedPools = trafficPools.filter((pool) => selectedPoolIds.includes(pool.id))

    const totalUserCount = selectedPools.reduce((sum, pool) => sum + pool.userCount, 0)

    updateFormData({
      deviceIds: selectedDeviceIds,
      deviceNames: devices.filter((device) => selectedDeviceIds.includes(device.id)).map((device) => device.name),
      trafficPoolIds: selectedPoolIds,
      trafficPoolNames: selectedPools.map((pool) => pool.name),
      trafficPoolSize: totalUserCount,
    })

    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">选择流量池</h2>
        <p className="text-gray-500 text-sm">选择需要进行策略优化的设备和流量池</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="搜索设备或流量池"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="devices">设备选择</TabsTrigger>
          <TabsTrigger value="pools">流量池选择</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4 pt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
            </div>
          ) : filteredDevices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDevices.map((device) => (
                <Card
                  key={device.id}
                  className={`cursor-pointer transition-all ${
                    selectedDeviceIds.includes(device.id) ? "border-blue-500 shadow-sm" : "hover:border-gray-300"
                  }`}
                  onClick={() => handleDeviceToggle(device.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          device.status === "online" ? "bg-green-100" : "bg-gray-100"
                        }`}
                      >
                        <Smartphone
                          className={`h-5 w-5 ${device.status === "online" ? "text-green-600" : "text-gray-400"}`}
                        />
                      </div>
                      <div>
                        <p className="font-medium">{device.name}</p>
                        <Badge
                          variant="outline"
                          className={
                            device.status === "online"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          }
                        >
                          {device.status === "online" ? "在线" : "离线"}
                        </Badge>
                      </div>
                    </div>
                    <Checkbox
                      checked={selectedDeviceIds.includes(device.id)}
                      onCheckedChange={() => handleDeviceToggle(device.id)}
                      className="h-5 w-5"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">未找到匹配的设备</div>
          )}
        </TabsContent>

        <TabsContent value="pools" className="space-y-4 pt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
            </div>
          ) : filteredPools.length > 0 ? (
            <div className="space-y-4">
              {filteredPools.map((pool) => (
                <Card
                  key={pool.id}
                  className={`cursor-pointer transition-all ${
                    selectedPoolIds.includes(pool.id) ? "border-blue-500 shadow-sm" : "hover:border-gray-300"
                  }`}
                  onClick={() => handlePoolToggle(pool.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          pool.type === "wechat" ? "bg-green-100" : "bg-blue-100"
                        }`}
                      >
                        <Users className={`h-5 w-5 ${pool.type === "wechat" ? "text-green-600" : "text-blue-600"}`} />
                      </div>
                      <div>
                        <p className="font-medium">{pool.name}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>设备: {pool.deviceName}</span>
                          <span>•</span>
                          <span>用户数: {pool.userCount}</span>
                        </div>
                      </div>
                    </div>
                    <Checkbox
                      checked={selectedPoolIds.includes(pool.id)}
                      onCheckedChange={() => handlePoolToggle(pool.id)}
                      className="h-5 w-5"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {selectedDeviceIds.length > 0 ? "所选设备没有可用的流量池" : "请先选择设备或搜索流量池"}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-between pt-4">
        <div className="text-sm text-gray-500">
          已选择 {selectedDeviceIds.length} 个设备, {selectedPoolIds.length} 个流量池
        </div>
        <Button onClick={handleContinue} disabled={selectedPoolIds.length === 0}>
          继续
        </Button>
      </div>
    </div>
  )
}
