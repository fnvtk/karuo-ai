"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Smartphone, Users, TrendingUp } from "lucide-react"

export function DeviceTreeChart() {
  const deviceData = [
    {
      id: "device-1",
      name: "设备001",
      status: "online",
      acquired: 15,
      added: 12,
      efficiency: 80,
    },
    {
      id: "device-2",
      name: "设备002",
      status: "online",
      acquired: 18,
      added: 14,
      efficiency: 78,
    },
    {
      id: "device-3",
      name: "设备003",
      status: "offline",
      acquired: 12,
      added: 6,
      efficiency: 50,
    },
  ]

  const getStatusColor = (status: string) => {
    return status === "online" ? "bg-green-500" : "bg-gray-500"
  }

  const getStatusText = (status: string) => {
    return status === "online" ? "在线" : "离线"
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5" />
          <span>设备运行状态</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {deviceData.map((device) => (
            <div key={device.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4 text-gray-600" />
                  <span className="font-medium">{device.name}</span>
                </div>
                <Badge variant="secondary" className={`${getStatusColor(device.status)} text-white`}>
                  {getStatusText(device.status)}
                </Badge>
              </div>

              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-600">获客: {device.acquired}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-600">添加: {device.added}</span>
                </div>
                <div className="text-sm text-gray-600">效率: {device.efficiency}%</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
