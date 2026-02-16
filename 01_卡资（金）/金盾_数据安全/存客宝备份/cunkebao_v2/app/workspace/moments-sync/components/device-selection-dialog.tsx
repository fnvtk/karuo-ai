"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface Device {
  id: string
  name: string
  imei: string
  wxid: string
  status: "online" | "offline"
  usedInPlans: number
}

interface DeviceSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDevices: string[]
  onSelect: (devices: string[]) => void
}

export function DeviceSelectionDialog({ open, onOpenChange, selectedDevices, onSelect }: DeviceSelectionDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // 模拟设备数据
  const devices: Device[] = [
    {
      id: "1",
      name: "设备 1",
      imei: "IMEI-radz6ewal",
      wxid: "wxid_98179ujy",
      status: "offline",
      usedInPlans: 0,
    },
    {
      id: "2",
      name: "设备 2",
      imei: "IMEI-i6iszi6d",
      wxid: "wxid_viqnaic8",
      status: "online",
      usedInPlans: 2,
    },
    {
      id: "3",
      name: "设备 3",
      imei: "IMEI-01z2izj97",
      wxid: "wxid_9sb23gxr",
      status: "online",
      usedInPlans: 2,
    },
    {
      id: "4",
      name: "设备 4",
      imei: "IMEI-x6o9rpcr0",
      wxid: "wxid_k0gxzbit",
      status: "online",
      usedInPlans: 1,
    },
  ]

  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.imei.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.wxid.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "online" && device.status === "online") ||
      (statusFilter === "offline" && device.status === "offline")

    return matchesSearch && matchesStatus
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>选择设备</DialogTitle>
        </DialogHeader>

        <div className="flex items-center space-x-4 my-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索设备IMEI/备注/微信号"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="online">在线</SelectItem>
              <SelectItem value="offline">离线</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <RadioGroup value={selectedDevices[0]} onValueChange={(value) => onSelect([value])}>
            {filteredDevices.map((device) => (
              <label
                key={device.id}
                className="flex items-start space-x-3 p-4 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <RadioGroupItem value={device.id} id={device.id} className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{device.name}</span>
                    <Badge variant={device.status === "online" ? "success" : "secondary"}>
                      {device.status === "online" ? "在线" : "离线"}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    <div>IMEI: {device.imei}</div>
                    <div>微信号: {device.wxid}</div>
                  </div>
                  {device.usedInPlans > 0 && (
                    <div className="text-sm text-orange-500 mt-1">已用于 {device.usedInPlans} 个计划</div>
                  )}
                </div>
              </label>
            ))}
          </RadioGroup>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
