"use client"

import { useState } from "react"
import { Card } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { ChevronLeft, ChevronRight, Search, Plus } from "lucide-react"

interface Device {
  id: string
  imei: string
  status: "online" | "offline"
  friendStatus: string
}

const mockDevices: Device[] = [
  {
    id: "1",
    imei: "123456789012345",
    status: "online",
    friendStatus: "正常",
  },
  {
    id: "2",
    imei: "987654321098765",
    status: "offline",
    friendStatus: "异常",
  },
]

export function DeviceSelector({ onNext, onPrev }) {
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">选择推送设备</h2>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          添加设备
        </Button>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="搜索设备IMEI/备注/手机号"
            className="w-full"
            prefix={<Search className="w-4 h-4 text-gray-400" />}
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">选择</TableHead>
            <TableHead>设备IMEI/备注/手机号</TableHead>
            <TableHead>在线状态</TableHead>
            <TableHead>加友状态</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockDevices.map((device) => (
            <TableRow key={device.id}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selectedDevices.includes(device.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDevices([...selectedDevices, device.id])
                    } else {
                      setSelectedDevices(selectedDevices.filter((id) => id !== device.id))
                    }
                  }}
                />
              </TableCell>
              <TableCell>{device.imei}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                    device.status === "online" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {device.status === "online" ? "在线" : "离线"}
                </span>
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                    device.friendStatus === "正常" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {device.friendStatus}
                </span>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm">
                  查看详情
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          上一步
        </Button>
        <Button onClick={onNext} disabled={selectedDevices.length === 0}>
          下一步
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Card>
  )
}
