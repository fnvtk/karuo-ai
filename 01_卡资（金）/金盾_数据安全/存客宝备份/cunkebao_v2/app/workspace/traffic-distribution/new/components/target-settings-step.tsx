"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar } from "@/components/ui/avatar"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface Device {
  id: string
  name: string
  status: "online" | "offline"
  avatar?: string
}

interface CustomerService {
  id: string
  name: string
  status: "online" | "offline"
  avatar?: string
}

interface TargetSettingsStepProps {
  onNext: (data: any) => void
  onBack: () => void
  initialData?: any
}

export default function TargetSettingsStep({ onNext, onBack, initialData = {} }: TargetSettingsStepProps) {
  const [selectedDevices, setSelectedDevices] = useState<string[]>(initialData.selectedDevices || [])
  const [selectedCustomerServices, setSelectedCustomerServices] = useState<string[]>(
    initialData.selectedCustomerServices || [],
  )
  const [searchTerm, setSearchTerm] = useState("")

  // 模拟设备数据
  const devices: Device[] = [
    { id: "1", name: "设备 1", status: "online" },
    { id: "2", name: "设备 2", status: "online" },
    { id: "3", name: "设备 3", status: "offline" },
    { id: "4", name: "设备 4", status: "online" },
    { id: "5", name: "设备 5", status: "offline" },
  ]

  // 模拟客服数据
  const customerServices: CustomerService[] = [
    { id: "1", name: "客服 A", status: "online" },
    { id: "2", name: "客服 B", status: "online" },
    { id: "3", name: "客服 C", status: "offline" },
    { id: "4", name: "客服 D", status: "online" },
  ]

  const filteredDevices = devices.filter((device) => device.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const filteredCustomerServices = customerServices.filter((cs) =>
    cs.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const toggleDevice = (id: string) => {
    setSelectedDevices((prev) => (prev.includes(id) ? prev.filter((deviceId) => deviceId !== id) : [...prev, id]))
  }

  const toggleCustomerService = (id: string) => {
    setSelectedCustomerServices((prev) => (prev.includes(id) ? prev.filter((csId) => csId !== id) : [...prev, id]))
  }

  const handleSubmit = () => {
    onNext({
      selectedDevices,
      selectedCustomerServices,
    })
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-bold mb-6">目标设置</h2>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="搜索设备或客服"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="devices" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="devices">设备选择</TabsTrigger>
          <TabsTrigger value="customerService">客服选择</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {filteredDevices.map((device) => (
              <Card
                key={device.id}
                className={`cursor-pointer border ${selectedDevices.includes(device.id) ? "border-blue-500" : "border-gray-200"}`}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <div
                        className={`w-full h-full flex items-center justify-center ${device.status === "online" ? "bg-green-100" : "bg-gray-100"}`}
                      >
                        <span className={`text-sm ${device.status === "online" ? "text-green-600" : "text-gray-600"}`}>
                          {device.name.substring(0, 1)}
                        </span>
                      </div>
                    </Avatar>
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className={`text-xs ${device.status === "online" ? "text-green-600" : "text-gray-500"}`}>
                        {device.status === "online" ? "在线" : "离线"}
                      </p>
                    </div>
                  </div>
                  <Checkbox
                    checked={selectedDevices.includes(device.id)}
                    onCheckedChange={() => toggleDevice(device.id)}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="customerService" className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {filteredCustomerServices.map((cs) => (
              <Card
                key={cs.id}
                className={`cursor-pointer border ${selectedCustomerServices.includes(cs.id) ? "border-blue-500" : "border-gray-200"}`}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <div
                        className={`w-full h-full flex items-center justify-center ${cs.status === "online" ? "bg-green-100" : "bg-gray-100"}`}
                      >
                        <span className={`text-sm ${cs.status === "online" ? "text-green-600" : "text-gray-600"}`}>
                          {cs.name.substring(0, 1)}
                        </span>
                      </div>
                    </Avatar>
                    <div>
                      <p className="font-medium">{cs.name}</p>
                      <p className={`text-xs ${cs.status === "online" ? "text-green-600" : "text-gray-500"}`}>
                        {cs.status === "online" ? "在线" : "离线"}
                      </p>
                    </div>
                  </div>
                  <Checkbox
                    checked={selectedCustomerServices.includes(cs.id)}
                    onCheckedChange={() => toggleCustomerService(cs.id)}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={onBack}>
          ← 上一步
        </Button>
        <Button onClick={handleSubmit} disabled={selectedDevices.length === 0 && selectedCustomerServices.length === 0}>
          下一步 →
        </Button>
      </div>
    </div>
  )
}
