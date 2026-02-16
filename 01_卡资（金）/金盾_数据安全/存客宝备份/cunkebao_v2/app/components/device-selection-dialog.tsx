"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Smartphone } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// 模拟设备数据
const mockDevices = [
  { id: "dev1", name: "iPhone 13", status: "online", lastActive: "2023-05-20T10:30:00Z" },
  { id: "dev2", name: "Xiaomi 12", status: "online", lastActive: "2023-05-20T09:15:00Z" },
  { id: "dev3", name: "Huawei P40", status: "offline", lastActive: "2023-05-19T18:45:00Z" },
  { id: "dev4", name: "OPPO Find X3", status: "online", lastActive: "2023-05-20T11:20:00Z" },
  { id: "dev5", name: "Samsung S21", status: "offline", lastActive: "2023-05-19T14:10:00Z" },
  { id: "dev6", name: "iPhone 12", status: "online", lastActive: "2023-05-20T08:30:00Z" },
  { id: "dev7", name: "Xiaomi 11", status: "online", lastActive: "2023-05-20T10:45:00Z" },
  { id: "dev8", name: "Huawei Mate 40", status: "offline", lastActive: "2023-05-18T16:20:00Z" },
]

interface DeviceSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDevices: string[]
  onSelect: (selectedDevices: string[]) => void
}

export function DeviceSelectionDialog({ open, onOpenChange, selectedDevices, onSelect }: DeviceSelectionDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [devices, setDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string[]>(selectedDevices)

  useEffect(() => {
    // 模拟API请求
    const fetchData = async () => {
      try {
        // 实际项目中应从API获取数据
        // const response = await fetch('/api/devices')
        // const data = await response.json()
        // setDevices(data)

        // 使用模拟数据
        setTimeout(() => {
          setDevices(mockDevices)
          setLoading(false)
        }, 500)
      } catch (error) {
        console.error("获取设备失败:", error)
        setLoading(false)
      }
    }

    if (open) {
      fetchData()
      setSelected(selectedDevices)
    }
  }, [open, selectedDevices])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleToggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const handleSelectAll = () => {
    if (selected.length === filteredDevices.length) {
      setSelected([])
    } else {
      setSelected(filteredDevices.map((device) => device.id))
    }
  }

  const handleConfirm = () => {
    onSelect(selected)
    onOpenChange(false)
  }

  const filteredDevices = devices.filter((device) => device.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>选择设备</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input placeholder="搜索设备名称" className="pl-9" value={searchQuery} onChange={handleSearch} />
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-500">
            已选择 {selected.length} / {filteredDevices.length} 个设备
          </div>
          <Button variant="ghost" size="sm" onClick={handleSelectAll}>
            {selected.length === filteredDevices.length ? "取消全选" : "全选"}
          </Button>
        </div>

        <ScrollArea className="h-[300px] rounded-md border p-2">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">未找到匹配的设备</div>
          ) : (
            <div className="space-y-2">
              {filteredDevices.map((device) => (
                <div key={device.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100">
                  <Checkbox
                    id={`device-${device.id}`}
                    checked={selected.includes(device.id)}
                    onCheckedChange={() => handleToggleSelect(device.id)}
                  />
                  <div className="flex-1">
                    <label htmlFor={`device-${device.id}`} className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center">
                        <Smartphone className="h-4 w-4 mr-2 text-gray-500" />
                        <div>
                          <div className="font-medium">{device.name}</div>
                          <div className="text-xs text-gray-500">ID: {device.id}</div>
                        </div>
                      </div>
                      <Badge variant={device.status === "online" ? "success" : "secondary"}>
                        {device.status === "online" ? "在线" : "离线"}
                      </Badge>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm}>确认</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
