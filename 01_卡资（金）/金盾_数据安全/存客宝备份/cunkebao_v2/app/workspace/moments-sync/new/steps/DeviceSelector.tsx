"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, RefreshCw, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

// 定义类型，避免导入错误
interface Device {
  id: string
  imei: string
  name: string
  status: string
  wechatId: string
  usedInPlans: number
}

interface DeviceResponse {
  code: number
  message: string
  data: {
    devices: Device[]
    total: number
  }
}

interface DeviceSelectResponse {
  code: number
  message: string
  data: {
    success: boolean
    deviceIds: string[]
  }
}

interface DeviceSelectorProps {
  formData: any
  onChange: (data: any) => void
  onNext: () => void
  onPrev: () => void
}

export function DeviceSelector({ formData, onChange, onNext, onPrev }: DeviceSelectorProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const itemsPerPage = 5

  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
    setLoading(true)
    try {
      // 实际项目中这里应该调用API获取所有设备
      const response: DeviceResponse = {
        code: 0,
        message: "success",
        data: {
          devices: Array.from({ length: 42 }, (_, i) => ({
            id: `device-${i + 1}`,
            imei: `IMEI-${Math.random().toString(36).substr(2, 9)}`,
            name: `设备 ${i + 1}`,
            status: Math.random() > 0.3 ? "online" : "offline",
            wechatId: `wxid_${Math.random().toString(36).substr(2, 8)}`,
            usedInPlans: Math.floor(Math.random() * 3),
          })),
          total: 42,
        },
      }

      if (response.code === 0) {
        setDevices(response.data.devices)
      } else {
        throw new Error(response.message)
      }
    } catch (error) {
      toast({
        title: "获取失败",
        description: "无法获取设备列表",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchDevices()
    toast({
      title: "刷新成功",
      description: "设备列表已更新",
    })
  }

  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.imei.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || device.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const paginatedDevices = filteredDevices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleDeviceSelect = async (deviceId: string) => {
    try {
      // 实际项目中这里应该调用API
      const response: DeviceSelectResponse = {
        code: 0,
        message: "success",
        data: {
          success: true,
          deviceIds: [deviceId],
        },
      }

      if (response.code === 0 && response.data.success) {
        const updatedSelection = formData.selectedDevices.includes(deviceId)
          ? formData.selectedDevices.filter((id: string) => id !== deviceId)
          : [...formData.selectedDevices, deviceId]
        onChange({ ...formData, selectedDevices: updatedSelection })
      } else {
        throw new Error(response.message)
      }
    } catch (error) {
      toast({
        title: "选择失败",
        description: "无法选择设备",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索设备备注或IMEI"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="online">在线</SelectItem>
              <SelectItem value="offline">离线</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="space-y-2">
          {paginatedDevices.map((device) => (
            <Card
              key={device.id}
              className={`p-3 hover:shadow-md transition-shadow cursor-pointer ${
                formData.selectedDevices.includes(device.id) ? "border-blue-500 border-2" : ""
              }`}
              onClick={() => handleDeviceSelect(device.id)}
            >
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={formData.selectedDevices.includes(device.id)}
                  onCheckedChange={() => handleDeviceSelect(device.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium truncate">{device.name}</div>
                    <div
                      className={`px-2 py-1 rounded-full text-xs ${
                        device.status === "online" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {device.status === "online" ? "在线" : "离线"}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">IMEI: {device.imei}</div>
                  <div className="text-sm text-gray-500">微信号: {device.wechatId}</div>
                  {device.usedInPlans > 0 && (
                    <div className="text-sm text-orange-500">已用于 {device.usedInPlans} 个计划</div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationPrevious
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            />
            {Array.from({ length: Math.ceil(filteredDevices.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page}>
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationNext
              onClick={() =>
                setCurrentPage((prev) => Math.min(Math.ceil(filteredDevices.length / itemsPerPage), prev + 1))
              }
              disabled={currentPage === Math.ceil(filteredDevices.length / itemsPerPage)}
            />
          </PaginationContent>
        </Pagination>

        <div className="mt-4">
          <h3 className="font-medium mb-2">已选设备：</h3>
          <div className="flex flex-wrap gap-2">
            {formData.selectedDevices.map((deviceId: string) => {
              const device = devices.find((d) => d.id === deviceId)
              return (
                device && (
                  <Badge key={deviceId} variant="secondary" className="px-2 py-1 flex items-center space-x-1">
                    <span>{device.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeviceSelect(deviceId)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )
              )
            })}
          </div>
        </div>

        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={onPrev}>
            上一步
          </Button>
          <Button onClick={onNext} disabled={formData.selectedDevices.length === 0}>
            下一步
          </Button>
        </div>
      </div>
    </Card>
  )
}
