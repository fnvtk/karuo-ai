"use client"

import { useState } from "react"
import { ChevronLeft, Plus, MoreVertical, Trash2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"

interface Device {
  id: string
  name: string
  status: "online" | "offline"
  lastActive: string
  acquired: number
}

export default function PhoneDevicesPage() {
  const router = useRouter()

  const [devices, setDevices] = useState<Device[]>([
    {
      id: "1",
      name: "电话设备 1",
      status: "online",
      lastActive: "2024-03-18 15:30",
      acquired: 12,
    },
    {
      id: "2",
      name: "电话设备 2",
      status: "online",
      lastActive: "2024-03-18 14:45",
      acquired: 8,
    },
    {
      id: "3",
      name: "电话设备 3",
      status: "offline",
      lastActive: "2024-03-17 10:20",
      acquired: 18,
    },
    {
      id: "4",
      name: "电话设备 4",
      status: "online",
      lastActive: "2024-03-18 16:10",
      acquired: 0,
    },
    {
      id: "5",
      name: "电话设备 5",
      status: "online",
      lastActive: "2024-03-18 13:55",
      acquired: 0,
    },
  ])

  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false)

  const handleRemoveDevice = (deviceId: string) => {
    const deviceToRemove = devices.find((d) => d.id === deviceId)
    if (deviceToRemove) {
      setDevices(devices.filter((d) => d.id !== deviceId))
      toast({
        title: "设备已移除",
        description: `已成功移除"${deviceToRemove.name}"`,
      })
    }
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-blue-50 to-white min-h-screen">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-blue-600">电话获客设备</h1>
          </div>
          <Button
            variant="default"
            onClick={() => router.push(`/scenarios/phone/new`)}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            新建计划
          </Button>
        </div>
      </header>

      <div className="p-4 max-w-7xl mx-auto">
        <Card className="p-6 bg-white/80 backdrop-blur-sm">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>设备名称</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>最后活跃</TableHead>
                  <TableHead>已获客</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>
                      <Badge variant={device.status === "online" ? "success" : "secondary"}>
                        {device.status === "online" ? "在线" : "离线"}
                      </Badge>
                    </TableCell>
                    <TableCell>{device.lastActive}</TableCell>
                    <TableCell>{device.acquired}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100 rounded-full">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => handleRemoveDevice(device.id)}
                            className="text-red-600 cursor-pointer hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            移除设备
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* 添加设备对话框 */}
      <Dialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加电话获客设备</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-gray-500 mb-4">请选择要添加的电话设备</p>
            <div className="space-y-2">
              {[1, 2, 3].map((num) => (
                <Card key={num} className="p-3 cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">电话设备 {num + 5}</p>
                      <p className="text-sm text-gray-500">最后活跃: 2024-03-18</p>
                    </div>
                    <Badge variant="outline">可用</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setIsAddDeviceOpen(false)
                toast({
                  title: "设备已添加",
                  description: "已成功添加电话获客设备",
                })
              }}
            >
              确认添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
