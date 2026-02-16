"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus } from "lucide-react"

interface Device {
  id: string
  name: string
  account: string
  status: "online" | "offline"
}

const mockDevices: Device[] = [
  {
    id: "1",
    name: "iPhone 13 Pro",
    account: "wxid_abc123",
    status: "online",
  },
  {
    id: "2",
    name: "Huawei P40",
    account: "wxid_xyz789",
    status: "offline",
  },
]

interface DeviceSelectorProps {
  selectedDevices: string[]
  onChange: (devices: string[]) => void
}

export function DeviceSelector({ selectedDevices, onChange }: DeviceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const toggleSelectAll = () => {
    if (selectedDevices.length === mockDevices.length) {
      onChange([])
    } else {
      onChange(mockDevices.map((device) => device.id))
    }
  }

  const toggleDevice = (deviceId: string) => {
    if (selectedDevices.includes(deviceId)) {
      onChange(selectedDevices.filter((id) => id !== deviceId))
    } else {
      onChange([...selectedDevices, deviceId])
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索设备"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button className="ml-2" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            添加设备
          </Button>
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox checked={selectedDevices.length === mockDevices.length} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead>设备名称</TableHead>
                <TableHead>微信账号</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockDevices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedDevices.includes(device.id)}
                      onCheckedChange={() => toggleDevice(device.id)}
                    />
                  </TableCell>
                  <TableCell>{device.name}</TableCell>
                  <TableCell>{device.account}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        device.status === "online" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {device.status === "online" ? "在线" : "离线"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  )
}
