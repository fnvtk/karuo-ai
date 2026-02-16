"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Filter, Search, RefreshCw, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface WechatAccount {
  wechatId: string
  nickname: string
  remainingAdds: number
  maxDailyAdds: number
  todayAdded: number
}

interface Device {
  id: string
  imei: string
  name: string
  status: "online" | "offline"
  wechatAccounts: WechatAccount[]
  usedInPlans: number
}

interface DeviceSelectorProps {
  onSelect: (selectedDevices: string[]) => void
  initialSelectedDevices?: string[]
  excludeUsedDevices?: boolean
}

export function DeviceSelector({
  onSelect,
  initialSelectedDevices = [],
  excludeUsedDevices = true,
}: DeviceSelectorProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevices, setSelectedDevices] = useState<string[]>(initialSelectedDevices)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const devicesPerPage = 10

  useEffect(() => {
    // 模拟获取设备数据
    const fetchDevices = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      const mockDevices = Array.from({ length: 42 }, (_, i) => ({
        id: `device-${i + 1}`,
        imei: `IMEI-${Math.random().toString(36).substr(2, 9)}`,
        name: `设备 ${i + 1}`,
        status: Math.random() > 0.3 ? "online" : "offline",
        wechatAccounts: Array.from({ length: Math.floor(Math.random() * 2) + 1 }, (_, j) => ({
          wechatId: `wxid_${Math.random().toString(36).substr(2, 8)}`,
          nickname: `微信号 ${j + 1}`,
          remainingAdds: Math.floor(Math.random() * 10) + 5,
          maxDailyAdds: 20,
          todayAdded: Math.floor(Math.random() * 15),
        })),
        usedInPlans: Math.floor(Math.random() * 3),
      }))
      setDevices(mockDevices)
    }

    fetchDevices()
  }, [])

  const handleRefresh = () => {
    toast({
      title: "刷新成功",
      description: "设备列表已更新",
    })
  }

  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.imei.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.wechatAccounts.some((account) => account.wechatId.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === "all" || device.status === statusFilter
    const matchesUsage = !excludeUsedDevices || device.usedInPlans === 0
    return matchesSearch && matchesStatus && matchesUsage
  })

  const paginatedDevices = filteredDevices.slice((currentPage - 1) * devicesPerPage, currentPage * devicesPerPage)

  const handleSelectAll = () => {
    if (selectedDevices.length === paginatedDevices.length) {
      setSelectedDevices([])
    } else {
      setSelectedDevices(paginatedDevices.map((device) => device.id))
    }
    onSelect(selectedDevices)
  }

  const handleDeviceSelect = (deviceId: string) => {
    const updatedSelection = selectedDevices.includes(deviceId)
      ? selectedDevices.filter((id) => id !== deviceId)
      : [...selectedDevices, deviceId]
    setSelectedDevices(updatedSelection)
    onSelect(updatedSelection)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索设备IMEI/备注/微信号"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between">
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
        <Button variant="outline" onClick={handleSelectAll}>
          {selectedDevices.length === paginatedDevices.length ? "取消全选" : "全选"}
        </Button>
      </div>

      <div className="space-y-2">
        {paginatedDevices.map((device) => (
          <Card key={device.id} className="p-3 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3">
              <Checkbox
                checked={selectedDevices.includes(device.id)}
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
                <div className="mt-2 space-y-2">
                  {device.wechatAccounts.map((account) => (
                    <div key={account.wechatId} className="bg-gray-50 rounded-lg p-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{account.nickname}</span>
                        <span className="text-gray-500">{account.wechatId}</span>
                      </div>
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-1">
                            <span>今日可添加：</span>
                            <span className="font-medium">{account.remainingAdds}</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertCircle className="h-4 w-4 text-gray-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>每日最多添加 {account.maxDailyAdds} 个好友</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <span className="text-sm text-gray-500">
                            {account.todayAdded}/{account.maxDailyAdds}
                          </span>
                        </div>
                        <Progress value={(account.todayAdded / account.maxDailyAdds) * 100} className="h-1.5" />
                      </div>
                    </div>
                  ))}
                </div>
                {!excludeUsedDevices && device.usedInPlans > 0 && (
                  <div className="text-sm text-orange-500 mt-2">已用于 {device.usedInPlans} 个计划</div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault()
                setCurrentPage((prev) => Math.max(1, prev - 1))
              }}
            />
          </PaginationItem>
          {Array.from({ length: Math.ceil(filteredDevices.length / devicesPerPage) }, (_, i) => i + 1).map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                href="#"
                isActive={currentPage === page}
                onClick={(e) => {
                  e.preventDefault()
                  setCurrentPage(page)
                }}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault()
                setCurrentPage((prev) => Math.min(Math.ceil(filteredDevices.length / devicesPerPage), prev + 1))
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

// 添加 DeviceSelection 命名导出
export function DeviceSelection({ onSelect, initialSelectedDevices = [] }: DeviceSelectorProps) {
  return <DeviceSelector onSelect={onSelect} initialSelectedDevices={initialSelectedDevices} />
}
